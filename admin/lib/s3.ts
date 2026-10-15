import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

// Created on first use so a page that never uploads does not need AWS credentials.
let client: S3Client | undefined;

function s3(): S3Client {
  client ??= new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWSS3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWSS3_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

/** Public URL of a key in the uploads bucket, e.g. .../items/church-candle.png */
export function publicUrl(key: string): string {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * Uploads bytes to a new key. Resolves false instead of overwriting when the key is taken:
 * S3 answers a conditional PUT (If-None-Match: *) with 412, and icons are served with an
 * immutable cache header, so replacing a live file would never reach users who have it.
 * Same bucket settings as the main app — no ACL, the bucket policy serves the objects.
 */
export async function putNewObject(key: string, body: Buffer, contentType: string): Promise<boolean> {
  try {
    await s3().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        IfNoneMatch: '*',
      })
    );
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 412 || status === 409) return false;
    throw err;
  }
}
