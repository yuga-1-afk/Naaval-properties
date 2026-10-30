/* ROI estimate PDF for the calculator page.
   The visitor fills the short lead form in #roi-pdf; once the lead is sent (script.js fires `lead:sent`),
   this builds a one-page A4 PDF from the calculator's current figures and downloads it.
   The PDF is written directly (no library) using the built-in Helvetica fonts, so ₹ prints as "Rs". */
(() => {
  'use strict';

  const calc = document.querySelector('[data-calc]');
  const dialog = document.getElementById('roi-pdf');
  if (!calc || !dialog) return;
  const form = dialog.querySelector('form[data-lead-form]');

  /* ------------------------------------------------------------------ the form */
  const selected = () => {
    const pick = (step) => {
      const el = calc.querySelector(`[data-calc-step="${step}"]`);
      return el && el.value ? el.selectedOptions[0].textContent.trim() : '';
    };
    return { city: pick('city'), area: pick('area'), project: pick('project'), config: pick('config') };
  };

  function resetForm() {
    form.reset();
    form.classList.remove('is-sent');
    form.querySelectorAll('.field').forEach((f) => {
      f.classList.remove('has-error');
      const err = f.querySelector('.field__error');
      if (err) err.textContent = '';
    });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const ok = form.querySelector('[data-success]');
    if (ok) ok.hidden = true;
    const status = form.querySelector('[data-status]');
    if (status) status.textContent = '';
    const btn = form.querySelector('[type="submit"]');
    if (btn && btn.dataset.label) { btn.innerHTML = btn.dataset.label; btn.disabled = false; }
  }

  document.querySelectorAll('[data-roi-pdf]').forEach((btn) => btn.addEventListener('click', () => {
    const r = calc.roiResult;
    if (!r) return;
    resetForm();
    const s = selected();
    const set = (name, v) => { if (form.elements[name]) form.elements[name].value = v; };
    set('project', [s.project, s.area, s.city].filter(Boolean).join(', '));
    set('villaType', s.config);
    set('holdYears', r.years);
    set('estimatedValue', Math.round(r.future));
    set('estimatedProfit', Math.round(r.net));
    dialog.showModal();
  }));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  form.addEventListener('lead:sent', async (e) => {
    try {
      const bytes = await build(calc.roiResult, selected(), (e.detail && e.detail.name) || '');
      download(bytes, 'Naaval-Sunshine-ROI-estimate.pdf');
    } catch (err) {
      console.error(err);
      const status = form.querySelector('[data-status]');
      if (status) status.textContent = 'Your details were sent, but the PDF could not be created. Please call +91 95855 21999.';
    }
  });

  function download(bytes, name) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* -------------------------------------------------------------- formatting */
  const clean = (t) => String(t)
    .replace(/₹\s?/g, 'Rs ')
    .replace(/[−–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
  const sign = (n) => (n < 0 ? '-' : '');
  const inr = (n) => `${sign(n)}Rs ${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
  const short = (n) => {
    const a = Math.abs(n);
    if (a >= 1e7) return `${sign(n)}Rs ${(a / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `${sign(n)}Rs ${(a / 1e5).toFixed(1)} L`;
    return inr(n);
  };
  const pct = (x) => `${x < 0 ? '-' : ''}${Math.abs(x * 100).toFixed(1)}%`;

  /* ------------------------------------------------------------ pdf drawing */
  const W = 595.28;
  const H = 841.89;
  const M = 40;
  const C = {
    navy: [24, 38, 84], sun: [236, 166, 58], ink: [29, 35, 51], muted: [100, 107, 122], line: [228, 222, 210],
    cream: [251, 247, 239], white: [255, 255, 255], land: [61, 95, 192], villa: [201, 132, 24],
    good: [31, 122, 77], bad: [179, 38, 30], soft: [200, 206, 222],
  };

  function writer() {
    const ops = [];
    const ctx = document.createElement('canvas').getContext('2d');
    // Arial shares Helvetica's metrics, so the browser can measure what the PDF will print.
    const width = (t, size, bold) => {
      if (!ctx) return t.length * size * 0.52;
      ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, Helvetica, sans-serif`;
      return ctx.measureText(t).width;
    };
    const rgb = (c) => c.map((v) => (v / 255).toFixed(3)).join(' ');
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const f = (n) => n.toFixed(2);
    return {
      ops, width, esc,
      text(t, x, y, o = {}) {
        const s = clean(t);
        const size = o.size || 10;
        const w = width(s, size, o.bold);
        const left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
        ops.push(`BT /${o.bold ? 'F2' : 'F1'} ${size} Tf ${rgb(o.color || C.ink)} rg ${f(left)} ${f(H - y)} Td (${esc(s)}) Tj ET`);
        return w;
      },
      rect(x, y, w, h, color) { ops.push(`${rgb(color)} rg ${f(x)} ${f(H - y - h)} ${f(w)} ${f(h)} re f`); },
      line(x1, y1, x2, y2, color, lw = 0.6, dash = '') {
        ops.push(`${rgb(color)} RG ${lw} w [${dash}] 0 d ${f(x1)} ${f(H - y1)} m ${f(x2)} ${f(H - y2)} l S [] 0 d`);
      },
      image(name, x, y, w, h) { ops.push(`q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(H - y - h)} cm /${name} Do Q`); },
      wrap(t, maxW, size, bold) {
        const words = clean(t).split(/\s+/);
        const lines = [];
        let cur = '';
        words.forEach((wd) => {
          const next = cur ? `${cur} ${wd}` : wd;
          if (width(next, size, bold) > maxW && cur) { lines.push(cur); cur = wd; } else cur = next;
        });
        if (cur) lines.push(cur);
        return lines;
      },
    };
  }

  /* White logo flattened onto the navy header colour, as JPEG bytes. */
  function logo() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = 640;
          const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const x = c.getContext('2d');
          x.fillStyle = 'rgb(24,38,84)';
          x.fillRect(0, 0, w, h);
          x.drawImage(img, 0, 0, w, h);
          resolve({ bin: atob(c.toDataURL('image/jpeg', 0.92).split(',')[1]), w, h });
        } catch (err) { resolve(null); } // e.g. opened from file:// where the canvas is tainted
      };
      img.onerror = () => resolve(null);
      img.src = 'assets/images/logo-naaval-white.png';
    });
  }

  function niceMax(v) {
    const raw = v / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw);
    return { step, max: Math.ceil(v / step) * step };
  }

  async function build(r, sel, name) {
    if (!r) throw new Error('No estimate to export');
    const w = writer();
    const img = await logo();
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const startYear = now.getFullYear();

    /* header */
    w.rect(0, 0, W, 100, C.navy);
    if (img) {
      const lh = 36;
      w.image('Im1', M, 30, (lh * img.w) / img.h, lh);
    } else {
      w.text('Naaval Properties', M, 58, { size: 18, bold: true, color: C.white });
    }
    w.text('VILLA ROI ESTIMATE', W - M, 40, { size: 9, bold: true, color: C.sun, align: 'right' });
    w.text(name ? `Prepared for ${name}` : 'Your personalised estimate', W - M, 58, { size: 12, bold: true, color: C.white, align: 'right' });
    w.text(date, W - M, 74, { size: 9, color: C.soft, align: 'right' });

    /* villa */
    let y = 134;
    const place = [sel.project, sel.area, sel.city].filter(Boolean).join(', ');
    w.text(place || 'Naaval Sunshine', M, y, { size: 17, bold: true, color: C.navy });
    y += 18;
    w.text(`${sel.config || 'Villa'}  ·  Villa price ${inr(r.price)}  ·  Held for ${r.years} years (${startYear} to ${startYear + r.years})`, M, y, { size: 9.5, color: C.muted });

    /* key figures */
    y = 172;
    const gap = 10;
    const bw = (W - 2 * M - 2 * gap) / 3;
    const boxes = [
      { label: `Estimated value in ${r.years} years`, value: short(r.future), sub: `from ${short(r.invest)} invested`, fill: C.navy, vc: C.sun, lc: C.soft },
      { label: 'Net profit', value: short(r.net), sub: 'after rent and maintenance', fill: C.cream, vc: r.net >= 0 ? C.good : C.bad, lc: C.muted },
      { label: 'Total return', value: pct(r.roi), sub: `${pct(r.annual)} a year`, fill: C.cream, vc: C.ink, lc: C.muted },
    ];
    boxes.forEach((b, i) => {
      const x = M + i * (bw + gap);
      w.rect(x, y, bw, 70, b.fill);
      w.text(b.label, x + 12, y + 19, { size: 8.5, color: b.lc });
      w.text(b.value, x + 12, y + 45, { size: 20, bold: true, color: b.vc });
      w.text(b.sub, x + 12, y + 60, { size: 8, color: b.lc });
    });

    /* chart: land + villa value by year, against total investment */
    y = 272;
    w.text('Property value by year', M, y, { size: 11, bold: true, color: C.navy });
    let lx = W - M;
    [['Total investment', null], ['Villa', C.villa], ['Land', C.land]].forEach(([label, color]) => {
      const tw = w.width(label, 8, false);
      w.text(label, lx, y, { size: 8, color: C.muted, align: 'right' });
      lx -= tw + 5;
      if (color) w.rect(lx - 8, y - 7, 8, 8, color); else w.line(lx - 14, y - 3, lx, y - 3, C.ink, 1, '3 2');
      lx -= color ? 22 : 28;
    });
    const top = y + 14;
    const ch = 140;
    const left = M + 46;
    const right = W - M;
    const totals = r.series.map((s) => s.land + s.villa);
    const { step, max } = niceMax(Math.max(r.invest, ...totals) * 1.04);
    const yv = (v) => top + ch - (ch * v) / max;
    for (let v = 0; v <= max + 1; v += step) {
      w.line(left, yv(v), right, yv(v), C.line, 0.5);
      w.text(v ? short(v).replace('.00 ', ' ') : 'Rs 0', left - 6, yv(v) + 3, { size: 7, color: C.muted, align: 'right' });
    }
    const slot = (right - left) / r.series.length;
    const barW = Math.min(16, slot * 0.62);
    const every = r.series.length <= 11 ? 1 : r.series.length <= 16 ? 3 : 5;
    r.series.forEach((s, i) => {
      const cx = left + slot * i + slot / 2;
      const yl = yv(s.land);
      w.rect(cx - barW / 2, yl, barW, yv(0) - yl, C.land);
      const yt = yv(s.land + s.villa);
      if (yl - yt > 1.2) w.rect(cx - barW / 2, yt, barW, yl - yt - 1, C.villa);
      if (i % every === 0 || i === r.series.length - 1) {
        w.text(i === 0 ? 'Now' : `Y${i}`, cx, top + ch + 12, { size: 7, color: C.muted, align: 'center' });
      }
    });
    w.line(left, yv(r.invest), right - 1, yv(r.invest), C.ink, 1, '4 3');
    w.text(`Total investment ${short(r.invest)}`, left + 4, yv(r.invest) - 4, { size: 7.5, bold: true, color: C.ink });

    /* breakdown */
    y = top + ch + 40;
    w.text('Cost and return breakdown', M, y, { size: 11, bold: true, color: C.navy });
    y += 10;
    const end = r.series[r.series.length - 1];
    const rows = [
      ['Villa price', inr(r.price)],
      [`Stamp duty (${+(r.stampPct * 100).toFixed(2)}%)`, inr(r.stamp)],
      [`Registration fee (${+(r.regPct * 100).toFixed(2)}%)`, inr(r.reg)],
      ['Total investment', inr(r.invest), true],
      ['Land value', `${short(r.series[0].land)}  to  ${short(end.land)}`],
      ['Villa (building) value', `${short(r.series[0].villa)}  to  ${short(end.villa)}`],
      ['Capital gain', short(r.future - r.invest)],
      [`Rental income over ${r.years} years`, short(r.rentTotal)],
      [`Maintenance over ${r.years} years`, short(-r.maintTotal)],
      ['Net profit', short(r.net), true],
    ];
    rows.forEach(([label, value, strong]) => {
      y += 17;
      w.text(label, M, y, { size: 9.5, bold: !!strong, color: strong ? C.ink : C.muted });
      w.text(value, W - M, y, { size: 9.5, bold: true, color: label === 'Net profit' ? (r.net >= 0 ? C.good : C.bad) : C.ink, align: 'right' });
      w.line(M, y + 6, W - M, y + 6, C.line, 0.5);
    });

    /* assumptions + disclaimer */
    y += 26;
    w.wrap(`Based on: ${r.assumptions}`, W - 2 * M, 8.5).forEach((ln) => { w.text(ln, M, y, { size: 8.5, color: C.ink }); y += 11; });
    y += 4;
    w.wrap('Projections are illustrative and based on the assumptions shown. Property values can go down as well as up. This is not financial advice. Stamp duty and registration are indicative; final prices and charges will be confirmed by the Naaval Properties sales team.', W - 2 * M, 7.5)
      .forEach((ln) => { w.text(ln, M, y, { size: 7.5, color: C.muted }); y += 10; });

    /* footer */
    w.rect(0, H - 52, W, 52, C.navy);
    w.text('Book a site visit:  +91 95855 21999  ·  sales@naaval.in', M, H - 28, { size: 10.5, bold: true, color: C.white });
    w.text('Naaval Sunshine, Siddhar Kovil Road, Salem, Tamil Nadu', M, H - 14, { size: 8.5, color: C.soft });
    w.text('Building Better Communities.', W - M, H - 21, { size: 8.5, color: C.sun, align: 'right' });

    return assemble(w.ops.join('\n'), img, `Naaval Sunshine ROI estimate${name ? ` for ${name}` : ''}`, w.esc);
  }

  /* Minimal PDF 1.4 file: one page, Helvetica + Helvetica-Bold, optional JPEG logo. */
  function assemble(content, img, title, esc) {
    const objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objs[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${img ? ' /XObject << /Im1 7 0 R >>' : ''} >> /Contents 6 0 R >>`;
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    objs[6] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    if (img) objs[7] = `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bin.length} >>\nstream\n${img.bin}\nendstream`;
    const info = objs.length;
    const d = new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    objs[info] = `<< /Title (${esc(clean(title))}) /Author (Naaval Properties) /Creator (Naaval Sunshine ROI calculator) /CreationDate (D:${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}) >>`;

    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    for (let i = 1; i < objs.length; i += 1) {
      offsets[i] = out.length;
      out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }

  // For checking the output without a download (used by tests): window.RoiPdf.build().
  window.RoiPdf = { build: (name) => build(calc.roiResult, selected(), name || '') };
})();
