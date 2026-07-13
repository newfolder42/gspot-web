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
  pgm.createTable('rewards', {
    id: { type: 'serial', primaryKey: true },
    key: { type: 'varchar(50)', notNull: true, unique: true },
    // Georgian display name
    name: { type: 'varchar(100)', notNull: true },
    // which targets this reward can be applied to: 'post' and/or 'comment'
    applies_to: { type: 'varchar(20)[]', notNull: true },
    // unlockable rewards are earned via achievements/quests
    unlockable: { type: 'boolean', notNull: true, default: false },
    icon_url: { type: 'text' },
    // 'disabled' rewards can no longer be chosen, but stay visible wherever already given
    status: { type: 'varchar(20)', notNull: true, default: 'active', check: "status in ('active', 'disabled')" },
    // display order in the reward picker
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.sql(`
    insert into rewards (key, name, applies_to, unlockable, icon_url, status, sort_order) values
      ('love', 'გული', ARRAY['post','comment']::varchar(20)[], false, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/love.svg', 'active', 0),
      ('laugh', 'ჰა-ჰა', ARRAY['comment']::varchar(20)[], false, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/laugh.svg', 'active', 1),
      ('sherlock', 'შერლოკი', ARRAY['post','comment']::varchar(20)[], true, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/sherlock.svg', 'active', 2)
  `);

  pgm.addConstraint('post_rewards', 'post_rewards_reward_key_fkey', {
    foreignKeys: {
      columns: 'reward_key',
      references: 'rewards(key)',
    },
  });
  pgm.addConstraint('user_unlocked_rewards', 'user_unlocked_rewards_reward_key_fkey', {
    foreignKeys: {
      columns: 'reward_key',
      references: 'rewards(key)',
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('user_unlocked_rewards', 'user_unlocked_rewards_reward_key_fkey');
  pgm.dropConstraint('post_rewards', 'post_rewards_reward_key_fkey');
  pgm.dropTable('rewards');
};
