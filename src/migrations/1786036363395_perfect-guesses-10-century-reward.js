/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Adds the unlockable 'hundred' reward ("ასი") and attaches it to the
 * perfect_guesses_10 milestone. Users that already have 10 or more perfect
 * guesses get it backfilled into user_unlocked_rewards.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO rewards (key, name, applies_to, unlockable, icon_url, status, sort_order) VALUES
      ('hundred', 'ასი', ARRAY['post','comment']::varchar(20)[], true, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/hundred.svg', 'active', 4);
  `);

  pgm.sql(`
    UPDATE achievement_milestones am
    SET rewards = '[{"type":"reward","key":"hundred"}]'::jsonb
    FROM achievements a
    WHERE a.id = am.achievement_id
      AND a.key = 'perfect_guesses_total'
      AND am.key = 'perfect_guesses_10';
  `);

  pgm.sql(`
    INSERT INTO user_unlocked_rewards (user_id, reward_key)
    SELECT pg.user_id, 'hundred'
    FROM (
      SELECT user_id, COUNT(*)::int AS total
      FROM post_guesses
      WHERE COALESCE((details->>'score')::int, 0) >= 100
      GROUP BY user_id
    ) pg
    WHERE pg.total >= 10
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
      AND a.key = 'perfect_guesses_total'
      AND am.key = 'perfect_guesses_10';

    DELETE FROM user_unlocked_rewards WHERE reward_key = 'hundred';
    DELETE FROM rewards WHERE key = 'hundred';
  `);
};