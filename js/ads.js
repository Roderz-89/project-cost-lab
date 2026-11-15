/*
 * Project Cost Lab — ad units and consent link. Loaded only when config/ads.json has enabled=true.
 * Fills each reserved <ins class="adsbygoogle"> once, and lets the footer link re-open
 * Google's consent message (Google-certified CMP set up in AdSense > Privacy & messaging).
 */
(function () {
  "use strict";
  var q = (window.adsbygoogle = window.adsbygoogle || []);
  Array.prototype.forEach.call(document.querySelectorAll("ins.adsbygoogle"), function () { q.push({}); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-ads-consent]");
    if (!a) return;
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    e.preventDefault();
    window.googlefc.callbackQueue.push(function () { window.googlefc.showRevocationMessage(); });
  });
})();
