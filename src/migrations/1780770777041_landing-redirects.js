/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('landing_redirects', {
    id: { type: 'bigserial', primaryKey: true },
    source: { type: 'varchar(32)', notNull: true },
    landing_path: { type: 'text', notNull: true },
    referrer: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('landing_redirects', ['source', 'created_at'], {
    name: 'landing_redirects_source_created_at_idx',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('landing_redirects');
};