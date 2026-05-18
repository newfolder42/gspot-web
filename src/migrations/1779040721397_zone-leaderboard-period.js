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
  // ── leaderboards ──────────────────────────────────────────────────────────
  // e.g. '2026-W20', '2026-M05', or 'total'
  pgm.addColumn('leaderboards', {
    period_key: { type: 'varchar(20)' },
  });

  // Existing rows → 'total' (they are the pre-period all-time leaderboard)
  pgm.sql(`UPDATE leaderboards SET period_key = 'total'`);

  pgm.sql(`ALTER TABLE leaderboards ALTER COLUMN period_key SET NOT NULL`);
  pgm.sql(`ALTER TABLE leaderboards ALTER COLUMN period_key SET DEFAULT 'total'`);

  // Replace the old (type, user_id) unique index with one that includes zone_id + period_key
  pgm.dropIndex('leaderboards', ['type', 'zone_id', 'user_id'], { unique: true, ifExists: true });
  pgm.addIndex('leaderboards', ['type', 'zone_id', 'user_id', 'period_key'], { unique: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('leaderboards', ['type', 'zone_id', 'user_id', 'period_key'], { ifExists: true });
  pgm.addIndex('leaderboards', ['type', 'user_id'], { unique: true });
  pgm.dropColumn('leaderboards', 'period_key');
};
