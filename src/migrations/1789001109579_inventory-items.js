/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * ინვენტარი — collectible ნივთები a user gathers from quests, achievements and by
 * posting inside a hand-placed item location.
 *
 * Items have no gameplay use yet and grant no XP: they only show up in the inventory bag.
 * The taxonomy (`item_categories` → `item_types`), the catalog (`items`), the spawn points
 * (`item_locations`), their loot tables (`item_location_items`) and the seasons those
 * entries are available in (`item_location_item_periods`) are all curated by hand in SQL —
 * there is no admin UI.
 *
 * `user_items` holds one row per user+item. Whether that row may be earned again is the
 * item's own property: a `stackable` item bumps `user_items.count` on every further grant
 * and shows the count in its slot; a non-stackable one is a no-op after the first.
 *
 * Locations are either a circle (latitude/longitude + radius_m) or a polygon ring stored
 * as jsonb `[[lng,lat], …]`. There is no PostGIS in this database, so every shape also
 * carries its bounding box — filled by a trigger, never typed in: SQL filters on the
 * indexed bbox and the app refines the hit with haversine / ray-casting
 * (see src/lib/itemLocations.ts).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Taxonomy: an item has one type, a type belongs to one category. The category is
  // therefore reached through the type — items never name one directly. `sort_order` on
  // the category fixes the order of the planned inventory tabs.
  pgm.createTable('item_categories', {
    id: { type: 'serial', primaryKey: true },
    alias: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(100)', notNull: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('item_types', {
    id: { type: 'serial', primaryKey: true },
    alias: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(100)', notNull: true },
    category_id: { type: 'integer', notNull: true, references: 'item_categories', onDelete: 'restrict' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addIndex('item_types', 'category_id');

  pgm.createTable('items', {
    id: { type: 'serial', primaryKey: true },
    // stable key used by reward specs and loot tables, e.g. 'kolkhuri-cxeni'
    alias: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    // svg or png, served from the uploads bucket like reward icons
    icon_url: { type: 'text' },
    // drives the WoW-style border colour of the inventory slot
    quality: { type: 'varchar(20)', notNull: true, default: 'common' },
    // the item's type, and through it its category. Nullable: an item is usable before
    // it has been filed anywhere.
    type_id: { type: 'integer', references: 'item_types', onDelete: 'set null' },
    // false: a user can hold this once, further grants are no-ops and no count is shown.
    // true: further grants raise user_items.count, and the slot renders that count.
    stackable: { type: 'boolean', notNull: true, default: false },
    // 'disabled' items stop being granted but stay in the bags that already hold them
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('items', 'items_quality_check', {
    check: `quality IN ('common', 'uncommon', 'rare', 'epic', 'legendary')`,
  });
  pgm.addConstraint('items', 'items_status_check', {
    check: `status IN ('active', 'disabled')`,
  });
  pgm.addIndex('items', 'type_id');

  pgm.createTable('user_items', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    item_id: { type: 'integer', notNull: true, references: 'items', onDelete: 'cascade' },
    // how many the user holds — only ever above 1 for an item with items.stackable
    count: { type: 'integer', notNull: true, default: 1 },
    // where it came from, for the item detail sheet and for debugging grants
    source: { type: 'varchar(20)', notNull: true, default: 'found' },
    source_details: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('user_items', 'user_items_source_check', {
    check: `source IN ('found', 'quest', 'achievement', 'manual')`,
  });
  // One row per user+item either way — a stackable item stacks into `count` rather than
  // into extra rows, so this is the upsert target for every grant.
  pgm.addConstraint('user_items', 'user_items_user_item_unique', {
    unique: ['user_id', 'item_id'],
  });
  pgm.addConstraint('user_items', 'user_items_count_check', {
    check: 'count >= 1',
  });
  // drives the inventory page: newest first, filtered by user
  pgm.addIndex('user_items', ['user_id', 'created_at']);

  pgm.createTable('item_locations', {
    id: { type: 'serial', primaryKey: true },
    // admin-facing label, never shown to users
    name: { type: 'varchar(120)', notNull: true },
    shape_type: { type: 'varchar(20)', notNull: true },
    // circle shapes only
    latitude: { type: 'double precision' },
    longitude: { type: 'double precision' },
    radius_m: { type: 'integer' },
    // polygon shapes only: a single outer ring as [[lng,lat], …] (GeoJSON coordinate order)
    polygon: { type: 'jsonb' },
    // bounding box of the shape — the only part SQL looks at, derived by the trigger below
    min_lat: { type: 'double precision', notNull: true },
    max_lat: { type: 'double precision', notNull: true },
    min_lng: { type: 'double precision', notNull: true },
    max_lng: { type: 'double precision', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    // reserved: not enforced yet
    max_finds: { type: 'integer' },
    found_count: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('item_locations', 'item_locations_shape_type_check', {
    check: `shape_type IN ('circle', 'polygon')`,
  });
  pgm.addConstraint('item_locations', 'item_locations_status_check', {
    check: `status IN ('active', 'disabled')`,
  });
  // a circle needs a centre and a radius; a polygon needs a ring — neither may be half-filled
  pgm.addConstraint('item_locations', 'item_locations_shape_check', {
    check: `(
      shape_type = 'circle'
        AND latitude IS NOT NULL AND longitude IS NOT NULL AND radius_m IS NOT NULL AND radius_m > 0
    ) OR (
      shape_type = 'polygon' AND polygon IS NOT NULL AND jsonb_array_length(polygon) >= 3
    )`,
  });
  pgm.addIndex('item_locations', ['status', 'min_lat', 'max_lat']);
  pgm.addIndex('item_locations', ['status', 'min_lng', 'max_lng']);

  // Locations are written by hand in SQL, and a bbox that does not match its shape fails
  // silently — the location simply never matches a post. So the bbox is derived here
  // instead of being typed in: an INSERT only ever supplies the shape.
  // A circle's box is padded by its radius in degrees (111320 m per degree of latitude,
  // shrunk by cos(lat) for longitude); a polygon's is the extent of its ring.
  pgm.sql(`
    CREATE FUNCTION item_locations_set_bbox() RETURNS trigger AS $$
    DECLARE
      lat_pad double precision;
      lng_pad double precision;
    BEGIN
      IF NEW.shape_type = 'circle' THEN
        lat_pad := NEW.radius_m / 111320.0;
        lng_pad := NEW.radius_m / (111320.0 * GREATEST(cos(radians(NEW.latitude)), 0.01));
        NEW.min_lat := NEW.latitude - lat_pad;
        NEW.max_lat := NEW.latitude + lat_pad;
        NEW.min_lng := NEW.longitude - lng_pad;
        NEW.max_lng := NEW.longitude + lng_pad;
      ELSE
        SELECT min((c->>1)::double precision), max((c->>1)::double precision),
               min((c->>0)::double precision), max((c->>0)::double precision)
          INTO NEW.min_lat, NEW.max_lat, NEW.min_lng, NEW.max_lng
          FROM jsonb_array_elements(NEW.polygon) AS c;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER item_locations_bbox
      BEFORE INSERT OR UPDATE OF shape_type, latitude, longitude, radius_m, polygon
      ON item_locations
      FOR EACH ROW EXECUTE FUNCTION item_locations_set_bbox();
  `);

  pgm.createTable('item_location_items', {
    id: { type: 'serial', primaryKey: true },
    location_id: { type: 'integer', notNull: true, references: 'item_locations', onDelete: 'cascade' },
    item_id: { type: 'integer', notNull: true, references: 'items', onDelete: 'cascade' },
    // 'mandatory' rows are all granted; 'probability' rows are rolled and at most one wins
    grant_mode: { type: 'varchar(20)', notNull: true, default: 'mandatory' },
    probability_percent: { type: 'integer' },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('item_location_items', 'item_location_items_grant_mode_check', {
    check: `grant_mode IN ('mandatory', 'probability')`,
  });
  pgm.addConstraint('item_location_items', 'item_location_items_probability_check', {
    check: `(
      grant_mode = 'mandatory' AND probability_percent IS NULL
    ) OR (
      grant_mode = 'probability' AND probability_percent BETWEEN 1 AND 100
    )`,
  });
  pgm.addConstraint('item_location_items', 'item_location_items_unique', {
    unique: ['location_id', 'item_id'],
  });
  pgm.addIndex('item_location_items', 'location_id');

  // When a loot entry is available. Seasonality belongs to the entry, not to the
  // location: one spot can hand out a flower in spring and a snowman in winter, and a
  // whole location is switched off with item_locations.status instead.
  //
  // A loot entry with no period rows is always available. With them, it is available when
  // ANY of them matches — hence several rows per entry rather than one range.
  //
  // 'annual' repeats every year (a flowering season, a snowy month) and may wrap the year
  // end: start 12-01 / end 02-28 means December through February. 'range' is a one-off
  // window between two dates, inclusive, for something that happens once.
  pgm.createTable('item_location_item_periods', {
    id: { type: 'serial', primaryKey: true },
    location_item_id: {
      type: 'integer',
      notNull: true,
      references: 'item_location_items',
      onDelete: 'cascade',
    },
    kind: { type: 'varchar(20)', notNull: true, default: 'annual' },
    // annual only, 1-12 / 1-31
    start_month: { type: 'smallint' },
    start_day: { type: 'smallint' },
    end_month: { type: 'smallint' },
    end_day: { type: 'smallint' },
    // range only, both inclusive
    starts_on: { type: 'date' },
    ends_on: { type: 'date' },
    // free note for your own reading, e.g. 'გაზაფხული' — never shown to users
    label: { type: 'varchar(60)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('item_location_item_periods', 'item_location_item_periods_kind_check', {
    check: `kind IN ('annual', 'range')`,
  });
  // Each kind must be fully filled in and must not carry the other kind's columns — a
  // half-written period would silently narrow or widen when it is evaluated.
  pgm.addConstraint('item_location_item_periods', 'item_location_item_periods_shape_check', {
    check: `(
      kind = 'annual'
        AND start_month BETWEEN 1 AND 12 AND start_day BETWEEN 1 AND 31
        AND end_month BETWEEN 1 AND 12 AND end_day BETWEEN 1 AND 31
        AND starts_on IS NULL AND ends_on IS NULL
    ) OR (
      kind = 'range'
        AND starts_on IS NOT NULL AND ends_on IS NOT NULL AND starts_on <= ends_on
        AND start_month IS NULL AND start_day IS NULL
        AND end_month IS NULL AND end_day IS NULL
    )`,
  });
  pgm.addIndex('item_location_item_periods', 'location_item_id');

  // First taxonomy rows. The rest are added by hand — see src/data/inventory-examples.sql.
  pgm.sql(`
    INSERT INTO item_categories (alias, name, sort_order) VALUES
      ('cloth', 'სამოსი', 10);

    INSERT INTO item_types (alias, name, category_id)
    SELECT 'coth-head', 'თავსაბურავი', c.id
    FROM item_categories c WHERE c.alias = 'cloth';
  `);

  // Collecting ნივთები is its own achievement track, fed by every grant source.
  pgm.sql(`
    INSERT INTO achievements (key, name, category, achievement_type, state, image_url)
    VALUES ('items_collected', 'კოლექციონერი', 'items', 'progressive', 'visible', NULL);

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('items_3', '3 ნივთი', 3, 1, 'visible'),
        ('items_10', '10 ნივთი', 10, 2, 'visible'),
        ('items_20', '20 ნივთი', 20, 3, 'visible'),
        ('items_50', '50 ნივთი', 50, 4, 'visible'),
        ('items_100', '100 ნივთი', 100, 5, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'items_collected';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM user_achievement_milestones
     WHERE milestone_id IN (
       SELECT m.id FROM achievement_milestones m
       JOIN achievements a ON a.id = m.achievement_id
       WHERE a.key = 'items_collected'
     );
    DELETE FROM user_achievements
     WHERE achievement_id IN (SELECT id FROM achievements WHERE key = 'items_collected');
    DELETE FROM achievement_milestones
     WHERE achievement_id IN (SELECT id FROM achievements WHERE key = 'items_collected');
    DELETE FROM achievements WHERE key = 'items_collected';
  `);

  pgm.dropTable('item_location_item_periods');
  pgm.dropTable('item_location_items');
  pgm.dropTable('item_locations');
  pgm.sql('DROP FUNCTION IF EXISTS item_locations_set_bbox()');
  pgm.dropTable('user_items');
  pgm.dropTable('items');
  pgm.dropTable('item_types');
  pgm.dropTable('item_categories');
};
