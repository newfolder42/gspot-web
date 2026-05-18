/**
 * Backfill leaderboard rows for all three period_key values:
 *   'total'      – all-time aggregation (recalculate existing rows)
 *   'YYYY-WNN'   – current ISO week   (new rows)
 *   'YYYY-MNN'   – current month       (new rows)
 *
 * After this migration gspot-service is responsible for upserting
 * all three period_keys on every score event.
 */

export const up = (pgm) => {
  pgm.sql(`DELETE FROM leaderboards`);

  pgm.sql(`
    INSERT INTO leaderboards (type, zone_id, user_id, rating, last_modified_at, period_key)
    SELECT 'gps-guessers'                     AS type,
           p.zone_id,
           pg.user_id,
           sum((pg.details ->> 'score')::int) AS rating,
           max(pg.created_at)                 AS last_modified_at,
           periods.period_key
    FROM posts p
    JOIN post_guesses pg ON pg.post_id = p.id
    CROSS JOIN LATERAL (VALUES
        ('total'),
        (to_char(pg.created_at, 'IYYY"-W"IW')),
        (to_char(pg.created_at, 'YYYY"-M"MM'))
    ) AS periods(period_key)
    GROUP BY p.zone_id, pg.user_id, periods.period_key
    ON CONFLICT (type, zone_id, user_id, period_key)
        DO UPDATE SET rating           = EXCLUDED.rating,
                      last_modified_at = EXCLUDED.last_modified_at
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM leaderboards
    WHERE type = 'gps-guessers'
      AND period_key != 'total'
  `);
};
