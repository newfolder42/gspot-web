# gspot-admin

Local admin for G'Spot. Standalone Next.js app next to `src/` (web) and `mobile/`: it has its own
`package.json`, `lib/` and `actions/`, imports nothing from the web project and calls none of its
API. It talks straight to the same PostgreSQL database and S3 bucket.

**No auth** — it binds to `127.0.0.1` only and is meant to run on your own machine.

## Run

```bash
cd admin
npm install
npm run dev        # http://localhost:3100
```

## Environment

Same variable names as the web project. Put the values in `admin/.env` (or `.env.local`);
`.env.example` lists them.

| Variable | Used for |
|---|---|
| `POSTGRES_HOST` `POSTGRES_DB` `POSTGRES_USER` `POSTGRES_PASSWORD` `POSTGRES_SSL` | database |
| `AWS_REGION` `S3_BUCKET` `AWSS3_ACCESS_KEY_ID` `AWSS3_SECRET_ACCESS_KEY` | item icon upload |

Copying the web project's whole env file works too; the extra variables are ignored.

## Pages

| Card | Page | What it does |
|---|---|---|
| ინვენტარი | `/locations` | item locations (grid + add) and, below, the items each one hands out (grid + add) |
| | `/items` | items (grid + add, icon upload to `items/` in the bucket) |
| | `/categories` | item categories (grid + add) |
| | `/types` | item types (grid + add) |
| რეპორტები | `/reports` | the `reports` table, newest first. Post location disputes are not listed. |
| ბოლო აქტივობები | `/activities` | posts, guesses, comments, votes and rewards, newest first. Filter by user (name or ID, none by default) and date (today in Tbilisi by default; empty = all days). |

Every list is create-only for now. New rows open in a modal.

## Notes

- **Location JSON.** Paste the ring `[[lng, lat], …]`; it is stored as one line. A GeoJSON
  `FeatureCollection` / `Feature` / `Polygon` from geojson.io is unwrapped to its outer ring.
  Coordinates outside Georgia are rejected — a swapped `[lat, lng]` pair is the usual cause.
  A circle (latitude, longitude, radius) can be added instead of a polygon.
- **Icons.** The file keeps its name, lower-cased (`Church Candle.PNG` → `items/church-candle.png`),
  and is never overwritten: if the key already exists the item is not created.
- **Reports actions.** The grid has a "მოქმედებები" column wired to
  `components/report-row-actions.tsx`, empty for now.
- **Ids.** Inserts that collide with a hand-inserted row's id (a serial left behind its table)
  move the sequence up to `max(id)` and retry once.
