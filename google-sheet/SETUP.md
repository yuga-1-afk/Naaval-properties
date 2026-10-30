# Connect the landing pages to a Google Sheet (about 5 minutes)

One Google Sheet does two jobs:

- **Leads** tab: every form on all four pages lands here (site visits, brochure / floor-plan
  requests, calculator access). Includes date, form name, contact details, page and any
  `utm_*`, `gclid` and `fbclid` from the ad link.
- **Calculator** tab: the City → Area → Project → Villa Configuration → Price list the cost
  calculator shows. Edit it any time, and the website picks it up on the next page load.
- **Settings** tab: stamp duty % and registration fee %.

## 1. Create the sheet and add the script
1. Open **https://sheets.new** while signed in to the Google account that should own the leads.
   Name it e.g. *Naaval Sunshine — Leads*.
2. Menu **Extensions → Apps Script**.
3. Delete everything in `Code.gs`, paste in the contents of [`Code.gs`](Code.gs) from this folder,
   and click **Save** (💾).
4. *(Optional)* To get every lead by email too, set `NOTIFY_EMAIL` at the top, e.g.
   `const NOTIFY_EMAIL = 'sales@naaval.in';`, then save.

## 2. Build the tabs
1. In the function dropdown at the top choose **setup**, then click **Run**.
2. Google asks for permission. Click **Review permissions**, choose your account, then
   **Advanced → Go to (project name) → Allow**. This only lets the script edit this sheet
   (and send email if you turned that on).
3. Back in the sheet you'll see **Leads**, **Calculator** and **Settings** tabs. Calculator is
   pre-filled with Salem city areas and Salem district towns. Only Siddhar Kovil Road has a
   project and price so far.

## 3. Publish it as a web app
1. In Apps Script click **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. ("Anyone" is required so website
   visitors can submit. They can only add rows, not read the sheet.)
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

## 4. Paste the URL into the website
In **each** `landing-page-N/script.js` (all four are identical), set:

```js
endpoint: 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec',
```

Save and reload a page. Then test:
- Submit a form, and a new row appears in **Leads** within a few seconds.
- Open page 4, and the calculator dropdowns now come from the **Calculator** tab.

## Editing the calculator
| City | Area | Project | Villa Configuration | Price (₹) |
|---|---|---|---|---|
| Salem | Siddhar Kovil Road | Naaval Sunshine | 3 BHK Villa | 14000000 |
| Salem | Fairlands | | | |
| Attur | | | | |

- One row per villa type, with its price.
- A row with only City, or City + Area, still shows in the dropdowns. If a visitor picks a
  place with no project, the calculator points them to Naaval Sunshine and the phone number.
- Change stamp duty or registration % in **Settings**.

## ROI calculator settings (page 4)
The **Settings** tab also holds the ROI calculator's starting assumptions. Visitors can move the
sliders, but this is where they start:

| Setting | Default | Meaning |
|---|---|---|
| Holding Period (years) | 10 | How long the buyer keeps the villa |
| Land Share % | 40 | Share of the villa price that is land |
| Land Appreciation % | 8 | Land value growth per year |
| Villa Appreciation % | 3 | Building value growth per year |
| Monthly Rent (₹) | 30000 | Expected rent if leased out |
| Rent Increase % | 5 | Rent growth per year |
| Annual Maintenance (₹) | 36000 | Yearly upkeep and charges |

Running **setup** again adds any of these rows that are missing, without touching your values.

## If you change Code.gs later
Apps Script serves the version you deployed. After editing, go to **Deploy → Manage deployments →
✏️ Edit → Version: New version → Deploy**. The URL stays the same.
