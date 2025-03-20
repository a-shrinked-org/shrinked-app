// app/api/auth-proxy/login/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	const { email, password } = body;
	
	// Validate required fields
	if (!email) {
	  return NextResponse.json(
		{ error: 'Email is required' },
		{ status: 400 }
	  );
	}
	
	if (!password) {
	  return NextResponse.json(
		{ error: 'Password is required' },
		{ status: 400 }
	  );
	}
	
	// Log the login attempt (without sensitive data)
	console.log(`Processing login request for: ${email}`);
	
	try {
	  // Forward the request to the actual API endpoint
	  const response = await fetch(`${API_URL}/auth/login`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
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
		
		// If refresh token is available, store it as well
		if (data.refreshToken) {
		  cookies().set({
			name: 'refresh_token',
			value: data.refreshToken,
			httpOnly: true,
			path: '/',
			// Longer expiry for refresh token (30 days)
			maxAge: 30 * 24 * 60 * 60,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		  });
		}
		
		// Set user ID if available
		if (data.userId) {
		  cookies().set({
			name: 'user_id',
			value: data.userId,
			httpOnly: false, // Can be accessed by client JS
			path: '/',
			maxAge: 60 * 60,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		  });
		}
	  }
	  
	  // Return the API response WITH tokens - client-side still needs them
	  // during the transition to cookie-based auth
	  const responseData = { 
		...data,
		success: !!response.ok
	  };
	  
	  return NextResponse.json(responseData, { 
		status: response.status,
		headers: {
		  'Cache-Control': 'no-store, max-age=0'
		}
	  });
	} catch (apiError) {
	  console.error('API error in login:', apiError);
	  return NextResponse.json(
		{ error: 'Authentication service unavailable', success: false },
		{ status: 503 }
	  );
	}
  } catch (error) {
	console.error('Error in login proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to process login request', success: false },
	  { status: 500 }
	);
  }
}