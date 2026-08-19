/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Adds the 'reward-limit' reward type to the posts milestones: reaching posts_50 and
 * posts_100 each raise the user's daily reward-giving quota by 1, posts_200 by 2.
 * Users who already unlocked those milestones get the same increase backfilled into
 * user_reward_limits (rows are created at DEFAULT_DAILY_REWARD_LIMIT + increase).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE achievement_milestones am
    SET rewards = v.rewards::jsonb
    FROM (
      VALUES
        ('posts_50', '[{"type":"reward-limit","value":1}]'),
        ('posts_100', '[{"type":"reward-limit","value":1}]'),
        ('posts_200', '[{"type":"reward-limit","value":2}]')
    ) AS v(key, rewards)
    WHERE am.key = v.key;
  `);

  pgm.sql(`
    INSERT INTO user_reward_limits (user_id, daily_limit)
    SELECT uam.user_id, 2 + SUM(v.increase)::int
    FROM user_achievement_milestones uam
    JOIN achievement_milestones am ON am.id = uam.milestone_id
    JOIN (
      VALUES ('posts_50', 1), ('posts_100', 1), ('posts_200', 2)
    ) AS v(key, increase) ON v.key = am.key
    GROUP BY uam.user_id
    ON CONFLICT (user_id) DO UPDATE
      SET daily_limit = user_reward_limits.daily_limit + (excluded.daily_limit - 2),
          updated_at = now();
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    UPDATE user_reward_limits url
    SET daily_limit = GREATEST(2, url.daily_limit - d.increase),
        updated_at = now()
    FROM (
      SELECT uam.user_id, SUM(v.increase)::int AS increase
      FROM user_achievement_milestones uam
      JOIN achievement_milestones am ON am.id = uam.milestone_id
      JOIN (
        VALUES ('posts_50', 1), ('posts_100', 1), ('posts_200', 2)
      ) AS v(key, increase) ON v.key = am.key
      GROUP BY uam.user_id
    ) d
    WHERE d.user_id = url.user_id;
  `);

  pgm.sql(`
    UPDATE achievement_milestones
    SET rewards = '[]'::jsonb
    WHERE key IN ('posts_50', 'posts_100', 'posts_200');
  `);
};
