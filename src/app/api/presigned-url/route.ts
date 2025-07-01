import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';



/**
 * Verify authentication token from request headers
 */
async function verifyAuth(request: NextRequest): Promise<boolean> {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
	  return false;
	}
	const token = authHeader.split(' ')[1];
	return !!token; // Add proper token verification in production
  } catch (error) {
	console.error('Auth verification error:', error);
	return false;
  }
}

/**
 * Convert R2 development URL to public URL format
 * From: https://208ac76a616307b97467d996e09e57f2.r2.cloudflarestorage.com//apptemp/filename.ext
 * To:   https://store.shrinked.ai/filename.ext
 */
function convertToPublicUrl(R2_CONFIG: any, developmentUrl: string, fileName: string): string {
  // Simply use the public base URL and append the file name
  return `${R2_CONFIG.publicUrl}/${fileName}`;
}

/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error: any): NextResponse {
  console.error('API error:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const statusCode = error instanceof Error && 'status' in error ? (error as any).status : 500;

  return NextResponse.json(
	{ error: 'Failed to generate upload URL', details: errorMessage },
	{ status: statusCode }
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // R2 configuration from environment variables (no hardcoded fallbacks except bucket)
  const R2_CONFIG = {
    endpoint: process.env.R2_ENDPOINT, // Should be https://208ac76a616307b97467d996e09e57f2.r2.cloudflarestorage.com
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME || 'apptemp',
    publicUrl: process.env.R2_PUBLIC_URL || 'https://store.shrinked.ai', // Public URL for file access
  };

  // Validate required environment variables
  if (!R2_CONFIG.endpoint || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
    throw new Error('Missing required R2 configuration in environment variables');
  }

  // Create S3 client for Cloudflare R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_CONFIG.endpoint,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
  });

  try {
	const isAuthenticated = await verifyAuth(request);
	if (!isAuthenticated) {
	  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { fileName, contentType, bucketName } = await request.json();

	if (!fileName || !contentType) {
	  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
	}

	const targetBucket = bucketName || R2_CONFIG.bucketName;

	const uploadParams = {
	  Bucket: targetBucket,
	  Key: fileName,
	  ContentType: contentType,
	};

	console.log('R2 Endpoint:', R2_CONFIG.endpoint);
	console.log('Target Bucket:', targetBucket);
	console.log('File Key:', fileName);

	const command = new PutObjectCommand(uploadParams);
	const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

	// Construct the development R2 URL (for logging/debugging)
	const developmentUrl = `${R2_CONFIG.endpoint}/${targetBucket}/${fileName}`;
	
	// Generate the public-facing URL
	const fileUrl = convertToPublicUrl(R2_CONFIG, developmentUrl, fileName);

	console.log('Generated Presigned URL:', presignedUrl);
	console.log('Development URL:', developmentUrl);
	console.log('Public File URL:', fileUrl);

	return NextResponse.json({
	  success: true,
	  presignedUrl,
	  fileUrl,
	  bucketName: targetBucket,
	  objectKey: fileName,
	  message: 'Upload URL generated successfully',
	});
  } catch (error) {
	return handleApiError(error);
  }
}