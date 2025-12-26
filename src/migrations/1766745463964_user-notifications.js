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
    pgm.createTable('user_notifications', {
        id: { type: 'bigserial', primaryKey: true },
        user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
        type: { type: 'varchar(50)', notNull: true },
        details: { type: 'jsonb', notNull: true },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
        seen: { type: 'int' },
        seen_at: { type: 'timestamptz' },
    });

    pgm.addIndex('user_notifications', 'user_id');
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('user_notifications');
};