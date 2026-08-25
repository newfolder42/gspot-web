/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Adds the unlockable 'fortytwo' reward ("ორმოცდაორი") and the hidden one-time
 * 'guess_score_42' achievement, unlocked by landing a guess worth exactly 42
 * points. The already hidden level_42 milestone grants the same reward.
 *
 * Users that already scored a 42 get the achievement backfilled; users that
 * already scored a 42 or reached level 42 get the reward backfilled into
 * user_unlocked_rewards.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO rewards (key, name, applies_to, unlockable, icon_url, status, sort_order) VALUES
      ('fortytwo', 'ორმოცდაორი', ARRAY['post','comment']::varchar(20)[], true, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/fortytwo.svg', 'active', 5);
  `);

  pgm.sql(`
    INSERT INTO achievements (key, name, category, achievement_type, state, image_url, rewards)
    VALUES (
      'guess_score_42',
      '42 ქულა',
      'guesses',
      'one_time',
      'hidden',
      NULL,
      '[{"type":"reward","key":"fortytwo"}]'::jsonb
    );
  `);

  pgm.sql(`
    UPDATE achievement_milestones am
    SET rewards = '[{"type":"reward","key":"fortytwo"}]'::jsonb
    FROM achievements a
    WHERE a.id = am.achievement_id
      AND a.key = 'level_reached'
      AND am.key = 'level_42';
  `);

  // Everyone that already landed an exact 42 owns the achievement retroactively.
  pgm.sql(`
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT g.user_id, a.id, 1, 'achieved', COALESCE(g.first_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (
      SELECT user_id, MIN(created_at) AS first_at
      FROM post_guesses
      WHERE COALESCE((details->>'score')::int, 0) = 42
      GROUP BY user_id
    ) g
    JOIN achievements a ON a.key = 'guess_score_42'
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO user_unlocked_rewards (user_id, reward_key)
    SELECT u.user_id, 'fortytwo'
    FROM (
      SELECT DISTINCT user_id
      FROM post_guesses
      WHERE COALESCE((details->>'score')::int, 0) = 42

      UNION

      SELECT user_id
      FROM user_xp
      WHERE level >= 42
    ) u
    ON CONFLICT (user_id, reward_key) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    UPDATE achievement_milestones am
    SET rewards = '[]'::jsonb
    FROM achievements a
    WHERE a.id = am.achievement_id
      AND a.key = 'level_reached'
      AND am.key = 'level_42';

    DELETE FROM user_achievements ua
    USING achievements a
    WHERE a.id = ua.achievement_id AND a.key = 'guess_score_42';

    DELETE FROM achievements WHERE key = 'guess_score_42';

    DELETE FROM user_unlocked_rewards WHERE reward_key = 'fortytwo';
    DELETE FROM rewards WHERE key = 'fortytwo';
  `);
};
