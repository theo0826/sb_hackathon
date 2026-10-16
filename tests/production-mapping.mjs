import assert from 'node:assert/strict';
import {loadTS} from './helpers/load-ts.mjs';
const mapping=await loadTS('lib/production-mapping.ts');
const document=await loadTS('lib/production-document.ts');
const svg=await loadTS('lib/production-svg.ts');
const {DEFAULT_DESIGN}=await loadTS('lib/design.ts');
const {SUPPLIERS}=await loadTS('lib/suppliers.ts');
const baseOrder={group:'Test',contactEmail:'qa@example.com',sizes:{S:5,M:15,L:10,XL:0},desiredDeliveryDate:'2099-01-01',method:'DTF',printWidthCm:10,printHeightCm:8,memo:''};
for(const garment of ['tee','hoodie','varsity'])for(const side of ['front','back'])for(const rotation of [-30,0,30])for(const template of mapping.PATTERN_TEMPLATES){
  const design={...DEFAULT_DESIGN,garment,side,rotation,x:282,y:258};
  const source=mapping.freezeUVDesign(design,baseOrder,'source-test');
  const ref=mapping.referenceConversion(source,template);
  const packet=mapping.buildProductionPacket(source,template,ref,'sample');
  assert(packet.verification.maxDeviationMm<.0001);
  assert.equal(packet.source.artwork.source,design.image);
  assert.equal(packet.source.originalDesign.text,design.text);
  assert.equal(packet.sewing.approvedForCutting,false);
  assert.equal(ref.mirror,false);
  const physical=mapping.inverseConversion(source,template,ref), original=mapping.physicalPlacement(source);
  for(const key of Object.keys(original))assert(Math.abs(physical[key]-original[key])<.0001);
  assert.throws(()=>mapping.buildProductionPacket(source,template,{...ref,x:ref.x+1},'ai'),/일치하지/);
  assert.throws(()=>mapping.buildProductionPacket(source,template,{...ref,mirror:true},'ai'),/기준/);
  assert.throws(()=>mapping.buildProductionPacket(source,template,{...ref,sourceRevision:'different'},'ai'),/기준/);
  assert.throws(()=>mapping.buildProductionPacket(source,template,{...ref,rotation:NaN},'ai'),/기준/);
  const factory=svg.factoryPatternPayload(packet);
  assert.equal(factory.conversion.unit,template.unit);
  assert.equal(factory.panels.length,source.panels.length);
}
const source=mapping.freezeUVDesign({...DEFAULT_DESIGN,x:360},baseOrder,'edge');
const template=mapping.PATTERN_TEMPLATES[0];
assert.equal(mapping.buildProductionPacket(source,template,mapping.referenceConversion(source,template),'sample').verification.status,'needs_review');
for(const supplier of SUPPLIERS){
  const order={...baseOrder,method:supplier.methods[0]};
  const doc=document.sampleProductionDocument(supplier,DEFAULT_DESIGN,order,'saved-source');
  assert(doc.emailBody.includes('총 주문 수량: 30벌'));
  assert(doc.emailBody.includes(doc.production.conversion.panelCode));
  assert.equal(doc.production.converter,'sample');
  const artwork='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="10" y="50">SAME ART</text></svg>');
  const uv=svg.renderCustomerUV(doc.production.source,artwork),pattern=svg.renderFactoryPattern(doc.production,artwork);
  assert(uv.includes('고객 확인용 UV'));assert(pattern.includes('봉제'));assert(pattern.includes('재단 승인 전'));
  assert(uv.includes(artwork));assert(pattern.includes(artwork));
  assert.equal(svg.factoryPatternPayload(doc.production).format,['JW_CUT_PRINT_V1','WC_NECK_PLACEMENT_V1','JM_PANEL_PACKAGE_V1'][SUPPLIERS.indexOf(supplier)]);
}
console.log('PASS 54 garment/side/rotation/template mappings, units/origins, artwork preservation, changed design rejection, sewing mockup fields and three exports');
