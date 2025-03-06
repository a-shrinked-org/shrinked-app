import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 configuration from environment variables (no hardcoded fallbacks except bucket)
const R2_CONFIG = {
  endpoint: process.env.R2_ENDPOINT, // Should be https://208ac76a616307b97467d996e09e57f2.r2.cloudflarestorage.com
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'apptemp',
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

	// Correct file URL construction (no nested bucket names)
	const fileUrl = `${R2_CONFIG.endpoint}/${targetBucket}/${fileName}`;

	console.log('Generated Presigned URL:', presignedUrl);
	console.log('File URL:', fileUrl);

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