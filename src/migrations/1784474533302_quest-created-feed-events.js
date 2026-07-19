/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * feed_events: new 'quest_created' type — a zone published a new quest.
 * Visible only to active members of the quest's zone (resolved at read time
 * via zone_members against details->>'zoneId').
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.dropConstraint('feed_events', 'feed_events_type_check');
  pgm.addConstraint('feed_events', 'feed_events_type_check', {
    check: `type IN ('quest_completed', 'achievement_unlocked', 'quest_created')`,
  });

  // Backfill existing quests with their real creation time. Mirrors the
  // runtime handler's details snapshot.
  pgm.sql(`
    INSERT INTO feed_events (actor_id, type, group_key, ref_id, details, created_at)
    SELECT
      zq.created_by,
      'quest_created',
      'quest_created:' || zq.id,
      zq.id,
      jsonb_build_object(
        'questId', zq.id,
        'questTitle', zq.title,
        'zoneId', zq.zone_id,
        'zoneSlug', z.slug,
        'zoneName', z.name,
        'characterName', zc.name,
        'characterAvatar', zc.avatar_url,
        'createdByAlias', u.alias
      ),
      zq.created_at
    FROM zone_quests zq
    JOIN zones z ON z.id = zq.zone_id
    JOIN users u ON u.id = zq.created_by
    LEFT JOIN zone_quest_characters zc ON zc.id = zq.character_id
    WHERE zq.created_by IS NOT NULL
    ON CONFLICT (actor_id, type, group_key) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DELETE FROM feed_events WHERE type = 'quest_created';`);
  pgm.dropConstraint('feed_events', 'feed_events_type_check');
  pgm.addConstraint('feed_events', 'feed_events_type_check', {
    check: `type IN ('quest_completed', 'achievement_unlocked')`,
  });
};
