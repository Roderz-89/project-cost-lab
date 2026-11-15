#!/usr/bin/env node
// Project Cost Lab — share tags. Usage: node scripts/seo.mjs   (run by scripts/build.mjs)
// For every indexable page: Open Graph + Twitter card tags between <!-- og --> markers, built from the
// page's own <title>, meta description and canonical. Image: og/<slug>.png for /costs pages, else og/default.png.
// Also adds a BreadcrumbList to guide pages that lack one.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://projectcostlab.co.uk";
const SKIP = new Set([".git", "node_modules", ".wrangler", "content", "scripts", "config"]);
const walk = (d) => readdirSync(join(ROOT, d)).flatMap((f) => {
  const p = d ? `${d}/${f}` : f;
  if (SKIP.has(f)) return [];
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});
const attr = (s) => s.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, "&amp;").replace(/"/g, "&quot;");
let n = 0;
for (const f of walk("")) {
  if (f === "404.html") continue;
  let h = readFileSync(join(ROOT, f), "utf8");
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (h.match(/<meta name="description" content="([^"]*)">/) || [])[1];
  const canon = (h.match(/<link rel="canonical" href="([^"]*)">/) || [])[1];
  if (!title || !desc || !canon) continue;
  const slug = canon.startsWith(`${SITE}/costs/`) ? canon.slice(`${SITE}/costs/`.length) : "";
  const img = slug && existsSync(join(ROOT, `og/${slug}.png`)) ? `${SITE}/og/${slug}.png` : `${SITE}/og/default.png`;
  const type = /\/(news|guides|costs)\/[^/]+$/.test(canon) ? "article" : "website";
  const tags = `  <!-- og --><meta property="og:type" content="${type}"><meta property="og:site_name" content="Project Cost Lab"><meta property="og:locale" content="en_GB"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><!-- /og -->\n`;
  h = h.replace(/  <!-- og -->[\s\S]*?<!-- \/og -->\n/, "");
  h = h.replace(/(<link rel="canonical" href="[^"]*">\n)/, `$1${tags}`);
  // guide pages: BreadcrumbList Home > Guides > page
  if (/^guides\/(?!index)[^/]+\.html$/.test(f) && !h.includes('"BreadcrumbList"')) {
    const name = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, "").trim() || title;
    h = h.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (m, a, json, b) => {
      const j = JSON.parse(json);
      j["@graph"].push({ "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides/` },
        { "@type": "ListItem", position: 3, name, item: canon }] });
      return a + JSON.stringify(j) + b;
    });
  }
  writeFileSync(join(ROOT, f), h); n++;
}
console.log(`SEO tags OK: Open Graph/Twitter on ${n} pages; guide breadcrumbs present.`);
