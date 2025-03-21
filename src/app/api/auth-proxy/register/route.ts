import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	const body = await request.json();
	const { email, password, username } = body;

	if (!email) {
	  return NextResponse.json({ error: "Email is required", success: false }, { status: 400 });
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
	  return NextResponse.json({ error: "Invalid email format", success: false }, { status: 400 });
	}

	if (!password) {
	  return NextResponse.json({ success: true, message: "Verification email sent" }, { status: 200 });
	}

	const response = await fetch(`${API_URL}/auth/register`, {
	  method: "POST",
	  headers: { "Content-Type": "application/json" },
	  body: JSON.stringify({
		email,
		password,
		...(username && { username }),
		subscriptionPlan: "FREE",
	  }),
	  credentials: "omit",
	});

	const data = await response.json().catch(() => ({}));
	return NextResponse.json({ ...data, success: response.ok }, { status: response.status });
  } catch (error) {
	console.error("Error in register proxy:", error);
	return NextResponse.json({ error: "Failed to process registration", success: false }, { status: 500 });
  }
}