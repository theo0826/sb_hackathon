import assert from 'node:assert/strict';
import { loadTS } from './helpers/load-ts.mjs';
const flow = await loadTS('lib/order-workflow.ts');
const { DEFAULT_ORDER, todayKST } = await loadTS('lib/quote.ts');
const { SUPPLIERS } = await loadTS('lib/suppliers.ts');

const roster = flow.parseRosterCSV('\uFEFF이름,사이즈,이니셜\r\n"서,성북",m,"A""B"\r\n홍길동,XL,HGD\r\n');
assert.equal(roster[0].name, '서,성북');
assert.equal(roster[0].initials, 'A"B');
assert.deepEqual(flow.rosterSizes(roster), { S: 0, M: 1, L: 0, XL: 1 });
assert.throws(() => flow.parseRosterCSV('이름,사이즈\n"끝나지 않은 이름,M'), /따옴표/);
assert.throws(() => flow.parseRosterCSV('이름,학과\n김성북,디자인'), /사이즈/);
assert.throws(() => flow.parseRosterCSV('이름,사이즈\n' + '이름,M\n'.repeat(501)), /500/);
assert.equal(flow.rosterIssues({ name: '', size: 'XXL', initials: '' }, true).length, 3);

const validOrder = { ...DEFAULT_ORDER, group: '검증팀', contactEmail: 'qa@example.com', desiredDeliveryDate: todayKST() };
const validDetails = { ...flow.EMPTY_DETAILS, delivery: 'pickup', confirmed: true };
assert.deepEqual(flow.reviewIssues(validOrder, validDetails), []);
assert(flow.reviewIssues(validOrder, { ...validDetails, confirmed: false }).some(s => s.includes('체크')));
assert(flow.reviewIssues(validOrder, { ...validDetails, delivery: 'shipping', address: '' }).some(s => s.includes('주소')));
assert(flow.reviewIssues({ ...validOrder, desiredDeliveryDate: '2020-01-01' }, validDetails).some(s => s.includes('수령일')));
assert(flow.reviewIssues({ ...validOrder, desiredDeliveryDate: '2030-02-30' }, validDetails).some(s => s.includes('수령일')));
assert(flow.reviewIssues(validOrder, { ...validDetails, useRoster: true, roster: [] }).some(s => s.includes('명단')));
assert(flow.reviewIssues(validOrder, { ...validDetails, useRoster: true, requireInitials: true, roster: [{ id: 'a', name: '김성북', size: 'M', initials: '' }] }).some(s => s.includes('명단')));
const price = flow.estimate(SUPPLIERS[0], validOrder);
const { GARMENT_PRICING, pricingGarment } = await loadTS('lib/garment-pricing.ts');
const { isOrderDraft } = await loadTS('lib/quote.ts');
assert.equal(GARMENT_PRICING.length, 6);
assert(!GARMENT_PRICING.some(item => item.id === 'puffer'));
const historicalPufferOrder = { ...validOrder, pricingGarment: 'puffer' };
assert(isOrderDraft(historicalPufferOrder), 'Removing a choice must not discard existing orders');
assert.equal(flow.estimate(SUPPLIERS[0], historicalPufferOrder).unit, price.unit + 65000);
for (const item of GARMENT_PRICING) {
  assert.equal(pricingGarment(item.id).label, item.label);
  const estimate = flow.estimate(SUPPLIERS[0], { ...validOrder, pricingGarment: item.id });
  assert.equal(estimate.unit, price.unit + item.adjustment);
  assert.equal(estimate.total, estimate.unit * 25);
}
assert.equal(price.total, price.unit * 25);
assert(flow.estimate(SUPPLIERS[0], { ...validOrder, sizes: { S: 50, M: 0, L: 0, XL: 0 } }).unit < price.unit);
console.log('PASS roster CSV quoting/BOM/limits, quantities, missing initials, date/address/confirmation guards, demo price arithmetic; no network or AI calls');

const { orderQuote, orderQuoteId } = await loadTS('lib/order-documents.ts');
const { isQuoteRecord } = await loadTS('lib/quote.ts');
const { DEFAULT_DESIGN } = await loadTS('lib/design.ts');
const savedOrder = { id:'demo_11111111-1111-4111-8111-111111111111', createdAt:'2026-01-01T00:00:00.000Z', supplierId:SUPPLIERS[0].id, design:DEFAULT_DESIGN, order:validOrder, details:validDetails, filename:'', received:false };
const before = JSON.stringify(savedOrder);
for (const supplier of SUPPLIERS) {
  const quote = orderQuote({ ...savedOrder, supplierId:supplier.id });
  assert(isQuoteRecord(quote));
  assert.equal(quote.sourceOrderId, savedOrder.id);
  assert.equal(quote.id, orderQuoteId(savedOrder));
  assert.equal(quote.format, supplier.format);
  assert.equal(quote.quantity, 25);
  assert.equal(quote.document.generatedAt, savedOrder.createdAt);
  assert.equal(quote.document.production.converter, 'sample');
  assert.deepEqual(quote.design, savedOrder.design);
  assert.deepEqual(quote.order, savedOrder.order);
}
assert.equal(orderQuote({...savedOrder,quoteTrashedAt:'2026-10-16T00:00:00.000Z'}).trashedAt,'2026-10-16T00:00:00.000Z');
assert.equal(orderQuote({...savedOrder,quoteTrashedAt:null}).trashedAt,null);
assert.equal(JSON.stringify(savedOrder),before,'Document generation must not change saved orders');
assert.deepEqual(orderQuote(savedOrder),orderQuote(savedOrder),'Stable IDs and document timestamps on reload');
console.log('PASS existing saved orders produce stable supplier-specific request/material documents, preserve snapshots, and retain trash/restore state');

const { sampleProductionDocument } = await loadTS('lib/production-document.ts');
const { isQuoteDocument } = await loadTS('lib/quote.ts');
const preparedQuote = { ...orderQuote(savedOrder), id:'quote_22222222-2222-4222-8222-222222222222', mode:'live', document:sampleProductionDocument(SUPPLIERS[0], DEFAULT_DESIGN, validOrder, 'review-test') };
preparedQuote.document.summary = '실제로 확인한 업체 맞춤 도안';
assert(isQuoteDocument(preparedQuote.document));
assert(!isQuoteDocument({ ...preparedQuote.document, verifiedRows:[null] }));
assert(flow.reviewedOrderIssues(savedOrder, undefined, true).some(s => s.includes('먼저 생성')));
assert(flow.reviewedOrderIssues(savedOrder, { ...preparedQuote, document:undefined }, true).some(s => s.includes('먼저 생성')));
assert(flow.reviewedOrderIssues(savedOrder, preparedQuote, false).some(s => s.includes('체크')));
assert.deepEqual(flow.reviewedOrderIssues(savedOrder, preparedQuote, true), []);
for (const patch of [{ supplierId:SUPPLIERS[1].id }, { filename:'다른 파일.png' }, { design:{ ...DEFAULT_DESIGN, text:'바뀐 도안' } }, { order:{ ...validOrder, memo:'바뀐 요청' } }]) {
  assert(flow.reviewedOrderIssues({ ...savedOrder, ...patch }, preparedQuote, true).some(s => s.includes('다시 생성')));
}
const reordered = Object.fromEntries(Object.entries(validOrder).reverse());
assert.deepEqual(flow.reviewedOrderIssues({ ...savedOrder, order:reordered }, preparedQuote, true), []);
const reviewedOrder = { ...savedOrder, preparedQuote };
assert(flow.isDemoOrder(reviewedOrder));
assert(!flow.isDemoOrder({ ...reviewedOrder, preparedQuote:{ ...preparedQuote, document:undefined } }));
const documentSnapshot = orderQuote(reviewedOrder);
assert.equal(documentSnapshot.id, preparedQuote.id);
assert.equal(documentSnapshot.mode, 'live');
assert.deepEqual(documentSnapshot.document, preparedQuote.document);
assert.equal(documentSnapshot.sourceOrderId, savedOrder.id);
documentSnapshot.document.summary = '수정된 복사본';
assert.equal(preparedQuote.document.summary, '실제로 확인한 업체 맞춤 도안');
assert.equal(orderQuote({ ...reviewedOrder, quoteTrashedAt:null }).trashedAt, null);
console.log('PASS orders require a generated supplier document, explicit approval and matching snapshots; approved document and ID survive order storage unchanged');
