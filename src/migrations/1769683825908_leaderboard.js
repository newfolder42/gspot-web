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
  pgm.createTable('leaderboards', {
    id: { type: 'bigserial', primaryKey: true },
    type: { type: 'varchar(50)', notNull: true },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    rating: { type: 'integer', notNull: true, default: 0 },
    last_modified_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('leaderboards', 'type');
  pgm.addIndex('leaderboards', 'user_id');

  pgm.createTable('leaderboard_events', {
    id: { type: 'bigserial', primaryKey: true },
    leaderboard_id: { type: 'bigint', notNull: true, references: 'leaderboards', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: false, references: 'users', onDelete: 'set null' },
    type: { type: 'varchar(50)', notNull: true },
    rating_delta: { type: 'integer', notNull: true, default: 0 },
    details: { type: 'jsonb' },
    occurred_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('leaderboard_events', 'leaderboard_id');
  pgm.addIndex('leaderboard_events', 'user_id');
  pgm.addIndex('leaderboard_events', 'type');

  pgm.addIndex('leaderboards', ['type', 'user_id'], { unique: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('leaderboard_events');
  pgm.dropTable('leaderboards');
};

