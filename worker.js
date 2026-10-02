/**
 * Project Cost Lab — parked host.
 * www → apex 301. Every response is noindex until the park is lifted.
 * Do not load AdSense on this site.
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
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
