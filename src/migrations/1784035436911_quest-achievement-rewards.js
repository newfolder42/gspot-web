/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Typed reward lists on quests and achievements, e.g.
 *   [{"type":"user-xp","value":200},{"type":"reward","key":"sherlock"}]
 * Quests must always carry a user-xp reward (enforced at the app level);
 * achievement/milestone rewards are optional and seeded by developers.
 * Granting happens asynchronously in gspot-services per reward type.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('zone_quests', {
    rewards: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
  });
  pgm.addColumn('achievements', {
    rewards: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
  });
  pgm.addColumn('achievement_milestones', {
    rewards: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
  });

  // Existing quests keep granting exactly what they did before this migration.
  pgm.sql(`
    UPDATE zone_quests
    SET rewards = '[{"type":"user-xp","value":200}]'::jsonb
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('achievement_milestones', 'rewards');
  pgm.dropColumn('achievements', 'rewards');
  pgm.dropColumn('zone_quests', 'rewards');
};
