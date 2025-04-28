// In app/api/capsules-direct/[id]/files/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  if (IS_DEV) console.log(`[Capsules Files Proxy] Received GET request for capsule ID: ${params.id}/files`);
  
  try {
	const id = params.id;
	
	if (!id) {
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Missing capsule ID`);
	  return NextResponse.json({ error: "Missing capsule ID" }, { status: 400 });
	}
	
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Missing authorization header`);
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	// Direct API call
	const apiUrl = `${API_URL}/capsules/${id}/files`;
	if (IS_DEV) console.log(`[Capsules Files Proxy] Sending GET request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  headers: {
		'Authorization': authHeader,
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		'Pragma': 'no-cache',
		'Expires': '0'
	  },
	  cache: 'no-store'
	});
	
	const responseTime = Date.now() - startTime;
	if (IS_DEV) console.log(`[Capsules Files Proxy] Backend response: status=${response.status}, time=${responseTime}ms`);
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}
	
	const contentType = response.headers.get('content-type');
	
	if (contentType && contentType.includes('application/json')) {
	  const data = await response.json();
	  return NextResponse.json(data);
	} else {
	  const text = await response.text();
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Unexpected response format: ${contentType}`);
	  return NextResponse.json({ 
		error: "Unexpected response format", 
		details: text.substring(0, 200) 
	  }, { status: 500 });
	}
  } catch (error) {
	const responseTime = Date.now() - startTime;
	console.error(`[Capsules Files Proxy] Error (${responseTime}ms):`, error);
	return NextResponse.json({
	  error: "Failed to fetch capsule files",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  if (IS_DEV) console.log(`[Capsules Files Proxy] Received POST request for capsule ID: ${params.id}/files`);
  
  try {
	const id = params.id;
	
	if (!id) {
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Missing capsule ID`);
	  return NextResponse.json({ error: "Missing capsule ID" }, { status: 400 });
	}
	
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Missing authorization header`);
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	// Get request body
	let body: string = '';
	try {
	  body = await request.text();
	} catch (error) {
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Error reading request body:`, error);
	  return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
	}
	
	// Direct API call
	const apiUrl = `${API_URL}/capsules/${id}/files`;
	if (IS_DEV) console.log(`[Capsules Files Proxy] Sending POST request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: 'POST',
	  headers: {
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  body: body
	});
	
	const responseTime = Date.now() - startTime;
	if (IS_DEV) console.log(`[Capsules Files Proxy] Backend response: status=${response.status}, time=${responseTime}ms`);
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}
	
	const contentType = response.headers.get('content-type');
	
	if (contentType && contentType.includes('application/json')) {
	  const data = await response.json();
	  return NextResponse.json(data);
	} else {
	  const text = await response.text();
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Unexpected response format: ${contentType}`);
	  return NextResponse.json({ 
		error: "Unexpected response format", 
		details: text.substring(0, 200) 
	  }, { status: 500 });
	}
  } catch (error) {
	const responseTime = Date.now() - startTime;
	console.error(`[Capsules Files Proxy] Error (${responseTime}ms):`, error);
	return NextResponse.json({
	  error: "Failed to add files to capsule",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}