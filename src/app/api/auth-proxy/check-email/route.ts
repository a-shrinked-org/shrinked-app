// File: /app/api/auth-proxy/check-email/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	const body = await request.json();
	const { email } = body;

	if (!email) {
	  return NextResponse.json({ exists: false }, { status: 200 });
	}

	// This endpoint would just check if an email exists in your auth system
	// without requiring a password - simpler than a full login check
	const response = await fetch(`${API_URL}/auth/check-email`, {
	  method: "POST",
	  headers: { "Content-Type": "application/json" },
	  body: JSON.stringify({ email }),
	});

	if (response.ok) {
	  const data = await response.json();
	  return NextResponse.json({ exists: data.exists || false }, { status: 200 });
	}

	// If backend doesn't have this endpoint, default to letting user try
	return NextResponse.json({ exists: true }, { status: 200 });
  } catch (error) {
	console.error("Error in email check:", error);
	// On any error, default to letting the user try
	return NextResponse.json({ exists: true }, { status: 200 });
  }
}