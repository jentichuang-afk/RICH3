import http.server
import socketserver

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            with open('sim_result.json', 'w', encoding='utf-8') as f:
                f.write(post_data.decode('utf-8'))
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK\n')
            print("Successfully received and saved sim_result.json!")
        except Exception as e:
            print(f"Error handling POST: {e}")
            self.send_response(500)
            self.end_headers()

port = 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), MyHandler) as httpd:
    print(f"Serving at port {port}, waiting for simulation results...")
    httpd.serve_forever()
