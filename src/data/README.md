# Boundary data

## georgia-boundary.json

Point-in-polygon source for `isInGeorgia()` in `src/lib/geo.ts`. Shape:

```json
{ "bbox": [west, south, east, north], "polygons": [[ outerRing, ...holes ]] }
```

Rings are closed (last point repeats the first) and coordinates are `[lng, lat]`
rounded to 5 decimals.

- **Source:** [geoBoundaries](https://www.geoboundaries.org/) gbOpen GEO ADM0,
  release `9469f09`, representing 2017.
- **Licence:** CC BY-SA 2.0 — attribution is required wherever the app is
  published. Runge, D. et al., *geoBoundaries: A global database of political
  administrative boundaries*.
- **Simplification:** Douglas-Peucker at 0.0005 degrees (~55m), 15,399 vertices
  down to ~3,900.
- **Disputed territories:** Abkhazia and South Ossetia are inside the polygon,
  so photos from those regions validate as Georgian.

Regenerate with `build-georgia-boundary.js` in this folder; the command is in
its header comment.

Natural Earth 1:10m was evaluated first and rejected — it carries only 533
vertices for the whole country, which puts Batumi offshore.
