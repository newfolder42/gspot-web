/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Per-zone rules for posting a photo to be guessed, as a jsonb bag so more can be added
 * without a migration each. Set by hand in SQL — there is no UI for it in "მართვა".
 *
 * `date_taken` decides the "გადაღებულია" field on the submit form:
 *   'mandatory' (the default, and the behaviour before this column), 'optional' or 'hidden'.
 * New and existing rows start as 'mandatory'. A missing key is read as 'mandatory' too.
 * See src/lib/zone-guess-posting.ts.
 *
 * Also gives `guess_scoring_rules` its `in_guess_index` key: false leaves the zone's
 * guesses out of the guess index. New and existing rows start as true. A missing key is
 * read as true too (see getUserGuesses in src/lib/posts.ts).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('zone_settings', {
    guess_posting_rules: { type: 'jsonb', notNull: true, default: '{"date_taken":"mandatory"}' },
  });

  // Values are typed in by hand, so a typo is caught here rather than silently read as
  // the default. Only the known key is checked; other keys are free.
  pgm.addConstraint('zone_settings', 'zone_settings_guess_posting_date_taken_check', {
    check: `guess_posting_rules->>'date_taken' IS NULL
            OR guess_posting_rules->>'date_taken' IN ('mandatory', 'optional', 'hidden')`,
  });

  pgm.alterColumn('zone_settings', 'guess_scoring_rules', {
    default: '{"in_guess_index":true}',
  });
  pgm.sql(`
    UPDATE zone_settings
    SET guess_scoring_rules = '{"in_guess_index":true}'::jsonb || guess_scoring_rules
    WHERE NOT guess_scoring_rules ? 'in_guess_index';
  `);

  // Only a JSON boolean is read as a switch; a string "false" would quietly count as true.
  pgm.addConstraint('zone_settings', 'zone_settings_guess_scoring_in_guess_index_check', {
    check: `guess_scoring_rules->'in_guess_index' IS NULL
            OR jsonb_typeof(guess_scoring_rules->'in_guess_index') = 'boolean'`,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('zone_settings', 'zone_settings_guess_scoring_in_guess_index_check');
  pgm.alterColumn('zone_settings', 'guess_scoring_rules', { default: '{}' });
  pgm.dropConstraint('zone_settings', 'zone_settings_guess_posting_date_taken_check');
  pgm.dropColumn('zone_settings', 'guess_posting_rules');
};
