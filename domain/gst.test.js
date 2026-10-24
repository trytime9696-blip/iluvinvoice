import test from 'node:test';
import assert from 'node:assert/strict';
import { toPaise, formatPaise, paiseToDecimal, calculateLine, calculateInvoice, amountInWords } from './gst.js';
const item=(overrides={})=>({name:'Design',qty:'1',rate:'1000.00',discount:'0',gst:18,cess:0,...overrides});

test('parses and formats rupees using integer paise',()=>{
  assert.equal(toPaise('1,234.56'),123456n);
  assert.equal(toPaise('0.01'),1n);
  assert.equal(formatPaise(123456n),'₹1,234.56');
  assert.equal(paiseToDecimal(123456n),'1234.56');
});
test('line math applies quantity, amount discount, tax, and cess exactly',()=>{
  const x=calculateLine(item({qty:'2.5',rate:'100.00',discount:'25.00',gst:18,cess:1}));
  assert.equal(x.gross,25000n);
  assert.equal(x.discount,2500n);
  assert.equal(x.taxable,22500n);
  assert.equal(x.tax,4050n);
  assert.equal(x.cess,225n);
  assert.equal(x.total,26775n);
});
test('percentage discount uses basis point arithmetic',()=>{
  const x=calculateLine(item({rate:'199.99',discount:'5%',gst:18}));
  assert.equal(x.discount,1000n);
  assert.equal(x.taxable,18999n);
  assert.equal(x.tax,3420n);
  assert.equal(x.total,22419n);
});
test('splits same-state GST into CGST and SGST',()=>{
  const x=calculateInvoice([item({rate:'1000'})],'Uttar Pradesh','Uttar Pradesh');
  assert.equal(x.cgst,9000n);
  assert.equal(x.sgst,9000n);
  assert.equal(x.igst,0n);
  assert.equal(x.grand,118000n);
});
test('uses IGST for a different place of supply',()=>{
  const x=calculateInvoice([item({rate:'1000'})],'Uttar Pradesh','Delhi');
  assert.equal(x.cgst,0n);
  assert.equal(x.sgst,0n);
  assert.equal(x.igst,18000n);
  assert.equal(x.grand,118000n);
});
test('rounds invoice total to nearest rupee and retains round-off',()=>{
  const x=calculateInvoice([item({rate:'10.10',gst:5})],'UP','Delhi');
  assert.equal(x.igst,51n);
  assert.equal(x.round,39n);
  assert.equal(x.grand,1100n);
});
test('computes paid and balance without floating point',()=>{
  const x=calculateInvoice([item({rate:'1000'})],'UP','Delhi','50.00');
  assert.equal(x.paid,5000n);
  assert.equal(x.balance,113000n);
});
test('converts Indian currency values into words',()=>{
  assert.equal(amountInWords(1234567889n),'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees and Eighty Nine Paise Only');
  assert.equal(amountInWords(0n),'Zero Rupees Only');
});
