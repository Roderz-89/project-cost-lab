/**
 * Project Cost Lab — parked.
 * www → apex 301. Every response is noindex. Ads stay off.
 * Cache: public, max-age=0, must-revalidate.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.projectcostlab.co.uk") {
      url.hostname = "projectcostlab.co.uk";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set("X-Robots-Tag", "noindex, nofollow");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
