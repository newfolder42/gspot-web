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
  pgm.dropIndex('leaderboards', ['type', 'user_id'], { unique: true });
  pgm.addIndex('leaderboards', ['type', 'zone_id', 'user_id'], { unique: true });
  pgm.addIndex('leaderboards', 'zone_id');

  // Leaderboard events indexes
  pgm.addIndex('leaderboard_events', 'zone_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('leaderboard_events', 'zone_id');
  pgm.dropIndex('leaderboards', 'zone_id');
  pgm.dropIndex('leaderboards', ['type', 'zone_id', 'user_id'], { unique: true });
  pgm.addIndex('leaderboards', ['type', 'user_id'], { unique: true });
};
