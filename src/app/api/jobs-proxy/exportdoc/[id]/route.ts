import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.shrinked.ai";

// POST request to export document as PDF
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
	const docId = params.id;
	const authHeader = request.headers.get('authorization');
	
	if (!authHeader) {
	  return NextResponse.json({ error: "Authorization header is required" }, { status: 401 });
	}

	// Parse URL to extract query parameters (like includeReferences)
	const url = new URL(request.url);
	const searchParams = url.searchParams.toString();
	const apiUrl = `${API_URL}/exportdoc/${docId}${searchParams ? `?${searchParams}` : ''}`;

	console.log("Exporting document:", apiUrl);

	const response = await fetch(apiUrl, {
	  method: "POST",
	  headers: { 
		'Authorization': authHeader,
		'Content-Type': 'application/json'
	  },
	  credentials: 'omit',
	});

	// Handle PDF response - return as blob
	if (response.ok) {
	  const blob = await response.blob();
	  
	  // Get the filename from Content-Disposition header or use default
	  const contentDisposition = response.headers.get('content-disposition');
	  let filename = `document-${docId}.pdf`;
	  
	  if (contentDisposition) {
		const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
		if (filenameMatch && filenameMatch[1]) {
		  filename = filenameMatch[1].replace(/['"]/g, '');
		}
	  }

	  // Return the PDF blob with appropriate headers
	  return new NextResponse(blob, {
		status: 200,
		headers: {
		  'Content-Type': 'application/pdf',
		  'Content-Disposition': `attachment; filename="${filename}"`,
		  'Content-Length': blob.size.toString(),
		},
	  });
	} else {
	  // Handle error response
	  const errorData = await response.json().catch(() => ({ error: "Export failed" }));
	  return NextResponse.json(errorData, { status: response.status });
	}
  } catch (error) {
	console.error("Error in exportdoc proxy:", error);
	return NextResponse.json({ error: "Failed to export document" }, { status: 500 });
  }
}