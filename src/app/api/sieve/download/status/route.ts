import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase';

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
  try {
    // 1. Get job ID from request query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      console.log('Job ID is missing from request query.');
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    console.log('Received Job ID for status check:', jobId);

    // 2. Fetch job metadata from Supabase
    const supabase = createClient();
    const { data: jobMetadata, error: fetchError } = await supabase
      .from('job_statuses')
      .select('status, file_url, error')
      .eq('job_id', jobId)
      .single();

    if (fetchError || !jobMetadata) {
      console.error('Error fetching job status from Supabase:', fetchError);
      return NextResponse.json(
        { status: 'job_not_found', fileUrl: null, error: `Job ${jobId} not found` },
        { status: 404 }
      );
    }

    // 3. Return relevant status information to the frontend
    return NextResponse.json({
      status: jobMetadata.status,
      fileUrl: jobMetadata.file_url || null,
      error: jobMetadata.status === 'error' ? jobMetadata.error || 'Job failed' : null,
    });

  } catch (error) {
    console.error('Error during Sieve job status check:', error);
    return handleApiError(error, 'Failed to retrieve job status');
  }
}
