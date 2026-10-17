/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * ნივთები on a post — the items its author found by posting there, shown over the photo in
 * the home feed and on the post page.
 *
 * `user_items` answers "what does this user own"; it cannot answer "what did this post
 * find" (a stackable item keeps one row per user, so only its first find carries a post).
 * `post_items` is that second question: one row per post+item, written by
 * `grantItemsForPost` in the same request that grants the item.
 *
 * It holds a reference, never a copy: the name, icon and quality are read from `items` when
 * a post is served, so renaming an item or swapping its artwork changes every post that
 * shows it. Retired (`disabled`) items stay on the posts that found them, like they stay in
 * a bag. Posts are hard-deleted, hence the cascade; `item_id` cascades too, so removing a
 * catalog row cannot leave a dangling slot.
 *
 * The primary key doubles as the lookup index (a feed page asks for `post_id = any(...)`).
 * `sort` keeps the order the loot was granted in, which is the order the loot window lists it.
 *
 * Backfill: every item a user was already granted by a post (`user_items.source = 'found'`,
 * post in `source_details.postId`) is attached to that post. A stackable item's row only
 * remembers its FIRST find, so a later find of the same stack cannot be recovered — those
 * posts simply start without that item. Nothing is lost that was ever recorded.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('post_items', {
    post_id: { type: 'bigint', notNull: true, references: 'posts', onDelete: 'cascade' },
    item_id: { type: 'integer', notNull: true, references: 'items', onDelete: 'cascade' },
    sort: { type: 'smallint', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('post_items', 'post_items_pkey', {
    primaryKey: ['post_id', 'item_id'],
  });

  // Oldest grant first within a post, so the backfilled order matches what a live post
  // would have got. source_details is free jsonb, so `postId` is only cast when it is all
  // digits — and the CASE, unlike a WHERE, is guaranteed to run before the cast: one
  // malformed row must not abort the whole migration.
  pgm.sql(`
    WITH found AS (
      SELECT ui.id, ui.item_id, ui.created_at,
             CASE WHEN ui.source_details->>'postId' ~ '^[0-9]{1,18}$'
                  THEN (ui.source_details->>'postId')::bigint
             END AS post_id
        FROM user_items ui
       WHERE ui.source = 'found'
    )
    INSERT INTO post_items (post_id, item_id, sort, created_at)
    SELECT f.post_id,
           f.item_id,
           (row_number() OVER (PARTITION BY f.post_id ORDER BY f.id) - 1)::smallint,
           f.created_at
      FROM found f
      JOIN posts p ON p.id = f.post_id
    ON CONFLICT (post_id, item_id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('post_items');
};
