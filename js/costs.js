/**
 * Project Cost Lab — illustrative UK home-project ranges compiled September 2026.
 */
(function () {
  const PROJECTS = {
    loft_velux: { label: "Loft conversion — Velux / rooflight", low: 22000, mid: 34000, high: 50000, note: "Typical converted loft with rooflights, insulation and a basic staircase. Dormers cost more." },
    loft_dormer: { label: "Loft conversion — rear dormer", low: 35000, mid: 50000, high: 75000, note: "Rear dormer with a new room and shower room at mid spec. Planning and Party Wall sit outside the range." },
    ext_single: { label: "Single-storey rear extension (~20m²)", low: 36000, mid: 55000, high: 90000, note: "Structure, roof, openings and a basic fit-out. Kitchen units, if new, are a separate line." },
    kitchen: { label: "Kitchen refit (no extension)", low: 8000, mid: 16000, high: 40000, note: "Units, worktops, appliances and fitting in an existing footprint." },
    bathroom: { label: "Bathroom renovation", low: 5000, mid: 11000, high: 25000, note: "Suite, tiling and labour in an existing room. Wet rooms sit toward the high end." },
    boiler_combi: { label: "Combi boiler like-for-like swap", low: 1800, mid: 2800, high: 4500, note: "Supply, flue, controls and Gas Safe labour in the same position. Relocations cost more." }
  };
  const REGIONS = {
    uk: { label: "UK mid-range (no regional uplift)", factor: 1 },
    london: { label: "London", factor: 1.25 },
    se: { label: "South East (ex-London)", factor: 1.12 },
    north: { label: "North / Wales / Scotland illustration", factor: 0.9 }
  };
  function money(n) {
    return Math.round(n).toLocaleString("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  }
  function calc(input) {
    const p = PROJECTS[input.project] || PROJECTS.loft_dormer;
    const r = REGIONS[input.region] || REGIONS.uk;
    const vatOn = input.vat !== "off";
    const contig = Math.max(0, Math.min(30, Number(input.contig) || 0)) / 100;
    const vat = vatOn ? 1.2 : 1;
    const scale = r.factor * vat * (1 + contig);
    return { label: p.label, note: p.note, region: r.label, vatOn, contig: contig * 100, low: p.low * scale, mid: p.mid * scale, high: p.high * scale, rawMid: p.mid };
  }
  function run() {
    if (!document.getElementById("pc-form")) return;
    const r = calc({
      project: document.getElementById("pc-project").value,
      region: document.getElementById("pc-region").value,
      vat: document.getElementById("pc-vat").value,
      contig: document.getElementById("pc-contig").value
    });
    document.getElementById("pc-label").textContent = r.label;
    document.getElementById("pc-mid").textContent = money(r.mid);
    document.getElementById("pc-low").textContent = money(r.low);
    document.getElementById("pc-high").textContent = money(r.high);
    document.getElementById("pc-note").textContent = r.note;
    document.getElementById("pc-meta").textContent = r.region + " · VAT " + (r.vatOn ? "20% included" : "excluded") + " · contingency " + r.contig + "%";
    document.getElementById("pc-contig-label").textContent = r.contig + "%";
  }
  window.ProjectCostLab = { calc, money, PROJECTS };
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("pc-form");
    if (!form) return;
    form.addEventListener("input", run);
    form.addEventListener("change", run);
    run();
  });
})();
