# Project Cost Lab

UK home-project cost range calculator and guides from **Rodway Labs**. Live at [https://projectcostlab.co.uk](https://projectcostlab.co.uk).

**Status (3 Oct 2026): indexable again.** `robots.txt` allows crawling and lists the sitemap. HTML pages use `index,follow`. The Worker does not send `X-Robots-Tag: noindex`. **Ads are still OFF.** `ads.txt` authorises nobody until ads are deliberately turned on. A first-party cookie consent banner is live; neither choice loads ads or analytics.

## What it is

Illustrative 2026 UK cost bands for 40+ home projects. Size, spec, region, access, occupation, listed uplift, VAT display, contingency and extras are editable. The mid figure is a **band for planning**, not a quote. The VAT toggle is a display choice, not a ruling. Not a contractor, architect or quantity surveyor.

## Deploy

Cloudflare Worker (assets) named `projectcostlab`, custom domain apex `projectcostlab.co.uk`.

```bash
npx wrangler@4 deploy
```

`wrangler.jsonc` uses `workers_dev: false`, `html_handling: auto-trailing-slash`, and a small Worker that 301s `www` → apex. Internal links use clean paths (no `.html`).

## Indexing & ads

- `robots.txt` — `Allow: /` and `Sitemap: https://projectcostlab.co.uk/sitemap.xml`
- `ads.txt` — comments only; **no** `google.com, pub-…, DIRECT` line
- AdSense client/scripts — not loaded. Consent banner stores `pcl-consent` (`all` or `essential`) in localStorage and does not load third-party tags either way.

## Contact

Publisher: Rodway Labs · hello@projectcostlab.co.uk
