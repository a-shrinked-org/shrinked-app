import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/utils/r2-utils';
import { createClient } from '@/utils/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const supabase = createClient();
  try {
    const webhookData = await request.json();
    console.log('Incoming Sieve Webhook Data:', JSON.stringify(webhookData, null, 2)); // Log full webhook data
    const { body, type } = webhookData;
    const { job_id, status, outputs, error: sieveError } = body;
    console.log(`Webhook received for job ${job_id}: ${status} (Type: ${type})`);

    if (status === 'finished' && outputs) {
      const fileUrl = Array.isArray(outputs) ? outputs[0] : outputs.url || outputs;
      if (!fileUrl || !fileUrl.startsWith('http')) {
        throw new Error('No valid file URL in webhook data');
      }

      // Directly use the Sieve output URL
      const finalFileUrl = fileUrl;
      console.log(`Using direct Sieve output URL from webhook: ${finalFileUrl}`);

      // Update job metadata in Supabase
      const { error: updateError } = await supabase
        .from('job_statuses')
        .update({
          status: status,
          file_url: finalFileUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job_id);

      if (updateError) {
        console.error('Error updating job status in Supabase (finished):', JSON.stringify(updateError));
        throw new Error('Failed to update job status in Supabase.');
      }

      return NextResponse.json({ status: 'received' }, { status: 200 });
    } else if (status === 'error') {
      const { error: updateError } = await supabase
        .from('job_statuses')
        .update({
          status: status,
          file_url: null, // Clear file_url on error
          error: webhookData.error || 'Sieve job failed', // Assuming webhookData might contain an error message
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job_id);

      if (updateError) {
        console.error('Error updating job status in Supabase (error):', JSON.stringify(updateError));
        throw new Error('Failed to update job status in Supabase.');
      }
      return NextResponse.json({ status: 'received' }, { status: 200 });
    } else {
      // Update job metadata in Supabase for other statuses
      const { error: updateError } = await supabase
        .from('job_statuses')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job_id);

      if (updateError) {
        console.error('Error updating job status in Supabase (other status):', JSON.stringify(updateError));
        throw new Error('Failed to update job status in Supabase.');
      }
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

    return NextResponse.json({
      status: jobMetadata.status,
      fileUrl: jobMetadata.file_url || null,
      error: jobMetadata.status === 'error' ? jobMetadata.error || 'Job failed' : null,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to retrieve job status');
  }
}
