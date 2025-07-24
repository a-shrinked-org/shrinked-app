import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/utils/r2-utils';
import { jobStore } from '@/lib/jobStore';
import { JobMetadata } from '@/types/job';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    return !!token; // Replace with robust token verification
  } catch (error) {
    console.error('Auth verification error:', error);
    return false;
  }
}

/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error: any, defaultMessage: string): NextResponse {
  console.error(`API error in sieve/webhook:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: defaultMessage, details: errorMessage },
    { status: 500 }
  );
}

/**
 * Webhook handler for Sieve job updates.
 */
export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    const { job_id, status, data } = webhookData;
    console.log(`Webhook received for job ${job_id}: ${status}`);

    if (status === 'finished' && data) {
      const fileUrl = Array.isArray(data) ? data[0] : data.url || data;
      if (!fileUrl || !fileUrl.startsWith('http')) {
        throw new Error('No valid file URL in webhook data');
      }

      // Fetch the file from Sieve's output URL
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file from ${fileUrl}: ${fileResponse.statusText}`);
      }
      const fileBuffer = await fileResponse.arrayBuffer();

      // Generate filename based on job ID and output format
      const jobMetadata = await jobStore.get(job_id);
      const extension = jobMetadata?.output_format || 'mp3';
      const filename = `sieve-download-${job_id}.${extension}`;

      // Get presigned URL for Cloudflare R2
      const { presignedUrl: uploadUrl } = await getPresignedUploadUrl(filename, `audio/${extension}`);

      // Upload to Cloudflare R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: fileBuffer,
        headers: { 'Content-Type': `audio/${extension}` },
      });
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
      }

      // Construct the final file URL (adjust based on your R2 setup)
      const r2FileUrl = `https://your-r2-bucket.s3.amazonaws.com/${filename}`;

      // Update job metadata
      await jobStore.set(job_id, { ...jobMetadata!, status, fileUrl: r2FileUrl, originalUrl: jobMetadata?.originalUrl || '', output_format: jobMetadata?.output_format || '' });

      return NextResponse.json({ status: 'received' }, { status: 200 });
    } else if (status === 'error') {
      const jobMetadata = await jobStore.get(job_id);
      await jobStore.set(job_id, {
        status,
        fileUrl: undefined,
        originalUrl: jobMetadata?.originalUrl || '',
        output_format: jobMetadata?.output_format || '',
      });
      return NextResponse.json({ status: 'received' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return handleApiError(error, 'Failed to process webhook');
  }
}

/**
 * Retrieves job status from the in-memory store (fallback for frontend)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const jobMetadata = await jobStore.get(jobId);
    if (!jobMetadata) {
      return NextResponse.json(
        { status: 'job_not_found', fileUrl: null, error: `Job ${jobId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: jobMetadata.status,
      fileUrl: jobMetadata.fileUrl || null,
      error: jobMetadata.status === 'error' ? 'Job failed' : null,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to retrieve job status');
  }
}
