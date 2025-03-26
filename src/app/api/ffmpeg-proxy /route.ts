// app/api/ffmpeg-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

// List of files we want to proxy
const FFMPEG_FILES = [
  'ffmpeg-core.js',
  'ffmpeg-core.wasm',
  'ffmpeg-core.worker.js'
];

// Base URL for FFmpeg core files
const FFMPEG_CDN_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

export async function GET(request: NextRequest) {
  try {
	// Extract the filename from the URL path
	const url = new URL(request.url);
	const pathname = url.pathname;
	const filename = pathname.split('/').pop();

	// Validate the filename
	if (!filename || !FFMPEG_FILES.includes(filename)) {
	  return NextResponse.json({ error: "Invalid file requested" }, { status: 400 });
	}

	// Fetch the file from the CDN
	const cdnUrl = `${FFMPEG_CDN_BASE}/${filename}`;
	console.log(`Proxying FFmpeg file from: ${cdnUrl}`);
	
	const response = await fetch(cdnUrl, {
	  headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
	  }
	});

	if (!response.ok) {
	  console.error(`Failed to fetch ${filename} from CDN:`, response.status);
	  return NextResponse.json({ error: `Failed to fetch ${filename}` }, { status: response.status });
	}

	// Get the file content as ArrayBuffer
	const fileContent = await response.arrayBuffer();
	
	// Determine content type based on file extension
	let contentType = 'application/javascript';
	if (filename.endsWith('.wasm')) {
	  contentType = 'application/wasm';
	}

	// Create a new response with the file content and appropriate headers
	const result = new NextResponse(fileContent, {
	  status: 200,
	  headers: {
		'Content-Type': contentType,
		'Cache-Control': 'public, max-age=86400',  // Cache for 24 hours
		'Cross-Origin-Resource-Policy': 'cross-origin',
		'Access-Control-Allow-Origin': '*'
	  }
	});

	return result;
  } catch (error) {
	console.error("Error in ffmpeg-proxy:", error);
	return NextResponse.json({ error: "Failed to proxy FFmpeg file" }, { status: 500 });
  }
}