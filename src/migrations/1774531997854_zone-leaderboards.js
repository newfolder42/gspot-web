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
  // Add zone_id to leaderboards (nullable — backfilled in zone-migration)
  pgm.addColumn('leaderboards', {
    zone_id: { type: 'bigint', references: 'zones', onDelete: 'cascade' },
  });

  // Add zone_id to leaderboard_events (nullable — backfilled in zone-migration)
  pgm.addColumn('leaderboard_events', {
    zone_id: { type: 'bigint', references: 'zones', onDelete: 'cascade' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('leaderboard_events', 'zone_id');
  pgm.dropColumn('leaderboards', 'zone_id');
};
