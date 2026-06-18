export function calculateGuessScore(distanceMeters: number): number {
  if (distanceMeters < 0) return 0;
  if (distanceMeters <= 30) return 100;
  if (distanceMeters <= 150) return Math.round(80 + ((150 - distanceMeters) / 120) * 19);
  if (distanceMeters <= 500) return Math.round(60 + ((500 - distanceMeters) / 350) * 19);
  if (distanceMeters <= 1500) return Math.round(40 + ((1500 - distanceMeters) / 1000) * 19);
  if (distanceMeters <= 5000) return Math.round(20 + ((5000 - distanceMeters) / 3500) * 19);
  if (distanceMeters <= 15000) return Math.round(10 + ((15000 - distanceMeters) / 10000) * 9);
  if (distanceMeters <= 50000) return Math.max(1, Math.round(9 - ((distanceMeters - 15000) / 35000) * 8));
  return 1;
}

export function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLon * sinDLon;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
