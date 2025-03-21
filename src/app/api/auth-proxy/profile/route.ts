import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function GET(request: NextRequest) {
  try {
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	const response = await fetch(`${API_URL}/users/profile`, {
	  method: "GET",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  // Remove credentials mode to avoid CORS issues
	  credentials: 'omit',
	});

	const data = await response.json().catch(() => ({}));
	return NextResponse.json(data, { status: response.status });
  } catch (error) {
	console.error("Error in profile proxy:", error);
	return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}