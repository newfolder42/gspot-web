import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

// Parse a single rational like "41/1" → 41, or "123456/10000" → 12.3456
function parseRational(s: string): number | null {
  const [num, den] = s.trim().split('/').map(Number);
  if (!isFinite(num) || !isFinite(den) || den === 0) return null;
  return num / den;
}

// Parse a GPS coordinate value in any format Expo/Android/iOS may return:
//   number → 41.7230 | string → "41.7230" | "41/1" | "41/1,42/1,1234/100" | array DMS
function parseDMSValue(value: unknown): number | null {
  if (typeof value === 'number' && isFinite(value)) return Math.abs(value);

  if (Array.isArray(value) && value.length >= 3) {
    const toNum = (v: unknown): number | null => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return v.includes('/') ? parseRational(v) : parseFloat(v);
      return null;
    };
    const d = toNum(value[0]);
    const m = toNum(value[1]);
    const s = toNum(value[2]);
    if (d !== null && m !== null && s !== null && isFinite(d) && isFinite(m) && isFinite(s)) {
      return Math.abs(d + m / 60 + s / 3600);
    }
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      const d = parseRational(parts[0]) ?? parseFloat(parts[0]);
      const m = parseRational(parts[1] ?? '0') ?? 0;
      const s = parseRational(parts[2] ?? '0') ?? 0;
      if (isFinite(d) && isFinite(m) && isFinite(s)) return Math.abs(d + m / 60 + s / 3600);
      return null;
    }
    const result = trimmed.includes('/') ? parseRational(trimmed) : parseFloat(trimmed);
    return result !== null && isFinite(result) ? Math.abs(result) : null;
  }

  return null;
}

/** Extract GPS coordinates from an expo-image-picker EXIF block (iOS & Android formats). */
export function extractGPSFromExif(exif: unknown): Coords | null {
  if (!exif || typeof exif !== 'object') return null;
  const e = exif as Record<string, any>;

  // iOS: GPS data lives in exif['{GPS}'] (or 'GPS') with Latitude/Longitude keys
  const gpsBlock = e['{GPS}'] ?? e['GPS'] ?? null;
  if (gpsBlock) {
    let lat = parseDMSValue(gpsBlock.Latitude);
    let lng = parseDMSValue(gpsBlock.Longitude);
    if (lat !== null && lng !== null) {
      if ((gpsBlock.LatitudeRef ?? '').includes('S')) lat = -lat;
      if ((gpsBlock.LongitudeRef ?? '').includes('W')) lng = -lng;
      if (isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  // Android / flat EXIF: GPSLatitude / GPSLongitude at top level
  let lat = parseDMSValue(e.GPSLatitude);
  let lng = parseDMSValue(e.GPSLongitude);
  if (lat !== null && lng !== null) {
    if ((e.GPSLatitudeRef ?? '').includes('S')) lat = -lat;
    if ((e.GPSLongitudeRef ?? '').includes('W')) lng = -lng;
    if (isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

/**
 * Request foreground permission and read the current device location.
 * Returns null if permission is denied or the fix fails.
 */
export async function getLiveLocation(): Promise<Coords | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}
