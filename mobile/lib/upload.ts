/**
 * PUT a local file (by URI) to a pre-signed S3 URL and return its public URL
 * (the signed URL with the query string stripped). Shared by post-photo submit
 * and profile-photo upload flows.
 */

export type UploadProgress = {
  /** 0-100, clamped and never moving backwards. */
  pct: number;
  /** Bytes confirmed sent, capped at `total`. */
  loaded: number;
  /** Byte length of the body being sent. */
  total: number;
};

export async function uploadToSignedUrl(
  signedUrl: string,
  uri: string,
  mimeType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const blob = await fetch(uri).then((r) => r.blob());
  const total = blob.size;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', mimeType || 'application/octet-stream');

    let lastPct = 0;
    xhr.upload.onprogress = (e) => {
      if (!onProgress || total <= 0) return;
      // `e.total` cannot be trusted. React Native hard-codes `lengthComputable: true`, and on
      // Android the total comes from `inputStream.available()`, which under-reports for large
      // files, so `e.loaded / e.total` climbs past 1 and the bar showed more than 100%. The
      // blob we are sending is the one length we actually know, so measure against that.
      const loaded = Math.min(Math.max(e.loaded, 0), total);
      const pct = Math.min(100, Math.round((loaded / total) * 100));
      // An okhttp retry restarts `e.loaded` at 0; a bar that rewinds reads as a failure.
      if (pct < lastPct) return;
      lastPct = pct;
      onProgress({ pct, loaded, total });
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('ატვირთვა ვერ მოხერხდა'));
    xhr.onerror = () => reject(new Error('ატვირთვა ვერ მოხერხდა'));
    xhr.send(blob);
  });

  // The last progress event can land short of the full body, so close the bar out here.
  onProgress?.({ pct: 100, loaded: total, total });

  return signedUrl.split('?')[0];
}
