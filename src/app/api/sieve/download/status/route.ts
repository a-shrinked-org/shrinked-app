import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error: any, defaultMessage: string): NextResponse {
  console.error(`API error in sieve/download/status:`, error);
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

    // 3. Fetch job status from Sieve API
    console.log(`Fetching status for Sieve job ${jobId}...`);
    const statusResponse = await fetch(`https://mango.sievedata.com/v2/job/${jobId}`, {
      headers: {
        'X-API-Key': SIEVE_API_KEY,
      },
    });

    if (!statusResponse.ok) {
      const errorBody = await statusResponse.text();
      throw new Error(`Failed to fetch job status from Sieve for ${jobId}: ${statusResponse.statusText}. Body: ${errorBody}`);
    }

    const statusData = await statusResponse.json();
    console.log(`Sieve job ${jobId} status data:`, statusData);

    // 4. Return relevant status information to the frontend
    const jobStatus = statusData.status;
    let fileUrl = null;

    if (jobStatus === 'completed') {
      if (statusData.output && Array.isArray(statusData.output) && statusData.output.length > 0) {
        fileUrl = statusData.output[0];
      } else {
        console.warn(`Sieve job ${jobId} completed but no output URL found. Output: ${JSON.stringify(statusData.output)}`);
      }
    }

    return NextResponse.json({
      status: jobStatus,
      fileUrl: fileUrl,
      error: statusData.error || null, // Include Sieve's error if job failed
    });

  } catch (error) {
    console.error('Error during Sieve job status check:', error);
    return handleApiError(error, 'Failed to retrieve Sieve job status');
  }
}
