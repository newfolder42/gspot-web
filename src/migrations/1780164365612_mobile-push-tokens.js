/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Stores Expo push tokens for mobile devices.
 * One row per (user, device) pair — identified by token uniqueness.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('mobile_push_tokens', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    token: { type: 'text', notNull: true, unique: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addIndex('mobile_push_tokens', 'user_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('mobile_push_tokens');
};
