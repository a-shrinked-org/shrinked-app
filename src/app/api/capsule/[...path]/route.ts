// In app/api/capsules/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

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

	// Improved logging - only verbose in development
	if (IS_DEV) {
	  console.log(`[Capsule Proxy] ${method} request for path: ${pathSuffix}`);
	  
	  // Extra logging only for DELETE requests in development
	  if (method === 'DELETE') {
		console.log(`[Capsule Proxy] ${method} request received for raw path: ${request.nextUrl.pathname}`);
		console.log(`[Capsule Proxy] Extracted path segments: ${JSON.stringify(pathSegments)}`);
	  }
	}

	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.log("[Capsule Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	const searchParams = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
	  searchParams.append(key, value);
	});
	const searchParamsString = searchParams.toString();

	const apiUrl = `${API_URL}/capsules/${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	if (IS_DEV) console.log(`[Capsule Proxy] Sending ${method} request to: ${apiUrl}`);

	// Conditionally set headers
	const headers: HeadersInit = {
	  'Authorization': authHeader
	};
	
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  // Only add Content-Type if the incoming request likely has a JSON body
	  const incomingContentType = request.headers.get('content-type');
	  if (incomingContentType && incomingContentType.includes('application/json')) {
		headers['Content-Type'] = 'application/json';
	  }
	}

	const options: RequestInit = {
	  method,
	  headers,
	  credentials: 'omit',
	  keepalive: true
	};

	// Conditionally set body
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  const contentType = request.headers.get('content-type');
	  if (contentType && contentType.includes('application/json')) {
		try {
		  // Use request.text() first to check for empty body
		  const rawBody = await request.text();
		  if (rawBody) {
			options.body = rawBody; // Forward the raw string if not empty
			if (IS_DEV) console.log("[Capsule Proxy] Forwarding JSON body.");
		  } else {
			if (IS_DEV) console.log("[Capsule Proxy] Request has JSON Content-Type but empty body. Sending request without body.");
		  }
		} catch (err) {
		  console.error("[Capsule Proxy] Error reading request body:", err);
		  return NextResponse.json({ error: "Invalid request body provided" }, { status: 400 });
		}
	  } else if (request.body) {
		if (IS_DEV) console.warn(`[Capsule Proxy] Request with method ${method} has a body but Content-Type is not application/json (${contentType}). Body not automatically forwarded.`);
	  }
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

	if (method === 'DELETE' && IS_DEV) {
	  console.log(`[Capsule Proxy] DELETE request details before fetch:
		- Full URL: ${apiUrl}
		- Method: ${options.method}
		- Headers: ${JSON.stringify(options.headers)}
		- Body included: ${!!options.body}
	  `);
	}

	const response = await fetch(apiUrl, {
	  ...options,
	  signal: controller.signal
	});

	clearTimeout(timeoutId);

	const responseTime = Date.now() - startTime;
	if (IS_DEV) console.log(`[Capsule Proxy] API response: status=${response.status}, content-type=${response.headers.get('content-type')}, time=${responseTime}ms`);

	// Handle 204 No Content specifically - Return early
	if (response.status === 204) {
	  if (IS_DEV) console.log("[Capsule Proxy] Received 204 No Content from API.");
	  return new NextResponse(null, { status: 204 });
	}

	// Process the response body based on content type
	const responseContentType = response.headers.get('content-type') || '';
	let responseBodyText = ''; // Read the body once
	try {
	  responseBodyText = await response.text();
	} catch (readError) {
	  console.error(`[Capsule Proxy] Error reading response body:`, readError);
	  // If we can't read the body, return a generic error based on status
	  return NextResponse.json({
		error: "Failed to read response body from upstream API",
		status: response.status
	  }, { status: response.status });
	}

	// Copy response headers to new response
	const responseHeaders = new Headers();
	response.headers.forEach((value, key) => {
	  // Skip content-encoding and transfer-encoding which are managed by NextResponse
	  if (key !== 'content-encoding' && key !== 'transfer-encoding') {
		responseHeaders.set(key, value);
	  }
	});

	if (responseContentType.includes('application/json')) {
	  try {
		const data = JSON.parse(responseBodyText);
		return NextResponse.json(data, { 
		  status: response.status,
		  headers: Object.fromEntries(responseHeaders)
		});
	  } catch (error) {
		console.error(`[Capsule Proxy] Error parsing JSON response:`, error);
		if (IS_DEV) console.error(`[Capsule Proxy] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);
		return NextResponse.json({
		  error: "Failed to parse API response as JSON",
		  status: response.status,
		  rawResponsePreview: IS_DEV ? responseBodyText.substring(0, 500) : undefined
		}, { status: response.status });
	  }
	} else {
	  // Handle non-JSON responses
	  if (IS_DEV) {
		console.warn(`[Capsule Proxy] Non-JSON response received from API: ${responseContentType}`);
		console.warn(`[Capsule Proxy] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);
	  }

	  // Return a structured error
	  return NextResponse.json({
		error: `Unexpected response format from upstream API`,
		message: `Expected JSON but got ${responseContentType}`,
		status: response.status,
		rawResponsePreview: IS_DEV ? responseBodyText.substring(0, 500) : undefined
	  }, { status: response.status });
	}

  } catch (error: unknown) {
	console.error(`[Capsule Proxy] Error in ${method} handler:`, error);

	let status = 500;
	let errorMessage = "Unknown error occurred in the proxy.";

	if (error instanceof Error) {
	  errorMessage = error.message;
	  if (error.name === 'AbortError') {
		status = 504; // Gateway Timeout
		errorMessage = "The upstream API request timed out.";
	  } else if (error instanceof TypeError && error.message.includes('fetch failed')) {
		status = 502; // Bad Gateway
		errorMessage = "Failed to connect to the upstream API.";
	  }
	  // Catch JSON parsing errors for the *request* body specifically
	  else if (error instanceof SyntaxError && errorMessage.includes('JSON')) {
		status = 400; // Bad Request
		errorMessage = "Invalid JSON format in the request body.";
	  }
	}

	return NextResponse.json({
	  error: "Proxy failed to process request",
	  message: errorMessage
	}, { status });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] }}) {
  return handleRequest(request, { params }, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] }}) {
  return handleRequest(request, { params }, 'POST');
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] }}) {
  return handleRequest(request, { params }, 'PATCH');
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] }}) {
  return handleRequest(request, { params }, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] }}) {
  return handleRequest(request, { params }, 'DELETE');
}