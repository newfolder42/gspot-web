/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * ლოკაციების ჯგუფი — loot tables that several item locations can share, and that a location
 * can share with several others.
 *
 * Before this, `item_location_items` hung off exactly one location. Now the loot belongs to a
 * GROUP (`item_location_groups`) and a location is attached to any number of groups through
 * `item_location_group_members` (many-to-many). A location stays one plain shape — circle or
 * a single polygon — and a post that lands inside it rolls the loot of every active group it
 * belongs to. Typical use: each church is its own location with its own group (its own items),
 * and one more group "all churches" contains all of them (the items they share).
 *
 * Backfill: every existing location gets a group of its own (same name, same status), the
 * location becomes its only member, and its loot rows move to that group. Nothing is merged,
 * so what a find grants is exactly what it granted before — regrouping is done afterwards
 * from the admin.
 *
 * `item_location_items.location_id` is dropped: the loot is no longer a location's property,
 * and a column that silently does nothing would mislead a hand-written INSERT. Seasons
 * (`item_location_item_periods`) hang off the loot rows and move with them untouched.
 *
 * The whole migration runs in one transaction; the checks inside it abort (and so roll back)
 * rather than leave loot orphaned.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('item_location_groups', {
    id: { type: 'serial', primaryKey: true },
    // admin-facing label, never shown to users
    name: { type: 'varchar(120)', notNull: true },
    // a disabled group stops handing out its loot everywhere; its locations keep their other groups
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('item_location_groups', 'item_location_groups_status_check', {
    check: `status IN ('active', 'disabled')`,
  });

  pgm.createTable('item_location_group_members', {
    group_id: { type: 'integer', notNull: true, references: 'item_location_groups', onDelete: 'cascade' },
    location_id: { type: 'integer', notNull: true, references: 'item_locations', onDelete: 'cascade' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  // a location is in a given group at most once; the primary key also serves group → locations
  pgm.addConstraint('item_location_group_members', 'item_location_group_members_pkey', {
    primaryKey: ['group_id', 'location_id'],
  });
  // the post path goes the other way: the locations a point fell in → their groups
  pgm.addIndex('item_location_group_members', 'location_id');

  pgm.addColumn('item_location_items', {
    group_id: { type: 'integer', references: 'item_location_groups', onDelete: 'cascade' },
  });

  // One group per existing location. The location id travels in a scratch column so the
  // membership and the loot rows can find their group without trusting names to be unique.
  pgm.sql(`
    ALTER TABLE item_location_groups ADD COLUMN source_location_id integer;

    INSERT INTO item_location_groups (name, status, source_location_id, created_at)
    SELECT l.name, l.status, l.id, l.created_at
      FROM item_locations l
     ORDER BY l.id;

    INSERT INTO item_location_group_members (group_id, location_id)
    SELECT g.id, g.source_location_id
      FROM item_location_groups g;

    UPDATE item_location_items li
       SET group_id = g.id
      FROM item_location_groups g
     WHERE g.source_location_id = li.location_id;

    ALTER TABLE item_location_groups DROP COLUMN source_location_id;

    DO $$
    BEGIN
      IF (SELECT count(*) FROM item_location_groups) <> (SELECT count(*) FROM item_locations) THEN
        RAISE EXCEPTION 'item_location_groups backfill: group count does not match location count';
      END IF;
      IF EXISTS (SELECT 1 FROM item_location_items WHERE group_id IS NULL) THEN
        RAISE EXCEPTION 'item_location_groups backfill: loot rows left without a group';
      END IF;
    END
    $$;
  `);

  pgm.alterColumn('item_location_items', 'group_id', { notNull: true });

  // the "an item once per loot table" rule, moved up from the location to the group
  pgm.dropConstraint('item_location_items', 'item_location_items_unique');
  pgm.dropColumn('item_location_items', 'location_id');
  pgm.addConstraint('item_location_items', 'item_location_items_group_item_unique', {
    unique: ['group_id', 'item_id'],
  });
  pgm.addIndex('item_location_items', 'group_id');
};

/**
 * Back to one loot table per location. A group's loot is copied onto each of its member
 * locations, seasons included; a group with no members has nowhere to go and is dropped with
 * its loot. If the same item reaches one location from two groups, the oldest row wins.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.addColumn('item_location_items', {
    location_id: { type: 'integer', references: 'item_locations', onDelete: 'cascade' },
  });
  pgm.dropConstraint('item_location_items', 'item_location_items_group_item_unique');

  pgm.sql(`
    -- every loot row keeps its place on the group's first member...
    UPDATE item_location_items li
       SET location_id = (
         SELECT min(m.location_id) FROM item_location_group_members m WHERE m.group_id = li.group_id
       );

    DELETE FROM item_location_items WHERE location_id IS NULL;

    -- ...two groups can hand the same item to the same first member: keep the oldest
    DELETE FROM item_location_items li
     USING item_location_items other
     WHERE other.location_id = li.location_id
       AND other.item_id = li.item_id
       AND other.id < li.id;

    -- ...and gets a copy (with its seasons) on every other member
    DO $$
    DECLARE
      r record;
      new_id integer;
    BEGIN
      FOR r IN
        SELECT li.id, li.item_id, li.grant_mode, li.probability_percent, li.sort_order,
               li.group_id, m.location_id AS target_location_id
          FROM item_location_items li
          JOIN item_location_group_members m ON m.group_id = li.group_id
         WHERE m.location_id <> li.location_id
         ORDER BY li.id, m.location_id
      LOOP
        IF EXISTS (
          SELECT 1 FROM item_location_items x
           WHERE x.location_id = r.target_location_id AND x.item_id = r.item_id
        ) THEN
          CONTINUE;
        END IF;

        INSERT INTO item_location_items
          (location_id, item_id, grant_mode, probability_percent, sort_order, group_id)
        VALUES
          (r.target_location_id, r.item_id, r.grant_mode, r.probability_percent, r.sort_order, r.group_id)
        RETURNING id INTO new_id;

        INSERT INTO item_location_item_periods
          (location_item_id, kind, start_month, start_day, end_month, end_day, starts_on, ends_on, label)
        SELECT new_id, p.kind, p.start_month, p.start_day, p.end_month, p.end_day, p.starts_on, p.ends_on, p.label
          FROM item_location_item_periods p
         WHERE p.location_item_id = r.id;
      END LOOP;
    END
    $$;
  `);

  pgm.dropColumn('item_location_items', 'group_id');
  pgm.alterColumn('item_location_items', 'location_id', { notNull: true });
  pgm.addConstraint('item_location_items', 'item_location_items_unique', {
    unique: ['location_id', 'item_id'],
  });
  pgm.addIndex('item_location_items', 'location_id');

  pgm.dropTable('item_location_group_members');
  pgm.dropTable('item_location_groups');
};
