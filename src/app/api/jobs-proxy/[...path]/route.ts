
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  const [jobId, action] = params.path;
  const authToken = request.headers.get('Authorization');
  const jobsApiUrl = process.env.JOBS_API_URL || 'https://jobs.shrinked.ai';

  if (action === 'restart') {
    const response = await fetch(`${jobsApiUrl}/jobs/${jobId}/restart`, {
      method: 'POST',
      headers: {
        'Authorization': authToken || '',
      },
    });
    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: { path: string[] } }) {
  const [jobId] = params.path;
  const authToken = request.headers.get('Authorization');
  const jobsApiUrl = process.env.JOBS_API_URL || 'https://jobs.shrinked.ai';

  const requestBody = await request.json();

  const response = await fetch(`${jobsApiUrl}/jobs/${jobId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken || '',
      },
      body: JSON.stringify(requestBody),
    }
  );

  const responseData = await response.json();
  return NextResponse.json(responseData, { status: response.status });
}

export async function DELETE(request: Request, { params }: { params: { path: string[] } }) {
  const [jobId] = params.path;
  const authToken = request.headers.get('Authorization');
  const jobsApiUrl = process.env.JOBS_API_URL || 'https://jobs.shrinked.ai';

  const response = await fetch(`${jobsApiUrl}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': authToken || '',
    },
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const responseData = await response.json();
  return NextResponse.json(responseData, { status: response.status });
}
