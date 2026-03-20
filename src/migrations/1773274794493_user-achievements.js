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
  pgm.createTable('user_achievements', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    achievement_id: { type: 'bigint', notNull: true, references: 'achievements', onDelete: 'cascade' },
    current_value: { type: 'integer', notNull: true, default: 0 },
    status: { type: 'varchar(20)', notNull: true, default: 'locked' },
    achieved_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    last_modified_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('user_achievements', 'user_achievements_status_check', {
    check: `status IN ('locked', 'in_progress', 'achieved')`,
  });

  pgm.createTable('user_achievement_milestones', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    milestone_id: { type: 'bigint', notNull: true, references: 'achievement_milestones', onDelete: 'cascade' },
    achieved_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    progress_at_unlock: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('user_achievements', 'user_id');
  pgm.addIndex('user_achievements', 'achievement_id');
  pgm.addIndex('user_achievements', ['user_id', 'achievement_id'], { unique: true });

  pgm.addIndex('user_achievement_milestones', 'user_id');
  pgm.addIndex('user_achievement_milestones', 'milestone_id');
  pgm.addIndex('user_achievement_milestones', ['user_id', 'milestone_id'], { unique: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('user_achievement_milestones');
  pgm.dropTable('user_achievements');
};
