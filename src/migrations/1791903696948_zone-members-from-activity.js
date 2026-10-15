/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Membership backfill for the "only members interact" rule.
 *
 * Until now a public zone was open to everyone for reading *and* writing: a user who never
 * joined it could still post, guess, comment, vote and reward there. The new rule makes an
 * active zone_members row the entry ticket for every interaction, so everyone who already
 * interacted without one would be locked out of a zone they have been playing in.
 *
 * This gives each such (user, zone) pair a membership, dated at the user's first action in
 * that zone, so the member list reads as if they had joined the moment they started:
 *
 *   posts, post_guesses, post_comments, post_votes, post_rewards  ->  zone via posts.zone_id
 *
 * Everything else that can be done to a post leaves a row in one of those (a hide-and-seek
 * join/check is a post_comments row, a location dispute needs a guess), so they need no
 * source of their own. Soft-deleted comments, votes and rewards count: the action happened.
 *
 * Only pairs with NO zone_members row are touched. Anyone who has a row keeps it exactly as
 * it is, whatever its status:
 *   - 'left'    stepped out on purpose; they can rejoin with one tap.
 *   - 'banned'  must never be put back.
 *   - 'pending' is waiting on the zone's approval; this must not approve them behind its back.
 *   - 'active'  is already a member (joined_at is left alone even when it is later than the
 *               first action — that is when they formally joined).
 *
 * Idempotent: ON CONFLICT DO NOTHING on the (zone_id, user_id) unique index, so it is safe to
 * run again by hand right after the new rules go live, to catch anything a non-member did in
 * the gap between this migration and the deploy.
 *
 * Irreversible by design: once backfilled, a row is indistinguishable from a real join, and
 * dropping it would lock out members who have acted since. `down` is therefore a no-op.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    WITH activity AS (
      SELECT p.zone_id, p.user_id, p.created_at AS at
        FROM posts p
      UNION ALL
      SELECT p.zone_id, g.user_id, g.created_at
        FROM post_guesses g
        JOIN posts p ON p.id = g.post_id
      UNION ALL
      SELECT p.zone_id, c.user_id, c.created_at
        FROM post_comments c
        JOIN posts p ON p.id = c.post_id
      UNION ALL
      SELECT p.zone_id, v.user_id, v.created_at
        FROM post_votes v
        JOIN posts p ON p.id = v.post_id
      UNION ALL
      SELECT p.zone_id, r.user_id, r.created_at
        FROM post_rewards r
        JOIN posts p ON p.id = r.post_id
    ),
    first_action AS (
      SELECT zone_id, user_id, MIN(at) AS first_at
        FROM activity
       GROUP BY zone_id, user_id
    )
    INSERT INTO zone_members (zone_id, user_id, role, status, joined_at)
    SELECT zone_id, user_id, 'member', 'active', COALESCE(first_at, now())
      FROM first_action
    ON CONFLICT (zone_id, user_id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = () => {
  // Intentionally empty — see the note on `up`.
};
