const MOBILE_USER_AGENT_PATTERN = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return MOBILE_USER_AGENT_PATTERN.test(userAgent);
}

const IOS_USER_AGENT_PATTERN = /iPhone|iPad|iPod/i;

export function isIOSUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return IOS_USER_AGENT_PATTERN.test(userAgent);
}
