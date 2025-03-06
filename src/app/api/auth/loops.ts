// pages/api/loops.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const loops = req.query.loops as string; // Changed from 'endpoint' to 'loops' to match your auth provider calls
  if (!loops) {
	return res.status(400).json({ message: "Missing 'loops' parameter" });
  }

  const method = req.method || "GET";
  const body = req.method === "POST" ? req.body : undefined;

  try {
	// Remove the leading slash if it exists to make the URL construction consistent
	const cleanedEndpoint = loops.startsWith('/') ? loops.substring(1) : loops;
	
	const response = await fetch(`https://app.loops.so/api/v1/${cleanedEndpoint}`, {
	  method,
	  headers: {
		"Authorization": `Bearer ${process.env.LOOPS_API_KEY}`, // Server-side env var
		"Content-Type": "application/json",
	  },
	  body: body ? JSON.stringify(body) : undefined,
	});

	const data = await response.json();

	if (!response.ok) {
	  return res.status(response.status).json(data);
	}

	res.status(200).json(data);
  } catch (error) {
	console.error("Loops API error:", error);
	res.status(500).json({ message: "Internal server error" });
  }
}