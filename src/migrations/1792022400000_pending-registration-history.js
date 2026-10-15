/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * pending_registrations rows are deleted on completion, replacement and expiry, which
 * leaves no trace of a signup that never produced a user. This keeps one row per
 * removal (never the password hash) so "verified OTP but no user" can be explained.
 *
 * outcome: completed | expired | replaced | failed | missing
 *   missing = a correct code arrived but there was no pending row (pending_id is null).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('pending_registration_history', {
    id: { type: 'bigserial', primaryKey: true },
    pending_id: { type: 'integer' },
    email: { type: 'varchar(255)', notNull: true },
    alias: { type: 'varchar(30)' },
    name: { type: 'varchar(255)' },
    pending_created_at: { type: 'timestamp' },
    outcome: { type: 'varchar(20)', notNull: true },
    detail: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('pending_registration_history', ['email', 'created_at']);
  pgm.createIndex('pending_registration_history', 'created_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('pending_registration_history');
};
