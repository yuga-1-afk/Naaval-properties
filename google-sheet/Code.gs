/**
 * Naaval Sunshine — Google Sheet backend for the landing pages.
 *
 *   POST  → appends a lead to the "Leads" tab (all forms on all four pages)
 *   GET ?action=calculator → returns the "Calculator" + "Settings" tabs as JSON
 *
 * Setup: see SETUP.md. Run `setup` once, then Deploy → Web app.
 */

// Optional: email a copy of every lead to the sales team. Leave '' to turn off.
const NOTIFY_EMAIL = '';

const LEADS_SHEET = 'Leads';
const CALC_SHEET = 'Calculator';
const SETTINGS_SHEET = 'Settings';

// Page field → sheet column. Unknown fields get their own column automatically.
const LEAD_COLUMNS = {
  submittedAt: 'Submitted At',
  form: 'Form',
  name: 'Name',
  mobile: 'Mobile',
  email: 'Email',
  visitDate: 'Preferred Visit Date',
  villaPreference: 'Villa Preference',
  interest: 'Interest',
  consent: 'Consent',
  project: 'Project',
  villaType: 'Villa Type',
  holdYears: 'Hold (years)',
  estimatedValue: 'Estimated Value (Rs)',
  estimatedProfit: 'Estimated Profit (Rs)',
  page: 'Page',
  url: 'Page URL',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  utm_term: 'utm_term',
  utm_content: 'utm_content',
  gclid: 'gclid',
  fbclid: 'fbclid',
};

const FORM_NAMES = {
  hero: 'Site visit (hero)',
  final: 'Site visit (final)',
  'site-visit': 'Site visit',
  brochure: 'Brochure request',
  download: 'Brochure / floor plans',
  calculator: 'Cost calculator',
  'roi-pdf': 'ROI estimate PDF',
};

const CALC_HEADERS = ['City', 'Area', 'Project', 'Villa Configuration', 'Price (₹)'];

// Settings tab rows: [name, default value, note]. The ROI calculator (page 4) starts from these.
const SETTINGS_ROWS = [
  ['Stamp Duty %', 7, 'Indicative Tamil Nadu rate — confirm with legal'],
  ['Registration Fee %', 2, 'Indicative Tamil Nadu rate — confirm with legal'],
  ['Holding Period (years)', 10, 'ROI calculator starting value'],
  ['Land Share %', 40, 'Share of the villa price that is land'],
  ['Land Appreciation %', 8, 'Per year'],
  ['Villa Appreciation %', 3, 'Per year, for the building'],
  ['Monthly Rent (₹)', 30000, 'Expected rent if leased out'],
  ['Rent Increase %', 5, 'Per year'],
  ['Annual Maintenance (₹)', 36000, 'Upkeep, maintenance charges, tax'],
];

const SALEM_AREAS = [
  'Alagapuram', 'Ammapet', 'Annadhanapatti', 'Ayothiyapattinam', 'Fairlands', 'Five Roads',
  'Gugai', 'Hasthampatti', 'Junction Main Road', 'Kannankurichi', 'Kitchipalayam', 'Kondalampatti',
  'Meyyanur', 'Neikkarapatti', 'Omalur Main Road', 'Reddiyur', 'Seelanaickenpatti', 'Shevapet',
  'Suramangalam', 'Swarnapuri', 'Yercaud Main Road',
];

const SALEM_DISTRICT_TOWNS = [
  'Attur', 'Edappadi', 'Gangavalli', 'Kadayampatti', 'Konganapuram', 'Mettur', 'Nangavalli',
  'Omalur', 'Panamarathupatti', 'Pethanaickenpalayam', 'Sankagiri', 'Thalaivasal', 'Tharamangalam',
  'Valapady', 'Vazhapadi', 'Veerapandi', 'Yercaud',
];

/* ------------------------------------------------------------------ */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || '{}');
    const sheet = SpreadsheetApp.getActive().getSheetByName(LEADS_SHEET) || createLeadsSheet_();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const record = {};
    Object.keys(data).forEach((key) => {
      const column = LEAD_COLUMNS[key] || key;
      if (headers.indexOf(column) === -1) {
        headers.push(column);
        sheet.getRange(1, headers.length).setValue(column).setFontWeight('bold');
      }
      record[column] = data[key];
    });
    record['Submitted At'] = new Date();
    record.Form = FORM_NAMES[data.form] || data.form || '';
    if (record.Consent === 'on') record.Consent = 'Yes';
    // Keep phone numbers as text so the leading +91 / 0 is not lost.
    if (record.Mobile) record.Mobile = "'" + record.Mobile;

    sheet.appendRow(headers.map((h) => (h in record ? record[h] : '')));
    notify_(record);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'calculator') return json_(readCalculator_());
  return json_({ ok: true, message: 'Naaval Sunshine lead endpoint' });
}

/* ------------------------------------------------------------------ */

function readCalculator_() {
  const ss = SpreadsheetApp.getActive();
  const calc = ss.getSheetByName(CALC_SHEET);
  const rows = calc
    ? calc.getDataRange().getValues().slice(1)
      .filter((r) => String(r[0]).trim())
      .map((r) => [r[0], r[1], r[2], r[3], r[4]].map((v) => (typeof v === 'string' ? v.trim() : v)))
    : [];

  const settings = {};
  const s = ss.getSheetByName(SETTINGS_SHEET);
  if (s) s.getDataRange().getValues().slice(1).forEach((r) => { settings[String(r[0]).trim()] = r[1]; });
  const pct = (key, fallback) => {
    const v = Number(settings[key]);
    return (isNaN(v) || settings[key] === '' ? fallback : v) / 100;
  };

  return {
    rows: rows,
    stampDuty: pct('Stamp Duty %', 7),
    registration: pct('Registration Fee %', 2),
    settings: settings,
  };
}

function notify_(record) {
  if (!NOTIFY_EMAIL) return;
  const lines = Object.keys(record)
    .filter((k) => record[k] !== '' && record[k] != null)
    .map((k) => k + ': ' + String(record[k]).replace(/^'/, ''));
  MailApp.sendEmail(NOTIFY_EMAIL, 'New lead — Naaval Sunshine (' + record.Form + ')', lines.join('\n'));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------
   One-time setup: Run ▶ setup   (safe to run again — it never deletes leads)
   ------------------------------------------------------------------ */

function setup() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(LEADS_SHEET)) createLeadsSheet_();

  if (!ss.getSheetByName(CALC_SHEET)) {
    const sheet = ss.insertSheet(CALC_SHEET);
    const rows = [['Salem', 'Siddhar Kovil Road', 'Naaval Sunshine', '3 BHK Villa', 14000000]]
      .concat(SALEM_AREAS.map((a) => ['Salem', a, '', '', '']))
      .concat(SALEM_DISTRICT_TOWNS.map((t) => [t, '', '', '', '']));
    sheet.getRange(1, 1, 1, CALC_HEADERS.length).setValues([CALC_HEADERS]);
    sheet.getRange(2, 1, rows.length, CALC_HEADERS.length).setValues(rows);
    sheet.getRange(2, 5, rows.length, 1).setNumberFormat('₹#,##,##0');
    styleHeader_(sheet, CALC_HEADERS.length);
    sheet.setColumnWidths(1, 4, 190);
    sheet.setColumnWidth(5, 140);
    sheet.getRange('G1').setValue('How to use').setFontWeight('bold');
    sheet.getRange('G2:G6').setValues([
      ['One row per villa type. City is required.'],
      ['Add a project + villa type + price to make it calculable.'],
      ['Rows with only City (and Area) still show in the dropdowns.'],
      ['Changes appear on the website on the next page load.'],
      ['Price is the base villa price in rupees, e.g. 14000000.'],
    ]).setFontColor('#666666');
  }

  let settings = ss.getSheetByName(SETTINGS_SHEET);
  if (!settings) {
    settings = ss.insertSheet(SETTINGS_SHEET);
    settings.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'Notes']]);
    styleHeader_(settings, 3);
    settings.setColumnWidths(1, 3, 220);
  }
  // Add any settings that are missing; existing values are left as they are.
  const existing = settings.getDataRange().getValues().map((r) => String(r[0]).trim());
  SETTINGS_ROWS.filter((r) => existing.indexOf(r[0]) === -1).forEach((r) => settings.appendRow(r));

  const first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' && first.getLastRow() === 0) ss.deleteSheet(first);
  ss.toast('Leads, Calculator and Settings tabs are ready.', 'Naaval Sunshine', 5);
}

function createLeadsSheet_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.insertSheet(LEADS_SHEET, 0);
  const headers = Object.keys(LEAD_COLUMNS).map((k) => LEAD_COLUMNS[k]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeader_(sheet, headers.length);
  sheet.getRange('A:A').setNumberFormat('dd mmm yyyy, hh:mm am/pm');
  sheet.setColumnWidths(1, headers.length, 150);
  return sheet;
}

function styleHeader_(sheet, width) {
  sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#1c2b63').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}
