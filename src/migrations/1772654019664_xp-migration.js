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
    pgm.sql(`INSERT INTO user_xp (user_id, xp, level, created_at, last_modified_at)
SELECT
    user_id,
    total_xp,
    COALESCE(
            (SELECT MAX(level)
             FROM xp_levels
             WHERE xp <= total_xp),
            1
    ) as level,
    NOW() as created_at,
    NOW() as last_modified_at
FROM (
    SELECT
        u.id as user_id,
        COALESCE(
            -- XP from guessing posts (50 XP each)
                (SELECT COUNT(*) * 50 FROM post_guesses pg WHERE pg.user_id = u.id)
                    +
                    -- XP from posts being guessed (10 XP each)
                (SELECT COUNT(*) * 10 FROM post_guesses pg
                INNER JOIN posts p ON pg.post_id = p.id
                 WHERE p.user_id = u.id)
                    +
                    -- XP from publishing posts (100 XP each)
                (SELECT COUNT(*) * 100 FROM posts p WHERE p.user_id = u.id)
            , 0) as total_xp
    FROM users u
) as xp_calculation
WHERE total_xp > 0
ON CONFLICT (user_id)
    DO UPDATE SET
                  xp = EXCLUDED.xp,
                  level = EXCLUDED.level,
                  last_modified_at = NOW();
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => { };
