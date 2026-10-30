"""COME PLAIY Edge Neural TTS endpoint, adapted from BAUMIE's api/speak.py.
Deploy on a Python serverless host; GitHub Pages does not execute Python.
"""
import asyncio
import json
import os
import re
from http.server import BaseHTTPRequestHandler
import edge_tts

PROFILES = {
    "girl-katja": ("de-DE-KatjaNeural", "-7%", "-9Hz"),
    "girl-gisela": ("de-DE-GiselaNeural", "-8%", "-12Hz"),
    "girl-amala": ("de-DE-AmalaNeural", "-7%", "-9Hz"),
}
MAX_BYTES = 8192
class handler(BaseHTTPRequestHandler):
    def cors(self):
        origin = self.headers.get("Origin", "")
        allowed = [s.strip() for s in os.getenv("ALLOWED_ORIGINS", "").split(",") if s.strip()]
        if origin and origin in allowed:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
    def reply(self, status, data, kind="application/json"):
        if isinstance(data, dict):
            data = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.cors()
        self.end_headers()
        self.wfile.write(data)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()
    def do_GET(self):
        self.reply(200, {"provider":"edge-tts","configured":True,"profiles":list(PROFILES)})
    def do_POST(self):
        origin = self.headers.get("Origin", "")
        allowed = [s.strip() for s in os.getenv("ALLOWED_ORIGINS", "").split(",") if s.strip()]
        if origin and origin not in allowed:
            return self.reply(403, {"error":"origin_not_allowed"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= MAX_BYTES:
                return self.reply(413, {"error":"invalid_size"})
            payload = json.loads(self.rfile.read(size))
            text = re.sub(r"\\s+", " ", str(payload.get("text", ""))).strip()[:780]
            profile = str(payload.get("profile", "girl-katja"))
            if not text or profile not in PROFILES:
                return self.reply(400, {"error":"invalid_text_or_profile"})
            voice, rate, pitch = PROFILES[profile]
            async def render():
                output = bytearray()
                async for chunk in edge_tts.Communicate(text, voice=voice, rate=rate, pitch=pitch).stream():
                    if chunk.get("type") == "audio":
                        output.extend(chunk.get("data", b""))
                return bytes(output)
            audio = asyncio.run(asyncio.wait_for(render(), timeout=35))
            if len(audio) < 256:
                raise RuntimeError("empty audio")
            return self.reply(200, audio, "audio/mpeg")
        except Exception as error:
            print("edge-tts failed:", type(error).__name__)
            return self.reply(502, {"error":"tts_unavailable"})
