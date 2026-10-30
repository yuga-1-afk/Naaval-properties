/* 25-year villa investment model — pure functions, no DOM.
   Loaded by index.html (as window.VillaModel) and by model.test.js (Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VillaModel = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const YEARS = 25;      // projection length; row 0 is the purchase year
  const BLOCK = 5;       // land growth is set per 5-year block
  const sum = (list) => list.reduce((a, b) => a + b, 0);

  /* Internal rate of return by bisection. Returns null when no root exists
     (e.g. you never get your money back). */
  function irr(flows) {
    const npv = (r) => flows.reduce((s, c, i) => s + c / Math.pow(1 + r, i), 0);
    let lo = -0.9;
    let hi = 1;
    let fLo = npv(lo);
    if (fLo * npv(hi) > 0) return null;
    for (let k = 0; k < 200; k += 1) {
      const mid = (lo + hi) / 2;
      const fMid = npv(mid);
      if (fMid * fLo > 0) { lo = mid; fLo = fMid; } else hi = mid;
    }
    return (lo + hi) / 2;
  }

  const npv = (flows, rate) => flows.reduce((s, c, i) => s + c / Math.pow(1 + rate, i), 0);

  /* Scenario params arrive flat from the UI (landReal0…landReal4); the model wants an array. */
  function landBlocks(s) {
    return [0, 1, 2, 3, 4].map((i) => Number(s[`landReal${i}`]));
  }

  /* Run one scenario for the full 25 years. `o.landShift` adds percentage points to real land growth
     every year (used by the sensitivity grid and break-even solver). */
  function run(g, s, o) {
    const opts = o || {};
    const pi = s.inflation / 100;
    const poss = g.possessionYear - g.startYear;     // index of the year the villa is handed over
    const rentFrom = poss + 1;                       // first full year with rent and running costs
    const blocks = landBlocks(s);

    const land0 = g.plotSqft * g.landRateAsking * (1 - g.askingHaircutPct / 100);
    const build0 = g.builtUpSqft * g.buildCostPsf;
    const premiumGap = g.purchasePrice - land0 - build0;
    const premium0 = Math.max(0, premiumGap);

    const purchaseCosts = g.purchasePrice * (g.stampDutyPct + g.registrationPct + g.legalPurchasePct + g.purchaseBrokeragePct) / 100
      + g.otherPurchaseCosts;
    const pay = [100 - g.payPct1 - g.payPct2, g.payPct1, g.payPct2];

    const rows = [];
    let cpi = 1;
    let land = land0;
    let repl = build0;
    let cumCf = 0;

    for (let i = 0; i <= YEARS; i += 1) {
      let landGrowth = 0;
      if (i > 0) {
        cpi *= 1 + pi;
        const cycle = g.cycleOn ? (s.cycleAmp / 100) * Math.sin((2 * Math.PI * (i - 1)) / g.cyclePeriod) : 0;
        const real = blocks[Math.min(4, Math.floor((i - 1) / BLOCK))] / 100 + cycle + (opts.landShift || 0) / 100;
        landGrowth = (1 + pi) * (1 + real) - 1;
        land *= 1 + landGrowth;
        repl *= (1 + pi) * (1 + s.buildInflPremium / 100);
      }

      const age = Math.max(0, i - poss);
      const renovations = Math.floor(age / g.renovationEvery);
      const effectiveAge = Math.max(0, age - g.renovationCredit * renovations);
      const depreciation = Math.min(1, effectiveAge / s.lifeYears) * (1 - g.salvagePct / 100);
      const building = repl * (1 - depreciation);
      const premium = premium0 * (s.premiumRetention / 100) * Math.pow((1 + pi) * (1 - s.premiumErosion / 100), i);
      const market = land + building + premium;

      const active = i >= rentFrom;
      const gross = g.letOut && active ? s.rentMonthly * 12 * cpi * Math.pow(1 + s.rentRealGrowth / 100, i) : 0;
      const vacancy = gross * s.vacancyPct / 100;
      const rent = gross - vacancy;
      const letting = rent * s.lettingCostPct / 100;
      const maintenance = active ? s.maintPsf * 12 * g.builtUpSqft * cpi : 0;
      const propertyTax = active ? s.propTax0 * Math.pow(1 + s.propTaxEsc / 100, i) : 0;
      const repairs = active ? s.repairsPct / 100 * repl : 0;
      const insurance = active ? g.insurancePct / 100 * repl : 0;
      const renovation = i > poss && age % g.renovationEvery === 0 ? s.renovationPct / 100 * repl : 0;

      const navAfterDeduction = Math.max(0, rent - propertyTax) * (1 - g.standardDeductionPct / 100);
      const rentTax = navAfterDeduction * g.marginalTaxPct / 100;
      const expenses = letting + maintenance + propertyTax + repairs + insurance + renovation;
      const operating = rent - expenses - rentTax;

      const outlay = (pay[i] !== undefined ? g.purchasePrice * pay[i] / 100 : 0) + (i === 0 ? purchaseCosts : 0);
      const cf = operating - outlay;
      cumCf += cf;

      rows.push({
        i, year: g.startYear + i, cpi, landGrowth, land, building, premium, market, repl, age: effectiveAge,
        gross, vacancy, rent, letting, maintenance, propertyTax, repairs, insurance, renovation, expenses,
        rentTax, operating, outlay, cf, cumCf,
      });
    }

    const cgtRate = g.ltcgPct / 100 * (1 + g.ltcgSurchargePct / 100) * (1 + g.cessPct / 100);

    /* Money you walk away with if you sell at the end of year t. */
    function sale(t) {
      const r = rows[t];
      const price = r.market * (1 - s.exitDiscountPct / 100);
      const costs = price * (g.saleBrokeragePct + g.saleLegalPct) / 100;
      const net = price - costs;
      const improvements = sum(rows.slice(1, t + 1).map((x) => x.renovation));
      const basis = g.purchasePrice + purchaseCosts + improvements;
      const gain = net - basis;
      const tax = g.section54 ? 0 : Math.max(0, gain) * cgtRate;
      return { price, costs, net, basis, gain, tax, proceeds: net - tax };
    }

    /* Full result for selling at the end of year h. */
    function exit(h) {
      const sl = sale(h);
      const flows = rows.slice(0, h + 1).map((x) => x.cf);
      flows[h] += sl.proceeds;
      const real = flows.map((c, i) => c / rows[i].cpi);
      const span = rows.slice(1, h + 1);
      const total = (key) => sum(span.map((x) => x[key]));
      const outflows = -sum(flows.filter((c) => c < 0)) + 0;
      const inflows = sum(flows.filter((c) => c > 0));
      const mv = rows[h].market;
      return {
        h, sale: sl, flows, realFlows: real,
        irr: irr(flows), irrReal: irr(real),
        profit: sum(flows), profitReal: sum(real),
        multiple: outflows > 0 ? inflows / outflows : null,
        valueCagr: Math.pow(mv / g.purchasePrice, 1 / h) - 1,
        valueCagrReal: Math.pow(mv / rows[h].cpi / g.purchasePrice, 1 / h) - 1,
        marketValue: mv, marketValueReal: mv / rows[h].cpi,
        totals: {
          rentGross: total('gross'), vacancy: total('vacancy'), rent: total('rent'),
          letting: total('letting'), maintenance: total('maintenance'), propertyTax: total('propertyTax'),
          repairs: total('repairs'), insurance: total('insurance'), renovation: total('renovation'),
          rentTax: total('rentTax'), operating: total('operating'),
        },
      };
    }

    /* Series for "what if I sold in year t" charts. */
    const ifSold = rows.map((r, t) => {
      const sl = sale(t);
      const profit = r.cumCf + sl.proceeds;
      const profitReal = sum(rows.slice(0, t + 1).map((x) => x.cf / x.cpi)) + sl.proceeds / r.cpi;
      return { t, proceeds: sl.proceeds, proceedsReal: sl.proceeds / r.cpi, profit, profitReal };
    });

    return { rows, exit, sale, ifSold, land0, build0, premium0, premiumGap, purchaseCosts, pay, poss };
  }

  /* What the same money would earn elsewhere, after tax, over h years. */
  function hurdles(g, s, h) {
    const pi = s.inflation / 100;
    const bond = g.riskFreePct / 100 * (1 - g.marginalTaxPct / 100);
    const eqTax = g.ltcgPct / 100 * (1 + g.ltcgSurchargePct / 100) * (1 + g.cessPct / 100);
    const equity = Math.pow(1 + (Math.pow(1 + g.equityPct / 100, h) - 1) * (1 - eqTax), 1 / h) - 1;
    const real = (x) => (1 + x) / (1 + pi) - 1;
    return { bond, equity, bondReal: real(bond), equityReal: real(equity) };
  }

  /* Plain-English call on a scenario, from its real after-tax IRR. */
  function verdict(irrReal, hurdle) {
    if (irrReal === null) return { key: 'loss', label: 'Never recovers the cash invested' };
    if (irrReal >= hurdle.equityReal) return { key: 'beats', label: 'Beats the alternatives' };
    if (irrReal >= hurdle.bondReal && irrReal > 0) return { key: 'mid', label: 'Beats bonds, trails equities' };
    if (irrReal >= 0) return { key: 'flat', label: 'Keeps pace with inflation only' };
    return { key: 'loss', label: 'Loses purchasing power' };
  }

  /* Extra real land growth (percentage points, every year) needed for the real after-tax IRR to hit `target`. */
  function breakEven(g, s, h, target) {
    const at = (shift) => {
      const r = run(g, s, { landShift: shift }).exit(h).irrReal;
      return r === null ? -1 : r - target;
    };
    let lo = -8;
    let hi = 20;
    if (at(hi) < 0) return { shift: null, above: true };
    if (at(lo) > 0) return { shift: lo, below: true };
    for (let k = 0; k < 60; k += 1) {
      const mid = (lo + hi) / 2;
      if (at(mid) > 0) hi = mid; else lo = mid;
    }
    return { shift: (lo + hi) / 2 };
  }

  const METRICS = {
    irrReal: (x) => x.irrReal,
    irr: (x) => x.irr,
    profitReal: (x) => x.profitReal,
    value: (x) => x.marketValue,
  };

  /* Sensitivity grid: rows = extra real land growth (pp), columns = gross rental yield on the purchase price. */
  function grid(g, s, h, shifts, yields, metric) {
    return shifts.map((shift) => yields.map((y) => {
      const sc = Object.assign({}, s, { rentMonthly: y / 100 * g.purchasePrice / 12 });
      const v = METRICS[metric](run(g, sc, { landShift: shift }).exit(h));
      return v === null ? NaN : v;
    }));
  }

  return { YEARS, run, irr, npv, hurdles, verdict, breakEven, grid, landBlocks };
}));
