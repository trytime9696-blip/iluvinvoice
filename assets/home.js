(() => {
  const $ = (q, r = document) => r.querySelector(q), $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches && !reduce;
  const inr = n => Math.round(n).toLocaleString('en-IN');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // nav
  const nav = $('[data-nav]'), menu = $('[data-menu]');
  const onScrollNav = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScrollNav, { passive: true }); onScrollNav();
  menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', open); });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', false); }));

  // reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .18, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal],[data-fan]').forEach(el => reduce ? el.classList.add('in') : io.observe(el));

  // decorative sample QR (not a payment code)
  const finder = (x, y) => [[0, 0], [14, 0], [0, 14]].some(([fx, fy]) => { const dx = x - fx, dy = y - fy; if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false; return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx > 1 && dx < 5 && dy > 1 && dy < 5); });
  const inFinderZone = (x, y) => (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  $$('[data-qr]').forEach(q => {
    let seed = 7, html = '';
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
      seed = (seed * 9301 + 49297) % 233280;
      const on = inFinderZone(x, y) ? finder(x, y) : seed / 233280 > .52;
      html += `<i class="${on ? '' : 'o'}" style="--q:${(x + y) * 22}"></i>`;
    }
    q.innerHTML = html;
  });

  // count-up
  const countUp = el => {
    const to = +el.dataset.count; if (reduce) { el.textContent = inr(to); return; }
    const t0 = performance.now(), dur = 900;
    const tick = t => { const k = clamp((t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = inr(to * e); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };

  // hero invoice builds itself
  const inv = $('[data-inv]');
  if (inv && !reduce) {
    inv.classList.add('playing');
    let step = 0, timer = null, visible = true;
    const run = () => {
      clearTimeout(timer); if (!visible) return;
      step++;
      if (step <= 8) {
        $$(`[data-step="${step}"]`, inv).forEach(el => { el.classList.add('on'); $$('[data-count]', el).forEach(countUp); });
        timer = setTimeout(run, step === 6 ? 900 : 620);
      } else {
        timer = setTimeout(() => { $$('[data-step]', inv).forEach(el => el.classList.remove('on')); step = 0; timer = setTimeout(run, 700); }, 4200);
      }
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) run(); else clearTimeout(timer); }).observe(inv);
    setTimeout(run, 900);
  }

  // cursor-driven 3D (desktop only)
  if (finePointer) {
    const hero = $('[data-hero]'), scene = $('[data-scene]'), sheen = $('.sheen');
    let raf = 0;
    hero.addEventListener('pointermove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        scene.style.setProperty('--ry', `${(nx * 8).toFixed(2)}deg`);
        scene.style.setProperty('--rx', `${(-ny * 6).toFixed(2)}deg`);
        const s = scene.getBoundingClientRect();
        sheen.style.setProperty('--lx', `${e.clientX - s.left}px`); sheen.style.setProperty('--ly', `${e.clientY - s.top}px`);
      });
    });
    hero.addEventListener('pointerleave', () => { scene.style.setProperty('--rx', '0deg'); scene.style.setProperty('--ry', '0deg'); });
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        el.style.transitionDelay = '0s';
        el.style.transform = `perspective(900px) rotateX(${(-ny * 5).toFixed(2)}deg) rotateY(${(nx * 6).toFixed(2)}deg) translateY(-4px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - .5) * 10}px`); el.style.setProperty('--my', `${((e.clientY - r.top) / r.height - .5) * 8}px`); });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  // GST calculator
  const calc = $('[data-gst]'), seg = $('[data-gst-seg]');
  const modes = { intra: ['₹14,160.00', 'Supplier in Uttar Pradesh, customer in Uttar Pradesh → intra-state supply.'], inter: ['₹14,160.00', 'Supplier in Uttar Pradesh, customer in Maharashtra → inter-state supply, so IGST.'], none: ['₹12,000.00', 'Bill of Supply or unregistered seller → no GST is charged.'] };
  const setMode = m => { calc.dataset.mode = m; $('[data-gst-total]').textContent = modes[m][0]; $('[data-gst-note]').textContent = modes[m][1]; $$('button', seg).forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m)); };
  let auto = !reduce, autoTimer, calcVisible = false;
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; auto = false; clearInterval(autoTimer); setMode(b.dataset.mode); });
  const order = ['intra', 'inter', 'none'];
  new IntersectionObserver(([e]) => { calcVisible = e.isIntersecting; clearInterval(autoTimer); if (calcVisible && auto) autoTimer = setInterval(() => setMode(order[(order.indexOf(calc.dataset.mode) + 1) % 3]), 3200); }).observe(calc);

  // water plant: daily register → monthly bill
  const water = $('[data-water]');
  if (water) {
    const people = ['Sharma Traders', 'Gupta Sweets', 'Mehta Bakers', 'Verma Clinic', 'Singh Dhaba'], days = 31, table = $('[data-reg-table]');
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const qty = people.map((_, r) => Array.from({ length: days }, (_, d) => ((d + 3) % 7 === 0 && r !== 4) ? 0 : Math.round(rnd() * (r === 4 ? 3 : 2)) + (r === 0 ? 1 : 0)));
    let html = '<span class="hd nm">Customer</span>';
    for (let d = 1; d <= days; d++) html += `<span class="hd${d > 10 ? ' d-x' : ''}">${d}</span>`;
    html += '<span class="hd">Total</span>';
    people.forEach((p, r) => {
      html += `<span class="nm${r === 0 ? ' row-hl' : ''}">${p}</span>`;
      for (let d = 0; d < days; d++) html += `<span class="cell${qty[r][d] ? '' : ' zero'}${d >= 10 ? ' d-x' : ''}" data-r="${r}" data-d="${d}">${qty[r][d] || '–'}</span>`;
      html += `<span class="tot" data-tot="${r}">0</span>`;
    });
    table.innerHTML = html;
    const cells = $$('.cell', table).sort((a, b) => (a.dataset.d - b.dataset.d) || (a.dataset.r - b.dataset.r));
    const tots = $$('[data-tot]', table), sharma = qty[0].reduce((a, b) => a + b, 0);
    $('[data-wb-cal]').innerHTML = qty[0].map((q, d) => `<i class="${q ? 's' : ''}">${d + 1}</i>`).join('');
    const reg = $('[data-register]'), bill = $('[data-wbill]'), steps = $$('[data-wstep]'), jarsEl = $('[data-wb-jars]'), chargeEl = $('[data-wb-charge]'), totalEl = $('[data-wb-total]');
    let last = -1;
    const paint = p => {
      const f = clamp(p / .5), shown = Math.round(f * cells.length);
      if (shown !== last) {
        cells.forEach((c, i) => c.classList.toggle('on', i < shown));
        const sums = people.map(() => 0); cells.slice(0, shown).forEach(c => sums[c.dataset.r] += qty[c.dataset.r][c.dataset.d]);
        tots.forEach((t, r) => t.textContent = sums[r]); last = shown;
      }
      const m = clamp((p - .55) / .25), b = clamp((p - .6) / .3), jars = Math.round(sharma * b);
      reg.style.setProperty('--m', m.toFixed(3)); bill.style.setProperty('--b', b.toFixed(3));
      jarsEl.textContent = jars; chargeEl.textContent = `₹${inr(jars * 25)}`; totalEl.textContent = `₹${inr(Math.max(0, jars * 25 + 200 - 500 * b))}`;
      steps.forEach((el, i) => el.classList.toggle('on', i === (p < .35 ? 0 : p < .58 ? 1 : 2)));
    };
    if (reduce) { paint(1); } else {
      let ticking = false;
      const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { const r = water.getBoundingClientRect(); paint(clamp(-r.top / (r.height - innerHeight))); ticking = false; }); };
      addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
    }
  }
})();
