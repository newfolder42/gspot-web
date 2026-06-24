const MOBILE_USER_AGENT_PATTERN = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return MOBILE_USER_AGENT_PATTERN.test(userAgent);
}
