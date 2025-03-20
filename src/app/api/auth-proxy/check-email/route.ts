// app/api/auth-proxy/check-email/route.ts
import { NextRequest, NextResponse } from 'next/server';

// API base URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	const { email } = body;
	
	if (!email) {
	  return NextResponse.json(
		{ error: 'Email is required', exists: false },
		{ status: 400 }
	  );
	}
	
	try {
	  // Forward the request to check if the email exists
	  const response = await fetch(`${API_URL}/auth/check-email`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email }),
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
	} catch (apiError) {
	  console.error('API error in email check:', apiError);
	  
	  // Fallback to checking Loops directly if available
	  // Note: This is a placeholder - implement according to your auth flow
	  return NextResponse.json(
		{ exists: false, error: 'Unable to verify email' },
		{ status: 200 }
	  );
	}
  } catch (error) {
	console.error('Error in email check proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to check email', exists: false },
	  { status: 500 }
	);
  }
}