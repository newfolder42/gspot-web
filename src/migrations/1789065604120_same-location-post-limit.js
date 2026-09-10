/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * A user may not publish two gps-photo posts from
 * within the same small square in a short window.
 *
 * `user_post_locations` is the guard's own copy of where each published gps-photo post
 * was taken. The coordinates already live in `user_content.details->'coordinates'`, but
 * that is a jsonb payload behind two joins and cannot be indexed for this lookup; a flat
 * row per post can. Only gps-photo posts are recorded — quest-completion and დამალობანა
 * posts are game-driven and are neither written here nor blocked.
 *
 * There is no PostGIS in this database, so the proximity test is a square rather than a
 * circle: the radius is converted to degrees of latitude and longitude and the query asks
 * for rows inside that bounding box (see src/lib/postLocations.ts). A square is both
 * cheaper and, at 50 m, indistinguishable in practice — its corners reach ~70 m, which
 * only makes the rule slightly stricter on the diagonals. It also needs no stored bbox
 * columns the way `item_locations` does: the lookup is already narrowed to one user and
 * the last half hour, so it reads a handful of rows at most.
 *
 * `project_settings` is a single row holding the numbers the rule is tuned by, so they
 * can be changed with an UPDATE instead of a deploy. It is deliberately one row with
 * typed columns rather than a key/value bag — every setting keeps its own type and its
 * own CHECK.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // One row, forever: `id` is pinned to 1 so a second row cannot be inserted by accident
  // and every reader can select without a WHERE.
  pgm.createTable('project_settings', {
    id: { type: 'integer', primaryKey: true, default: 1 },
    // how long a spot stays blocked for the user who posted there
    same_location_post_limit_minutes: { type: 'integer', notNull: true, default: 30 },
    // half-width of the square around the previous post, in metres
    same_location_post_range_m: { type: 'integer', notNull: true, default: 50 },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('project_settings', 'project_settings_single_row_check', {
    check: 'id = 1',
  });
  // 0 in either column switches the rule off; negatives would invert the comparison.
  pgm.addConstraint('project_settings', 'project_settings_same_location_check', {
    check: 'same_location_post_limit_minutes >= 0 AND same_location_post_range_m >= 0',
  });

  pgm.sql(`INSERT INTO project_settings (id) VALUES (1)`);

  pgm.createTable('user_post_locations', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
    post_id: { type: 'bigint', notNull: true, references: '"posts"', onDelete: 'cascade' },
    latitude: { type: 'double precision', notNull: true },
    longitude: { type: 'double precision', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // A post is recorded once. Deleting the post takes its location with it, which is what
  // we want: a deleted post should stop blocking the spot.
  pgm.addConstraint('user_post_locations', 'user_post_locations_post_unique', {
    unique: ['post_id'],
  });

  // The only query this table serves: one user's rows from the last N minutes, then a
  // bounding-box test on the few that come back. Descending `created_at` lets the planner
  // stop as soon as it walks past the window.
  pgm.addIndex('user_post_locations', [
    'user_id',
    { name: 'created_at', sort: 'DESC' },
  ]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('user_post_locations');
  pgm.dropTable('project_settings');
};
