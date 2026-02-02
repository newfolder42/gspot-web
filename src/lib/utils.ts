export function formatCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  fallback: string = 'Invalid coordinates'
): string {
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    isFinite(latitude) &&
    isFinite(longitude)
  ) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
  return fallback;
}
