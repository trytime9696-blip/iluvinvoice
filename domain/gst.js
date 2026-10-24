// Exact monetary helpers for Setu's preview domain. Values are integer paise (BigInt).
// This module supplies arithmetic only; production must inject current, reviewed tax rules.
export function toPaise(value) {
  let text = String(value ?? '0').trim();
  if (!text) return 0n;
  const negative = text.startsWith('-');
  text = text.replace(/[₹,\s]/g, '').replace('-', '');
  if (!/^\d*(\.\d*)?$/.test(text)) return 0n;
  const [whole, fraction = ''] = text.split('.');
  const amount = BigInt(whole || '0') * 100n + BigInt((fraction + '00').slice(0, 2));
  return negative ? -amount : amount;
}
export function roundDiv(a, b) {
  if (b === 0n) return 0n;
  const negative = (a < 0n) !== (b < 0n);
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  const quotient = (a + b / 2n) / b;
  return negative ? -quotient : quotient;
}
export function paiseToDecimal(paise) { const amount=BigInt(paise||0); const negative=amount<0n; const absolute=negative?-amount:amount; return `${negative?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`; }
export function formatPaise(paise, compact = false) {
  const amount = BigInt(paise || 0);
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const rupees = abs / 100n;
  const cents = String(abs % 100n).padStart(2, '0');
  if (compact && rupees >= 100000n) {
    const lakhs = Number(rupees) / 100000;
    return `${negative ? '−' : ''}₹${lakhs.toFixed(1)}L`;
  }
  return `${negative ? '−' : ''}₹${rupees.toLocaleString('en-IN')}.${cents}`;
}
function rateBps(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0n;
  return BigInt(Math.round(parsed * 100));
}
export function calculateLine(item) {
  const quantityHundredths = toPaise(item.qty || '0');
  const ratePaise = toPaise(item.rate || '0');
  const gross = roundDiv(quantityHundredths * ratePaise, 100n);
  const discountText = String(item.discount || '0').trim();
  let discount = discountText.endsWith('%')
    ? roundDiv(gross * BigInt(Math.round(parseFloat(discountText) * 100 || 0)), 10000n)
    : toPaise(discountText);
  if (discount < 0n) discount = 0n;
  if (discount > gross) discount = gross;
  const taxable = gross - discount;
  const tax = roundDiv(taxable * rateBps(item.gst), 10000n);
  const cess = roundDiv(taxable * rateBps(item.cess), 10000n);
  return { gross, discount, taxable, tax, cess, total: taxable + tax + cess };
}
export function calculateInvoice(items, supplierState, placeOfSupply, paid = '0') {
  const sum = { gross: 0n, discount: 0n, taxable: 0n, cgst: 0n, sgst: 0n, igst: 0n, cess: 0n, total: 0n };
  for (const item of items || []) {
    const line = calculateLine(item);
    sum.gross += line.gross;
    sum.discount += line.discount;
    sum.taxable += line.taxable;
    sum.cess += line.cess;
    if (placeOfSupply && supplierState && placeOfSupply === supplierState) {
      // Deterministic allocation of any odd paise; total GST remains exact.
      sum.cgst += line.tax / 2n;
      sum.sgst += line.tax - line.tax / 2n;
    } else {
      sum.igst += line.tax;
    }
    sum.total += line.total;
  }
  const beforeRound = sum.taxable + sum.cgst + sum.sgst + sum.igst + sum.cess;
  sum.round = roundDiv(beforeRound, 100n) * 100n - beforeRound;
  sum.grand = beforeRound + sum.round;
  sum.paid = toPaise(paid);
  sum.balance = sum.grand > sum.paid ? sum.grand - sum.paid : 0n;
  return sum;
}
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function underThousand(n) {
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : '');
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${underThousand(n % 100)}` : ''}`;
}
export function amountInWords(paise) {
  let value = BigInt(paise || 0);
  const negative = value < 0n;
  if (negative) value = -value;
  let rupees = value / 100n;
  const cents = Number(value % 100n);
  if (!rupees) return `${negative ? 'Minus ' : ''}Zero Rupees${cents ? ` and ${underThousand(cents)} Paise` : ''} Only`;
  const chunks = [];
  const groups = [[1000n, ''], [100n, 'Thousand'], [100n, 'Lakh'], [100n, 'Crore'], [100n, 'Arab'], [100n, 'Kharab']];
  for (let i = 0; rupees > 0n && i < groups.length; i++) {
    const [base, unit] = groups[i];
    const chunk = rupees % base;
    if (chunk) chunks.unshift(`${underThousand(Number(chunk))}${unit ? ` ${unit}` : ''}`);
    rupees /= base;
  }
  if (rupees > 0n) chunks.unshift(rupees.toLocaleString('en-IN'));
  return `${negative ? 'Minus ' : ''}${chunks.join(' ')} Rupees${cents ? ` and ${underThousand(cents)} Paise` : ''} Only`;
}
