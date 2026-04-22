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
  pgm.createTable('post_comments', {
    id: { type: 'serial', primaryKey: true },
    post_id: {
      type: 'integer',
      notNull: true,
      references: '"posts"',
      onDelete: 'cascade',
    },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade',
    },
    parent_id: {
      type: 'integer',
      references: '"post_comments"',
      onDelete: 'cascade',
    },
    body: { type: 'text', notNull: true, default: "''" },
    type: { type: 'varchar(50)', notNull: true, default: "'comment'" },
    metadata: { type: 'jsonb' },
    guess_id: {
      type: 'integer',
      references: '"post_guesses"',
      onDelete: 'set null',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('post_comments', 'post_id');
  pgm.createIndex('post_comments', 'parent_id');
  pgm.createIndex('post_comments', 'guess_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('post_comments');
};
