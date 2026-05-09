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
  // Tags defined per-zone (like Reddit flairs)
  pgm.createTable('zone_tags', {
    id: { type: 'bigserial', primaryKey: true },
    zone_id: { type: 'bigint', notNull: true, references: 'zones', onDelete: 'cascade' },
    name: { type: 'varchar(60)', notNull: true },
    color: { type: 'varchar(7)', notNull: true, default: "'#6b7280'" }, // hex color
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('zone_tags', 'zone_id');
  pgm.addConstraint('zone_tags', 'zone_tags_name_zone_unique', {
    unique: ['zone_id', 'name'],
  });

  // One post may have at most one tag (enforced by unique on post_id)
  pgm.createTable('post_tags', {
    id: { type: 'bigserial', primaryKey: true },
    post_id: { type: 'bigint', notNull: true, references: 'posts', onDelete: 'cascade' },
    tag_id: { type: 'bigint', notNull: true, references: 'zone_tags', onDelete: 'set null' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('post_tags', 'post_tags_post_unique', { unique: ['post_id'] });
  pgm.addIndex('post_tags', 'tag_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('post_tags');
  pgm.dropTable('zone_tags');
};
