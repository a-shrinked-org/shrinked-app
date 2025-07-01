import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextResponse } from "next/server";

const API_URL = process.env.API_URL;

async function handleRequest(req: Request, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.token;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const path = params.path ? params.path.join("/") : "";
  const targetUrl = `${API_URL}/users/api-keys/${path}`;

  try {
    const apiResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" && req.method !== "DELETE" ? await req.text() : undefined,
    });

    const data = await apiResponse.json();
    return NextResponse.json(data, { status: apiResponse.status });

  } catch (error) {
    console.error("API Key Proxy Error:", error);
    return NextResponse.json({ message: "An error occurred while proxying the request." }, { status: 500 });
  }
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };