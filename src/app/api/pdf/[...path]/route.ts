import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Get the path segments and join them
  const path = params.path.join('/');
  
  // Forward the request to the API
  const url = `${API_URL}/pdf/${path}`;
  
  // Get the access token from the cookie (or request headers)
  let accessToken = null;
  
  // First try to get from request headers (for client components)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
	accessToken = authHeader.substring(7);
  } else {
	// If not in headers, try to get from cookies (for server components)
	const cookieStore = cookies();
	accessToken = cookieStore.get('access_token')?.value;
  }
  
  // Get the search params from the request URL
  const searchParams = new URL(request.url).searchParams;
  const queryString = searchParams.toString();
  
  // Add query parameters if they exist
  const requestUrl = queryString ? `${url}?${queryString}` : url;
  
  try {
	console.log(`[AUTH-PROXY] Proxying PDF request to: ${requestUrl}`);
	
	// Create headers to forward
	const headers: HeadersInit = {
	  'Content-Type': 'application/json',
	};
	
	// Add Authorization header if access token exists
	if (accessToken) {
	  headers['Authorization'] = `Bearer ${accessToken}`;
	}
	
	// Forward the request to the API
	const response = await fetch(requestUrl, {
	  method: 'GET',
	  headers,
	  credentials: 'omit',
	});
	
	// Get content type from response
	const contentType = response.headers.get('Content-Type');
	
	// Handle the response based on content type
	if (!response.ok) {
	  console.error(`[AUTH-PROXY] PDF request failed with status: ${response.status}`);
	  if (contentType?.includes('application/json')) {
		const errorData = await response.json();
		return NextResponse.json(errorData, { status: response.status });
	  } else {
		const errorText = await response.text();
		return new NextResponse(errorText, {
		  status: response.status,
		  headers: {
			'Content-Type': contentType || 'text/plain',
		  },
		});
	  }
	}
	
	// For successful responses
	if (contentType?.includes('application/json')) {
	  const data = await response.json();
	  return NextResponse.json(data);
	} else {
	  // For non-JSON responses like markdown text
	  const text = await response.text();
	  return new NextResponse(text, {
		headers: {
		  'Content-Type': contentType || 'text/plain',
		},
	  });
	}
  } catch (error) {
	console.error('[AUTH-PROXY] Error proxying to PDF API:', error);
	return NextResponse.json(
	  { error: 'Failed to connect to API server' },
	  { status: 500 }
	);
  }
}