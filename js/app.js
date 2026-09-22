/**
 * Project Cost Lab — calculator engine.
 */
(function () {
  const D = window.PCL || {};
  const CATS = D.CATS;
  const REGIONS = D.REGIONS;
  const SPEC = D.SPEC;
  const ACCESS = D.ACCESS;
  const OCCUPIED = D.OCCUPIED;
  const VAT_RATES = D.VAT_RATES;
  const ADDONS = D.ADDONS;
  const PROJECTS = D.PROJECTS;
  const LISTED_FACTOR = D.LISTED_FACTOR;

  function money(n) {
    return Math.round(n).toLocaleString("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0
    });
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function band(mid, spread) {
    return { low: mid * (1 - spread), mid: mid, high: mid * (1 + spread) };
  }

  function baseWorks(p, qty) {
    if (p.mode === "area" || p.mode === "run" || p.mode === "unit") {
      return p.midPer * qty;
    }
    let mid = p.mid;
    if (p.scalePer && qty && p.defaultQty) {
      mid += (qty - p.defaultQty) * p.scalePer;
    }
    return Math.max(mid, p.mid * 0.5);
  }

  function listProjects(cat) {
    return Object.keys(PROJECTS || {})
      .map(function (id) {
        return Object.assign({ id: id }, PROJECTS[id]);
      })
      .filter(function (p) {
        return !cat || cat === "all" || p.cat === cat;
      });
  }

  function calc(input) {
    const p = (PROJECTS && PROJECTS[input.project]) || (PROJECTS && PROJECTS.loft_dormer) || { label: "Project", mid: 0, spread: 0.3, note: "", includes: "", excludes: "", weeks: "" };
    const region = (REGIONS && REGIONS[input.region]) || { label: "UK mid-range", factor: 1 };
    const spec = (SPEC && SPEC[input.spec]) || { label: "Mid spec", factor: 1 };
    const access = (ACCESS && ACCESS[input.access]) || { label: "Typical suburban plot", factor: 1.06 };
    const occ = (OCCUPIED && OCCUPIED[input.occupied]) || { label: "Living in during works", factor: 1.08 };
    const vat = (VAT_RATES && VAT_RATES[input.vat]) || { label: "20% VAT included", rate: 0.2 };
    const listed = LISTED_FACTOR && LISTED_FACTOR[input.listed] === 1.15 ? 1.15 : 1;
    const contig = clamp(Number(input.contig) || 0, 0, 30) / 100;
    const qty = Number(input.qty);
    const safeQty = isFinite(qty) && qty > 0 ? qty : (p.defaultQty || 1);
    const rawMid = baseWorks(p, safeQty);
    const local = rawMid * spec.factor * access.factor * occ.factor * listed;
    const works = band(local, p.spread || 0.3);
    const addonLines = [];
    let addonMid = 0, addonLow = 0, addonHigh = 0;
    (input.addons || []).forEach(function (id) {
      const a = ADDONS && ADDONS[id];
      if (!a) return;
      if (a.pct) {
        const m = works.mid * a.pct;
        addonLines.push({ id: id, label: a.label, low: works.low * a.pct, mid: m, high: works.high * a.pct, pct: a.pct });
        addonMid += m; addonLow += works.low * a.pct; addonHigh += works.high * a.pct;
      } else {
        const scaled = a.mid * spec.factor * region.factor;
        const b = band(scaled, a.spread || 0.3);
        addonLines.push({ id: id, label: a.label, low: b.low, mid: b.mid, high: b.high });
        addonMid += b.mid; addonLow += b.low; addonHigh += b.high;
      }
    });
    const exVat = { low: (works.low * region.factor) + addonLow, mid: (works.mid * region.factor) + addonMid, high: (works.high * region.factor) + addonHigh };
    const withVat = { low: exVat.low * (1 + vat.rate), mid: exVat.mid * (1 + vat.rate), high: exVat.high * (1 + vat.rate) };
    const total = { low: withVat.low * (1 + contig), mid: withVat.mid * (1 + contig), high: withVat.high * (1 + contig) };
    return {
      projectId: input.project, label: p.label, note: p.note, includes: p.includes, excludes: p.excludes,
      weeks: p.weeks, qty: safeQty, unit: p.unit || p.qtyLabel || "", mode: p.mode,
      region: region.label, regionFactor: region.factor, spec: spec.label, specFactor: spec.factor,
      access: access.label, occupied: occ.label, listed: listed > 1, vat: vat, contig: contig * 100,
      addons: addonLines,
      works: { low: works.low * region.factor, mid: works.mid * region.factor, high: works.high * region.factor },
      exVat: exVat,
      vatAmount: { low: withVat.low - exVat.low, mid: withVat.mid - exVat.mid, high: withVat.high - exVat.high },
      contigAmount: { low: total.low - withVat.low, mid: total.mid - withVat.mid, high: total.high - withVat.high },
      total: total, rawMid: rawMid
    };
  }

  function el(id) { return document.getElementById(id); }
  function selectedAddons() {
    return Array.prototype.slice.call(document.querySelectorAll("#pc-addons input[type=checkbox]:checked")).map(function (n) { return n.value; });
  }
  function fillProjects(cat, keepId) {
    const sel = el("pc-project");
    if (!sel || !PROJECTS) return;
    const list = listProjects(cat);
    const prefer = keepId || sel.value;
    sel.innerHTML = list.map(function (p) { return '<option value="' + p.id + '">' + p.label + "</option>"; }).join("");
    if (prefer && PROJECTS[prefer] && (!cat || cat === "all" || PROJECTS[prefer].cat === cat)) sel.value = prefer;
    else if (PROJECTS.loft_dormer && (!cat || cat === "all" || PROJECTS.loft_dormer.cat === cat)) sel.value = "loft_dormer";
  }
  function renderAddons(projectId) {
    const box = el("pc-addons");
    if (!box || !PROJECTS) return;
    const p = PROJECTS[projectId] || PROJECTS.loft_dormer;
    const ids = p.addons || [];
    if (!ids.length) { box.innerHTML = "<p class='hint'>No optional extras on this job — size, spec and region still move the band.</p>"; return; }
    box.innerHTML = ids.map(function (id) {
      const a = ADDONS[id];
      if (!a) return "";
      const hint = a.pct ? Math.round(a.pct * 100) + "% of works" : money(a.mid) + " mid allowance";
      return '<label class="check"><input type="checkbox" value="' + id + '"><span><strong>' + a.label + "</strong><em>" + hint + "</em></span></label>";
    }).join("");
  }
  function renderQty(projectId) {
    const wrap = el("pc-qty-wrap");
    const input = el("pc-qty");
    const label = el("pc-qty-label");
    const hint = el("pc-qty-hint");
    if (!wrap || !input || !PROJECTS) return;
    const p = PROJECTS[projectId] || PROJECTS.loft_dormer;
    const show = p.mode !== "lump" || p.qtyLabel;
    wrap.hidden = !show;
    if (!show) return;
    const unit = p.unit || p.qtyLabel || "quantity";
    label.textContent = "Size — " + unit;
    input.min = p.min || 1; input.max = p.max || 100; input.step = p.step || 1; input.value = p.defaultQty || 1;
    hint.textContent = "Default " + (p.defaultQty || 1) + " " + unit + ". Band scales with this figure.";
  }
  function paint(r) {
    if (!el("pc-mid")) return;
    el("pc-label").textContent = r.label;
    el("pc-mid").textContent = money(r.total.mid);
    el("pc-low").textContent = money(r.total.low);
    el("pc-high").textContent = money(r.total.high);
    el("pc-note").textContent = r.note;
    el("pc-meta").textContent = r.spec + " · " + r.region + " · " + r.vat.label + " · contingency " + r.contig + "%";
    el("pc-weeks").textContent = r.weeks || "—";
    el("pc-includes").textContent = r.includes;
    el("pc-excludes").textContent = r.excludes;
    el("pc-qty-used").textContent = r.unit ? r.qty + " " + r.unit : "whole job";
    el("pc-row-works").textContent = money(r.works.mid);
    el("pc-row-addons").textContent = r.addons.length ? money(r.addons.reduce(function (s, a) { return s + a.mid; }, 0)) : "£0";
    el("pc-row-exvat").textContent = money(r.exVat.mid);
    el("pc-row-vat").textContent = money(r.vatAmount.mid);
    el("pc-row-contig").textContent = money(r.contigAmount.mid);
    el("pc-row-total").textContent = money(r.total.mid);
    const extra = el("pc-addon-rows");
    if (extra) extra.innerHTML = r.addons.map(function (a) { return "<tr><th>" + a.label + "</th><td>" + money(a.mid) + "</td></tr>"; }).join("");
    const bar = el("pc-range-bar");
    if (bar) {
      const span = r.total.high - r.total.low;
      bar.style.setProperty("--mid", (span > 0 ? ((r.total.mid - r.total.low) / span) * 100 : 50) + "%");
    }
    const example = el("pc-example");
    if (example) {
      example.innerHTML = "<p><span class='badge'>THIS RUN</span> " + r.label.toUpperCase() + " · " + r.spec.toUpperCase() + " · " + r.region.toUpperCase() + "</p><p>Works mid before extras " + money(r.works.mid) + ". After extras, " + r.vat.label.toLowerCase() + " and " + r.contig + "% contingency the illustrated mid is <strong>" + money(r.total.mid) + "</strong>, with a band from " + money(r.total.low) + " to " + money(r.total.high) + ". Planning number only — not a builder’s price.</p>";
    }
  }
  function read() {
    return {
      project: el("pc-project").value, region: el("pc-region").value, spec: el("pc-spec").value,
      access: el("pc-access").value, occupied: el("pc-occupied").value, listed: el("pc-listed").value,
      vat: el("pc-vat").value, contig: el("pc-contig").value, qty: el("pc-qty").value, addons: selectedAddons()
    };
  }
  function run() {
    if (!el("pc-form")) return;
    el("pc-contig-label").textContent = el("pc-contig").value + "%";
    paint(calc(read()));
  }
  function onProjectChange() {
    const id = el("pc-project").value;
    renderQty(id); renderAddons(id); run();
  }
  function setCat(cat) {
    document.querySelectorAll(".cat-chip").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-cat") === cat ? "true" : "false");
    });
    fillProjects(cat, el("pc-project") && el("pc-project").value);
    onProjectChange();
  }
  function boot() {
    const form = el("pc-form");
    if (!form) return;
    const chips = el("pc-cats");
    if (chips && CATS) {
      chips.innerHTML = CATS.map(function (c, i) {
        return '<button type="button" class="cat-chip" data-cat="' + c.id + '" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + c.label + "</button>";
      }).join("");
      chips.addEventListener("click", function (e) {
        const b = e.target.closest("[data-cat]");
        if (b) setCat(b.getAttribute("data-cat"));
      });
    }
    fillProjects("all");
    const params = new URLSearchParams(location.hash.split("?")[1] || location.search);
    const preset = params.get("p");
    if (preset && PROJECTS && PROJECTS[preset]) el("pc-project").value = preset;
    onProjectChange();
    form.addEventListener("input", run);
    form.addEventListener("change", function (e) {
      if (e.target && e.target.id === "pc-project") onProjectChange();
      else run();
    });
    const copy = el("pc-copy");
    if (copy) {
      copy.addEventListener("click", function () {
        const r = calc(read());
        const text = r.label + ": " + money(r.total.low) + " – " + money(r.total.high) + " (mid " + money(r.total.mid) + "). " + r.spec + ", " + r.region + ", " + r.vat.label + ", contingency " + r.contig + "%. Illustrative only — Project Cost Lab.";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copy.textContent = "Copied";
            setTimeout(function () { copy.textContent = "Copy this range"; }, 1600);
          });
        }
      });
    }
    const reset = el("pc-reset");
    if (reset) reset.addEventListener("click", function () { form.reset(); setCat("all"); });
  }
  window.ProjectCostLab = { calc: calc, money: money, PROJECTS: PROJECTS, ADDONS: ADDONS, REGIONS: REGIONS, CATS: CATS, listProjects: listProjects };
  document.addEventListener("DOMContentLoaded", boot);
})();
