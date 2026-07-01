/**
 * PUT a local file (by URI) to a pre-signed S3 URL and return its public URL
 * (the signed URL with the query string stripped). Shared by post-photo submit
 * and profile-photo upload flows.
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  uri: string,
  mimeType: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const blob = await fetch(uri).then((r) => r.blob());

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', mimeType || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('ატვირთვა ვერ მოხერხდა'));
    xhr.onerror = () => reject(new Error('ატვირთვა ვერ მოხერხდა'));
    xhr.send(blob);
  });

  return signedUrl.split('?')[0];
}
