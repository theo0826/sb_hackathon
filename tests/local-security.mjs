import assert from 'node:assert/strict';
import http from 'node:http';
const base='http://127.0.0.1:3000';
const status=await fetch(base+'/api/status');
assert.equal((await status.json()).aiEnabled,false,'Paid AI must remain disabled');
assert.equal(status.headers.get('referrer-policy'),'no-referrer');
assert.equal(status.headers.get('x-frame-options'),'DENY');
assert(status.headers.get('content-security-policy').includes("connect-src 'self'"));
// Fetch normalizes Host; use HTTP directly to test the exact wire-level headers.
for(const headers of [{Host:'public.example'},{Host:'127.0.0.1:3000','X-Forwarded-Host':'public.example'}]) {
  const code=await new Promise((resolve,reject)=>http.get(base+'/api/status',{headers},response=>{response.resume();resolve(response.statusCode);}).on('error',reject));
  assert.equal(code,403);
}
for(const file of ['/.env.local','/.git/config','/lib/server/ai.ts']) assert.equal((await fetch(base+file)).status,404);
assert.equal((await fetch(base+'/api/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://public.example'},body:'{}'})).status,403);
assert.equal((await fetch(base+'/api/designs')).status,401);
console.log('PASS AI off, private response headers, external Host/forwarded Host rejection, secret/source file protection, CSRF and guest ownership');
