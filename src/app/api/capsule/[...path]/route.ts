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

	// Add more detailed logging for DELETE requests hitting this specific handler
	if (method === 'DELETE') {
		console.log(`[Capsule Proxy - CATCH ALL] ${method} request received for raw path: ${request.nextUrl.pathname}`);
		console.log(`[Capsule Proxy - CATCH ALL] Extracted path segments: ${JSON.stringify(pathSegments)}`);
		console.log(`[Capsule Proxy - CATCH ALL] Path suffix to append: ${pathSuffix}`);
	} else {
		console.log(`[Capsule Proxy - CATCH ALL] ${method} request for path: ${pathSuffix}`);
	}

	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.log("[Capsule Proxy - CATCH ALL] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	const searchParams = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
	  searchParams.append(key, value);
	});
	const searchParamsString = searchParams.toString();

	const apiUrl = `${API_URL}/capsules/${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	console.log(`[Capsule Proxy - CATCH ALL] Sending ${method} request to: ${apiUrl}`);

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
	  keepalive: true // Consider if keepalive is truly needed here
	};

	// Conditionally set body
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  const contentType = request.headers.get('content-type');
	  if (contentType && contentType.includes('application/json')) {
		  try {
			// IMPORTANT: Use request.text() first to check for empty body,
			// as request.json() throws error on empty body even with correct header.
			const rawBody = await request.text();
			if (rawBody) {
			  options.body = rawBody; // Forward the raw string if not empty
			  console.log("[Capsule Proxy - CATCH ALL] Forwarding JSON body.");
			} else {
			  console.log("[Capsule Proxy - CATCH ALL] Request has JSON Content-Type but empty body. Sending request without body.");
			}
		  } catch (err) {
			console.error("[Capsule Proxy - CATCH ALL] Error reading request body:", err);
			// Decide if you want to error out or proceed without body
			 return NextResponse.json({ error: "Invalid request body provided" }, { status: 400 });
		  }
	  } else if (request.body) {
		 console.warn(`[Capsule Proxy - CATCH ALL] Request with method ${method} has a body but Content-Type is not application/json (${contentType}). Body not automatically forwarded.`);
	  }
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

	if (method === 'DELETE') {
	  console.log(`[Capsule Proxy - CATCH ALL] DELETE request details before fetch:
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
	console.log(`[Capsule Proxy - CATCH ALL] API response: status=${response.status}, content-type=${response.headers.get('content-type')}, time=${responseTime}ms`);

	// Handle 204 No Content specifically - Return early
	if (response.status === 204) {
	  console.log("[Capsule Proxy - CATCH ALL] Received 204 No Content from API.");
	  return new NextResponse(null, { status: 204 });
	}

	// Process the response body based on content type
	const responseContentType = response.headers.get('content-type') || '';
	let responseBodyText = ''; // Read the body once
	try {
		responseBodyText = await response.text();
	} catch (readError) {
		console.error(`[Capsule Proxy - CATCH ALL] Error reading response body:`, readError);
		// If we can't read the body, return a generic error based on status
		return NextResponse.json({
			error: "Failed to read response body from upstream API",
			status: response.status
		}, { status: response.status });
	}


	if (responseContentType.includes('application/json')) {
	  try {
		const data = JSON.parse(responseBodyText); // Parse the text we already read
		return NextResponse.json(data, { status: response.status });
	  } catch (error) {
		console.error(`[Capsule Proxy - CATCH ALL] Error parsing JSON response:`, error);
		console.error(`[Capsule Proxy - CATCH ALL] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);
		return NextResponse.json({
		  error: "Failed to parse API response as JSON",
		  status: response.status,
		  rawResponsePreview: responseBodyText.substring(0, 500) // Include raw preview
		}, { status: response.status });
	  }
	} else {
		// Handle non-JSON responses (e.g., plain text, HTML error pages from the API)
		console.warn(`[Capsule Proxy - CATCH ALL] Non-JSON response received from API: ${responseContentType}`);
		console.warn(`[Capsule Proxy - CATCH ALL] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);

		// Return a structured error including the preview
		return NextResponse.json({
		   error: `Unexpected response format from upstream API`,
		   message: `Expected JSON but got ${responseContentType}`,
		   status: response.status,
		   rawResponsePreview: responseBodyText.substring(0, 500)
		 }, { status: response.status });

		// Or, if you want to forward the non-JSON response directly:
		// return new NextResponse(responseBodyText, {
		//   status: response.status,
		//   headers: { 'Content-Type': responseContentType }
		// });
	}

  } catch (error: unknown) {
	console.error(`[Capsule Proxy - CATCH ALL] Error in ${method} handler:`, error);

	let status = 500;
	let errorMessage = "Unknown error occurred in the proxy.";

	if (error instanceof Error) {
	  errorMessage = error.message;
	  if (error.name === 'AbortError') {
		status = 504; // Gateway Timeout
		errorMessage = "The upstream API timed out.";
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