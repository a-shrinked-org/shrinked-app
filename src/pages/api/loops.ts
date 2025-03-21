// pages/api/loops.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
	// Log request details
	console.log("API Route Called: /api/loops");
	console.log("Query parameters:", req.query);
	console.log("Method:", req.method);
	console.log("Request body:", req.body);
	
	// Check for API key
	if (!process.env.LOOPS_API_KEY) {
	  console.error("LOOPS_API_KEY is missing from environment variables");
	  return res.status(500).json({ message: "Server configuration error: API key missing" });
	}
	
	const loops = req.query.loops as string;
	if (!loops) {
	  console.warn("Missing 'loops' parameter in request");
	  return res.status(400).json({ message: "Missing 'loops' parameter" });
	}

	const method = req.method || "GET";
	const body = req.method === "POST" ? req.body : undefined;
	
	// Remove the leading slash if it exists
	const cleanedEndpoint = loops.startsWith('/') ? loops.substring(1) : loops;
	
	// Build URL with query parameters for specific endpoints
	let url = `https://app.loops.so/api/v1/${cleanedEndpoint}`;
	
	// Handle special cases for endpoints that need query parameters
	if (cleanedEndpoint === 'contacts/find' && method === 'GET') {
	  // Extract email or userId from query parameters
	  const email = req.query.email as string;
	  const userId = req.query.userId as string;
	  
	  if (!email && !userId) {
		console.warn("Missing email or userId for contacts/find");
		return res.status(400).json({ message: "contacts/find requires either email or userId" });
	  }
	  
	  // Append the appropriate query parameter
	  const queryParams = new URLSearchParams();
	  if (email) {
		queryParams.append('email', email);
	  } else if (userId) {
		queryParams.append('userId', userId);
	  }
	  
	  url += `?${queryParams.toString()}`;
	}
	
	// Log what we're about to request
	console.log(`Making request to Loops API: ${method} ${url}`);
	if (body) {
	  console.log("Request body:", JSON.stringify(body));
	}
	
	try {
	  const response = await fetch(url, {
		method,
		headers: {
		  "Authorization": `Bearer ${process.env.LOOPS_API_KEY}`,
		  "Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	  });

	  // Log response status
	  console.log(`Loops API response status: ${response.status}`);
	  
	  // Get response text first to debug potential JSON issues
	  const responseText = await response.text();
	  console.log(`Loops API raw response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
	  
	  // Try to parse JSON, with fallback if it fails
	  let data;
	  try {
		data = responseText ? JSON.parse(responseText) : {};
	  } catch (parseError) {
		console.error("Error parsing Loops API response as JSON:", parseError);
		return res.status(500).json({ 
		  message: "Error parsing Loops API response", 
		  error: (parseError as Error).message,
		  rawResponse: responseText
		});
	  }
	  
	  if (!response.ok) {
		console.error("Loops API error response:", data);
		return res.status(response.status).json(data);
	  }

	  return res.status(200).json(data);
	} catch (error) {
	  // Log detailed fetch error
	  console.error("Error fetching from Loops API:", error);
	  return res.status(500).json({ 
		message: "Error connecting to Loops API",
		error: error instanceof Error ? error.message : String(error) 
	  });
	}
  } catch (outerError) {
	// Catch any other unexpected errors
	console.error("Unexpected error in API route:", outerError);
	return res.status(500).json({ 
	  message: "Internal server error",
	  error: outerError instanceof Error ? outerError.message : String(outerError)
	});
  }
}