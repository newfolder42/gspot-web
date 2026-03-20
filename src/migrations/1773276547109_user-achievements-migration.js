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
  // Build per-user progress rows for each achievement track.
  pgm.sql(`
    WITH profile_photo_progress AS (
      SELECT uc.user_id, 1::int AS current_value, MIN(uc.created_at) AS achieved_at
      FROM user_content uc
      WHERE uc.type = 'profile-photo'
      GROUP BY uc.user_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'achieved', p.achieved_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM profile_photo_progress p
    JOIN achievements a ON a.key = 'base_profile_photo'
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = 'achieved',
        achieved_at = COALESCE(user_achievements.achieved_at, EXCLUDED.achieved_at),
        last_modified_at = CURRENT_TIMESTAMP;

    WITH follower_progress AS (
      SELECT uc.connection_id AS user_id, COUNT(*)::int AS current_value, MIN(uc.created_at) AS achieved_at
      FROM user_connections uc
      GROUP BY uc.connection_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'achieved', p.achieved_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM follower_progress p
    JOIN achievements a ON a.key = 'base_first_follower'
    WHERE p.current_value > 0
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = 'achieved',
        achieved_at = COALESCE(user_achievements.achieved_at, EXCLUDED.achieved_at),
        last_modified_at = CURRENT_TIMESTAMP;

    WITH following_progress AS (
      SELECT uc.user_id, COUNT(*)::int AS current_value, MIN(uc.created_at) AS achieved_at
      FROM user_connections uc
      GROUP BY uc.user_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'achieved', p.achieved_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM following_progress p
    JOIN achievements a ON a.key = 'base_first_following'
    WHERE p.current_value > 0
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = 'achieved',
        achieved_at = COALESCE(user_achievements.achieved_at, EXCLUDED.achieved_at),
        last_modified_at = CURRENT_TIMESTAMP;

    WITH post_progress AS (
      SELECT p.user_id, COUNT(*)::int AS current_value
      FROM posts p
      WHERE p.status = 'published'
      GROUP BY p.user_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'in_progress', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM post_progress p
    JOIN achievements a ON a.key = 'posts_total'
    WHERE p.current_value > 0
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = CASE
          WHEN user_achievements.status = 'achieved' THEN 'achieved'
          ELSE 'in_progress'
        END,
        last_modified_at = CURRENT_TIMESTAMP;

    WITH guess_progress AS (
      SELECT pg.user_id, COUNT(*)::int AS current_value
      FROM post_guesses pg
      GROUP BY pg.user_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'in_progress', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM guess_progress p
    JOIN achievements a ON a.key = 'guesses_total'
    WHERE p.current_value > 0
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = CASE
          WHEN user_achievements.status = 'achieved' THEN 'achieved'
          ELSE 'in_progress'
        END,
        last_modified_at = CURRENT_TIMESTAMP;

    WITH perfect_guess_progress AS (
      SELECT pg.user_id, COUNT(*)::int AS current_value
      FROM post_guesses pg
      WHERE COALESCE((pg.details->>'score')::int, 0) = 100
      GROUP BY pg.user_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'in_progress', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM perfect_guess_progress p
    JOIN achievements a ON a.key = 'perfect_guesses_total'
    WHERE p.current_value > 0
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = CASE
          WHEN user_achievements.status = 'achieved' THEN 'achieved'
          ELSE 'in_progress'
        END,
        last_modified_at = CURRENT_TIMESTAMP;

    WITH level_progress AS (
      SELECT ux.user_id, ux.level::int AS current_value
      FROM user_xp ux
      WHERE ux.level > 0
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'in_progress', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM level_progress p
    JOIN achievements a ON a.key = 'level_reached'
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = CASE
          WHEN user_achievements.status = 'achieved' THEN 'achieved'
          ELSE 'in_progress'
        END,
        last_modified_at = CURRENT_TIMESTAMP;

    WITH activity_days AS (
      SELECT p.user_id, p.created_at::date AS day
      FROM posts p
      WHERE p.status = 'published'
      UNION
      SELECT pg.user_id, pg.created_at::date AS day
      FROM post_guesses pg
    ),
    numbered AS (
      SELECT ad.user_id, ad.day, ROW_NUMBER() OVER (PARTITION BY ad.user_id ORDER BY ad.day) AS rn
      FROM activity_days ad
    ),
    grouped AS (
      SELECT n.user_id, n.day, (n.day - n.rn::int) AS grp
      FROM numbered n
    ),
    streak_runs AS (
      SELECT g.user_id, COUNT(*)::int AS streak_len
      FROM grouped g
      GROUP BY g.user_id, g.grp
    ),
    best_streak AS (
      SELECT sr.user_id, MAX(sr.streak_len)::int AS current_value
      FROM streak_runs sr
      GROUP BY sr.user_id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT p.user_id, a.id, p.current_value, 'in_progress', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM best_streak p
    JOIN achievements a ON a.key = 'streak_days'
    ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        current_value = GREATEST(user_achievements.current_value, EXCLUDED.current_value),
        status = CASE
          WHEN user_achievements.status = 'achieved' THEN 'achieved'
          ELSE 'in_progress'
        END,
        last_modified_at = CURRENT_TIMESTAMP;

    UPDATE user_achievements ua
    SET status = 'achieved',
        achieved_at = COALESCE(ua.achieved_at, ua.last_modified_at, CURRENT_TIMESTAMP),
        last_modified_at = CURRENT_TIMESTAMP
    FROM (
      SELECT ua2.id
      FROM user_achievements ua2
      JOIN achievements a ON a.id = ua2.achievement_id
      JOIN achievement_milestones am ON am.achievement_id = a.id
      WHERE a.achievement_type = 'progressive'
      GROUP BY ua2.id
      HAVING ua2.current_value >= MAX(am.target_value)
    ) reached
    WHERE ua.id = reached.id;
  `);

  // Backfill milestone unlock history for all reached thresholds.
  pgm.sql(`
    INSERT INTO user_achievement_milestones (user_id, milestone_id, achieved_at, progress_at_unlock, created_at)
    SELECT
      ua.user_id,
      am.id,
      COALESCE(ua.achieved_at, ua.last_modified_at, CURRENT_TIMESTAMP),
      am.target_value,
      CURRENT_TIMESTAMP
    FROM user_achievements ua
    JOIN achievement_milestones am ON am.achievement_id = ua.achievement_id
    WHERE ua.current_value >= am.target_value
    ON CONFLICT (user_id, milestone_id)
      DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = () => {};
