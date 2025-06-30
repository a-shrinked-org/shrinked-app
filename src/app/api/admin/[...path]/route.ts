// app/api/admin/[[...path]]/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";
const IS_DEV = process.env.NODE_ENV === "development";

async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } },
  method: string
) {
  const startTime = Date.now();
  const pathSegments = params.path || [];
  const pathSuffix = pathSegments.join("/");
  const isPromptsUpsert = pathSuffix === "prompts/upsert";
  const isPromptsGet = pathSuffix === "prompts" && method === "GET";

  if (IS_DEV) {
	console.log(`[Admin Proxy] ${method} /api/admin/${pathSuffix}`);
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
	if (IS_DEV) console.log("[Admin Proxy] Missing Authorization");
	return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const searchParamsString = url.searchParams.toString();
  const upstreamUrl = `${API_URL}/admin/${pathSuffix}${searchParamsString ? `?${searchParamsString}` : ""}`;

  if (IS_DEV && isPromptsGet) {
	console.log("[Admin Proxy] Forwarding GET prompts with query:", searchParamsString);
  }

  let body: string | undefined = undefined;
  let headers: HeadersInit = {
	Authorization: authHeader
  };

  if (["POST", "PUT", "PATCH"].includes(method)) {
	const contentType = request.headers.get("content-type") || "";
	if (contentType.includes("application/json")) {
	  headers["Content-Type"] = "application/json";

	  try {
		const raw = await request.clone().text();
		body = raw || undefined;
	  } catch (e) {
		return NextResponse.json({ error: "Failed to read JSON body" }, { status: 400 });
	  }

	  // Special handling for prompts/upsert to enforce shape
	  if (isPromptsUpsert && body) {
		try {
		  const parsed = JSON.parse(body);
		  if (!Array.isArray(parsed.prompts)) {
			return NextResponse.json({ error: "Expected { prompts: [...] }" }, { status: 400 });
		  }

		  const prompts = parsed.prompts.map((p: any, idx: number) => {
			if (typeof p.section !== "string" || typeof p.prompt !== "string") {
			  throw new Error(`Invalid prompt at index ${idx}`);
			}
			return {
			  section: p.section,
			  prompt: p.prompt,
			  prefill: typeof p.prefill === "string" ? p.prefill : ""
			};
		  });

		  body = JSON.stringify({ prompts });

		  if (IS_DEV) {
			console.log("[Admin Proxy] Validated prompts payload:", prompts.length);
		  }
		} catch (err) {
		  return NextResponse.json({ error: "Invalid prompt format", message: String(err) }, { status: 400 });
		}
	  }
	}
  }

  try {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 60000);

	const res = await fetch(upstreamUrl, {
	  method,
	  headers,
	  body,
	  signal: controller.signal
	});

	clearTimeout(timeout);

	const contentType = res.headers.get("content-type") || "";
	const text = await res.text();
	
	const headersObj: Record<string, string> = {};
	res.headers.forEach((value, key) => {
	  if (!["content-encoding", "transfer-encoding"].includes(key)) {
		headersObj[key] = value;
	  }
	});

	if (res.status === 204) return new NextResponse(null, { status: 204 });

	if (contentType.includes("application/json")) {
	  try {
		return NextResponse.json(JSON.parse(text), { status: res.status, headers: headersObj });
	  } catch (err) {
		return NextResponse.json(
		  { error: "Invalid JSON from upstream", preview: text.slice(0, 500) },
		  { status: 500 }
		);
	  }
	}

	return new NextResponse(text, { status: res.status, headers: headersObj });
  } catch (error: any) {
	console.error("[Admin Proxy] Proxy error:", error);
	const message =
	  error.name === "AbortError"
		? "Upstream request timed out"
		: error.message || "Unknown proxy error";
	return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Export route handlers
export const GET = (req: NextRequest, ctx: any) => handleRequest(req, ctx, "GET");
export const POST = (req: NextRequest, ctx: any) => handleRequest(req, ctx, "POST");
export async function PATCH(request: NextRequest, { params }: { params: { path: string[] }}) {
  if (IS_DEV) console.log("[Admin Proxy] PATCH export hit!");
  return handleRequest(request, { params }, 'PATCH');
}
export const PUT = (req: NextRequest, ctx: any) => handleRequest(req, ctx, "PUT");
export const DELETE = (req: NextRequest, ctx: any) => handleRequest(req, ctx, "DELETE");
