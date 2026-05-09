#!/usr/bin/env python3
"""Dev server: build gallery index then serve on http://localhost:8000"""

import subprocess
import sys
import os
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} {fmt % args}")


def main():
    print("Building gallery index...")
    result = subprocess.run(
        [sys.executable, "scripts/build_gallery.py"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    if result.returncode != 0:
        print("Build failed, aborting.", file=sys.stderr)
        sys.exit(1)

    print(f"\nServing at http://localhost:{PORT}\nPress Ctrl+C to stop.\n")
    handler = partial(Handler, directory=ROOT)
    server = HTTPServer(("", PORT), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
