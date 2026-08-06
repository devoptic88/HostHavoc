import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSettings } from "@/lib/settings";

/**
 * S3-compatible object storage for LITE hibernation archives. Works with
 * AWS S3, Cloudflare R2, Backblaze B2, MinIO, etc. — anything that speaks the
 * S3 API — via a configurable endpoint. Config lives in Admin -> Settings,
 * same DB-backed-override-with-env-fallback pattern as Stripe/Pterodactyl.
 */

async function storageSettings() {
  const s = await getSettings();
  return {
    endpoint: s.S3_ENDPOINT || undefined,
    region: s.S3_REGION || "auto",
    bucket: s.S3_BUCKET,
    accessKeyId: s.S3_ACCESS_KEY_ID,
    secretAccessKey: s.S3_SECRET_ACCESS_KEY,
  };
}

export async function storageConfigured(): Promise<boolean> {
  const s = await storageSettings();
  return Boolean(s.bucket && s.accessKeyId && s.secretAccessKey);
}

async function s3Client() {
  const s = await storageSettings();
  if (!s.bucket || !s.accessKeyId || !s.secretAccessKey) {
    throw new Error("Object storage is not configured — set it up in Admin -> Settings.");
  }
  const client = new S3Client({
    region: s.region,
    endpoint: s.endpoint,
    // Path-style is what R2/B2/MinIO expect; virtual-hosted style (AWS's
    // default) breaks against those when a custom endpoint is set.
    forcePathStyle: Boolean(s.endpoint),
    credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey },
  });
  return { client, bucket: s.bucket };
}

export function hibernationArchiveKey(orderId: string, backupUuid: string) {
  return `hibernation/${orderId}/${backupUuid}.tar.gz`;
}

/** Streams a fetch() response body straight into the bucket — never buffers the whole archive in memory. */
export async function uploadArchive(key: string, body: ReadableStream | null, contentType = "application/gzip") {
  if (!body) throw new Error("Archive download had no body to upload");
  const { client, bucket } = await s3Client();
  const upload = new Upload({
    client,
    params: { Bucket: bucket, Key: key, Body: body, ContentType: contentType },
  });
  await upload.done();
  return key;
}

/** Time-limited GET URL so Wings can pull the archive directly into a fresh server. */
export async function presignArchiveDownload(key: string, expiresInSeconds = 3600) {
  const { client, bucket } = await s3Client();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

export async function deleteArchive(key: string) {
  const { client, bucket } = await s3Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
