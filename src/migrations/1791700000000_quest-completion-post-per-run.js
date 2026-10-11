/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * A quest completion post belongs to one run, not to the quest: every member who finishes a
 * quest, and every repeat of a daily/weekly quest, gets its own post. post_id stays the
 * primary key, so "one post per run" is still guarded by createQuestCompletionPost; the
 * unique index on quest_id only made the second completer / second run fail on insert.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Tolerant of the index having been dropped by hand ahead of the deploy (hotfix).
  pgm.dropIndex('post_quest_completions', 'quest_id', { unique: true, ifExists: true });
  pgm.addIndex('post_quest_completions', 'quest_id', { ifNotExists: true });
};

/**
 * Restoring the unique index needs one post per quest, so every completion post but the
 * newest is deleted (its link row cascades with it).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM posts
    WHERE id IN (
      SELECT pqc.post_id
      FROM post_quest_completions pqc
      WHERE EXISTS (
        SELECT 1 FROM post_quest_completions newer
        WHERE newer.quest_id = pqc.quest_id AND newer.post_id > pqc.post_id
      )
    );
  `);

  pgm.dropIndex('post_quest_completions', 'quest_id');
  pgm.addIndex('post_quest_completions', 'quest_id', { unique: true });
};
