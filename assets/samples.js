(() => {
  const grid = document.querySelector('[data-sample-grid]');
  if (!grid) return;
  const fmt = p => (p < 0 ? '−' : '') + '₹' + (Math.abs(p) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  const three = n => (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : '');
  const words = rupees => {
    if (!rupees) return 'Zero Rupees Only';
    const parts = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']]; let n = rupees, out = [];
    for (const [v, w] of parts) if (n >= v) { out.push(three(Math.floor(n / v)) + ' ' + w); n %= v; }
    if (n) out.push(three(n));
    return out.join(' ') + ' Rupees Only';
  };
  const calc = (lines, intra) => {
    let taxable = 0, tax = 0;
    const rows = lines.map(l => { const gross = Math.round(l.qty * l.rate * 100), amt = gross - Math.round((l.disc || 0) * 100), t = Math.round(amt * (l.gst || 0) / 100); taxable += amt; tax += t; return { ...l, gross, amt, t }; });
    const cgst = intra ? Math.floor(tax / 2) : 0, sgst = intra ? tax - cgst : 0, igst = intra ? 0 : tax, raw = taxable + tax, grand = Math.round(raw / 100) * 100;
    return { rows, taxable, cgst, sgst, igst, tax, round: grand - raw, grand };
  };

  const S = [
    { id: 'tax-intra', cat: 'gst', tpl: 'modern', a: '#2563eb', type: 'Tax Invoice', label: 'Printing studio · same state', no: 'INV/26-27/0142', date: '24 Oct 2026', seller: ['Aarav Print Studio', 'Hazratganj, Lucknow, Uttar Pradesh 226001', '09ABCDE1234F1Z5'], buyer: ['Rahul Enterprises', 'Civil Lines, Kanpur, Uttar Pradesh', '09PQRSX5678K1Z2'], pos: 'Uttar Pradesh (09)', intra: true, lines: [{ name: 'Flex banner printing 6×3 ft', code: '4911', qty: 4, rate: 2500, gst: 18 }, { name: 'Design charges', code: '998391', qty: 1, rate: 2000, gst: 18 }], upi: 'aarav@upi', notes: 'Thank you for your business.' },
    { id: 'tax-inter', cat: 'gst', tpl: 'ocean', a: '#0e7490', type: 'Tax Invoice', label: 'Freelance developer · other state (IGST)', no: 'PC-2026-031', date: '20 Oct 2026', seller: ['Pixel & Code · Ananya Rao', 'Indiranagar, Bengaluru, Karnataka 560038', '29AKPPR4821M1Z9'], buyer: ['Nimbus Retail Pvt Ltd', 'Andheri East, Mumbai, Maharashtra', '27AAHCN7314Q1Z4'], pos: 'Maharashtra (27)', intra: false, lines: [{ name: 'Website design & development', code: '998314', qty: 1, rate: 45000, gst: 18 }, { name: 'Hosting & domain setup', code: '998315', qty: 1, rate: 5000, gst: 18 }], upi: 'ananya.rao@okaxis', notes: 'Payment due within 15 days. Bank: HDFC Bank, A/c XXXX4821, IFSC HDFC0000123.' },
    { id: 'bill-supply', cat: 'nogst', tpl: 'minimal', a: '#0f172a', type: 'Bill of Supply', label: 'Kirana store · composition dealer', no: 'BOS-0874', date: '25 Oct 2026', seller: ['Shree Kirana Store', 'Rajwada, Indore, Madhya Pradesh 452002', '23BHMPS6620C1Z1'], buyer: ['Mehta Family', 'Vijay Nagar, Indore', ''], pos: 'Madhya Pradesh (23)', intra: true, lines: [{ name: 'Basmati rice 25 kg bag', code: '1006', qty: 1, rate: 1450 }, { name: 'Chakki atta 10 kg', code: '1101', qty: 2, rate: 420 }, { name: 'Toor dal 1 kg', code: '0713', qty: 2, rate: 160 }], notes: 'Composition taxable person, not eligible to collect tax on supplies.' },
    { id: 'proforma', cat: 'gst', tpl: 'corporate', a: '#1e3a8a', type: 'Proforma Invoice', label: 'Steel fabricator · advance quote', no: 'PI-2026-019', date: '22 Oct 2026', seller: ['Sai Steel Fabricators', 'Bhosari MIDC, Pune, Maharashtra 411026', '27ACXFS2290L1Z7'], buyer: ['Green Build Infra LLP', 'College Road, Nashik, Maharashtra', '27AAJFG8817B1Z3'], pos: 'Maharashtra (27)', intra: true, lines: [{ name: 'MS sliding gate 12×6 ft, powder coated', code: '7308', qty: 2, rate: 18500, gst: 18 }], notes: '50% advance to confirm order. Valid for 15 days. Final tax invoice on dispatch.' },
    { id: 'quotation', cat: 'gst', tpl: 'elegant', a: '#7c2d12', type: 'Quotation', label: 'AC service company · estimate', no: 'QT-1188', date: '18 Oct 2026', seller: ['CoolAir AC Services', 'Malviya Nagar, Jaipur, Rajasthan 302017', '08AFRPC3345H1Z6'], buyer: ['Hotel Rajmahal', 'MI Road, Jaipur, Rajasthan', '08AABFH9021E1Z8'], pos: 'Rajasthan (08)', intra: true, lines: [{ name: 'Split AC deep servicing', code: '998717', qty: 12, rate: 650, gst: 18 }, { name: 'Gas refill R32 (per unit)', code: '998717', qty: 3, rate: 2200, gst: 18 }], notes: 'Quotation valid for 30 days. Work completed within 2 days of approval.' },
    { id: 'credit-note', cat: 'notes', tpl: 'burgundy', a: '#881337', type: 'Credit Note', label: 'Garment wholesaler · goods returned', no: 'CN-26-007', date: '23 Oct 2026', ref: 'Against INV/26-27/0391 dated 10 Oct 2026', seller: ['Trendz Garments', 'Ring Road, Surat, Gujarat 395002', '24AAKFT5512N1Z0'], buyer: ['Style Hub', 'CG Road, Ahmedabad, Gujarat', '24BKZPS7743D1Z5'], pos: 'Gujarat (24)', intra: true, lines: [{ name: 'Cotton kurti (returned — size issue)', code: '6204', qty: 5, rate: 640, gst: 5 }], notes: 'Amount adjusted against your next purchase.' },
    { id: 'debit-note', cat: 'notes', tpl: 'graphite', a: '#27272a', type: 'Debit Note', label: 'Packaging maker · price revision', no: 'DN-26-003', date: '21 Oct 2026', ref: 'Against INV-2026-0718 dated 02 Oct 2026', seller: ['Prime Packaging Co.', 'Sector 63, Noida, Uttar Pradesh 201301', '09AAPFP4410R1Z2'], buyer: ['FreshBite Foods', 'Okhla Phase II, New Delhi, Delhi', '07AADCF6634J1Z9'], pos: 'Delhi (07)', intra: false, lines: [{ name: '5-ply corrugated box — rate revision', code: '4819', qty: 1000, rate: 1.5, gst: 12 }], notes: 'Paper price increase as agreed on 30 Sep 2026.' },
    { id: 'challan', cat: 'notes', tpl: 'classic', a: '#374151', type: 'Delivery Challan', label: 'Electrical supplier · goods to site', no: 'DC-0452', date: '26 Oct 2026', challan: true, seller: ['Om Electricals', 'Boring Road, Patna, Bihar 800001', '10AAEPO2271G1Z4'], buyer: ['Sunrise Apartments (Site)', 'Bailey Road, Patna, Bihar', ''], pos: 'Bihar (10)', intra: true, lines: [{ name: 'FR copper wire 1.5 sq mm (90 m roll)', code: '8544', qty: 10, rate: 1850 }, { name: 'Modular switch 6A', code: '8536', qty: 50, rate: 85 }], notes: 'Goods sent on approval. Not a sale. Tax invoice will follow on acceptance.' },
    { id: 'water', cat: 'water', tpl: 'water', a: '#0369a1', type: 'Monthly Water Supply Bill', label: 'RO water plant · 20L jars', no: 'RO-202610-0001', date: '31 Oct 2026', water: { month: 'October 2026', rate: 25, pending: 20000, paid: 50000, days: [2, 1, 2, 0, 2, 1, 2, 2, 1, 0, 2, 2, 1, 2, 2, 1, 0, 2, 1, 2, 2, 1, 2, 0, 2, 2, 1, 2, 2, 1, 0] }, seller: ['Shree Ganga RO Plant', 'Aliganj, Lucknow, Uttar Pradesh', ''], buyer: ['Sharma Traders', 'Kapoorthala, Lucknow · 98XXXXXX21', ''], upi: 'gangaro@upi', notes: 'Please return empty jars on every delivery.' },
    { id: 'salon', cat: 'gst', tpl: 'teal', a: '#0f766e', type: 'Tax Invoice', label: 'Salon & spa · with discount', no: 'GS/0921', date: '19 Oct 2026', seller: ['Glow Salon & Spa', 'Sector 17, Chandigarh 160017', '04AAQFG1180P1Z3'], buyer: ['Priya Kapoor', 'Sector 35, Chandigarh', ''], pos: 'Chandigarh (04)', intra: true, ut: true, lines: [{ name: 'Bridal makeup package', code: '999721', qty: 1, rate: 12000, disc: 1000, gst: 18 }, { name: 'Hair spa', code: '999721', qty: 2, rate: 1500, gst: 18 }], upi: 'glowsalon@ybl', notes: 'Festive offer: ₹1,000 off on bridal package.' }
  ];

  const qr = () => '<i class="sq"></i>';
  const party = (h, p) => `<div class="si-party"><small>${h}</small><b>${esc(p[0])}</b><span>${esc(p[1])}</span>${p[2] ? `<span>GSTIN ${esc(p[2])}</span>` : ''}</div>`;
  function invoice(x) {
    const head = `<header class="si-head"><div><b class="si-logo">${esc(x.seller[0][0])}</b><div><strong>${esc(x.seller[0])}</strong><small>${esc(x.seller[1])}</small>${x.seller[2] ? `<small>GSTIN ${esc(x.seller[2])}</small>` : ''}</div></div><div class="si-meta"><em>${esc(x.type.toUpperCase())}</em><b>${esc(x.no)}</b><small>${esc(x.date)}</small></div></header>`;
    const foot = `<p class="si-sig">Authorised signatory</p><footer class="si-foot">Powered by iluvinvoice.net</footer><span class="si-sample">SAMPLE</span>`;
    if (x.water) {
      const w = x.water, jars = w.days.reduce((a, b) => a + b, 0), charge = jars * w.rate * 100, pay = charge + w.pending - w.paid;
      return `<article class="sinv t-${x.tpl}" style="--a:${x.a}">${head}<div class="si-parties">${party('BILL TO', x.buyer)}<div class="si-party"><small>BILLING MONTH</small><b>${w.month}</b><span>20L jar · ₹${w.rate} per jar</span></div></div>
      <div class="si-cal">${w.days.map((q, i) => `<i class="${q ? 'on' : ''}"><small>${i + 1}</small>${q || '–'}</i>`).join('')}</div>
      <div class="si-bottom"><div class="si-pay"><span class="si-qr">${qr()}</span><div><small>SCAN TO PAY</small><b>${esc(x.upi)}</b><span>${fmt(pay)}</span></div></div>
      <dl class="si-sum"><div><dt>${jars} jars × ₹${w.rate}</dt><dd>${fmt(charge)}</dd></div><div><dt>Previous pending</dt><dd>${fmt(w.pending)}</dd></div><div><dt>Payment received</dt><dd>${fmt(-w.paid)}</dd></div><div class="si-total"><dt>Final payable</dt><dd>${fmt(pay)}</dd></div></dl></div>
      <p class="si-words">${words(pay / 100)}</p><p class="si-notes">${esc(x.notes)}</p>${foot}</article>`;
    }
    const c = calc(x.lines, x.intra), hasGst = c.tax > 0, sg = x.ut ? 'UTGST' : 'SGST', rate = x.lines[0].gst || 0;
    const rows = c.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}<small>${/^99/.test(r.code) ? 'SAC' : 'HSN'} ${r.code}</small></td><td>${r.qty.toLocaleString('en-IN')}</td><td>${fmt(Math.round(r.rate * 100))}</td>${r.disc ? `<td>${fmt(-r.disc * 100)}</td>` : '<td>—</td>'}<td>${hasGst ? r.gst + '%' : '—'}</td><td>${fmt(r.amt)}</td></tr>`).join('');
    const taxRows = !hasGst ? (x.challan ? '' : '<div><dt>GST</dt><dd>Not charged</dd></div>') : x.intra ? `<div><dt>CGST @ ${rate / 2}%</dt><dd>${fmt(c.cgst)}</dd></div><div><dt>${sg} @ ${rate / 2}%</dt><dd>${fmt(c.sgst)}</dd></div>` : `<div><dt>IGST @ ${rate}%</dt><dd>${fmt(c.igst)}</dd></div>`;
    const totalLabel = x.challan ? 'Total value (not a sale)' : x.type === 'Credit Note' ? 'Total credit' : x.type === 'Debit Note' ? 'Total debit' : x.type === 'Quotation' ? 'Estimated total' : 'Total';
    return `<article class="sinv t-${x.tpl}" style="--a:${x.a}">${head}${x.ref ? `<p class="si-ref">${esc(x.ref)}</p>` : ''}<div class="si-parties">${party(x.challan ? 'DELIVER TO' : x.type === 'Quotation' ? 'QUOTATION FOR' : 'BILL TO', x.buyer)}<div class="si-party"><small>PLACE OF SUPPLY</small><b>${esc(x.pos)}</b><span>${hasGst ? (x.intra ? 'Intra-state supply' : 'Inter-state supply') : x.challan ? 'Movement of goods' : 'No GST charged'}</span></div></div>
    <table class="si-items"><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Disc.</th><th>GST</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="si-bottom">${x.upi ? `<div class="si-pay"><span class="si-qr">${qr()}</span><div><small>SCAN TO PAY</small><b>${esc(x.upi)}</b><span>${fmt(c.grand)} · ${esc(x.no)}</span></div></div>` : '<div></div>'}
    <dl class="si-sum"><div><dt>${hasGst ? 'Taxable value' : 'Subtotal'}</dt><dd>${fmt(c.taxable)}</dd></div>${taxRows}${c.round ? `<div><dt>Round off</dt><dd>${fmt(c.round)}</dd></div>` : ''}<div class="si-total"><dt>${totalLabel}</dt><dd>${fmt(c.grand)}</dd></div></dl></div>
    <p class="si-words">${words(c.grand / 100)}</p><p class="si-notes">${esc(x.notes)}</p>${foot}</article>`;
  }

  grid.innerHTML = S.map((x, i) => `<button class="sample-card" data-sample="${i}" data-cat="${x.cat}" style="--i:${i}" data-testid="sample-card-${x.id}"><span class="sample-thumb"><span class="sample-scale">${invoice(x)}</span></span><span class="sample-cap"><b>${esc(x.type)}</b><small>${esc(x.label)}</small></span></button>`).join('');

  const fit = () => grid.querySelectorAll('.sample-thumb').forEach(t => t.style.setProperty('--s', (t.clientWidth / 600).toFixed(4)));
  new ResizeObserver(fit).observe(grid); fit();

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  grid.querySelectorAll('.sample-card').forEach(c => matchMedia('(prefers-reduced-motion: reduce)').matches ? c.classList.add('in') : io.observe(c));

  const filter = document.querySelector('[data-sample-filter]');
  filter.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    filter.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', x === b));
    grid.querySelectorAll('.sample-card').forEach(c => { c.hidden = b.dataset.f !== 'all' && c.dataset.cat !== b.dataset.f; c.classList.add('in'); });
    fit();
  });

  const modal = document.querySelector('[data-sample-modal]'), body = document.querySelector('[data-sample-body]');
  grid.addEventListener('click', e => {
    const c = e.target.closest('[data-sample]'); if (!c) return;
    const x = S[+c.dataset.sample];
    document.querySelector('[data-sample-title]').textContent = `${x.type} · ${x.label}`;
    document.querySelector('[data-sample-cta]').href = x.water ? '/signup?next=%2Fwater-plant' : '/signup';
    body.innerHTML = '<div class="modal-fit"><div class="modal-doc">' + invoice(x) + '</div></div>';
    modal.showModal();
    const doc = body.querySelector('.modal-doc'), k = Math.min(1, (body.clientWidth - 20) / 600);
    doc.style.transform = 'scale(' + k + ')'; body.querySelector('.modal-fit').style.height = doc.offsetHeight * k + 'px';
  });
  document.querySelector('[data-sample-close]').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
})();
