-- ინვენტარი — worked examples for every case the schema supports.
--
-- Everything here is curated by hand: there is no admin UI, by design. Run the pieces
-- you need, they are independent. See src/data/INVENTORY.md for how to draw a polygon
-- and how the loot table resolves.
--
-- Tables: item_categories · item_types · items · user_items
--         item_locations · item_location_items · item_location_item_periods

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The catalog: items
-- ─────────────────────────────────────────────────────────────────────────────
-- alias        stable key, referenced by loot tables and reward specs. Never reused.
-- quality      common | uncommon | rare | epic | legendary — drives the slot border colour.
-- type_id      the item's type, and through it its category. Nullable — an item works
--              before it is filed. Set it by joining item_types on its alias, never by id.
-- icon_url     SVG or PNG in the uploads bucket. NULL falls back to the backpack glyph.
-- description  the flavour line under the stats, shown in amber like a wowhead tooltip.
-- stackable    false → the user holds it once; further grants do nothing and the slot
--              shows no number. true → further grants raise user_items.count and the slot
--              renders that count, WoW-style. One-of-a-kind relics stay false; ordinary
--              things you could plausibly pick up twice are the ones to make true.

-- Filed under a type (θαვსაბურავი → სამოსი). The join keeps the alias visible in the
-- script instead of a bare id.
INSERT INTO items (alias, name, description, icon_url, quality, type_id, stackable, status, sort_order)
SELECT v.alias, v.name, v.description, v.icon_url, v.quality, t.id, v.stackable, 'active', v.sort_order
FROM (VALUES
  ('kolkhuri-cxeni', 'კოლხური ცხენი',
   'ბრინჯაოს ფიგურა კოლხეთის სამეფოდან, ძვ. წ. VII საუკუნე.',
   'https://gspot-uploads.s3.eu-central-1.amazonaws.com/items/kolkhuri-cxeni.svg',
   'epic', false, 10),

  ('tamaris-tavsaburavi', 'სამეფო თავსაბურავი',
   'ერთადერთი, და აშკარად შენს ზომაზე არაა.',
   'https://gspot-uploads.s3.eu-central-1.amazonaws.com/items/tavsaburavi.svg',
   -- one of a kind: never stacks
   'legendary', false, 20),

  ('mtis-kudi', 'მთის ქუდი',
   'თბილია, და ოდნავ სველი.',
   'https://gspot-uploads.s3.eu-central-1.amazonaws.com/items/kudi.svg',
   -- stackable: you could plausibly pick up another one
   'common', true, 30)
) AS v(alias, name, description, icon_url, quality, stackable, sort_order)
JOIN item_types t ON t.alias = 'tavsaburavi';

-- Unfiled items are fine — type_id stays NULL until you have a type for them.
INSERT INTO items (alias, name, description, icon_url, quality, stackable, status, sort_order) VALUES
  ('marshutkis-jeton', 'მარშუტკის ჟეტონი',
   'ჯიბეში იპოვე, ჯიბეშივე დაგრჩება.',
   'https://gspot-uploads.s3.eu-central-1.amazonaws.com/items/jetoni.svg',
   'common', true, 'active', 40),

  -- No icon yet either — renders the backpack fallback, still fully usable
  ('gazapxulis-kvavili', 'გაზაფხულის ყვავილი', NULL, NULL, 'uncommon', true, 'active', 50),
  ('tovlis-katsi', 'თოვლის კაცი', NULL, NULL, 'rare', false, 'active', 60);

-- Filing an item later:
-- UPDATE items i SET type_id = t.id FROM item_types t
--  WHERE t.alias = 'tavsaburavi' AND i.alias = 'marshutkis-jeton';

-- Retiring an item: it stops being granted anywhere, but stays in every bag that has it.
-- UPDATE items SET status = 'disabled' WHERE alias = 'marshutkis-jeton';

-- Making an existing item stack from now on. Counts already held stay as they are (1),
-- and start rising on the next grant.
-- UPDATE items SET stackable = true WHERE alias = 'kolkhuri-cxeni';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Spawn points: item_locations
-- ─────────────────────────────────────────────────────────────────────────────
-- Never write min_lat/max_lat/min_lng/max_lng — the item_locations_bbox trigger fills
-- them from the shape. Supplying them by hand is how a location silently stops matching.

-- 2a. Circle: a centre and a radius in metres. The simplest shape, and the right one for
--     a single monument, a square, a viewpoint.
INSERT INTO item_locations (name, shape_type, latitude, longitude, radius_m) VALUES
  ('ნარიყალა', 'circle', 41.68830, 44.80900, 120);

-- 2b. Polygon: one closed outer ring as [[lng, lat], …] — GeoJSON order, longitude first.
--     Copy it straight out of geojson.io (see INVENTORY.md). Holes are not supported.
INSERT INTO item_locations (name, shape_type, polygon) VALUES
  ('ვაკის პარკი', 'polygon', '[
     [44.72640, 41.71120],
     [44.73410, 41.71180],
     [44.73520, 41.70640],
     [44.72890, 41.70410],
     [44.72520, 41.70780],
     [44.72640, 41.71120]
   ]'::jsonb);

-- 2c. A wider polygon, e.g. a whole district — same shape, bigger ring.
INSERT INTO item_locations (name, shape_type, polygon) VALUES
  ('ძველი თბილისი', 'polygon', '[
     [44.79860, 41.69640],
     [44.81400, 41.69880],
     [44.81720, 41.69140],
     [44.80480, 41.68580],
     [44.79600, 41.69080],
     [44.79860, 41.69640]
   ]'::jsonb);

-- Turning a location off without deleting its history:
-- UPDATE item_locations SET status = 'disabled' WHERE name = 'ნარიყალა';

-- max_finds is reserved and NOT enforced yet — a location keeps giving to new finders
-- forever. found_count is maintained by the app for your own reporting.


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Loot tables: item_location_items
-- ─────────────────────────────────────────────────────────────────────────────
-- grant_mode = 'mandatory'    → always granted; a location may have several.
-- grant_mode = 'probability'  → rolled in sort_order; the FIRST hit wins and the rest are
--                               skipped, so at most one probability item per find.
-- probability_percent is 1..100, and only allowed on probability rows.
--
-- A user who already holds a NON-stackable item gets nothing more from it — the location
-- still gives them anything else they are missing. A stackable item is granted every time
-- and raises their count, so a location with a stackable item is worth revisiting.

-- 3a. One guaranteed item.
INSERT INTO item_location_items (location_id, item_id, grant_mode, sort_order)
SELECT l.id, i.id, 'mandatory', 1
FROM item_locations l, items i
WHERE l.name = 'ნარიყალა' AND i.alias = 'mtis-kudi';

-- 3b. Several guaranteed items — all of them are granted on the same find.
INSERT INTO item_location_items (location_id, item_id, grant_mode, sort_order)
SELECT l.id, i.id, 'mandatory', v.sort_order
FROM item_locations l
JOIN (VALUES ('marshutkis-jeton', 1), ('mtis-kudi', 2)) AS v(alias, sort_order) ON TRUE
JOIN items i ON i.alias = v.alias
WHERE l.name = 'ძველი თბილისი';

-- 3c. A pure probability table — rarest first, so the rare roll is not shadowed by the
--     common one. Rolled top to bottom; here ~5% get the legendary, of the rest ~20% get
--     the epic, and 40% of what is left get the rare. Roughly half of finds give nothing.
INSERT INTO item_location_items (location_id, item_id, grant_mode, probability_percent, sort_order)
SELECT l.id, i.id, 'probability', v.pct, v.sort_order
FROM item_locations l
JOIN (VALUES
        ('tamaris-tavsaburavi', 5, 1),
        ('kolkhuri-cxeni', 20, 2),
        ('tovlis-katsi', 40, 3)
     ) AS v(alias, pct, sort_order) ON TRUE
JOIN items i ON i.alias = v.alias
WHERE l.name = 'ვაკის პარკი';

-- 3d. Mixed: one guaranteed item plus one rare chance on top.
INSERT INTO item_location_items (location_id, item_id, grant_mode, probability_percent, sort_order)
SELECT l.id, i.id, 'mandatory', NULL, 2
FROM item_locations l, items i
WHERE l.name = 'ნარიყალა' AND i.alias = 'marshutkis-jeton';

INSERT INTO item_location_items (location_id, item_id, grant_mode, probability_percent, sort_order)
SELECT l.id, i.id, 'probability', 10, 3
FROM item_locations l, items i
WHERE l.name = 'ნარიყალა' AND i.alias = 'kolkhuri-cxeni';

-- 3e. A guaranteed drop expressed as a probability row placed last — acts as a floor, so
--     nobody walks away empty-handed from this location.
-- INSERT INTO item_location_items (location_id, item_id, grant_mode, probability_percent, sort_order)
-- SELECT l.id, i.id, 'probability', 100, 99
-- FROM item_locations l, items i
-- WHERE l.name = 'ვაკის პარკი' AND i.alias = 'marshutkis-jeton';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3f. Seasons: item_location_item_periods
-- ─────────────────────────────────────────────────────────────────────────────
-- Seasonality hangs off the loot ENTRY, not the location: one spot can hand out a flower
-- in spring and a snowman in winter. To take a whole location out of service instead, use
-- item_locations.status = 'disabled'.
--
-- An entry with NO period rows is always available. With them, it is available when ANY
-- of them matches today — so several rows per entry give you several windows.
--
-- kind = 'annual' repeats every year: start_month/start_day → end_month/end_day, both
--                 inclusive. It may wrap the year end (12-01 → 02-28).
-- kind = 'range'  is a one-off window between starts_on and ends_on, both inclusive.
--
-- "Today" is the Tbilisi date, not the server's.

-- The flower only grows in ვაკის პარკი from April to June.
INSERT INTO item_location_item_periods (location_item_id, kind, start_month, start_day, end_month, end_day, label)
SELECT li.id, 'annual', 4, 1, 6, 30, 'გაზაფხული'
FROM item_location_items li
JOIN item_locations l ON l.id = li.location_id
JOIN items i ON i.id = li.item_id
WHERE l.name = 'ვაკის პარკი' AND i.alias = 'gazapxulis-kvavili';

-- The snowman is a winter-only chance, and the window wraps the year end.
INSERT INTO item_location_item_periods (location_item_id, kind, start_month, start_day, end_month, end_day, label)
SELECT li.id, 'annual', 12, 1, 2, 28, 'ზამთარი'
FROM item_location_items li
JOIN item_locations l ON l.id = li.location_id
JOIN items i ON i.id = li.item_id
WHERE l.name = 'ვაკის პარკი' AND i.alias = 'tovlis-katsi';

-- Two windows on one entry: available in spring, gone for the summer, back in autumn.
INSERT INTO item_location_item_periods (location_item_id, kind, start_month, start_day, end_month, end_day, label)
SELECT li.id, 'annual', v.sm, v.sd, v.em, v.ed, v.label
FROM item_location_items li
JOIN item_locations l ON l.id = li.location_id
JOIN items i ON i.id = li.item_id
JOIN (VALUES (4, 1, 5, 31, 'გაზაფხული'), (9, 15, 10, 31, 'შემოდგომა')) AS v(sm, sd, em, ed, label) ON TRUE
WHERE l.name = 'ძველი თბილისი' AND i.alias = 'mtis-kudi';

-- A one-off window, e.g. a festival weekend.
INSERT INTO item_location_item_periods (location_item_id, kind, starts_on, ends_on, label)
SELECT li.id, 'range', DATE '2026-10-03', DATE '2026-10-05', 'თბილისობა 2026'
FROM item_location_items li
JOIN item_locations l ON l.id = li.location_id
JOIN items i ON i.id = li.item_id
WHERE l.name = 'ძველი თბილისი' AND i.alias = 'marshutkis-jeton';

-- Making an entry available all year again: delete its periods.
-- DELETE FROM item_location_item_periods p
--  USING item_location_items li, item_locations l, items i
--  WHERE p.location_item_id = li.id AND li.location_id = l.id AND li.item_id = i.id
--    AND l.name = 'ვაკის პარკი' AND i.alias = 'gazapxulis-kvavili';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Items as quest / achievement rewards
-- ─────────────────────────────────────────────────────────────────────────────
-- `rewards` is the same jsonb list that already carries user-xp, reward and reward-limit.
-- The new entry is {"type":"item","alias":"…"}. Granting happens in gspot-services when
-- the quest/achievement fires; it sends no separate item notification, because the quest
-- or achievement notification already went out.

-- 4a. A quest that hands out xp and an item.
UPDATE zone_quests
SET rewards = '[{"type":"user-xp","value":300},{"type":"item","alias":"kolkhuri-cxeni"}]'::jsonb
WHERE id = 1;

-- 4b. An achievement milestone that hands out an item.
UPDATE achievement_milestones
SET rewards = '[{"type":"item","alias":"tamaris-tavsaburavi"}]'::jsonb
WHERE key = 'posts_100';

-- 4c. A one-time achievement that hands out an item alongside a catalog reward unlock.
UPDATE achievements
SET rewards = '[{"type":"reward","key":"sherlock"},{"type":"item","alias":"kolkhuri-cxeni"}]'::jsonb
WHERE key = 'profile_photo';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Putting an item in someone's bag by hand
-- ─────────────────────────────────────────────────────────────────────────────
-- source = 'manual' so it is distinguishable from a find in the detail card.
-- The unique (user_id, item_id) makes this safe to re-run.
INSERT INTO user_items (user_id, item_id, count, source, source_details)
SELECT u.id, i.id, 1, 'manual', '{"reason":"beta tester"}'::jsonb
FROM users u, items i
WHERE u.alias = 'komar' AND i.alias = 'tamaris-tavsaburavi'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Setting a stack count by hand (only meaningful for a stackable item).
-- UPDATE user_items ui SET count = 7
--   FROM users u, items i
--  WHERE ui.user_id = u.id AND ui.item_id = i.id
--    AND u.alias = 'komar' AND i.alias = 'marshutkis-jeton';

-- A hand-inserted row does NOT move the items_collected achievement — that is only synced
-- when the app grants an item. To resync one user afterwards, bump anything of theirs that
-- fires an item grant, or update the achievement row directly.


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Checking your work
-- ─────────────────────────────────────────────────────────────────────────────

-- Would a post at these coordinates hit any location? (bbox stage only — the exact
-- circle/polygon test happens in the app, so this can over-report slightly.)
SELECT id, name, shape_type
FROM item_locations
WHERE status = 'active'
  AND 41.68830 BETWEEN min_lat AND max_lat
  AND 44.80900 BETWEEN min_lng AND max_lng;

-- What does each location hand out, and when?
SELECT l.name AS location, i.alias, i.name AS item, i.quality,
       li.grant_mode, li.probability_percent, li.sort_order,
       COALESCE(string_agg(
         CASE p.kind
           WHEN 'annual' THEN format('%s-%s → %s-%s', p.start_month, p.start_day, p.end_month, p.end_day)
           ELSE format('%s → %s', p.starts_on, p.ends_on)
         END, ', ' ORDER BY p.id
       ), 'ყოველთვის') AS periods
FROM item_location_items li
JOIN item_locations l ON l.id = li.location_id
JOIN items i ON i.id = li.item_id
LEFT JOIN item_location_item_periods p ON p.location_item_id = li.id
GROUP BY l.name, i.alias, i.name, i.quality, li.grant_mode, li.probability_percent, li.sort_order, li.id
ORDER BY l.name, li.sort_order, li.id;

-- Who holds what. `count` is only ever above 1 for a stackable item.
SELECT u.alias, i.name, c.name AS category, t.name AS type,
       i.quality, i.stackable, ui.count, ui.source, ui.created_at
FROM user_items ui
JOIN users u ON u.id = ui.user_id
JOIN items i ON i.id = ui.item_id
LEFT JOIN item_types t ON t.id = i.type_id
LEFT JOIN item_categories c ON c.id = t.category_id
ORDER BY ui.created_at DESC
LIMIT 50;

-- What is in season right now, per location. Mirrors the check the app runs.
SELECT l.name AS location, i.alias, li.grant_mode, li.probability_percent,
       COALESCE(string_agg(p.label, ', ' ORDER BY p.id), 'ყოველთვის') AS periods
FROM item_location_items li
JOIN item_locations l ON l.id = li.location_id
JOIN items i ON i.id = li.item_id
LEFT JOIN item_location_item_periods p ON p.location_item_id = li.id
WHERE NOT EXISTS (SELECT 1 FROM item_location_item_periods x WHERE x.location_item_id = li.id)
   OR EXISTS (
     SELECT 1
     FROM item_location_item_periods x,
          LATERAL (SELECT (now() AT TIME ZONE 'Asia/Tbilisi')::date AS today) d,
          LATERAL (SELECT (EXTRACT(month FROM d.today)::int * 100
                         + EXTRACT(day FROM d.today)::int) AS md) m
     WHERE x.location_item_id = li.id
       AND (
         (x.kind = 'range' AND d.today BETWEEN x.starts_on AND x.ends_on)
         OR (x.kind = 'annual' AND CASE
               WHEN (x.start_month * 100 + x.start_day) <= (x.end_month * 100 + x.end_day)
                 THEN m.md BETWEEN (x.start_month * 100 + x.start_day)
                                AND (x.end_month * 100 + x.end_day)
               ELSE m.md >= (x.start_month * 100 + x.start_day)
                 OR m.md <= (x.end_month * 100 + x.end_day)
             END)
       )
   )
GROUP BY l.name, i.alias, li.grant_mode, li.probability_percent, li.sort_order, li.id
ORDER BY l.name, li.sort_order, li.id;
