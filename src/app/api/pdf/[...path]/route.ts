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
  
  // Get the access token from cookies
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  // Get user token from localStorage as fallback (in localStorage via authUtils)
  let userToken = '';
  try {
	if (typeof window !== 'undefined') {
	  userToken = localStorage.getItem('access_token') || '';
	}
  } catch (e) {
	console.error('Error accessing localStorage:', e);
  }
  
  // Use either the cookie token or the localStorage token
  const token = accessToken || userToken;
  
  if (!token) {
	console.error('No authentication token found');
	return NextResponse.json(
	  { error: 'Authentication required' },
	  { status: 401 }
	);
  }

  // Get the search params from the request URL
  const searchParams = new URL(request.url).searchParams;
  
  // Handle different PDF-related endpoints
  let url = '';
  let responseType = 'json';
  
  if (path.includes('/markdown')) {
	// Extract the ID from the path
	const id = path.split('/markdown')[0];
	url = `${API_URL}/pdf/${id}/markdown`;
	responseType = 'text';
	
	// Add includeReferences param if present in the request
	if (searchParams.has('includeReferences')) {
	  url = `${url}?includeReferences=${searchParams.get('includeReferences')}`;
	}
  } else if (path.includes('/pdf')) {
	// Binary PDF download
	const id = path.split('/pdf')[0];
	url = `${API_URL}/pdf/${id}/pdf`;
	responseType = 'blob';
	
	// Add includeReferences param if present in the request
	if (searchParams.has('includeReferences')) {
	  url = `${url}?includeReferences=${searchParams.get('includeReferences')}`;
	}
  } else {
	// Default case - just get the JSON data about the document
	url = `${API_URL}/pdf/${path}`;
	
	// Forward all query parameters for other endpoints
	const queryString = searchParams.toString();
	if (queryString) {
	  url = `${url}?${queryString}`;
	}
  }
  
  console.log(`Proxying PDF request to: ${url}`);
  
  try {
	// Create headers with authorization
	const headers: HeadersInit = {
	  'Content-Type': 'application/json',
	  'Authorization': `Bearer ${token}`
	};
	
	// Forward the request to the API
	const response = await fetch(url, {
	  method: 'GET',
	  headers,
	  credentials: 'omit',
	  cache: 'no-store' // Important to prevent caching issues with authenticated content
	});
	
	if (!response.ok) {
	  console.error(`API responded with status: ${response.status}`);
	  return NextResponse.json(
		{ error: `API error: ${response.status}` },
		{ status: response.status }
	  );
	}
	
	// Handle different response types
	if (responseType === 'text') {
	  const text = await response.text();
	  return new NextResponse(text, {
		headers: {
		  'Content-Type': 'text/markdown',
		},
	  });
	} else if (responseType === 'blob') {
	  const blob = await response.blob();
	  return new NextResponse(blob, {
		headers: {
		  'Content-Type': 'application/pdf',
		  'Content-Disposition': `attachment; filename="document-${path.split('/pdf')[0]}.pdf"`
		},
	  });
	} else {
	  // Default JSON response
	  const data = await response.json();
	  return NextResponse.json(data);
	}
  } catch (error) {
	console.error('Error proxying to PDF API:', error);
	return NextResponse.json(
	  { error: 'Failed to connect to PDF API server' },
	  { status: 500 }
	);
  }
}