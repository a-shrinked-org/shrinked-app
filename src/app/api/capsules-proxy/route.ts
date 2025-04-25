import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// Function to extract the capsule ID and additional path from the URL
function extractPathInfo(url: URL) {
  const path = url.pathname;
  console.log("[Capsule Proxy] Original path:", path); // Debug
  let relativePath = path.replace(/^\/api\/capsules-proxy/, '');
  if (!relativePath || relativePath === '/') {
	return '';
  }
  relativePath = relativePath.replace(/\/key\//, '/');
  console.log("[Capsule Proxy] Processed path:", relativePath); // Debug
  return relativePath;
}

// Handle GET requests
export async function GET(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
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

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`); // Debug
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	if (contentType.includes('application/json')) {
	  data = await response.json();
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  data = { 
		error: response.status === 404 ? "Capsule not found" : `Unexpected response format: ${contentType}`, 
		status: response.status 
	  };
	}
	
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

	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
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

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`); // Debug
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	if (contentType.includes('application/json')) {
	  data = await response.json();
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  data = { 
		error: response.status === 404 ? "Capsule not found" : `Unexpected response format: ${contentType}`, 
		status: response.status 
	  };
	}
	
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

	const url = new URL(request.url);
	const pathSuffix = extractPathInfo(url);
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

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`); // Debug
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	if (contentType.includes('application/json')) {
	  data = await response.json();
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  data = { 
		error: response.status === 404 ? "Capsule not found" : `Unexpected response format: ${contentType}`, 
		status: response.status 
	  };
	}
	
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

	console.log(`[Capsule Proxy] Backend response: status=${response.status}, content-type=${response.headers.get('content-type')}`); // Debug
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const contentType = response.headers.get('content-type') || '';
	let data;
	if (contentType.includes('application/json')) {
	  data = await response.json();
	} else {
	  console.warn(`[Capsule Proxy] Non-JSON response: ${contentType}, status: ${response.status}`);
	  data = { 
		error: response.status === 404 ? "Capsule not found" : `Unexpected response format: ${contentType}`, 
		status: response.status 
	  };
	}
	
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("[Capsule Proxy] Error in DELETE:", error);
	return NextResponse.json({ error: "Failed to process capsule request" }, { status: 500 });
  }
}