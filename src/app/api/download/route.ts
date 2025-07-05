import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
	// Extract query parameters
	const { searchParams } = new URL(request.url);
	const url = searchParams.get('url');
	const platform = searchParams.get('platform');

	if (!url || !platform) {
	  return NextResponse.json({ error: 'Missing url or platform parameter' }, { status: 400 });
	}

	// Forward request to Python endpoint
	const pythonEndpoint = process.env.VERCEL_URL
	  ? `https://${process.env.VERCEL_URL}/app/api/download/index.py`
	  : 'http://localhost:3000/app/api/download/index.py';
	
	const response = await fetch(`${pythonEndpoint}?url=${encodeURIComponent(url)}&platform=${platform}`, {
	  method: 'GET',
	  headers: {
		'Content-Type': 'application/json',
	  },
	});

	if (!response.ok) {
	  const errorData = await response.json();
	  return NextResponse.json({ error: errorData.detail || 'Failed to download file' }, { status: response.status });
	}

	const fileBlob = await response.blob();
	const contentDisposition = response.headers.get('content-disposition') || `attachment; filename="downloaded-file.mp3"`;
	const contentType = response.headers.get('content-type') || 'audio/mpeg';

	return new NextResponse(fileBlob, {
	  status: 200,
	  headers: {
		'Content-Type': contentType,
		'Content-Disposition': contentDisposition,
	  },
	});
  } catch (error) {
	console.error('Proxy error:', error);
	return NextResponse.json(
	  { error: 'Failed to proxy download request', details: error instanceof Error ? error.message : 'Unknown error' },
	  { status: 500 }
	);
  }
}