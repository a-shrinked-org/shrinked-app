import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// Function to extract the capsule ID and additional path from the URL
function extractPathInfo(url: URL) {
  const path = url.pathname;
  console.log("[Capsule Proxy] Original path:", path);
  
  // Remove '/api/capsules-proxy' from the beginning
  let relativePath = path.replace(/^\/api\/capsules-proxy/, '');
  
  // Handle query parameters for the case of fetching a specific capsule by ID
  const idParam = url.searchParams.get('id');
  
  // If there's an ID in the query params, that takes precedence
  if (idParam) {
	console.log("[Capsule Proxy] ID from query param:", idParam);
	return `/${idParam}`;
  }
  
  // If there's no additional path, return empty string
  if (!relativePath || relativePath === '/') {
	console.log("[Capsule Proxy] No path suffix, returning empty string");
	return '';
  }
  
  // Check if this is an ID request directly in the path
  // MongoDB ObjectIds are 24 hex characters
  const idMatch = relativePath.match(/\/([0-9a-f]{24})(\/.*)?$/i);
  if (idMatch) {
	console.log("[Capsule Proxy] ID from path:", idMatch[1]);
	const id = idMatch[1];
	const remainingPath = idMatch[2] || '';
	return `/${id}${remainingPath}`;
  }
  
  // Fix for the incorrect "key/" pattern that might be added by Refine.dev
  if (relativePath.includes('/key/')) {
	const originalPath = relativePath;
	relativePath = relativePath.replace(/\/key\//, '/');
	console.log(`[Capsule Proxy] Removed 'key/' from path: ${originalPath} -> ${relativePath}`);
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

	// Get the URL
	const url = new URL(request.url);
	
	// Extract path and prepare the API URL
	const pathSuffix = extractPathInfo(url);
	
	// Create a new URLSearchParams object excluding the 'id' parameter
	const newParams = new URLSearchParams();
	url.searchParams.forEach((value, key) => {
	  if (key !== 'id') {
		newParams.append(key, value);
	  }
	});
	
	const searchParamsString = newParams.toString();
	const apiUrl = `${API_URL}/capsules${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ''}`;
	
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

	// Handle various content types
	const contentType = response.headers.get('content-type') || '';
	let data;
	
	if (contentType.includes('application/json')) {
	  // Parse JSON content
	  data = await response.json().catch((error) => {
		console.error(`[Capsule Proxy] Error parsing JSON response: ${error}`);
		return { 
		  error: "Failed to parse JSON response",
		  status: response.status
		};
	  });
	} else {
	  // Handle non-JSON responses
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  
	  if (response.status === 404) {
		data = { 
		  error: "Capsule not found",
		  message: "The requested capsule could not be found",
		  status: 404
		};
	  } else {
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

// Handle POST requests (similar updates as GET)
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
	  data = await response.json().catch((error) => {
		console.error(`[Capsule Proxy] Error parsing JSON response: ${error}`);
		return { 
		  error: "Failed to parse JSON response",
		  status: response.status
		};
	  });
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
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

// Handle PATCH requests (similar updates as GET)
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
	  data = await response.json().catch((error) => {
		console.error(`[Capsule Proxy] Error parsing JSON response: ${error}`);
		return { 
		  error: "Failed to parse JSON response",
		  status: response.status
		};
	  });
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
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

// Handle DELETE requests (similar updates as GET)
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
	  data = await response.json().catch((error) => {
		console.error(`[Capsule Proxy] Error parsing JSON response: ${error}`);
		return { 
		  error: "Failed to parse JSON response",
		  status: response.status
		};
	  });
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
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