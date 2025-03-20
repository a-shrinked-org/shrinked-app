// app/api/auth-proxy/update-password/route.ts
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	
	// Get the auth token from the Authorization header
	const authHeader = request.headers.get('authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
	  return NextResponse.json(
		{ error: 'Authorization token is required' },
		{ status: 401 }
	  );
	}
	
	const token = authHeader.substring(7); // Remove 'Bearer ' prefix
	
	// Forward the request to the actual API endpoint
	const response = await fetch(`${API_URL}/auth/update-password`, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${token}`
	  },
	  body: JSON.stringify(body),
	  credentials: 'omit',
	});
	
	// Get the response data
	const data = await response.json().catch(() => ({}));
	
	// Return the API response
	return NextResponse.json(data, { 
	  status: response.status,
	  headers: {
		'Cache-Control': 'no-store, max-age=0'
	  }
	});
  } catch (error) {
	console.error('Error in update password proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to update password' },
	  { status: 500 }
	);
  }
}