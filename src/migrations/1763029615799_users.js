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
    pgm.createTable('users', {
        id: { type: 'bigserial', primaryKey: true },
        alias: { type: 'varchar(50)', notNull: true },
        name: { type: 'varchar(255)', notNull: true },
        email: { type: 'varchar(255)', notNull: true },
        password_hash: { type: 'varchar(255)', notNull: true },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    });
    pgm.sql(`CREATE UNIQUE INDEX users_alias_lower_idx ON users (lower(alias));`);
    pgm.sql(`CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => { pgm.dropTable('users'); };
//dotenv -e .env.local -- npx node-pg-migrate up