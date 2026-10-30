#!/usr/bin/env node
// Project Cost Lab — News build.
// Single source: content/news.json (metadata) + content/news/<slug>.html (post body).
// Writes: news.html (/news), news/<slug>.html (/news/<slug>), the /news entries in
// sitemap.xml, and the "Latest news" line on guides/index.html.
// Usage: node scripts/build-news.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://projectcostlab.co.uk";
const r = (p) => readFileSync(join(ROOT, p), "utf8");
const w = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); };

const data = JSON.parse(r("content/news.json"));
const CATS = data.categories;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
export const wordCount = (html) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
export const readMins = (html) => Math.max(1, Math.round(wordCount(html) / 200));

// ---- validate -------------------------------------------------------------
const errors = [];
const slugs = new Set();
for (const p of data.posts) {
  for (const k of ["slug", "title", "description", "date", "updated", "category", "readTime", "excerpt", "sources"]) if (p[k] === undefined || p[k] === "") errors.push(`${p.slug || "?"}: missing ${k}`);
  if (!/^[a-z0-9-]+$/.test(p.slug)) errors.push(`${p.slug}: slug must be lowercase a-z, 0-9 and hyphens`);
  if (slugs.has(p.slug)) errors.push(`${p.slug}: duplicate slug`);
  slugs.add(p.slug);
  if (!CATS.includes(p.category)) errors.push(`${p.slug}: category must be one of ${CATS.join(", ")}`);
  for (const k of ["date", "updated"]) if (!/^\d{4}-\d{2}-\d{2}$/.test(p[k] || "")) errors.push(`${p.slug}: ${k} must be YYYY-MM-DD`);
  if (p.updated < p.date) errors.push(`${p.slug}: updated is before date`);
  if (!existsSync(join(ROOT, `content/news/${p.slug}.html`))) errors.push(`${p.slug}: content/news/${p.slug}.html not found`);
  else {
    p.body = r(`content/news/${p.slug}.html`);
    const est = readMins(p.body);
    if (Math.abs(est - p.readTime) > 1) errors.push(`${p.slug}: readTime ${p.readTime} but body reads as ~${est} min`);
  }
  for (const s of p.sources || []) if (!/^https:\/\//.test(s.url)) errors.push(`${p.slug}: source URL must be https: ${s.url}`);
}
if (errors.length) { console.error("News build failed:\n - " + errors.join("\n - ")); process.exit(1); }

const posts = [...data.posts].sort((a, b) => (b.date + b.updated).localeCompare(a.date + a.updated));

// ---- shared chrome taken from guides/index.html so nav/footer stay in sync --
const tpl = r("guides/index.html");
const header = tpl.slice(tpl.indexOf("  <header class=\"site-header\">"), tpl.indexOf("  </header>") + "  </header>".length)
  .replace(' aria-current="page">Guides</a>', ">Guides</a>")
  .replace('<a href="/news">News</a>', '<a href="/news" aria-current="page">News</a>');
const footer = tpl.slice(tpl.indexOf("  <footer class=\"site-footer\">"));
const icons = tpl.slice(tpl.indexOf('  <link rel="preload"'), tpl.indexOf('  <script type="application/ld+json">'));
if (!header.includes('href="/news" aria-current="page"') || !footer.includes("/js/consent.js")) { console.error("News build failed: could not read header/footer from guides/index.html"); process.exit(1); }

const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Rodway Labs", url: `${SITE}/`, logo: { "@type": "ImageObject", url: `${SITE}/brand/rodway-labs-logo.png`, width: 934, height: 328 } };
const WEBSITE = { "@type": "WebSite", "@id": `${SITE}/#website`, name: "Project Cost Lab", url: `${SITE}/`, inLanguage: "en-GB", publisher: { "@id": `${SITE}/#org` } };
const ld = (graph) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;

const head = ({ title, description, path, graph }) => `<!DOCTYPE html>
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
`;

const meta = (p) => `<p class="post-meta"><span class="tag">${esc(p.category)}</span><span><time datetime="${p.date}">${fmt(p.date)}</time></span><span aria-hidden="true">·</span><span>${p.readTime} min read</span></p>`;

// ---- /news ------------------------------------------------------------------
const listUrl = `${SITE}/news`;
const card = (p) => `        <li><article class="post-card">
          ${meta(p)}
          <h2><a href="/news/${p.slug}">${esc(p.title)}</a></h2>
          <p>${esc(p.excerpt)}</p>
          <a class="read" href="/news/${p.slug}" aria-label="Read post: ${esc(p.title)}">Read post →</a>
        </article></li>`;
const newsIndex = head({
  title: "News: UK home project costs, grants and VAT | Project Cost Lab",
  description: "Short, sourced posts on what is moving UK home project costs: building material prices, heat pump grants, VAT on energy-saving work, planning and energy bills.",
  path: "/news",
  graph: [ORG, WEBSITE,
    { "@type": "CollectionPage", "@id": `${listUrl}#page`, url: listUrl, name: "News", inLanguage: "en-GB", isPartOf: { "@id": `${SITE}/#website` }, publisher: { "@id": `${SITE}/#org` },
      mainEntity: { "@type": "ItemList", itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/news/${p.slug}`, name: p.title })) } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: "News", item: listUrl }] }],
}) + `  <main class="section">
    <div class="wrap">
      <div class="news-intro">
        <h1>News</h1>
        <p class="lede-plain">Short posts on what is moving the cost of UK home projects: building material and construction prices, grants and VAT on energy-saving work, planning and building regulations, and energy bills. Each post links to the official source and, where it helps, shows a worked £ example from our calculator with the inputs stated.</p>
      </div>
      <ul class="post-list">
${posts.map(card).join("\n")}
      </ul>
      <section class="news-about" aria-labelledby="about-news">
        <h2 id="about-news">About this section</h2>
        <p>News sits alongside our <a href="/guides/">guides</a> and the <a href="/#calculator">calculator</a>. Guides explain how a project is priced; news posts cover changes as they are published, such as a new statistics release, a grant change or a VAT date. Posts are tagged ${CATS.map(esc).join(", ").replace(/, ([^,]*)$/, " or $1")}. We do not recommend whether to start, delay or commission any work, or how to pay for it.</p>
        <h2>Where our figures come from</h2>
        <p>We use official and primary sources: the Office for National Statistics (construction output price indices), the Department for Business and Trade (building materials statistics), HMRC and HM Treasury (VAT and Budget measures), the Department for Energy Security and Net Zero, GOV.UK and Ofgem (the Boiler Upgrade Scheme, energy schemes and the price cap), and the Ministry of Housing, Communities and Local Government and the Planning Portal (planning, permitted development and Building Regulations). Every post lists its sources with links. Worked examples are run through the same calculator logic as the <a href="/#calculator">calculator</a>, and we state the inputs so you can reproduce them. If an official figure has not been published yet, we say so rather than estimate it.</p>
        <h2>Who writes these posts</h2>
        <p>Posts are written and checked by Rodway Labs, the independent UK publisher behind Project Cost Lab. We are not a contractor, architect, quantity surveyor or adviser, and we do not take payment to feature any product, installer or scheme. Read more <a href="/about">about us</a> and our <a href="/about#methodology">methodology</a>.</p>
        <h2>How posts are updated</h2>
        <p>Each post shows when it was published and when it was last updated. When a post depends on a release that is still to come, it carries an update box with the expected date, and we update the post once the figures are out. Corrections are made in place and the “Last updated” date changes. If you spot an error, please <a href="/contact">contact us</a>.</p>
      </section>
    </div>
  </main>
${footer}`;
w("news.html", newsIndex);

// ---- /news/<slug> -----------------------------------------------------------
if (existsSync(join(ROOT, "news"))) for (const f of readdirSync(join(ROOT, "news"))) if (f.endsWith(".html") && !slugs.has(f.slice(0, -5))) unlinkSync(join(ROOT, "news", f));
for (const p of posts) {
  const url = `${SITE}/news/${p.slug}`;
  const more = posts.filter((q) => q.slug !== p.slug).slice(0, 3);
  const html = head({
    title: `${p.title} | Project Cost Lab`,
    description: p.description,
    path: `/news/${p.slug}`,
    graph: [ORG, WEBSITE,
      { "@type": "Article", "@id": `${url}#article`, headline: p.title, description: p.description, datePublished: p.date, dateModified: p.updated, articleSection: p.category, inLanguage: "en-GB",
        mainEntityOfPage: url, url, image: `${SITE}/brand/rodway-labs-logo.png`, author: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` }, isPartOf: { "@id": `${SITE}/#website` },
        citation: p.sources.map((s) => s.url) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: "News", item: listUrl }, { "@type": "ListItem", position: 3, name: p.title, item: url }] }],
  }) + `  <main class="section">
    <div class="wrap">
      <article class="prose">
        <a class="back-link" href="/news">← All news</a>
        ${meta(p)}
        <h1>${esc(p.title)}</h1>
        <p class="post-dates">Published <time datetime="${p.date}">${fmt(p.date)}</time> · Last updated <time datetime="${p.updated}">${fmt(p.updated)}</time></p>
${p.updateDue ? `        <div class="update-box"><p><strong>Update due.</strong> ${esc(p.updateDue)}</p></div>\n` : ""}${p.body.trim().split("\n").map((l) => "        " + l).join("\n")}
        <h2>Sources</h2>
        <ul class="sources">
${p.sources.map((s) => `          <li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a></li>`).join("\n")}
        </ul>
        <section class="more-news" aria-labelledby="more-news-h">
          <h2 id="more-news-h">More from News</h2>
          <ul>
${more.map((q) => `            <li><span class="tag">${esc(q.category)}</span> <a href="/news/${q.slug}">${esc(q.title)}</a></li>`).join("\n")}
            <li><a href="/news">All news →</a></li>
          </ul>
        </section>
      </article>
    </div>
  </main>
${footer}`;
  w(`news/${p.slug}.html`, html);
}

// ---- guides hub: "Latest news" line ------------------------------------------
const latest = posts[0];
const guides = r("guides/index.html").replace(/<!-- news:latest -->[\s\S]*?<!-- \/news:latest -->/,
  `<!-- news:latest -->\n      <p class="latest-news"><strong>Latest news:</strong> <a href="/news/${latest.slug}">${esc(latest.title)}</a> (${fmt(latest.date)}) · <a href="/news">All news</a></p>\n      <!-- /news:latest -->`);
w("guides/index.html", guides);

// ---- sitemap.xml: replace /news entries ---------------------------------------
let sm = r("sitemap.xml").replace(/\s*<url>\s*<loc>https:\/\/projectcostlab\.co\.uk\/news[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
const newest = posts.map((p) => p.updated).sort().pop();
const entries = [{ loc: listUrl, lastmod: newest }, ...posts.map((p) => ({ loc: `${SITE}/news/${p.slug}`, lastmod: p.updated }))]
  .map((e) => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`).join("\n");
sm = sm.replace(/(<loc>https:\/\/projectcostlab\.co\.uk\/guides\/<\/loc>\s*<lastmod>)([\d-]+)(<\/lastmod>)/, (m, a, d, b) => a + (d > newest ? d : newest) + b);
sm = sm.replace(/\s*<\/urlset>\s*$/, `\n${entries}\n</urlset>\n`);
w("sitemap.xml", sm);

console.log(`News build OK: /news + ${posts.length} posts (${posts.map((p) => p.slug).join(", ")}); sitemap and guides hub updated.`);
