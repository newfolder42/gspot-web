// Rebuilds src/data/georgia-boundary.json from the geoBoundaries source.
//
//   curl -L -o geo-adm0.geojson \
//     "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GEO/ADM0/geoBoundaries-GEO-ADM0.geojson"
//   node src/data/build-georgia-boundary.js geo-adm0.geojson src/data/georgia-boundary.json 0.0005
//
// The source has 15,399 vertices; a 0.0005 degree (~55m) Douglas-Peucker
// tolerance brings that to ~3,900 while still keeping coastal cities such as
// Batumi inside the polygon. Natural Earth 10m was tried first and rejected:
// at ~533 vertices for the whole country, Batumi lands in the sea.
const fs = require('fs');

const [, , srcPath, outPath, tolArg] = process.argv;
if (!srcPath || !outPath) {
  console.error('usage: build-georgia-boundary.js <source.geojson> <out.json> [tolerance]');
  process.exit(1);
}
const tolerance = parseFloat(tolArg ?? '0.0005');

const gj = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const feature = gj.type === 'FeatureCollection' ? gj.features[0] : gj;
const polygons =
  feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;

// Perpendicular distance from p to segment a-b, in degrees.
function segDist(p, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return Math.sqrt(dx * dx + dy * dy);
}

function douglasPeucker(points, tol) {
  if (points.length <= 2) return points.slice();
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segDist(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tol && index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n) => Math.round(n * 1e5) / 1e5;

const simplified = polygons
  .map((rings) =>
    rings
      .map((ring) => {
        // Simplify the open path, then re-close it.
        const open = ring.slice(0, -1);
        let out = (tolerance > 0 ? douglasPeucker(open, tolerance) : open).map(([x, y]) => [
          round(x),
          round(y),
        ]);
        // Rounding to 5 decimals (~1m) can collapse neighbouring vertices.
        out = out.filter((p, i) => i === 0 || p[0] !== out[i - 1][0] || p[1] !== out[i - 1][1]);
        return out.concat([out[0]]);
      })
      .filter((ring) => ring.length >= 4)
  )
  .filter((rings) => rings.length > 0);

let w = Infinity;
let s = Infinity;
let e = -Infinity;
let n = -Infinity;
for (const rings of simplified) {
  for (const [x, y] of rings[0]) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
}

fs.writeFileSync(outPath, JSON.stringify({ bbox: [w, s, e, n], polygons: simplified }));
console.log(`wrote ${outPath}: ${simplified.length} polygon(s), bbox [${w}, ${s}, ${e}, ${n}]`);
