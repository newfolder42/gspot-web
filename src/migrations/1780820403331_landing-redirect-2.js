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
    utm_campaign: { type: 'varchar(128)' },
  });

  pgm.sql(`
    UPDATE landing_redirects
    SET
      source       = LEFT((regexp_match(landing_path, '[?&]utm_source=([^&]*)'))[1], 32),
      utm_campaign = LEFT((regexp_match(landing_path, '[?&]utm_campaign=([^&]*)'))[1], 128)
    WHERE landing_path LIKE '%utm_%'
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('landing_redirects', ['utm_campaign']);
};
