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

	// --- Start of Fix ---
	// Only add Content-Type for requests that typically have a body
	const headers: HeadersInit = {
	  'Authorization': authHeader
	};

	// Only add Content-Type for methods that usually have a body
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  headers['Content-Type'] = 'application/json';
	}

	const options: RequestInit = {
	  method,
	  headers, // Use the conditionally built headers object
	  credentials: 'omit',
	  keepalive: true
	};

	// Add body only for methods that should have one and if the request has a body
	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  // Check if the request has a body before trying to parse it
	  const contentType = request.headers.get('content-type');
	  if (contentType && contentType.includes('application/json')) {
		  try {
			const body = await request.json();
			options.body = JSON.stringify(body);
		  } catch (err) {
			// Handle cases where json parsing fails despite content-type header
			console.error("[Capsule Proxy] Error parsing request JSON body:", err);
			// Allow requests with potentially empty or malformed JSON bodies to proceed if needed
			// Or return an error response:
			// return NextResponse.json({ error: "Invalid JSON body provided" }, { status: 400 });
		  }
	  } else if (request.body) {
		 // Handle non-JSON bodies if necessary, or log a warning
		 console.warn(`[Capsule Proxy] Request with method ${method} has a body but Content-Type is not application/json (${contentType}). Body not automatically forwarded.`);
		 // If you need to forward non-JSON bodies, you'd handle request.blob() or request.text() here.
	  }
	  // If there's no body or non-JSON content type, options.body remains undefined, which is fine for fetch.
	}
	// --- End of Fix ---


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

	const responseContentType = response.headers.get('content-type') || '';
	let data;

	if (responseContentType.includes('application/json')) {
	  try {
		data = await response.json();
	  } catch (error) {
		console.error(`[Capsule Proxy] Error parsing JSON response:`, error);
		// Try to get text even if JSON parsing fails, for better debugging
		let textPreview = "Could not read response text.";
		try {
		  const textContent = await response.text(); // Need to clone or re-fetch if you already tried .json() - fetch body is one-time use
		  textPreview = textContent.substring(0, 200);
		} catch (textErr) {
			 console.error(`[Capsule Proxy] Failed to extract text after JSON parse failure:`, textErr);
		}
		return NextResponse.json({
		  error: "Failed to parse API response as JSON",
		  status: response.status,
		  textPreview: textPreview
		}, { status: response.status });
	  }
	} else {
	  // For non-JSON responses, try to get text
	  try {
		const textContent = await response.text();
		console.warn(`[Capsule Proxy] Non-JSON response: ${responseContentType}, text preview: ${textContent.substring(0, 100)}`);

		// Return the text content directly or structured error
		// Option 1: Return text directly (if that's acceptable)
		// return new NextResponse(textContent, { status: response.status, headers: { 'Content-Type': responseContentType } });

		// Option 2: Return structured error (as before)
		 return NextResponse.json({
		   error: `Unexpected response format`,
		   message: `Expected JSON but got ${responseContentType}`,
		   status: response.status,
		   textPreview: textContent.substring(0, 200)
		 }, { status: response.status });
	  } catch (err) {
		console.error(`[Capsule Proxy] Failed to extract text from non-JSON response:`, err);
		return NextResponse.json({
		  error: `Failed to process non-JSON response`,
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
		errorMessage = "The upstream API timed out."
	  }
	   // Add check for FetchError or TypeError if fetch itself failed (e.g., DNS resolution, network issue)
	  else if (error instanceof TypeError && error.message.includes('fetch failed')) {
		 status = 502; // Bad Gateway
		 errorMessage = "Failed to connect to the upstream API.";
	  }
	}


	return NextResponse.json({
	  error: "Failed to process request",
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