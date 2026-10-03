/* First-party cookie choice only. Never loads ads, analytics, or third-party tags. */
(function () {
  var KEY = "pcl-consent";
  var root = document.getElementById("pcl-consent");
  if (!root) return;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function choose(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
    root.hidden = true;
  }

  var saved = read();
  if (saved === "all" || saved === "essential") {
    root.hidden = true;
  } else {
    root.hidden = false;
  }

  var allBtn = document.getElementById("pcl-consent-all");
  var essBtn = document.getElementById("pcl-consent-essential");
  if (allBtn) allBtn.addEventListener("click", function () { choose("all"); });
  if (essBtn) essBtn.addEventListener("click", function () { choose("essential"); });
})();
