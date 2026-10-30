/* Run with:  node model.test.js   (no dependencies) */
'use strict';
global.window = {};
const assert = require('assert');
const M = require('./model.js');
require('./data.js');
const D = window.VillaData;

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || 'value'}: ${a} vs ${b}`);
const scen = (i) => {
  const s = {};
  D.params.forEach((p) => { s[p.key] = p.v[i]; });
  return s;
};
const deal = () => Object.assign({}, D.deal);

/* 1 · IRR on cases with a known answer */
close(M.irr([-100, 110]), 0.10, 1e-9, 'one-period IRR');
close(M.irr([-100, 0, 121]), 0.10, 1e-9, 'two-period IRR');
close(M.irr([-100, 5, 5, 105]), 0.05, 1e-9, 'par bond IRR');
assert.strictEqual(M.irr([-100, -5]), null, 'all-negative flows have no IRR');
close(M.npv([-100, 110], 0.10), 0, 1e-9, 'NPV at the IRR is zero');

/* 2 · Accounting identities on the default case */
[0, 1, 2].forEach((k) => {
  const g = deal();
  const m = M.run(g, scen(k));
  const x = m.exit(25);
  close(x.profit, x.flows.reduce((a, b) => a + b, 0), 1e-6, 'profit = sum of flows');
  close(m.rows[0].cf, -(g.purchasePrice + m.purchaseCosts), 1e-6, 'year-0 outlay');
  close(x.sale.net - x.sale.tax, x.sale.proceeds, 1e-6, 'proceeds = net sale − tax');
  close(m.rows[25].market, m.rows[25].land + m.rows[25].building + m.rows[25].premium, 1e-6, 'value = land + building + premium');
  // Every rupee of operating cash flow reconciles with its parts.
  const t = x.totals;
  close(t.operating, t.rent - t.letting - t.maintenance - t.propertyTax - t.repairs - t.insurance - t.renovation - t.rentTax, 1e-3, 'operating cash flow reconciles');
  assert.ok(x.irr === null || Math.abs(x.irrReal - ((1 + x.irr) / 1.05 - 1)) < 0.004, 'real IRR ≈ (1+nominal)/(1+inflation) − 1');
});

/* 3 · No growth, no rent, no inflation: result is exactly price-in minus costs */
{
  const g = deal();
  Object.assign(g, { letOut: 0, cycleOn: 0, insurancePct: 0, ltcgPct: 0, saleBrokeragePct: 0, saleLegalPct: 0, section54: 0 });
  const s = scen(1);
  Object.assign(s, { inflation: 0, landReal0: 0, landReal1: 0, landReal2: 0, landReal3: 0, landReal4: 0, maintPsf: 0, propTax0: 0, repairsPct: 0, renovationPct: 0, exitDiscountPct: 0, buildInflPremium: 0 });
  const m = M.run(g, s);
  const x = m.exit(10);
  close(x.irr, x.irrReal, 1e-9, 'with 0% inflation, nominal IRR = real IRR');
  const expectValue = m.land0 + m.build0 * (1 - Math.min(1, (10 - m.poss - 6 * Math.floor((10 - m.poss) / 12)) / s.lifeYears) * 0.9)
    + m.premium0 * (s.premiumRetention / 100) * Math.pow(1 - s.premiumErosion / 100, 10);
  close(m.rows[10].market, expectValue, 1, 'value after 10 flat years');
}

/* 4 · Direction of every lever */
{
  const g = deal();
  const base = M.run(g, scen(1)).exit(25).irrReal;
  const up = (patch, from) => M.run(g, Object.assign({}, scen(1), patch)).exit(25).irrReal > from;
  assert.ok(up({ landReal0: 4, landReal1: 4, landReal2: 4, landReal3: 4, landReal4: 4 }, base), 'more land growth raises IRR');
  assert.ok(up({ vacancyPct: 0 }, base), 'less vacancy raises IRR');
  assert.ok(!up({ maintPsf: 6 }, base), 'higher maintenance lowers IRR');
  assert.ok(!up({ exitDiscountPct: 25 }, base), 'bigger resale discount lowers IRR');
  assert.ok(M.run(g, scen(1), { landShift: 2 }).exit(25).irrReal > base, 'landShift raises IRR');
  const g2 = Object.assign({}, g, { marginalTaxPct: 10 });
  assert.ok(M.run(g2, scen(1)).exit(25).irrReal > base, 'lower rent tax raises IRR');
}

/* 5 · Scenario ordering and break-even */
{
  const g = deal();
  const r = [0, 1, 2].map((k) => M.run(g, scen(k)).exit(25).irrReal);
  assert.ok(r[0] < r[1] && r[1] < r[2], `scenarios are ordered: ${r.map((v) => v.toFixed(4))}`);
  const be = M.breakEven(g, scen(1), 25, 0);
  assert.ok(be.shift !== null);
  close(M.run(g, scen(1), { landShift: be.shift }).exit(25).irrReal, 0, 1e-5, 'break-even lands on target');
}

/* Selling the day you buy returns less than you paid, because of costs and the developer premium. */
{
  const m = M.run(deal(), scen(1));
  assert.ok(m.ifSold[0].proceeds > 0 && m.ifSold[0].proceeds < m.rows[0].outlay, 'day-0 sale loses money');
  close(m.ifSold[0].profit, m.ifSold[0].proceeds - m.rows[0].outlay, 1e-6, 'day-0 profit');
  close(m.ifSold[25].profit, m.exit(25).profit, 1e-6, 'ifSold[25] matches exit(25)');
}

/* 6 · Self-occupied: no rent income at all */
{
  const g = deal();
  g.letOut = 0;
  const x = M.run(g, scen(1)).exit(25);
  assert.strictEqual(x.totals.rent, 0);
  assert.strictEqual(x.totals.rentTax, 0);
}

/* 7 · Report */
const fmt = (n) => (n === null ? 'n/a' : (n * 100).toFixed(2) + '%');
const cr = (n) => (n / 1e7).toFixed(2) + ' Cr';
console.log('\nPurchase split (moderate):');
{
  const m = M.run(deal(), scen(1));
  console.log(`  land ${cr(m.land0)} · building ${cr(m.build0)} · premium ${cr(m.premium0)} · costs ${cr(m.purchaseCosts)}`);
}
['Conservative', 'Moderate', 'Optimistic'].forEach((name, k) => {
  const g = deal();
  const m = M.run(g, scen(k));
  const x = m.exit(25);
  const h = M.hurdles(g, scen(k), 25);
  const v = M.verdict(x.irrReal, h);
  console.log(`\n${name}`);
  console.log(`  day-0 resale value ${cr(m.rows[0].market)} · 2051 value ${cr(x.marketValue)} (today's ${cr(x.marketValueReal)})`);
  console.log(`  land ${cr(m.rows[25].land)} · building ${cr(m.rows[25].building)} · premium ${cr(m.rows[25].premium)}`);
  console.log(`  net rent+costs (after tax) over 25y ${cr(x.totals.operating)} · gross rent ${cr(x.totals.rentGross)}`);
  console.log(`  sale net ${cr(x.sale.net)} · CGT ${cr(x.sale.tax)} · proceeds ${cr(x.sale.proceeds)}`);
  console.log(`  profit ${cr(x.profit)} (today's ${cr(x.profitReal)}) · multiple ${x.multiple && x.multiple.toFixed(2)}x`);
  console.log(`  IRR ${fmt(x.irr)} nominal · ${fmt(x.irrReal)} real · value CAGR ${fmt(x.valueCagr)} · hurdles bond ${fmt(h.bondReal)} equity ${fmt(h.equityReal)} real`);
  console.log(`  verdict: ${v.label}`);
  const be = M.breakEven(g, scen(k), 25, 0);
  console.log(`  extra real land growth to break even with inflation: ${be.shift === null ? '> 20 pp' : be.shift.toFixed(2) + ' pp'}`);
});
console.log('\nAll model checks passed.');
