/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Lets a zone quest be taken again: 'onetime' (the old behaviour), 'daily' (once per
 * Tbilisi calendar day) or 'weekly' (once per Tbilisi calendar week, Monday to Sunday).
 *
 * A repeat is a new user_quests row, so the (quest_id, user_id) unique index becomes a
 * plain one. "At most one active run per user" is enforced by acceptQuest instead.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumn('zone_quests', {
    repeatability: { type: 'varchar(20)', notNull: true, default: 'onetime' },
  });
  pgm.addConstraint('zone_quests', 'zone_quests_repeatability_check', {
    check: `repeatability IN ('onetime', 'daily', 'weekly')`,
  });

  pgm.dropIndex('user_quests', ['quest_id', 'user_id'], { unique: true });
  pgm.addIndex('user_quests', ['quest_id', 'user_id']);
};

/**
 * Restoring the unique index needs one row per (quest, user), so every run but the
 * latest is deleted (its objectives cascade with it).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM user_quests uq
    USING user_quests newer
    WHERE newer.quest_id = uq.quest_id
      AND newer.user_id = uq.user_id
      AND (newer.accepted_at, newer.id) > (uq.accepted_at, uq.id);
  `);

  pgm.dropIndex('user_quests', ['quest_id', 'user_id']);
  pgm.addIndex('user_quests', ['quest_id', 'user_id'], { unique: true });

  pgm.dropConstraint('zone_quests', 'zone_quests_repeatability_check');
  pgm.dropColumn('zone_quests', 'repeatability');
};
