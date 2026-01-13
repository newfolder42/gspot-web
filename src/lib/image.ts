import exifr from "exifr";
import imageCompression from "browser-image-compression";

export async function convertToWebP(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.85
    });
  }
  catch (err) {
    console.log('convertToWebP error', [err, file.size, file.type, file.name]);
    throw err;
  }
}

export async function extractGPSCorrdinates(file: File) {
  let latitude: number | null = null;
  let longitude: number | null = null;
  try {
    const gps = await exifr.gps(file);
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number'
      && !isNaN(gps.latitude) && !isNaN(gps.longitude)
    ) {
      latitude = gps.latitude;
      longitude = gps.longitude;
    } else {
      const all = await exifr.parse(file);
      if (all?.GPSLatitude && all?.GPSLongitude) {
        latitude = all.GPSLatitude ?? null;
        longitude = all.GPSLongitude ?? null;
      }
    }
    if (latitude == null || longitude == null) {
      return { latitude, longitude };
    }
  } catch (err) {
    alert('all tags' + JSON.stringify(err));
  }
  return { latitude, longitude };
}

export async function extractDateTaken(file: File): Promise<Date | null> {
  try {
    const exif = await exifr.parse(file);
    const dateTaken = exif?.DateTimeOriginal || exif?.DateTime;
    
    if (dateTaken instanceof Date) {
      return dateTaken;
    }
    if (typeof dateTaken === 'string') {
      return new Date(dateTaken);
    }
    return null;
  } catch (err) {
    console.log('extractDateTaken error', err);
    return null;
  }
}