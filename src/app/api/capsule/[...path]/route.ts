// app/api/capsule/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

/**
 * Universal capsule proxy handler that forwards all requests to the API
 * Uses Next.js catch-all route parameter to handle any path structure
 */
async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } },
  method: string
) {
  try {
	// Get path segments and join them
	const pathSegments = params.path || [];
	const pathSuffix = pathSegments.join('/');
	
	console.log(`[Capsule Proxy] ${method} request for path: ${pathSuffix}`);
	
	// Check for authorization
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.log("[Capsule Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	// Get query parameters
	const url = new URL(request.url);
	const searchParams = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
	  searchParams.append(key, value);
	});
	const searchParamsString = searchParams.toString();
	
	// Construct API URL
	const apiUrl = `${API_URL}/capsules/${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	console.log(`[Capsule Proxy] Sending ${method} request to: ${apiUrl}`);
	
	// Prepare request options
	const options: RequestInit = {
	  method,
	  headers: {
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	};
	
	// Add body for methods that support it
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  const body = await request.json().catch(err => {
		console.error("[Capsule Proxy] Error parsing request body:", err);
		return {};
	  });
	  options.body = JSON.stringify(body);
	}
	
	// Make request to API
	const response = await fetch(apiUrl, options);
	console.log(`[Capsule Proxy] API response: status=${response.status}`);
	
	// Handle 204 No Content response
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}
	
	// Process response
	const contentType = response.headers.get('content-type') || '';
	let data;
	
	if (contentType.includes('application/json')) {
	  data = await response.json().catch(error => {
		console.error(`[Capsule Proxy] Error parsing JSON response:`, error);
		return { 
		  error: "Failed to parse API response",
		  status: response.status
		};
	  });
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}`);
	  data = { 
		error: `Unexpected response format`,
		message: `Expected JSON but got ${contentType}`,
		status: response.status 
	  };
	}
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error(`[Capsule Proxy] Error in ${method} handler:`, error);
	return NextResponse.json({ 
	  error: "Failed to process request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}

// Handler methods for different HTTP verbs
export async function GET(request: NextRequest, params: { params: { path: string[] }}) {
  return handleRequest(request, params, 'GET');
}

export async function POST(request: NextRequest, params: { params: { path: string[] }}) {
  return handleRequest(request, params, 'POST');
}

export async function PATCH(request: NextRequest, params: { params: { path: string[] }}) {
  return handleRequest(request, params, 'PATCH');
}

export async function PUT(request: NextRequest, params: { params: { path: string[] }}) {
  return handleRequest(request, params, 'PUT');
}

export async function DELETE(request: NextRequest, params: { params: { path: string[] }}) {
  return handleRequest(request, params, 'DELETE');
}