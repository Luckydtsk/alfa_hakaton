"""HTTP wrapper around the trained charge-off model.

The process only calls score(). It does not train, calibrate, or change features.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from scoring.score import score


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path.rstrip("/") == "/health":
            self._send(200, {"status": "ok"})
            return
        self._send(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/score":
            self._send(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
            self._send(200, score(payload))
        except Exception as error:  # noqa: BLE001 - return the model error to the API
            self._send(400, {"error": str(error)})

    def log_message(self, fmt: str, *args) -> None:
        print(f"[scoring] {self.address_string()} {fmt % args}")

    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", 8000), Handler)
    print("scoring listening on :8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
