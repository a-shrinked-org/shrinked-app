// pages/api/loops.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { endpoint } = req.query; // e.g., "contacts/find?email=ivan%40cherepukhin.com"
  const method = req.method || "GET";
  const body = req.method === "POST" ? req.body : undefined;

  try {
	const response = await fetch(`https://app.loops.so/api/v1/${endpoint}`, {
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