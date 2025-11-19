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
    pgm.createTable('user_content', {
        id: { type: 'bigserial', primaryKey: true },
        user_id: { type: 'bigint', notNull: true, references: '"users"', onDelete: 'cascade' },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
        type: { type: 'varchar(50)', notNull: true },
        public_url: { type: 'varchar(250)', notNull: true },
        details: { type: 'jsonb', notNull: true },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => { pgm.dropTable('user_content'); };
//dotenv -e .env.local -- npx node-pg-migrate up