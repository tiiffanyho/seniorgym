#!/usr/bin/env python3
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.request
import urllib.error

class AIReportHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/generate-report':
            # Read the request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Get API key from .env.local
            api_key = None
            try:
                with open('.env.local', 'r') as f:
                    for line in f:
                        if line.startswith('VITE_OPENAI_API_KEY='):
                            api_key = line.split('=', 1)[1].strip()
                            break
            except:
                pass
            
            # Also check environment variable
            if not api_key:
                api_key = os.environ.get('OPENAI_API_KEY')
            
            if not api_key:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No API key found'}).encode())
                return
            
            # Call OpenAI API
            try:
                openai_request = urllib.request.Request(
                    'https://api.openai.com/v1/chat/completions',
                    data=json.dumps({
                        'model': 'gpt-3.5-turbo',
                        'messages': data.get('messages', []),
                        'temperature': 0.7,
                        'max_tokens': 500
                    }).encode(),
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {api_key}'
                    }
                )
                
                with urllib.request.urlopen(openai_request) as response:
                    response_data = json.loads(response.read().decode())
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode())
            except urllib.error.HTTPError as e:
                error_data = json.loads(e.read().decode())
                self.send_response(e.code)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_data).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress logging
        pass

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8001), AIReportHandler)
    print('🤖 AI Report server running on http://localhost:8001')
    server.serve_forever()
