// In app/api/capsules/[...path]/route.ts
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
	const startTime = Date.now();
	const pathSegments = params.path || [];
	const pathSuffix = pathSegments.join('/');
	
	console.log(`[Capsule Proxy] ${method} request for path: ${pathSuffix}`);
	
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.log("[Capsule Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	const url = new URL(request.url);
	const searchParams = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
	  searchParams.append(key, value);
	});
	const searchParamsString = searchParams.toString();
	
	const apiUrl = `${API_URL}/capsules/${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	console.log(`[Capsule Proxy] Sending ${method} request to: ${apiUrl}`);
	
	const options: RequestInit = {
	  method,
	  headers: {
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  keepalive: true 
	};
	
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  try {
		const body = await request.json();
		options.body = JSON.stringify(body);
	  } catch (err) {
		console.error("[Capsule Proxy] Error parsing request body:", err);
		// For empty body requests, continue without body
	  }
	}
	
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
	
	// More detailed logging for DELETE method
	if (method === 'DELETE') {
	  console.log(`[Capsule Proxy] DELETE request details:
		- Full URL: ${apiUrl}
		- Auth header present: ${!!authHeader}
		- Path segments: ${JSON.stringify(pathSegments)}
	  `);
	}
	
	const response = await fetch(apiUrl, {
	  ...options,
	  signal: controller.signal
	});
	
	clearTimeout(timeoutId);
	
	const responseTime = Date.now() - startTime;
	console.log(`[Capsule Proxy] API response: status=${response.status}, content-type=${response.headers.get('content-type')}, time=${responseTime}ms`);
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}
	
	const contentType = response.headers.get('content-type') || '';
	let data;
	
	if (contentType.includes('application/json')) {
	  try {
		data = await response.json();
	  } catch (error) {
		console.error(`[Capsule Proxy] Error parsing JSON response:`, error);
		return NextResponse.json({ 
		  error: "Failed to parse API response",
		  status: response.status
		}, { status: response.status });
	  }
	} else {
	  // For non-JSON responses, try to get text
	  try {
		const textContent = await response.text();
		console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, text preview: ${textContent.substring(0, 100)}`);
		
		return NextResponse.json({ 
		  error: `Unexpected response format`,
		  message: `Expected JSON but got ${contentType}`,
		  status: response.status,
		  textPreview: textContent.substring(0, 200)
		}, { status: response.status });
	  } catch (err) {
		console.error(`[Capsule Proxy] Failed to extract text from response:`, err);
		return NextResponse.json({ 
		  error: `Failed to process response`,
		  status: response.status
		}, { status: response.status });
	  }
	}
	
	return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
	console.error(`[Capsule Proxy] Error in ${method} handler:`, error);
	
	let status = 500;
	let errorMessage = "Unknown error";
	
	if (error instanceof Error) {
	  errorMessage = error.message;
	  if (error.name === 'AbortError') {
		status = 504; // Gateway Timeout
	  }
	}
	
	return NextResponse.json({ 
	  error: "Failed to process request",
	  message: errorMessage
	}, { status });
  }
}

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