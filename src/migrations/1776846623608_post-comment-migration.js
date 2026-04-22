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
    insert into post_comments (post_id, user_id, body, type, metadata, guess_id, created_at)
    select
      pg.post_id,
      pg.user_id,
      '',
      'gps-post-guess',
      jsonb_build_object(
        'score',    pg.details->'score',
        'distance', pg.details->'distance'
      ),
      pg.id,
      pg.created_at
    from post_guesses pg
    where not exists (
      select 1 from post_comments pc where pc.guess_id = pg.id
    )
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`delete from post_comments where type = 'gps-post-guess' and guess_id is not null`);
};
