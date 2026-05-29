/**
 * Stores opaque refresh tokens for mobile clients.
 * Tokens are rotated on each use and expire after 30 days.
 */
exports.up = (pgm) => {
  pgm.createTable('refresh_tokens', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    token: { type: 'text', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addIndex('refresh_tokens', 'token');
  pgm.addIndex('refresh_tokens', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('refresh_tokens');
};
