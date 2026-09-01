/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Moves the per-game settings of დამალობანა into a single `config` jsonb.
 *
 * The hidden coordinate was the first of what is turning into a growing list of host
 * choices, and every new one would otherwise be another column plus another CHECK. The
 * jsonb holds them all: `latitude`, `longitude` and now `endOnFirstFind` — whether the
 * game stops the moment the first seeker lands inside the catch radius.
 *
 * The columns that the SQL still filters or orders on (status, ends_at, max_checks,
 * duration_minutes) stay columns on purpose; only the payload the application reads
 * whole moves into the document.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('hide_and_seek_games', {
    config: { type: 'jsonb', notNull: true, default: '{}' },
  });

  pgm.sql(`
    update hide_and_seek_games
       set config = jsonb_build_object(
             'latitude', latitude,
             'longitude', longitude,
             'endOnFirstFind', false
           )
  `);

  pgm.dropColumns('hide_and_seek_games', ['latitude', 'longitude']);

  // 'first_found' is what an auto-ended game records, so it reads apart from the host
  // pressing stop and from the clock running out.
  pgm.dropConstraint('hide_and_seek_games', 'hide_and_seek_games_ended_reason_check');
  pgm.addConstraint('hide_and_seek_games', 'hide_and_seek_games_ended_reason_check', {
    check: `ended_reason IS NULL OR ended_reason IN ('expired', 'host_ended', 'first_found')`,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`update hide_and_seek_games set ended_reason = 'host_ended' where ended_reason = 'first_found'`);

  pgm.dropConstraint('hide_and_seek_games', 'hide_and_seek_games_ended_reason_check');
  pgm.addConstraint('hide_and_seek_games', 'hide_and_seek_games_ended_reason_check', {
    check: `ended_reason IS NULL OR ended_reason IN ('expired', 'host_ended')`,
  });

  pgm.addColumns('hide_and_seek_games', {
    latitude: { type: 'double precision' },
    longitude: { type: 'double precision' },
  });

  pgm.sql(`
    update hide_and_seek_games
       set latitude = (config->>'latitude')::double precision,
           longitude = (config->>'longitude')::double precision
  `);

  pgm.alterColumn('hide_and_seek_games', 'latitude', { notNull: true });
  pgm.alterColumn('hide_and_seek_games', 'longitude', { notNull: true });

  pgm.dropColumn('hide_and_seek_games', 'config');
};
