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
  pgm.createTable('zone_quest_characters', {
    id: { type: 'bigserial', primaryKey: true },
    zone_id: { type: 'bigint', notNull: true, references: 'zones', onDelete: 'cascade' },
    name: { type: 'varchar(100)', notNull: true },
    avatar_url: { type: 'varchar(500)' },
    description: { type: 'text' },
    created_by: { type: 'bigint', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addIndex('zone_quest_characters', 'zone_id');

  pgm.createTable('zone_quests', {
    id: { type: 'bigserial', primaryKey: true },
    zone_id: { type: 'bigint', notNull: true, references: 'zones', onDelete: 'cascade' },
    title: { type: 'varchar(150)', notNull: true },
    description: { type: 'text' },
    objective_order: { type: 'varchar(20)', notNull: true, default: 'ordered' },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    character_id: { type: 'bigint', references: 'zone_quest_characters', onDelete: 'set null' },
    required_level: { type: 'integer' },
    start_date: { type: 'timestamptz' },
    end_date: { type: 'timestamptz' },
    created_by: { type: 'bigint', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('zone_quests', 'zone_quests_objective_order_check', {
    check: `objective_order IN ('ordered', 'unordered')`,
  });
  pgm.addConstraint('zone_quests', 'zone_quests_status_check', {
    check: `status IN ('active', 'archived')`,
  });

  pgm.addIndex('zone_quests', 'zone_id');
  pgm.addIndex('zone_quests', ['zone_id', 'status']);
  pgm.addIndex('zone_quests', 'character_id');

  pgm.createTable('zone_quest_objectives', {
    id: { type: 'bigserial', primaryKey: true },
    quest_id: { type: 'bigint', notNull: true, references: 'zone_quests', onDelete: 'cascade' },
    title: { type: 'varchar(150)' },
    display_text: { type: 'text', notNull: true },
    type: { type: 'varchar(30)', notNull: true, default: 'in_range_location' },
    config: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('zone_quest_objectives', 'zone_quest_objectives_type_check', {
    check: `type IN ('in_range_location', 'capture_photo')`,
  });

  pgm.addIndex('zone_quest_objectives', 'quest_id');
  pgm.addIndex('zone_quest_objectives', ['quest_id', 'sort_order']);

  pgm.createTable('user_quests', {
    id: { type: 'bigserial', primaryKey: true },
    quest_id: { type: 'bigint', notNull: true, references: 'zone_quests', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    accepted_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    completed_at: { type: 'timestamptz' },
    reviewed_by: { type: 'bigint', references: 'users', onDelete: 'set null' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('user_quests', 'user_quests_status_check', {
    check: `status IN ('active', 'completed')`,
  });

  pgm.addIndex('user_quests', ['quest_id', 'user_id'], { unique: true });
  pgm.addIndex('user_quests', 'user_id');
  pgm.addIndex('user_quests', 'status');

  pgm.createTable('user_quest_objectives', {
    id: { type: 'bigserial', primaryKey: true },
    user_quest_id: { type: 'bigint', notNull: true, references: 'user_quests', onDelete: 'cascade' },
    objective_id: { type: 'bigint', notNull: true, references: 'zone_quest_objectives', onDelete: 'cascade' },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    photo_url: { type: 'varchar(500)' },
    capture_data: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    submitted_at: { type: 'timestamptz' },
    reviewed_by: { type: 'bigint', references: 'users', onDelete: 'set null' },
    reviewed_at: { type: 'timestamptz' },
    rejection_reason: { type: 'varchar(500)' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('user_quest_objectives', 'user_quest_objectives_status_check', {
    check: `status IN ('pending', 'pending_review', 'rejected', 'completed')`,
  });

  pgm.addIndex('user_quest_objectives', 'user_quest_id');
  pgm.addIndex('user_quest_objectives', ['user_quest_id', 'objective_id'], { unique: true });
  pgm.addIndex('user_quest_objectives', 'status');
  
  pgm.createTable('post_quest_completions', {
    post_id: { type: 'bigint', primaryKey: true, references: 'posts', onDelete: 'cascade' },
    quest_id: { type: 'bigint', notNull: true, references: 'zone_quests', onDelete: 'cascade' },
  });

  pgm.addIndex('post_quest_completions', 'quest_id', { unique: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('user_quest_objectives');
  pgm.dropTable('user_quests');
  pgm.dropTable('zone_quest_objectives');
  pgm.dropTable('zone_quests');
  pgm.dropTable('zone_quest_characters');
  pgm.dropTable('post_quest_completions');
};
