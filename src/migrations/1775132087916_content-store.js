/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('content_store', {
    id: { type: 'bigserial', primaryKey: true },
    reference_type: { type: 'varchar(30)', notNull: true },
    reference_id: { type: 'bigint', notNull: true },
    content_type: { type: 'varchar(50)', notNull: true },
    public_url: { type: 'varchar(250)', notNull: true },
    details: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('content_store', 'content_store_reference_type_check', {
    check: `reference_type IN ('zone', 'user')`,
  });

  pgm.addConstraint('content_store', 'content_store_content_type_check', {
    check: `content_type IN ('profile-photo', 'banner', 'gps-photo')`,
  });

  pgm.addIndex('content_store', ['reference_type', 'reference_id', 'content_type', 'created_at'], {
    name: 'content_store_ref_lookup_idx',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('content_store');
};
