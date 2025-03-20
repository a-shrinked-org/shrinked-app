// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
	// Reconstruct the path
	const path = pathSegments.join('/');
	
	// Create the full URL
	const url = `${API_URL}/${path}`;
	
	// Extract request content
	const contentType = request.headers.get('content-type') || 'application/json';
	const authHeader = request.headers.get('authorization');
	
	// Prepare headers
	const headers: Record<string, string> = {
	  'Content-Type': contentType,
	};
	
	// Forward authorization if present
	if (authHeader) {
	  headers['Authorization'] = authHeader;
	}
	
	// Options for the forwarded request
	const options: RequestInit = {
	  method,
	  headers,
	  credentials: 'omit',
	};
	
	// Add body for non-GET requests
	if (method !== 'GET' && method !== 'HEAD') {
	  if (contentType.includes('application/json')) {
		const body = await request.json().catch(() => ({}));
		options.body = JSON.stringify(body);
	  } else {
		const body = await request.text().catch(() => '');
		options.body = body;
	  }
	}
	
	// Forward the request
	const response = await fetch(url, options);
	
	// Get response data
	const responseData = contentType.includes('application/json')
	  ? await response.json().catch(() => ({}))
	  : await response.text().catch(() => '');
	
	// Create the response
	const formatResponse = contentType.includes('application/json')
	  ? NextResponse.json(responseData, { status: response.status })
	  : new NextResponse(responseData as string, { status: response.status });
	
	// Add cache control headers
	formatResponse.headers.set('Cache-Control', 'no-store, max-age=0');
	
	return formatResponse;
  } catch (error) {
	console.error(`Error in API proxy for ${pathSegments.join('/')}:`, error);
	return NextResponse.json(
	  { error: 'Failed to proxy request to API' },
	  { status: 500 }
	);
  }
}