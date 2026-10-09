import type { LocationActionError } from '@/lib/postLocationDisputes';

/** HTTP status for each way a location-dispute action can be turned down. */
export const LOCATION_ERROR_STATUS: Record<LocationActionError, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_STATE: 409,
  NO_GUESS: 409,
  SCORE_TOO_HIGH: 400,
  ALREADY_DISPUTED: 409,
  OUTSIDE_GEORGIA: 400,
  LOCATION_UNCHANGED: 400,
  INVALID_INPUT: 400,
  SERVER_ERROR: 500,
};
