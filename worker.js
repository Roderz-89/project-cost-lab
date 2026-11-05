// Project Cost Lab — minimal CSP-nonce Worker. Runs only for HTML page paths (see run_worker_first
// in wrangler.jsonc); everything else is served straight from static assets without invoking it.
// It fetches the asset (env.ASSETS applies html_handling + 404-page), and for text/html responses
// replaces the CSP with the fixed policy + a fresh per-request 'nonce-…' in script-src, so
// Cloudflare's injected JS Detections inline script (which copies the nonce from the CSP header)
// can run with no 'unsafe-inline'. Status, redirects and all other headers pass through untouched.
import { CSP } from "./csp.mjs";

const nonce = () => {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b));
};

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    if (!(res.headers.get("content-type") || "").startsWith("text/html")) return res;
    const n = nonce();
    const out = new Response(res.body, res);
    out.headers.set("Content-Security-Policy", CSP.replace("script-src 'self'", `script-src 'self' 'nonce-${n}'`));
    const url = new URL(request.url);
    // Test-only: inject an inline script the way Cloudflare does (wrangler dev, PCL_TEST_INJECT=1).
    if (env.PCL_TEST_INJECT === "1" && url.searchParams.has("__inject")) {
      return new HTMLRewriter().on("body", { element(e) { e.append(`<script nonce="${n}">document.documentElement.dataset.cfInjected="ran"</script>`, { html: true }); } }).transform(out);
    }
    return out;
  },
};
