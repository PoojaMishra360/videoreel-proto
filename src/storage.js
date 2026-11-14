import "dotenv/config";
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in local .env.");
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error("R2_ACCOUNT_ID must be the 32-character Cloudflare account ID.");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getR2Client() {
  if (!client) {
    const { accountId, accessKeyId, secretAccessKey } = getR2Config();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

function safeSegment(value, label) {
  const segment = String(value ?? "");
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(segment)) {
    throw new Error(`${label} must contain only letters, numbers, underscores, or hyphens.`);
  }
  return segment;
}

function projectPrefix(userId, projectId) {
  return `users/${safeSegment(userId, "userId")}/projects/${safeSegment(projectId, "projectId")}/`;
}

function assertOwnedKey(userId, projectId, key) {
  if (typeof key !== "string" || !key.startsWith(projectPrefix(userId, projectId)) || key.includes("..") || key.includes("\\")) {
    throw new Error("Asset key is outside this user's project namespace.");
  }
  return key;
}

export async function checkR2Connection() {
  const { bucket } = getR2Config();
  await getR2Client().send(new HeadBucketCommand({ Bucket: bucket }));
  return { bucket };
}

export async function createProjectAssetUploadUrl({ userId, projectId, assetId, contentType, expiresIn = 300 }) {
  const { bucket } = getR2Config();
  const key = `${projectPrefix(userId, projectId)}${safeSegment(assetId, "assetId")}`;
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(getR2Client(), command, { expiresIn });
  return { key, url, expiresIn };
}

export async function createProjectAssetDownloadUrl({ userId, projectId, key, expiresIn = 900 }) {
  const { bucket } = getR2Config();
  const ownedKey = assertOwnedKey(userId, projectId, key);
  const url = await getSignedUrl(getR2Client(), new GetObjectCommand({ Bucket: bucket, Key: ownedKey }), { expiresIn });
  return { url, expiresIn };
}

export async function uploadProjectAsset({ userId, projectId, assetId, body, contentType }) {
  const { bucket } = getR2Config();
  const key = `${projectPrefix(userId, projectId)}${safeSegment(assetId, "assetId")}`;
  await getR2Client().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return { key };
}

export async function deleteProjectAsset({ userId, projectId, key }) {
  const { bucket } = getR2Config();
  const ownedKey = assertOwnedKey(userId, projectId, key);
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: ownedKey }));
}
