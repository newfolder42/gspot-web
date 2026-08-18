/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * feed_event_reactions — one reaction per user per feed_event ("ამბავი").
 * Only 'upvote' exists for now; `type` is kept so more can be added without a
 * schema change. Rows are removed with their event (48h cleanup cascade).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('feed_event_reactions', {
    id: { type: 'bigserial', primaryKey: true },
    event_id: { type: 'bigint', notNull: true, references: 'feed_events', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    type: { type: 'varchar(20)', notNull: true, default: 'upvote' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('feed_event_reactions', 'feed_event_reactions_type_check', {
    check: `type IN ('upvote')`,
  });

  // one reaction per user per event
  pgm.addIndex('feed_event_reactions', ['event_id', 'user_id'], { unique: true });
  pgm.addIndex('feed_event_reactions', 'user_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('feed_event_reactions');
};
