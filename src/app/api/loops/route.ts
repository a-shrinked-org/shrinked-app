// src/app/api/loops/route.ts
import { NextRequest, NextResponse } from 'next/server';

const LOOPS_API_BASE = 'https://app.loops.so/api/v1';
const LOOPS_API_TOKEN = process.env.LOOPS_API_TOKEN;

export async function GET(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get('endpoint');
  const email = request.nextUrl.searchParams.get('email');
  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!LOOPS_API_TOKEN) {
	return NextResponse.json(
	  { message: 'Loops API token not configured' },
	  { status: 500 }
	);
  }
  
  if (!endpoint) {
	return NextResponse.json(
	  { message: 'Missing required parameter: endpoint' },
	  { status: 400 }
	);
  }
  
  // Build URL based on endpoint and parameters
  let url = `${LOOPS_API_BASE}/${endpoint}`;
  
  // Add appropriate query parameters
  const params = new URLSearchParams();
  if (endpoint === 'contacts/find') {
	if (email) {
	  params.append('email', email);
	} else if (userId) {
	  params.append('userId', userId);
	} else {
	  return NextResponse.json(
		{ message: 'contacts/find requires either email or userId parameter' },
		{ status: 400 }
	  );
	}
	url += `?${params.toString()}`;
  }
  
  try {
	const response = await fetch(url, {
	  method: 'GET',
	  headers: {
		'Authorization': `Bearer ${LOOPS_API_TOKEN}`,
		'Content-Type': 'application/json'
	  }
	});
	
	if (!response.ok) {
	  console.error(`Loops API error: ${response.status} for ${url}`);
	  return NextResponse.json(
		{ message: `Loops API returned ${response.status}` },
		{ status: response.status }
	  );
	}
	
	const data = await response.json();
	return NextResponse.json(data);
  } catch (error) {
	console.error('Loops API error:', error);
	return NextResponse.json(
	  { message: 'Failed to fetch from Loops API', error: String(error) },
	  { status: 500 }
	);
  }
}

export async function POST(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get('endpoint');
  
  if (!LOOPS_API_TOKEN) {
	return NextResponse.json(
	  { message: 'Loops API token not configured' },
	  { status: 500 }
	);
  }
  
  if (!endpoint) {
	return NextResponse.json(
	  { message: 'Missing required parameter: endpoint' },
	  { status: 400 }
	);
  }
  
  try {
	const body = await request.json();
	const url = `${LOOPS_API_BASE}/${endpoint}`;
	
	const response = await fetch(url, {
	  method: 'POST',
	  headers: {
		'Authorization': `Bearer ${LOOPS_API_TOKEN}`,
		'Content-Type': 'application/json'
	  },
	  body: JSON.stringify(body)
	});
	
	if (!response.ok) {
	  console.error(`Loops API error: ${response.status} for ${url}`);
	  const errorText = await response.text();
	  return NextResponse.json(
		{ 
		  message: `Loops API returned ${response.status}`,
		  details: errorText
		},
		{ status: response.status }
	  );
	}
	
	const data = await response.json();
	return NextResponse.json(data);
  } catch (error) {
	console.error('Loops API error:', error);
	return NextResponse.json(
	  { message: 'Failed to post to Loops API', error: String(error) },
	  { status: 500 }
	);
  }
}