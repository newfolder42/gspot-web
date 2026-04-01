/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {

  pgm.sql(`
    INSERT INTO zones (slug, name, description, visibility, join_policy, state)
    VALUES ('public', 'Public', 'საქართველო', 'public', 'open', 'active')
    ON CONFLICT (slug) DO NOTHING;
  `);

  pgm.sql(`
    UPDATE posts p
    SET zone_id = z.id
    FROM zones z
    WHERE z.slug = 'public'
      AND p.zone_id IS NULL;
  `);

  pgm.alterColumn('posts', 'zone_id', { notNull: true });

  pgm.sql(`
    UPDATE leaderboards l
    SET zone_id = z.id
    FROM zones z
    WHERE z.slug = 'public'
      AND l.zone_id IS NULL;
  `);

  pgm.alterColumn('leaderboards', 'zone_id', { notNull: true });

  pgm.sql(`
    UPDATE leaderboard_events le
    SET zone_id = l.zone_id
    FROM leaderboards l
    WHERE l.id = le.leaderboard_id
      AND le.zone_id IS NULL;
  `);

  pgm.alterColumn('leaderboard_events', 'zone_id', { notNull: true });

  pgm.sql(`
    INSERT INTO zone_members (zone_id, user_id, role, status)
    SELECT z.id, u.id, 'member', 'active'
    FROM users u
    CROSS JOIN zones z
    WHERE z.slug = 'public'
    ON CONFLICT (zone_id, user_id) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.alterColumn('leaderboard_events', 'zone_id', { notNull: false });
  pgm.alterColumn('leaderboards', 'zone_id', { notNull: false });
  pgm.alterColumn('posts', 'zone_id', { notNull: false });
  pgm.sql(`UPDATE posts set zone_id = null;`);
  pgm.sql(`DELETE FROM zones WHERE slug = 'public';`);
};
