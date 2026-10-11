#!/usr/bin/env python3
"""Verify Exa proxy TLS using isolated nginx and fake loopback HTTPS upstreams.

Requires existing Linux /usr/sbin/nginx, openssl and Python 3. No installation,
production writes, real credentials or external network requests. Temporary
fixtures are retained; only this script's nginx/upstream processes are stopped.

Local: python3 deploy/verify-exa-proxy-tls.py [candidate nginx config]
Remote stdin: python3 - /etc/nginx/conf.d/starvault.deline.top.conf < this_file
"""
import http.server, json, pathlib, socket, ssl, subprocess, sys, tempfile, threading, time, urllib.request, urllib.error
root=pathlib.Path(tempfile.mkdtemp(prefix='starvault-tls-fixture-'))
root.chmod(0o700)
source_path=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path(__file__).resolve().parent/'nginx/starvault.deline.top.conf'
source=source_path.read_text()
location=source[source.index('    location = /api/exa/search {'):source.index('\n    location / {', source.index('    location = /api/exa/search {'))]
def run(args):
 p=subprocess.run(args,cwd=root,capture_output=True,text=True)
 if p.returncode: raise RuntimeError(p.stderr)
 return p
run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.crt','-days','1','-subj','/CN=StarVault isolated CA','-addext','basicConstraints=critical,CA:TRUE'])
for name,san in [('trusted','api.exa.ai'),('wrong-name','wrong.invalid')]:
 run(['openssl','req','-new','-newkey','rsa:2048','-nodes','-keyout',name+'.key','-out',name+'.csr','-subj','/CN='+san])
 (root/(name+'.ext')).write_text('subjectAltName=DNS:'+san+'\nbasicConstraints=critical,CA:FALSE\nextendedKeyUsage=serverAuth\n')
 run(['openssl','x509','-req','-in',name+'.csr','-CA','ca.crt','-CAkey','ca.key','-CAcreateserial','-out',name+'.crt','-days','1','-extfile',name+'.ext'])
run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout','untrusted.key','-out','untrusted.crt','-days','1','-subj','/CN=api.exa.ai','-addext','subjectAltName=DNS:api.exa.ai'])
class Handler(http.server.BaseHTTPRequestHandler):
 def do_POST(self):
  self.rfile.read(int(self.headers.get('Content-Length','0')))
  self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers(); self.wfile.write(b'{"fixture":"trusted"}')
 def log_message(self,*args): pass
results=[]
for name,expected in [('trusted',200),('wrong-name',502),('untrusted',502)]:
 upstream=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
 tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); tls.load_cert_chain(root/(name+'.crt'),root/(name+'.key'))
 upstream.socket=tls.wrap_socket(upstream.socket,server_side=True)
 threading.Thread(target=upstream.serve_forever,daemon=True).start()
 with socket.socket() as s: s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
 cfg=location.replace('proxy_pass https://api.exa.ai/search;',f'proxy_pass https://127.0.0.1:{upstream.server_port}/search;').replace('/etc/ssl/certs/ca-certificates.crt',str(root/'ca.crt'))
 conf=root/(name+'.conf'); err=root/(name+'.error.log')
 conf.write_text(f'worker_processes 1; pid {root/name}.pid; error_log {err} info; events {{worker_connections 32;}} http {{access_log off; client_body_temp_path {root}/body; proxy_temp_path {root}/proxy; limit_req_zone $binary_remote_addr zone=starvault_exa:10m rate=60r/m; server {{listen 127.0.0.1:{port}; {cfg} }} }}')
 run(['/usr/sbin/nginx','-t','-p',str(root)+'/', '-c',str(conf)])
 output=(root/(name+'.process.log')).open('w')
 proc=subprocess.Popen(['/usr/sbin/nginx','-p',str(root)+'/', '-c',str(conf),'-g','daemon off;'],stdout=output,stderr=output)
 def request(method='POST',origin='https://starvault.deline.top'):
  req=urllib.request.Request(f'http://127.0.0.1:{port}/api/exa/search',data=b'{}' if method=='POST' else None,method=method,headers={'Origin':origin,'Content-Type':'application/json','x-api-key':'isolated-harmless-fixture'})
  try: res=urllib.request.urlopen(req,timeout=5)
  except urllib.error.HTTPError as e: res=e
  return res.status,dict(res.headers),res.read().decode()
 try:
  for _ in range(50):
   try:
    status,headers,body=request(); break
   except urllib.error.URLError: time.sleep(.05)
  else: raise AssertionError('fixture nginx did not start')
  assert status==expected,(name,status,body)
  if name=='trusted':
   assert json.loads(body)=={'fixture':'trusted'}
   assert headers.get('Access-Control-Allow-Origin')=='https://starvault.deline.top'
   for origin in ['https://starvault.deline.top','https://hachikoj.github.io']:
    status,headers,_=request('OPTIONS',origin); assert status==204 and headers.get('Access-Control-Allow-Origin')==origin
   status,headers,_=request('OPTIONS','https://untrusted.invalid'); assert status==204 and not headers.get('Access-Control-Allow-Origin')
   assert request('GET')[0]==405
   checks=['correct-name trusted-chain POST 200','two allowed preflights 204','foreign origin has no allow header','GET 405']
  else:
   error=err.read_text()
   assert ('does not match' in error if name=='wrong-name' else 'certificate verify error' in error),error
   checks=['wrong host rejected 502' if name=='wrong-name' else 'untrusted self-signed rejected 502']
  results.append({'case':name,'passed':True,'checks':checks})
 finally:
  proc.terminate(); proc.wait(timeout=10); output.close(); upstream.shutdown(); upstream.server_close()
print(json.dumps({'fixtureDir':str(root),'nginx':run(['/usr/sbin/nginx','-v']).stderr.strip(),'results':results,'productionModified':False}))
(root/'result.json').write_text(json.dumps(results,indent=2))
