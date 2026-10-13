/**
 * Project Cost Lab.
 * Any non-canonical host/path (www, .html, /index.html, stray trailing slash)
 * gets a single 301 straight to the canonical apex URL. Ads stay off.
 * Cache: public, max-age=0, must-revalidate.
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = canonicalPath(url.pathname);
    if (url.hostname !== APEX || url.protocol !== "https:" || path !== url.pathname) {
      url.hostname = APEX;
      url.protocol = "https:";
      url.pathname = path;
      return Response.redirect(url.toString(), 301);
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
