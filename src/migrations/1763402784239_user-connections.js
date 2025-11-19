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
    pgm.createTable('user_connections', {
        id: { type: 'bigserial', primaryKey: true },
        user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
        type: { type: 'varchar(50)', notNull: true },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
        connection_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
    });

    pgm.addIndex('user_connections', 'user_id');
    pgm.addIndex('user_connections', 'connection_id');
    pgm.sql('CREATE UNIQUE INDEX user_connection_uix ON user_connections (user_id, type, connection_id)');
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('user_connections');
};
//dotenv -e .env.local -- npx node-pg-migrate up