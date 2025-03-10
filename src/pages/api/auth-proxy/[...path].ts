// pages/api/auth-proxy/[...path].ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/${Array.isArray(path) ? path.join('/') : path}`;
  
  console.log(`[AUTH-PROXY] Proxying ${req.method} request to: ${apiUrl}`);

  try {
    // Add optional request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
    
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization as string } : {})
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Get response data - ensure we handle both JSON and non-JSON responses
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }
    
    // Forward status code and response
    res.status(response.status).json(data);
    
    console.log(`[AUTH-PROXY] Response from ${apiUrl}: status ${response.status}`);
  } catch (error) {
    console.error('[AUTH-PROXY] Error:', error);
    
    // Handle abort/timeout errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    // Handle network errors
    res.status(500).json({ 
      error: 'Failed to fetch from API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}