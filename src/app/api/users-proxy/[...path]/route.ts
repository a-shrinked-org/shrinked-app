// src/app/api/users-proxy/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/utils/authUtils';

async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
	// Get the dynamic path segments
	const pathSegments = params.path || [];
	const targetPath = pathSegments.join('/');
	
	// Construct the target URL
	const targetUrl = `${API_CONFIG.API_URL}/users/${targetPath}`;
	
	// Forward all headers from the original request
	const headers = new Headers();
	request.headers.forEach((value, key) => {
	  // Forward all headers except host and content-length (which will be set automatically)
	  if (!['host', 'content-length'].includes(key.toLowerCase())) {
		headers.set(key, value);
	  }
	});

	// Get request body if it exists
	let body = null;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
	  body = await request.text();
	}

	// Get URL search parameters
	const url = new URL(request.url);
	const searchParams = url.searchParams;
	const targetUrlWithParams = searchParams.toString() 
	  ? `${targetUrl}?${searchParams.toString()}`
	  : targetUrl;

	console.log(`[UsersProxy] ${request.method} ${targetUrlWithParams}`);

	// Make the request to the target API
	const response = await fetch(targetUrlWithParams, {
	  method: request.method,
	  headers: headers,
	  body: body,
	});

	// Get response body
	const responseText = await response.text();
	let responseData;
	
	try {
	  responseData = JSON.parse(responseText);
	} catch {
	  responseData = responseText;
	}

	// Return the response with the same status code and headers
	return new NextResponse(JSON.stringify(responseData), {
	  status: response.status,
	  statusText: response.statusText,
	  headers: {
		'Content-Type': 'application/json',
		// Forward relevant response headers
		...Object.fromEntries(
		  Array.from(response.headers.entries()).filter(([key]) =>
			!['content-length', 'transfer-encoding'].includes(key.toLowerCase())
		  )
		),
	  },
	});

  } catch (error) {
	console.error('[UsersProxy] Error:', error);
	return NextResponse.json(
	  { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
	  { status: 500 }
	);
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return handleRequest(request, context);
}