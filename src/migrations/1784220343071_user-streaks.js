/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // one row per user per active day
  pgm.createTable('user_streaks', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade',
    },
    activity_date: { type: 'date', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.addIndex('user_streaks', ['user_id', 'activity_date'], { unique: true });

  // backfill from existing activity so current streaks carry over
  pgm.sql(`
    INSERT INTO user_streaks (user_id, activity_date)
    SELECT DISTINCT user_id, activity_date
    FROM (
      SELECT p.user_id, p.created_at::date AS activity_date
      FROM posts p
      WHERE p.status = 'published'

      UNION

      SELECT pg.user_id, pg.created_at::date
      FROM post_guesses pg

      UNION

      SELECT v.user_id, v.created_at::date
      FROM post_votes v
      WHERE v.value = 1 AND v.deleted_at IS NULL

      UNION

      SELECT c.user_id, c.created_at::date
      FROM post_comments c
      WHERE c.deleted_at IS NULL

      UNION

      SELECT r.user_id, r.created_at::date
      FROM post_rewards r
      WHERE r.deleted_at IS NULL
    ) activity_days
    ON CONFLICT (user_id, activity_date) DO NOTHING;
  `);

  // Reset the streak_days achievement and rebuild it from user_streaks, so the
  // achievement stays consistent with the new source of truth.
  pgm.sql(`
    DELETE FROM user_achievement_milestones
    WHERE milestone_id IN (
      SELECT am.id
      FROM achievement_milestones am
      JOIN achievements a ON a.id = am.achievement_id
      WHERE a.key = 'streak_days'
    );

    DELETE FROM user_achievements
    WHERE achievement_id IN (
      SELECT id FROM achievements WHERE key = 'streak_days'
    );

    -- longest consecutive-day run per user, from the new table
    WITH numbered AS (
      SELECT us.user_id, us.activity_date,
             ROW_NUMBER() OVER (PARTITION BY us.user_id ORDER BY us.activity_date) AS rn
      FROM user_streaks us
    ),
    grouped AS (
      SELECT user_id, activity_date, (activity_date - rn::int) AS grp
      FROM numbered
    ),
    streak_runs AS (
      SELECT user_id, COUNT(*)::int AS streak_len
      FROM grouped
      GROUP BY user_id, grp
    ),
    best_streak AS (
      SELECT user_id, MAX(streak_len)::int AS current_value
      FROM streak_runs
      GROUP BY user_id
    ),
    max_target AS (
      SELECT am.achievement_id, MAX(am.target_value)::int AS target
      FROM achievement_milestones am
      JOIN achievements a ON a.id = am.achievement_id
      WHERE a.key = 'streak_days'
      GROUP BY am.achievement_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT
      bs.user_id,
      a.id,
      bs.current_value,
      CASE WHEN bs.current_value >= mt.target THEN 'achieved' ELSE 'in_progress' END,
      CASE WHEN bs.current_value >= mt.target THEN CURRENT_TIMESTAMP ELSE NULL END,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM best_streak bs
    JOIN achievements a ON a.key = 'streak_days'
    JOIN max_target mt ON mt.achievement_id = a.id
    WHERE bs.current_value > 0;

    -- unlock milestone history for every reached threshold
    INSERT INTO user_achievement_milestones (user_id, milestone_id, achieved_at, progress_at_unlock, created_at)
    SELECT
      ua.user_id,
      am.id,
      COALESCE(ua.achieved_at, ua.last_modified_at, CURRENT_TIMESTAMP),
      am.target_value,
      CURRENT_TIMESTAMP
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id AND a.key = 'streak_days'
    JOIN achievement_milestones am ON am.achievement_id = a.id
    WHERE ua.current_value >= am.target_value
    ON CONFLICT (user_id, milestone_id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('user_streaks');
};
