import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const storage = new Storage({
  projectId: env.GCS_PROJECT_ID || env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const BUCKET = env.GCS_BUCKET || '';
const bucket = storage.bucket(BUCKET);

export const uploadImage = async (
  buffer: Buffer,
  mimetype: string,
  folder = 'uploads'
): Promise<string> => {
  const compressed = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const key = `${folder}/${uuidv4()}.jpg`;
  const file = bucket.file(key);
  await file.save(compressed, {
    contentType: 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000' },
  });
  return `https://storage.googleapis.com/${BUCKET}/${key}`;
};

export const uploadFile = async (
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  folder = 'files'
): Promise<{ url: string; key: string }> => {
  const ext = originalName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;
  const file = bucket.file(key);
  await file.save(buffer, {
    contentType: mimetype,
    metadata: { cacheControl: 'public, max-age=31536000' },
  });
  return {
    url: `https://storage.googleapis.com/${BUCKET}/${key}`,
    key,
  };
};

export const deleteFile = async (key: string): Promise<void> => {
  await bucket.file(key).delete({ ignoreNotFound: true });
};
