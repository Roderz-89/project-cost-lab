# Project Cost Lab

UK home-project cost range calculator and guides from **Rodway Labs**. Live at [https://projectcostlab.co.uk](https://projectcostlab.co.uk).

## What it is

Illustrative 2026 UK cost bands for 40+ home projects. Size, spec, region, access, occupation, listed uplift, VAT display, contingency and extras are editable. The mid figure is a **band for planning**, not a quote. The VAT toggle is a display choice, not a ruling. Not a contractor, architect or quantity surveyor.

## Deploy

Cloudflare Worker (assets) named `projectcostlab`, custom domain apex `projectcostlab.co.uk`.

```bash
npx wrangler@4 deploy
```

`wrangler.jsonc` uses `workers_dev: false`, `html_handling: auto-trailing-slash`, and a small Worker that 301s `www` → apex. Internal links use clean paths (no `.html`).

## Indexing & ads

- `robots.txt` — Allow: / + Sitemap
- `sitemap.xml` — clean 200 URLs
- `ads.txt` — `google.com, pub-7612291779397704, DIRECT, f08c47fec0942fa0`
- AdSense client `ca-pub-7612291779397704` (discreet units after explanatory copy)

## Contact

Publisher: Rodway Labs · hello@projectcostlab.co.uk
