// app/api/auth-proxy/register/route.ts
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
		{ error: 'Email is required', success: false },
		{ status: 400 }
	  );
	}
	
	// Email format validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
	  return NextResponse.json(
		{ error: 'Invalid email format', success: false },
		{ status: 400 }
	  );
	}
	
	try {
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
	  
	  // Add success flag for more consistent client handling
	  return NextResponse.json(
		{ ...data, success: response.ok },
		{ 
		  status: response.status,
		  headers: {
			'Cache-Control': 'no-store, max-age=0'
		  }
		}
	  );
	} catch (apiError) {
	  console.error('API error in registration:', apiError);
	  return NextResponse.json(
		{ error: 'Registration service unavailable', success: false },
		{ status: 503 }
	  );
	}
  } catch (error) {
	console.error('Error in registration proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to process registration request', success: false },
	  { status: 500 }
	);
  }
}