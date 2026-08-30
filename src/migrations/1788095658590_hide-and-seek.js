/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * დამალობანა — a timed hide-and-seek game carried by a post of type 'hide-and-seek'.
 *
 * The host pins a hidden coordinate; seekers post photo "checks" that report only their
 * distance to it. A check within catch_radius_m completes the game for that seeker alone —
 * the game itself runs until ends_at or until the host stops it.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('hide_and_seek_games', {
    id: { type: 'bigserial', primaryKey: true },
    post_id: { type: 'bigint', notNull: true, unique: true, references: 'posts', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    visibility: { type: 'varchar(20)', notNull: true, default: 'public' },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    // the hidden answer — never sent to anyone but the host until the game ends
    latitude: { type: 'double precision', notNull: true },
    longitude: { type: 'double precision', notNull: true },
    catch_radius_m: { type: 'integer', notNull: true, default: 50 },
    // how many checks each seeker gets, chosen by the host (მცდელობების რაოდენობა)
    max_checks: { type: 'integer', notNull: true, default: 10 },
    // 30..360, in 30-minute steps; ends_at is derived from it at creation
    duration_minutes: { type: 'integer', notNull: true },
    ends_at: { type: 'timestamptz', notNull: true },
    ended_at: { type: 'timestamptz' },
    ended_reason: { type: 'varchar(20)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('hide_and_seek_games', 'hide_and_seek_games_visibility_check', {
    check: `visibility IN ('public', 'private')`,
  });
  pgm.addConstraint('hide_and_seek_games', 'hide_and_seek_games_status_check', {
    check: `status IN ('active', 'ended')`,
  });
  pgm.addConstraint('hide_and_seek_games', 'hide_and_seek_games_ended_reason_check', {
    check: `ended_reason IS NULL OR ended_reason IN ('expired', 'host_ended')`,
  });
  pgm.addConstraint('hide_and_seek_games', 'hide_and_seek_games_max_checks_check', {
    check: `max_checks BETWEEN 5 AND 50`,
  });
  pgm.addConstraint('hide_and_seek_games', 'hide_and_seek_games_duration_check', {
    check: `duration_minutes BETWEEN 30 AND 360 AND duration_minutes % 30 = 0`,
  });

  pgm.addIndex('hide_and_seek_games', 'user_id');
  // drives the expiry job
  pgm.addIndex('hide_and_seek_games', ['status', 'ends_at']);

  // Host and seekers share this table so that "one active game per user, either role"
  // is a single partial unique index rather than an application-level check.
  pgm.createTable('hide_and_seek_players', {
    id: { type: 'bigserial', primaryKey: true },
    game_id: { type: 'bigint', notNull: true, references: 'hide_and_seek_games', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    role: { type: 'varchar(10)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    // the seeker's root comment; every check of theirs hangs off it
    comment_id: { type: 'bigint', references: 'post_comments', onDelete: 'set null' },
    last_distance: { type: 'integer' },
    best_distance: { type: 'integer' },
    check_count: { type: 'integer', notNull: true, default: 0 },
    joined_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    found_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('hide_and_seek_players', 'hide_and_seek_players_role_check', {
    check: `role IN ('host', 'seeker')`,
  });
  pgm.addConstraint('hide_and_seek_players', 'hide_and_seek_players_status_check', {
    check: `status IN ('active', 'found', 'out_of_checks', 'ended')`,
  });

  pgm.addIndex('hide_and_seek_players', ['game_id', 'user_id'], { unique: true });
  pgm.addIndex('hide_and_seek_players', ['game_id', 'status']);
  pgm.addIndex('hide_and_seek_players', 'user_id');

  // "two games cannot be active at a time", enforced by the database.
  // The expiry job MUST move these rows off 'active' or the user is locked out for good.
  pgm.addIndex('hide_and_seek_players', 'user_id', {
    unique: true,
    where: `status = 'active'`,
    name: 'hide_and_seek_players_one_active_per_user',
  });

  pgm.createTable('hide_and_seek_checks', {
    id: { type: 'bigserial', primaryKey: true },
    game_id: { type: 'bigint', notNull: true, references: 'hide_and_seek_games', onDelete: 'cascade' },
    player_id: { type: 'bigint', notNull: true, references: 'hide_and_seek_players', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    // device position at capture time — the photo is evidence, not the source of truth
    latitude: { type: 'double precision', notNull: true },
    longitude: { type: 'double precision', notNull: true },
    distance_meters: { type: 'integer', notNull: true },
    image_url: { type: 'varchar(500)', notNull: true },
    image_variants: { type: 'jsonb' },
    comment_id: { type: 'bigint', references: 'post_comments', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addIndex('hide_and_seek_checks', 'game_id');
  pgm.addIndex('hide_and_seek_checks', ['player_id', 'created_at']);

  // private games: an invite is an access grant, nothing to accept
  pgm.createTable('hide_and_seek_invites', {
    id: { type: 'bigserial', primaryKey: true },
    game_id: { type: 'bigint', notNull: true, references: 'hide_and_seek_games', onDelete: 'cascade' },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'cascade' },
    invited_by: { type: 'bigint', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addIndex('hide_and_seek_invites', ['game_id', 'user_id'], { unique: true });
  pgm.addIndex('hide_and_seek_invites', 'user_id');

  // ცხელა / თბილა / ცივა — host-only flavour on a check, no effect on the game.
  // rewards.applies_to is a bare varchar(20)[] with no CHECK, so the new target needs no DDL.
  // Icons are seeded null and render the existing fallback until the SVGs are uploaded.
  pgm.sql(`
    insert into rewards (key, name, applies_to, unlockable, icon_url, status, sort_order) values
      ('hot',  'ცხელა', ARRAY['hide-and-seek-check']::varchar(20)[], false, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/hot.svg', 'active', 10),
      ('warm', 'თბილა', ARRAY['hide-and-seek-check']::varchar(20)[], false, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/warm.svg', 'active', 11),
      ('cold', 'ცივა',  ARRAY['hide-and-seek-check']::varchar(20)[], false, 'https://gspot-uploads.s3.eu-central-1.amazonaws.com/reactions/cold.svg', 'active', 12)
  `);

  pgm.sql(`
    INSERT INTO achievements (key, name, category, achievement_type, state, image_url)
    VALUES ('hide_and_seek_completed', 'დამალობანა', 'hide_and_seek', 'progressive', 'visible', NULL);

    INSERT INTO achievement_milestones (achievement_id, key, name, target_value, sort_order, state, image_url, rewards)
    SELECT a.id, v.key, v.name, v.target_value, v.sort_order, v.state, NULL, v.rewards
    FROM achievements a
    JOIN (
      VALUES
        ('hide_and_seek_1', 'პირველი დამალობანა', 1, 1, 'visible', '[]'::jsonb),
        ('hide_and_seek_5', '5 დამალობანა', 5, 2, 'visible', '[{"type":"reward","key":"magnifier"}]'::jsonb),
        ('hide_and_seek_10', '10 დამალობანა', 10, 3, 'visible', '[]'::jsonb),
        ('hide_and_seek_20', '20 დამალობანა', 20, 4, 'visible', '[]'::jsonb),
        ('hide_and_seek_50', '50 დამალობანა', 50, 5, 'visible', '[]'::jsonb),
        ('hide_and_seek_100', '100 დამალობანა', 100, 6, 'visible', '[]'::jsonb)
    ) AS v(key, name, target_value, sort_order, state, rewards) ON TRUE
    WHERE a.key = 'hide_and_seek_completed';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM achievement_milestones
     WHERE achievement_id IN (SELECT id FROM achievements WHERE key = 'hide_and_seek_completed');
    DELETE FROM achievements WHERE key = 'hide_and_seek_completed';
  `);
  pgm.sql(`delete from post_rewards where reward_key in ('hot', 'warm', 'cold')`);
  pgm.sql(`delete from rewards where key in ('hot', 'warm', 'cold')`);
  pgm.dropTable('hide_and_seek_invites');
  pgm.dropTable('hide_and_seek_checks');
  pgm.dropTable('hide_and_seek_players');
  pgm.dropTable('hide_and_seek_games');
};
