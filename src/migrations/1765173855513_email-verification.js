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
    pgm.createTable('pending_registrations', {
        id: 'id',
        email: { type: 'varchar(255)', notNull: true, unique: true },
        alias: { type: 'varchar(30)', notNull: true, unique: true },
        name: { type: 'varchar(255)', notNull: true },
        password_hash: { type: 'text', notNull: true },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('pending_registrations', 'email');
    pgm.createIndex('pending_registrations', 'alias');
    pgm.createIndex('pending_registrations', 'created_at');

    pgm.createTable('email_verification_otps', {
        id: { type: 'bigserial', primaryKey: true },
        email: { type: 'varchar(255)', notNull: true },
        code: { type: 'varchar(6)', notNull: true },
        expires_at: { type: 'timestamptz', notNull: true },
        verified: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') }
    });

    pgm.createIndex('email_verification_otps', ['email', 'expires_at']);
    pgm.createIndex('email_verification_otps', 'created_at');

};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('pending_registrations');
    pgm.dropTable('email_verification_otps');
};