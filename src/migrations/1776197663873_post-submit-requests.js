/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('post_submit_requests', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    request_id: { type: 'varchar(80)', notNull: true },
    post_id: { type: 'bigint', references: 'posts', onDelete: 'set null' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('post_submit_requests', ['user_id', 'request_id'], {
    name: 'post_submit_requests_user_request_uix',
    unique: true,
  });

  pgm.addIndex('post_submit_requests', 'post_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('post_submit_requests');
};
