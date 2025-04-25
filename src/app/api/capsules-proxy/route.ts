import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// Function to extract the capsule ID and additional path from the URL
function extractPathInfo(url: URL) {
  const path = url.pathname;
  
  // Remove '/api/capsules-proxy' from the beginning
  const relativePath = path.replace(/^\/api\/capsules-proxy/, '');
  
  // If there's no additional path, return empty string
  if (!relativePath || relativePath === '/') {
	return '';
  }
  
  return relativePath;
}

// Handle GET requests
export async function GET(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	// Add any query parameters
	const searchParams = url.searchParams.toString();
	const apiUrl = `${API_URL}/capsules${pathSuffix}${searchParams ? `?${searchParams}` : ''}`;
	
	console.log(`[Capsule Proxy] GET ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: "GET",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	});

	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const data = await response.json().catch(() => {
	  console.error(`[Capsule Proxy] Error parsing JSON from response: ${response.status} ${response.statusText}`);
	  return {};
	});
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in GET:", error);
	return NextResponse.json({ error: "Failed to process capsule request" }, { status: 500 });
  }
}

// Handle POST requests
export async function POST(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	// Get the request body
	const body = await request.json().catch(() => {
	  console.error("[Capsule Proxy] Error parsing request body");
	  return {};
	});
	
	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	
	console.log(`[Capsule Proxy] POST ${apiUrl}`, body);
	
	const response = await fetch(apiUrl, {
	  method: "POST",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  body: JSON.stringify(body)
	});

	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const data = await response.json().catch(() => {
	  console.error(`[Capsule Proxy] Error parsing JSON from response: ${response.status} ${response.statusText}`);
	  return {};
	});
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in POST:", error);
	return NextResponse.json({ error: "Failed to process capsule request" }, { status: 500 });
  }
}

// Handle PATCH requests
export async function PATCH(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	// Get the request body
	const body = await request.json().catch(() => {
	  console.error("[Capsule Proxy] Error parsing request body");
	  return {};
	});
	
	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	
	console.log(`[Capsule Proxy] PATCH ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: "PATCH",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  body: JSON.stringify(body)
	});

	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const data = await response.json().catch(() => {
	  console.error(`[Capsule Proxy] Error parsing JSON from response: ${response.status} ${response.statusText}`);
	  return {};
	});
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in PATCH:", error);
	return NextResponse.json({ error: "Failed to process capsule request" }, { status: 500 });
  }
}

// Handle DELETE requests
export async function DELETE(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the URL and extract the path info
	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
	
	const apiUrl = `${API_URL}/capsules${pathSuffix}`;
	
	console.log(`[Capsule Proxy] DELETE ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: "DELETE",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	});

	// If the response is 204 No Content
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const data = await response.json().catch(() => {
	  console.error(`[Capsule Proxy] Error parsing JSON from response: ${response.status} ${response.statusText}`);
	  return {};
	});
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in DELETE:", error);
	return NextResponse.json({ error: "Failed to process capsule request" }, { status: 500 });
  }
}