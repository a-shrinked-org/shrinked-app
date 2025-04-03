// src/app/api/share-document/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
	// Get auth token from request headers
	const authToken = request.headers.get('Authorization');
	
	// Get the PDF API URL from environment variables
	const pdfApiUrl = process.env.PDF_API_URL || 'https://pdf.shrinked.ai';
	
	// Clone the request to read the body
	const requestClone = request.clone();
	const requestBody = await requestClone.json();
	
	// Log the request for debugging (remove in production)
	console.log('Share document request received:', {
	  slug: requestBody.slug,
	  hasContent: !!requestBody.content
	});
	
	// Forward the request to the pdf subdomain
	const response = await fetch(`${pdfApiUrl}/api/create-page`, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
		'Authorization': authToken || '',
		'X-Forwarded-From': 'app.shrinked.ai'
	  },
	  body: JSON.stringify(requestBody)
	});
	
	// Get the response from the PDF API
	const responseData = await response.json();
	
	// Log the response for debugging (remove in production)
	console.log('Share document response:', {
	  status: response.status,
	  data: responseData
	});
	
	// Handle errors from the PDF API
	if (!response.ok) {
	  return NextResponse.json({
		status: 'error',
		error: responseData.error || 'Failed to share document',
		details: responseData.details || `Status: ${response.status}`
	  }, { 
		status: response.status 
	  });
	}
	
	// If successful, update job record with the new link
	if (responseData.status === 'created' && responseData.link && requestBody.jobId) {
	  try {
		// Update the job record with the new link
		const updateJobResponse = await fetch(`/api/jobs/${requestBody.jobId}`, {
		  method: 'PATCH',
		  headers: {
			'Content-Type': 'application/json',
			'Authorization': authToken || ''
		  },
		  body: JSON.stringify({
			link: responseData.link
		  })
		});
		
		if (!updateJobResponse.ok) {
		  console.warn(`Failed to update job ${requestBody.jobId} with new link:`, await updateJobResponse.text());
		}
	  } catch (updateError) {
		// Non-critical error, just log it
		console.warn('Could not update job record with new link:', updateError);
	  }
	}
	
	// Return the response from the PDF API
	return NextResponse.json(responseData, { 
	  status: response.status 
	});
	
  } catch (error) {
	console.error('Error sharing document:', error);
	return NextResponse.json({
	  status: 'error',
	  error: 'Failed to share document',
	  details: error instanceof Error ? error.message : String(error)
	}, { 
	  status: 500 
	});
  }
}

export async function GET(request: Request) {
  return NextResponse.json({
	message: 'Share Document API - Use POST to share a document'
  }, { 
	status: 200 
  });
}