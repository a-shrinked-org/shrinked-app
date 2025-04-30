// app/api/usage-proxy/[subscriptionId]/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

export async function GET(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  const startTime = Date.now();
  const subscriptionId = params.subscriptionId;
  
  if (IS_DEV) console.log(`[Usage Proxy] GET jobs usage for subscription: ${subscriptionId}`);
  
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.error(`[Usage Proxy] Missing authorization header`);
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	// Direct API call 
	const apiUrl = `${API_URL}/usage/${subscriptionId}/jobs`;
	if (IS_DEV) console.log(`[Usage Proxy] Sending request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: 'GET',
	  headers: {
		'Authorization': authHeader,
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		'Pragma': 'no-cache',
		'Expires': '0'
	  },
	  cache: 'no-store'
	});
	
	const responseTime = Date.now() - startTime;
	if (IS_DEV) console.log(`[Usage Proxy] Backend response: status=${response.status}, time=${responseTime}ms`);
	
	const contentType = response.headers.get('content-type');
	
	if (contentType && contentType.includes('application/json')) {
	  const data = await response.json();
	  return NextResponse.json(data);
	} else {
	  const text = await response.text();
	  if (IS_DEV) console.error(`[Usage Proxy] Unexpected response format: ${contentType}`);
	  return NextResponse.json({ 
		error: "Unexpected response format", 
		details: text.substring(0, 200) 
	  }, { status: 500 });
	}
  } catch (error) {
	const responseTime = Date.now() - startTime;
	console.error(`[Usage Proxy] Error (${responseTime}ms):`, error);
	return NextResponse.json({
	  error: "Failed to fetch jobs usage data",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}