#!/usr/bin/env node
// Project Cost Lab — pre-deploy checks. Usage: node scripts/check.mjs
// Calculator (57 projects, knobs move the band, no NaN), news data + pages,
// nav/footer links, CSP hashes, no ad code, ads.txt unchanged, internal links.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = (p) => readFileSync(join(ROOT, p), "utf8");
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.error("FAIL " + msg); } return cond; };

// ---- calculator -----------------------------------------------------------
const ctx = { window: {}, document: { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; } }, console };
vm.createContext(ctx);
for (const f of ["js/data.js", "js/projects-a.js", "js/projects-b.js", "js/app.js"]) vm.runInContext(r(f), ctx, { filename: f });
const PCL = ctx.window.PCL, L = ctx.window.ProjectCostLab;
const ids = Object.keys(PCL.PROJECTS);
ok(ids.length === 57, `expected 57 projects, got ${ids.length}`);
const base = { region: "uk", spec: "mid", access: "typical", occupied: "live_in", listed: "no", vat: "std", contig: 10, addons: [] };
const run = (o) => L.calc(Object.assign({}, base, o));
const nums = (x) => [x.total.low, x.total.mid, x.total.high, x.works.low, x.works.mid, x.works.high];
let nan = 0, combos = 0, inlineChecked = 0;
for (const id of ids) for (const spec of Object.keys(PCL.SPEC)) for (const region of Object.keys(PCL.REGIONS)) for (const vat of Object.keys(PCL.VAT_RATES)) {
  const x = run({ project: id, spec, region, vat, addons: PCL.PROJECTS[id].addons || [] });
  combos++; if (nums(x).some((v) => !Number.isFinite(v))) nan++;
  if (!(x.total.low <= x.total.mid && x.total.mid <= x.total.high)) nan++;
}
ok(nan === 0, `${nan} NaN/disordered bands across ${combos} combinations`);
const mid = (o) => run(Object.assign({ project: "ext_single", qty: 20 }, o)).total.mid;
const m0 = mid({});
const regions = Object.keys(PCL.REGIONS), specs = Object.keys(PCL.SPEC), access = Object.keys(PCL.ACCESS), occ = Object.keys(PCL.OCCUPIED);
const knobs = {
  qty: mid({ qty: 30 }), spec: mid({ spec: specs.find((s) => s !== "mid") }), region: mid({ region: regions.find((k) => PCL.REGIONS[k] !== PCL.REGIONS.uk) }),
  access: mid({ access: access.find((k) => k !== "typical") }), occupied: mid({ occupied: occ.find((k) => k !== "live_in") }), listed: mid({ listed: "yes" }),
  vat: mid({ vat: "zero" }), contig: mid({ contig: 20 }), addons: mid({ addons: ["steel"] }),
};
for (const [k, v] of Object.entries(knobs)) ok(Number.isFinite(v) && Math.abs(v - m0) > 1, `knob ${k} did not move the band (${m0} -> ${v})`);
console.log(`calculator: ${ids.length} projects, ${combos} combinations, 0 NaN expected (got ${nan}); knobs moved: ${Object.keys(knobs).join(", ")}`);

// ---- pages ----------------------------------------------------------------
const walk = (d) => readdirSync(join(ROOT, d)).flatMap((f) => {
  const p = d ? `${d}/${f}` : f;
  if ([".git", "node_modules", ".wrangler", "content", "scripts"].includes(f)) return [];
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});
const pages = walk("");
const news = JSON.parse(r("content/news.json"));
const worker = r("worker.js");
const hashes = new Set([...worker.matchAll(/'(sha256-[^']+)'/g)].map((m) => m[1]));
const sha = (s) => "sha256-" + createHash("sha256").update(s, "utf8").digest("base64");
const resolve = (href) => {
  let p = href.split("#")[0].split("?")[0];
  if (p === "" || p === "/") return existsSync(join(ROOT, "index.html"));
  if (p.endsWith("/")) return existsSync(join(ROOT, p, "index.html"));
  return existsSync(join(ROOT, p + ".html")) || existsSync(join(ROOT, p)) || existsSync(join(ROOT, p, "index.html"));
};
const html404 = worker.slice(worker.indexOf("const NOT_FOUND"), worker.indexOf("</html>`;"));
for (const [name, html] of [...pages.map((p) => [p, r(p)]), ["worker.js NOT_FOUND", html404]]) {
  if (!html.includes('class="site-header"')) continue;
  ok(/<nav id="nav">[\s\S]*?<a href="\/news"[^>]*>News<\/a>[\s\S]*?<\/nav>/.test(html), `${name}: News missing from main nav`);
  ok(/<li><a href="\/news">News<\/a><\/li>/.test(html), `${name}: News missing from footer`);
  ok(!/adsbygoogle|googlesyndication|pagead|ca-pub-|\bpub-\d/i.test(html), `${name}: ad code found`);
  ok(!/class="avatar"|editorial team|Publisher: Rodway|Operator: Rodway|· Published by Rodway Labs<\/p>/.test(html), `${name}: visible byline left`);
  // "Not a quote" banner only on pages with a working calculator (they load js/app.js)
  ok(html.includes('class="not-quote"') === /src="\/?js\/app\.js"/.test(html), `${name}: "Not a quote" banner should appear only on calculator pages`);
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) { inlineChecked++; ok(hashes.has(sha(m[1])), `${name}: inline script hash not in CSP`); }
  for (const m of html.matchAll(/\son(?:click|load|change|input|submit)="([^"]*)"/g)) { inlineChecked++; ok(hashes.has(sha(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"))), `${name}: inline handler hash not in CSP`); }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { ok(false, `${name}: invalid JSON-LD`); } }
  if (name !== "worker.js NOT_FOUND") for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (/^\/(css|js|fonts|brand)\//.test(m[1]) || /\.(ico|svg|png|webmanifest|xml|txt)$/.test(m[1])) continue;
    ok(resolve(m[1]), `${name}: broken internal link ${m[1]}`);
  }
}

// ---- news -----------------------------------------------------------------
const sm = r("sitemap.xml");
ok(existsSync(join(ROOT, "news.html")) && sm.includes("<loc>https://projectcostlab.co.uk/news</loc>"), "/news page or sitemap entry missing");
for (const p of news.posts) {
  const f = `news/${p.slug}.html`;
  if (!ok(existsSync(join(ROOT, f)), `${f} missing — run node scripts/build-news.mjs`)) continue;
  const h = r(f);
  ok(sm.includes(`<loc>https://projectcostlab.co.uk/news/${p.slug}</loc>`), `${p.slug} not in sitemap`);
  ok(h.includes("← All news") && h.includes("More from News") && /Published <time[^>]*>[^<]+<\/time> · Last updated/.test(h), `${p.slug}: back link / More from News / dates line missing`);
  ok(/"@type":"Article"/.test(h) && h.includes('"name":"Rodway Labs"'), `${p.slug}: Article JSON-LD with Rodway Labs publisher missing`);
  ok(/Illustrative only/.test(h) && /not a quote/i.test(h), `${p.slug}: disclaimer / not-a-quote wording missing`);
  ok(r(`content/news/${p.slug}.html`) && h.includes(r(`content/news/${p.slug}.html`).trim().split("\n")[0].trim()), `${p.slug}: page out of date — run node scripts/build-news.mjs`);
  ok([r("news.html"), ...(existsSync(join(ROOT, "news/page")) ? readdirSync(join(ROOT, "news/page")).map((f) => r(`news/page/${f}`)) : [])].some((h) => h.includes(`href="/news/${p.slug}"`)), `${p.slug}: not listed on /news or /news/page/N`);
}
ok(r("guides/index.html").includes('class="latest-news"'), "Latest news line missing on /guides/");

// ---- news pagination: 12 per page, newest first, every post reachable once ----
{
  const PER = 12;
  const sorted = [...news.posts].sort((a, b) => (b.date + b.updated).localeCompare(a.date + a.updated));
  const total = Math.max(1, Math.ceil(sorted.length / PER));
  const file = (n) => (n === 1 ? "news.html" : `news/page/${n}.html`);
  const path = (n) => (n === 1 ? "/news" : `/news/page/${n}`);
  const seen = [];
  for (let n = 1; n <= total; n++) {
    if (!ok(existsSync(join(ROOT, file(n))), `${file(n)} missing — run node scripts/build-news.mjs`)) continue;
    const h = r(file(n));
    const cards = [...h.matchAll(/<article class="post-card">[\s\S]*?<h2><a href="\/news\/([a-z0-9-]+)">/g)].map((m) => m[1]);
    const want = sorted.slice((n - 1) * PER, n * PER).map((p) => p.slug);
    ok(cards.length <= PER && JSON.stringify(cards) === JSON.stringify(want), `${path(n)}: expected posts ${want.join(",")} got ${cards.join(",")}`);
    seen.push(...cards);
    ok(h.includes(`<link rel="canonical" href="https://projectcostlab.co.uk${path(n)}">`) && h.includes('<meta name="robots" content="index, follow">'), `${path(n)}: canonical/robots wrong`);
    const hasNav = h.includes('<nav class="pagination" aria-label="News pages">');
    ok(hasNav === (total > 1), `${path(n)}: pagination nav ${hasNav ? "present with one page" : "missing"}`);
    if (total > 1) {
      for (let k = 1; k <= total; k++) ok(h.includes(`href="${path(k)}"`), `${path(n)}: no link to ${path(k)}`);
      ok((h.match(/aria-current="page" aria-label="Page \d+/g) || []).length === 1 && h.includes(`aria-current="page" aria-label="Page ${n},`), `${path(n)}: current page marker wrong`);
      ok(n === 1 ? !h.includes('rel="prev"') : h.includes(`href="${path(n - 1)}" rel="prev"`), `${path(n)}: Previous link wrong`);
      ok(n === total ? !h.includes('rel="next"') : h.includes(`href="${path(n + 1)}" rel="next"`), `${path(n)}: Next link wrong`);
    }
    ok(n === 1 ? h.includes("About this section") : !h.includes("About this section") && h.includes(`<title>News — page ${n} | Project Cost Lab</title>`) && h.includes(`<h1>News — page ${n}</h1>`), `${path(n)}: page-1-only sections / title / heading wrong`);
    if (n > 1) ok(sm.includes(`<loc>https://projectcostlab.co.uk${path(n)}</loc>`), `${path(n)} not in sitemap`);
  }
  ok(seen.length === sorted.length && new Set(seen).size === sorted.length, `pagination: ${seen.length} cards for ${sorted.length} posts (each must appear exactly once)`);
  const extra = existsSync(join(ROOT, "news/page")) ? readdirSync(join(ROOT, "news/page")).filter((f) => !(/^\d+\.html$/.test(f) && +f.slice(0, -5) >= 2 && +f.slice(0, -5) <= total)) : [];
  ok(extra.length === 0, `stale news/page files: ${extra.join(", ")}`);
  ok(!existsSync(join(ROOT, "news/page/1.html")), "news/page/1.html must not exist (/news/page/1 redirects to /news)");
  const smPages = [...sm.matchAll(/<loc>https:\/\/projectcostlab\.co\.uk\/news\/page\/(\d+)<\/loc>/g)].map((m) => +m[1]);
  ok(smPages.every((k) => k >= 2 && k <= total) && smPages.length === total - 1, `sitemap news pages wrong: ${smPages.join(",")}`);
  ok(!news.posts.some((p) => p.slug === "page"), 'post slug "page" is reserved');
  ok(/c === "\/news\/page\/1"\) c = "\/news"/.test(worker), "worker.js: /news/page/1 -> /news redirect missing");
  console.log(`news pagination: ${sorted.length} posts over ${total} page(s), ${PER} per page, all reachable`);
}

// ---- ads.txt ----------------------------------------------------------------
const ads = createHash("sha256").update(readFileSync(join(ROOT, "ads.txt"))).digest("hex");
ok(ads === "1d8eb929e531b81f3b0c9f4849c988c43ae14df823a4e1494bde9dc8a5748c66", `ads.txt changed (sha256 ${ads})`);

console.log(`pages checked: ${pages.length} + 404; news posts: ${news.posts.length}; inline scripts/handlers hash-checked: ${inlineChecked}; ads.txt sha256 ${ads.slice(0, 12)}…`);
if (fails) { console.error(`${fails} check(s) failed`); process.exit(1); }
console.log("All checks passed.");
