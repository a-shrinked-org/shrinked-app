import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// GET specific job by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
	const jobId = params.id;
	const authHeader = request.headers.get('authorization');
	
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Check for 'processing' parameter to determine endpoint
	const url = new URL(request.url);
	const isProcessing = url.searchParams.get('processing') === 'true';
	const fields = url.searchParams.get('fields');
	
	// Construct API URL
	let apiUrl = `${API_URL}/jobs/${jobId}`;
	
	// If fields parameter is provided, add it to the URL
	if (fields) {
	  apiUrl += `?fields=${fields}`;
	}

	console.log("Fetching job details:", apiUrl);

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
	console.error("Error in jobs-proxy/[id] GET:", error);
	return NextResponse.json({ error: "Failed to fetch job details" }, { status: 500 });
  }
}

// PUT to update a job
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
	const jobId = params.id;
	const authHeader = request.headers.get('authorization');
	
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

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
	console.error("Error in jobs-proxy/[id] PUT:", error);
	return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

// DELETE a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
	const jobId = params.id;
	const authHeader = request.headers.get('authorization');
	
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const response = await fetch(`${API_URL}/jobs/${jobId}`, {
	  method: "DELETE",
	  headers: { 
		'Authorization': authHeader
	  },
	  credentials: 'omit',
	});

	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}

	const data = await response.json().catch(() => ({}));
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("Error in jobs-proxy/[id] DELETE:", error);
	return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}