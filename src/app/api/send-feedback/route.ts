// src/app/api/send-feedback/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
	// Parse the request body
	const { message, timestamp, email } = await request.json();

	if (!message || message.trim() === '') {
	  return NextResponse.json(
		{ success: false, message: 'Feedback message is required' },
		{ status: 400 }
	  );
	}
	
	// Format the email content
	const htmlContent = `
	  <h2>New Feedback Submission</h2>
	  <p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</p>
	  <p><strong>Feedback:</strong></p>
	  <p>${message.replace(/\n/g, '<br>')}</p>
	`;

	// Send the email using Resend
	const { data, error } = await resend.emails.send({
	  from: 'feedback@shrinked.ai',
	  to: email,
	  subject: 'New Feedback Submission',
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