// /api/admin/[...path]/route.ts
import { NextRequest } from 'next/server';

export async function PATCH(req: NextRequest, context: { params: { path: string[] } }) {
  const { path } = context.params;

  if (path[0] === 'prompts' && path[1] === 'upsert') {
	try {
	  const { prompts } = await req.json();

	  if (!Array.isArray(prompts) || prompts.length === 0) {
		return new Response(JSON.stringify({ error: 'Invalid or empty prompts array' }), {
		  status: 400,
		  headers: { 'Content-Type': 'application/json' },
		});
	  }

	  // Replace this with actual DB write logic
	  console.log('Upserting prompts:', prompts);

	  return new Response(JSON.stringify({ message: 'Prompts upserted successfully' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	  });
	} catch (err: any) {
	  console.error('Error processing upsert request:', err);
	  return new Response(JSON.stringify({ error: 'Server error while processing prompts' }), {
		status: 500,
		headers: { 'Content-Type': 'application/json' },
	  });
	}
  }

  return new Response('Not Found', { status: 404 });
}

export async function GET(req: NextRequest, context: { params: { path: string[] } }) {
  const { path } = context.params;

  if (path[0] === 'prompts') {
	const capsuleId = req.nextUrl.searchParams.get('capsuleId');

	if (!capsuleId) {
	  return new Response(JSON.stringify({ error: 'Missing capsuleId' }), {
		status: 400,
		headers: { 'Content-Type': 'application/json' },
	  });
	}

	// Replace with real fetch logic
	const prompts = [
	  { section: 'capsule.summary', prompt: 'Default summary prompt' },
	  { section: 'capsule.highlights', prompt: 'Default highlights prompt' },
	  { section: 'capsule.testSummary', prompt: 'Default test summary prompt' },
	];

	return new Response(JSON.stringify(prompts), {
	  status: 200,
	  headers: { 'Content-Type': 'application/json' },
	});
  }

  return new Response('Not Found', { status: 404 });
}
