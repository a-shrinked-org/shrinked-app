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
		{ error: 'Email is required' },
		{ status: 400 }
	  );
	}
	
	// Forward the request to check if the email exists
	// Note: This endpoint might be different based on your actual API
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
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error('Error in email check proxy:', error);
	return NextResponse.json(
	  { error: 'Failed to check email' },
	  { status: 500 }
	);
  }
}