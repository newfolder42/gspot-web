"use server"

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

const s3client = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWSS3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWSS3_SECRET_ACCESS_KEY!,
    },
});

export async function generateFileUrl(opts: {
    key: string;
    contentType?: string;
    expiresIn?: number;
}) {
    if (!BUCKET) throw new Error("S3_BUCKET not configured");
    const { key, contentType = "application/octet-stream", expiresIn = 900 } = opts;

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        ACL: "private",
    });

    const url = await getSignedUrl(s3client, command, { expiresIn });
    return url;
}

export async function deleteObject(key: string) {
    if (!BUCKET) throw new Error("S3_BUCKET not configured");
    const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
    return s3client.send(cmd);
}
