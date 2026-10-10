/*
 * Project Cost Lab privacy choices (Rodway Labs).
 * First-party only. Stores one value in localStorage: pcl-consent = "all" | "essential".
 * Never loads ads, analytics, or any third-party tag. This site does not show ads.
 */
(function () {
  "use strict";
  var KEY = "pcl-consent";
  var lastFocus = null;
  var modal, dialog, purposes, essentialRadio, allRadio;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }


  function build() {
    modal = document.createElement("div");
    modal.className = "pcl-cmp";
    modal.id = "pcl-consent";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="pcl-cmp-backdrop"></div>' +
      '<div class="pcl-cmp-dialog" role="dialog" aria-modal="true" aria-labelledby="pcl-cmp-title" aria-describedby="pcl-cmp-intro" tabindex="-1">' +
        '<h2 id="pcl-cmp-title">We value your privacy</h2>' +
        '<div id="pcl-cmp-intro">' +
          '<p>Rodway Labs asks you to consent to cookies and similar technologies on Project Cost Lab. We use your device only to remember the privacy choice you make here.</p>' +
          '<p>This site does not show ads.</p>' +
        '</div>' +
        '<div class="pcl-cmp-purposes" id="pcl-cmp-purposes" hidden>' +
          '<h3>Purposes</h3>' +
          '<details>' +
            '<summary>Store and/or access information on a device <span class="pcl-cmp-tag">Strictly necessary</span></summary>' +
            '<p>We store your privacy choice in this browser’s localStorage under <code>pcl-consent</code>, so we don’t ask again on every page. It is not used for tracking and is not sent to us or anyone else.</p>' +
          '</details>' +
          '<p class="pcl-cmp-note">No advertising or analytics purposes are active.</p>' +
          '<fieldset class="pcl-cmp-choice">' +
            '<legend>Your choice</legend>' +
            '<label><input type="radio" name="pcl-cmp-choice" value="essential" id="pcl-cmp-essential"> Essential only</label>' +
            '<label><input type="radio" name="pcl-cmp-choice" value="all" id="pcl-cmp-allradio"> Accept all</label>' +
          '</fieldset>' +
          '<div class="pcl-cmp-actions">' +
            '<button type="button" class="pcl-btn-primary" data-pcl="save">Save choices</button>' +
          '</div>' +
        '</div>' +
        '<p class="pcl-cmp-links"><a href="/privacy">Privacy</a> · <a href="/cookies">Cookies</a></p>' +
        '<div class="pcl-cmp-actions" id="pcl-cmp-main-actions">' +
          '<button type="button" class="pcl-btn-secondary" data-pcl="options" aria-expanded="false" aria-controls="pcl-cmp-purposes">Options</button>' +
          '<button type="button" class="pcl-btn-primary" data-pcl="all">Accept All</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    dialog = modal.querySelector(".pcl-cmp-dialog");
    purposes = modal.querySelector("#pcl-cmp-purposes");
    essentialRadio = modal.querySelector("#pcl-cmp-essential");
    allRadio = modal.querySelector("#pcl-cmp-allradio");

    modal.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-pcl]") : null;
      if (!btn) return;
      var action = btn.getAttribute("data-pcl");
      if (action === "all") choose("all");
      else if (action === "options") toggleOptions(btn);
      else if (action === "save") choose(allRadio.checked ? "all" : "essential");
    });
    modal.addEventListener("keydown", onKey);
  }

  function focusables() {
    var list = dialog.querySelectorAll('button, a[href], input, summary, [tabindex]:not([tabindex="-1"])');
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].offsetParent !== null || list[i] === document.activeElement) out.push(list[i]);
    }
    return out;
  }

  function onKey(e) {
    if (e.key === "Escape" || e.key === "Esc") {
      // Esc closes without recording a choice. No choice means essential only.
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function toggleOptions(btn) {
    var open = purposes.hidden;
    purposes.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      var saved = read();
      if (saved === "all") allRadio.checked = true; else essentialRadio.checked = true;
      essentialRadio.focus();
    }
  }

  function open(showOptions) {
    if (!modal) build();
    lastFocus = document.activeElement;
    var optBtn = modal.querySelector('[data-pcl="options"]');
    purposes.hidden = true;
    optBtn.setAttribute("aria-expanded", "false");
    modal.hidden = false;
    document.documentElement.classList.add("pcl-cmp-open");
    if (showOptions) toggleOptions(optBtn);
    else modal.querySelector('[data-pcl="all"]').focus();
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove("pcl-cmp-open");
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function choose(value) {
    write(value);
    // Neither choice loads any ad or analytics script. This site does not show ads.
    close();
  }

  function init() {
    var links = document.querySelectorAll("[data-pcl-prefs]");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function (e) {
        e.preventDefault();
        open(true);
      });
    }
    var saved = read();
    if (saved !== "all" && saved !== "essential") open(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
