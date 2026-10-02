import { PermissionsAndroid, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Gate before opening the photo library. Returns false only when the pick must not go ahead.
 *
 * Android: the system photo picker needs no media permission — Play policy forbids
 * READ_MEDIA_IMAGES/VIDEO for picking single photos (blocked in app.json). When the caller
 * needs the photo's GPS, ACCESS_MEDIA_LOCATION is requested first so the picker may hand
 * back unredacted EXIF location. It is best-effort: a denial still lets the pick go ahead,
 * and callers fall back to placing the location manually when no GPS comes through.
 *
 * iOS: unchanged — the library permission is requested as before.
 */
export async function requestLibraryAccess({ withLocation }: { withLocation: boolean }): Promise<boolean> {
  if (Platform.OS !== 'android') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return perm.granted;
  }

  // ACCESS_MEDIA_LOCATION exists from Android 10 (API 29).
  if (withLocation && Platform.Version >= 29) {
    try {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION);
    } catch (e) {
      if (__DEV__) console.warn('[photoAccess] ACCESS_MEDIA_LOCATION request failed:', e);
    }
  }
  return true;
}
