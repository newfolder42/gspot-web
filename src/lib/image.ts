import exifr from "exifr";
import { logerror } from "./logger";
import imageCompression from "browser-image-compression";

export async function convertToWebP(file: File): Promise<File> {
    try {
        return await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.8
        });
    }
    catch (err) {
        logerror('convertToWebP error', [err, file.size, file.type, file.name]);
        throw err;
    }
}

export async function extractGPSCorrdinates(file: File) {
    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
        const gps = await exifr.gps(file);
        if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
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
        logerror('EXIF parse error', [err, file.size, file.type, file.name]);
    }
    return { latitude, longitude };
}