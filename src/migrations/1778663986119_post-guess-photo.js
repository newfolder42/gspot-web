/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`update post_comments set type = 'gps-guess-comment' where type = 'gps-post-guess'`);
  pgm.sql(`update post_comments set type = 'gps-photo-guess-comment' where type = 'gps-post-photo-guess'`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`update post_comments set type = 'gps-post-guess' where type = 'gps-guess-comment'`);
  pgm.sql(`update post_comments set type = 'gps-post-photo-guess' where type = 'gps-photo-guess-comment'`);
};
