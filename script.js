// ============================================================
// Fleet Cost Calculator — JavaScript
// ============================================================

// ── Constants ────────────────────────────────────────────

const CONFIG = {
  GPH:        8.5,    // Fuel burn rate (gallons per hour, typical single-engine)
  LABOR:      95,     // Labor rate ($/hr)
  OIL_PER_HR: 5,      // Oil & consumables flat rate ($/hr)
  OH_COST:    25000,  // Engine overhaul cost ($)

  // Aircraft acquisition — per-unit purchase price (one-time).
  // Update to match the model being analyzed:
  //   Cirrus SR20 G7   ≈ $735,000
  //   Cirrus SR22 G7   ≈ $1,050,000
  //   Cirrus SR22T G7  ≈ $1,150,000
  AIRCRAFT_PRICE: 500000,

  // 100LL Avgas
  TBO_100LL:  2000,   // Time between overhaul (hrs)
  INT_100LL:  50,     // Engine inspection interval (hrs)

  // Unleaded (UL94)
  TBO_UL:     2200,
  INT_UL:     100,

  // Labor hours per inspection type
  ENG_LABOR:  2,      // Per engine check
  AIR_LABOR:  8,      // Per 100-hr airframe check
  ANN_LABOR:  16,     // Per annual inspection
};

// ── State ────────────────────────────────────────────────

let fuelType = '100LL';

// ── DOM References ───────────────────────────────────────

const els = {
  slFleet:        document.getElementById('slFleet'),
  slHours:        document.getElementById('slHours'),
  slFuel:         document.getElementById('slFuel'),
  slLabor:        document.getElementById('slLabor'),
  valFleet:       document.getElementById('valFleet'),
  valHours:       document.getElementById('valHours'),
  valFuel:        document.getElementById('valFuel'),
  valLabor:       document.getElementById('valLabor'),
  btn100LL:       document.getElementById('btn100LL'),
  btnUL:          document.getElementById('btnUL'),
  bigPerHour:     document.getElementById('bigPerHour'),
  fuelLineLabel:  document.getElementById('fuelLineLabel'),
  rFuel:          document.getElementById('rFuel'),
  rMx:            document.getElementById('rMx'),
  rOil:           document.getElementById('rOil'),
  rOH:            document.getElementById('rOH'),
  infoFuelText:   document.getElementById('infoFuelText'),
  infoMxText:     document.getElementById('infoMxText'),
  infoOHText:     document.getElementById('infoOHText'),
  resultsFooter:  document.getElementById('resultsFooter'),
  sumAcquisition: document.getElementById('sumAcquisition'),
  sumFleet:       document.getElementById('sumFleet'),
  sumPerAc:       document.getElementById('sumPerAc'),
  sumPerHr:       document.getElementById('sumPerHr'),
};

// ── Formatters ───────────────────────────────────────────

/**
 * Format a dollar amount, abbreviating millions.
 * @param {number} n
 * @returns {string}
 */
function formatDollars(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * Format a per-hour dollar amount (no cents).
 * @param {number} n
 * @returns {string}
 */
function formatPerHour(n) {
  return '$' + Math.round(n);
}

// ── Info Panel Toggle ────────────────────────────────────

/**
 * Toggle an info panel open/closed.
 * Only one panel can be open at a time.
 * @param {string} panelId  - ID of the .info-panel element
 * @param {HTMLElement} btn - The .info-btn that was clicked
 */
function toggleInfo(panelId, btn) {
  const panel  = document.getElementById(panelId);
  const isOpen = panel.classList.contains('open');

  // Close all panels
  closeAllInfoPanels();

  // If it wasn't already open, open it
  if (!isOpen) {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('open');
  }
}

function closeAllInfoPanels() {
  document.querySelectorAll('.info-panel').forEach(p => {
    p.classList.remove('open');
    p.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('.info-btn').forEach(b => b.classList.remove('open'));
}

// ── Fuel Type ────────────────────────────────────────────

/**
 * Switch the active fuel type and recalculate.
 * @param {string} type - '100LL' or 'UL'
 */
function setFuelType(type) {
  fuelType = type;
  els.btn100LL.classList.toggle('active', type === '100LL');
  els.btnUL.classList.toggle('active', type === 'UL');
  calculate();
}

// ── Core Calculation ─────────────────────────────────────

function calculate() {
  const fleet   = parseInt(els.slFleet.value);
  const hrs     = parseInt(els.slHours.value);
  const fuelPPG = parseFloat(els.slFuel.value);
  const labor   = parseInt(els.slLabor.value);
  const isUL    = fuelType === 'UL';

  const tbo    = isUL ? CONFIG.TBO_UL   : CONFIG.TBO_100LL;
  const engInt = isUL ? CONFIG.INT_UL   : CONFIG.INT_100LL;

  // Update slider display values
  els.valFleet.textContent = fleet;
  els.valHours.textContent = hrs;
  els.valFuel.textContent  = fuelPPG.toFixed(2);
  els.valLabor.textContent = labor;

  // ── Per-hour cost breakdown ──
  const fuelHr = CONFIG.GPH * fuelPPG;

  // Scheduled maintenance prorated per flight hour
  const engHr  = (CONFIG.ENG_LABOR * labor) / engInt;   // engine check per hr
  const airHr  = (CONFIG.AIR_LABOR * labor) / 100;      // 100-hr airframe per hr
  const annHr  = (CONFIG.ANN_LABOR * labor) / hrs;      // annual inspection per hr
  const mxHr   = engHr + airHr + annHr;

  const ohHr   = CONFIG.OH_COST / tbo;                         // overhaul reserve per hr
  const totHr  = fuelHr + mxHr + CONFIG.OIL_PER_HR + ohHr;

  // ── Fleet totals ──
  const perAcYr          = totHr * hrs;                    // $/yr per aircraft (operating)
  const fleetYr          = perAcYr * fleet;                // $/yr for whole fleet (operating)
  const fleetAcquisition = CONFIG.AIRCRAFT_PRICE * fleet;  // $ one-time fleet purchase

  // ── Update right card ──
  els.bigPerHour.textContent  = formatPerHour(totHr);
  els.rFuel.textContent       = formatPerHour(fuelHr);
  els.rMx.textContent         = formatPerHour(mxHr);
  els.rOil.textContent        = '$' + CONFIG.OIL_PER_HR;
  els.rOH.textContent         = formatPerHour(ohHr);
  els.fuelLineLabel.textContent = `Fuel (${CONFIG.GPH} gph avg)`;

  // ── Update dynamic info text ──
  els.infoFuelText.textContent =
    `Calculated as fuel burn rate (${CONFIG.GPH} gph) × fuel price ` +
    `($${fuelPPG.toFixed(2)}/gal) = $${fuelHr.toFixed(2)}/hr. ` +
    `Fuel is typically the single largest operating cost. ` +
    `Avgas 100LL prices vary significantly by airport and region.`;

  els.infoMxText.textContent =
    `Covers FAR-required inspections prorated per flight hour: ` +
    `engine checks every ${engInt} hrs (${isUL ? 'unleaded' : '100LL'}) at ` +
    `${CONFIG.ENG_LABOR} labor hrs each; 100-hr airframe inspections at ` +
    `${CONFIG.AIR_LABOR} labor hrs each; and one annual inspection at ` +
    `${CONFIG.ANN_LABOR} labor hrs spread over ${hrs} hrs/yr. ` +
    `Labor at $${labor}/hr. Parts not included.`;

  els.infoOHText.textContent =
    `Piston engines must be overhauled at TBO — ` +
    `${tbo.toLocaleString()} hrs for ${isUL ? 'unleaded (UL94)' : '100LL avgas'}. ` +
    `This prorates a $${CONFIG.OH_COST.toLocaleString()} estimated overhaul ` +
    `cost across every flight hour ($${ohHr.toFixed(2)}/hr), ` +
    `so you're financially prepared when TBO arrives. ` +
    `Factory reman typically runs $18,000–$35,000 depending on engine model.`;

  els.resultsFooter.textContent =
    `Estimates based on FAR Part 91/141 intervals. ` +
    `Labor $${labor}/hr assumed. Fuel burn ${CONFIG.GPH} gph (typical single-engine). ` +
    `${isUL
      ? `Unleaded: ${engInt}-hr engine checks, TBO ${tbo.toLocaleString()} hrs.`
      : `100LL: ${engInt}-hr engine checks, TBO ${tbo.toLocaleString()} hrs.`
    } Parts not included in maintenance line.`;

  // ── Update left summary ──
  els.sumAcquisition.textContent = formatDollars(fleetAcquisition);
  els.sumFleet.textContent       = formatDollars(fleetYr);
  els.sumPerAc.textContent       = formatDollars(perAcYr);
  els.sumPerHr.textContent       = formatPerHour(totHr) + '/hr';
}

// ── Event Listeners ───────────────────────────────────────

// Sliders
['slFleet', 'slHours', 'slFuel', 'slLabor'].forEach(id => {
  document.getElementById(id).addEventListener('input', calculate);
});

// Fuel type buttons
document.querySelectorAll('.fuel-btn').forEach(btn => {
  btn.addEventListener('click', () => setFuelType(btn.dataset.fuel));
});

// Info buttons — delegated
document.addEventListener('click', e => {
  const infoBtn = e.target.closest('.info-btn');
  if (infoBtn) {
    e.stopPropagation();
    toggleInfo(infoBtn.dataset.target, infoBtn);
    return;
  }
  // Click outside any results-line closes all panels
  if (!e.target.closest('.results-line')) {
    closeAllInfoPanels();
  }
});

// ── Init ─────────────────────────────────────────────────

calculate();
