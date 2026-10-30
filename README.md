# Project Cost Lab

UK home-project cost range calculator and guides from **Rodway Labs**. Live at [https://projectcostlab.co.uk](https://projectcostlab.co.uk).

**Status (3 Oct 2026): indexable again.** `robots.txt` allows crawling and lists the sitemap. HTML pages use `index,follow`. The Worker does not send `X-Robots-Tag: noindex`. **This site does not show ads.** `ads.txt` authorises nobody. A first-party cookie consent banner is live; neither choice loads ads or analytics.

## What it is

Illustrative 2026 UK cost bands for 57 home projects. Size, spec, region, access, occupation, listed uplift, VAT display, contingency and extras are editable. The mid figure is a **band for planning**, not a quote. The VAT toggle is a display choice, not a ruling. Not a contractor, architect or quantity surveyor.

## Deploy

Cloudflare Worker (assets) named `projectcostlab`, custom domain apex `projectcostlab.co.uk`.

See **Build & checks** below for the exact deploy command.

`wrangler.jsonc` uses `workers_dev: false`, `html_handling: auto-trailing-slash`, and a small Worker that 301s `www` → apex. Internal links use clean paths (no `.html`).

## Build & checks

Plain static HTML; no bundler. Two Node scripts (Node 18+), not served (listed in `.assetsignore`):

```bash
node scripts/build-news.mjs   # builds /news, /news/<slug>, sitemap /news entries, "Latest news" on /guides/
node scripts/check.mjs        # calculator (57 projects, knobs move the band, 0 NaN), nav/footer, CSP hashes,
                              # JSON-LD, internal links, no ad code, ads.txt sha256 unchanged, news pages in sync
```

Run both before every deploy. Deploy command (token is read from the box secret, never printed):

```bash
CLOUDFLARE_API_TOKEN=$(cat /home/box/.secrets/cf_deploy_token) npx wrangler@4 deploy
```

## News (/news)

Single source of truth: `content/news.json` (metadata) + `content/news/<slug>.html` (post body, HTML fragment).
`news.html` and `news/*.html` are **generated** — do not edit them by hand.

**Add a post**
1. Write the body in `content/news/<slug>.html` (lowercase slug, hyphens). Start with a plain intro paragraph; use `<h2>` sections. Do not add the title, dates, sources or "More from News" — the build adds them.
2. Include a worked £ example run through the calculator logic in Node (`window.ProjectCostLab.calc(...)` after loading `js/data.js`, `js/projects-a.js`, `js/projects-b.js`, `js/app.js`) and state the inputs. End with an `<div class="update-box"><p><strong>Illustrative only.</strong> …</p></div>` disclaimer.
3. Add an entry to `content/news.json` → `posts`: `slug`, `title`, `description` (meta, ~155 chars), `date` and `updated` (YYYY-MM-DD), `category` (one of `categories`: Building costs, Grants & VAT, Planning, Energy), `readTime` (minutes; the build fails if it is >1 min off the body), `excerpt`, optional `updateDue` (renders the "Update due" box), and `sources` (`title` + https `url`, official sources only).
4. `node scripts/build-news.mjs && node scripts/check.mjs`, review, commit, push, deploy, then ping IndexNow for the new URL(s).

**Update a post** — edit the body and/or JSON, set `updated` to today, remove or change `updateDue` once the awaited release is out, rebuild, check, commit, deploy. Corrections are made in place.

Rules: UK home-project costs only (not loans, borrowing, rates or credit); official sources (ONS, DBT, HMRC, HM Treasury, DESNZ, Ofgem, GOV.UK, MHCLG, Planning Portal; OBR only where relevant); never invent figures — if data is not out, write a preview with no predictions and an `updateDue` date; calm UK English; no advice to buy, borrow or commission work; no personal names (Rodway Labs only); no ads. If a guide is ever converted into a post, 301 its old URL in `worker.js`.

## Indexing & ads

- `robots.txt` — `Allow: /` and `Sitemap: https://projectcostlab.co.uk/sitemap.xml`
- `ads.txt` — comments only; authorises no seller
- This site does not show ads. Consent banner stores `pcl-consent` (`all` or `essential`) in localStorage and does not load third-party tags either way.

## Contact

Publisher: Rodway Labs · hello@projectcostlab.co.uk
