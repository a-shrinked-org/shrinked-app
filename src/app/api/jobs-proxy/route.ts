import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// Handle POST requests for creating jobs
export async function POST(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Get the request body
	const body = await request.json().catch(() => ({}));

	console.log("Creating job:", body);

	const response = await fetch(`${API_URL}/jobs`, {
	  method: "POST",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	  body: JSON.stringify(body)
	});

	const responseData = await response.json().catch(() => ({}));
	return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
	console.error("Error in jobs-proxy POST:", error);
	return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

// Handle GET requests for getting job details
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
	console.error("Error in jobs-proxy GET:", error);
	return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}