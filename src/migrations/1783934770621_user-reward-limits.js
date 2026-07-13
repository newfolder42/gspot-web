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
  // per-user override of the daily reward-giving quota; users without a row fall back
  // to DEFAULT_DAILY_REWARD_LIMIT. Raised e.g. after a quest/level reward.
  pgm.createTable('user_reward_limits', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      unique: true,
      references: '"users"',
      onDelete: 'cascade',
    },
    daily_limit: { type: 'integer', notNull: true },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('user_reward_limits');
};
