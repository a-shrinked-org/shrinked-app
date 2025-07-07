from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import tempfile
import shutil
import mimetypes
from yt_dlp import YoutubeDL
from yt_dlp.version import __version__ as yt_dlp_version

class Handler(BaseHTTPRequestHandler):  # Changed to uppercase
    def do_GET(self):
        # Parse the URL and query parameters
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)
        
        # Handle version endpoint
        if parsed_url.path == '/version':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {"yt_dlp": yt_dlp_version}
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Handle download endpoint (root path for this function)
        if parsed_url.path == '/':
            url = query_params.get('url', [None])[0]
            platform = query_params.get('platform', [None])[0]
            
            if not url:
                self.send_error_response(400, "Missing url parameter")
                return
            
            # Supported platforms
            supported_platforms = ["youtube", "apple_podcasts"]
            if platform and platform not in supported_platforms:
                self.send_error_response(400, "Unsupported platform")
                return
            
            try:
                self.download_and_serve(url)
            except Exception as e:
                self.send_error_response(500, f"Download failed: {str(e)}")
            return
        
        # Path not found
        self.send_error_response(404, "Not found")
    
    def send_error_response(self, status_code, message):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store, max-age=0')
        self.end_headers()
        error_response = {"detail": message}
        self.wfile.write(json.dumps(error_response).encode())
    
    def download_and_serve(self, url):
        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix="downloader-")
        
        ydl_options = {
            "format": "bestaudio/best",
            "extractaudio": True,
            "outtmpl": os.path.join(temp_dir, "%(title)s.%(ext)s"),
            "retries": 3,
            "encoding": "utf-8",
            "noplaylist": True,
            "ignoreerrors": True,
            "writethumbnail": True,
            "embedthumbnail": True,
        }
        
        try:
            with YoutubeDL(ydl_options) as ytdl:
                info_dict = ytdl.extract_info(url, download=True)
                downloaded_filepath = ytdl.prepare_filename(info_dict)
            
            if not downloaded_filepath or not os.path.exists(downloaded_filepath):
                raise Exception("No file found after download")
            
            # Determine media type based on file extension
            mime_type, _ = mimetypes.guess_type(downloaded_filepath)
            if not mime_type:
                mime_type = "application/octet-stream"
            
            # Read the file
            with open(downloaded_filepath, 'rb') as f:
                file_data = f.read()
            
            # Send response headers
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Disposition', f'attachment; filename="{os.path.basename(downloaded_filepath)}"')
            self.send_header('Content-Length', str(len(file_data)))
            self.send_header('Cache-Control', 'no-store, max-age=0')
            self.end_headers()
            
            # Send file data
            self.wfile.write(file_data)
            
        finally:
            # Cleanup
            try:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            except Exception as cleanup_error:
                print(f"Cleanup error: {cleanup_error}")
            except:
                pass

# Export the handler - this is crucial for Vercel
handler = Handler