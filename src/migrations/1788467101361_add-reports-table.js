/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * User reports against posts, comments, or other users — the in-app path required by
 * Google Play's child safety policy (and useful for spam/harassment generally).
 * target_type/target_id is polymorphic by design: no FK, since the target table varies.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('reports', {
    id: { type: 'serial', primaryKey: true },
    reporter_user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    target_type: { type: 'varchar(20)', notNull: true },
    target_id: { type: 'integer', notNull: true },
    reason: { type: 'varchar(40)', notNull: true },
    details: { type: 'text' },
    status: { type: 'varchar(20)', notNull: true, default: 'open' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    resolved_at: { type: 'timestamptz' },
  });

  pgm.sql(`
    ALTER TABLE reports ADD CONSTRAINT reports_target_type_check
      CHECK (target_type IN ('post', 'comment', 'user'));
  `);

  pgm.sql(`
    ALTER TABLE reports ADD CONSTRAINT reports_status_check
      CHECK (status IN ('open', 'reviewed', 'dismissed'));
  `);

  pgm.createIndex('reports', ['target_type', 'target_id']);
  pgm.createIndex('reports', ['reporter_user_id']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('reports');
};
