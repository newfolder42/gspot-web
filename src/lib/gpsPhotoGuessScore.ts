/**
 * Calculate score based on distance in meters
 * @param distanceMeters - Distance between guess and actual location in meters
 * @returns Score between 0 and 100
 */
export function calculateGuessScore(distanceMeters: number): number {
  if (distanceMeters < 0) return 0;

  // Perfect: 0-30m -> 100 points
  if (distanceMeters <= 30) return 100;

  // Excellent: 30-150m -> 80-99 points
  if (distanceMeters <= 150) {
    return Math.round(80 + ((150 - distanceMeters) / 120) * 19);
  }

  // Good: 150-500m -> 60-79 points
  if (distanceMeters <= 500) {
    return Math.round(60 + ((500 - distanceMeters) / 350) * 19);
  }

  // Fair: 500-1500m -> 40-59 points
  if (distanceMeters <= 1500) {
    return Math.round(40 + ((1500 - distanceMeters) / 1000) * 19);
  }

  // Poor: 1500-5000m -> 20-39 points
  if (distanceMeters <= 5000) {
    return Math.round(20 + ((5000 - distanceMeters) / 3500) * 19);
  }

  // Very poor: 5000-15000m -> 10-19 points
  if (distanceMeters <= 15000) {
    return Math.round(10 + ((15000 - distanceMeters) / 10000) * 9);
  }

  // Minimal: 15000+m -> 1-9 points (decreasing, min 1)
  if (distanceMeters <= 50000) {
    return Math.max(1, Math.round(9 - ((distanceMeters - 15000) / 35000) * 8));
  }

  return 1; // Anything beyond 50km gets 1 point
}
