// What the user is told when a location-dispute action is turned down. Plain constants, no
// server imports: the browser components use them directly.
// (The Android app keeps its own copy of these in mobile/lib/posts.ts.)
export const LOCATION_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'პოსტი ვერ მოიძებნა.',
  FORBIDDEN: 'ამ მოქმედების უფლება არ გაქვს.',
  INVALID_STATE: 'ეს მოქმედება ამ პოსტზე ახლა შეუძლებელია.',
  NO_GUESS: 'გასაჩივრება მხოლოდ საკუთარ გამოცნობაზე შეგიძლია.',
  SCORE_TOO_HIGH: 'სრულყოფილი გამოცნობის გასაჩივრება შეუძლებელია.',
  ALREADY_DISPUTED: 'ეს უკვე გასაჩივრებული გაქვს.',
  OUTSIDE_GEORGIA: 'კოორდინატები საქართველოს ფარგლებს გარეთაა.',
  LOCATION_UNCHANGED: 'ახალი ლოკაცია ძველთან ძალიან ახლოსაა. მონიშნე სხვა ადგილი.',
  INVALID_INPUT: 'შეყვანილი მონაცემები არასწორია.',
  SERVER_ERROR: 'სერვერის შეცდომა. სცადე მოგვიანებით.',
};

export function locationErrorMessage(code: string | undefined): string {
  return (code && LOCATION_ERROR_MESSAGES[code]) || LOCATION_ERROR_MESSAGES.SERVER_ERROR;
}
