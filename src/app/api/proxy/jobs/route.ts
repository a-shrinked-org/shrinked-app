import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function GET(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Parse URL to extract query parameters
	const url = new URL(request.url);
	const searchParams = url.searchParams.toString();
	const apiUrl = `${API_URL}/jobs${searchParams ? `?${searchParams}` : ''}`;

	const response = await fetch(apiUrl, {
	  method: "GET",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	});

	const data = await response.json().catch(() => ({}));
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("Error in jobs proxy:", error);
	return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the request body
	const body = await request.json().catch(() => ({}));

	const response = await fetch(`${API_URL}/jobs`, {
	  method: "POST",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  body: JSON.stringify(body)
	});

	const data = await response.json().catch(() => ({}));
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("Error in jobs proxy:", error);
	return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

// Handle PUT requests for editing jobs
export async function PUT(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Extract job ID from the URL if present
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/');
	const jobId = pathParts[pathParts.length - 1];
	
	// Get the request body
	const body = await request.json().catch(() => ({}));

	const response = await fetch(`${API_URL}/jobs/${jobId}`, {
	  method: "PUT",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  body: JSON.stringify(body)
	});

	const data = await response.json().catch(() => ({}));
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("Error in jobs proxy:", error);
	return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

// Handle DELETE requests
export async function DELETE(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Extract job ID from the URL
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/');
	const jobId = pathParts[pathParts.length - 1];

	const response = await fetch(`${API_URL}/jobs/${jobId}`, {
	  method: "DELETE",
	  headers: { 
		'Authorization': authHeader
	  },
	  credentials: 'omit',
	});

	// If no content is returned (204 status)
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const data = await response.json().catch(() => ({}));
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("Error in jobs proxy:", error);
	return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}