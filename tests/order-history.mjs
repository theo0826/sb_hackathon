import assert from 'node:assert/strict';
import { loadTS } from './helpers/load-ts.mjs';
const { orderHistory } = await loadTS('lib/order-history.ts');
const { orderQuote } = await loadTS('lib/order-documents.ts');
const { DEFAULT_DESIGN } = await loadTS('lib/design.ts');
const { DEFAULT_ORDER } = await loadTS('lib/quote.ts');
const { EMPTY_DETAILS } = await loadTS('lib/order-workflow.ts');
const create = (id, group, createdAt) => ({ id:`demo_${id}`, createdAt, supplierId:'jangwi', design:structuredClone(DEFAULT_DESIGN), order:{...structuredClone(DEFAULT_ORDER),group}, details:structuredClone(EMPTY_DETAILS), filename:'',received:false,deliveryStatus:'recorded' });
const orders = [create('first','같은 업체 첫 주문','2026-10-28T00:00:00.000Z'),create('second','같은 업체 두 번째 주문','2026-10-29T00:00:00.000Z')];
for (const [index, order] of orders.entries()) {
  order.preparedQuote = orderQuote(order);
  order.preparedQuote.clothCapture = { front:`front-${index}`,back:`back-${index}` };
}
const [first,second] = orders.map(orderQuote);
const standalone = {...structuredClone(second),id:'quote_standalone',sourceOrderId:undefined,supplierId:'jeongneung',order:{...second.order,group:'별도 요청서'}};
const before = structuredClone({orders,first,second,standalone});
const entries = orderHistory(orders,[second,standalone,first]);
assert.equal(entries.length,3,'Linked documents appear once, alongside requests without an order');
for (const [index,order] of orders.entries()) {
  const entry = entries.find(entry=>entry.orderId===order.id);
  assert.equal(entry.request.sourceOrderId,order.id);
  assert.equal(entry.request.order.group,order.order.group);
  assert.equal(entry.request.clothCapture.front,`front-${index}`,'Same supplier orders keep their own captures');
  assert.equal(entry.status,'delivered');
}
assert.equal(entries.find(entry=>entry.id==='quote_standalone').status,'saved');
assert.equal(entries.find(entry=>entry.id==='quote_standalone').request.supplierId,'jeongneung');
const trashed = orderHistory([{...orders[0],quoteTrashedAt:'2026-10-29T00:00:00.000Z'},orders[1]],[{...first,trashedAt:'2026-10-29T00:00:00.000Z'},second,{...standalone,trashedAt:'2026-10-29T00:00:00.000Z'}]);
assert.equal(trashed.length,2,'Trashing a standalone request hides it, but preserves orders');
assert.equal(trashed.find(entry=>entry.orderId===orders[0].id).request,undefined);
assert(trashed.find(entry=>entry.orderId===orders[1].id).request);
assert.equal(orderHistory(orders,[first,second]).find(entry=>entry.orderId===orders[0].id).request.id,first.id,'Restored documents return to the original order');
assert.deepEqual({orders,first,second,standalone},before,'Grouping does not change saved snapshots');
console.log('PASS unified order/request history: same-supplier orders retain exact document/capture associations, no duplicate linked rows, standalone requests, trash and restore.');
