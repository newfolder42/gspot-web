/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * `user_items.source_details.locationName` is dead weight: a copy of `item_locations.name`
 * that nothing ever read. The only consumer of source_details is the admin inventory page,
 * which prints the object as raw JSON, and `locationId` beside it already identifies the
 * location. The name is also an admin-facing label that was never meant for users.
 *
 * `grantItemsForPost` stops writing it in the same release. The `item:found` event keeps its
 * `locationName` — the notification handler in gspot-services does use that one.
 *
 * `down` puts the current location name back for every row that still has a `locationId`
 * (it is a copy, so a renamed location restores under its new name).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE user_items
       SET source_details = source_details - 'locationName'
     WHERE source_details ? 'locationName';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    UPDATE user_items ui
       SET source_details = ui.source_details || jsonb_build_object('locationName', l.name)
      FROM item_locations l
     WHERE ui.source = 'found'
       AND l.id = CASE WHEN ui.source_details->>'locationId' ~ '^[0-9]{1,9}$'
                       THEN (ui.source_details->>'locationId')::int
                  END;
  `);
};
