/**
 * Project Cost Lab.
 * Any non-canonical host/path (www, .html, /index.html, stray trailing slash)
 * gets a single 301 straight to the canonical apex URL. Ads stay off.
 * Cache: public, max-age=0, must-revalidate.
 * Security headers on every response; real 404s get a helpful page with status 404.
 */
const APEX = "projectcostlab.co.uk";
const DIRS = new Set(["/", "/guides/"]);

function canonicalPath(p) {
  let c = p;
  if (c.endsWith("/index.html")) c = c.slice(0, -"index.html".length);
  else if (c.endsWith(".html")) c = c.slice(0, -5);
  if (c === "/guides") c = "/guides/";
  if (c.length > 1 && c.endsWith("/") && !DIRS.has(c)) c = c.slice(0, -1);
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
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <main class="wrap" style="padding:48px 16px;">
    <h1>Page not found</h1>
    <p>That page doesn't exist on Project Cost Lab. Try one of these:</p>
    <ul>
      <li><a href="/">Home project cost calculator</a></li>
      <li><a href="/projects">All project types</a></li>
      <li><a href="/guides/">Cost guides</a></li>
      <li><a href="/contact">Contact Rodway Labs</a></li>
    </ul>
  </main>
</body>
</html>`;

function withHeaders(response, extra) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
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
    if (path === "/favicon.ico") {
      const icon = await env.ASSETS.fetch(new Request(new URL("/favicon.svg", url), request));
      return new Response(icon.body, { status: icon.status, headers: withHeaders(icon, { "Content-Type": "image/svg+xml" }) });
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
