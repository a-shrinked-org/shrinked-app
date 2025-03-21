import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

export async function POST(request: NextRequest) {
  try {
	const body = await request.json();
	const { email, password } = body;

	if (!email) {
	  return NextResponse.json({ error: "Email is required", success: false }, { status: 400 });
	}

	const response = await fetch(`${API_URL}/auth/login`, {
	  method: "POST",
	  headers: { "Content-Type": "application/json" },
	  body: JSON.stringify(body),
	  credentials: "omit",
	});

	const data = await response.json().catch(() => ({}));

	if (response.ok && data.accessToken) {
	  cookies().set({
		name: "access_token",
		value: data.accessToken,
		httpOnly: true,
		path: "/",
		maxAge: 60 * 60,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	  });
	  if (data.refreshToken) {
		cookies().set({
		  name: "refresh_token",
		  value: data.refreshToken,
		  httpOnly: true,
		  path: "/",
		  maxAge: 30 * 24 * 60 * 60,
		  sameSite: "lax",
		  secure: process.env.NODE_ENV === "production",
		});
	  }
	  if (data.userId) {
		cookies().set({
		  name: "user_id",
		  value: data.userId,
		  httpOnly: false,
		  path: "/",
		  maxAge: 60 * 60,
		  sameSite: "lax",
		  secure: process.env.NODE_ENV === "production",
		});
	  }
	}

	return NextResponse.json({ ...data, success: response.ok }, { status: response.status });
  } catch (error) {
	console.error("Error in login proxy:", error);
	return NextResponse.json({ error: "Failed to process login request", success: false }, { status: 500 });
  }
}