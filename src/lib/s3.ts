"use server"

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logerror } from "./logger";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

const s3client = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWSS3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWSS3_SECRET_ACCESS_KEY!,
    },
});

export async function generateFileUrl(type: string) {

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: `${type}/${crypto.randomUUID()}`,
        ContentType: "application/octet-stream",
        ACL: "private",
    });
    try {
        const url = await getSignedUrl(s3client, command, { expiresIn: 900 });
        return url;
    } catch (err) {
        await logerror('generateFileUrl error', [err]);
        throw err;
    }
}

export async function deleteObject(key: string) {
    try {
        const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
        return s3client.send(cmd);
    } catch (err) {
        await logerror('deleteObject error', [err]);
    }
}

/** Download an object's bytes into a Buffer. Throws on failure (caller decides how to handle). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const res = await s3client.send(cmd);
    const body = res.Body as unknown as AsyncIterable<Uint8Array> | undefined;
    if (!body) throw new Error(`getObjectBuffer: empty body for key ${key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Upload bytes to a known key. No ACL is set — the bucket serves objects via its policy, and an
 * explicit ACL can fail under "Bucket owner enforced" object ownership.
 */
export async function putObject(
    key: string,
    body: Buffer,
    contentType: string,
    cacheControl: string = "public, max-age=31536000, immutable",
) {
    const cmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
    });
    return s3client.send(cmd);
}
