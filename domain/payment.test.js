import test from 'node:test';
import assert from 'node:assert/strict';
import { toPaise } from './gst.js';
import { derivePaymentState } from './payment.js';

const today = new Date('2026-10-07T12:00:00');

test('marks a full payment as paid with zero balance',()=>{
  const x=derivePaymentState(toPaise('1180'),toPaise('1180'),'2026-10-20',today);
  assert.equal(x.status,'Paid'); assert.equal(x.balance,0n);
});
test('tracks partial payments precisely',()=>{
  const x=derivePaymentState(toPaise('1180'),toPaise('500.25'),'2026-10-20',today);
  assert.equal(x.status,'Partially Paid'); assert.equal(x.balance,67975n);
});
test('marks an unpaid invoice overdue after the due date',()=>{
  const x=derivePaymentState(toPaise('1180'),0n,'2026-10-01',today);
  assert.equal(x.status,'Overdue'); assert.equal(x.balance,118000n);
});
test('does not classify a due-today invoice as overdue during that day',()=>{
  const x=derivePaymentState(toPaise('1180'),0n,'2026-10-07',today);
  assert.equal(x.status,'Unpaid');
});
