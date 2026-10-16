import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
if (process.argv.includes('--ai')) throw new Error('Paid AI tests are disabled by user request.');
const base = process.env.FIT_QA_URL || 'http://127.0.0.1:3000';
const env = await fs.readFile('.env.local', 'utf8');
assert.notEqual(env.match(/^OPENAI_ENABLED=(.*)$/m)?.[1]?.trim(), 'true', 'Disable paid AI before running no-cost tests');
const secrets = ['OPENAI_API_KEY', 'SUPABASE_SECRET_KEY'].map(name => env.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim()).filter(Boolean);
assert.equal(secrets.length, 2, 'Set both server secrets in .env.local before integration tests');
function safe(text) { assert(secrets.every(secret => !text.includes(secret)), 'Secret found in client-visible content'); }
const user = { cookie: '' }, other = { cookie: '' };
async function request(url, user, body, method = body === undefined ? 'GET' : 'POST', extra = {}) {
  const response = await fetch(base + url, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(user.cookie ? { Cookie: user.cookie } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(290_000) });
  const cookie = response.headers.get('set-cookie');
  if (cookie) { assert(cookie.includes('HttpOnly')); assert(cookie.includes('SameSite=lax')); user.cookie = cookie.split(';')[0]; }
  const text = await response.text(); safe(text);
  return { status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text, headers: response.headers };
}
const design = { garment: 'tee', color: '#253952', ink: '#e9dec2', text: 'FIT QA', style: 'campus', side: 'front', x: 260, y: 248, scale: 100, rotation: 0, image: null };
assert.equal((await request('/api/session', user, {})).status, 200);
assert.equal((await request('/api/session', other, {})).status, 200);
assert.equal((await request('/api/session', other, {}, 'POST', { Origin: 'https://untrusted.example' })).status, 403);
assert.equal((await request('/api/designs/generate', user, { prompt: '', requestKey: crypto.randomUUID() })).status, 400);
assert.equal((await request('/api/designs/generate', user, { prompt: 'test', currentDesign: { ...design, image: 'https://untrusted.example/file.png' }, requestKey: crypto.randomUUID() })).status, 400);
const saved = await request('/api/designs', user, { design, title: 'Backend integration QA', prompt: '', filename: '', preview: null });
assert.equal(saved.status, 201);
assert.equal((await request('/api/designs', user)).data.items.some(item => item.id === saved.data.item.id), true);
assert.equal((await request('/api/designs', other)).data.items.some(item => item.id === saved.data.item.id), false);
assert.equal((await request(`/api/designs/${saved.data.item.id.slice(6)}`, other, { title: 'forbidden' }, 'PATCH')).status, 404);
assert.equal((await request(`/api/designs/${saved.data.item.id.slice(6)}`, user, { title: 'Updated backend QA' }, 'PATCH')).status, 200);
assert.equal((await request(`/api/designs/${saved.data.item.id.slice(6)}`, user, { owner_hash: 'forged' }, 'PATCH')).status, 400);
const trashDate=new Date().toISOString(),designPath=`/api/designs/${saved.data.item.id.slice(6)}`;
assert.equal((await request(designPath,user,{trashedAt:trashDate},'PATCH')).status,200);
assert.equal((await request('/api/designs',user)).data.items.find(item=>item.id===saved.data.item.id).trashedAt,trashDate);
assert.equal((await request(designPath,other,{trashedAt:null},'PATCH')).status,404);
assert.equal((await request(designPath,user,{trashedAt:null},'PATCH')).status,200);
assert.equal((await request('/api/designs',user)).data.items.find(item=>item.id===saved.data.item.id).trashedAt,null);
assert.equal((await request('/api/quotes', user, { supplierId: 'jangwi', filename: '', design, order: { group: '', contactEmail: 'bad', sizes: { S: 0, M: 0, L: 0, XL: 0 }, desiredDeliveryDate: '2000-01-01', method: 'invalid', printWidthCm: 100, printHeightCm: 100, memo: '' }, requestKey: crypto.randomUUID() })).status, 400);
console.log('PASS session, origin guard, validation, persistent design, ownership and field restrictions');

assert.equal((await request('/api/designs/generate', user, { prompt: 'test', currentDesign: design, requestKey: crypto.randomUUID() })).status, 503);
const png = `data:image/png;base64,${(await sharp({ create: { width: 8, height: 8, channels: 4, background: '#e9dec2' } }).png().toBuffer()).toString('base64')}`;
const stored = await request('/api/designs', user, { design: { ...design, image: png }, title: 'Storage integration QA', prompt: '', filename: 'fixture.png', preview: png });
assert.equal(stored.status, 201);
const imageURL = stored.data.item.design.image;
const asset = await fetch(base + imageURL, { headers: { Cookie: user.cookie } });
assert.equal(asset.status, 200); assert.equal(asset.headers.get('content-type'), 'image/png');
const bytes = Buffer.from(await asset.arrayBuffer()); assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
assert.equal((await request(imageURL, other)).status, 404);
assert.equal((await request(imageURL, { cookie: '' })).status, 401);
const teamFixture=JSON.parse(await fs.readFile('tests/fixtures/team-design.json','utf8'));
const multiStored=await request('/api/designs',user,{design:{...teamFixture,image:png,fabric:{pattern:'custom',secondaryColor:'#ffffff',trimColor:'#ffffff',density:8,sleeveColor:null},fabricImage:png},title:'Multi-placement integration QA',prompt:'',filename:'fixture.png',preview:png});
assert.equal(multiStored.status,201);assert.equal(multiStored.data.item.design.placements.length,2);
assert.equal(multiStored.data.item.design.garment,'tee');assert.equal(multiStored.data.item.design.fabric,undefined);assert.equal(multiStored.data.item.design.fabricImage,undefined);
assert.equal((await request('/api/designs',other,{design:multiStored.data.item.design,title:'forbidden',prompt:'',filename:'',preview:null})).status,404,'Cannot reuse another owner artwork');
const project = env.match(/^SUPABASE_URL=(.*)$/m)?.[1]?.trim();
const db = createClient(project, env.match(/^SUPABASE_SECRET_KEY=(.*)$/m)?.[1]?.trim(), { auth: { persistSession: false } });
const ownerHash = createHash('sha256').update(user.cookie.split('=')[1]).digest('hex');
const quotes = [];
for (const [supplierId, format, method, printWidthCm, title] of [['jangwi', 'pdf', 'DTF', 18, '장위 스튜디오 · 단체복 제작 도안서'], ['wolgok', 'email', '자수', 10, '월곡 크래프트 · 이메일 제작 문의'], ['jongam', 'pdf', '실크스크린', 18, '종암 메이커스 · 단체 주문 제작 사양서']]) {
  const order = { group: '무료 검증용 샘플', contactEmail: 'qa@example.com', sizes: { S: 10, M: 10, L: 10, XL: 0 }, desiredDeliveryDate: '2099-01-01', method, printWidthCm, printHeightCm: printWidthCm, memo: 'AI 호출 없이 생성한 화면 검증 자료입니다.' };
  const input = { supplierId, design, filename: '', order, requestKey: crypto.randomUUID() };
  assert.equal((await request('/api/quotes', user, input)).status, 503);
  const sample={...input,conversionMode:'sample'};
  const result=await request('/api/quotes',user,sample);
  assert.equal(result.status,201,'Sample UV-to-pattern conversion failed');
  const quote=result.data.quote;
  assert.equal(quote.format,format);assert.equal(quote.document.title,title);
  assert.equal(quote.document.production.converter,'sample');
  assert.equal(quote.document.production.verification.status,'matched');
  assert.equal((await request('/api/quotes',user,sample)).data.quote.id,quote.id);
  assert.equal((await request('/api/quotes',user,{...sample,filename:'different'})).status,409);
  assert.equal((await request('/api/quotes',user,{...input,conversionMode:'unknown'})).status,400);
  assert.equal(quote.document.production.source.artwork.source,design.image);
  assert.equal((await request(`/api/quotes/${quote.id}`, user)).data.quote.id, quote.id);
  assert.equal((await request(`/api/quotes/${quote.id}`, other)).status, 404);
  const quotePath=`/api/quotes/${quote.id}`;
  assert.equal((await request(quotePath,other,{trashedAt:trashDate},'PATCH')).status,404);
  assert.equal((await request(quotePath,user,{trashedAt:trashDate,owner_hash:'forged'},'PATCH')).status,400);
  assert.equal((await request(quotePath,user,{trashedAt:'invalid'},'PATCH')).status,400);
  assert.equal((await request(quotePath,user,{},'PATCH')).status,400);
  assert.equal((await request(quotePath,user,{trashedAt:trashDate},'PATCH',{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await request(quotePath,user,{trashedAt:trashDate},'PATCH')).status,200);
  const trashedQuote=(await request(quotePath,user)).data.quote;
  assert(trashedQuote.trashedAt);assert.deepEqual(trashedQuote.document,quote.document,'Trashing preserves all production documents');
  assert((await request('/api/quotes',user)).data.quotes.find(item=>item.id===quote.id).trashedAt);
  assert.equal((await request(quotePath,user,{trashedAt:null},'PATCH')).status,200);
  assert.equal((await request(quotePath,user)).data.quote.trashedAt,null);
  assert.equal((await request('/api/quotes',user,sample)).data.quote.id,quote.id,'Restore preserves the original idempotency fingerprint');
  quotes.push(quote);
}
const multiOrder={group:'Multi-placement QA',contactEmail:'qa@example.com',sizes:{S:10,M:10,L:10,XL:0},desiredDeliveryDate:'2099-01-01',method:'DTF',printWidthCm:8,printHeightCm:8,memo:''};
const multiQuote=await request('/api/quotes',user,{supplierId:'jangwi',design:multiStored.data.item.design,filename:'fixture.png',order:multiOrder,requestKey:crypto.randomUUID(),conversionMode:'sample'});
assert.equal(multiQuote.status,201);assert.equal(multiQuote.data.quote.document.production.conversions.length,2);
assert.equal(multiQuote.data.quote.design.fabricImage,undefined);assert(multiQuote.data.quote.document.emailBody.includes('등판'));
console.log('PASS plain tee normalization, private artwork ownership and front/back conversions');
await fs.mkdir('.tools', { recursive: true });
await fs.writeFile('.tools/backend-qa.json', JSON.stringify({ cookie: user.cookie, design, quotes, cloud: saved.data.item }));
const aiJobs=await db.from('fit_jobs').select('id',{count:'exact',head:true}).eq('owner_hash',ownerHash);
assert.equal(aiJobs.count,0,'Sample conversions must not reserve paid AI jobs');
console.log('PASS private image storage, three UV-to-pattern conversions, idempotency, ownership and zero paid AI reservations');
console.log('PASS persistent design/quote trash and restore, preserved documents/idempotency, ownership, CSRF and patch field restrictions');

async function scan(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(file);
    else safe(await fs.readFile(file, 'utf8'));
  }
}
await scan('.next/static');
for (const url of ['/', '/design', '/quotes/new', '/my']) {
  const response = await fetch(base + url); safe(await response.text());
}
console.log('PASS actual API keys absent from browser bundles, page HTML and tested API responses');
