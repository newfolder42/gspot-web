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
    pgm.createTable('posts', {
        id: { type: 'bigserial', primaryKey: true },
        user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
        type: { type: 'varchar(50)', notNull: true },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
        title: { type: 'varchar(512)' },
    });

    pgm.createTable('post_content', {
        id: { type: 'bigserial', primaryKey: true },
        post_id: { type: 'bigint', notNull: true, references: '"posts"', onDelete: 'cascade' },
        content_id: { type: 'bigint', notNull: true, references: '"user_content"', onDelete: 'cascade' },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
        sort: { type: 'integer', notNull: true },
    });

    pgm.createTable('post_guesses', {
        id: { type: 'bigserial', primaryKey: true },
        post_id: { type: 'bigint', notNull: true, references: '"posts"', onDelete: 'cascade' },
        user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
        type: { type: 'varchar(50)', notNull: true },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
        details: { type: 'jsonb' },
    });

    pgm.addIndex('posts', 'user_id');
    pgm.addIndex('post_content', 'post_id');
    pgm.addIndex('post_content', 'content_id');
    pgm.addIndex('post_guesses', 'post_id');
    pgm.addIndex('post_guesses', 'user_id');
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('post_content');
    pgm.dropTable('post_guesses');
    pgm.dropTable('posts');
};