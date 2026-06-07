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
  pgm.addColumns('landing_redirects', {
    utm_source: { type: 'varchar(32)' },
    utm_campaign: { type: 'varchar(128)' },
  });

  // Backfill utm_source and utm_campaign from landing_path query string
  pgm.sql(`
    UPDATE landing_redirects
    SET
      utm_source   = LEFT((regexp_match(landing_path, '[?&]utm_source=([^&]*)'))[1], 32),
      utm_campaign = LEFT((regexp_match(landing_path, '[?&]utm_campaign=([^&]*)'))[1], 128)
    WHERE landing_path LIKE '%utm_%'
  `);

  // Normalize source: facebook → meta
  pgm.sql(`UPDATE landing_redirects SET source = 'meta' WHERE source = 'facebook'`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`UPDATE landing_redirects SET source = 'facebook' WHERE source = 'meta'`);
  pgm.dropColumns('landing_redirects', ['utm_source', 'utm_campaign']);
};
