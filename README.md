# Project Cost Lab

UK home-project cost range calculator and guides from **Rodway Labs**. Live at [https://projectcostlab.co.uk](https://projectcostlab.co.uk).

**Status (2 Oct 2026): parked** — `robots.txt` Disallow, meta/X-Robots-Tag noindex, AdSense removed, `ads.txt` authorises no sellers. Do not request AdSense review for this host.

## What it is

Illustrative 2026 UK cost bands for 40+ home projects. Size, spec, region, access, occupation, listed uplift, VAT display, contingency and extras are editable. The mid figure is a **band for planning**, not a quote. The VAT toggle is a display choice, not a ruling. Not a contractor, architect or quantity surveyor.

## Deploy

Cloudflare Worker (assets) named `projectcostlab`, custom domain apex `projectcostlab.co.uk`.

```bash
npx wrangler@4 deploy
```

`wrangler.jsonc` uses `workers_dev: false`, `html_handling: auto-trailing-slash`, and a small Worker that 301s `www` → apex and sends `X-Robots-Tag: noindex, nofollow` while parked. Internal links use clean paths (no `.html`).

## Indexing & ads (parked)

- `robots.txt` — Disallow: / (parked; not for indexing)
- `ads.txt` — comments only; **no** `google.com, pub-…, DIRECT` line
- AdSense client/scripts — removed while parked

## Contact

Publisher: Rodway Labs · hello@projectcostlab.co.uk
