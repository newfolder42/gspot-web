/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Raises the level cap from 42 to 60.
 *
 * `xp_levels` is the single source of truth for the cap (both web and services
 * derive `maxLevel` from its row count), so levels 43-60 are appended with the
 * same accelerating curve the 39-42 tail already uses: the per-level cost keeps
 * growing, by 200 a level instead of the mid-game 50.
 *
 * Two new `level_reached` milestones (50, 60) sit above the hidden level_42 one.
 *
 * Anyone sitting on the old cap had their XP frozen: `increaseUserXp` returns
 * early once `level >= maxLevel`, so neither `user_xp.xp` nor `user_xp_events`
 * recorded anything they earned afterwards. Their totals are therefore rebuilt
 * from the activity tables at today's rates rather than from the (incomplete)
 * event log, and `GREATEST` keeps the stored total whenever the rebuild comes
 * out lower, so nobody is demoted by rates that changed since they earned it.
 *
 * Their level_reached achievement then drops back to 'in_progress' with a NULL
 * achieved_at; `updateProgressiveAchievement` COALESCEs achieved_at, so it fills
 * in honestly when they actually reach 60.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO xp_levels (level, xp) VALUES
    (43, 53850),
    (44, 56850),
    (45, 60050),
    (46, 63450),
    (47, 67050),
    (48, 70850),
    (49, 74850),
    (50, 79050),
    (51, 83450),
    (52, 88050),
    (53, 92850),
    (54, 97850),
    (55, 103050),
    (56, 108450),
    (57, 114050),
    (58, 119850),
    (59, 125850),
    (60, 132050);
  `);

  pgm.sql(`
    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('level_50', 'მე-50 დონე', 50, 11, 'visible'),
        ('level_60', 'მე-60 დონე', 60, 12, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'level_reached';
  `);

  // Rebuild the frozen totals from the activity tables, using the current
  // xpActionDictionary rates (gps guess 50, photo guess 100, own post guessed
  // 10, published post 100, hide-and-seek catch 300, host caught 50). A post
  // that was published and then deleted nets to zero, which is exactly what
  // filtering on status = 'published' gives.
  pgm.sql(`
    WITH capped AS (
      SELECT user_id FROM user_xp WHERE level >= 42
    ),
    recalculated AS (
      SELECT
        c.user_id,
        COALESCE((
          SELECT SUM(CASE WHEN pg.type = 'gps-guess' THEN 50 ELSE 100 END)
          FROM post_guesses pg
          WHERE pg.user_id = c.user_id
        ), 0)
        + COALESCE((
          SELECT COUNT(*) * 10
          FROM post_guesses pg
          JOIN posts p ON p.id = pg.post_id
          WHERE p.user_id = c.user_id
        ), 0)
        + COALESCE((
          SELECT COUNT(*) * 100
          FROM posts p
          WHERE p.user_id = c.user_id AND p.status = 'published'
        ), 0)
        + COALESCE((
          SELECT COUNT(*) * 300
          FROM hide_and_seek_players hp
          WHERE hp.user_id = c.user_id AND hp.role = 'seeker' AND hp.status = 'found'
        ), 0)
        + COALESCE((
          SELECT COUNT(*) * 50
          FROM hide_and_seek_players hp
          JOIN hide_and_seek_games g ON g.id = hp.game_id
          WHERE g.user_id = c.user_id AND hp.role = 'seeker' AND hp.status = 'found'
        ), 0) AS total_xp
      FROM capped c
    )
    UPDATE user_xp ux
    SET xp = GREATEST(ux.xp, r.total_xp),
        level = COALESCE(
          (SELECT MAX(xl.level) FROM xp_levels xl WHERE xl.xp <= GREATEST(ux.xp, r.total_xp)),
          1
        ),
        last_modified_at = CURRENT_TIMESTAMP
    FROM recalculated r
    WHERE ux.user_id = r.user_id;
  `);

  // Bring level_reached back in line with the recalculated levels and the new max.
  pgm.sql(`
    WITH max_target AS (
      SELECT MAX(am.target_value) AS max_value
      FROM achievement_milestones am
      JOIN achievements a ON a.id = am.achievement_id
      WHERE a.key = 'level_reached'
    )
    UPDATE user_achievements ua
    SET current_value = GREATEST(ua.current_value, ux.level),
        status = CASE
          WHEN GREATEST(ua.current_value, ux.level) >= mt.max_value THEN 'achieved'
          ELSE 'in_progress'
        END,
        achieved_at = CASE
          WHEN GREATEST(ua.current_value, ux.level) >= mt.max_value THEN ua.achieved_at
          ELSE NULL
        END,
        last_modified_at = CURRENT_TIMESTAMP
    FROM achievements a, user_xp ux, max_target mt
    WHERE a.id = ua.achievement_id
      AND a.key = 'level_reached'
      AND ux.user_id = ua.user_id
      AND ua.status = 'achieved';
  `);

  // Any milestone the recalculated level now clears (e.g. level_50) is unlocked.
  pgm.sql(`
    INSERT INTO user_achievement_milestones (user_id, milestone_id, achieved_at, progress_at_unlock)
    SELECT ua.user_id, am.id, CURRENT_TIMESTAMP, am.target_value
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id AND a.key = 'level_reached'
    JOIN achievement_milestones am ON am.achievement_id = a.id
    WHERE ua.current_value >= am.target_value
    ON CONFLICT (user_id, milestone_id) DO NOTHING;
  `);
};

/**
 * The XP rebuild is not reversible; only the cap, the milestones and the
 * achievement status are rolled back (against the old max of 42).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM user_achievement_milestones uam
    USING achievement_milestones am
    WHERE am.id = uam.milestone_id
      AND am.key IN ('level_50', 'level_60');

    DELETE FROM achievement_milestones am
    USING achievements a
    WHERE a.id = am.achievement_id
      AND a.key = 'level_reached'
      AND am.key IN ('level_50', 'level_60');
  `);

  pgm.sql(`
    UPDATE user_achievements ua
    SET status = 'achieved',
        achieved_at = COALESCE(ua.achieved_at, CURRENT_TIMESTAMP),
        last_modified_at = CURRENT_TIMESTAMP
    FROM achievements a
    WHERE a.id = ua.achievement_id
      AND a.key = 'level_reached'
      AND ua.current_value >= 42;
  `);

  pgm.sql(`
    UPDATE user_xp
    SET level = 42, last_modified_at = CURRENT_TIMESTAMP
    WHERE level > 42;

    DELETE FROM xp_levels WHERE level > 42;
  `);
};
