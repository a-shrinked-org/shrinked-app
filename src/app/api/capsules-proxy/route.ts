import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// Function to extract the capsule ID and additional path from the URL
function extractPathInfo(url: URL) {
  const path = url.pathname;
  console.log("[Capsule Proxy] Original path:", path); // Debug
  
  // Remove '/api/capsules-proxy' from the beginning
  let relativePath = path.replace(/^\/api\/capsules-proxy/, '');
  
  // If there's no additional path, return empty string
  if (!relativePath || relativePath === '/') {
	console.log("[Capsule Proxy] No path suffix, returning empty string");
	return '';
  }
  
  // Fix for the incorrect "key/" pattern - this is coming from the data provider
  if (relativePath.includes('/key/')) {
	const beforeChange = relativePath;
	relativePath = relativePath.replace(/\/key\//, '/');
	console.log(`[Capsule Proxy] Removed 'key/' from path: ${beforeChange} -> ${relativePath}`);
  }
  
  console.log("[Capsule Proxy] Final processed path:", relativePath);
  return relativePath;
}

// Handle GET requests
export async function GET(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.log("[Capsule Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	// Add any query parameters
	const searchParams = url.searchParams.toString();
	const apiUrl = `${API_URL}/capsules${pathSuffix}${searchParams ? `?${searchParams}` : ''}`;
	
	console.log(`[Capsule Proxy] Sending GET request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: "GET",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	});

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`);
	
	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	
	if (contentType.includes('application/json')) {
	  data = await response.json();
	  console.log(`[Capsule Proxy] Received JSON data with keys: ${Object.keys(data).join(', ')}`);
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  
	  // For 404 errors, create a structured error response
	  if (response.status === 404) {
		data = { 
		  error: "Capsule not found",
		  message: "The requested capsule could not be found",
		  status: 404
		};
	  } else {
		// For other non-JSON responses
		data = { 
		  error: `Unexpected response format`,
		  message: `Expected JSON but got ${contentType}`,
		  status: response.status 
		};
	  }
	}
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in GET:", error);
	return NextResponse.json({ 
	  error: "Failed to process capsule request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}

// Handle POST requests
export async function POST(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.log("[Capsule Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	// Get the request body
	const body = await request.json().catch((err) => {
	  console.error("[Capsule Proxy] Error parsing request body:", err);
	  return {};
	});
	
	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	
	console.log(`[Capsule Proxy] Sending POST request to: ${apiUrl}`, body);
	
	const response = await fetch(apiUrl, {
	  method: "POST",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  body: JSON.stringify(body)
	});

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`);
	
	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	
	if (contentType.includes('application/json')) {
	  data = await response.json();
	  console.log(`[Capsule Proxy] Received JSON data with keys: ${Object.keys(data).join(', ')}`);
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  
	  // For non-JSON responses
	  data = { 
		error: `Unexpected response format`,
		message: `Expected JSON but got ${contentType}`,
		status: response.status 
	  };
	}
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in POST:", error);
	return NextResponse.json({ 
	  error: "Failed to process capsule request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}

// Handle PATCH requests
export async function PATCH(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.log("[Capsule Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	// Get the request body
	const body = await request.json().catch((err) => {
	  console.error("[Capsule Proxy] Error parsing request body:", err);
	  return {};
	});
	
	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	
	console.log(`[Capsule Proxy] Sending PATCH request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: "PATCH",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  body: JSON.stringify(body)
	});

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`);
	
	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	
	if (contentType.includes('application/json')) {
	  data = await response.json();
	  console.log(`[Capsule Proxy] Received JSON data with keys: ${Object.keys(data).join(', ')}`);
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  
	  // For non-JSON responses
	  data = { 
		error: `Unexpected response format`,
		message: `Expected JSON but got ${contentType}`,
		status: response.status 
	  };
	}
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in PATCH:", error);
	return NextResponse.json({ 
	  error: "Failed to process capsule request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}

// Handle DELETE requests
export async function DELETE(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  console.log("[Capsule Proxy] Missing authorization header");
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	
	console.log(`[Capsule Proxy] Sending DELETE request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: "DELETE",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	});

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`);
	
	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	
	if (contentType.includes('application/json')) {
	  data = await response.json();
	  console.log(`[Capsule Proxy] Received JSON data with keys: ${Object.keys(data).join(', ')}`);
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  
	  // For non-JSON responses
	  data = { 
		error: `Unexpected response format`,
		message: `Expected JSON but got ${contentType}`,
		status: response.status 
	  };
	}
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in DELETE:", error);
	return NextResponse.json({ 
	  error: "Failed to process capsule request",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}