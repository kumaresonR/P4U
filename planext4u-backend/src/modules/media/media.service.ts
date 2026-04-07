import { prisma } from '../../config/database';
import { uploadImage, uploadFile, deleteFile } from '../../services/storage';
import { AppError } from '../../middleware/errorHandler';

export async function uploadSingleImage(
  buffer: Buffer,
  mimetype: string,
  folder = 'uploads',
): Promise<string> {
  return uploadImage(buffer, mimetype, folder);
}

export async function uploadMultipleImages(
  files: Express.Multer.File[],
  folder = 'uploads',
): Promise<string[]> {
  return Promise.all(files.map((f) => uploadImage(f.buffer, f.mimetype, folder)));
}

export async function uploadDocument(
  file: Express.Multer.File,
  vendorId?: string,
  serviceVendorId?: string,
) {
  const { url, key } = await uploadFile(file.buffer, file.mimetype, file.originalname, 'documents');

  const media = await prisma.mediaLibrary.create({
    data: {
      file_url: url,
      s3_key: key,
      file_type: 'document',
      file_size: file.size,
      file_name: file.originalname,
      vendor_id: vendorId,
      service_vendor_id: serviceVendorId,
    },
  });

  return { url, media };
}

export async function getMediaLibrary(userId: string, role: string) {
  const where = role === 'vendor' ? { vendor_id: userId } : { service_vendor_id: userId };
  return prisma.mediaLibrary.findMany({ where, orderBy: { created_at: 'desc' } });
}

export async function removeMedia(id: string) {
  const media = await prisma.mediaLibrary.findUnique({ where: { id } });
  if (!media) throw new AppError('Media not found', 404);
  if (media.s3_key) await deleteFile(media.s3_key);
  await prisma.mediaLibrary.delete({ where: { id } });
}
