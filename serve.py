#!/usr/bin/env python3
"""Dev server: build gallery index then serve on http://localhost:8000"""

import subprocess
import sys
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8000


class Handler(SimpleHTTPRequestHandler):
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
    server = HTTPServer(("", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
