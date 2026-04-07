import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = env.AWS_S3_BUCKET || '';

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
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: compressed,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    })
  );
  return `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};

export const uploadFile = async (
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  folder = 'files'
): Promise<{ url: string; key: string }> => {
  const ext = originalName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read',
    })
  );
  return {
    url: `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    key,
  };
};

export const deleteFile = async (key: string): Promise<void> => {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};
