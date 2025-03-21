// src/app/api/send-feedback/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
	// Parse the request body
	const { rating, details, timestamp, email } = await request.json();

	if (!rating) {
	  return NextResponse.json(
		{ success: false, message: 'Rating is required' },
		{ status: 400 }
	  );
	}

	// Map rating values to user-friendly text
	const ratingMap: Record<string, string> = {
	  very_unsatisfied: 'Very Unsatisfied',
	  unsatisfied: 'Unsatisfied',
	  neutral: 'Neutral',
	  satisfied: 'Satisfied',
	  very_satisfied: 'Very Satisfied'
	};

	const ratingText = ratingMap[rating] || rating;
	
	// Format the email content
	const htmlContent = `
	  <h2>New Feedback Submission</h2>
	  <p><strong>Rating:</strong> ${ratingText}</p>
	  <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
	  ${details ? `<p><strong>Details:</strong></p><p>${details.replace(/\n/g, '<br>')}</p>` : ''}
	`;

	// Send the email using Resend
	const { data, error } = await resend.emails.send({
	  from: 'feedback@shrinked.ai',
	  to: email,
	  subject: `New Feedback: ${ratingText}`,
	  html: htmlContent,
	});

	if (error) {
	  console.error('Resend API error:', error);
	  return NextResponse.json(
		{ success: false, message: 'Failed to send email' },
		{ status: 500 }
	  );
	}

	return NextResponse.json(
	  { success: true, message: 'Feedback sent successfully', data },
	  { status: 200 }
	);
  } catch (error) {
	console.error('Error processing feedback:', error);
	return NextResponse.json(
	  { success: false, message: 'Internal server error' },
	  { status: 500 }
	);
  }
}