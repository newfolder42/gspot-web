/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * ჩამახსოვრებულები — posts a user saved to come back to, typically to guess on the spot once
 * they are standing near the place.
 *
 * Deliberately a table for posts only rather than a generic (target_type, target_id) one: a
 * real foreign key means a deleted post or user takes its bookmarks with it (posts are
 * hard-deleted), the list is a plain join, and nothing here has to know about other target
 * types. A different kind of bookmark later gets its own table next to this one.
 *
 * `id` exists for paging: the list is newest-save-first and `id` is a strict, gap-free-enough
 * order that survives timestamp ties and the millisecond rounding a JS Date would add to a
 * `created_at` cursor. Removing a bookmark and saving the post again gives it a fresh id, so
 * it comes back at the top, which is where a just-saved post belongs.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('post_bookmarks', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
    post_id: { type: 'bigint', notNull: true, references: '"posts"', onDelete: 'cascade' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // One bookmark per user and post; also the lookup for "which of these posts did I save".
  pgm.addConstraint('post_bookmarks', 'post_bookmarks_user_post_key', {
    unique: ['user_id', 'post_id'],
  });

  // A user's list, newest save first.
  pgm.createIndex('post_bookmarks', ['user_id', { name: 'id', sort: 'DESC' }]);

  // Deleting a post finds its bookmarks through the cascade; the unique key leads with user_id.
  pgm.createIndex('post_bookmarks', 'post_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('post_bookmarks');
};
