// In app/api/admin/[[...path]]/route.ts
import { NextRequest, NextResponse } from "next/server";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } },
  method: string
) {
  try {
	const startTime = Date.now();
	const pathSegments = params.path || [];
	const pathSuffix = pathSegments.join('/');

	if (IS_DEV) {
	  console.log(`[Admin Proxy] ${method} request for path: ${pathSuffix}`);
	}

	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.log("[Admin Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	const searchParams = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
	  searchParams.append(key, value);
	});
	const searchParamsString = searchParams.toString();

	// Special case handling for prompts upsert
	const isPromptsUpsert = pathSuffix === 'prompts/upsert';
	if (isPromptsUpsert && (method === 'POST' || method === 'PATCH')) {
	  if (IS_DEV) console.log("[Admin Proxy] Detected prompts upsert request, performing validation");
	  
	  // Parse and validate request body for prompts
	  let body;
	  try {
		// Clone the request to read the body
		const clonedRequest = request.clone();
		body = await clonedRequest.json();
	  } catch (error) {
		if (IS_DEV) console.error("[Admin Proxy] Failed to parse request body as JSON:", error);
		return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
	  }
	  
	  // Check if we received an array of prompts or a single prompt
	  const promptsArray = body.prompts; // Expecting an object with a 'prompts' key

	  if (!Array.isArray(promptsArray)) {
		if (IS_DEV) console.error("[Admin Proxy] Invalid prompts format: expected an array under 'prompts' key", body);
		return NextResponse.json({ error: "Invalid prompts format: expected an array under 'prompts' key" }, { status: 400 });
	  }
	  
	  // Process each prompt in the array
	  const standardizedPrompts = [];
	  
	  for (const promptData of promptsArray) {
		// Validate required fields for each prompt
		if (!promptData.section || typeof promptData.section !== 'string') {
		  if (IS_DEV) console.error("[Admin Proxy] Missing or invalid section field", promptData);
		  return NextResponse.json({ 
			error: "section field is required and must be a string",
			details: "Invalid prompt at index " + standardizedPrompts.length
		  }, { status: 400 });
		}
		
		if (!promptData.prompt || typeof promptData.prompt !== 'string') {
		  if (IS_DEV) console.error("[Admin Proxy] Missing or invalid prompt field", promptData);
		  return NextResponse.json({ 
			error: "prompt field is required and must be a string",
			details: "Invalid prompt at index " + standardizedPrompts.length
		  }, { status: 400 });
		}
		
		// Ensure prefill is always a string if provided
		if (promptData.prefill !== undefined && typeof promptData.prefill !== 'string') {
		  if (IS_DEV) console.error("[Admin Proxy] Invalid prefill field", promptData);
		  return NextResponse.json({ 
			error: "prefill field must be a string when provided",
			details: "Invalid prompt at index " + standardizedPrompts.length
		  }, { status: 400 });
		}
		
		// Standardize each prompt object
		standardizedPrompts.push({
		  section: promptData.section,
		  prompt: promptData.prompt,
		  prefill: promptData.prefill || "" // Default to empty string if not provided
		});
	  }
	  
	  if (IS_DEV) console.log(`[Admin Proxy] Standardized ${standardizedPrompts.length} prompts`);
	  
	  // Always maintain the { prompts: [...] } structure that the API expects
	  const requestBody = { prompts: standardizedPrompts };
	  
	  // Convert to JSON for the fetch call
	  const jsonBody = JSON.stringify(requestBody);
	  
	  if (IS_DEV) {
		console.log(`[Admin Proxy] Prepared ${standardizedPrompts.length} standardized prompts for forwarding`);
		console.log("[Admin Proxy] Request body structure:", requestBody);
	  }
	  
	  const apiUrl = `${API_URL}/admin/${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	  if (IS_DEV) console.log(`[Admin Proxy] Sending ${method} request to: ${apiUrl}`);
	  
	  const headers: HeadersInit = {
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  };
	  
	  const controller = new AbortController();
	  const timeoutId = setTimeout(() => controller.abort(), 60000);
	  
	  const response = await fetch(apiUrl, {
		method,
		headers,
		body: jsonBody,
		signal: controller.signal
	  });
	  
	  clearTimeout(timeoutId);
	  
	  const responseTime = Date.now() - startTime;
	  if (IS_DEV) console.log(`[Admin Proxy] API response: status=${response.status}, time=${responseTime}ms`);
	  
	  if (response.status === 204) {
		if (IS_DEV) console.log("[Admin Proxy] Received 204 No Content from API.");
		return new NextResponse(null, { status: 204 });
	  }
	  
	  const responseContentType = response.headers.get('content-type') || '';
	  let responseBodyText = '';
	  try {
		responseBodyText = await response.text();
	  } catch (readError) {
		console.error(`[Admin Proxy] Error reading response body:`, readError);
		return NextResponse.json({
		  error: "Failed to read response body from upstream API",
		  status: response.status
		}, { status: response.status });
	  }
	  
	  const responseHeaders = new Headers();
	  response.headers.forEach((value, key) => {
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
		  console.error(`[Admin Proxy] Error parsing JSON response:`, error);
		  if (IS_DEV) console.error(`[Admin Proxy] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);
		  return NextResponse.json({
			error: "Failed to parse API response as JSON",
			status: response.status,
			rawResponsePreview: IS_DEV ? responseBodyText.substring(0, 500) : undefined
		  }, { status: response.status });
		}
	  } else {
		if (IS_DEV) {
		  console.warn(`[Admin Proxy] Non-JSON response received: ${responseContentType}`);
		  console.warn(`[Admin Proxy] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);
		}
		
		return NextResponse.json({
		  error: `Unexpected response format from upstream API`,
		  message: `Expected JSON but got ${responseContentType}`,
		  status: response.status,
		  rawResponsePreview: IS_DEV ? responseBodyText.substring(0, 500) : undefined
		}, { status: response.status });
	  }
	}

	// Handle non-prompts upsert requests
	const apiUrl = `${API_URL}/admin/${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	if (IS_DEV) console.log(`[Admin Proxy] Sending ${method} request to: ${apiUrl}`);

	const headers: HeadersInit = {
	  'Authorization': authHeader
	};

	if (['POST', 'PUT', 'PATCH'].includes(method)) {
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

	if (['POST', 'PUT', 'PATCH'].includes(method)) {
	  const contentType = request.headers.get('content-type');
	  if (contentType && contentType.includes('application/json')) {
		try {
		  // Clone the request to read the body
		  const clonedRequest = request.clone();
		  const rawBody = await clonedRequest.text();
		  if (rawBody) {
			options.body = rawBody;
			if (IS_DEV) console.log("[Admin Proxy] Forwarding JSON body.");
		  } else {
			if (IS_DEV) console.log("[Admin Proxy] Request has JSON Content-Type but empty body.");
		  }
		} catch (err) {
		  console.error("[Admin Proxy] Error reading request body:", err);
		  return NextResponse.json({ error: "Invalid request body provided" }, { status: 400 });
		}
	  }
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 60000);

	const response = await fetch(apiUrl, {
	  ...options,
	  signal: controller.signal
	});

	clearTimeout(timeoutId);

	const responseTime = Date.now() - startTime;
	if (IS_DEV) console.log(`[Admin Proxy] API response: status=${response.status}, time=${responseTime}ms`);

	if (response.status === 204) {
	  if (IS_DEV) console.log("[Admin Proxy] Received 204 No Content from API.");
	  return new NextResponse(null, { status: 204 });
	}

	const responseContentType = response.headers.get('content-type') || '';
	let responseBodyText = '';
	try {
	  responseBodyText = await response.text();
	} catch (readError) {
	  console.error(`[Admin Proxy] Error reading response body:`, readError);
	  return NextResponse.json({
		error: "Failed to read response body from upstream API",
		status: response.status
	  }, { status: response.status });
	}

	const responseHeaders = new Headers();
	response.headers.forEach((value, key) => {
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
		console.error(`[Admin Proxy] Error parsing JSON response:`, error);
		if (IS_DEV) console.error(`[Admin Proxy] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);
		return NextResponse.json({
		  error: "Failed to parse API response as JSON",
		  status: response.status,
		  rawResponsePreview: IS_DEV ? responseBodyText.substring(0, 500) : undefined
		}, { status: response.status });
	  }
	} else {
	  if (IS_DEV) {
		console.warn(`[Admin Proxy] Non-JSON response received: ${responseContentType}`);
		console.warn(`[Admin Proxy] Raw text response (preview): ${responseBodyText.substring(0, 500)}`);
	  }

	  return NextResponse.json({
		error: `Unexpected response format from upstream API`,
		message: `Expected JSON but got ${responseContentType}`,
		status: response.status,
		rawResponsePreview: IS_DEV ? responseBodyText.substring(0, 500) : undefined
	  }, { status: response.status });
	}

  } catch (error: unknown) {
	console.error(`[Admin Proxy] Error in ${method} handler:`, error);

	let status = 500;
	let errorMessage = "Unknown error occurred in the proxy.";

	if (error instanceof Error) {
	  errorMessage = error.message;
	  if (error.name === 'AbortError') {
		status = 504;
		errorMessage = "The upstream API request timed out.";
	  } else if (error instanceof TypeError && error.message.includes('fetch failed')) {
		status = 502;
		errorMessage = "Failed to connect to the upstream API.";
	  } else if (error instanceof SyntaxError && errorMessage.includes('JSON')) {
		status = 400;
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