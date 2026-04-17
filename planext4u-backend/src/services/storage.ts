/**
 * Object storage via Backblaze B2 (S3-compatible API).
 * Secrets: B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_PUBLIC_URL_BASE in .env only.
 * Defaults: see ../config/b2-defaults.ts
 */
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

function b2ConfigError(): string {
  return (
    'Backblaze B2 is not configured. Set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET, ' +
    'B2_S3_ENDPOINT, and B2_PUBLIC_URL_BASE in .env (see .env.example).'
  );
}

function getS3Client(): S3Client {
  const { B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_S3_ENDPOINT } = env;
  if (!B2_APPLICATION_KEY_ID || !B2_APPLICATION_KEY || !B2_S3_ENDPOINT) {
    throw new Error(b2ConfigError());
  }
  const region =
    env.B2_REGION ||
    B2_S3_ENDPOINT.match(/s3\.([^.]+)\.backblazeb2\.com/)?.[1] ||
    'us-east-1';

  return new S3Client({
    region,
    endpoint: B2_S3_ENDPOINT,
    credentials: {
      accessKeyId: B2_APPLICATION_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
  });
}

function publicUrl(key: string): string {
  const base = env.B2_PUBLIC_URL_BASE?.replace(/\/$/, '');
  if (!base) throw new Error(b2ConfigError());
  return `${base}/${key}`;
}

const getBucket = (): string => {
  if (!env.B2_BUCKET) throw new Error(b2ConfigError());
  return env.B2_BUCKET;
};

export const uploadImage = async (
  buffer: Buffer,
  _mimetype: string,
  folder = 'uploads'
): Promise<string> => {
  const compressed = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const key = `${folder}/${uuidv4()}.jpg`;
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: compressed,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000',
    })
  );
  return publicUrl(key);
};

export const uploadFile = async (
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  folder = 'files'
): Promise<{ url: string; key: string }> => {
  const ext = originalName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      CacheControl: 'public, max-age=31536000',
    })
  );
  return {
    url: publicUrl(key),
    key,
  };
};

export const deleteFile = async (key: string): Promise<void> => {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
};
