/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Location disputes ("გასაჩივრება"): a guesser who scored under 100 can contest the post's
 * location. Staff (zone owner / admin) review the post and may suspend it; the author then
 * corrects the location (the post comes back and its guesses are re-scored) or staff discard
 * it for good.
 *
 * `posts.status` gains the value 'suspended' — a varchar with no CHECK, so no DDL is needed
 * for it, and every feed already filters on status = 'published', which is what hides a
 * suspended post. Additive only: nothing here changes a column the live app reads.
 *
 * - post_location_disputes: one row per contested guess. UNIQUE (guess_id) because a guess
 *   is contested once; a dismissed dispute stays on record rather than being re-openable.
 *   score/distance are snapshots of the guess at filing time, for the reviewer. `reason` is
 *   one of a short fixed list the guesser picks from, `note` their own words (required for
 *   'other').
 * - post_suspensions: one row per suspension, so the history of a post is kept. At most one
 *   can be awaiting correction at a time. `note` is what the reviewing admin wrote to the
 *   author when suspending.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('post_suspensions', {
    id: { type: 'bigserial', primaryKey: true },
    post_id: { type: 'bigint', notNull: true, references: '"posts"', onDelete: 'cascade' },
    suspended_by: { type: 'bigint', references: '"users"', onDelete: 'set null' },
    state: { type: 'varchar(30)', notNull: true, default: 'awaiting_correction' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    resolved_at: { type: 'timestamptz' },
    resolved_by: { type: 'bigint', references: '"users"', onDelete: 'set null' },
    note: { type: 'text' },
  });

  pgm.addConstraint('post_suspensions', 'post_suspensions_state_check', {
    check: `state IN ('awaiting_correction', 'corrected', 'discarded', 'restored')`,
  });
  pgm.createIndex('post_suspensions', ['post_id', 'id']);
  pgm.sql(`
    CREATE UNIQUE INDEX post_suspensions_one_awaiting_idx
      ON post_suspensions (post_id) WHERE state = 'awaiting_correction';
  `);

  pgm.createTable('post_location_disputes', {
    id: { type: 'bigserial', primaryKey: true },
    post_id: { type: 'bigint', notNull: true, references: '"posts"', onDelete: 'cascade' },
    guess_id: { type: 'bigint', notNull: true, references: '"post_guesses"', onDelete: 'cascade' },
    reporter_user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
    score: { type: 'integer' },
    distance: { type: 'integer' },
    reason: { type: 'varchar(30)', notNull: true },
    note: { type: 'text' },
    status: { type: 'varchar(20)', notNull: true, default: 'open' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    resolved_at: { type: 'timestamptz' },
    resolved_by: { type: 'bigint', references: '"users"', onDelete: 'set null' },
    // the suspension an upheld dispute led to — scopes the dispute list to the current cycle
    suspension_id: { type: 'bigint', references: '"post_suspensions"', onDelete: 'set null' },
  });

  pgm.addConstraint('post_location_disputes', 'post_location_disputes_reason_check', {
    check: `reason IN ('wrong_place', 'subject_not_camera', 'other')`,
  });
  pgm.addConstraint('post_location_disputes', 'post_location_disputes_status_check', {
    check: `status IN ('open', 'upheld', 'dismissed')`,
  });
  pgm.addConstraint('post_location_disputes', 'post_location_disputes_guess_unique', {
    unique: ['guess_id'],
  });
  pgm.createIndex('post_location_disputes', ['post_id', 'status']);
  pgm.createIndex('post_location_disputes', ['reporter_user_id']);

  pgm.sql(`
    COMMENT ON COLUMN posts.status IS 'Status: processing, published, failed, deleted, suspended';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // A suspended post would be unreachable once this schema is gone, so put them back.
  pgm.sql(`UPDATE posts SET status = 'published' WHERE status = 'suspended'`);

  pgm.dropTable('post_location_disputes');
  pgm.dropTable('post_suspensions');

  pgm.sql(`
    COMMENT ON COLUMN posts.status IS 'Status: processing, published, failed, deleted';
  `);
};
