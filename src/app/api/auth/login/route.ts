// app/api/auth-proxy/login/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	
	// Log the login attempt (without sensitive data)
	console.log(`Processing login request for: ${body.email ? body.email : 'unknown email'}`);
	
	// Forward the request to the actual API endpoint
	const response = await fetch(`${API_URL}/auth/login`, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
	  },
	  body: JSON.stringify(body),
	  // Don't include credentials to avoid CORS preflight issues
	  credentials: 'omit',
	});
	
	// Get the response data
	const data = await response.json().catch(() => ({}));
	
	// If login was successful and we got tokens back, set them in cookies
	if (response.ok && data.accessToken) {
	  // Store access token in cookie for server components
	  cookies().set({
		name: 'access_token',
		value: data.accessToken,
		httpOnly: true,
		path: '/',
		// 1 hour expiry or based on token expiry if available
		maxAge: 60 * 60,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	  });
	}
	
	// Return the API response
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error('Error in login proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to process login request' },
	  { status: 500 }
	);
  }
}