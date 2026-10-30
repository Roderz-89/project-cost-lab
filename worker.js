/**
 * Project Cost Lab.
 * Any non-canonical host/path (www, .html, /index.html, stray trailing slash)
 * gets a single 301 straight to the canonical apex URL. /news/page/1 -> /news.
 * /news/page/N (N>1) is served from news/page/N.html when it exists, else 404. Ads stay off.
 * Cache: public, max-age=0, must-revalidate.
 * Security headers on every response; real 404s get a helpful page with status 404.
 * CSP: per-response nonce (Cloudflare adds it to its injected challenge-platform
 * script), hashes for the menu button onclick and the inline /projects table script.
 */
const APEX = "projectcostlab.co.uk";
const DIRS = new Set(["/", "/guides/"]);

function canonicalPath(p) {
  let c = p;
  if (c.endsWith("/index.html")) c = c.slice(0, -"index.html".length);
  else if (c.endsWith(".html")) c = c.slice(0, -5);
  if (c === "/guides") c = "/guides/";
  if (c.length > 1 && c.endsWith("/") && !DIRS.has(c)) c = c.slice(0, -1);
  if (c === "/news/page/1") c = "/news"; // page 1 of the news list is /news itself
  return c;
}

const SECURITY = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "SAMEORIGIN",
};

const NOT_FOUND = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found | Project Cost Lab</title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
  <meta name="theme-color" content="#062E62">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#062E62">
</head>
<body>
  <header class="site-header">
    <div class="wrap header-row">
      <a class="brand" href="/" aria-label="Project Cost Lab home"><svg class="mark" viewBox="133 238 290 290" width="36" height="36" aria-hidden="true" focusable="false"><path fill="#062E62" fill-rule="evenodd" d="M166 472V334L265 246.4 364 334V472ZM186 452H344V343L265 273 186 343Z"/><path fill="#062E62" d="M238 361h22.5v22.5H238ZM269.5 361H292v22.5h-22.5ZM238 393h22.5v22.5H238ZM269.5 393H292v22.5h-22.5Z"/><path fill="none" stroke="#0096A1" stroke-width="9" d="M403.5 251v226M390 249.5h27M390 478.5h27M149 511.5h225M147.5 497v29M375.5 497v29"/></svg><span class="wordmark">Project Cost <span class="wm-lab">Lab</span></span></a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" onclick="var n=document.getElementById('nav');n.classList.toggle('open');this.setAttribute('aria-expanded',n.classList.contains('open')?'true':'false')">Menu</button>
      <nav id="nav">
        <a href="/">Home</a>
        <a href="/#calculator">Calculator</a>
        <a href="/projects">Projects</a>
        <a href="/guides/">Guides</a>
        <a href="/news">News</a>
        <a href="/about">About</a>
      </nav>
    </div>
  </header>
  <main class="section notfound">
    <div class="wrap prose">
      <p class="badge">404</p>
      <h1>Page not found</h1>
      <p>That page doesn't exist on Project Cost Lab. Try one of these:</p>
      <ul>
        <li><a href="/">Home project cost calculator</a></li>
        <li><a href="/projects">All project types</a></li>
        <li><a href="/guides/">Cost guides</a></li>
        <li><a href="/contact">Contact Rodway Labs</a></li>
      </ul>
    </div>
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <a class="brand brand-foot" href="/" aria-label="Project Cost Lab home"><svg class="mark" viewBox="133 238 290 290" width="32" height="32" aria-hidden="true" focusable="false"><path fill="#062E62" fill-rule="evenodd" d="M166 472V334L265 246.4 364 334V472ZM186 452H344V343L265 273 186 343Z"/><path fill="#062E62" d="M238 361h22.5v22.5H238ZM269.5 361H292v22.5h-22.5ZM238 393h22.5v22.5H238ZM269.5 393H292v22.5h-22.5Z"/><path fill="none" stroke="#0096A1" stroke-width="9" d="M403.5 251v226M390 249.5h27M390 478.5h27M149 511.5h225M147.5 497v29M375.5 497v29"/></svg><span class="wordmark">Project Cost <span class="wm-lab">Lab</span></span></a>
          <p class="foot-note">Independent informational tools from Rodway Labs. Not a contractor, architect or quantity surveyor — and not a quote engine.</p>
          <p class="foot-note">The mid figure is a band for planning, not a tender. The VAT toggle is a display choice, not a ruling.</p>
          <p class="foot-sister"><a href="https://takehomelab.co.uk">Take-Home Lab</a> · <a href="https://remortgagelab.co.uk">Remortgage Lab</a> · <a href="https://loancalclab.net">LoanCalc Lab</a></p>
          <div class="published"><span>Published by</span><a href="/about"><img src="/brand/rodway-labs-logo.svg" alt="Rodway Labs" width="85" height="30" loading="lazy" decoding="async"></a></div>
        </div>
        <div>
          <p class="foot-h">Explore</p>
          <ul>
            <li><a href="/#calculator">Calculator</a></li>
            <li><a href="/projects">All projects</a></li>
            <li><a href="/guides/">Guides</a></li>
            <li><a href="/news">News</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>
        <div class="foot-legal">
          <p class="foot-h">Legal &amp; trust</p>
          <ul>
            <li><a href="/disclaimer">Disclaimer</a></li>
            <li><a href="/privacy">Privacy</a></li>
            <li><a href="/cookies">Cookies</a></li>
            <li><a href="/terms">Terms</a></li>
            <li><a href="/advertising">Advertising &amp; affiliates</a></li>
            <li><a href="/cookies" data-pcl-prefs>Privacy preferences</a></li>
          </ul>
        </div>
      </div>
      <p class="legal">© 2026 Project Cost Lab · Published by Rodway Labs, an independent UK publisher. Ranges last checked September 2026 · <a href="/about#methodology">Methodology</a> · <a href="mailto:hello@projectcostlab.co.uk">hello@projectcostlab.co.uk</a></p>
    </div>
  </footer>
</body>
</html>`;

// Hashes: menu-btn onclick (all pages) and the inline <script> on /projects.
const SCRIPT_HASHES = "'unsafe-hashes' 'sha256-L3+KJysJYnvfE/f2J0yMsomXQvFAPxCWh9oeE7W6NRQ=' 'sha256-jl8PaxWT/oaiyRGm1VxoVHwYEUMFWnx3bZ4MUctQKQI='";

function csp() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...bytes));
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${SCRIPT_HASHES}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function withHeaders(response, extra) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
  headers.set("Content-Security-Policy", csp());
  if (extra) for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = canonicalPath(url.pathname);
    if (url.hostname !== APEX || url.protocol !== "https:" || path !== url.pathname) {
      url.hostname = APEX;
      url.protocol = "https:";
      url.pathname = path;
      return new Response(null, { status: 301, headers: Object.assign({ Location: url.toString() }, SECURITY) });
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      return new Response(request.method === "HEAD" ? null : NOT_FOUND, {
        status: 404,
        headers: withHeaders(response, { "Content-Type": "text/html; charset=utf-8" }),
      });
    }
    const headers = withHeaders(response);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
