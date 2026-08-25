/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Redirect targets for printed QR codes / shared links.
 *
 * The sticker only ever encodes /s/<alias>, so where it lands stays editable:
 * today the home page, tomorrow the Play Store, without reprinting anything.
 * The alias is a human-readable slug ("tbilisi-cafe-1") — a uuid works too,
 * it is just text.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('share_links', {
    alias: { type: 'text', primaryKey: true },
    target_url: { type: 'text', notNull: true },
    label: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    hit_count: { type: 'bigint', notNull: true, default: 0 },
    last_hit_at: { type: 'timestamptz' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.sql(`
    CREATE UNIQUE INDEX share_links_alias_lower_idx ON share_links (LOWER(alias));
  `);

  pgm.sql(`
    INSERT INTO share_links (alias, target_url, label)
    VALUES ('qr1', '/?utm_source=qr_sticker', 'Printed QR stickers');
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('share_links');
};


//https://gspot.ge/s/qr

//UPDATE share_links SET target_url = 'https://play.google.com/store/apps/details?id=...', updated_at = NOW() WHERE alias = 'qr1';