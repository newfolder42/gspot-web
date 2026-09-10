# ინვენტარი — curating items and item locations

Everything in this feature is hand-curated in SQL. There is no admin UI, deliberately.
Worked INSERTs for every case live in [`inventory-examples.sql`](./inventory-examples.sql).

## Drawing a polygon

There is no PostGIS in this database, so a polygon is stored as plain jsonb: **one closed
outer ring, `[[lng, lat], …]`**, longitude first (GeoJSON order). Holes and multi-part
polygons are not supported — use two locations instead.

### geojson.io — the one to use

<https://geojson.io> — free, no account, works in the browser.

1. Open it and pan/zoom to the place.
2. Pick the **polygon** tool from the toolbar on the right and click each corner; click the
   first point again to close the shape.
3. The **JSON** panel on the right now shows a `FeatureCollection`. The part you need is
   `features[0].geometry.coordinates[0]` — the inner array of `[lng, lat]` pairs.
4. Paste that array straight into the `polygon` column:

   ```sql
   INSERT INTO item_locations (name, shape_type, polygon)
   VALUES ('ვაკის პარკი', 'polygon', '[[44.7264,41.7112], …]'::jsonb);
   ```

Do **not** paste the whole `FeatureCollection`, and do not include the extra `[ ]` wrapper
around the ring — the column holds the ring itself.

geojson.io also accepts a pasted GeoJSON on the right-hand side, so an existing shape can
be loaded back in to check or edit it.

### Other free options

| Tool | Good for | Catch |
| --- | --- | --- |
| [bboxfinder.com](http://bboxfinder.com) | quick rectangles | gives a bbox string, reorder to `[lng,lat]` pairs yourself |
| [Google My Maps](https://mymaps.google.com) | drawing with satellite imagery, saving drafts | exports KML/KMZ, needs converting to GeoJSON |
| [QGIS](https://qgis.org) | large or precise shapes, tracing OSM data | desktop install |
| [Overpass turbo](https://overpass-turbo.eu) | pulling an existing park/building outline out of OpenStreetMap | output needs simplifying; mind the ODbL attribution |

Keep rings modest — 5 to 30 points is plenty. Every point is tested in JS on the post
path, and a 500-point ring traced off OSM buys no accuracy the GPS can use.

### Circles are usually enough

For a monument, a square, a viewpoint, a circle is simpler and reads better:

```sql
INSERT INTO item_locations (name, shape_type, latitude, longitude, radius_m)
VALUES ('ნარიყალა', 'circle', 41.68830, 44.80900, 120);
```

Phone GPS is good to roughly 5–20 m in the open and much worse between buildings, so a
radius under ~50 m will feel broken to users standing in the right place.

## The bounding box is not yours to write

`min_lat` / `max_lat` / `min_lng` / `max_lng` are filled by the `item_locations_bbox`
trigger from whatever shape you supply, on every INSERT and on any UPDATE that touches the
shape. Writing them by hand is the one mistake that fails silently — the location just
never matches a post.

SQL filters on that indexed bbox; the app then re-tests the hit exactly (haversine for a
circle, ray-casting for a polygon) in `src/lib/itemLocations.ts`.

## Categories and types

`item_categories` → `item_types` → `items.type_id`. A type belongs to exactly one category
and an item points at a type, so **an item's category is reached through its type** and is
never set on the item itself. `type_id` is nullable — an item works before it is filed.

Both tables carry an `alias` (latin, permanent, the stable key) and a `name` (Georgian,
display only, safe to change). Only the category has `sort_order`, which will fix the order
of the planned inventory tabs; leave gaps (10, 20, 30) so a new category can be slotted in
without renumbering. Types are ordered by name where they need ordering.

The first rows are seeded by the migration: category `samosi` / სამოსი, type
`tavsaburavi` / თავსაბურავი. Everything after that goes in by hand.

Deleting a category that still has types is blocked (`ON DELETE RESTRICT`) — move the types
first. Deleting a type leaves its items unfiled rather than deleting them
(`ON DELETE SET NULL`).

## How a find resolves

When a post is published, `grantItemsForPost` runs inline — before the response goes back,
so the poster sees the find immediately. For every location containing the photo's
coordinates:

- **every** `mandatory` row is granted;
- `probability` rows are rolled in `sort_order`, and the **first** hit wins — so at most
  one probability item per find. Put the rarest first.

Whether a repeat find gives anything is the **item's** property, not the location's — see
*Unique vs stackable* below. A location keeps giving to new finders forever (`max_finds`
exists but is not enforced).

Out-of-season entries are filtered out before any of that — see *Seasons* below.

Each newly granted item then publishes `gspot:item:found`, which gspot-services turns into
the "შენს ინვენტარში მატებაა — …" notification and a resync of the `items_collected`
achievement (3 / 10 / 20 / 50 / 100 ნივთი).

## Seasons

A loot entry can be limited to one or more windows, in `item_location_item_periods`.

The period hangs off the **loot entry**, not the location: one spot hands out a flower in
spring and a snowman in winter, and those are two entries with two different seasons. To
take a whole location out of service instead, set `item_locations.status = 'disabled'` —
that is what it is for.

An entry with no period rows is available always. With them, it is available when **any**
of them covers today, so several rows give you several windows (spring *and* autumn).

| `kind` | columns | meaning |
| --- | --- | --- |
| `annual` | `start_month`/`start_day` → `end_month`/`end_day` | repeats every year, both ends inclusive; may wrap the year end (12-01 → 02-28 is December through February) |
| `range` | `starts_on` → `ends_on` | a one-off window between two dates, both inclusive |

`label` is a note for you (`'ზამთარი'`), never shown to users.

"Today" is the **Tbilisi** date, not the server's — a flowering season should follow the
local calendar wherever the app happens to run. A check constraint rejects a period that
mixes the two kinds' columns or leaves one half-filled.

## Unique vs stackable

`items.stackable` decides what a second grant of the same item does to the same user:

| `stackable` | second grant | slot |
| --- | --- | --- |
| `false` (default) | no-op — nothing granted, no notification | no number |
| `true` | `user_items.count` goes up by one | count printed bottom-right, WoW-style |

Either way there is only ever **one row per user+item**: a stack raises `count` rather than
adding a second slot, so the bag never shows the same item twice.

Use `false` for one-of-a-kind relics — a royal charter, a named artefact. Use `true` for
things it makes sense to accumulate: tokens, fragments, tickets, souvenirs. The count is
shown whenever the item is stackable, so a stackable item sitting at 1 still reads as
"this one stacks".

Flipping an existing item to `stackable = true` is safe: counts already held stay at 1 and
start rising on the next grant.

Note that the bag counter and the `items_collected` achievement both count **distinct
items**, not the sum of stacks — holding forty ჟეტონი is still one ნივთი collected.

## Items as quest and achievement rewards

The `rewards` jsonb on `zone_quests`, `achievements` and `achievement_milestones` takes a
new entry alongside the existing ones:

```json
{ "type": "item", "alias": "kolkhuri-cxeni" }
```

gspot-services grants it when the quest or achievement fires. No item notification is sent
on that path — the quest/achievement notification already went out. Quest **creation** in
the app still only accepts a `user-xp` reward, so item rewards are attached in SQL.

## Item icons

`icon_url` points at the uploads bucket, same as reward icons. SVG or PNG both work — web
renders it through `next/image`, the app through `RemoteImage`, which paints SVG with
`react-native-svg`. A row with no icon falls back to the backpack glyph
(`public/backpack.svg`), so an item is usable before its artwork exists.

Quality drives the slot border colour, WoW-style: common grey, uncommon green, rare blue,
epic purple, legendary orange (`ITEM_QUALITY_COLORS` in `src/types/item.ts`, mirrored in
`mobile/types/item.ts` — change both). Uncommon is a muted `#2ea043` rather than WoW's neon
`#1eff00`, which glares as a border and is unreadable as text on white.

## What the bag does not do

The inventory is **always newest-first** and has no sort control and no type filter — only
a name search. Category tabs are the planned way to slice it, and a second ordering would
only compete with them. If you add tabs later, `getInventoryForUser` is the one place that
needs a `category` parameter.
