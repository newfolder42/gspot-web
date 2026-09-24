INSERT INTO item_locations (name, shape_type, polygon) VALUES
  ('რუსთაველის გამზირი', 'polygon', '[[44.8008746,41.692754],[44.8021694,41.6927625],[44.8024253,41.6939405],[44.8019441,41.6941087],[44.8013215,41.6941401],[44.8005002,41.695569],[44.7981703,41.6991169],[44.7931781,41.7030837],[44.7936632,41.7034544],[44.7918871,41.7047177],[44.790218,41.7036426],[44.7916618,41.7028299],[44.792949,41.7025191],[44.7976471,41.698786],[44.8007677,41.6938606],[44.8008746,41.692754]]'::jsonb);

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
