import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 configuration from environment variables
const R2_CONFIG = {
  endpoint: process.env.R2_ENDPOINT || 'https://208ac76a616307b97467d996e09e57f2.r2.cloudflarestorage.com',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '1463f3eb288ddbc7b99234acf179d748',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'ef8e82002282e5cf88e7831c7d95880671c85c8ebb17b34297674427d130fc2d',
  bucketName: process.env.R2_BUCKET_NAME || 'apptemp'
};

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
	
	// In a more robust implementation, you would verify the token
	// For now, we'll just check that it exists
	const token = authHeader.split(' ')[1];
	return !!token;
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
  
  // Format the error response
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const statusCode = error instanceof Error && 'status' in error ? (error as any).status : 500;
  
  return NextResponse.json({ 
	error: 'Failed to generate upload URL', 
	details: errorMessage 
  }, { status: statusCode });
}

// Set Next.js config for API route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
	// Verify authentication using your centralized auth utilities
	const isAuthenticated = await verifyAuth(request);
	if (!isAuthenticated) {
	  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Parse the request body
	const { fileName, contentType, bucketName } = await request.json();

	if (!fileName || !contentType) {
	  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
	}

	// Set up the S3 upload parameters
	const uploadParams = {
	  Bucket: bucketName || R2_CONFIG.bucketName,
	  Key: fileName,
	  ContentType: contentType,
	};

	// Generate presigned URL
	const command = new PutObjectCommand(uploadParams);
	const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour

	// Generate the final file URL that will be used after upload
	const fileUrl = `${R2_CONFIG.endpoint}/${uploadParams.Bucket}/${uploadParams.Key}`;

	return NextResponse.json({ 
	  success: true,
	  presignedUrl,
	  fileUrl,
	  message: 'Upload URL generated successfully'
	});

  } catch (error) {
	return handleApiError(error);
  }
}