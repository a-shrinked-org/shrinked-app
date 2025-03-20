// app/api/auth-proxy/logout/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	const { refreshToken } = body;
	
	// Clear cookies regardless of API response
	cookies().delete('access_token');
	cookies().delete('refresh_token');
	cookies().delete('user_id');
	
	// If no refresh token provided, just handle as success
	if (!refreshToken) {
	  return NextResponse.json(
		{ success: true, message: 'Logged out successfully' },
		{ status: 200 }
	  );
	}
	
	try {
	  // Forward the request to the actual API endpoint
	  const response = await fetch(`${API_URL}/auth/logout`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ refreshToken }),
		credentials: 'omit',
	  });
	  
	  // Get the response data
	  const data = await response.json().catch(() => ({}));
	  
	  // Return success even if API failed (we already cleared cookies)
	  return NextResponse.json(
		{ success: true, ...data },
		{ 
		  status: 200,
		  headers: {
			'Cache-Control': 'no-store, max-age=0'
		  }
		}
	  );
	} catch (apiError) {
	  // API call failed, but we still consider logout successful locally
	  console.error('API error during logout:', apiError);
	  return NextResponse.json(
		{ success: true, message: 'Logged out locally' },
		{ status: 200 }
	  );
	}
  } catch (error) {
	console.error('Error in logout proxy:', error);
	// Still clear cookies even on error
	cookies().delete('access_token');
	cookies().delete('refresh_token');
	cookies().delete('user_id');
	
	return NextResponse.json(
	  { success: true, error: 'Error processing logout request, but cookies cleared' },
	  { status: 200 }
	);
  }
}