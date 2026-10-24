import { toPaise } from './gst.js';

export function derivePaymentState(totalPaise, paidPaise, dueDate, now = new Date()) {
  const total = BigInt(totalPaise || 0);
  const paid = BigInt(paidPaise || 0);
  const balance = total > paid ? total - paid : 0n;
  const due = dueDate ? new Date(`${dueDate}T23:59:59`) : null;
  const overdue = due && !Number.isNaN(due.getTime()) && due < now;
  const status = paid >= total ? 'Paid' : paid > 0n ? 'Partially Paid' : overdue ? 'Overdue' : 'Unpaid';
  return { total, paid, balance, status };
}

export function invoiceBalance(invoice) {
  const total = toPaise(invoice.amount || '0');
  const paid = invoice.status === 'Paid' ? total : toPaise(invoice.paid || '0');
  return derivePaymentState(total, paid, invoice.due);
}
