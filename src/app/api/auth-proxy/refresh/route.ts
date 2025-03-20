// app/api/auth-proxy/refresh/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	const { refreshToken } = body;
	
	// Validate refreshToken
	if (!refreshToken) {
	  return NextResponse.json(
		{ error: 'Refresh token is required' },
		{ status: 400 }
	  );
	}
	
	// Forward the request to the actual API endpoint
	const response = await fetch(`${API_URL}/auth/refresh`, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
	  },
	  body: JSON.stringify({ refreshToken }),
	  credentials: 'omit',
	});
	
	// Get the response data
	const data = await response.json().catch(() => ({}));
	
	// If token refresh was successful, set new tokens in cookies
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
	  
	  // If new refresh token is provided, store it as well
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
	}
	
	// Return the API response
	return NextResponse.json(data, { 
	  status: response.status,
	  headers: {
		'Cache-Control': 'no-store, max-age=0'
	  }
	});
  } catch (error) {
	console.error('Error in token refresh proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to refresh token' },
	  { status: 500 }
	);
  }
}