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
  pgm.createTable('zone_members', {
    id: { type: 'bigserial', primaryKey: true },
    zone_id: { type: 'bigint', notNull: true, references: 'zones', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    role: { type: 'varchar(20)', notNull: true, default: 'member' },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    notifications: { type: 'jsonb', notNull: true, default: '{"enabled": true}' },
    joined_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    last_seen_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('zone_members', 'zone_members_role_check', {
    check: `role IN ('owner', 'admin', 'moderator', 'member')`,
  });
  pgm.addConstraint('zone_members', 'zone_members_status_check', {
    check: `status IN ('active', 'left', 'banned', 'pending')`,
  });

  pgm.addIndex('zone_members', ['zone_id', 'user_id'], { unique: true });
  pgm.addIndex('zone_members', 'user_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('zone_members');
};
