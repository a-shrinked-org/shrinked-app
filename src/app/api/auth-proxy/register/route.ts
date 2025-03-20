// app/api/auth-proxy/register/route.ts
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	
	// Forward the request to the actual API endpoint
	const response = await fetch(`${API_URL}/auth/register`, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
	  },
	  body: JSON.stringify(body),
	  credentials: 'omit',
	});
	
	// Get the response data
	const data = await response.json().catch(() => ({}));
	
	// Return the API response
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error('Error in registration proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to process registration request' },
	  { status: 500 }
	);
  }
}