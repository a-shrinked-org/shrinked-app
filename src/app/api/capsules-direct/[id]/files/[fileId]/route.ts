// In app/api/capsules-direct/[id]/files/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === 'development';

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string, fileId: string } }
) {
  const startTime = Date.now();
  if (IS_DEV) console.log(`[Capsules File Delete] Request for capsule ID: ${params.id}, file ID: ${params.fileId}`);
  
  try {
	const { id, fileId } = params;
	
	if (!id || !fileId) {
	  if (IS_DEV) console.error(`[Capsules File Delete] Missing capsule ID or file ID`);
	  return NextResponse.json({ 
		error: "Missing required parameters", 
		details: `Capsule ID: ${!!id}, File ID: ${!!fileId}` 
	  }, { status: 400 });
	}
	
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  if (IS_DEV) console.error(`[Capsules File Delete] Missing authorization header`);
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}
	
	// Direct API call for file deletion
	const apiUrl = `${API_URL}/capsules/${id}/files/${fileId}`;
	if (IS_DEV) console.log(`[Capsules File Delete] Sending DELETE request to: ${apiUrl}`);
	
	const response = await fetch(apiUrl, {
	  method: 'DELETE',
	  headers: {
		'Authorization': authHeader
	  }
	});
	
	const responseTime = Date.now() - startTime;
	if (IS_DEV) console.log(`[Capsules File Delete] Backend response: status=${response.status}, time=${responseTime}ms`);
	
	// Success case - often DELETE returns 204 No Content
	if (response.status === 204) {
	  if (IS_DEV) console.log(`[Capsules File Delete] Successfully deleted file (204 response)`);
	  return new NextResponse(null, { status: 204 });
	}
	
	// Try to parse JSON response if available
	const contentType = response.headers.get('content-type');
	
	if (contentType && contentType.includes('application/json')) {
	  try {
		const data = await response.json();
		if (IS_DEV) console.log(`[Capsules File Delete] Received JSON response: status=${response.status}`);
		return NextResponse.json(data, { status: response.status });
	  } catch (error) {
		if (IS_DEV) console.error(`[Capsules File Delete] Error parsing JSON response:`, error);
		const text = await response.text();
		return NextResponse.json({ 
		  error: "Failed to parse API response as JSON",
		  rawResponse: text.substring(0, 200)
		}, { status: response.status });
	  }
	} else {
	  // Handle non-JSON responses
	  const text = await response.text();
	  if (IS_DEV) console.warn(`[Capsules File Delete] Non-JSON response: ${contentType}`);
	  
	  // If successful status but not JSON, still return success
	  if (response.status >= 200 && response.status < 300) {
		return NextResponse.json({ success: true }, { status: response.status });
	  } else {
		return NextResponse.json({ 
		  error: "Unexpected response format", 
		  details: text.substring(0, 200) 
		}, { status: response.status });
	  }
	}
  } catch (error) {
	const responseTime = Date.now() - startTime;
	console.error(`[Capsules File Delete] Error (${responseTime}ms):`, error);
	return NextResponse.json({
	  error: "Failed to delete file from capsule",
	  message: error instanceof Error ? error.message : "Unknown error"
	}, { status: 500 });
  }
}