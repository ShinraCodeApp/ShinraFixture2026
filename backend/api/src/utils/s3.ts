import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from './logger';

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export type MediaFolder = 'avatars' | 'flags' | 'shields' | 'news' | 'ads';

export async function uploadFile(
  buffer: Buffer,
  folder: MediaFolder,
  mimeType: string,
  originalName?: string
): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'max-age=31536000',
    })
  );

  return config.aws.cloudfrontUrl
    ? `${config.aws.cloudfrontUrl}/${key}`
    : `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const key = fileUrl.split('/').slice(-2).join('/');
    await s3.send(new DeleteObjectCommand({ Bucket: config.aws.bucket, Key: key }));
  } catch (err) {
    logger.warn('Failed to delete S3 file:', err);
  }
}

export async function getPresignedUploadUrl(folder: MediaFolder, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const key = `${folder}/${uuidv4()}.${ext}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: config.aws.bucket, Key: key, ContentType: mimeType }),
    { expiresIn: 300 }
  );

  const fileUrl = config.aws.cloudfrontUrl
    ? `${config.aws.cloudfrontUrl}/${key}`
    : `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
}
