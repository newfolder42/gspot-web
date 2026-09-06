/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Posts a user skipped in the shuffle guess deck.
 *
 * A skip is a "not this one, not now" — never a permanent hide, or a keen
 * player would burn through their own pool. One row per (user, post): each
 * further skip bumps skip_count and pushes skipped_at forward, and the pool
 * query hides the post for a window that grows with the count
 * (see SKIP_COOLDOWN_DAYS in src/lib/guessSkips.ts).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('post_guess_skips', {
    user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
    post_id: { type: 'bigint', notNull: true, references: '"posts"', onDelete: 'cascade' },
    skip_count: { type: 'integer', notNull: true, default: 1 },
    skipped_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('post_guess_skips', 'post_guess_skips_pkey', {
    primaryKey: ['user_id', 'post_id'],
  });

  // The pool query filters a user's skips by how recent they are.
  pgm.addIndex('post_guess_skips', ['user_id', 'skipped_at']);

  // The eligibility check is "has this user guessed this post" — an anti-join
  // on both columns, which the two single-column indexes serve poorly.
  pgm.addIndex('post_guesses', ['user_id', 'post_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropIndex('post_guesses', ['user_id', 'post_id']);
  pgm.dropTable('post_guess_skips');
};
