// app/api/api-keys-proxy/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";

const API_URL = "https://api.shrinked.ai";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const targetUrl = `${API_URL}/users/api-keys`;

  try {
    const apiResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: apiResponse.status });
  } catch (error) {
    console.error("API Key GET Error:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching API keys." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { name, userId } = body;
  if (!name || !userId) {
    return NextResponse.json({ message: "Name and userId are required" }, { status: 400 });
  }

  const targetUrl = `${API_URL}/users/${userId}/api-key`;

  try {
    const apiResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: apiResponse.status });
  } catch (error) {
    console.error("API Key POST Error:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the API key." },
      { status: 500 }
    );
  }
}