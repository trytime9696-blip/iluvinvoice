// Shape checks for Water Plant data before it is written to disk.
const LIMITS = { customers: 5000, payments: 100000, expenses: 50000, staff: 500 };
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

export function validateWaterData(value) {
  if (!isObj(value)) return 'Invalid data';
  for (const [key, max] of Object.entries(LIMITS)) {
    if (value[key] === undefined) continue;
    if (!Array.isArray(value[key])) return `Invalid ${key}`;
    if (value[key].length > max) return `Too many ${key}`;
    if (value[key].some(x => !isObj(x))) return `Invalid ${key} entry`;
  }
  for (const key of ['business', 'deliveries', 'monthlyPending', 'invoiceExtras', 'billingRuns', 'billNumbers', 'inventory', 'notes']) {
    if (value[key] !== undefined && !isObj(value[key])) return `Invalid ${key}`;
  }
  for (const date of Object.keys(value.deliveries || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObj(value.deliveries[date])) return 'Invalid delivery date';
  }
  if ((value.customers || []).some(c => typeof c.id !== 'string' || c.id.length > 64)) return 'Invalid customer id';
  return null;
}
