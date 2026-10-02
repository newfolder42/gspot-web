/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Lets a probability loot entry be rarer than 1%: `probability_percent` goes from a whole
 * number to numeric(5,2), so 0.01% is the smallest chance and 100% still the largest.
 * Existing values carry over unchanged.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.dropConstraint('item_location_items', 'item_location_items_probability_check');
  pgm.alterColumn('item_location_items', 'probability_percent', { type: 'numeric(5,2)' });
  pgm.addConstraint('item_location_items', 'item_location_items_probability_check', {
    check: `(
      grant_mode = 'mandatory' AND probability_percent IS NULL
    ) OR (
      grant_mode = 'probability' AND probability_percent > 0 AND probability_percent <= 100
    )`,
  });
};

/**
 * Fractional chances are rounded up to a whole percent, so no entry drops to 0%.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('item_location_items', 'item_location_items_probability_check');
  pgm.alterColumn('item_location_items', 'probability_percent', {
    type: 'integer',
    using: 'ceil(probability_percent)::integer',
  });
  pgm.addConstraint('item_location_items', 'item_location_items_probability_check', {
    check: `(
      grant_mode = 'mandatory' AND probability_percent IS NULL
    ) OR (
      grant_mode = 'probability' AND probability_percent BETWEEN 1 AND 100
    )`,
  });
};
