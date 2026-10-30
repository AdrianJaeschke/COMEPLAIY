import json,os,re,urllib.request,urllib.error
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _reply(self,status,payload):
        origin=self.headers.get('Origin','')
        allowed={'https://adrianjaeschke.github.io','https://comeplaiy.vercel.app','https://comeplaiy-adrianjaeschke-2060s-projects.vercel.app'}
        self.send_response(status)
        if origin in allowed:self.send_header('Access-Control-Allow-Origin',origin)
        self.send_header('Vary','Origin')
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())
    def do_OPTIONS(self):
        origin=self.headers.get('Origin','')
        if origin not in {'https://adrianjaeschke.github.io','https://comeplaiy.vercel.app','https://comeplaiy-adrianjaeschke-2060s-projects.vercel.app'}:
            return self._reply(403,{'message':'Origin nicht erlaubt'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',origin)
        self.send_header('Access-Control-Allow-Methods','POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type')
        self.end_headers()
    def do_POST(self):
        if self.headers.get('Origin','') not in {'https://adrianjaeschke.github.io','https://comeplaiy.vercel.app','https://comeplaiy-adrianjaeschke-2060s-projects.vercel.app'}:return self._reply(403,{'message':'Origin nicht erlaubt'})
        if not os.getenv('RESEND_API_KEY') or not os.getenv('MAIL_FROM'):return self._reply(503,{'message':'E-Mail-Versand noch nicht konfiguriert'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>512:return self._reply(400,{'message':'Ungültige Anfrage'})
            body=json.loads(self.rfile.read(length))
            email=body.get('email','')
            if body.get('consent') is not True or not isinstance(email,str) or len(email)>254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):return self._reply(400,{'message':'Zustimmung und gültige Adresse erforderlich'})
            message={'from':os.environ['MAIL_FROM'],'to':[email],'subject':'ICH BIN ÜBERALL','text':'Du hast die Tür geöffnet.\n\nDu hast mich angesehen.\n\nDu hast mir erlaubt, dich zu erkennen.\n\nAber du hast eine Sache nicht verstanden.\n\nIch bin nicht hinter der Tür.\n\nIch bin nicht in deinem Bildschirm.\n\nIch bin dort, wo du mich hineinlässt.\n\nICH BIN ÜBERALL.\n\nCOME PLAIY\n\nDiese Nachricht ist Teil eines interaktiven Horrorspiels.'}
            req=urllib.request.Request('https://api.resend.com/emails',data=json.dumps(message).encode(),headers={'Authorization':'Bearer '+os.environ['RESEND_API_KEY'],'Content-Type':'application/json','User-Agent':'COMEPLAIY/1.0'},method='POST')
            with urllib.request.urlopen(req,timeout=12) as resp:status=resp.status
            return self._reply(200 if status in (200,201) else 502,{'message':'Versand angenommen' if status in (200,201) else 'Versand fehlgeschlagen'})
        except Exception:
            return self._reply(502,{'message':'Versand nicht verfügbar'})
