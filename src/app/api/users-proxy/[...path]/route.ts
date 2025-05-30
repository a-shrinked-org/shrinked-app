// src/app/api/users-proxy/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const startTime = Date.now();
  const pathSegments = params.path || [];
  const targetPath = pathSegments.join('/');
  
  if (IS_DEV) console.log(`[Users Proxy] ${request.method} /${targetPath}`);
  
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.error(`[Users Proxy] Missing authorization header`);
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	// Construct the target URL
	const apiUrl = `${API_URL}/users/${targetPath}`;
	
	// Get URL search parameters from the request
	const url = new URL(request.url);
	const searchParams = url.searchParams;
	const targetUrlWithParams = searchParams.toString() 
	  ? `${apiUrl}?${searchParams.toString()}`
	  : apiUrl;
	
	if (IS_DEV) console.log(`[Users Proxy] Sending request to: ${targetUrlWithParams}`);
	
	// Prepare headers
	const headers: HeadersInit = {
	  'Authorization': authHeader,
	  'Cache-Control': 'no-cache, no-store, must-revalidate',
	  'Pragma': 'no-cache',
	  'Expires': '0'
	};
	
	// Get request body if it exists
	let body = null;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
	  body = await request.text();
	  if (body && request.headers.get('content-type')) {
		headers['Content-Type'] = request.headers.get('content-type')!;
	  }
	}
	
	// Make the API request
	const response = await fetch(targetUrlWithParams, {
	  method: request.method,
	  headers: headers,
	  body: body,
	  cache: 'no-store'
	});
	
	const responseTime = Date.now() - startTime;
	if (IS_DEV) console.log(`[Users Proxy] Backend response: status=${response.status}, time=${responseTime}ms`);
	
	const contentType = response.headers.get('content-type');
	
	if (contentType && contentType.includes('application/json')) {
	  const data = await response.json();
	  return NextResponse.json(data, { status: response.status });
	} else {
	  const text = await response.text();
	  if (IS_DEV) console.error(`[Users Proxy] Unexpected response format: ${contentType}`);
	  return NextResponse.json({ 
		error: "Unexpected response format", 
		details: text.substring(0, 200) 
	  }, { status: 500 });
	}
	
  } catch (error) {
	const responseTime = Date.now() - startTime;
	console.error(`[Users Proxy] Error (${responseTime}ms):`, error);
	return NextResponse.json({
	  error: "Failed to process request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
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