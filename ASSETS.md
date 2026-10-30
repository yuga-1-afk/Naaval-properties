# Naaval Sunshine — media checklist

Drop a file into `landing-page-N/assets/...` with the exact name below and it replaces what is
there (or the placeholder). No code changes needed. Landscape images at 1920px+ wide, JPG.

## Still needed
| File | What it should show | Used by |
|---|---|---|
| `videos/hero.mp4` | Drone / walkthrough of the villas, 15–30 s, muted loop, < 10 MB (until then the aerial still shows) | 1 2 3 |

## Placed (from the 6 photos supplied)
| Photo | Page 1 | Page 2 | Page 3 | Page 4 |
|---|---|---|---|---|
| Aerial render | `hero-poster`, `why-hill-view` | `hero-poster` | `hero-poster`, `why-hill-view` | `calculator-bg` |
| Villa exterior | `intro`, `life-business` | — | `intro`, `life-business` | — |
| Dining interior | `why-villa`, `life-professionals` | `cta-bg` | `why-villa` | — |
| Community hall | `why-trust`, `amenities-bg` | `amenity-clubhouse` | `cta-bg` | — |
| Gym | `why-amenities` | `amenity-gym` | `life-professionals` | — |
| Kids' play area | `why-security`, `life-families` | `amenity-kids-play` | `life-families` | — |

Better-matched shots to swap in when available: a real **hill view** (`why-hill-view`),
**gate / security cabin** (`why-security`), and a **villa at dusk** (`cta-bg`, page 3).

## Brochure & floor plans
No PDFs are hosted on the site. Brochure / floor-plan buttons collect name + WhatsApp number;
the request lands in the sheet's **Leads** tab (the *Interest* column says brochure or floorplans)
and the sales team sends the file on WhatsApp.

## Forms + calculator → Google Sheet
Follow [google-sheet/SETUP.md](google-sheet/SETUP.md): paste `google-sheet/Code.gs` into the
sheet's Apps Script, run `setup`, deploy as a web app, and put the `/exec` URL in
`CONFIG.endpoint` in each `script.js`. Leads go to the **Leads** tab; the calculator's
cities, areas, projects and prices come from the **Calculator** tab.
Until then the forms run in demo mode (logged to the browser console).

## ROI calculator (page 4)
Page 4 is a villa ROI calculator, open to everyone: villa price + stamp duty + registration,
land and villa appreciation (separately), rental income and maintenance over the holding period.
Its starting assumptions come from the sheet's **Settings** tab. Page 2's "Calculate Your Villa Cost"
button links to it (`../landing-page-4/index.html`) — update that link if the pages are
hosted on separate domains.

Once the sheet is connected, edit cities / areas / projects / prices in its **Calculator** tab
and stamp duty / registration % in **Settings**. The built-in fallback list (used before the
sheet is connected) is `CONFIG.calculator.rows` in `script.js`: 18 cities (Salem + Salem
district towns) and 22 Salem areas. Only Siddhar Kovil Road has a project and price.
Stamp duty 7% and registration 2% are indicative; **confirm with the sales / legal team**.

`script.js` is identical in all four folders — copy it across after editing.
