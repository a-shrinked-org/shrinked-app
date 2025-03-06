// pages/api/auth/callback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { API_CONFIG } from '@/utils/authUtils';
import cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
	return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
	const { code } = req.query;

	if (!code || typeof code !== 'string') {
	  return res.status(400).json({ message: 'Missing or invalid code parameter' });
	}

	console.log(`Received code: ${code.substring(0, 5)}...`);

	// Exchange the code for tokens
	const exchangeResponse = await fetch(`${API_CONFIG.API_URL}/auth/exchange`, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
	  },
	  body: JSON.stringify({ code }),
	});

	if (!exchangeResponse.ok) {
	  const errorData = await exchangeResponse.json();
	  console.error('Error exchanging code:', errorData);
	  return res.status(exchangeResponse.status).json({ 
		message: 'Failed to exchange code',
		error: errorData 
	  });
	}

	const { accessToken, refreshToken } = await exchangeResponse.json();

	// Set tokens as HTTP-only cookies
	res.setHeader('Set-Cookie', [
	  cookie.serialize('accessToken', accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV !== 'development',
		maxAge: 30 * 60, // 30 minutes
		sameSite: 'strict',
		path: '/',
	  }),
	  cookie.serialize('refreshToken', refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV !== 'development',
		maxAge: 7 * 24 * 60 * 60, // 7 days
		sameSite: 'strict',
		path: '/',
	  })
	]);

	// Redirect to the jobs page with successful login
	return res.redirect(302, '/jobs');
  } catch (error) {
	console.error('Error processing OAuth callback:', error);
	return res.status(500).json({ 
	  message: 'Internal server error during authentication',
	  error: error instanceof Error ? error.message : 'Unknown error'
	});
  }
}