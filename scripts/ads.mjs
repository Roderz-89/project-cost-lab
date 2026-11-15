#!/usr/bin/env node
// Project Cost Lab — ad switch. Usage: node scripts/ads.mjs   (run by scripts/build.mjs)
// Reads config/ads.json and makes every page match it, both ways (safe to run repeatedly):
//   enabled=false : no ad code anywhere, ads.txt authorises no seller, policy pages show the
//                   "<!-- ads-off -->" wording, <html> has no ads-on class.
//   enabled=true  : AdSense account meta + loader in <head>, ad units in the reserved
//                   <div class="ad-slot" data-slot="…"> placeholders (only slots with an ID),
//                   ads.txt lists the publisher, policy pages show the "<!-- ads-on" wording,
//                   footer gets Google's "Privacy and cookie settings" link.
// The CSP side lives in build-static-config.mjs (it reads the same config).
// Placement rules: never between calculator inputs and result, never inside the cost breakdown.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ADS_TXT_OFF = "# This site does not show ads. This file authorises no seller.\n";

export function loadAds() {
  const c = JSON.parse(readFileSync(join(ROOT, "config/ads.json"), "utf8"));
  if (c.enabled && !/^ca-pub-\d{16}$/.test(c.client || "")) throw new Error("config/ads.json: enabled=true needs client like ca-pub-0000000000000000");
  return c;
}

const SKIP = new Set([".git", "node_modules", ".wrangler", "content", "scripts", "config"]);
const walk = (d) => readdirSync(join(ROOT, d)).flatMap((f) => {
  const p = d ? `${d}/${f}` : f;
  if (SKIP.has(f)) return [];
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});

// Toggle "<!-- ads-off -->…<!-- /ads-off -->" (visible when off) and "<!-- ads-on … ads-on -->" (visible when on).
export function policyBlocks(html, on) {
  // normalise to the OFF form first
  html = html.replace(/<!-- ads-on:open -->([\s\S]*?)<!-- \/ads-on:open -->/g, (m, body) => `<!-- ads-on${body}ads-on -->`);
  html = html.replace(/<!-- ads-off:hidden([\s\S]*?)ads-off:hidden -->/g, (m, body) => `<!-- ads-off -->${body}<!-- /ads-off -->`);
  if (!on) return html;
  html = html.replace(/<!-- ads-on([\s\S]*?)ads-on -->/g, (m, body) => `<!-- ads-on:open -->${body}<!-- /ads-on:open -->`);
  html = html.replace(/<!-- ads-off -->([\s\S]*?)<!-- \/ads-off -->/g, (m, body) => `<!-- ads-off:hidden${body}ads-off:hidden -->`);
  return html;
}

export function applyAds(html, c, file) {
  const on = !!c.enabled;
  // <head> loader
  html = html.replace(/\n?\s*<!-- ads-head -->[\s\S]*?<!-- \/ads-head -->/, "");
  if (on && !file.startsWith("404")) {
    const loader = `\n  <!-- ads-head --><meta name="google-adsense-account" content="${c.client}"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${c.client}" crossorigin="anonymous"></script><script src="/js/ads.js" defer></script><!-- /ads-head -->`;
    html = html.replace("</head>", loader + "\n</head>");
  }
  // <html class="ads-on">
  html = html.replace(/<html lang="en-GB"( class="ads-on")?>/, on ? '<html lang="en-GB" class="ads-on">' : '<html lang="en-GB">');
  // ad units in reserved slots
  html = html.replace(/<div class="ad-slot" data-slot="([a-z-]+)"[^>]*>[\s\S]*?<\/div><!-- \/ad-slot -->/g, (m, slot) => {
    const id = on && c.slots && c.slots[slot];
    const inner = id ? `<ins class="adsbygoogle" style="display:block" data-ad-client="${c.client}" data-ad-slot="${id}" data-ad-format="auto" data-full-width-responsive="true"></ins>` : "";
    return `<div class="ad-slot" data-slot="${slot}"${id ? "" : " hidden"}>${inner}</div><!-- /ad-slot -->`;
  });
  // footer: consent settings link (Google's CMP re-opens via js/ads.js)
  html = html.replace(/\n\s*<li><a href="\/cookies" data-ads-consent>Privacy and cookie settings<\/a><\/li>/, "");
  if (on) html = html.replace(/(\n(\s*)<li><a href="\/advertising">Advertising &amp; affiliates<\/a><\/li>)/, `$1\n$2<li><a href="/cookies" data-ads-consent>Privacy and cookie settings</a></li>`);
  return policyBlocks(html, on);
}

export function runAds() {
  const c = loadAds();
  const pages = walk("");
  let changed = 0;
  for (const f of pages) {
    const before = readFileSync(join(ROOT, f), "utf8");
    const after = applyAds(before, c, f);
    if (after !== before) { writeFileSync(join(ROOT, f), after); changed++; }
  }
  const adsTxt = c.enabled ? `# Authorised sellers for projectcostlab.co.uk\ngoogle.com, ${c.client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n` : ADS_TXT_OFF;
  writeFileSync(join(ROOT, "ads.txt"), adsTxt);
  console.log(`Ads ${c.enabled ? "ON (" + c.client + ")" : "OFF"}: ${changed} page(s) updated; ads.txt ${c.enabled ? "lists the publisher" : "authorises no seller"}.`);
  return c;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) runAds();
