/**
 * Project Cost Lab — assets Worker with apex canonical host.
 * www → apex 301; otherwise serve static assets.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.projectcostlab.co.uk") {
      url.hostname = "projectcostlab.co.uk";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
