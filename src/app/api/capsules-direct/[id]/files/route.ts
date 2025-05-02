// In app/api/capsules-direct/[id]/files/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  if (IS_DEV) console.log(`[Capsules Files Proxy] Received POST request for capsule ID: ${params.id}`);
  
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
	
	// Parse request body
	let body;
	try {
	  body = await request.json();
	} catch (error) {
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Failed to parse request body:`, error);
	  return NextResponse.json({ 
		error: "Invalid request body"
	  }, { status: 400 });
	}
	
	// Validate body has fileIds
	if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
	  if (IS_DEV) console.error(`[Capsules Files Proxy] Invalid or missing fileIds`);
	  return NextResponse.json({ 
		error: "fileIds must be a non-empty array"
	  }, { status: 400 });
	}
	
	// Create the request body with fileIds and optional testSummary
	const requestBody: any = {
	  fileIds: body.fileIds
	};
	
	// Include testSummary if provided
	if (body.testSummary !== undefined) {
	  requestBody.testSummary = body.testSummary;
	  if (IS_DEV) console.log(`[Capsules Files Proxy] Including testSummary in request`);
	}
	
	// Make API call
	const apiUrl = `${API_URL}/capsules/${id}/files`;
	if (IS_DEV) console.log(`[Capsules Files Proxy] Sending POST request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: 'POST',
	  headers: {
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  body: JSON.stringify(requestBody)
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