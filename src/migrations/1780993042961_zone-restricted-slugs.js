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
  pgm.sql(`insert into restricted_inputs (type, slug) values
    ('zone-slug', 'new'),
    ('zone-slug', 'submit'),
    ('zone-slug', 'settings'),
    ('zone-slug', 'admin'),
    ('zone-slug', 'api')
    on conflict (type, slug) do nothing`);
  
    pgm.sql(`insert into restricted_inputs (type, slug)
    select 'zone-slug', slug from restricted_inputs where type = 'user-alias'
    on conflict (type, slug) do nothing`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`delete from restricted_inputs where type = 'zone-slug'`);
};
