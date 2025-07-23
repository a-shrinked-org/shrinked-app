
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Define the R2 configuration structure
interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

/**
 * Generates a presigned URL for uploading a file to Cloudflare R2.
 * @param fileName The name of the file to be uploaded.
 * @param contentType The MIME type of the file.
 * @returns An object containing the presigned URL for upload and the final public URL of the file.
 */
export async function getPresignedUploadUrl(fileName: string, contentType: string): Promise<{ presignedUrl: string; fileUrl: string }> {
  // 1. Load R2 configuration from environment variables
  const r2Config: R2Config = {
    endpoint: process.env.R2_ENDPOINT!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME || 'apptemp',
    publicUrl: process.env.R2_PUBLIC_URL || 'https://store.shrinked.ai',
  };

  // 2. Validate that all required environment variables are set
  if (!r2Config.endpoint || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
    throw new Error('Missing required R2 configuration in server environment variables.');
  }

  // 3. Create an S3 client configured for Cloudflare R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });

  // 4. Prepare the upload command
  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: fileName,
    ContentType: contentType,
  });

  // 5. Generate the presigned URL from the command
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  // 6. Construct the final public-facing URL for the file
  const fileUrl = `${r2Config.publicUrl}/${fileName}`;

  return { presignedUrl, fileUrl };
}
