// app/api/auth-proxy/exchange/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	const { code } = body;
	
	// Validate code
	if (!code) {
	  return NextResponse.json(
		{ error: 'Code is required' },
		{ status: 400 }
	  );
	}
	
	console.log(`Processing OAuth code exchange: ${code.substring(0, 5)}...`);
	
	try {
	  // Forward the request to the actual API endpoint
	  const response = await fetch(`${API_URL}/auth/exchange`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ code }),
		credentials: 'omit',
	  });
	  
	  // Get the response data
	  const data = await response.json().catch(() => ({}));
	  
	  // Check for error response
	  if (!response.ok) {
		console.error('API error exchanging code:', data);
		return NextResponse.json(
		  { 
			error: data.message || 'Failed to exchange code',
			details: data
		  },
		  { status: response.status }
		);
	  }
	  
	  // If token exchange was successful, set tokens in cookies
	  if (data.accessToken) {
		// Store access token in cookie for server components
		cookies().set({
		  name: 'access_token',
		  value: data.accessToken,
		  httpOnly: true,
		  path: '/',
		  maxAge: 60 * 60,
		  sameSite: 'lax',
		  secure: process.env.NODE_ENV === 'production',
		});
		
		// If refresh token is provided, store it as well
		if (data.refreshToken) {
		  cookies().set({
			name: 'refresh_token',
			value: data.refreshToken,
			httpOnly: true,
			path: '/',
			maxAge: 30 * 24 * 60 * 60,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		  });
		}
	  }
	  
	  // Return the API response
	  return NextResponse.json(data, { 
		status: response.status,
		headers: {
		  'Cache-Control': 'no-store, max-age=0'
		}
	  });
	} catch (apiError) {
	  console.error('API error in OAuth code exchange:', apiError);
	  return NextResponse.json(
		{ error: 'Authentication service unavailable' },
		{ status: 503 }
	  );
	}
  } catch (error) {
	console.error('Error in OAuth code exchange proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to process authentication request' },
	  { status: 500 }
	);
  }
}