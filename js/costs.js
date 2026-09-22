/**
 * Project Cost Lab — compiled UK home-project ranges, September 2026.
 * Illustrative bands only. Not a quote, tender, valuation or Building Regulations decision.
 * VAT treatment is a user choice; this tool does not decide it.
 */
(function () {
  const CATS = [
    { id: "all", label: "All projects" },
    { id: "loft", label: "Lofts" },
    { id: "extend", label: "Extensions" },
    { id: "convert", label: "Conversions" },
    { id: "interior", label: "Kitchens & baths" },
    { id: "fabric", label: "Roof, windows, walls" },
    { id: "garden", label: "Garden & drive" },
    { id: "energy", label: "Heat & energy" },
    { id: "services", label: "Electrics & plumbing" },
    { id: "refresh", label: "Decor & finish" },
    { id: "whole", label: "Whole house" }
  ];

  const REGIONS = {
    uk: { label: "UK mid-range", factor: 1 },
    london_inner: { label: "Inner London", factor: 1.3 },
    london_outer: { label: "Outer London", factor: 1.22 },
    se: { label: "South East (ex-London)", factor: 1.12 },
    east: { label: "East of England", factor: 1.05 },
    sw: { label: "South West", factor: 1.05 },
    wmids: { label: "West Midlands", factor: 1 },
    emids: { label: "East Midlands", factor: 0.95 },
    nw: { label: "North West", factor: 0.93 },
    yorks: { label: "Yorkshire & Humber", factor: 0.9 },
    ne: { label: "North East", factor: 0.88 },
    wales: { label: "Wales", factor: 0.9 },
    scotland: { label: "Scotland", factor: 0.93 },
    ni: { label: "Northern Ireland", factor: 0.9 }
  };

  const SPEC = {
    budget: { label: "Budget spec", factor: 0.78 },
    mid: { label: "Mid spec", factor: 1 },
    high: { label: "High spec", factor: 1.38 }
  };

  const ACCESS = {
    easy: { label: "Easy access / parking / skip", factor: 1 },
    typical: { label: "Typical suburban plot", factor: 1.06 },
    tight: { label: "Tight terrace / no side access", factor: 1.16 }
  };

  const OCCUPIED = {
    empty: { label: "House empty during works", factor: 1 },
    live_in: { label: "Living in during works", factor: 1.08 }
  };

  const VAT_RATES = {
    std: { label: "20% VAT included", rate: 0.2 },
    reduced: { label: "5% VAT (some energy measures)", rate: 0.05 },
    zero: { label: "0% VAT (qualifying new dwelling etc.)", rate: 0 },
    ex: { label: "Show ex-VAT", rate: 0 }
  };

  const ADDONS = {
    ensuite: { label: "Shower room / ensuite in the new space", mid: 8500, spread: 0.35 },
    kitchen_fit: { label: "New kitchen fit-out in the space", mid: 16000, spread: 0.45 },
    bifolds: { label: "Wide sliding / bi-fold opening", mid: 4500, spread: 0.4 },
    steel: { label: "Extra structural steel / RSJs", mid: 2800, spread: 0.4 },
    planning: { label: "Householder planning + drawings allowance", mid: 2200, spread: 0.3 },
    partywall: { label: "Party Wall (one adjoining owner)", mid: 1400, spread: 0.35 },
    fees: { label: "Architect + structural engineer", pct: 0.1 },
    scaffold: { label: "Extra scaffolding period", mid: 1800, spread: 0.3 },
    skip: { label: "Extra skip / waste", mid: 600, spread: 0.25 },
    ufh: { label: "Underfloor heating in new floor", mid: 3200, spread: 0.35 },
    landscaping: { label: "Make-good garden after the build", mid: 2500, spread: 0.4 },
    staircase: { label: "Proper staircase (not a loft hatch stair)", mid: 3500, spread: 0.35 },
    velux_extra: { label: "Two extra rooflights", mid: 1800, spread: 0.3 },
    insulation_up: { label: "Above-regs insulation / airtightness", mid: 1500, spread: 0.3 },
    appliances: { label: "Appliance pack (oven, hob, hood, DW)", mid: 2200, spread: 0.4 },
    wetroom: { label: "Wet-room tanking upgrade", mid: 1200, spread: 0.3 },
    relocate_boiler: { label: "Relocate boiler / new flue route", mid: 900, spread: 0.35 },
    cylinder: { label: "New hot-water cylinder", mid: 1400, spread: 0.3 },
    plaster: { label: "Replaster the room after first fix", mid: 900, spread: 0.3 },
    decorate: { label: "Decorate the finished room", mid: 700, spread: 0.3 },
    lighting: { label: "New lighting circuit / spots", mid: 650, spread: 0.35 },
    extract: { label: "Mechanical extract / MVHR point", mid: 450, spread: 0.3 }
  };
