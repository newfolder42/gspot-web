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
  pgm.createTable('zones', {
    id: { type: 'bigserial', primaryKey: true },
    slug: { type: 'varchar(80)', notNull: true },
    name: { type: 'varchar(120)', notNull: true },
    description: { type: 'text' },
    visibility: { type: 'varchar(20)', notNull: true, default: 'public' },
    join_policy: { type: 'varchar(20)', notNull: true, default: 'open' },
    state: { type: 'varchar(20)', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('zones', 'zones_visibility_check', {
    check: `visibility IN ('public', 'private')`,
  });
  pgm.addConstraint('zones', 'zones_join_policy_check', {
    check: `join_policy IN ('open', 'invite_only', 'request')`,
  });
  pgm.addConstraint('zones', 'zones_state_check', {
    check: `state IN ('active', 'archived', 'disabled')`,
  });

  pgm.addIndex('zones', 'slug', { unique: true });

  // Add zone_id FK to posts (nullable — backfilled and made NOT NULL in zone-migration)
  pgm.addColumn('posts', {
    zone_id: { type: 'bigint', references: 'zones', onDelete: 'restrict' },
  });

  pgm.addIndex('posts', 'zone_id');

  pgm.createTable('zone_settings', {
    zone_id: { type: 'bigint',  primaryKey: true, notNull: true, references: 'zones', onDelete: 'cascade' },
    upload_rules: { type: 'jsonb', notNull: true, default: '{}' },
    guess_scoring_rules: { type: 'jsonb', notNull: true, default: '{}' },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('zone_settings', 'zone_id', { unique: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('posts', ['zone_id', 'created_at']);
  pgm.dropIndex('posts', 'zone_id');
  pgm.dropColumn('posts', 'zone_id');
  pgm.dropTable('zone_settings');
  pgm.dropTable('zones');
};
