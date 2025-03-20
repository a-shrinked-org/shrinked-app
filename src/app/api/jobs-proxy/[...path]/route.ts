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
  
  // Determine the endpoint based on the path
  let url = '';
  
  // Check for specific endpoints that need special handling
  if (path.includes('/markdown')) {
	// Extract the ID from the path
	const id = path.split('/markdown')[0];
	url = `${API_URL}/pdf/${id}/markdown`;
  } else if (path.includes('/pdf')) {
	// Extract the ID from the path
	const id = path.split('/pdf')[0];
	url = `${API_URL}/pdf/${id}/json`;
  } else if (path.includes('/processing')) {
	// Extract the ID from the path
	const id = path.split('/processing')[0];
	url = `${API_URL}/processing/${id}`;
  } else {
	// Default to jobs endpoint
	url = `${API_URL}/jobs/${path}`;
  }
  
  // Get the access token from the cookie
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  // Get the search params from the request URL
  const searchParams = new URL(request.url).searchParams;
  const queryString = searchParams.toString();
  
  // Add query parameters if they exist
  const requestUrl = queryString ? `${url}?${queryString}` : url;
  
  try {
	console.log(`Proxying request to: ${requestUrl}`);
	
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
	  // Don't include credentials, as we're explicitly handling the token
	  credentials: 'omit',
	});
	
	// Get the response data
	let data: any;
	const contentType = response.headers.get('Content-Type');
	
	if (contentType?.includes('application/json')) {
	  data = await response.json();
	} else {
	  data = await response.text();
	}
	
	// Return the response
	if (response.ok) {
	  return contentType?.includes('application/json')
		? NextResponse.json(data)
		: new NextResponse(data, {
			headers: {
			  'Content-Type': contentType || 'text/plain',
			},
		  });
	} else {
	  // Return error with status code
	  return contentType?.includes('application/json')
		? NextResponse.json(data, { status: response.status })
		: new NextResponse(data, {
			status: response.status,
			headers: {
			  'Content-Type': contentType || 'text/plain',
			},
		  });
	}
  } catch (error) {
	console.error('Error proxying to API:', error);
	return NextResponse.json(
	  { error: 'Failed to connect to API server' },
	  { status: 500 }
	);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Get the path segments and join them
  const path = params.path.join('/');
  
  // Forward the request to the API
  const url = `${API_URL}/jobs/${path}`;
  
  // Get the access token from the cookie
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  try {
	// Parse request body
	const body = await request.json();
	
	// Create headers to forward
	const headers: HeadersInit = {
	  'Content-Type': 'application/json',
	};
	
	// Add Authorization header if access token exists
	if (accessToken) {
	  headers['Authorization'] = `Bearer ${accessToken}`;
	}
	
	// Forward the request to the API
	const response = await fetch(url, {
	  method: 'POST',
	  headers,
	  body: JSON.stringify(body),
	  credentials: 'omit',
	});
	
	// Get the response data
	const data = await response.json().catch(() => response.text());
	
	// Return the response
	return response.ok
	  ? NextResponse.json(data)
	  : NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error('Error proxying to API:', error);
	return NextResponse.json(
	  { error: 'Failed to connect to API server' },
	  { status: 500 }
	);
  }
}

// Add other HTTP methods as needed (PUT, DELETE, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Similar implementation as POST
  const path = params.path.join('/');
  const url = `${API_URL}/jobs/${path}`;
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  try {
	const body = await request.json();
	const headers: HeadersInit = {
	  'Content-Type': 'application/json',
	};
	
	if (accessToken) {
	  headers['Authorization'] = `Bearer ${accessToken}`;
	}
	
	const response = await fetch(url, {
	  method: 'PUT',
	  headers,
	  body: JSON.stringify(body),
	  credentials: 'omit',
	});
	
	const data = await response.json().catch(() => response.text());
	
	return response.ok
	  ? NextResponse.json(data)
	  : NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error('Error proxying to API:', error);
	return NextResponse.json(
	  { error: 'Failed to connect to API server' },
	  { status: 500 }
	);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Similar implementation as GET but with DELETE method
  const path = params.path.join('/');
  const url = `${API_URL}/jobs/${path}`;
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  try {
	const headers: HeadersInit = {
	  'Content-Type': 'application/json',
	};
	
	if (accessToken) {
	  headers['Authorization'] = `Bearer ${accessToken}`;
	}
	
	const response = await fetch(url, {
	  method: 'DELETE',
	  headers,
	  credentials: 'omit',
	});
	
	const data = await response.json().catch(() => response.text());
	
	return response.ok
	  ? NextResponse.json(data)
	  : NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error('Error proxying to API:', error);
	return NextResponse.json(
	  { error: 'Failed to connect to API server' },
	  { status: 500 }
	);
  }
}