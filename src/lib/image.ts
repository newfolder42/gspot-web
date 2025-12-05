import exifr from "exifr";
import imageCompression from "browser-image-compression";

export async function convertToWebP(file: File): Promise<File> {
    try {
        return await imageCompression(file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.8
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
        alert('gps tags' + JSON.stringify(gps));
        if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
            latitude = gps.latitude;
            longitude = gps.longitude;
        } else {
            const all = await exifr.parse(file);
            alert('all tags' + JSON.stringify(all));
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