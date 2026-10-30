/* Assumption register for the 25-year villa analysis.
   Every number the model uses is listed here with where it comes from.
   confidence: 'given' (your inputs) · 'official' (a government document) · 'sourced' (a cited figure)
               · 'anchored' (a judgement bracketed by cited data) · 'judgement' (no local data found — replace it) */
window.VillaData = (function () {
  'use strict';

  const sources = {
    gazette34: { t: 'TN Government Gazette No. 109, 30 Mar 2023 (G.O. Ms. No. 34): registration fee on deeds of sale cut from 4% to 2%, in force 1 Apr 2023', u: 'https://www.stationeryprinting.tn.gov.in/extraordinary/2023/109_Ex_II_2_2023.pdf', k: 'Official' },
    gazette166: { t: 'TN Government Gazette No. 848, 19 Dec 2025 (G.O. Ms. No. 166): first sale of a villa / row house on a composite deed, set-off of duty paid on the construction agreement', u: 'https://www.stationeryprinting.tn.gov.in/extraordinary/2025/848_Ex_II_2_2025.pdf', k: 'Official' },
    stamp: { t: 'Stamp duty about 7% on the higher of consideration or guideline value (guide; some guides still print the pre-2023 4% registration fee)', u: 'https://corporate.verified.realestate/insights/stamp-duty-registration-charges-tamil-nadu', k: 'Secondary' },
    rera: { t: 'TN RERA record TN/7/Building/0582/2024, mirrored by Aurum PropTech: 58 dwelling units, 17,253.8 m², Survey 65/10A Murungapatti, Salem West, project cost ₹58.66 Cr, completion 31 Dec 2028', u: 'https://www.aurumproptech.in/pulse/rera/tamil-nadu/salem/naaval-sunshine/1537', k: 'RERA mirror' },
    listingRei: { t: 'RealEstateIndia: Naaval Sunshine ₹1.40 Cr, 3 BHK, 1800 (unit unstated), 58 units — lists the location as Elampillai', u: 'https://www.realestateindia.com/salem-property/new-projects.htm', k: 'Asking' },
    listingGhar: { t: 'ghar.tv: Naaval Sunshine, Siddhar Kovil Road, 3 BHK villa, carpet area 2,160 sq ft, price on request', u: 'https://www.ghar.tv/naaval-sunshine-siddhar-kovil-road-salem-okiw948787150', k: 'Asking' },
    salemTemple: { t: 'Salem district tourism: the Siddhar temple on Kanjamalai is about 12 km from Salem on the road to Elampillai', u: 'https://salem.nic.in/tourism/temples/', k: 'Official' },
    squareyards: { t: 'Square Yards: Salem villa average asking ₹5,100/sq ft (Mar 2026), −31.66% year on year — an aggregate of listings, not transactions', u: 'https://www.squareyards.com/property-rates-in-salem', k: 'Asking' },
    plotApoorva: { t: 'RealEstateIndia: Apoorva Garden, Elampillai — 1,200 sq ft plot at ₹30 lakh (about ₹2,500/sq ft)', u: 'https://www.realestateindia.com/salem-property/apoorva-garden-for-sale-in-ilampillai-32587-ffpp.htm', k: 'Asking' },
    plotValasaiyur: { t: 'Housing.com: Valasaiyur (next to Elampillai) plots average about ₹957/sq ft', u: 'https://housing.com/in/buy/salem/plot-valasaiyur', k: 'Asking' },
    rentDuplex: { t: 'Housing.com: 3 BHK duplex, 2,000 sq ft, gated society, Suramangalam — ₹20,000/month', u: 'https://housing.com/rent/17707916-2000-sqft-3-bhk-duplex-on-rent-in-suramangalam-salem', k: 'Asking' },
    rentFlat: { t: 'Housing.com: 3 BHK flats in Suramangalam — ₹23,000 (1,358 sq ft) to ₹32,500 (1,650 sq ft)', u: 'https://housing.com/rent/18489380-1650-sqft-3-bhk-apartment-on-rent-in-suramangalam-salem', k: 'Asking' },
    rbiHpi: { t: 'RBI all-India House Price Index, Q4 2024-25: +3.1% year on year (3.1% the quarter before, 4.1% a year earlier)', u: 'https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=60688', k: 'Official' },
    anarock: { t: 'ANAROCK outlook of 6–7% housing price growth in 2026 across major markets (as reported)', u: 'https://www.geosquare.in/indias-housing-market-surges-property-prices-and-rents-soar-since-2021-992368546934-news', k: 'Secondary' },
    gharSalem: { t: 'ghar.tv Salem guide forecasting 8–12% appreciation in 12 months — promotional, treated as an upper bound only', u: 'https://www.ghar.tv/blog/salem-real-estate-market-complete-investment-guide-for-tamil-nadus-steel-city/artid3888', k: 'Promotional' },
    cpiTarget: { t: 'Government retained the 4% CPI target with a 2–6% band for 2026–2031 (notified 25 Mar 2026)', u: 'https://tradingeconomics.com/india/inflation-cpi/news/536474', k: 'Secondary' },
    cpiHistory: { t: 'CPI inflation averaged about 4.9% since inflation targeting began, 4.6% in FY25, about 3.7% estimated for FY26', u: 'https://pub-915abe16736645b698ab4372a6992659.r2.dev/2026-03-27-inflation-targeting-fit-framework-4-percent.pdf', k: 'Secondary' },
    census: { t: 'Census 2011: Salem city 829,267 (+19.0% in 2001–11); Salem district 3,482,056 (+15.4%). No official count since', u: 'https://census2011.co.in/census/district/28-salem.html', k: 'Official' },
    cgwb: { t: 'CGWB assessment (via DT Next): 13 of Salem district\'s 14 taluks are over-exploited for groundwater; Yercaud is the only exception', u: 'https://www.dtnext.in/news/tamilnadu/salem-thanjavur-worst-hit-by-groundwater-exploitation-in-tn-finds-central-survey', k: 'Official data, press report' },
    airport: { t: 'Salem airport: UDAN flights resumed 2023; ₹24 crore released for development in Dec 2025; runway extension planned in a second phase', u: 'https://newsonprojects.com/news/centre-allocates-109-crore-for-vellore-neyveli-and-salem-airports-under-udan-scheme', k: 'Press report' },
    ltcg: { t: 'Property bought on or after 23 Jul 2024: long-term gain taxed at 12.5% without indexation, plus cess; Budget 2026 changed nothing', u: 'https://cleartax.in/s/long-term-capital-gains-ltcg-tax', k: 'Secondary' },
    houseProp: { t: 'Income-tax Act 2025 (from 1 Apr 2026) keeps the 30% standard deduction on annual value after municipal taxes', u: 'https://www.businesstoday.in/personal-finance/tax/story/new-income-tax-bill-clarifies-key-deductions-on-house-property-income-489507-2025-08-14', k: 'Secondary' },
    slabs: { t: 'New-regime slabs for FY 2026-27 unchanged: 30% above ₹24 lakh', u: 'https://www.businesstoday.in/personal-finance/tax/story/income-tax-slabs-fy-2026-27-will-rates-change-from-april-1-under-new-tax-rules-details-523303-2026-04-01', k: 'Secondary' },
    propTax: { t: 'TN Urban Local Bodies Rules 2023 (Rule 264(2)), as reported: annual property-tax revision of 6% or GSDP growth. Not confirmed for a village panchayat', u: 'https://www.thenewsminute.com/tamil-nadu/chennai-property-tax-hike-gcc-approves-6-increase-amid-opposition', k: 'Press report' },
    gsec: { t: '10-year government bond yield about 6.8% (6.79% on 28 Jul 2026; 6.78% in Feb 2026)', u: 'https://cbonds.com/indexes/180763/', k: 'Market data' },
    buildCost: { t: 'InfraLens Salem construction cost: standard ₹1,890, premium ₹2,552, luxury ₹3,497 per sq ft', u: 'https://infralens.in/prices/salem', k: 'Estimator' },
    buildCostVilla: { t: 'NoBroker: villas in Coimbatore ₹2,400–3,500+ per sq ft', u: 'https://www.nobroker.in/blog/construction-cost-in-coimbatore', k: 'Estimator' },
    guideline: { t: 'Guideline values were restored to pre-2017 levels in 2023, raising the base on which duty is charged', u: 'https://constrofacilitator.com/guideline-value-revision-annuls-gain-of-registration-fee-cut/', k: 'Press report' },
  };

  /* ---- "Your deal" inputs (apply to all three scenarios) ---- */
  const deal = {
    purchasePrice: 14000000, startYear: 2026, payPct1: 0, payPct2: 0, possessionYear: 2028, letOut: 1,
    builtUpSqft: 1800, plotSqft: 1920, landRateAsking: 2500, askingHaircutPct: 10, buildCostPsf: 2600,
    stampDutyPct: 7, registrationPct: 2, legalPurchasePct: 0.3, purchaseBrokeragePct: 0, otherPurchaseCosts: 0,
    saleBrokeragePct: 1, saleLegalPct: 0.3, insurancePct: 0.1, salvagePct: 10, renovationEvery: 12, renovationCredit: 6,
    standardDeductionPct: 30, marginalTaxPct: 31.2, ltcgPct: 12.5, ltcgSurchargePct: 0, cessPct: 4, section54: 0,
    riskFreePct: 6.8, equityPct: 10, cycleOn: 1, cyclePeriod: 8,
  };

  const dealFields = [
    { group: 'The purchase', key: 'purchasePrice', label: 'Purchase price', unit: '₹', step: 100000, c: 'given', src: [], note: 'As you stated: ₹1.40 crore, 100% self-funded, no loan.' },
    { group: 'The purchase', key: 'payPct1', label: 'Paid in 2027 (% of price)', unit: '%', step: 5, c: 'judgement', src: ['rera'], note: 'Default 100% paid in 2026, as you described. Construction-linked plans spread payment to completion (Dec 2028); entering one improves IRR.' },
    { group: 'The purchase', key: 'payPct2', label: 'Paid in 2028 (% of price)', unit: '%', step: 5, c: 'judgement', src: [], note: 'The balance (100% minus these two) is paid in 2026.' },
    { group: 'The purchase', key: 'possessionYear', label: 'Handover year', unit: 'year', step: 1, c: 'sourced', src: ['rera'], note: 'RERA completion date is 31 Dec 2028. Rent and running costs start the year after handover. A listing says "ready to move" — confirm.' },
    { group: 'The purchase', key: 'letOut', label: 'Let it out? (1 = yes, 0 = live in it)', unit: '', step: 1, c: 'given', src: [], note: 'If you live in it, rent is zero, but maintenance, tax and repairs still apply.' },
    { group: 'Land and building at purchase', key: 'builtUpSqft', label: 'Built-up area', unit: 'sq ft', step: 50, c: 'judgement', src: ['listingRei', 'listingGhar'], note: 'Sources conflict: 1800 (RealEstateIndia) and 2,160 carpet (ghar.tv). RERA lists neither. Check the brochure.' },
    { group: 'Land and building at purchase', key: 'plotSqft', label: 'Plot / UDS attributable to the villa', unit: 'sq ft', step: 50, c: 'anchored', src: ['rera'], note: 'Derived: 17,253.8 m² ÷ 58 units = 3,202 sq ft gross per villa (includes roads and amenities). 60% of that = 1,920 sq ft is a judgement. Replace it with the UDS in your draft sale deed.' },
    { group: 'Land and building at purchase', key: 'landRateAsking', label: 'Land rate (asking)', unit: '₹/sq ft', step: 100, c: 'anchored', src: ['plotApoorva', 'plotValasaiyur'], note: 'Asking plots near Elampillai run ₹957 to about ₹2,500 per sq ft. This uses the top of that band for a DTCP-approved gated layout. No registered prices were available.' },
    { group: 'Land and building at purchase', key: 'askingHaircutPct', label: 'Asking → registered discount', unit: '%', step: 1, c: 'judgement', src: [], note: 'Asking prices are not what deeds are registered at. 10% is a judgement. If you have a registered rate from an Encumbrance Certificate, enter it above and set this to 0.' },
    { group: 'Land and building at purchase', key: 'buildCostPsf', label: 'Construction cost (replacement)', unit: '₹/sq ft', step: 50, c: 'anchored', src: ['buildCost', 'buildCostVilla'], note: 'Salem premium finish about ₹2,552; Coimbatore villas ₹2,400–3,500+. Estimator sites, not quotes.' },
    { group: 'Purchase and sale costs', key: 'stampDutyPct', label: 'Stamp duty', unit: '%', step: 0.5, c: 'sourced', src: ['stamp', 'gazette166'], note: 'About 7%, charged on the higher of price or guideline value. Villas sold on a composite deed get a set-off for duty on the construction agreement.' },
    { group: 'Purchase and sale costs', key: 'registrationPct', label: 'Registration fee', unit: '%', step: 0.5, c: 'official', src: ['gazette34'], note: 'Gazette: 2% on deeds of sale from 1 Apr 2023. Several online guides still print 4%.' },
    { group: 'Purchase and sale costs', key: 'legalPurchasePct', label: 'Legal and documentation', unit: '%', step: 0.1, c: 'judgement', src: [], note: 'No source. Typical fee schedules vary; replace with your advocate\'s quote.' },
    { group: 'Purchase and sale costs', key: 'purchaseBrokeragePct', label: 'Brokerage on purchase', unit: '%', step: 0.5, c: 'judgement', src: [], note: 'Zero when buying direct from the developer.' },
    { group: 'Purchase and sale costs', key: 'otherPurchaseCosts', label: 'Other costs not in the price (GST, corpus fund, interiors)', unit: '₹', step: 50000, c: 'judgement', src: [], note: 'Confirm whether ₹1.40 Cr includes GST on an under-construction villa and any club or corpus charges.' },
    { group: 'Purchase and sale costs', key: 'saleBrokeragePct', label: 'Brokerage on sale', unit: '%', step: 0.25, c: 'judgement', src: [], note: 'No source. 1% is a common negotiated level.' },
    { group: 'Purchase and sale costs', key: 'saleLegalPct', label: 'Legal on sale', unit: '%', step: 0.1, c: 'judgement', src: [], note: 'No source.' },
    { group: 'Building and upkeep', key: 'salvagePct', label: 'Residual value of building at end of life', unit: '%', step: 1, c: 'anchored', src: [], note: 'Valuation worked examples use 10% residual on a 60-year life. No authoritative Indian standard found.' },
    { group: 'Building and upkeep', key: 'renovationEvery', label: 'Major renovation every', unit: 'years', step: 1, c: 'judgement', src: [], note: 'Counted from handover.' },
    { group: 'Building and upkeep', key: 'renovationCredit', label: 'Age removed by each renovation', unit: 'years', step: 1, c: 'judgement', src: [], note: 'A renovation does not make the building new again; this credits part of its age back.' },
    { group: 'Building and upkeep', key: 'insurancePct', label: 'Insurance (% of replacement cost a year)', unit: '%', step: 0.05, c: 'judgement', src: [], note: 'No source.' },
    { group: 'Tax', key: 'marginalTaxPct', label: 'Your tax rate on rent (incl. cess)', unit: '%', step: 0.5, c: 'sourced', src: ['slabs'], note: '30% slab × 1.04 cess = 31.2%. Surcharge applies above ₹50 lakh income — adjust to your own position.' },
    { group: 'Tax', key: 'standardDeductionPct', label: 'Standard deduction on rent', unit: '%', step: 1, c: 'sourced', src: ['houseProp'], note: '30% of rent after municipal tax, kept under the Income-tax Act 2025.' },
    { group: 'Tax', key: 'ltcgPct', label: 'Long-term capital gains tax', unit: '%', step: 0.5, c: 'sourced', src: ['ltcg'], note: '12.5% without indexation for property bought after 23 Jul 2024. Cost of acquisition includes stamp duty, fees and improvements.' },
    { group: 'Tax', key: 'ltcgSurchargePct', label: 'Surcharge on capital gains', unit: '%', step: 5, c: 'judgement', src: [], note: 'Depends on your total income in the year of sale (capped at 15% for capital gains).' },
    { group: 'Tax', key: 'cessPct', label: 'Health and education cess', unit: '%', step: 1, c: 'sourced', src: ['ltcg'], note: '4%.' },
    { group: 'Tax', key: 'section54', label: 'Reinvest the gain in another home? (1 = yes)', unit: '', step: 1, c: 'judgement', src: [], note: 'Section 54 can defer the tax. Off by default; turning it on removes the capital-gains tax entirely, which overstates the benefit.' },
    { group: 'Alternatives to compare', key: 'riskFreePct', label: 'Government bond yield', unit: '% a year', step: 0.1, c: 'sourced', src: ['gsec'], note: 'Taxed every year at your rate.' },
    { group: 'Alternatives to compare', key: 'equityPct', label: 'Equity index return (placeholder)', unit: '% a year', step: 0.5, c: 'judgement', src: [], note: 'No authoritative long-run figure was retrieved. This is a placeholder, not a forecast. Replace it with NSE total-return data.' },
    { group: 'Market cycle', key: 'cycleOn', label: 'Add a property cycle to land growth? (1 = yes)', unit: '', step: 1, c: 'judgement', src: ['rbiHpi'], note: 'Real estate moves in cycles (all-India prices slowed from 4.1% to 3.1% in a year). The overlay is a stylised wave that nets to zero over each cycle, so it changes the path, not the average.' },
    { group: 'Market cycle', key: 'cyclePeriod', label: 'Cycle length', unit: 'years', step: 1, c: 'judgement', src: [], note: 'Stylised. No source.' },
  ];

  /* ---- Scenario assumptions: [conservative, moderate, optimistic] ---- */
  const params = [
    { group: 'Macro', key: 'inflation', label: 'Consumer inflation', unit: '% a year', v: [5, 5, 5], c: 'anchored', src: ['cpiTarget', 'cpiHistory'], basis: 'Target is 4% (band 2–6%, kept to 2031). Realised average since targeting began is about 4.9%. 5% is used for all three so the scenarios differ only in property outcomes.' },

    { group: 'Land appreciation, above inflation (real)', key: 'landReal0', label: '2027 – 2031', unit: '% a year', v: [-1, 1.5, 3.5], c: 'anchored', src: ['rbiHpi', 'anarock', 'gharSalem'], basis: 'Conservative: all-India house prices rose 3.1% against 4.6% inflation, about −1.5% real. Moderate: ANAROCK\'s 6–7% outlook less 5% inflation is about +1.5%. Optimistic: promotional Salem claims of 8–12% heavily discounted. The airport upgrade and a city that grew 19% in 2001–11 support demand; groundwater stress limits it.' },
    { group: 'Land appreciation, above inflation (real)', key: 'landReal1', label: '2032 – 2036', unit: '% a year', v: [0, 1.5, 3], c: 'judgement', src: ['census'], basis: 'Judgement. Growth fades as the area matures. No long-run local series exists for this micro-market.' },
    { group: 'Land appreciation, above inflation (real)', key: 'landReal2', label: '2037 – 2041', unit: '% a year', v: [0.5, 1, 2.5], c: 'judgement', src: [], basis: 'Judgement. Real growth trends toward 0–1% as base prices rise.' },
    { group: 'Land appreciation, above inflation (real)', key: 'landReal3', label: '2042 – 2046', unit: '% a year', v: [0.5, 1, 2], c: 'judgement', src: [], basis: 'Judgement.' },
    { group: 'Land appreciation, above inflation (real)', key: 'landReal4', label: '2047 – 2051', unit: '% a year', v: [0.5, 0.5, 1.5], c: 'judgement', src: [], basis: 'Judgement.' },
    { group: 'Land appreciation, above inflation (real)', key: 'cycleAmp', label: 'Cycle swing (± percentage points)', unit: 'pp', v: [3, 2, 1], c: 'judgement', src: ['rbiHpi'], basis: 'Judgement. Set to 0 for a smooth path.' },

    { group: 'Building and premium', key: 'buildInflPremium', label: 'Construction cost inflation above CPI', unit: 'pp a year', v: [0, 0.5, 1], c: 'judgement', src: ['buildCost'], basis: 'TN publishes a Building Construction Cost Index by centre, but its trend was not retrieved. Judgement.' },
    { group: 'Building and premium', key: 'lifeYears', label: 'Economic life of the building', unit: 'years', v: [45, 60, 75], c: 'anchored', src: [], basis: 'Valuation worked examples use 55–60 years. Shorter assumes poorer build quality or neglected upkeep; longer assumes good quality and funded maintenance. Not inspected.' },
    { group: 'Building and premium', key: 'premiumRetention', label: 'Share of the developer premium a resale buyer pays', unit: '%', v: [30, 60, 85], c: 'anchored', src: ['rera'], basis: 'The RERA project cost is ₹58.66 Cr for 58 units, about ₹1.01 Cr each, against a ₹1.40 Cr price: about ₹39 lakh covers margin, marketing, finance and tax. Resale buyers pay market comparables, not the developer\'s price, so part of that is lost on day one.' },
    { group: 'Building and premium', key: 'premiumErosion', label: 'Yearly real erosion of that premium', unit: '% a year', v: [3, 2, 1], c: 'judgement', src: [], basis: 'The premium for a new gated villa fades as the project ages. No source.' },
    { group: 'Building and premium', key: 'exitDiscountPct', label: 'Resale discount (demand, water, neighbourhood)', unit: '%', v: [12, 5, 0], c: 'anchored', src: ['cgwb', 'rera'], basis: 'The site is in a non-CMA panchayat area, west of Salem city, in a district where 13 of 14 taluks are groundwater over-exploited. Buyers may pay less or take longer. Judgement.' },

    { group: 'Rent and running costs', key: 'rentMonthly', label: 'Monthly rent in 2026 rupees', unit: '₹', v: [20000, 25000, 30000], c: 'anchored', src: ['rentDuplex', 'rentFlat'], basis: 'Asking rents for 3 BHK homes in Suramangalam range ₹20,000–32,500 a month. No villa rents near the site were found. About 1.7% gross yield at ₹20,000 to 2.6% at ₹30,000.' },
    { group: 'Rent and running costs', key: 'rentRealGrowth', label: 'Rent growth above inflation', unit: 'pp a year', v: [-0.5, 0, 0.5], c: 'judgement', src: [], basis: 'Rents roughly track inflation. No local series.' },
    { group: 'Rent and running costs', key: 'vacancyPct', label: 'Vacancy', unit: '% of year', v: [15, 8, 4], c: 'judgement', src: [], basis: '15% is about 1.8 months empty a year, 8% about one month. A peri-urban villa may take longer to let. No data.' },
    { group: 'Rent and running costs', key: 'lettingCostPct', label: 'Letting and management cost', unit: '% of rent', v: [8, 6, 4], c: 'judgement', src: [], basis: 'Broker fees on tenant changes plus management. No source.' },
    { group: 'Rent and running costs', key: 'maintPsf', label: 'Gated-community maintenance in 2026 rupees', unit: '₹/sq ft/month', v: [3.5, 2.5, 2], c: 'judgement', src: [], basis: 'No source found for this community. Get the actual charge from the developer, including the sinking fund.' },
    { group: 'Rent and running costs', key: 'propTax0', label: 'Property tax in 2026 rupees', unit: '₹ a year', v: [15000, 10000, 8000], c: 'judgement', src: ['propTax'], basis: 'No assessment found. The site is under a village panchayat. TN urban bodies revise tax by 6% or GSDP growth each year. Replace with the real assessment.' },
    { group: 'Rent and running costs', key: 'propTaxEsc', label: 'Property tax increase', unit: '% a year', v: [7, 6, 5], c: 'sourced', src: ['propTax'], basis: 'Based on the reported 6% minimum annual revision in urban bodies.' },
    { group: 'Rent and running costs', key: 'repairsPct', label: 'Repairs and upkeep', unit: '% of replacement cost a year', v: [1.2, 0.8, 0.5], c: 'judgement', src: [], basis: 'Rule of thumb. No source.' },
    { group: 'Rent and running costs', key: 'renovationPct', label: 'Cost of each major renovation', unit: '% of replacement cost', v: [12, 8, 5], c: 'judgement', src: [], basis: 'Judgement. Counted as an improvement in the capital-gains cost.' },
  ];

  const factors = [
    { n: 'Infrastructure and connectivity', t: 'Salem airport resumed UDAN flights in 2023, received ₹24 crore in Dec 2025 and has a runway extension planned. No credible report on new highways or industrial parks near the site was found, so no uplift is assumed beyond the first land-growth block.', s: ['airport'] },
    { n: 'Employment and population', t: 'Salem city grew 19.0% between 2001 and 2011 and the district 15.4% (about 1.4% a year). No census since, and no employment series was found. Demand support is real but modest.', s: ['census'] },
    { n: 'Water', t: '13 of 14 taluks in Salem district are over-exploited for groundwater (Yercaud is the exception). Confirm whether the project has piped supply or depends on borewells. This is reflected in the resale discount.', s: ['cgwb'] },
    { n: 'Location', t: 'RERA lists the site on Survey 65/10A, Murungapatti village, Salem West taluk, a non-CMA panchayat area. Marketing says Siddhar Kovil Road; another listing says Elampillai. The Siddhar temple is about 12 km west of Salem. Treat it as peri-urban, not central Salem.', s: ['rera', 'listingRei', 'salemTemple'] },
    { n: 'Construction quality and community upkeep', t: 'Not assessed. It enters only through building life, repairs and the premium assumptions. Inspect the completed villas and ask how maintenance is funded and governed.', s: [] },
  ];

  /* What was found, labelled by what kind of evidence it is. */
  const evidence = [
    { what: 'Naaval Sunshine price', value: '₹1.40 Cr for a 3 BHK (1,800 sq ft listed)', kind: 'Asking', src: ['listingRei', 'listingGhar'], note: 'The developer\'s quoted price. One listing says price on request. A registered sale deed shows what was actually paid.' },
    { what: 'Registered sale prices near the site', value: 'Not found', kind: 'Missing', src: [], note: 'Registered prices sit in sale deeds and Encumbrance Certificates on TNREGINET, which need survey numbers and a login. Nothing in this model is a registered transaction price.' },
    { what: 'Guideline value, Murungapatti (Survey 65/10A)', value: 'Not retrieved', kind: 'Missing', src: ['guideline'], note: 'Duty is charged on the higher of guideline value and price. Look the survey number up on TNREGINET.' },
    { what: 'RERA project record', value: '58 villas · 17,253.8 m² · ₹58.66 Cr declared cost · completion 31 Dec 2028', kind: 'Official record', src: ['rera'], note: 'Read from a third-party mirror. Verify on the TNRERA portal. It lists 58 units but 60 blocks.' },
    { what: 'Land per villa (derived)', value: '3,202 sq ft gross', kind: 'Derived', src: ['rera'], note: '17,253.8 m² = 185,716 sq ft ÷ 58 villas. Includes roads and amenities.' },
    { what: 'Declared cost per villa (derived)', value: '₹1.01 Cr, about ₹39 lakh below the price', kind: 'Derived', src: ['rera'], note: 'If the declared cost covers land and construction, the gap is margin, marketing, finance and tax. This is what the "developer premium" bucket stands for.' },
    { what: 'Plots near Elampillai', value: '₹957 to about ₹2,500 per sq ft', kind: 'Asking', src: ['plotApoorva', 'plotValasaiyur'], note: 'Undated listings, mostly "call for price".' },
    { what: 'Salem villas, average', value: '₹5,100 per sq ft, −31.7% in a year (Mar 2026)', kind: 'Asking', src: ['squareyards'], note: 'An aggregate of listings. A swing this size cannot be read as a price trend. Not used in the model.' },
    { what: '3 BHK rents, Suramangalam', value: '₹20,000 to ₹32,500 a month', kind: 'Asking', src: ['rentDuplex', 'rentFlat'], note: 'Flats and a duplex in inner Salem. No villa rents near the site were found.' },
    { what: 'All-India house prices', value: '+3.1% year on year (Q4 FY25)', kind: 'Official', src: ['rbiHpi'], note: 'Ten-city index. Salem is not covered, so there is no official local price index.' },
  ];

  return { sources, deal, dealFields, params, factors, evidence, scenarios: [
    { key: 'conservative', label: 'Conservative' },
    { key: 'moderate', label: 'Moderate' },
    { key: 'optimistic', label: 'Optimistic' },
  ] };
}());
