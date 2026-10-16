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
