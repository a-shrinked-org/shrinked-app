import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handle API errors with consistent formatting
 */
function handleApiError(error: any, defaultMessage: string): NextResponse {
  console.error(`API error in sieve/webhook:`, error, error.stack);
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
    console.log('Incoming Sieve Webhook Data:', JSON.stringify(webhookData, null, 2));
    const { body, type } = webhookData;
    const { job_id, status, outputs, error: sieveError } = body;
    console.log(`Webhook received for job ${job_id}: ${status} (Type: ${type})`);

    if (!job_id || !status) {
      console.error('Invalid webhook data: missing job_id or status');
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // Verify job exists in Supabase
    const { data: jobExists, error: fetchError } = await supabase
      .from('job_statuses')
      .select('job_id')
      .eq('job_id', job_id)
      .single();

    if (fetchError || !jobExists) {
      console.error(`Job ${job_id} not found in Supabase:`, JSON.stringify(fetchError));
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Optional: Verify webhook authenticity with a secret token
    const webhookSecret = request.headers.get('X-Sieve-Webhook-Secret');
    if (process.env.SIEVE_WEBHOOK_SECRET && webhookSecret !== process.env.SIEVE_WEBHOOK_SECRET) {
      console.error('Webhook authentication failed: Invalid secret');
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
    }

    if (status === 'finished' && outputs) {
      const fileUrl = Array.isArray(outputs) ? outputs[0]?.url || outputs[0] : outputs.url || outputs;
      if (!fileUrl || !fileUrl.startsWith('http')) {
        throw new Error('No valid file URL in webhook data');
      }

      console.log(`Using Sieve output URL from webhook: ${fileUrl}`);

      const { error: updateError } = await supabase
        .from('job_statuses')
        .update({
          status: status,
          file_url: fileUrl,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job_id);

      if (updateError) {
        console.error('Supabase update error (finished):', JSON.stringify(updateError));
        throw new Error('Failed to update job status in Supabase');
      }

      console.log(`Job ${job_id} updated to finished with file_url: ${fileUrl}`);
      return NextResponse.json({ status: 'received' }, { status: 200 });
    } else if (status === 'error' || status === 'failed') {
      const { error: updateError } = await supabase
        .from('job_statuses')
        .update({
          status: status,
          file_url: null,
          error: sieveError || 'Sieve job failed',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job_id);

      if (updateError) {
        console.error('Supabase update error (error/failed):', JSON.stringify(updateError));
        throw new Error('Failed to update job status in Supabase');
      }

      console.log(`Job ${job_id} updated to ${status} with error: ${sieveError || 'No details provided'}`);
      return NextResponse.json({ status: 'received' }, { status: 200 });
    } else if (['queued', 'started', 'processing', 'cancelled'].includes(status)) {
      const { error: updateError } = await supabase
        .from('job_statuses')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', job_id);

      if (updateError) {
        console.error(`Supabase update error (${status}):`, JSON.stringify(updateError));
        throw new Error('Failed to update job status in Supabase');
      }

      console.log(`Job ${job_id} updated to ${status}`);
      return NextResponse.json({ status: 'received' }, { status: 200 });
    } else {
      console.warn(`Unknown status ${status} for job ${job_id}`);
      return NextResponse.json({ status: 'ignored', message: `Unknown status: ${status}` }, { status: 200 });
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error, error.stack);
    return handleApiError(error, 'Failed to process webhook');
  }
}