import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/utils/r2-utils';
import { jobStore } from '@/lib/jobStore';
import { JobMetadata } from '@/types/job';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error: any, defaultMessage: string): NextResponse {
  console.error(`API error in sieve/download/status:`, error, error.stack); // Added error.stack
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: defaultMessage, details: errorMessage },
    { status: 500 }
  );
}

/**
 * Handles polling for Sieve job status.
 */
export async function GET(request: NextRequest) {
  // 1. Verify API Key
  if (!process.env.SIEVE_API_KEY) {
    console.error('SIEVE_API_KEY environment variable is not set.');
    return handleApiError(new Error('SIEVE_API_KEY environment variable is not set.'), 'Server configuration error');
  }
  const SIEVE_API_KEY = process.env.SIEVE_API_KEY;

  try {
    // 2. Get job ID from request query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      console.log('Job ID is missing from request query.');
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    console.log('Received Job ID for status check:', jobId);

    // 3. Check local jobStore first
    let jobMetadata = jobStore.get(jobId);

    if (!jobMetadata || (jobMetadata.status !== 'finished' && jobMetadata.status !== 'error')) {
      // If not found in store or still in progress, fetch from Sieve
      console.log(`Fetching status for Sieve job ${jobId} from Sieve API...`);
      const statusResponse = await fetch(`https://mango.sievedata.com/v2/job/${jobId}`, {
        headers: {
          'X-API-Key': SIEVE_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        const errorBody = await statusResponse.text();
        if (statusResponse.status === 404) {
          console.warn(`Sieve job ${jobId} not found on Sieve. It might have completed and been removed.`);
          jobStore.set(jobId, { ...jobMetadata!, status: 'job_not_found', fileUrl: undefined, originalUrl: jobMetadata?.originalUrl || '', output_format: jobMetadata?.output_format || '' });
          return NextResponse.json({
            status: 'job_not_found',
            fileUrl: null,
            error: `Job ${jobId} not found on Sieve. ${errorBody}`,
          });
        }
        throw new Error(`Failed to fetch job status from Sieve for ${jobId}: ${statusResponse.statusText}. Body: ${errorBody}`);
      }

      const statusData = await statusResponse.json();
      console.log(`Sieve job ${jobId} status data:`, statusData);

      const jobStatus = statusData.status;

      if (jobStatus === 'finished') {
        let fileUrl = null;
        if (statusData.output && Array.isArray(statusData.output) && statusData.output.length > 0) {
          fileUrl = statusData.output[0];
        } else {
          console.warn(`Sieve job ${jobId} completed but no output URL found. Output: ${JSON.stringify(statusData.output)}`);
        }

        if (fileUrl && fileUrl.startsWith('http')) {
          // Fetch the file from Sieve's output URL
          const fileResponse = await fetch(fileUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file from ${fileUrl}: ${fileResponse.statusText}`);
          }
          const fileBuffer = await fileResponse.arrayBuffer();

          // Generate filename
          const extension = jobMetadata?.output_format || 'mp3';
          const filename = `sieve-download-${jobId}.${extension}`;

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

          // Construct the final file URL
          const r2FileUrl = `https://your-r2-bucket.s3.amazonaws.com/${filename}`;
          jobMetadata = { ...jobMetadata!, status: jobStatus, fileUrl: r2FileUrl, originalUrl: jobMetadata?.originalUrl || '', output_format: jobMetadata?.output_format || '' };
          jobStore.set(jobId, jobMetadata);
        } else {
          // If fileUrl is not valid, treat as error or incomplete
          jobMetadata = { ...jobMetadata!, status: 'error', fileUrl: undefined, originalUrl: jobMetadata?.originalUrl || '', output_format: jobMetadata?.output_format || '' };
          jobStore.set(jobId, jobMetadata);
        }
      } else if (jobStatus === 'error') {
        jobMetadata = { ...jobMetadata!, status: jobStatus, fileUrl: undefined, originalUrl: jobMetadata?.originalUrl || '', output_format: jobMetadata?.output_format || '' };
        jobStore.set(jobId, jobMetadata);
      } else {
        // Update jobMetadata with current Sieve status if still in progress
        jobMetadata = { ...jobMetadata!, status: jobStatus, originalUrl: jobMetadata?.originalUrl || '', output_format: jobMetadata?.output_format || '' };
        jobStore.set(jobId, jobMetadata);
      }
    }

    // 4. Return relevant status information to the frontend
    return NextResponse.json({
      status: jobMetadata?.status,
      fileUrl: jobMetadata?.fileUrl || null,
      error: jobMetadata?.status === 'error' ? jobMetadata?.error || 'Job failed' : null, // Include Sieve's error if job failed
    });

  } catch (error) {
    console.error('Error during Sieve job status check:', error);
    return handleApiError(error, 'Failed to retrieve Sieve job status');
  }
}
