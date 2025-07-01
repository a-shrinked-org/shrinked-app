import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";

const API_URL = "https://api.shrinked.ai";

async function authenticateRequest(req: Request) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.token;

  if (!token) {
    return { authenticated: false, response: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) };
  }
  return { authenticated: true, token };
}

export async function GET(req: Request) {
  const { authenticated, response, token } = await authenticateRequest(req);
  if (!authenticated) return response;

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
  const { authenticated, response, token } = await authenticateRequest(req);
  if (!authenticated) return response;

  try {
    const body = await req.json();
    const { name, userId, keyId, action } = body;

    let targetUrl: string;
    let method: string = "POST";

    if (action === "regenerate" && keyId) {
      targetUrl = `${API_URL}/users/api-key/${keyId}/regenerate`;
    } else if (name && userId) {
      targetUrl = `${API_URL}/users/${userId}/api-key`;
    } else {
      return NextResponse.json({ message: "Invalid request body for POST" }, { status: 400 });
    }

    const apiResponse = await fetch(targetUrl, {
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: apiResponse.status });
  } catch (error) {
    console.error("API Key POST Error:", error);
    return NextResponse.json(
      { message: "An error occurred while processing API key request." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { authenticated, response, token } = await authenticateRequest(req);
  if (!authenticated) return response;

  try {
    const body = await req.json();
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json({ message: "API key ID is required for deletion" }, { status: 400 });
    }

    const targetUrl = `${API_URL}/users/api-key/${keyId}`;

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