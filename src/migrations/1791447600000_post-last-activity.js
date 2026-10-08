/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Activity-ranked home feed (src/lib/posts.ts → getHomeFeedPosts).
 *
 * `posts.last_activity_at` is the moment someone last engaged with the post — a guess, a
 * comment, an upvote or a reward. Triggers keep it current, so every writer (web, /api/v1,
 * gspot-services) is covered without each one remembering to bump it. Who acted and how
 * is deliberately not stored: followed users' engagement is read from the activity tables,
 * and a post_activity ledger can be added if multi-actor headers ever need it.
 *
 * Only what counts as engagement bumps: a guess's own `*-guess-comment` row doesn't (the
 * guess already did), and a downvote doesn't. Removing a vote never lowers the value, so the
 * column only ever moves forward — which is what keeps feed pagination duplicate-free.
 *
 * The user_id indexes serve the "activity by people the viewer follows" lookup.
 * Additive with defaults, so code that doesn't know about the columns keeps working.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('posts', {
    last_activity_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  // The default stamped every existing row with the migration time; a post nobody has
  // touched is only as fresh as its own creation.
  pgm.sql(`UPDATE posts SET last_activity_at = COALESCE(created_at, now())`);

  pgm.sql(`
    UPDATE posts p
       SET last_activity_at = a.at
      FROM (
        SELECT post_id, MAX(at) AS at
          FROM (
            SELECT post_id, created_at AS at FROM post_guesses
            UNION ALL
            SELECT post_id, created_at FROM post_comments WHERE type = 'comment' AND deleted_at IS NULL
            UNION ALL
            SELECT post_id, created_at FROM post_votes WHERE value = 1 AND deleted_at IS NULL
            UNION ALL
            SELECT post_id, created_at FROM post_rewards WHERE deleted_at IS NULL
          ) x
         GROUP BY post_id
      ) a
     WHERE a.post_id = p.id AND a.at > p.last_activity_at
  `);

  pgm.sql(`
    CREATE FUNCTION bump_post_last_activity() RETURNS trigger AS $$
    BEGIN
      UPDATE posts SET last_activity_at = now() WHERE id = NEW.post_id;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER post_guesses_bump_activity
      AFTER INSERT ON post_guesses
      FOR EACH ROW EXECUTE FUNCTION bump_post_last_activity();

    CREATE TRIGGER post_comments_bump_activity
      AFTER INSERT ON post_comments
      FOR EACH ROW WHEN (NEW.type = 'comment')
      EXECUTE FUNCTION bump_post_last_activity();

    CREATE TRIGGER post_votes_bump_activity
      AFTER INSERT ON post_votes
      FOR EACH ROW WHEN (NEW.value = 1)
      EXECUTE FUNCTION bump_post_last_activity();

    CREATE TRIGGER post_rewards_bump_activity
      AFTER INSERT ON post_rewards
      FOR EACH ROW EXECUTE FUNCTION bump_post_last_activity();
  `);

  // The predicates match the feed query's, so the partial indexes are usable by it.
  pgm.sql(`
    CREATE INDEX post_guesses_user_created_idx ON post_guesses (user_id, created_at DESC);
    CREATE INDEX post_comments_user_created_idx ON post_comments (user_id, created_at DESC)
      WHERE type = 'comment' AND deleted_at IS NULL;
    CREATE INDEX post_votes_user_created_idx ON post_votes (user_id, created_at DESC)
      WHERE value = 1 AND deleted_at IS NULL;
    CREATE INDEX post_rewards_user_created_idx ON post_rewards (user_id, created_at DESC)
      WHERE deleted_at IS NULL;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS post_rewards_user_created_idx;
    DROP INDEX IF EXISTS post_votes_user_created_idx;
    DROP INDEX IF EXISTS post_comments_user_created_idx;
    DROP INDEX IF EXISTS post_guesses_user_created_idx;

    DROP TRIGGER IF EXISTS post_rewards_bump_activity ON post_rewards;
    DROP TRIGGER IF EXISTS post_votes_bump_activity ON post_votes;
    DROP TRIGGER IF EXISTS post_comments_bump_activity ON post_comments;
    DROP TRIGGER IF EXISTS post_guesses_bump_activity ON post_guesses;
    DROP FUNCTION IF EXISTS bump_post_last_activity();
  `);
  pgm.dropColumns('posts', ['last_activity_at']);
};
