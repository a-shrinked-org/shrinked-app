// app/api/api-keys-proxy/[keyId]/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";

const API_URL = "https://api.shrinked.ai";

export async function DELETE(req: Request, { params }: { params: { keyId: string } }) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.token;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { keyId } = params;
  if (!keyId) {
    return NextResponse.json({ message: "API key ID is required" }, { status: 400 });
  }

  const targetUrl = `${API_URL}/users/api-key/${keyId}`;

  try {
    const apiResponse = await fetch(targetUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: apiResponse.status });
  } catch (error) {
    console.error("API Key DELETE Error:", error);
    return NextResponse.json(
      { message: "An error occurred while deleting the API key." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: { keyId: string } }) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.token;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const { keyId } = params;
  if (!keyId) {
    return NextResponse.json({ message: "API key ID is required" }, { status: 400 });
  }

  const targetUrl = `${API_URL}/users/api-key/${keyId}/regenerate`;

  try {
    const apiResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: apiResponse.status });
  } catch (error) {
    console.error("API Key Regenerate Error:", error);
    return NextResponse.json(
      { message: "An error occurred while regenerating the API key." },
      { status: 500 }
    );
  }
}