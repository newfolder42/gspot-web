/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * feed_events ("ამბები") — a single row per happening (quest completion,
 * achievement unlock) authored by a user. No destination user is stored;
 * visibility is resolved at read time by joining follows + feed_event_seens.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('feed_events', {
    id: { type: 'bigserial', primaryKey: true },
    actor_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    type: { type: 'varchar(30)', notNull: true },
    group_key: { type: 'varchar(150)', notNull: true },
    ref_id: { type: 'bigint' },
    details: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('feed_events', 'feed_events_type_check', {
    check: `type IN ('quest_completed', 'achievement_unlocked')`,
  });

  pgm.addIndex('feed_events', 'actor_id');
  pgm.addIndex('feed_events', 'created_at');
  pgm.addIndex('feed_events', 'group_key');
  pgm.addIndex('feed_events', ['actor_id', 'type', 'group_key'], { unique: true });

  pgm.createTable('feed_event_seens', {
    id: { type: 'bigserial', primaryKey: true },
    event_id: { type: 'bigint', notNull: true, references: 'feed_events', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    seen_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('feed_event_seens', ['event_id', 'user_id'], { unique: true });
  pgm.addIndex('feed_event_seens', 'user_id');

  // ---------------------------------------------------------------------------
  // Backfill recent history so the strip isn't empty at launch. Only the last
  // 48h is seeded — that's the display window, and older rows would just be
  // removed by the cleanup cron without ever being shown. `created_at` is set
  // to the real completion/unlock time so ordering and the window filter work.
  // Mirrors the runtime handlers, including "skip the progressive aggregate".
  // ---------------------------------------------------------------------------

  // Quest completions
  pgm.sql(`
    INSERT INTO feed_events (actor_id, type, group_key, ref_id, details, created_at)
    SELECT
      uq.user_id,
      'quest_completed',
      'quest:' || uq.quest_id,
      uq.quest_id,
      jsonb_build_object(
        'questId', zq.id,
        'questTitle', zq.title,
        'zoneId', zq.zone_id,
        'zoneSlug', z.slug,
        'userAlias', u.alias,
        'characterAvatar', zc.avatar_url,
        'postId', (SELECT pqc.post_id FROM post_quest_completions pqc WHERE pqc.quest_id = uq.quest_id LIMIT 1),
        'photos', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'url', uqo.photo_url,
              'thumb', uqo.capture_data->'variants'->>'thumb',
              'feed', uqo.capture_data->'variants'->>'feed',
              'objectiveTitle', zqo.title
            ) ORDER BY zqo.sort_order ASC
          )
          FROM user_quest_objectives uqo
          JOIN zone_quest_objectives zqo ON zqo.id = uqo.objective_id
          WHERE uqo.user_quest_id = uq.id
            AND uqo.status = 'completed'
            AND uqo.photo_url IS NOT NULL
        ), '[]'::jsonb)
      ),
      uq.completed_at
    FROM user_quests uq
    JOIN zone_quests zq ON zq.id = uq.quest_id
    JOIN zones z ON z.id = zq.zone_id
    JOIN users u ON u.id = uq.user_id
    LEFT JOIN zone_quest_characters zc ON zc.id = zq.character_id
    WHERE uq.status = 'completed'
      AND uq.completed_at IS NOT NULL
      AND uq.completed_at >= NOW() - INTERVAL '48 hours'
    ON CONFLICT (actor_id, type, group_key) DO NOTHING;
  `);

  // One-time achievements
  pgm.sql(`
    INSERT INTO feed_events (actor_id, type, group_key, ref_id, details, created_at)
    SELECT
      ua.user_id,
      'achievement_unlocked',
      'achv:' || a.key || ':-',
      NULL,
      jsonb_build_object(
        'achievementKey', a.key,
        'achievementName', a.name,
        'achievementType', 'one_time',
        'milestoneKey', NULL,
        'milestoneName', NULL,
        'imageUrl', a.image_url,
        'achievedAt', to_jsonb(ua.achieved_at)
      ),
      ua.achieved_at
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id
    WHERE a.achievement_type = 'one_time'
      AND ua.achieved_at IS NOT NULL
      AND ua.achieved_at >= NOW() - INTERVAL '48 hours'
    ON CONFLICT (actor_id, type, group_key) DO NOTHING;
  `);

  // Progressive achievement milestones (each unlocked milestone = one event)
  pgm.sql(`
    INSERT INTO feed_events (actor_id, type, group_key, ref_id, details, created_at)
    SELECT
      uam.user_id,
      'achievement_unlocked',
      'achv:' || a.key || ':' || am.key,
      NULL,
      jsonb_build_object(
        'achievementKey', a.key,
        'achievementName', a.name,
        'achievementType', 'progressive',
        'milestoneKey', am.key,
        'milestoneName', am.name,
        'imageUrl', COALESCE(am.image_url, a.image_url),
        'achievedAt', to_jsonb(uam.achieved_at)
      ),
      uam.achieved_at
    FROM user_achievement_milestones uam
    JOIN achievement_milestones am ON am.id = uam.milestone_id
    JOIN achievements a ON a.id = am.achievement_id
    WHERE a.achievement_type = 'progressive'
      AND uam.achieved_at IS NOT NULL
      AND uam.achieved_at >= NOW() - INTERVAL '48 hours'
    ON CONFLICT (actor_id, type, group_key) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('feed_event_seens');
  pgm.dropTable('feed_events');
};
