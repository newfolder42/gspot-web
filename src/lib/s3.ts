import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET;

if (!BUCKET) {
    // Don't throw at import-time in case some scripts run without env configured,
    // but warn during runtime when functions are called.
    // eslint-disable-next-line no-console
    console.warn("S3_BUCKET not configured in environment. S3 functions will fail.");
}

const s3client = new S3Client({
    region: REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        }
        : undefined,
});

export async function getSignedUploadUrl(opts: {
    key: string;
    contentType?: string;
    expiresIn?: number; // seconds
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
    console.log("Generated signed upload URL:", url);
    console.log("For key:", key);
    return url;
}

export async function deleteObject(key: string) {
    if (!BUCKET) throw new Error("S3_BUCKET not configured");
    const cmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
    return s3client.send(cmd);
}
