import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoice, calculateLine, amountInWords, formatPaise } from './gst.js';
const item = (o = {}) => ({ name: 'Item', qty: '1', rate: '1000', discount: '0', gst: 18, cess: 0, ...o });

test('homepage demo invoice: ₹12,000 at 18% same state totals ₹14,160', () => {
  const x = calculateInvoice([item({ qty: '4', rate: '3000' })], 'Uttar Pradesh', 'Uttar Pradesh');
  assert.equal(x.taxable, 1200000n);
  assert.equal(x.cgst, 108000n);
  assert.equal(x.sgst, 108000n);
  assert.equal(x.igst, 0n);
  assert.equal(x.grand, 1416000n);
  assert.equal(amountInWords(x.grand), 'Fourteen Thousand One Hundred Sixty Rupees Only');
});
test('inter-state supply uses IGST only', () => {
  const x = calculateInvoice([item({ qty: '4', rate: '3000' })], 'Uttar Pradesh', 'Maharashtra');
  assert.equal(x.cgst + x.sgst, 0n);
  assert.equal(x.igst, 216000n);
  assert.equal(x.grand, 1416000n);
});
test('non-GST invoice (0%) has no tax and total equals taxable', () => {
  const x = calculateInvoice([item({ gst: 0, qty: '3', rate: '499.50' })], 'Delhi', 'Delhi');
  assert.equal(x.cgst + x.sgst + x.igst, 0n);
  assert.equal(x.taxable, 149850n);
  assert.equal(x.round, 50n);
  assert.equal(x.grand, 149900n);
});
test('odd paise CGST/SGST split never loses a paisa', () => {
  const x = calculateInvoice([item({ rate: '10.01', gst: 5 })], 'Bihar', 'Bihar');
  assert.equal(x.cgst + x.sgst, calculateLine(item({ rate: '10.01', gst: 5 })).tax);
  assert.ok(x.sgst - x.cgst <= 1n);
});
test('discount larger than line value is capped at the line value', () => {
  const x = calculateLine(item({ rate: '100', discount: '500' }));
  assert.equal(x.taxable, 0n);
  assert.equal(x.total, 0n);
});
test('rounding to nearest rupee is symmetric and exact', () => {
  const up = calculateInvoice([item({ rate: '100.50', gst: 0 })], 'Goa', 'Goa');
  const down = calculateInvoice([item({ rate: '100.49', gst: 0 })], 'Goa', 'Goa');
  assert.equal(up.grand, 10100n);
  assert.equal(down.grand, 10000n);
  assert.equal(down.round, -49n);
});
test('lakh/crore formatting and words', () => {
  assert.equal(formatPaise(1234567800n), '₹1,23,45,678.00');
  assert.equal(amountInWords(1000000000n), 'One Crore Rupees Only');
  assert.equal(amountInWords(150n), 'One Rupees and Fifty Paise Only');
});
test('payments larger than total never create a negative balance', () => {
  const x = calculateInvoice([item()], 'Kerala', 'Kerala', '5000');
  assert.equal(x.balance, 0n);
});
