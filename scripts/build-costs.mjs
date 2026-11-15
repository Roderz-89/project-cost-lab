#!/usr/bin/env node
// Project Cost Lab — project cost pages (/costs/<slug>) and the static /projects catalogue.
// Source: content/costs.json (written copy per page) + the calculator data and engine (js/*.js).
// Every £ figure is computed here from the same calc() the browser runs, so pages and calculator agree.
// Writes: costs/<slug>.html, the catalogue rows in projects.html, COST_PAGES in js/data.js,
// and the /costs entries in sitemap.xml.
// Usage: node scripts/build-costs.mjs   (run by scripts/build.mjs)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://projectcostlab.co.uk";
const r = (p) => readFileSync(join(ROOT, p), "utf8");
const w = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (h) => String(h).replace(/<[^>]+>/g, "");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

const data = JSON.parse(r("content/costs.json"));
const CHECKED = data.checked;

// ---- COST_PAGES map into js/data.js first, so the engine we load sees it -------------
{
  const map = Object.fromEntries(data.pages.map((p) => [p.id, p.slug]));
  let d = r("js/data.js");
  const entry = `"COST_PAGES":${JSON.stringify(map)},`;
  d = /"COST_PAGES":\{[^}]*\},/.test(d) ? d.replace(/"COST_PAGES":\{[^}]*\},/, entry) : d.replace('"PROJECTS":{}', entry + '"PROJECTS":{}');
  w("js/data.js", d);
}

// ---- calculator engine --------------------------------------------------------------
const ctx = { window: {}, document: { addEventListener() {} } };
vm.createContext(ctx);
for (const f of ["js/data.js", "js/projects-a.js", "js/projects-b.js", "js/app.js"]) vm.runInContext(r(f), ctx, { filename: f });
const D = ctx.window.PCL, L = ctx.window.ProjectCostLab, P = D.PROJECTS;
const BASE = { region: "uk", spec: "mid", access: "typical", occupied: "live_in", listed: "no", vat: "ex", contig: 0, addons: [] };
const calc = (o) => L.calc(Object.assign({}, BASE, o));
const r10 = (n) => "£" + (Math.round(n / 10) * 10).toLocaleString("en-GB");
const rough = (n) => { const step = n < 10000 ? 100 : n < 50000 ? 500 : 1000; return "£" + (Math.round(n / step) * step).toLocaleString("en-GB"); };
const today = new Date().toISOString().slice(0, 10);
const energyVat = (id) => (D.ENERGY_SAVING.includes(id) ? (today <= D.ENERGY_VAT_ZERO_UNTIL ? "zero" : "reduced") : "std");
const vatLabel = { std: "20% VAT", zero: "0% VAT", reduced: "5% VAT" };
// Boiler Upgrade Scheme (England & Wales), GOV.UK / Ofgem, checked 15 Nov 2026.
const BUS = { standard: 7500, offGas: 9000, offGasUntil: "2027-03-31" };

// ---- validate ------------------------------------------------------------------------
const errors = [];
for (const p of data.pages) {
  if (!P[p.id]) errors.push(`${p.slug}: unknown project id ${p.id}`);
  if (!/^[a-z0-9-]+$/.test(p.slug)) errors.push(`${p.slug}: bad slug`);
  for (const k of ["name", "intro", "drivers", "rules", "faq", "ogTitle", "ogSub"]) if (!p[k] || !p[k].length) errors.push(`${p.slug}: missing ${k}`);
  const prose = [p.intro, ...p.drivers, p.rules, ...p.faq.flatMap((f) => [f.q, f.a])].join(" ");
  if (/£\s?\d/.test(prose)) errors.push(`${p.slug}: £ figures in written copy — numbers must come from the calculator`);
  for (const rel of p.related || []) if (!P[rel]) errors.push(`${p.slug}: unknown related ${rel}`);
}
if (errors.length) { console.error("Costs build failed:\n - " + errors.join("\n - ")); process.exit(1); }
const bySlug = Object.fromEntries(data.pages.map((p) => [p.id, p.slug]));
const linkFor = (id) => (bySlug[id] ? `/costs/${bySlug[id]}` : `/?p=${id}#calculator`);

// ---- shared chrome -------------------------------------------------------------------
const tpl = r("guides/index.html");
const header = tpl.slice(tpl.indexOf('  <header class="site-header">'), tpl.indexOf("  </header>") + "  </header>".length)
  .replace(' aria-current="page">Guides</a>', ">Guides</a>")
  .replace('<a href="/projects">Projects</a>', '<a href="/projects" aria-current="page">Projects</a>');
const footer = tpl.slice(tpl.indexOf('  <footer class="site-footer">')).replace(/\n\s*<!-- ads-head -->[\s\S]*?<!-- \/ads-head -->/, "");
const icons = tpl.slice(tpl.indexOf('  <link rel="preload"'), tpl.indexOf('  <script type="application/ld+json">')).replace(/  <!-- og -->[\s\S]*?<!-- \/og -->\n/, "");
if (!header.includes('href="/projects" aria-current="page"') || !footer.includes("</footer>")) { console.error("Costs build failed: could not read chrome from guides/index.html"); process.exit(1); }
const home = r("index.html");
const calcStart = home.indexOf('<section class="calc-section" id="calculator">');
const quoteEnd = home.indexOf("</div>", home.indexOf('<p class="not-quote">')) + "</div>".length;
let CALC = home.slice(calcStart, quoteEnd);
if (calcStart < 0 || !CALC.includes('id="pc-form"') || !CALC.includes('class="not-quote"')) { console.error("Costs build failed: calculator block not found in index.html"); process.exit(1); }
const scripts = `  <script src="/js/data.js"></script>
  <script src="/js/projects-a.js"></script>
  <script src="/js/projects-b.js"></script>
  <script src="/js/app.js"></script>
`;

const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Rodway Labs", url: `${SITE}/`, logo: { "@type": "ImageObject", url: `${SITE}/brand/rodway-labs-logo.png`, width: 934, height: 328 } };
const WEBSITE = { "@type": "WebSite", "@id": `${SITE}/#website`, name: "Project Cost Lab", url: `${SITE}/`, inLanguage: "en-GB", publisher: { "@id": `${SITE}/#org` } };
const ld = (graph) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;

// ---- pages ---------------------------------------------------------------------------
const written = [];
for (const pg of data.pages) {
  const p = P[pg.id];
  const id = pg.id;
  const v = energyVat(id);
  const typicalQty = pg.sizes ? pg.sizes[1] : p.defaultQty;
  const unit = p.unit || p.qtyLabel || "";
  const typ = calc({ project: id, qty: typicalQty });
  const typVat = calc({ project: id, qty: typicalQty, vat: v });
  const occNote = typ.occApplies ? "living in during the works" : "occupation not applied to this job";
  const settings = `UK mid-range region, typical suburban access, ${occNote}, not listed, no extras ticked and no contingency`;
  const sizeTxt = pg.sizes ? `${typicalQty} ${unit}` : "a typical house";
  const title = `${pg.name} cost UK 2026: ${rough(typ.total.low)}–${rough(typ.total.high)}`;
  const description = `${pg.name} cost in the UK for 2026: about ${rough(typ.total.low)}–${rough(typ.total.high)} for ${sizeTxt} at mid spec before VAT. Size, spec and region tables plus a calculator. Not a quote.`;
  const path = `/costs/${pg.slug}`;

  // size table
  let sizeTable = "";
  if (pg.sizes) {
    const perCol = p.mode === "area" || p.mode === "run";
    const perLabel = p.mode === "area" ? "Mid per m²" : p.mode === "run" ? "Mid per metre" : "";
    const rows = pg.sizes.map((q) => {
      const b = calc({ project: id, qty: q, spec: "budget" }), m = calc({ project: id, qty: q }), h = calc({ project: id, qty: q, spec: "high" }), mv = calc({ project: id, qty: q, vat: v });
      return `            <tr><th scope="row">${q} ${esc(unit)}</th><td>${r10(b.total.mid)}</td><td>${r10(m.total.low)} – ${r10(m.total.high)}</td><td><strong>${r10(m.total.mid)}</strong></td><td>${r10(h.total.mid)}</td><td>${r10(mv.total.mid)}</td>${perCol ? `<td>${r10(m.total.mid / q)}</td>` : ""}</tr>`;
    }).join("\n");
    sizeTable = `      <h2 id="by-size">${esc(pg.name)} cost by size and specification</h2>
      <p>Three sizes — ${esc(pg.sizeNote)} — at budget, mid and high specification. Figures are ex-VAT unless the column says otherwise, with ${settings}. Rounded to the nearest £10.</p>
      <div class="table-scroll"><table class="project-table">
        <thead><tr><th scope="col">Size</th><th scope="col">Budget spec, mid</th><th scope="col">Mid spec, band</th><th scope="col">Mid spec, mid</th><th scope="col">High spec, mid</th><th scope="col">Mid spec with ${vatLabel[v]}</th>${perCol ? `<th scope="col">${perLabel}</th>` : ""}</tr></thead>
        <tbody>
${rows}
        </tbody>
      </table></div>
`;
  } else if (id === "heat_pump") {
    const z = calc({ project: id, vat: v }), five = calc({ project: id, vat: "reduced" }), zc = calc({ project: id, vat: v, addons: ["cylinder"] });
    const row = (label, t, g = 0) => `            <tr><th scope="row">${label}</th><td>${r10(t.low - g)} – ${r10(t.high - g)}</td><td><strong>${r10(t.mid - g)}</strong></td></tr>`;
    const offGas = today <= BUS.offGasUntil ? "\n" + row(`Less the £${BUS.offGas.toLocaleString("en-GB")} off-gas grant (oil or LPG replaced, to 31 Mar 2027)`, z.total, BUS.offGas) : "";
    sizeTable = `      <h2 id="by-size">Heat pump cost before and after the grant</h2>
      <p>A typical three-bedroom house at mid specification, with ${settings}. The grant is taken off the installed price; VAT is worked out before the grant, as the calculator does. Grant values are from GOV.UK and Ofgem, checked ${longDate(CHECKED)}. Rounded to the nearest £10.</p>
      <div class="table-scroll"><table class="project-table">
        <thead><tr><th scope="col">Scenario</th><th scope="col">Band</th><th scope="col">Mid</th></tr></thead>
        <tbody>
${row(`Installed, ${vatLabel[v]}`, z.total)}
${row(`Installed with a new hot-water cylinder, ${vatLabel[v]}`, zc.total)}
${row(`Less the £${BUS.standard.toLocaleString("en-GB")} Boiler Upgrade Scheme grant`, z.total, BUS.standard)}${offGas}
${v === "reduced" ? "" : row(`From 1 April 2027 at 5% VAT, less the £${BUS.standard.toLocaleString("en-GB")} grant`, five.total, BUS.standard)}
        </tbody>
      </table></div>
`;
  }

  // region table
  const regionRows = Object.entries(D.REGIONS).map(([rid, reg]) => {
    const a = calc({ project: id, qty: typicalQty, region: rid }), b = calc({ project: id, qty: typicalQty, region: rid, vat: v });
    return `            <tr><th scope="row">${esc(reg.label)}</th><td>${r10(a.total.mid)}</td><td>${r10(b.total.mid)}</td></tr>`;
  }).join("\n");
  const regionTable = `      <h2 id="by-region">${esc(pg.name)} cost by region</h2>
      <p>The mid-spec mid for ${esc(sizeTxt)} in each region, using the calculator’s regional factors (see <a href="/guides/region-access">region and access</a>). Other settings as above.</p>
      <div class="table-scroll"><table class="project-table">
        <thead><tr><th scope="col">Region</th><th scope="col">Mid, ex-VAT</th><th scope="col">Mid, ${vatLabel[v]}</th></tr></thead>
        <tbody>
${regionRows}
        </tbody>
      </table></div>
`;

  const related = (pg.related || []).map((rid) => `<a href="${linkFor(rid)}">${esc(P[rid].label)}</a>`).join(" · ");
  const faqHtml = pg.faq.map((f) => `      <h3>${esc(f.q)}</h3>\n      <p>${f.a}</p>`).join("\n");
  const calcBlock = CALC
    .replace('<form class="calc-form" id="pc-form">', `<form class="calc-form" id="pc-form" data-project="${id}">`)
    .replace("<h2>Project cost range — 2026 illustration</h2>", `<h2>Run your own ${esc(pg.name.toLowerCase())} range</h2>`)
    .replace(/<div class="example" id="pc-example">[\s\S]*?<\/div>/, `<div class="example" id="pc-example">
        <p><span class="badge">YOUR RUN</span> ${esc(pg.name.toUpperCase())}</p>
        <p>Change any input and this box follows the live run.</p>
      </div>`);
  const graph = [ORG, WEBSITE,
    { "@type": "Article", headline: `${pg.name} cost UK 2026`, description, datePublished: "2026-11-15", dateModified: CHECKED, inLanguage: "en-GB", mainEntityOfPage: `${SITE}${path}`, image: `${SITE}/og/${pg.slug}.png`, author: { "@type": "Organization", name: "Rodway Labs", url: `${SITE}/` }, publisher: { "@id": `${SITE}/#org` } },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE}/projects` },
      { "@type": "ListItem", position: 3, name: pg.name, item: `${SITE}${path}` }] },
    { "@type": "FAQPage", mainEntity: pg.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: strip(f.a) } })) }];

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index, follow">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${path}">
  <link rel="stylesheet" href="/css/styles.css">
${icons}  ${ld(graph)}
</head>
<body>
${header}
  <main>
    <section class="section cost-hero">
      <div class="wrap prose">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/projects">Projects</a> › <span aria-current="page">${esc(pg.name)}</span></nav>
        <h1>${esc(pg.name)} cost UK 2026</h1>
        <p class="src"><a href="/about#methodology">Page checked ${longDate(CHECKED)}</a> · cost ranges compiled September 2026</p>
        <div class="cost-summary">
          <p class="cost-summary-h">${esc(sizeTxt.charAt(0).toUpperCase() + sizeTxt.slice(1))}, mid spec</p>
          <p class="cost-summary-fig">${r10(typ.total.low)} – ${r10(typ.total.high)}</p>
          <p>Mid ${r10(typ.total.mid)} before VAT, ${v === "zero" ? "and the same at the 0% VAT rate for qualifying installs to 31 March 2027" : `or ${r10(typVat.total.mid)} with ${vatLabel[v]}`}. No contingency. Typical programme ${esc(p.weeks)}.</p>
          <p><a class="btn" href="#calculator">Change the size, spec and region</a></p>
        </div>
${pg.intro.replace(/^/, "        ")}
        <p class="inc"><strong>Usually in the band.</strong> ${esc(p.includes)}</p>
        <p class="exc"><strong>Usually outside the band.</strong> ${esc(p.excludes)}</p>
      </div>
    </section>
  ${calcBlock}
    <div class="wrap"><div class="ad-slot" data-slot="after-result" hidden></div><!-- /ad-slot --></div>
    <section class="section">
      <div class="wrap prose">
${sizeTable}
${regionTable}
      <h2>What moves the price</h2>
      <ul>
${pg.drivers.map((d) => `        <li>${d}</li>`).join("\n")}
      </ul>
      <h2>Planning, Building Regulations and permissions</h2>
${pg.rules.replace(/^/, "      ")}
      <p class="hint">General information for England unless stated, checked ${longDate(CHECKED)}. Rules differ in Wales, Scotland and Northern Ireland and change over time — confirm with your council, Building Control or the Planning Portal before you start.</p>
      <div class="ad-slot" data-slot="in-content" hidden></div><!-- /ad-slot -->
      <h2>${esc(pg.name)} cost FAQ</h2>
${faqHtml}
      <h2>How these figures are worked out</h2>
      <p>Every figure on this page comes from the Project Cost Lab calculator: a compiled 2026 mid rate for this project, multiplied by size, specification, access, occupation and region, with a band either side of the mid. They are illustrative planning ranges, not quotes, and have no live price feed. Get several written, itemised quotes on the same drawings before you commit. See the <a href="/about#methodology">methodology</a> and <a href="/disclaimer">disclaimer</a>.</p>
      <p class="src">Related: ${related}${pg.guide ? ` · Guide: <a href="${pg.guide[0]}">${esc(pg.guide[1])}</a>` : ""} · <a href="/projects">All ${Object.keys(P).length} projects</a></p>
      </div>
    </section>
${footer.replace("</body>", scripts + "</body>")}`;
  w(`costs/${pg.slug}.html`, html);
  written.push(pg.slug);
}
// remove stale pages
if (existsSync(join(ROOT, "costs"))) for (const f of readdirSync(join(ROOT, "costs"))) if (f.endsWith(".html") && !written.includes(f.slice(0, -5))) unlinkSync(join(ROOT, "costs", f));

// ---- /projects catalogue: static rows (crawlable links), filtered by a small inline script ----
{
  const unitOf = (p) => (p.mode === "lump" && !p.qtyLabel ? "Whole job" : (p.mode === "area" ? "Per m² · " : p.mode === "run" ? "Per metre · " : p.mode === "unit" ? "Per unit · " : "Scales · ") + (p.unit || p.qtyLabel || ""));
  const midOf = (p) => (p.mode === "lump" ? L.money(p.mid) : L.money(p.midPer * (p.defaultQty || 1)) + " at default size");
  const rows = Object.entries(P).map(([pid, p]) => `            <tr data-cat="${p.cat}"><td><a href="${linkFor(pid)}">${esc(p.label)}</a>${bySlug[pid] ? ' <span class="tag">Cost page</span>' : ""}<div class="hint">${esc(p.note)}</div></td><td>${esc(unitOf(p))}</td><td>${p.defaultQty ? p.defaultQty + " " + esc(p.unit || "") : "—"}</td><td>${midOf(p)}</td></tr>`).join("\n");
  let pj = r("projects.html");
  pj = pj.replace(/(<table class="project-table" id="project-table">[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/, `$1\n${rows}\n          $2`);
  w("projects.html", pj);
}

// ---- sitemap: replace /costs entries -------------------------------------------------
{
  let sm = r("sitemap.xml").replace(/\s*<url>\s*<loc>https:\/\/projectcostlab\.co\.uk\/costs\/[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
  const entries = written.map((s) => `  <url>\n    <loc>${SITE}/costs/${s}</loc>\n    <lastmod>${CHECKED}</lastmod>\n  </url>`).join("\n");
  sm = sm.replace("</urlset>", entries + "\n</urlset>");
  w("sitemap.xml", sm);
}
console.log(`Costs build OK: ${written.length} pages (${written.join(", ")}); catalogue rows and sitemap updated.`);

// ---- "Popular cost pages" links on the home page (between <!-- cost-links --> markers) ----
{
  const links = `<ul class="cost-links">${data.pages.map((p) => `<li><a href="/costs/${p.slug}">${esc(p.name)} cost</a></li>`).join("")}</ul>`;
  let h = r("index.html");
  h = h.replace(/<!-- cost-links -->[\s\S]*?<!-- \/cost-links -->/, `<!-- cost-links -->${links}<!-- /cost-links -->`);
  w("index.html", h);
}
