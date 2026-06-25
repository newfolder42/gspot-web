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
  pgm.addColumn('zone_quest_characters', {
    slug: { type: 'varchar(150)' },
  });

  pgm.sql(`UPDATE zone_quest_characters SET slug = 'character-' || id::text WHERE slug IS NULL;`);

  pgm.alterColumn('zone_quest_characters', 'slug', { notNull: true });
  pgm.addIndex('zone_quest_characters', ['zone_id', 'slug'], { unique: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumn('zone_quest_characters', 'slug');
};
