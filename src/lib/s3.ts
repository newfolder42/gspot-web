"use server"

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
        logerror('generateFileUrl error', [err]);
        throw err;
    }
}

export async function deleteObject(key: string) {
    try {
        const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
        return s3client.send(cmd);
    } catch (err) {
        logerror('deleteObject error', [err]);
    }
}
