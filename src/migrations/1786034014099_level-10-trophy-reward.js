/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Adds the unlockable 'trophy' reward and attaches it to the level_10 milestone,
 * so reaching level 10 unlocks it from now on. Users that are already level 10
 * or above get it backfilled into user_unlocked_rewards.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO rewards (key, name, applies_to, unlockable, icon_url, status, sort_order) VALUES
      ('trophy', 'თასი', ARRAY['post','comment']::varchar(20)[], true, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/trophy.svg', 'active', 3);
  `);

  pgm.sql(`
    UPDATE achievement_milestones am
    SET rewards = '[{"type":"reward","key":"trophy"}]'::jsonb
    FROM achievements a
    WHERE a.id = am.achievement_id
      AND a.key = 'level_reached'
      AND am.key = 'level_10';
  `);

  pgm.sql(`
    INSERT INTO user_unlocked_rewards (user_id, reward_key)
    SELECT ux.user_id, 'trophy'
    FROM user_xp ux
    WHERE ux.level >= 10
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
      AND am.key = 'level_10';

    DELETE FROM user_unlocked_rewards WHERE reward_key = 'trophy';
    DELETE FROM rewards WHERE key = 'trophy';
  `);
};
