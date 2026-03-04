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
  pgm.createTable('xp_levels', {
    level: { type: 'integer', primaryKey: true },
    xp: { type: 'integer', notNull: true },
  });

  pgm.sql(`
    INSERT INTO xp_levels (level, xp) VALUES
    (1, 0),
    (2, 200),
    (3, 450),
    (4, 750),
    (5, 1100),
    (6, 1500),
    (7, 1950),
    (8, 2450),
    (9, 3000),
    (10, 3600),
    (11, 4250),
    (12, 4950),
    (13, 5700),
    (14, 6500),
    (15, 7350),
    (16, 8250),
    (17, 9200),
    (18, 10200),
    (19, 11250),
    (20, 12350),
    (21, 13500),
    (22, 14700),
    (23, 16000),
    (24, 17350),
    (25, 18750),
    (26, 20200),
    (27, 21700),
    (28, 23250),
    (29, 24850),
    (30, 26500),
    (31, 28200),
    (32, 29950),
    (33, 31750),
    (34, 33600),
    (35, 35500),
    (36, 37450),
    (37, 39450),
    (38, 41550),
    (39, 43750),
    (40, 46050),
    (41, 48450),
    (42, 51050);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('xp_levels');
};
