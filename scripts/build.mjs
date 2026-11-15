#!/usr/bin/env node
// Project Cost Lab — full build in the right order. Usage: node scripts/build.mjs && node scripts/check.mjs
//   1. build-news.mjs   news pages + sitemap /news entries
//   2. build-costs.mjs  /costs pages, catalogue rows, COST_PAGES, sitemap /costs entries, home links
//   3. seo.mjs          Open Graph/Twitter tags, guide breadcrumbs
//   4. ads.mjs          ad switch from config/ads.json (off = no ad code anywhere)
//   5. build-static-config.mjs  _redirects, _headers (CSP hashes + allowed hosts), wrangler.jsonc
// OG images are separate (python3 scripts/og-images.py) because they need Pillow and fonts.
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
for (const s of ["build-news.mjs", "build-costs.mjs", "seo.mjs", "ads.mjs", "build-static-config.mjs"]) execFileSync(process.execPath, [join(here, s)], { stdio: "inherit" });
