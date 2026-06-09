export const DEFAULT_ZONE_UPLOAD_RULES = [
  'ფოტო უნდა იყოს საქართველოში გადაღებული.',
  'კოორდინატები უნდა იყოს მითითებული სადაცაა გადაღებული, და არა კადრის ობიექტის.',
  'არ უნდა იყოს დაზუმილი ან შემთხვევითი კადრი.',
];

export function getZoneUploadRules(uploadRules: unknown): string[] {
  if (!uploadRules) return DEFAULT_ZONE_UPLOAD_RULES;

  let parsed = uploadRules;
  if (typeof uploadRules === 'string') {
    try {
      parsed = JSON.parse(uploadRules);
    } catch {
      return DEFAULT_ZONE_UPLOAD_RULES;
    }
  }

  if (Array.isArray(parsed)) {
    const normalized = parsed.filter((r) => typeof r === 'string' && r.trim().length > 0);
    return normalized.length > 0 ? normalized : DEFAULT_ZONE_UPLOAD_RULES;
  }

  if (parsed && typeof parsed === 'object') {
    const rulesValue = (parsed as { rules?: unknown }).rules;
    if (Array.isArray(rulesValue)) {
      const normalized = rulesValue.filter((r) => typeof r === 'string' && r.trim().length > 0);
      return normalized.length > 0 ? normalized : DEFAULT_ZONE_UPLOAD_RULES;
    }
  }

  return DEFAULT_ZONE_UPLOAD_RULES;
}
