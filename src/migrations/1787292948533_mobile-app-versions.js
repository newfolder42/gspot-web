/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Temporary "please update the app" support:
 *  - mobile_app_versions holds the released version per platform, maintained by hand.
 *  - mobile_version_checks records what each install is actually running, one row
 *    per device so repeated app opens update instead of piling up.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('mobile_app_versions', {
    platform: { type: 'text', primaryKey: true },
    latest_version: { type: 'text', notNull: true },
    // Below this the update prompt turns non-skippable; NULL means "never force".
    min_supported_version: { type: 'text' },
    notes: { type: 'text' },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Seeded with the version this feature ships in — bump by hand on every release.
  pgm.sql(`
    INSERT INTO mobile_app_versions (platform, latest_version, min_supported_version)
    VALUES ('android', '0.1.1', NULL), ('ios', '0.1.1', NULL);
  `);

  pgm.createTable('mobile_version_checks', {
    id: { type: 'bigserial', primaryKey: true },
    // Random id generated once per install, so an anonymous device still counts once.
    device_key: { type: 'text', notNull: true, unique: true },
    user_id: {
      type: 'integer',
      references: '"users"',
      onDelete: 'SET NULL',
    },
    platform: { type: 'text', notNull: true },
    app_version: { type: 'text', notNull: true },
    os_version: { type: 'text' },
    device_model: { type: 'text' },
    check_count: { type: 'integer', notNull: true, default: 1 },
    first_seen_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    last_seen_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addIndex('mobile_version_checks', 'user_id');
  pgm.addIndex('mobile_version_checks', ['platform', 'app_version']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('mobile_version_checks');
  pgm.dropTable('mobile_app_versions');
};
