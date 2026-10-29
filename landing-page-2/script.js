/* Naaval Sunshine — landing page behaviour (shared by all four landing pages) */
(() => {
  'use strict';

  /* ---------------------------------------------------------------
     Settings
     --------------------------------------------------------------- */
  const CONFIG = {
    // Google Sheet web app URL (see google-sheet/SETUP.md), ending in /exec.
    // Every form is saved to the sheet's "Leads" tab and the calculator reads its "Calculator" tab.
    // Leave empty to run in demo mode: leads are only logged to the console and the
    // calculator uses the built-in list below.
    endpoint: 'https://script.google.com/macros/s/AKfycbzvpRlZFKbqC-03a5KmPN4FCQfz65XZP6CaLiiStQ1BVcCxqQhVlwihDa3fX9pW5D3w/exec',
    files: {
      brochure: 'assets/docs/brochure.pdf',
      floorplans: 'assets/docs/floor-plans.pdf',
    },
    // Cost calculator. Charges are indicative Tamil Nadu rates — confirm with the
    // Naaval sales / legal team before going live. When the sheet is connected, its
    // "Calculator" and "Settings" tabs replace these values.
    calculator: {
      stampDuty: 0.07,
      registration: 0.02,
      defaults: ['Salem', 'Siddhar Kovil Road', 'Naaval Sunshine'],
      // [City, Area, Project, Villa Configuration, Price in ₹]
      // A row with only City (and Area) lists that place even if it has no project yet.
      rows: [
        ['Salem', 'Siddhar Kovil Road', 'Naaval Sunshine', '3 BHK Villa', 14000000],
        ...['Alagapuram', 'Ammapet', 'Annadhanapatti', 'Ayothiyapattinam', 'Fairlands', 'Five Roads',
          'Gugai', 'Hasthampatti', 'Junction Main Road', 'Kannankurichi', 'Kitchipalayam', 'Kondalampatti',
          'Meyyanur', 'Neikkarapatti', 'Omalur Main Road', 'Reddiyur', 'Seelanaickenpatti', 'Shevapet',
          'Suramangalam', 'Swarnapuri', 'Yercaud Main Road'].map((area) => ['Salem', area]),
        ...['Attur', 'Edappadi', 'Gangavalli', 'Kadayampatti', 'Konganapuram', 'Mettur', 'Nangavalli',
          'Omalur', 'Panamarathupatti', 'Pethanaickenpalayam', 'Sankagiri', 'Thalaivasal', 'Tharamangalam',
          'Valapady', 'Vazhapadi', 'Veerapandi', 'Yercaud'].map((town) => [town]),
      ],
    },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Icons */
  if (window.lucide) window.lucide.createIcons();

  /* Footer year */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------------------------------------------------------------
     Header + mobile navigation
     --------------------------------------------------------------- */
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const navToggle = $('[data-nav-toggle]');
  const nav = $('[data-nav]');
  if (navToggle && nav) {
    const setOpen = (open) => {
      document.body.classList.toggle('nav-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    };
    navToggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------------------------------------------------------------
     Media placeholders
     A .media box shows a labelled placeholder until its file exists
     in assets/images or assets/videos.
     --------------------------------------------------------------- */
  $$('.media').forEach((box) => {
    const img = $('img', box);
    const markEmpty = () => box.classList.add('is-empty');
    if (!img) markEmpty();
    else if (img.complete && img.naturalWidth === 0) markEmpty();
    else img.addEventListener('error', markEmpty);

    const video = $('video', box);
    if (video) {
      const sources = $$('source', video);
      const dropVideo = () => video.remove();
      (sources[sources.length - 1] || video).addEventListener('error', dropVideo);
      if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) dropVideo();
      if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
    }
  });

  /* ---------------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------------------------------------------------------------
     Lead forms
     --------------------------------------------------------------- */
  const MOBILE = /^(?:\+?91|0)?[6-9]\d{9}$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const now = new Date();
  const todayIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $$('input[type="date"]').forEach((input) => { input.min = todayIso; });

  function setError(field, msg) {
    const wrap = field.closest('.field');
    if (!wrap) return;
    let err = $('.field__error', wrap);
    if (!err && msg) {
      err = document.createElement('span');
      err.className = 'field__error';
      wrap.append(err);
    }
    if (err) err.textContent = msg;
    wrap.classList.toggle('has-error', Boolean(msg));
    if (msg) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function validate(form) {
    let firstBad = null;
    $$('input[name], select[name], textarea[name]', form).forEach((field) => {
      if (field.type === 'hidden') return;
      if (field.type === 'radio' || field.type === 'checkbox') {
        if (!field.required) return;
        const ok = field.type === 'radio' ? form.querySelector(`input[name="${field.name}"]:checked`) : field.checked;
        const msg = ok ? '' : (field.type === 'radio' ? 'Please choose an option.' : 'Please tick this box to continue.');
        setError(field, msg);
        if (msg && !firstBad) firstBad = field;
        return;
      }
      const value = field.value.trim();
      let msg = '';
      if (field.required && !value) msg = 'This field is required.';
      else if (value && field.name === 'mobile' && !MOBILE.test(value.replace(/[\s()-]/g, ''))) msg = 'Enter a valid 10-digit mobile number.';
      else if (value && field.type === 'email' && !EMAIL.test(value)) msg = 'Enter a valid email address.';
      else if (value && field.type === 'date' && value < todayIso) msg = 'Choose today or a later date.';
      setError(field, msg);
      if (msg && !firstBad) firstBad = field;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  async function sendLead(data) {
    if (!CONFIG.endpoint) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      console.info('[Naaval Sunshine] Lead captured (demo mode — set CONFIG.endpoint in script.js):', data);
      return;
    }
    // Google Apps Script can't answer a CORS preflight, so the JSON goes as text/plain
    // in no-cors mode. The response is opaque; a network failure still throws.
    await fetch(CONFIG.endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
    });
  }

  function resetForm(form) {
    form.reset();
    form.classList.remove('is-sent');
    $$('.field', form).forEach((wrap) => { const f = $('input, select, textarea', wrap); if (f) setError(f, ''); });
    const ok = $('[data-success]', form);
    if (ok) ok.hidden = true;
    const btn = $('[type="submit"]', form);
    if (btn && btn.dataset.label) { btn.innerHTML = btn.dataset.label; btn.disabled = false; }
  }

  $$('form[data-lead-form]').forEach((form) => {
    form.noValidate = true;
    form.addEventListener('input', (e) => { if (e.target.name) setError(e.target, ''); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate(form)) return;

      const btn = $('[type="submit"]', form);
      const status = $('[data-status]', form);
      btn.dataset.label = btn.dataset.label || btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      if (status) status.textContent = '';

      const data = Object.fromEntries(new FormData(form));
      data.form = form.dataset.leadForm;
      data.page = document.title;
      data.url = window.location.href;
      data.submittedAt = new Date().toISOString();
      new URLSearchParams(window.location.search).forEach((v, k) => {
        if (k.startsWith('utm_') || k === 'gclid' || k === 'fbclid') data[k] = v;
      });

      try {
        await sendLead(data);
        (window.dataLayer = window.dataLayer || []).push({ event: 'lead_submit', form: data.form });
        form.classList.add('is-sent');
        const ok = $('[data-success]', form);
        if (ok) { ok.hidden = false; ok.focus({ preventScroll: true }); }
        form.dispatchEvent(new CustomEvent('lead:sent', { detail: data }));
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = btn.dataset.label;
        if (status) status.textContent = 'Something went wrong. Please call us on +91 95855 21999.';
      }
    });
  });

  /* ---------------------------------------------------------------
     Brochure / floor plan requests (short form in a dialog, then download)
     --------------------------------------------------------------- */
  const gate = $('#gate');
  const gateForm = gate && $('form[data-lead-form]', gate);
  let pendingFile = null;

  $$('[data-gate]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      const key = trigger.dataset.gate;
      if (!gate || typeof gate.showModal !== 'function') return; // falls back to the link's href
      e.preventDefault();
      pendingFile = CONFIG.files[key];
      resetForm(gateForm);
      $('[data-gate-title]', gate).textContent = trigger.dataset.gateTitle || 'Download Brochure';
      gateForm.elements.interest.value = key;
      gate.showModal();
    });
  });

  if (gate) {
    gate.addEventListener('click', (e) => { if (e.target === gate) gate.close(); });
    gateForm.addEventListener('lead:sent', () => {
      if (!pendingFile) return;
      const a = document.createElement('a');
      a.href = pendingFile;
      a.download = '';
      document.body.append(a);
      a.click();
      a.remove();
    });
  }

  /* ---------------------------------------------------------------
     Cost calculator  ([data-calc])
     If the page has a #calc-gate form, it stays locked until that is filled.
     City → Area → Project → Villa type gives the cost breakdown.
     --------------------------------------------------------------- */
  const calcs = $$('[data-calc]');
  const calcGate = $('#calc-gate');
  const CALC_KEY = 'naavalCalcUnlocked';
  const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const crore = (n) => `≈ ₹${(n / 1e7).toFixed(2)} Cr`;

  const storage = {
    get: (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  const toRows = (list) => list
    .map(([city = '', area = '', project = '', config = '', price = '']) => ({
      city: String(city).trim(),
      area: String(area).trim(),
      project: String(project).trim(),
      config: String(config).trim(),
      price: Number(String(price).replace(/[^\d.]/g, '')) || 0,
    }))
    .filter((r) => r.city);

  const calcData = {
    rows: toRows(CONFIG.calculator.rows),
    stampDuty: CONFIG.calculator.stampDuty,
    registration: CONFIG.calculator.registration,
  };

  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function setupCalc(calc) {
    const step = (name) => $(`[data-calc-step="${name}"]`, calc);
    const city = step('city');
    const area = step('area');
    const project = step('project');
    const config = step('config');
    const total = $('[data-calc-total]', calc);
    const breakdown = $('[data-calc-breakdown]', calc);
    const none = document.createElement('p');
    none.className = 'calc__none';
    none.hidden = true;
    none.innerHTML = 'There is no Naaval project in this location yet. Our nearest is <strong>Naaval Sunshine, Siddhar Kovil Road, Salem</strong>. <a href="tel:+919585521999">Call +91 95855 21999</a>';
    breakdown.after(none);

    const unique = (list) => [...new Set(list.filter(Boolean))];
    const fill = (select, values, placeholder, emptyLabel) => {
      const keep = select.value;
      select.innerHTML = `<option value="">${values.length ? placeholder : emptyLabel}</option>`
        + values.map((v) => `<option value="${escapeHtml(v.value)}">${escapeHtml(v.label)}</option>`).join('');
      if (values.some((v) => v.value === keep)) select.value = keep;
      else if (values.length === 1) select.value = values[0].value;
      select.dataset.empty = values.length ? '' : '1';
    };
    const asOptions = (list) => unique(list).map((v) => ({ value: v, label: v }));
    const inPlace = (r) => r.city === city.value && r.area === area.value;

    const render = () => {
      const r = config.value !== '' ? calcData.rows[Number(config.value)] : null;
      const locked = calc.classList.contains('is-locked');
      none.hidden = locked || !city.value || area.dataset.empty !== '1' && !area.value || project.dataset.empty !== '1';
      if (!r || locked) {
        total.textContent = '00,00,000';
        breakdown.hidden = true;
        return;
      }
      const { stampDuty, registration } = calcData;
      const stamp = r.price * stampDuty;
      const reg = r.price * registration;
      const sum = r.price + stamp + reg;
      total.textContent = inr(sum);
      breakdown.innerHTML = `
        <div><dt>Villa Price</dt><dd>${inr(r.price)}</dd></div>
        <div><dt>Stamp Duty (${+(stampDuty * 100).toFixed(2)}%)</dt><dd>${inr(stamp)}</dd></div>
        <div><dt>Registration Fee (${+(registration * 100).toFixed(2)}%)</dt><dd>${inr(reg)}</dd></div>
        <div class="is-total"><dt>Estimated Total</dt><dd>${inr(sum)} <small>${crore(sum)}</small></dd></div>`;
      breakdown.hidden = false;
    };

    // Each step opens once the previous one is chosen (or has nothing to choose).
    const syncDisabled = () => {
      let ready = !calc.classList.contains('is-locked');
      [city, area, project, config].forEach((s) => {
        s.disabled = !ready || s.dataset.empty === '1';
        ready = ready && (s.value !== '' || s.dataset.empty === '1');
      });
    };

    const cascade = (from) => {
      const { rows } = calcData;
      const start = ['city', 'area', 'project', 'config'].indexOf(from) + 1;
      if (start <= 1) {
        fill(area, asOptions(rows.filter((r) => r.city === city.value).map((r) => r.area)),
          '--Select Area--', city.value ? '--No areas listed--' : '--Select Area--');
      }
      if (start <= 2) {
        const ready = city.value && (area.value || area.dataset.empty === '1');
        fill(project, ready ? asOptions(rows.filter(inPlace).map((r) => r.project)) : [],
          '--Select Project--', ready ? '--No projects here yet--' : '--Select Project--');
      }
      if (start <= 3) {
        const options = rows
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => project.value && inPlace(r) && r.project === project.value && r.config && r.price)
          .map(({ r, i }) => ({ value: String(i), label: r.config }));
        fill(config, options, '--Select Villa Type--', '--Select Villa Type--');
      }
      syncDisabled();
      render();
    };

    calc.rebuild = (useDefaults) => {
      fill(city, asOptions(calcData.rows.map((r) => r.city)), '--Select City--', '--Select City--');
      const [dCity, dArea, dProject] = CONFIG.calculator.defaults || [];
      if (useDefaults && dCity && [...city.options].some((o) => o.value === dCity)) city.value = dCity;
      cascade('city');
      if (useDefaults && dArea && [...area.options].some((o) => o.value === dArea)) { area.value = dArea; cascade('area'); }
      if (useDefaults && dProject && [...project.options].some((o) => o.value === dProject)) { project.value = dProject; cascade('project'); }
    };

    // Only gated when the page includes the #calc-gate form.
    calc.classList.toggle('is-locked', Boolean(calcGate) && storage.get(CALC_KEY) !== '1');
    calc.rebuild(true);
    city.addEventListener('change', () => cascade('city'));
    area.addEventListener('change', () => cascade('area'));
    project.addEventListener('change', () => cascade('project'));
    config.addEventListener('change', render);

    calc.unlock = () => { calc.classList.remove('is-locked'); syncDisabled(); render(); };
  }

  calcs.forEach(setupCalc);

  // Live calculator data from the Google Sheet ("Calculator" + "Settings" tabs).
  if (calcs.length && CONFIG.endpoint) {
    fetch(`${CONFIG.endpoint}?action=calculator`)
      .then((res) => res.json())
      .then((data) => {
        const rows = toRows(data.rows || []);
        if (!rows.length) return;
        calcData.rows = rows;
        if (typeof data.stampDuty === 'number') calcData.stampDuty = data.stampDuty;
        if (typeof data.registration === 'number') calcData.registration = data.registration;
        calcs.forEach((c) => c.rebuild(true));
      })
      .catch((err) => console.warn('[Naaval Sunshine] Using built-in calculator data:', err));
  }

  const openCalc = (e) => {
    if (e) e.preventDefault();
    const calc = calcs[0];
    if (!calc) return;
    if (!calc.classList.contains('is-locked') || !calcGate) {
      calc.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    resetForm($('form[data-lead-form]', calcGate));
    calcGate.showModal();
  };
  $$('[data-calc-open]').forEach((btn) => btn.addEventListener('click', openCalc));

  if (calcGate) {
    calcGate.addEventListener('click', (e) => { if (e.target === calcGate) calcGate.close(); });
    $('form[data-lead-form]', calcGate).addEventListener('lead:sent', () => {
      storage.set(CALC_KEY, '1');
      calcs.forEach((c) => c.unlock());
      setTimeout(() => {
        calcGate.close();
        const first = calcs[0] && $('select:not(:disabled)', calcs[0]);
        if (calcs[0]) calcs[0].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        if (first) first.focus({ preventScroll: true });
      }, 1400);
    });
  }

  /* ---------------------------------------------------------------
     Tabs  ([data-tabs] with role="tab" / role="tabpanel")
     --------------------------------------------------------------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const panels = $$('[role="tabpanel"]', root);
    const select = (i) => {
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = i !== j; });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!dir) return;
        e.preventDefault();
        const next = (i + dir + tabs.length) % tabs.length;
        select(next);
        tabs[next].focus();
      });
    });
  });

  /* ---------------------------------------------------------------
     Carousel  ([data-carousel] > [data-track], [data-prev], [data-next])
     --------------------------------------------------------------- */
  $$('[data-carousel]').forEach((root) => {
    const track = $('[data-track]', root);
    const prev = $('[data-prev]', root);
    const next = $('[data-next]', root);
    const step = () => {
      const first = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------------------------------------------------------------
     Hover swap  (list items swap the image shown beside them)
     --------------------------------------------------------------- */
  $$('[data-swap]').forEach((root) => {
    const items = $$('[data-swap-item]', root);
    const figures = $$('[data-swap-figure]', root);
    const select = (i) => {
      items.forEach((el, j) => el.classList.toggle('is-active', i === j));
      figures.forEach((el, j) => el.classList.toggle('is-active', i === j));
    };
    items.forEach((el, i) => {
      el.addEventListener('mouseenter', () => select(i));
      el.addEventListener('focusin', () => select(i));
      el.addEventListener('click', () => select(i));
    });
  });
})();
