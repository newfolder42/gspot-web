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
  pgm.createTable('post_rewards', {
    id: { type: 'serial', primaryKey: true },
    post_id: {
      type: 'integer',
      notNull: true,
      references: '"posts"',
      onDelete: 'cascade',
    },
    comment_id: {
      type: 'integer',
      references: '"post_comments"',
      onDelete: 'cascade',
    },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade',
    },
    reward_key: { type: 'varchar(50)', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('post_rewards', 'post_id');
  pgm.createIndex('post_rewards', 'comment_id');
  pgm.createIndex('post_rewards', 'user_id');

  // one active reward per user per target (giving a new reward replaces the old one)
  pgm.createIndex('post_rewards', ['post_id', 'user_id'], {
    unique: true,
    where: 'comment_id is null and deleted_at is null',
    name: 'post_rewards_active_post_user_uniq',
  });
  pgm.createIndex('post_rewards', ['comment_id', 'user_id'], {
    unique: true,
    where: 'comment_id is not null and deleted_at is null',
    name: 'post_rewards_active_comment_user_uniq',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('post_rewards');
};
