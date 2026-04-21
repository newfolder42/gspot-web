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
    pgm.addColumn('posts', {
        deleted_at: { 
            type: 'timestamptz'
        }
    });

    pgm.sql(`
        COMMENT ON COLUMN posts.status IS 'Status: processing, published, failed, deleted';
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropColumn('posts', 'deleted_at');

    pgm.sql(`
        COMMENT ON COLUMN posts.status IS 'Status: processing, published, failed';
    `);
};
