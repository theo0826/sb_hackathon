import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {loadTS} from './helpers/load-ts.mjs';
// Production orchestration with in-memory transport: no credentials or live AI.
const domain=await loadTS('lib/design.ts'),mapping=await loadTS('lib/production-mapping.ts'),production=await loadTS('lib/production-document.ts'),quotes=await loadTS('lib/quote.ts'),suppliers=await loadTS('lib/suppliers.ts');
globalThis.__fitModules={...domain,...mapping,...production,orderRows:quotes.orderRows};
const source=(await fs.readFile('lib/server/ai.ts','utf8')).replace('import "server-only";','').replace(/import[^\n]+from "[^\n]+";\r?\n/g,'');
const prelude=`class ApiError extends Error {constructor(message,status){super(message);this.status=status;}}const hash=()=>"test-source";const required=()=>"fake-test-key";const requireAI=()=>{};const imageBytes=async()=>Buffer.from("fixture");const saveImage=async()=>"/api/assets/11111111-1111-4111-8111-111111111111";const {isDesign,placementDesign,simpleDesign,orderRows,freezeUVDesign,patternTemplate,referenceConversion,referenceConversions,compileProductionDocument}=globalThis.__fitModules;`;
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const ai=await import(`data:text/javascript;base64,${Buffer.from(prelude+compiled).toString('base64')}`);
const originalFetch=globalThis.fetch,requests=[];let fixture;
globalThis.fetch=async(url,options)=>{
  assert(url.startsWith('https://api.openai.com/v1/'),'Unexpected outbound destination');
  const body=options.body instanceof FormData?Object.fromEntries(options.body.entries()):JSON.parse(options.body);requests.push({url,body});
  if(url.includes('/images/'))return Response.json({data:[{b64_json:Buffer.from('fixture').toString('base64')}]});
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(fixture)}]}]});
};
const base=domain.DEFAULT_DESIGN,asset='/api/assets/11111111-1111-4111-8111-111111111111';
const placement=p=>({...p,content:p.content||'artwork',text:p.text||'',ink:p.ink||'#ffffff'});
const plan=(changes={})=>({garment:'tee',color:'#262b34',ink:'#ffffff',text:'FIT CLUB',style:'campus',placements:domain.defaultClubPlacements().map(placement),unsupported:[],imageAction:'generate',imagePrompt:'A flat club emblem',reply:'요청한 앞뒤 배치를 반영했어요.',...changes});
try{
  fixture=plan();const generated=await ai.generateDesign('동아리명 FIT CLUB으로 로고를 만들어 왼쪽 가슴과 등판에 넣어줘',base,'owner');
  assert.equal(generated.design.placements.length,2);assert.equal(generated.design.image,asset);assert.equal(generated.imageGenerations,1);
  assert.equal(requests.filter(r=>r.url.includes('/images/')).length,1,'Reuse one asset on both sides');
  assert.equal(requests[0].body.store,false);assert.equal(requests[0].body.text.format.strict,true);assert.equal(requests.at(-1).body.n,1);
  requests.length=0;fixture=plan({imageAction:'generate',placements:generated.design.placements.map(p=>({...p,widthCm:7}))});
  const moved=await ai.generateDesign('이미지는 그대로 두고 앞뒤 배치 크기만 줄여줘',generated.design,'owner');
  assert.equal(moved.design.image,asset);assert.equal(requests.length,1,'Placement-only changes never regenerate existing art');assert(requests[0].body.input[0].content.some(c=>c.type==='input_image'));
  requests.length=0;fixture=plan({placements:[placement(domain.defaultClubPlacements()[0])]});await assert.rejects(ai.generateDesign('왼쪽 가슴과 등판에 로고',base,'owner'),/모두 준비/);assert.equal(requests.length,1,'Missing requested side must fail before image generation');
  requests.length=0;fixture=plan({imageAction:'edit'});await ai.generateDesign('이 이미지를 참고해서 로고를 새로 그려줘',{...base,image:asset},'owner');assert(requests.some(r=>r.url.endsWith('/images/edits')));
  requests.length=0;await ai.generateDesign('로고 색상을 빨간색으로 바꿔줘',{...base,image:asset},'owner');assert(requests.some(r=>r.url.endsWith('/images/edits')));
  requests.length=0;fixture=plan({garment:'hoodie'});await assert.rejects(ai.generateDesign('후드티',base,'owner'),/반팔티/);assert.equal(requests.length,1);
  requests.length=0;fixture=plan({fabric:{pattern:'stripes'}});await assert.rejects(ai.generateDesign('줄무늬',base,'owner'),/반팔티/);assert.equal(requests.length,1,'No fabric image generation path');
  requests.length=0;fixture=plan({unsupported:['민소매 형태는 준비된 3D 모델에 없어요.']});await assert.rejects(ai.generateDesign('민소매로 만들어줘',base,'owner'),/표현할 수 없는/);assert.equal(requests.length,1,'Unsupported geometry stops before image charges');
  fixture=plan({placements:[placement({...domain.defaultClubPlacements()[0],x:999})]});await assert.rejects(ai.generateDesign('잘못된 배치',base,'owner'),/규격/);
  const order={group:'Private order group',contactEmail:'qa@example.com',sizes:{S:10,M:10,L:10,XL:0},printWidthCm:18,printHeightCm:18,method:'DTF',desiredDeliveryDate:'2099-01-01',memo:''};
  for(const supplier of suppliers.SUPPLIERS){
    const design=generated.design,uv=mapping.freezeUVDesign(design,order,'test-source'),template=mapping.patternTemplate(supplier.id);
    fixture={summary:'모든 배치를 변환했어요.',productionNotes:['원본 유지'],checks:['실측 검수 필요'],conversion:mapping.referenceConversion(uv,template),conversions:mapping.referenceConversions(uv,template)};
    const quote=await ai.convertQuote(supplier,design,{...order,method:supplier.methods[0]},'owner');assert.equal(quote.production.conversions.length,2);assert.equal(quote.production.verification.status,'matched');assert(quote.emailBody.includes('30벌'));assert(quote.emailBody.includes('등판'));
    const request=requests.at(-1).body;assert(!JSON.stringify(request).includes('qa@example.com'));assert(!JSON.stringify(request).includes('Private order group'));
    fixture.conversions[1].x+=1;await assert.rejects(ai.convertQuote(supplier,design,order,'owner'),/일치하지/);fixture.conversions=fixture.conversions.slice(0,1);await assert.rejects(ai.convertQuote(supplier,design,order,'owner'),/누락/);
  }
  console.log('PASS mocked AI pipeline: intent/vision, upload reuse, front/back art, plain tees only, rejected garment/fabric expansion, unsupported geometry, 3 supplier conversions and privacy; zero live AI calls');
}finally{globalThis.fetch=originalFetch;delete globalThis.__fitModules;}
