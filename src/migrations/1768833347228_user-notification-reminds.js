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
  pgm.createTable('user_notification_reminds', {
    id: { type: 'bigserial', primaryKey: true },
    notification_id: { type: 'bigint', notNull: true, references: '"user_notifications"', onDelete: 'cascade' },
    sent_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('user_notification_reminds', 'notification_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('user_notification_reminds');
};
