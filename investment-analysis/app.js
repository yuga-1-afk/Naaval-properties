/* 25-year villa investment analysis — interface. Model in model.js, assumptions in data.js. */
(() => {
  'use strict';

  const D = window.VillaData;
  const M = window.VillaModel;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const num = (v, fallback) => { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; };

  let printMode = false;
  const chartWidth = (box) => Math.max(320, Math.round(printMode ? 640 : (box.clientWidth || 640)));

  const SCEN = D.scenarios;
  const TOGGLES = new Set(['letOut', 'section54', 'cycleOn']);
  const STORE = 'villa-analysis-v1';

  /* ------------------------------------------------------------------ state */
  const fresh = () => ({
    scenario: 1, hold: 25, basis: 'real', metric: 'irrReal',
    deal: clone(D.deal),
    params: Object.fromEntries(D.params.map((p) => [p.key, p.v.slice()])),
  });
  let state = fresh();

  const storage = {
    get: (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  function load() {
    const raw = storage.get(STORE);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      Object.keys(state.deal).forEach((k) => { if (typeof saved.deal?.[k] === 'number') state.deal[k] = saved.deal[k]; });
      D.params.forEach((p) => {
        const v = saved.params?.[p.key];
        if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')) state.params[p.key] = v;
      });
      ['scenario', 'hold'].forEach((k) => { if (typeof saved[k] === 'number') state[k] = saved[k]; });
      if (saved.basis === 'real' || saved.basis === 'nominal') state.basis = saved.basis;
    } catch (e) { /* ignore a corrupt save */ }
  }
  const save = () => storage.set(STORE, JSON.stringify({
    deal: state.deal, params: state.params, scenario: state.scenario, hold: state.hold, basis: state.basis,
  }));

  /* ------------------------------------------------------------ formatting */
  const MINUS = '−';
  const fmt = (digits) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const f0 = fmt(0);
  const f1 = fmt(1);
  const f2 = fmt(2);
  const sign = (n, s) => (n < 0 && Number(s.replace(/[^\d.]/g, '')) !== 0 ? MINUS : '');

  function money(n, digits) {
    if (n === null || n === undefined || Number.isNaN(n)) return 'n/a';
    const a = Math.abs(n);
    let s;
    if (a >= 1e7) s = `₹${fmt(digits ?? 2).format(a / 1e7)} Cr`;
    else if (a >= 1e5) s = `₹${f1.format(a / 1e5)} L`;
    else s = `₹${f0.format(a)}`;
    return sign(n, s) + s;
  }
  function lakh(n, digits = 1) {
    if (n === null || Number.isNaN(n)) return 'n/a';
    const s = fmt(digits).format(Math.abs(n) / 1e5);
    return sign(n, s) + s;
  }
  function axisMoney(n) {
    const a = Math.abs(n);
    const trim = (x) => String(+x.toFixed(2));
    let s;
    if (a === 0) s = '₹0';
    else if (a >= 1e7) s = `₹${trim(a / 1e7)} Cr`;
    else if (a >= 1e5) s = `₹${trim(a / 1e5)} L`;
    else s = `₹${f0.format(a)}`;
    return (n < 0 ? MINUS : '') + s;
  }
  function pct(x, digits = 1) {
    if (x === null || x === undefined || Number.isNaN(x)) return 'n/a';
    const s = Math.abs(x * 100).toFixed(digits);
    return `${x < 0 && Number(s) !== 0 ? MINUS : ''}${s}%`;
  }
  const times = (x) => (x === null ? 'n/a' : `${x.toFixed(2)}×`);

  /* ---------------------------------------------------------------- model */
  const sc = (i) => Object.fromEntries(D.params.map((p) => [p.key, num(state.params[p.key][i], p.v[i])]));
  let models;
  let exits;
  let hurdles;
  let verdicts;
  let breakEvens;

  function compute() {
    const g = state.deal;
    const H = state.hold;
    models = [0, 1, 2].map((i) => M.run(g, sc(i)));
    exits = models.map((m) => m.exit(H));
    hurdles = [0, 1, 2].map((i) => M.hurdles(g, sc(i), H));
    verdicts = exits.map((x, i) => M.verdict(x.irrReal, hurdles[i]));
    breakEvens = [0, 1, 2].map((i) => ({
      zero: M.breakEven(g, sc(i), H, 0),
      equity: M.breakEven(g, sc(i), H, hurdles[i].equityReal),
    }));
  }

  const basisLabel = () => (state.basis === 'real' ? "today's rupees" : 'future rupees');
  const adj = (row, v) => (state.basis === 'real' ? v / row.cpi : v);
  const landCagr = (m, H) => Math.pow(m.rows[H].land / m.land0, 1 / H) - 1;

  /* ------------------------------------------------------------ small ui */
  const cite = (keys) => {
    if (!keys || !keys.length) return '';
    const all = Object.keys(D.sources);
    return `<sup>[${keys.map((k) => `<a href="#src-${all.indexOf(k) + 1}">${all.indexOf(k) + 1}</a>`).join(', ')}]</sup>`;
  };
  const badge = (c) => `<span class="badge badge--${c}">${({ given: 'Your input', official: 'Official', sourced: 'Sourced', anchored: 'Anchored', judgement: 'Judgement' })[c]}</span>`;
  const chipMark = { beats: '✓', mid: '≈', flat: '–', loss: '!' };
  const chip = (v) => `<span class="chip chip--${v.key}"><i aria-hidden="true">${chipMark[v.key]}</i>${esc(v.label)}</span>`;

  function niceScale(min, max, count = 5) {
    let lo = min;
    let hi = max;
    if (lo === hi) hi = lo + 1;
    const raw = (hi - lo) / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step);
    return { lo, hi, ticks };
  }

  /* tooltip shared by every chart */
  const tip = $('#tip');
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 16;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 16;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, Math.min(y - r.height / 2, window.innerHeight - r.height - 8))}px`;
  }
  const hideTip = () => { tip.hidden = true; };
  const tipRow = (name, value, color) => `<div><span>${color ? `<i class="ln" style="border-color:${color}"></i>` : ''}${esc(name)}</span><span>${esc(value)}</span></div>`;

  /* Wire pointer + keyboard to a chart: cfg.n points, cfg.xOf(i), cfg.html(i), cfg.mark(i), cfg.unmark(). */
  function bind(svg, cfg) {
    let current = Math.floor(cfg.n / 2);
    const place = (i, x, y) => { current = i; cfg.mark(i); showTip(cfg.html(i), x, y); };
    const fromPointer = (e) => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (cfg.W / r.width);
      const i = cfg.slot
        ? Math.floor((px - cfg.left) / (cfg.width / cfg.n))
        : Math.round(((px - cfg.left) / cfg.width) * (cfg.n - 1));
      return Math.max(0, Math.min(cfg.n - 1, i));
    };
    svg.addEventListener('pointermove', (e) => place(fromPointer(e), e.clientX, e.clientY));
    svg.addEventListener('pointerleave', () => { cfg.unmark(); hideTip(); });
    svg.addEventListener('blur', () => { cfg.unmark(); hideTip(); });
    svg.addEventListener('keydown', (e) => {
      const d = { ArrowLeft: -1, ArrowRight: 1, Home: -999, End: 999 }[e.key];
      if (!d) return;
      e.preventDefault();
      const i = Math.max(0, Math.min(cfg.n - 1, current + d));
      const r = svg.getBoundingClientRect();
      place(i, r.left + (cfg.xOf(i) / cfg.W) * r.width, r.top + r.height / 2);
    });
  }

  const twinTable = (head, rows) => `<details class="twin"><summary>View the data as a table</summary><div class="scroll tall"><table class="freeze"><thead class="freeze"><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div></details>`;

  /* --------------------------------------------------------------- charts */
  function lineChart(box, o) {
    const W = chartWidth(box);
    const H = printMode ? 180 : (W < 520 ? 260 : 300);
    const narrow = W < 560;
    const m = { t: 14, r: narrow ? 14 : 124, b: 30, l: 60 };
    const n = o.years.length;
    const all = o.series.flatMap((s) => s.values).concat(o.ref ? [o.ref.value] : [], o.zero ? [0] : []);
    const { lo, hi, ticks } = niceScale(Math.min(...all), Math.max(...all));
    const pw = W - m.l - m.r;
    const x = (i) => m.l + (pw * i) / (n - 1);
    const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - lo) / (hi - lo));

    let s = '';
    ticks.forEach((t) => { s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${axisMoney(t)}</text>`; });
    o.years.forEach((yr, i) => { if (i % 5 === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${yr}</text>`; });
    if (o.zero) s += `<line class="zero" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
    if (o.ref) {
      s += `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${y(o.ref.value)}" y2="${y(o.ref.value)}"/>`
        + `<text class="lbl halo" x="${m.l + 6}" y="${y(o.ref.value) - 6}">${esc(o.ref.label)}</text>`;
    }
    o.series.forEach((se) => {
      s += `<path d="${se.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    });
    o.series.forEach((se) => { s += `<circle class="ring" cx="${x(n - 1)}" cy="${y(se.values[n - 1])}" r="4" fill="${se.color}"/>`; });
    if (!narrow) {
      const ends = o.series.map((se) => ({ se, y: y(se.values[n - 1]) })).sort((a, b) => a.y - b.y);
      if (ends.every((e, k) => k === 0 || e.y - ends[k - 1].y >= 15)) {
        ends.forEach((e) => { s += `<text class="lbl" x="${W - m.r + 10}" y="${e.y + 4}">${esc(e.se.name)}</text>`; });
      }
    }
    s += `<line class="cross" id="${o.id}-x" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>`;
    o.series.forEach((se, k) => { s += `<circle class="ring" id="${o.id}-d${k}" r="4" fill="${se.color}" visibility="hidden"/>`; });

    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(o.aria)} Use the left and right arrow keys to read each year.">${s}</svg>`;
    const svg = $('svg', box);
    const cross = $(`#${o.id}-x`, box);
    const dots = o.series.map((se, k) => $(`#${o.id}-d${k}`, box));
    bind(svg, {
      n, W, left: m.l, width: pw, xOf: x,
      mark(i) {
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
        dots.forEach((d, k) => { d.setAttribute('cx', x(i)); d.setAttribute('cy', y(o.series[k].values[i])); d.setAttribute('visibility', 'visible'); });
      },
      unmark() { cross.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); },
      html(i) {
        return `<b>${o.years[i]}${i === 0 ? ' (purchase)' : ''}</b>${o.series.map((se) => tipRow(se.name, money(se.values[i]), se.color)).join('')}`;
      },
    });
  }

  function stackChart(box, o) {
    const W = chartWidth(box);
    const H = printMode ? 180 : (W < 520 ? 260 : 300);
    const m = { t: 14, r: 14, b: 30, l: 60 };
    const n = o.years.length;
    const totals = o.data.map((r) => r.reduce((a, b) => a + b, 0));
    const { hi, ticks } = niceScale(0, Math.max(...totals, o.ref.value));
    const pw = W - m.l - m.r;
    const slot = pw / n;
    const bw = Math.min(24, slot - 2);
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / hi);
    const cx = (i) => m.l + slot * i + slot / 2;

    let s = '';
    ticks.forEach((t) => { s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${axisMoney(t)}</text>`; });
    o.years.forEach((yr, i) => { if (i % 5 === 0 || i === n - 1) s += `<text x="${cx(i)}" y="${H - 8}" text-anchor="middle">${yr}</text>`; });
    s += '<rect class="bar-hover" id="sh" visibility="hidden"/>';
    o.data.forEach((row, i) => {
      let cum = 0;
      row.forEach((v, k) => {
        const top = y(cum + v);
        const bottom = y(cum) - (k ? 2 : 0);
        const h = bottom - top;
        const isTop = k === row.length - 1 || row.slice(k + 1).every((q) => q <= 0);
        if (h > 0.5 && v > 0) {
          const x0 = cx(i) - bw / 2;
          const r = isTop && h > 8 ? 4 : 0;
          s += r
            ? `<path d="M${x0},${bottom} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${bottom} Z" fill="${o.comps[k].color}"/>`
            : `<rect x="${x0}" y="${top}" width="${bw}" height="${h}" fill="${o.comps[k].color}"/>`;
        }
        cum += v;
      });
    });
    s += `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${y(o.ref.value)}" y2="${y(o.ref.value)}"/>`
      + `<text class="lbl halo" x="${m.l + 6}" y="${y(o.ref.value) - 6}">${esc(o.ref.label)}</text>`;

    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(o.aria)} Use the left and right arrow keys to read each year.">${s}</svg>`;
    const svg = $('svg', box);
    const sh = $('#sh', box);
    bind(svg, {
      n, W, left: m.l, width: pw, slot: true, xOf: cx,
      mark(i) { sh.setAttribute('x', cx(i) - slot / 2); sh.setAttribute('y', m.t); sh.setAttribute('width', slot); sh.setAttribute('height', H - m.t - m.b); sh.setAttribute('visibility', 'visible'); },
      unmark() { sh.setAttribute('visibility', 'hidden'); },
      html(i) {
        const t = o.data[i].reduce((a, b) => a + b, 0);
        return `<b>${o.years[i]}${i === 0 ? ' (purchase)' : ''}</b>${o.comps.map((c, k) => tipRow(c.name, money(o.data[i][k]), c.color)).join('')}<hr>${tipRow('Total', money(t))}${o.extra ? o.extra(i) : ''}`;
      },
    });
  }

  function barChart(box, o) {
    const W = chartWidth(box);
    const narrow = W < 520;
    const rowH = printMode ? 23 : 38;
    const m = { t: 8, r: 8, b: 26, l: narrow ? 112 : 160 };
    const H = m.t + m.b + rowH * o.rows.length;
    const vals = o.rows.map((r) => r.value);
    const { lo, hi, ticks } = niceScale(Math.min(0, ...vals), Math.max(0, ...vals), 5);
    const room = narrow ? 46 : 176;
    const pw = W - m.l - m.r - room * 2;
    const x = (v) => m.l + room + (pw * (v - lo)) / (hi - lo);
    const digits = ticks.some((t) => Math.abs(t * 100 - Math.round(t * 100)) > 1e-6) ? 1 : 0;
    let s = '';
    ticks.forEach((t) => { s += `<line class="grid" x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${H - m.b}"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle">${pct(t, digits)}</text>`; });
    o.rows.forEach((r, i) => {
      const cy = m.t + rowH * i + rowH / 2;
      const x0 = x(0);
      const x1 = x(r.value);
      const bx = Math.min(x0, x1);
      const bwid = Math.max(2, Math.abs(x1 - x0));
      const neg = r.value < 0;
      s += `<text class="lbl" x="${m.l - 10}" y="${cy + 4}" text-anchor="end">${esc(r.name)}</text>`;
      s += `<rect x="${bx}" y="${cy - 10}" width="${bwid}" height="20" rx="4" fill="${r.color}"/>`;
      s += `<text x="${neg ? bx - 6 : bx + bwid + 6}" y="${cy + 4}" text-anchor="${neg ? 'end' : 'start'}" class="lbl">${esc(narrow ? r.short : r.label)}</text>`;
    });
    s += `<line class="axis" x1="${x(0)}" x2="${x(0)}" y1="${m.t}" y2="${H - m.b}"/>`;
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria)}">${s}</svg>`;
  }

  /* ----------------------------------------------------------------- verdict */
  function renderVerdict() {
    const k = 1;
    const g = state.deal;
    const H = state.hold;
    const yr = g.startYear + H;
    const x = exits[k];
    const m = models[k];
    const h = hurdles[k];
    const v = verdicts[k];
    const costs = m.purchaseCosts;
    const landShare = m.land0 / g.purchasePrice;
    const be = breakEvens[k].zero;
    const avgReal = mean(M.landBlocks(sc(k)));
    const answer = {
      beats: 'On the moderate assumptions this beats both alternatives, so on paper it is a sound use of the money.',
      mid: 'On the moderate assumptions this beats government bonds but trails the equity placeholder: acceptable, not compelling.',
      flat: 'On the moderate assumptions this only keeps pace with inflation and trails the safer alternatives, so returns alone do not justify it.',
      loss: 'On the moderate assumptions this is not a financially worthwhile investment: after costs and tax you lose purchasing power.',
    }[v.key];

    let breakText = '';
    if (be.shift !== null && !be.below) {
      const need = M.run(g, sc(k), { landShift: be.shift });
      breakText = `To merely keep your purchasing power, land would need to grow about <strong>${pct(landCagr(need, H))} a year</strong> (${pct(avgReal / 100 + be.shift / 100)} above inflation) for ${H} years. The moderate case assumes ${pct(landCagr(m, H))}.`;
    } else if (be.below) {
      breakText = 'Land growth is not the constraint here: the case clears inflation even if land only matches inflation.';
    } else {
      breakText = 'Even with land growing 20 percentage points a year faster than assumed, purchasing power is not preserved on these inputs. Check the other assumptions.';
    }

    const lo = Math.min(...exits.map((e) => (e.irrReal === null ? -1 : e.irrReal)));
    const hi = Math.max(...exits.map((e) => (e.irrReal === null ? -1 : e.irrReal)));

    $('#verdictBody').innerHTML = `
      <div class="verdict-grid">
        <div class="hero">
          <p class="hero__label">Moderate case: yearly return after costs and tax, in today's money</p>
          <p class="hero__value">${pct(x.irrReal)}</p>
          <p class="hero__sub">a year over ${H} years. Government bonds give ${pct(h.bondReal)} and the equity placeholder ${pct(h.equityReal)}, on the same basis.</p>
          ${chip(v)}
        </div>
        <div class="prose">
          <p><strong>${answer}</strong></p>
          <p>You pay ${money(g.purchasePrice)} plus ${money(costs)} in stamp duty, registration and fees. By ${yr} the villa would be worth about ${money(x.marketValue)}, which is ${money(x.marketValueReal)} in today's money. After rent, running costs, tax and selling costs, the net profit is ${money(x.profit)} in ${yr} rupees, or ${money(x.profitReal)} in today's purchasing power.</p>
          <p>Only about <strong>${pct(landShare, 0)}</strong> of the price is land. The rest is a building that wears out and a developer premium that resale buyers will not fully pay, so the result leans on how fast land appreciates. ${breakText}</p>
          <p>Across the three scenarios the real return runs from ${pct(lo)} to ${pct(hi)} a year. Many inputs are judgement because no local data exists. See <a href="#assumptions">assumptions and sources</a>.</p>
        </div>
      </div>
      <div class="cards">${SCEN.map((sn, i) => {
    const e = exits[i];
    return `<article class="card"><h3><i class="key k${i}" aria-hidden="true"></i>${sn.label}</h3>
        <p class="card__big">${pct(e.irrReal)}</p><p class="muted small">a year after tax, in today's money</p>
        <dl><dt>Nominal return</dt><dd>${pct(e.irr)}</dd>
        <dt>Worth in ${yr}</dt><dd>${money(e.marketValue)}</dd>
        <dt>Worth in today's money</dt><dd>${money(e.marketValueReal)}</dd>
        <dt>Net profit, today's money</dt><dd>${money(e.profitReal)}</dd>
        <dt>Money back per ₹1 in</dt><dd>${times(e.multiple)}</dd></dl>
        ${chip(verdicts[i])}</article>`;
  }).join('')}</div>
      <div class="figure"><h3>Yearly return after tax, in today's money</h3>
        <p class="sub">The same money in government bonds or an equity index, taxed at your rates, is shown for comparison. The equity figure is a placeholder, not a forecast.</p>
        <div class="fig-card"><div class="chart" id="returnsChart"></div></div>
      </div>
      <div class="figure"><h3>Where your ${money(g.purchasePrice + costs)} goes on day one (moderate)</h3>
        <p class="sub">What a resale buyer would pay for the land and the building at cost, how much of the developer's premium they would still pay, and what leaks away immediately.</p>
        <div class="fig-card" id="splitBox"></div>
      </div>`;

    barChart($('#returnsChart'), {
      aria: `Real after-tax return by scenario against government bonds and an equity placeholder. Conservative ${pct(exits[0].irrReal)}, moderate ${pct(exits[1].irrReal)}, optimistic ${pct(exits[2].irrReal)}.`,
      rows: [
        ...SCEN.map((sn, i) => ({ name: sn.label, value: exits[i].irrReal ?? -0.05, color: `var(--s${i + 1})`, label: `${pct(exits[i].irrReal)} real · ${pct(exits[i].irr)} nominal`, short: pct(exits[i].irrReal) })),
        { name: 'Government bond', value: h.bondReal, color: 'var(--muted)', label: `${pct(h.bondReal)} real · ${pct(h.bond)} nominal`, short: pct(h.bondReal) },
        { name: 'Equity (placeholder)', value: h.equityReal, color: 'var(--muted)', label: `${pct(h.equityReal)} real · ${pct(h.equity)} nominal`, short: pct(h.equityReal) },
      ],
    });
    renderSplit(m);
  }

  function renderSplit(m) {
    const g = state.deal;
    const premiumKept = m.premium0 * sc(1).premiumRetention / 100;
    const parts = [
      { name: 'Land at market', v: m.land0, cls: 'bg1' },
      { name: 'Building at replacement cost', v: m.build0, cls: 'bg2' },
      { name: 'Developer premium a resale buyer would still pay', v: premiumKept, cls: 'bg3' },
      { name: 'Developer premium that does not survive resale', v: m.premium0 - premiumKept, cls: 'bg4' },
      { name: 'Stamp duty, registration and fees', v: m.purchaseCosts, cls: 'bg5' },
    ];
    const total = parts.reduce((a, p) => a + p.v, 0);
    const bar = parts.map((p) => {
      const share = p.v / total;
      const dark = p.cls === 'bg4' ? ' dark-ink' : '';
      return `<div class="${p.cls}${dark}" style="flex:${p.v} 1 0" title="${esc(p.name)}: ${money(p.v)} (${pct(share, 0)})">${share >= 0.1 ? pct(share, 0) : ''}</div>`;
    }).join('');
    const note = m.premiumGap < 0 ? '<p class="warn-box">Land and building at cost already exceed the price, so the premium is set to zero. Check the plot size, land rate and built-up area.</p>' : '';
    $('#splitBox').innerHTML = `<div class="segbar" role="img" aria-label="Split of the money paid: ${parts.map((p) => `${p.name} ${pct(p.v / total, 0)}`).join(', ')}">${bar}</div>
      <ul class="legend">${parts.map((p) => `<li><i class="sw ${p.cls}"></i>${esc(p.name)}</li>`).join('')}</ul>
      ${note}
      ${twinTable(['Part', 'Amount', 'Share of total paid'], parts.map((p) => [p.name, money(p.v), pct(p.v / total, 1)]).concat([['Total paid', money(total), '100%']]))}
      <p class="small muted" style="margin-top:8px">Price ${money(g.purchasePrice)}. Land uses the plot, the land rate and the asking-to-registered discount set under your deal. Nothing here comes from a registered sale.</p>`;
  }

  /* ----------------------------------------------------------------- summary */
  function renderSummary() {
    const g = state.deal;
    const H = state.hold;
    const yr = g.startYear + H;
    $('#summaryLead').textContent = `If you sell at the end of ${yr} (after ${H} years). Amounts in ₹ lakh, in ${yr} rupees unless a row says otherwise.`;
    const cols = [0, 1, 2];
    const sec = (t) => `<tr class="sec"><th colspan="4">${t}</th></tr>`;
    const row = (label, fn, o = {}) => `<tr class="${o.cls || ''}"><th scope="row">${label}</th>${cols.map((i) => {
      const v = fn(i);
      const txt = o.text ? o.text(v) : lakh(v);
      return `<td${o.signed && typeof v === 'number' && v < 0 ? ' class="neg"' : ''}>${txt}</td>`;
    }).join('')}</tr>`;
    const x = (i) => exits[i];
    const m = (i) => models[i];
    const t = (i) => exits[i].totals;

    $('#summaryBody').innerHTML = `<div class="scroll"><table class="freeze sum"><thead class="freeze"><tr><th>₹ lakh</th>${SCEN.map((s, i) => `<th><i class="key k${i}" aria-hidden="true"></i> ${s.label}</th>`).join('')}</tr></thead><tbody>
      ${sec('What you pay')}
      ${row('Purchase price', () => g.purchasePrice)}
      ${row('Stamp duty, registration, legal and other costs', (i) => m(i).purchaseCosts)}
      ${row('Total paid', (i) => g.purchasePrice + m(i).purchaseCosts, { cls: 'total' })}
      ${sec(`While you own it (${H} years, cumulative)`)}
      ${row('Rent collected, after vacancy', (i) => t(i).rent)}
      ${row('Letting and management', (i) => -t(i).letting)}
      ${row('Maintenance (gated community)', (i) => -t(i).maintenance)}
      ${row('Property tax', (i) => -t(i).propertyTax)}
      ${row('Repairs and insurance', (i) => -(t(i).repairs + t(i).insurance))}
      ${row('Major renovations', (i) => -t(i).renovation)}
      ${row('Income tax on rent', (i) => -t(i).rentTax)}
      ${row('Net cash from the property', (i) => t(i).operating, { cls: 'total', signed: true })}
      ${sec(`Sale at the end of ${yr}`)}
      ${row('Land', (i) => m(i).rows[H].land)}
      ${row('Building, after depreciation', (i) => m(i).rows[H].building)}
      ${row('Developer premium still paid for', (i) => m(i).rows[H].premium)}
      ${row('Market value', (i) => x(i).marketValue, { cls: 'total' })}
      ${row('Resale discount', (i) => -(x(i).marketValue - x(i).sale.price))}
      ${row('Selling costs', (i) => -x(i).sale.costs)}
      ${row('Capital gains tax', (i) => -x(i).sale.tax)}
      ${row('Money you receive', (i) => x(i).sale.proceeds, { cls: 'total' })}
      ${sec('Result')}
      ${row(`Net profit in ${yr} rupees`, (i) => x(i).profit, { cls: 'total', signed: true })}
      ${row("Net profit in today's rupees", (i) => x(i).profitReal, { cls: 'total', signed: true })}
      ${row('Money back per ₹1 put in', (i) => x(i).multiple, { text: times })}
      ${row('Return a year after tax (IRR), nominal', (i) => x(i).irr, { text: (v) => pct(v), signed: true })}
      ${row("Return a year after tax (IRR), in today's money", (i) => x(i).irrReal, { text: (v) => pct(v), signed: true, cls: 'total' })}
      ${row('Price growth a year (CAGR), nominal', (i) => x(i).valueCagr, { text: (v) => pct(v) })}
      ${row("Price growth a year (CAGR), in today's money", (i) => x(i).valueCagrReal, { text: (v) => pct(v), signed: true })}
      ${sec('The same money elsewhere (after tax, a year)')}
      ${row("Government bond, in today's money", (i) => hurdles[i].bondReal, { text: (v) => pct(v), signed: true })}
      ${row("Equity placeholder, in today's money", (i) => hurdles[i].equityReal, { text: (v) => pct(v), signed: true })}
      ${row('Verdict', (i) => verdicts[i], { text: (v) => chip(v) })}
    </tbody></table></div>
    <p class="small muted" style="margin-top:8px">Today's rupees divide each year's figure by that year's price index. IRR counts every instalment, cost, rent and the sale on the dates they fall. Capital gains tax uses a 12.5% rate on gain over the price, costs and renovations.</p>`;
  }

  /* ------------------------------------------------------------------ charts */
  function renderCharts() {
    const k = state.scenario;
    const H = state.hold;
    const g = state.deal;
    const m = models[k];
    const years = m.rows.map((r) => r.year);
    const total = g.purchasePrice + m.purchaseCosts;
    const sn = SCEN[k];
    const b = basisLabel();

    $('#chartsBody').innerHTML = `
      <div class="figure"><h3>Where the value sits, year by year: ${sn.label.toLowerCase()} case</h3>
        <p class="sub">Land, the building after depreciation, and the developer premium, in ${b}. The dashed line is what you paid at purchase.</p>
        <div class="fig-card">
          <ul class="legend"><li><i class="sw bg1"></i>Land</li><li><i class="sw bg2"></i>Building</li><li><i class="sw bg3"></i>Developer premium</li><li><i class="ln" style="border-color:var(--ink-2);border-top-style:dashed"></i>Total paid</li></ul>
          <div class="chart" id="c1"></div><div id="c1t"></div></div></div>
      <div class="figure"><h3>If you sold in a given year, what you would keep</h3>
        <p class="sub">Money received after resale discount, selling costs and capital gains tax, in ${b}. The first point is selling straight after you buy. It does not include rent earned before the sale.</p>
        <div class="fig-card">
          <ul class="legend">${SCEN.map((s, i) => `<li><i class="ln" style="border-color:var(--s${i + 1})"></i>${s.label}</li>`).join('')}<li><i class="ln" style="border-color:var(--ink-2);border-top-style:dashed"></i>Total paid</li></ul>
          <div class="chart" id="c2"></div><div id="c2t"></div></div></div>
      <div class="figure"><h3>Net profit if you sold in a given year</h3>
        <p class="sub">Proceeds plus all rent and costs to that point, minus everything paid in, in ${b}. Below the line you have lost money.</p>
        <div class="fig-card">
          <ul class="legend">${SCEN.map((s, i) => `<li><i class="ln" style="border-color:var(--s${i + 1})"></i>${s.label}</li>`).join('')}</ul>
          <div class="chart" id="c3"></div><div id="c3t"></div>
          <p class="small muted" id="c3note" style="margin-top:8px"></p></div></div>`;

    const dataComp = m.rows.map((r) => [adj(r, r.land), adj(r, r.building), adj(r, r.premium)]);
    stackChart($('#c1'), {
      years, data: dataComp, ref: { value: total, label: `Total paid ${money(total)}` },
      comps: [{ name: 'Land', color: 'var(--s1)' }, { name: 'Building', color: 'var(--s2)' }, { name: 'Developer premium', color: 'var(--s3)' }],
      aria: `Value by year for the ${sn.label} case, split into land, building and developer premium.`,
      extra: (i) => (i ? tipRow('Land growth that year', pct(m.rows[i].landGrowth)) : ''),
    });
    $('#c1t').innerHTML = twinTable(['Year', 'Land', 'Building', 'Developer premium', 'Total'], m.rows.map((r, i) => [String(r.year), money(dataComp[i][0]), money(dataComp[i][1]), money(dataComp[i][2]), money(dataComp[i].reduce((a, c) => a + c, 0))]));

    const sold = models.map((mm) => mm.ifSold.map((s, t) => (state.basis === 'real' ? (s.proceedsReal ?? 0) : s.proceeds)));
    lineChart($('#c2'), {
      id: 'c2', years, aria: 'Money you would keep if you sold in each year, for the three scenarios.', ref: { value: total, label: `Total paid ${money(total)}` },
      series: SCEN.map((s, i) => ({ name: s.label, color: `var(--s${i + 1})`, values: sold[i] })),
    });
    $('#c2t').innerHTML = twinTable(['Year sold', ...SCEN.map((s) => s.label)], years.map((yr, t) => [String(yr), ...sold.map((v) => money(v[t]))]));

    const profit = models.map((mm) => mm.ifSold.map((s) => (state.basis === 'real' ? s.profitReal : s.profit)));
    lineChart($('#c3'), {
      id: 'c3', years, zero: true, aria: 'Net profit if you sold in each year, for the three scenarios.',
      series: SCEN.map((s, i) => ({ name: s.label, color: `var(--s${i + 1})`, values: profit[i] })),
    });
    $('#c3t').innerHTML = twinTable(['Year sold', ...SCEN.map((s) => s.label)], years.map((yr, t) => [String(yr), ...profit.map((v) => money(v[t]))]));
    const first = (arr) => { const i = arr.findIndex((v, t) => t > 0 && v >= 0); return i < 0 ? 'not within 25 years' : String(years[i]); };
    const realProfit = models.map((mm) => mm.ifSold.map((s) => s.profitReal));
    $('#c3note').textContent = `First year you would be ahead in today's money: ${SCEN.map((s, i) => `${s.label.toLowerCase()} ${first(realProfit[i])}`).join(' · ')}. A sale in the first few years loses money because of purchase costs and the developer premium. Selected hold: ${H} years.`;
  }

  /* ------------------------------------------------------------- projections */
  function renderProjections() {
    const k = state.scenario;
    const H = state.hold;
    const m = models[k];
    const g = state.deal;
    $('#projLead').textContent = `${SCEN[k].label} case. Amounts in ₹ lakh, in ${basisLabel()}. The highlighted row is the year you sell (${g.startYear + H}). Rows after it show what would happen if you held on.`;
    const a = (r, v) => lakh(adj(r, v));
    const cols = [
      ['Year', (r) => String(r.year)],
      ['Price index', (r) => r.cpi.toFixed(2)],
      ['Land growth', (r) => (r.i ? pct(r.landGrowth) : '')],
      ['Land', (r) => a(r, r.land)],
      ['Building', (r) => a(r, r.building)],
      ['Premium', (r) => a(r, r.premium)],
      ['Market value', (r) => a(r, r.market)],
      ['Rent due', (r) => a(r, r.gross)],
      ['Vacancy', (r) => a(r, -r.vacancy)],
      ['Letting', (r) => a(r, -r.letting)],
      ['Maintenance', (r) => a(r, -r.maintenance)],
      ['Property tax', (r) => a(r, -r.propertyTax)],
      ['Repairs, insurance', (r) => a(r, -(r.repairs + r.insurance))],
      ['Renovation', (r) => a(r, -r.renovation)],
      ['Tax on rent', (r) => a(r, -r.rentTax)],
      ['Paid for the villa', (r) => a(r, -r.outlay)],
      ['Net cash flow', (r) => a(r, r.cf)],
      ['Cumulative cash', (r) => a(r, r.cumCf)],
      ['Keep if sold now', (r) => (r.i ? lakh(state.basis === 'real' ? m.ifSold[r.i].proceedsReal : m.ifSold[r.i].proceeds) : '')],
      ['Profit if sold now', (r) => lakh(state.basis === 'real' ? m.ifSold[r.i].profitReal : m.ifSold[r.i].profit)],
    ];
    $('#projBody').innerHTML = `<div class="scroll tall"><table class="freeze"><thead class="freeze"><tr>${cols.map((c) => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${m.rows.map((r) => `<tr${r.i === H ? ' class="total"' : ''}>${cols.map((c, j) => (j === 0 ? `<th scope="row">${c[1](r)}</th>` : `<td>${c[1](r)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="small muted" style="margin-top:8px">Values are year-end, except the purchase row (2026), which is the day you buy. Rent and running costs start the year after handover (${g.possessionYear + 1}). Land growth is inflation plus real growth plus the cycle overlay. "Keep if sold now" is after resale discount, selling costs and capital gains tax.</p>`;
  }

  function downloadCsv() {
    const k = state.scenario;
    const m = models[k];
    const head = ['Year', 'Price index', 'Land growth', 'Land', 'Building', 'Developer premium', 'Market value', 'Gross rent', 'Vacancy loss', 'Letting cost', 'Maintenance', 'Property tax', 'Repairs', 'Insurance', 'Renovation', 'Tax on rent', 'Paid for the villa', 'Net cash flow', 'Cumulative cash', 'Keep if sold now', 'Profit if sold now', 'Net cash flow (today\'s rupees)', 'Keep if sold now (today\'s rupees)', 'Profit if sold now (today\'s rupees)'];
    const lines = [head.join(',')].concat(m.rows.map((r) => [r.year, r.cpi.toFixed(4), r.landGrowth.toFixed(4), r.land, r.building, r.premium, r.market, r.gross, r.vacancy, r.letting, r.maintenance, r.propertyTax, r.repairs, r.insurance, r.renovation, r.rentTax, r.outlay, r.cf, r.cumCf, m.ifSold[r.i].proceeds, m.ifSold[r.i].profit, r.cf / r.cpi, m.ifSold[r.i].proceedsReal ?? 0, m.ifSold[r.i].profitReal].map((v) => (typeof v === 'number' ? Math.round(v * 10000) / 10000 : v)).join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `villa-projection-${SCEN[k].key}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------------------------------------- sensitivity */
  const METRIC_OF = { irrReal: (e) => e.irrReal, irr: (e) => e.irr, profitReal: (e) => e.profitReal };
  const METRIC_FMT = { irrReal: (v) => pct(v), irr: (v) => pct(v), profitReal: (v) => lakh(v, 0) };
  const METRIC_NAME = { irrReal: 'Return a year after tax, in today\'s money', irr: 'Return a year after tax, nominal', profitReal: 'Net profit in today\'s money, ₹ lakh' };

  function heatStyle(v, max) {
    if (!Number.isFinite(v)) return '';
    const t = Math.min(1, Math.abs(v) / max);
    if (t < 0.04) return '';
    const step = Math.ceil(t * 5) / 5;
    return `background:color-mix(in srgb, var(${v >= 0 ? '--div-pos' : '--div-neg'}) ${Math.round(step * 80)}%, var(--div-mid));color:var(--heat-ink)`;
  }

  function heatTable(o) {
    const flat = o.data.flat().filter(Number.isFinite);
    const max = Math.max(1e-9, ...flat.map(Math.abs));
    return `<div class="scroll"><table class="heat" aria-label="${esc(o.aria)}"><thead><tr><th>${o.corner}</th>${o.cols.map((c) => `<th>${c.main}${c.sub ? `<small>${c.sub}</small>` : ''}</th>`).join('')}</tr></thead><tbody>${o.data.map((r, i) => `<tr><th scope="row">${o.rows[i].main}<small>${o.rows[i].sub}</small></th>${r.map((v, j) => `<td class="${i === o.baseRow && j === o.baseCol ? 'base' : ''}" style="${heatStyle(v, max)}">${Number.isFinite(v) ? o.fmt(v) : 'n/a'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function scaleLegend() {
    const arm = (cls, steps) => steps.map((n) => `<i style="background:color-mix(in srgb, var(${cls}) ${n * 16}%, var(--div-mid))"></i>`).join('');
    return `<div class="scale"><span>Worse</span><span class="scale__bar">${arm('--div-neg', [5, 4, 3, 2, 1])}</span><span>0</span><span class="scale__bar">${arm('--div-pos', [1, 2, 3, 4, 5])}</span><span>Better</span><span>· outlined cell = your current assumptions</span></div>`;
  }

  function renderSensitivity() {
    const k = state.scenario;
    const H = state.hold;
    const g = state.deal;
    const s = sc(k);
    const m = models[k];
    const metric = state.metric;
    const pi = s.inflation / 100;
    const avgReal = mean(M.landBlocks(s));
    const shifts = [-2, -1, 0, 1, 2, 3, 4];
    const rowHeads = shifts.map((d) => ({ main: `${pct((avgReal + d) / 100)} real`, sub: `about ${pct((1 + pi) * (1 + (avgReal + d) / 100) - 1)} nominal` }));
    const baseRow = shifts.indexOf(0);

    const baseYield = s.rentMonthly * 12 / g.purchasePrice * 100;
    const yields = [...new Set([1, 1.5, 2, 2.5, 3, 3.5, 4, +baseYield.toFixed(2)])].sort((a, b) => a - b);
    const gridA = M.grid(g, s, H, shifts, yields, { irrReal: 'irrReal', irr: 'irr', profitReal: 'profitReal' }[metric]);
    const baseColA = yields.indexOf(+baseYield.toFixed(2));

    const baseLand = m.land0 / 1e5;
    const lands = [...new Set([20, 30, 45, 60, 80, 100, Math.round(baseLand)])].sort((a, b) => a - b);
    const gridB = shifts.map((d) => lands.map((L) => {
      const g2 = Object.assign({}, g, { landRateAsking: (L * 1e5) / (g.plotSqft * (1 - g.askingHaircutPct / 100)) });
      const e = M.run(g2, s, { landShift: d }).exit(H);
      const v = METRIC_OF[metric](e);
      return v === null ? NaN : v;
    }));
    const baseColB = lands.indexOf(Math.round(baseLand));

    const holds = [5, 10, 15, 20, 25];
    const holdRows = holds.map((hh) => models.map((mm) => mm.exit(hh)));
    const maxHold = Math.max(1e-9, ...holdRows.flat().map((e) => Math.abs(e.irrReal ?? 0)));

    const be = breakEvens;
    const beCard = (i) => {
      const r = be[i];
      const avg = mean(M.landBlocks(sc(i)));
      const line = (res, label) => {
        if (res.below || res.shift <= 0) {
          const floor = res.below ? null : (avg + res.shift) / 100;
          return `<p><strong>${label}:</strong> already cleared${floor === null ? '' : `. Land could grow as little as ${pct(floor)} a year above inflation (${Math.abs(res.shift).toFixed(1)} points below the ${pct(avg / 100)} assumed)`}.</p>`;
        }
        if (res.shift === null) return `<p><strong>${label}:</strong> not reachable by land growth alone within 20 points.</p>`;
        return `<p><strong>${label}:</strong> land needs about ${pct((avg + res.shift) / 100)} a year above inflation, ${res.shift >= 0 ? '+' : MINUS}${Math.abs(res.shift).toFixed(1)} points versus the ${pct(avg / 100)} assumed.</p>`;
      };
      return `<article class="card"><h3><i class="key k${i}" aria-hidden="true"></i>${SCEN[i].label}</h3>${line(r.zero, 'To keep purchasing power')}${line(r.equity, 'To match the equity placeholder')}</article>`;
    };

    const toggle = `<div class="metric" role="radiogroup" aria-label="Measure shown in the tables">${Object.keys(METRIC_NAME).map((key) => `<label><input type="radio" name="metric" value="${key}"${key === metric ? ' checked' : ''}><span>${key === 'irrReal' ? 'Real return' : key === 'irr' ? 'Nominal return' : 'Net profit'}</span></label>`).join('')}</div>`;

    $('#sensBody').innerHTML = `
      <p class="lead">Each table re-runs the model for the <strong>${SCEN[k].label.toLowerCase()}</strong> case, selling after ${H} years. Change the scenario or hold period in the bar above.</p>
      <div class="sens"><div class="sens__head"><div><h3>Land appreciation against rental yield</h3><p class="muted small">Gross yield is yearly rent as a share of the ${money(g.purchasePrice)} price, before vacancy and costs. Measure: ${METRIC_NAME[metric]}.</p></div>${toggle}</div>
        ${heatTable({ aria: 'Sensitivity to land appreciation and rental yield', corner: 'Land growth ↓ · Rental yield →', rows: rowHeads, cols: yields.map((y) => ({ main: `${y.toFixed(y * 2 % 1 ? 2 : 1)}%`, sub: y === +baseYield.toFixed(2) ? 'yours' : '' })), data: gridA, fmt: METRIC_FMT[metric], baseRow, baseCol: baseColA })}
        ${scaleLegend()}</div>
      <div class="sens"><div class="sens__head"><div><h3>Land appreciation against the value of land you are buying</h3><p class="muted small">The biggest unknown: how much of the price is land. This changes the land value at purchase, in ₹ lakh. The rest of the price becomes building and developer premium. Check the plot (UDS) in your sale deed.</p></div></div>
        ${heatTable({ aria: 'Sensitivity to land appreciation and land value at purchase', corner: 'Land growth ↓ · Land at purchase →', rows: rowHeads, cols: lands.map((L) => ({ main: `₹${L} L`, sub: L === Math.round(baseLand) ? 'yours' : '' })), data: gridB, fmt: METRIC_FMT[metric], baseRow, baseCol: baseColB })}
        ${scaleLegend()}</div>
      <div class="sens"><h3>Does holding longer help?</h3><p class="muted small">Real return a year after tax (top) and net profit in today's rupees (bottom), for each year of sale.</p>
        <div class="scroll"><table class="heat"><thead><tr><th>Sell after</th>${SCEN.map((sn) => `<th>${sn.label}</th>`).join('')}</tr></thead><tbody>${holds.map((hh, i) => `<tr><th scope="row">${hh} years<small>${g.startYear + hh}</small></th>${holdRows[i].map((e) => `<td style="${heatStyle(e.irrReal ?? -maxHold, maxHold)}">${pct(e.irrReal)}<small style="display:block;font-weight:400">${money(e.profitReal)}</small></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
      <div class="sens"><h3>How much land growth would it take?</h3><p class="muted small">The extra yearly land growth, on top of the assumptions, needed after ${H} years. Everything else stays as set.</p><div class="be">${[0, 1, 2].map(beCard).join('')}</div></div>`;

    $$('input[name="metric"]', $('#sensBody')).forEach((r) => r.addEventListener('change', () => { state.metric = r.value; renderSensitivity(); }));
  }

  /* ---------------------------------------------------------------- inputs */
  function fieldHtml(f) {
    const v = state.deal[f.key];
    const control = TOGGLES.has(f.key)
      ? `<select data-deal="${f.key}" id="d-${f.key}"><option value="1"${v ? ' selected' : ''}>Yes</option><option value="0"${v ? '' : ' selected'}>No</option></select>`
      : `<input type="number" inputmode="decimal" step="${f.step}" value="${v}" data-deal="${f.key}" id="d-${f.key}">`;
    return `<div class="field"><label for="d-${f.key}"><span>${esc(f.label)}</span>${badge(f.c)}</label><div class="inp">${control}<span class="unit">${esc(f.unit)}</span></div><p class="note">${esc(f.note)} ${cite(f.src)}</p></div>`;
  }

  function buildAssumptions() {
    const groups = [...new Set(D.dealFields.map((f) => f.group))];
    const dealHtml = groups.map((gr) => `<h3 class="group">${esc(gr)}</h3><div class="fields">${D.dealFields.filter((f) => f.group === gr).map(fieldHtml).join('')}</div>`).join('');

    const pgroups = [...new Set(D.params.map((p) => p.group))];
    const paramHtml = pgroups.map((gr) => `<h3 class="group">${esc(gr)}</h3><div class="scroll"><table class="params"><thead><tr><th>Assumption</th>${SCEN.map((s) => `<th>${s.label}</th>`).join('')}<th>Why this number</th><th>Support</th></tr></thead><tbody>${D.params.filter((p) => p.group === gr).map((p) => `<tr><th scope="row" class="lab">${esc(p.label)}<span class="unit">${esc(p.unit)}</span></th>${[0, 1, 2].map((i) => `<td><input type="number" inputmode="decimal" step="any" value="${state.params[p.key][i]}" data-param="${p.key}" data-i="${i}" aria-label="${esc(p.label)}, ${SCEN[i].label}"></td>`).join('')}<td class="basis">${esc(p.basis)} ${cite(p.src)}</td><td>${badge(p.c)}</td></tr>`).join('')}</tbody></table></div>`).join('');

    const evidence = `<div class="scroll"><table><thead><tr><th>What</th><th class="wrap">Finding</th><th>Type</th><th class="wrap">Note</th></tr></thead><tbody>${D.evidence.map((e) => `<tr><th scope="row" class="wrap">${esc(e.what)}</th><td class="wrap" style="text-align:left">${esc(e.value)}</td><td>${esc(e.kind)}</td><td class="wrap">${esc(e.note)} ${cite(e.src)}</td></tr>`).join('')}</tbody></table></div>`;

    const factors = `<ul class="factors">${D.factors.map((f) => `<li><b>${esc(f.n)}</b><p>${esc(f.t)} ${cite(f.s)}</p></li>`).join('')}</ul>`;

    const method = `<ul class="method">
      <li><b>Timeline.</b> You buy in 2026 (year 0) and sell at the end of the chosen year. Handover is at the end of 2028, so rent and running costs start in 2029.</li>
      <li><b>Value = land + building + developer premium.</b> The price is split into the land at market value, the building at replacement cost, and the remainder. The remainder is the developer's margin, marketing, finance and tax, and resale buyers pay only part of it.</li>
      <li><b>Land</b> grows each year at inflation plus a real rate that changes every five years, plus an optional cycle that nets to zero over each cycle. Real rates are judgement bracketed by the cited data, not a forecast.</li>
      <li><b>Building</b> is its replacement cost, which rises with construction inflation, less straight-line depreciation over its economic life down to a residual value. Renovations take years off its age and cost money.</li>
      <li><b>Rent</b> starts at your 2026 figure and grows with inflation plus a real rate, less vacancy and letting costs. Tax on rent is 30% standard deduction after property tax, then your slab rate.</li>
      <li><b>Sale</b> is market value less a resale discount, brokerage and legal costs. Capital gains tax is 12.5% (plus surcharge and cess) on proceeds above price, purchase costs and renovations.</li>
      <li><b>IRR</b> is the discount rate at which all dated cash flows net to zero. The real IRR deflates each flow by that year's price index. Today's rupees divide by the same index.</li>
      <li><b>Alternatives</b> are a government bond taxed yearly at your rate, and an equity placeholder taxed once at sale. The verdict compares real after-tax IRR with them.</li>
      <li><b>Not modelled:</b> a home loan, interest on idle cash, inflation changing over time, tax on a sale below guideline value (Section 50C), a loss on rent offsetting other income, selling in stages, and any benefit from living in the villa yourself.</li></ul>`;

    const all = Object.keys(D.sources);
    const sources = `<ol class="sources">${all.map((key, i) => `<li id="src-${i + 1}"><span>${i + 1}</span><span><a href="${esc(D.sources[key].u)}" target="_blank" rel="noopener">${esc(D.sources[key].t)}</a><span class="badge k">${esc(D.sources[key].k)}</span></span></li>`).join('')}</ol>`;

    $('#assumeBody').innerHTML = `
      <div id="warnings"></div>
      <h3 class="group">What the price is made of</h3><div id="implied" class="prose"></div>
      ${dealHtml}
      <h2 style="margin-top:44px">Scenario assumptions</h2>
      <p class="lead">Three columns, one per scenario. Edit any cell.</p>${paramHtml}
      <h2 style="margin-top:44px">What was found, and what kind of evidence it is</h2>
      <p class="lead">Asking prices are what sellers want. Registered prices are what buyers paid, and none were available.</p>${evidence}
      <h2 style="margin-top:44px">The factors you asked about</h2>${factors}
      <h2 style="margin-top:44px">How the model works</h2>${method}
      <h2 style="margin-top:44px">Sources</h2>${sources}`;
    refreshDerived();
  }

  function refreshDerived() {
    const g = state.deal;
    const m = models[1];
    const warn = [];
    if (m.premiumGap < 0) warn.push('Land and building at cost add up to more than the price you pay, so the developer premium is set to zero. Check the plot size, land rate and built-up area.');
    if (g.payPct1 + g.payPct2 > 100) warn.push('The 2027 and 2028 instalments add up to more than 100%.');
    if (g.possessionYear < g.startYear) warn.push('The handover year is before the purchase year.');
    $('#warnings').innerHTML = warn.map((w) => `<p class="warn-box">${esc(w)}</p>`).join('');
    const total = g.purchasePrice;
    $('#implied').innerHTML = `<p>At today's inputs the ${money(total)} price is about <strong>${money(m.land0)}</strong> of land (${pct(m.land0 / total, 0)}), <strong>${money(m.build0)}</strong> of building at replacement cost (${pct(m.build0 / total, 0)}) and <strong>${money(m.premium0)}</strong> (${pct(m.premium0 / total, 0)}) of developer premium, plus <strong>${money(m.purchaseCosts)}</strong> of duty and fees. For comparison the RERA record declares ₹58.66 Cr for 58 villas, about ₹1.01 Cr each. ${cite(['rera'])}</p>`;
  }

  /* -------------------------------------------------------------- orchestration */
  const keepOpen = (fn) => {
    const open = $$('details.twin').map((d) => d.open);
    fn();
    $$('details.twin').forEach((d, i) => { d.open = Boolean(open[i]); });
  };

  function render() {
    compute();
    keepOpen(() => {
      renderVerdict();
      renderSummary();
      renderCharts();
      renderProjections();
      renderSensitivity();
    });
    if ($('#implied')) refreshDerived();
    $('#holdOut').textContent = `${state.hold} years`;
  }

  /* PDF: the browser's print engine with a report layout. "Save as PDF" in its dialog makes the file. */
  const fileTitle = 'Naaval Sunshine villa - 25-year investment analysis';
  let savedTitle = document.title;
  let savedTheme = null;
  function beforePrint() {
    if (printMode) return;
    printMode = true;
    const root = document.documentElement;
    savedTheme = root.dataset.theme || null;
    root.dataset.theme = 'light';
    savedTitle = document.title;
    document.title = fileTitle;
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    $('#printMeta').textContent = `Prepared ${date}. Charts, projections and sensitivity tables show the ${SCEN[state.scenario].label.toLowerCase()} case. Sale after ${state.hold} years. Amounts in ${basisLabel()}. This is a modelling tool, not financial, legal or tax advice. Many assumptions are judgement because no registered prices or local data series were available.`;
    render();
  }
  function afterPrint() {
    if (!printMode) return;
    printMode = false;
    const root = document.documentElement;
    if (savedTheme) root.dataset.theme = savedTheme; else delete root.dataset.theme;
    document.title = savedTitle;
    render();
  }
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);

  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 60); };

  function init() {
    load();
    const theme = storage.get('villa-theme');
    if (theme) document.documentElement.dataset.theme = theme;

    $$('input[name="scenario"]').forEach((r) => { r.checked = Number(r.value) === state.scenario; });
    $$('input[name="basis"]').forEach((r) => { r.checked = r.value === state.basis; });
    $('#holdRange').value = state.hold;

    $('#scenarioSeg').addEventListener('change', (e) => { state.scenario = Number(e.target.value); save(); render(); });
    $('#basisSeg').addEventListener('change', (e) => { state.basis = e.target.value; save(); render(); });
    $('#holdRange').addEventListener('input', (e) => { state.hold = Number(e.target.value); $('#holdOut').textContent = `${state.hold} years`; save(); schedule(); });
    $('#csvBtn').addEventListener('click', downloadCsv);
    $$('.js-pdf').forEach((b) => b.addEventListener('click', () => window.print()));
    $('#themeBtn').addEventListener('click', () => {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      storage.set('villa-theme', next);
    });
    $('#resetBtn').addEventListener('click', () => {
      if (!window.confirm('Reset every assumption to its default?')) return;
      state = fresh();
      save();
      $$('input[name="scenario"]').forEach((r) => { r.checked = Number(r.value) === state.scenario; });
      $$('input[name="basis"]').forEach((r) => { r.checked = r.value === state.basis; });
      $('#holdRange').value = state.hold;
      render();
      buildAssumptions();
    });

    $('#assumeBody').addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.deal) state.deal[t.dataset.deal] = num(t.value, D.deal[t.dataset.deal]);
      else if (t.dataset.param) {
        const p = D.params.find((q) => q.key === t.dataset.param);
        state.params[t.dataset.param][Number(t.dataset.i)] = num(t.value, p.v[Number(t.dataset.i)]);
      } else return;
      save();
      schedule();
    });

    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });

    render();
    buildAssumptions();
  }

  init();
})();
