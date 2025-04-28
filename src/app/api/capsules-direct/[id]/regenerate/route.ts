// In app/api/capsules-direct/[id]/regenerate/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  if (IS_DEV) console.log(`[Capsules Regenerate] Received GET request for capsule ID: ${params.id}/regenerate`);
  
  try {
	const id = params.id;
	
	if (!id) {
	  if (IS_DEV) console.error(`[Capsules Regenerate] Missing capsule ID`);
	  return NextResponse.json({ error: "Missing capsule ID" }, { status: 400 });
	}
	
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.error(`[Capsules Regenerate] Missing authorization header`);
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	// Direct API call
	const apiUrl = `${API_URL}/capsules/${id}/regenerate`;
	if (IS_DEV) console.log(`[Capsules Regenerate] Sending GET request to: ${apiUrl}`);
	
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
	if (IS_DEV) console.log(`[Capsules Regenerate] Backend response: status=${response.status}, time=${responseTime}ms`);
	
	if (response.status === 204) {
	  return new NextResponse(null, { status: 204 });
	}
	
	const contentType = response.headers.get('content-type');
	
	if (contentType && contentType.includes('application/json')) {
	  const data = await response.json();
	  return NextResponse.json(data);
	} else {
	  const text = await response.text();
	  if (IS_DEV) console.error(`[Capsules Regenerate] Unexpected response format: ${contentType}`);
	  return NextResponse.json({ 
		error: "Unexpected response format", 
		details: text.substring(0, 200) 
	  }, { status: 500 });
	}
  } catch (error) {
	const responseTime = Date.now() - startTime;
	console.error(`[Capsules Regenerate] Error (${responseTime}ms):`, error);
	return NextResponse.json({
	  error: "Failed to regenerate capsule",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}