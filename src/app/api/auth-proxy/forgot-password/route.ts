// app/api/auth-proxy/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	const { email } = body;
	
	// Basic validation
	if (!email) {
	  return NextResponse.json(
		{ error: 'Email is required' },
		{ status: 400 }
	  );
	}
	
	// Email format validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
	  return NextResponse.json(
		{ error: 'Invalid email format' },
		{ status: 400 }
	  );
	}
	
	// Forward the request to the actual API endpoint
	const response = await fetch(`${API_URL}/auth/forgot-password`, {
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
	return NextResponse.json(data, { 
	  status: response.status,
	  headers: {
		'Cache-Control': 'no-store, max-age=0'
	  }
	});
  } catch (error) {
	console.error('Error in forgot password proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to process password reset request' },
	  { status: 500 }
	);
  }
}