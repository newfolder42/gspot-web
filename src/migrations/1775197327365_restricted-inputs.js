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
  pgm.createTable('restricted_inputs', {
    id: { type: 'bigserial', primaryKey: true },
    type: { type: 'varchar(40)', notNull: true },
    slug: { type: 'varchar(80)', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('restricted_inputs', 'restricted_inputs_type_check', {
    check: `type IN ('user-alias', 'zone-slug')`,
  });

  pgm.addIndex('restricted_inputs', ['type', 'slug'], { unique: true });

  pgm.sql(`insert into restricted_inputs (type, slug) values
    ('user-alias', 'admin'),
    ('user-alias', 'fuck'),
    ('user-alias', 'dick'),
    ('user-alias', 'd1ck'),
    ('user-alias', 'nigga'),
    ('user-alias', 'nigger'),
    ('user-alias', 'pedo'),
    ('user-alias', 'georgiandream'),
    ('user-alias', 'russia'),
    ('user-alias', 'russian'),
    ('user-alias', 'gspot'),
    ('user-alias', 'zone'),
    ('user-alias', 'auth'),
    ('user-alias', 'official')
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('restricted_inputs');
};
