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
  pgm.createTable('post_votes', {
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
    // 1 = upvote, -1 = downvote
    value: { type: 'smallint', notNull: true, check: 'value in (1, -1)' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('post_votes', 'post_id');
  pgm.createIndex('post_votes', 'comment_id');
  pgm.createIndex('post_votes', 'user_id');

  pgm.createIndex('post_votes', ['post_id', 'user_id'], {
    unique: true,
    where: 'comment_id is null and deleted_at is null',
    name: 'post_votes_active_post_user_uniq',
  });
  pgm.createIndex('post_votes', ['comment_id', 'user_id'], {
    unique: true,
    where: 'comment_id is not null and deleted_at is null',
    name: 'post_votes_active_comment_user_uniq',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('post_votes');
};
