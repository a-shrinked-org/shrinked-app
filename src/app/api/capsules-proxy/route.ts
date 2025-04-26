// In app/api/capsules-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// Helper function to figure out the specific capsule ID or path suffix
// Needed because this route doesn't use [...path] dynamic segments
function extractPathInfo(url: URL): string {
  const path = url.pathname;
  // console.log("[Capsule Proxy - SINGLE] Original path:", path); // Use different log prefix

  // Remove the base path '/api/capsules-proxy'
  let relativePath = path.replace(/^\/api\/capsules-proxy/, '');

  // Check if an 'id' parameter exists in the query string
  const idParam = url.searchParams.get('id');
  if (idParam) {
	// console.log("[Capsule Proxy - SINGLE] ID found in query param:", idParam);
	// NOTE: This assumes if ID is in query, it's just the ID, no further path. Adjust if needed.
	return `/${idParam}`;
  }

  // If there's no relative path after removing the base, it's the root request
  if (!relativePath || relativePath === '/') {
	// console.log("[Capsule Proxy - SINGLE] No path suffix, returning empty string");
	return ''; // Represents the base /capsules endpoint
  }

  // Handle potential /key/ segment added by some libraries
  if (relativePath.includes('/key/')) {
	const originalPath = relativePath;
	relativePath = relativePath.replace(/\/key\//, '/');
	// console.log(`[Capsule Proxy - SINGLE] Removed 'key/' from path: ${originalPath} -> ${relativePath}`);
  }

  // Check if the remaining path starts with a likely ID (e.g., /<id>/files)
  // This regex might need adjustment based on your actual ID format and paths
  const idRegex = /^\/([0-9a-fA-F]{24})(\/.*)?$/; // Example for MongoDB ObjectId
  const match = relativePath.match(idRegex);
  if (match) {
	 // console.log(`[Capsule Proxy - SINGLE] Extracted ID-based path: ${relativePath}`);
	 return relativePath; // Return the full path starting with the ID
  }


  // If it doesn't match an ID pattern, return the remaining path as is
  // This might be for endpoints like /capsules/search if called via this proxy
  // console.log("[Capsule Proxy - SINGLE] Final processed path:", relativePath);
  return relativePath;
}

// --- GET Handler ---
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[Capsule Proxy - SINGLE] Received GET request");
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.error("[Capsule Proxy - SINGLE] Missing authorization header for GET");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url); // Get '/<id>' or '' or '/<id>/regenerate' etc.

	// Rebuild query params excluding 'id' if it was used by extractPathInfo
	const queryParams = new URLSearchParams();
	let idUsedInPath = false;
	if (url.searchParams.has('id') && pathSuffix.includes(url.searchParams.get('id')!)) {
		 idUsedInPath = true;
	}
	url.searchParams.forEach((value, key) => {
	  if (key !== 'id' || !idUsedInPath) { // Keep 'id' if it wasn't used to build pathSuffix
		queryParams.append(key, value);
	  }
	});
	const searchParamsString = queryParams.toString();

	const apiUrl = `${API_URL}/capsules${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	console.log(`[Capsule Proxy - SINGLE] Sending GET request to backend: ${apiUrl}`);

	const response = await fetch(apiUrl, {
	  method: "GET",
	  headers: {
		'Authorization': authHeader,
		// >>>>> BUG/ISSUE: Content-Type should generally NOT be sent on GET <<<<<
		// 'Content-Type': 'application/json' // This was likely here in the buggy version
	  },
	  credentials: 'omit',
	});

	const responseTime = Date.now() - startTime;
	console.log(`[Capsule Proxy - SINGLE] Backend GET response: status=${response.status}, time=${responseTime}ms`);

	// Handle response body processing (similar to the other file)
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}
	const responseContentType = response.headers.get('content-type') || '';
	const responseBodyText = await response.text(); // Read body once

	if (responseContentType.includes('application/json')) {
	  try {
		const data = JSON.parse(responseBodyText);
		return NextResponse.json(data, { status: response.status });
	  } catch (error) {
		console.error(`[Capsule Proxy - SINGLE] Error parsing JSON response for GET:`, error);
		return NextResponse.json({ error: "Failed to parse API JSON response", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	  }
	} else {
	  console.warn(`[Capsule Proxy - SINGLE] Non-JSON response for GET: ${responseContentType}`);
	  return NextResponse.json({ error: "Unexpected response format from API", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	}

  } catch (error: unknown) {
	const responseTime = Date.now() - startTime;
	console.error("[Capsule Proxy - SINGLE] Error in GET handler:", error, `Time: ${responseTime}ms`);
	return NextResponse.json({
	  error: "Proxy failed to process GET request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}

// --- POST Handler ---
export async function POST(request: NextRequest) {
   const startTime = Date.now();
   console.log("[Capsule Proxy - SINGLE] Received POST request");
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.error("[Capsule Proxy - SINGLE] Missing authorization header for POST");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	// For POST, usually target the base or a specific resource's sub-path (e.g., /id/files)
	const pathSuffix = extractPathInfo(url);

	let requestBody;
	let rawBody = "";
	try {
		rawBody = await request.text();
		if (rawBody) {
			requestBody = JSON.parse(rawBody); // Parse only if body is not empty
		} else {
			requestBody = {}; // Default to empty object for empty body
		}
	} catch (err) {
		console.error("[Capsule Proxy - SINGLE] Error parsing POST request body:", err);
		return NextResponse.json({ error: "Invalid JSON body provided" }, { status: 400 });
	}

	const apiUrl = `${API_URL}/capsules${pathSuffix}`; // Usually POST to base or sub-resource
	console.log(`[Capsule Proxy - SINGLE] Sending POST request to backend: ${apiUrl}`);

	const response = await fetch(apiUrl, {
	  method: "POST",
	  headers: {
		'Authorization': authHeader,
		'Content-Type': 'application/json' // Correct for POST with body
	  },
	  credentials: 'omit',
	  body: rawBody || undefined // Send rawBody if exists, otherwise undefined
	});

	const responseTime = Date.now() - startTime;
	console.log(`[Capsule Proxy - SINGLE] Backend POST response: status=${response.status}, time=${responseTime}ms`);

	// Handle response body processing
	if (response.status === 204) {
		return new NextResponse(null, { status: 204 });
	}
	// ... (response handling similar to GET) ...
	const responseContentType = response.headers.get('content-type') || '';
	const responseBodyText = await response.text();

	if (responseContentType.includes('application/json')) {
	  try {
		const data = JSON.parse(responseBodyText);
		return NextResponse.json(data, { status: response.status });
	  } catch (error) {
		console.error(`[Capsule Proxy - SINGLE] Error parsing JSON response for POST:`, error);
		return NextResponse.json({ error: "Failed to parse API JSON response", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	  }
	} else {
	   console.warn(`[Capsule Proxy - SINGLE] Non-JSON response for POST: ${responseContentType}`);
	  return NextResponse.json({ error: "Unexpected response format from API", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	}

  } catch (error: unknown) {
	 const responseTime = Date.now() - startTime;
	console.error("[Capsule Proxy - SINGLE] Error in POST handler:", error, `Time: ${responseTime}ms`);
	return NextResponse.json({
	  error: "Proxy failed to process POST request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}

// --- PATCH Handler ---
export async function PATCH(request: NextRequest) {
   const startTime = Date.now();
   console.log("[Capsule Proxy - SINGLE] Received PATCH request");
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.error("[Capsule Proxy - SINGLE] Missing authorization header for PATCH");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	// PATCH usually targets a specific resource ID
	const pathSuffix = extractPathInfo(url);
	if (!pathSuffix || pathSuffix === '/') {
		 console.error("[Capsule Proxy - SINGLE] PATCH request missing resource ID in path.");
		 return NextResponse.json({ error: "Resource ID required for PATCH" }, { status: 400 });
	}

	let requestBody;
	let rawBody = "";
	 try {
		rawBody = await request.text();
		if (!rawBody) {
			 console.error("[Capsule Proxy - SINGLE] PATCH request body is empty.");
			 return NextResponse.json({ error: "Request body required for PATCH" }, { status: 400 });
		}
		requestBody = JSON.parse(rawBody);
	} catch (err) {
		console.error("[Capsule Proxy - SINGLE] Error parsing PATCH request body:", err);
		return NextResponse.json({ error: "Invalid JSON body provided" }, { status: 400 });
	}


	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	console.log(`[Capsule Proxy - SINGLE] Sending PATCH request to backend: ${apiUrl}`);

	const response = await fetch(apiUrl, {
	  method: "PATCH",
	  headers: {
		'Authorization': authHeader,
		'Content-Type': 'application/json' // Correct for PATCH with body
	  },
	  credentials: 'omit',
	  body: rawBody
	});

	const responseTime = Date.now() - startTime;
	console.log(`[Capsule Proxy - SINGLE] Backend PATCH response: status=${response.status}, time=${responseTime}ms`);

	// Handle response body processing
	if (response.status === 204) {
		return new NextResponse(null, { status: 204 });
	}
	// ... (response handling similar to GET) ...
	 const responseContentType = response.headers.get('content-type') || '';
	const responseBodyText = await response.text();

	if (responseContentType.includes('application/json')) {
	  try {
		const data = JSON.parse(responseBodyText);
		return NextResponse.json(data, { status: response.status });
	  } catch (error) {
		console.error(`[Capsule Proxy - SINGLE] Error parsing JSON response for PATCH:`, error);
		return NextResponse.json({ error: "Failed to parse API JSON response", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	  }
	} else {
	   console.warn(`[Capsule Proxy - SINGLE] Non-JSON response for PATCH: ${responseContentType}`);
	  return NextResponse.json({ error: "Unexpected response format from API", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	}

  } catch (error: unknown) {
	const responseTime = Date.now() - startTime;
	console.error("[Capsule Proxy - SINGLE] Error in PATCH handler:", error, `Time: ${responseTime}ms`);
	return NextResponse.json({
	  error: "Proxy failed to process PATCH request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}


// --- DELETE Handler ---
export async function DELETE(request: NextRequest) {
   const startTime = Date.now();
   console.log("[Capsule Proxy - SINGLE] Received DELETE request");
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.error("[Capsule Proxy - SINGLE] Missing authorization header for DELETE");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	// DELETE usually targets a specific resource ID or sub-resource
	const pathSuffix = extractPathInfo(url);
	 if (!pathSuffix || pathSuffix === '/') {
		 console.error("[Capsule Proxy - SINGLE] DELETE request missing resource ID in path.");
		 return NextResponse.json({ error: "Resource ID required for DELETE" }, { status: 400 });
	}

	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	console.log(`[Capsule Proxy - SINGLE] Sending DELETE request to backend: ${apiUrl}`);

	const response = await fetch(apiUrl, {
	  method: "DELETE",
	  headers: {
		'Authorization': authHeader,
		 // >>>>> BUG/ISSUE: Content-Type should NOT be sent on DELETE <<<<<
		// 'Content-Type': 'application/json' // This was likely here in the buggy version
	  },
	  credentials: 'omit',
	});

	const responseTime = Date.now() - startTime;
	console.log(`[Capsule Proxy - SINGLE] Backend DELETE response: status=${response.status}, time=${responseTime}ms`);

	// DELETE often returns 204 No Content on success
	if (response.status === 204) {
	  console.log("[Capsule Proxy - SINGLE] Received 204 No Content for DELETE.");
	  return new NextResponse(null, { status: 204 });
	}

	// Handle potential error responses (which might have a body)
	// ... (response handling similar to GET, expecting JSON for errors) ...
	const responseContentType = response.headers.get('content-type') || '';
	const responseBodyText = await response.text();

	if (responseContentType.includes('application/json')) {
	  try {
		const data = JSON.parse(responseBodyText);
		// Even if JSON, if status wasn't 2xx/204, it's likely an error payload
		console.warn(`[Capsule Proxy - SINGLE] Received JSON response for DELETE with status ${response.status}`);
		return NextResponse.json(data, { status: response.status });
	  } catch (error) {
		console.error(`[Capsule Proxy - SINGLE] Error parsing JSON error response for DELETE:`, error);
		return NextResponse.json({ error: "Failed to parse API error response", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	  }
	} else {
	   // Handle unexpected non-204, non-JSON response for DELETE
	   console.warn(`[Capsule Proxy - SINGLE] Non-JSON, non-204 response for DELETE: ${responseContentType}, Status: ${response.status}`);
	  return NextResponse.json({ error: "Unexpected response from API during DELETE", rawResponsePreview: responseBodyText.substring(0,500) }, { status: response.status });
	}

  } catch (error: unknown) {
	 const responseTime = Date.now() - startTime;
	console.error("[Capsule Proxy - SINGLE] Error in DELETE handler:", error, `Time: ${responseTime}ms`);
	return NextResponse.json({
	  error: "Proxy failed to process DELETE request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}