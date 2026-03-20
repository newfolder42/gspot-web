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
  pgm.createTable('achievements', {
    id: { type: 'bigserial', primaryKey: true },
    key: { type: 'varchar(100)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    category: { type: 'varchar(50)', notNull: true },
    achievement_type: { type: 'varchar(20)', notNull: true, default: 'progressive' },
    state: { type: 'varchar(20)', notNull: true, default: 'visible' },
    image_url: { type: 'varchar(1024)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('achievements', 'achievements_state_check', {
    check: `state IN ('visible', 'hidden')`,
  });
  pgm.addConstraint('achievements', 'achievements_type_check', {
    check: `achievement_type IN ('one_time', 'progressive')`,
  });

  pgm.addIndex('achievements', 'key', { unique: true });
  pgm.addIndex('achievements', 'category');

  pgm.createTable('achievement_milestones', {
    id: { type: 'bigserial', primaryKey: true },
    achievement_id: { type: 'bigint', notNull: true, references: 'achievements', onDelete: 'cascade' },
    key: { type: 'varchar(120)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    target_value: { type: 'integer', notNull: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    state: { type: 'varchar(20)', notNull: true, default: 'visible' },
    image_url: { type: 'varchar(1024)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('achievement_milestones', 'achievement_milestones_state_check', {
    check: `state IN ('visible', 'hidden')`,
  });

  pgm.addIndex('achievement_milestones', 'achievement_id');
  pgm.addIndex('achievement_milestones', 'key', { unique: true });
  pgm.addIndex('achievement_milestones', ['achievement_id', 'target_value'], { unique: true });

  pgm.sql(`
    INSERT INTO achievements (key, name, category, achievement_type, state, image_url)
    VALUES
      ('base_profile_photo', 'პროფილის ფოტოს დაყენება', 'base', 'one_time', 'visible', NULL),
      ('base_first_follower', 'პირველი გამომწერი', 'base', 'one_time', 'visible', NULL),
      ('base_first_following', 'პირველად გამოწერა', 'base', 'one_time', 'visible', NULL),
      ('posts_total', 'პოსტები', 'posts', 'progressive', 'visible', NULL),
      ('guesses_total', 'გამოცნობები', 'guesses', 'progressive', 'visible', NULL),
      ('perfect_guesses_total', 'ზუსტი გამოცნობები', 'guesses', 'progressive', 'visible', NULL),
      ('streak_days', 'უწყვეტობა', 'streaks', 'progressive', 'visible', NULL),
      ('level_reached', 'დონეები', 'level', 'progressive', 'visible', NULL);
  `);

  pgm.sql(`
    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('posts_1', 'პირველი პოსტი', 1, 1, 'visible'),
        ('posts_10', '10 პოსტი', 10, 2, 'visible'),
        ('posts_50', '50 პოსტი', 50, 3, 'visible'),
        ('posts_100', '100 პოსტი', 100, 4, 'visible'),
        ('posts_200', '200 პოსტი', 200, 5, 'visible'),
        ('posts_365', '365 პოსტი', 365, 6, 'visible'),
        ('posts_500', '500 პოსტი', 500, 7, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'posts_total';

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('guesses_1', 'პირველი გამოცნობა', 1, 1, 'visible'),
        ('guesses_10', '10 გამოცნობა', 10, 2, 'visible'),
        ('guesses_50', '50 გამოცნობა', 50, 3, 'visible'),
        ('guesses_100', '100 გამოცნობა', 100, 4, 'visible'),
        ('guesses_200', '200 გამოცნობა', 200, 5, 'visible'),
        ('guesses_500', '500 გამოცნობა', 500, 6, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'guesses_total';

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('perfect_guesses_1', 'პირველი ზუსტი გამოცნობა', 1, 1, 'visible'),
        ('perfect_guesses_10', '10 ზუსტი გამოცნობა', 10, 2, 'visible'),
        ('perfect_guesses_50', '50 ზუსტი გამოცნობა', 50, 3, 'visible'),
        ('perfect_guesses_100', '100 ზუსტი გამოცნობა', 100, 4, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'perfect_guesses_total';

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('streaks_3', '3 დღიანი უწყვეტობა', 3, 1, 'visible'),
        ('streaks_7', '7 დღიანი უწყვეტობა', 7, 2, 'visible'),
        ('streaks_14', '14 დღიანი უწყვეტობა', 14, 3, 'visible'),
        ('streaks_30', '30 დღიანი უწყვეტობა', 30, 4, 'visible'),
        ('streaks_100', '100 დღიანი უწყვეტობა', 100, 5, 'visible')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'streak_days';

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL
    FROM achievements a
    JOIN (
      VALUES
        ('level_2', 'მე-2 დონე', 2, 1, 'visible'),
        ('level_5', 'მე-5 დონე', 5, 2, 'visible'),
        ('level_10', 'მე-10 დონე', 10, 3, 'visible'),
        ('level_15', 'მე-15 დონე', 15, 4, 'visible'),
        ('level_20', 'მე-20 დონე', 20, 5, 'visible'),
        ('level_25', 'მე-25 დონე', 25, 6, 'visible'),
        ('level_30', 'მე-30 დონე', 30, 7, 'visible'),
        ('level_35', 'მე-35 დონე', 35, 8, 'visible'),
        ('level_40', 'მე-40 დონე', 40, 9, 'visible'),
        ('level_42', 'მე-42 დონე', 42, 10, 'hidden')
    ) AS v(key, name, target_value, sort_order, state) ON TRUE
    WHERE a.key = 'level_reached';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('achievement_milestones');
  pgm.dropTable('achievements');
};
