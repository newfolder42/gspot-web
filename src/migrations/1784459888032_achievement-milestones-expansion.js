/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Adds higher milestones to existing progressive achievements and a new
 * quests_completed achievement. perfect_guesses_total already has users that
 * reached its previous max (100), so their progress is recalculated and their
 * achievement/milestone rows are moved back to in_progress against the new max.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('perfect_guesses_200', '200 ზუსტი გამოცნობა', 200, 5, 'visible'),
        ('perfect_guesses_500', '500 ზუსტი გამოცნობა', 500, 6, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'perfect_guesses_total';
  `);

  pgm.sql(`
    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('posts_1000', '1000 პოსტი', 1000, 8, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'posts_total';

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('guesses_1000', '1000 გამოცნობა', 1000, 7, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'guesses_total';

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('streaks_200', '200 დღიანი უწყვეტობა', 200, 6, 'visible'),
        ('streaks_365', '365 დღიანი უწყვეტობა', 365, 7, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'streak_days';
  `);

  pgm.sql(`
    INSERT INTO achievements (key, name, category, achievement_type, state, image_url)
    VALUES ('quests_completed', 'მისიები', 'quests', 'progressive', 'visible', NULL);

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('quests_1', 'პირველი მისია', 1, 1, 'visible'),
        ('quests_5', '5 მისია', 5, 2, 'visible'),
        ('quests_10', '10 მისია', 10, 3, 'visible'),
        ('quests_20', '20 მისია', 20, 4, 'visible'),
        ('quests_50', '50 მისია', 50, 5, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'quests_completed';
  `);

  pgm.sql(`
    WITH quest_progress AS (
      SELECT uq.user_id, COUNT(*)::int AS current_value, MIN(uq.completed_at) AS first_completed_at
      FROM user_quests uq
      WHERE uq.status = 'completed'
      GROUP BY uq.user_id
    ),
    target AS (
      SELECT a.id AS achievement_id, MAX(am.target_value) AS max_value
      FROM achievements a
      JOIN achievement_milestones am ON am.achievement_id = a.id
      WHERE a.key = 'quests_completed'
      GROUP BY a.id
    )
    INSERT INTO user_achievements (user_id, achievement_id, current_value, status, achieved_at, created_at, last_modified_at)
    SELECT
      p.user_id,
      t.achievement_id,
      p.current_value,
      CASE WHEN p.current_value >= t.max_value THEN 'achieved' ELSE 'in_progress' END,
      CASE WHEN p.current_value >= t.max_value THEN COALESCE(p.first_completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM quest_progress p
    JOIN target t ON TRUE
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  `);

  pgm.sql(`
    WITH quest_progress AS (
      SELECT uq.user_id, COUNT(*)::int AS current_value, MIN(uq.completed_at) AS first_completed_at
      FROM user_quests uq
      WHERE uq.status = 'completed'
      GROUP BY uq.user_id
    )
    INSERT INTO user_achievement_milestones (user_id, milestone_id, achieved_at, progress_at_unlock, created_at)
    SELECT
      p.user_id,
      am.id,
      COALESCE(p.first_completed_at, CURRENT_TIMESTAMP),
      am.target_value,
      CURRENT_TIMESTAMP
    FROM quest_progress p
    JOIN achievements a ON a.key = 'quests_completed'
    JOIN achievement_milestones am ON am.achievement_id = a.id
    WHERE p.current_value >= am.target_value
    ON CONFLICT (user_id, milestone_id) DO NOTHING;
  `);

  pgm.sql(`
    WITH max_target AS (
      SELECT MAX(am.target_value) AS max_value
      FROM achievement_milestones am
      JOIN achievements a ON a.id = am.achievement_id
      WHERE a.key = 'perfect_guesses_total'
    ),
    recalc AS (
      SELECT ua.id, COALESCE(pg.total, 0) AS current_value
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id AND a.key = 'perfect_guesses_total'
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS total
        FROM post_guesses
        WHERE COALESCE((details->>'score')::int, 0) >= 100
        GROUP BY user_id
      ) pg ON pg.user_id = ua.user_id
    )
    UPDATE user_achievements ua
    SET current_value = r.current_value,
        status = CASE
          WHEN r.current_value >= mt.max_value THEN 'achieved'
          WHEN r.current_value > 0 THEN 'in_progress'
          ELSE 'locked'
        END,
        achieved_at = CASE
          WHEN r.current_value >= mt.max_value THEN COALESCE(ua.achieved_at, CURRENT_TIMESTAMP)
          ELSE NULL
        END,
        last_modified_at = CURRENT_TIMESTAMP
    FROM recalc r, max_target mt
    WHERE ua.id = r.id;
  `);

  pgm.sql(`
    INSERT INTO user_achievement_milestones (user_id, milestone_id, achieved_at, progress_at_unlock)
    SELECT ua.user_id, am.id, CURRENT_TIMESTAMP, am.target_value
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id AND a.key = 'perfect_guesses_total'
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
  pgm.sql(`
    DELETE FROM achievement_milestones
    WHERE key IN (
      'perfect_guesses_200', 'perfect_guesses_500',
      'posts_1000', 'guesses_1000',
      'streaks_200', 'streaks_365'
    );

    DELETE FROM achievements WHERE key = 'quests_completed';
  `);
};
