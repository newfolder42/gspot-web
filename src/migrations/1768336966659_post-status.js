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
        status: { 
            type: 'varchar(20)', 
            notNull: true, 
            default: 'published'
        }
    });

    pgm.addIndex('posts', 'status');

    pgm.sql(`
        COMMENT ON COLUMN posts.status IS 'Status: processing, published, failed';
    `);

    pgm.sql(`
        update posts set status = 'published' where status is null;
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropColumn('posts', 'status');
};
