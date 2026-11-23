/**
 * Deterministic Normal / High / Low classification (synopsis, step 6).
 * Deliberately done in code, never by the AI model, so it is consistent
 * and verifiable.
 */

// Very conservative "please contact a doctor promptly" thresholds.
// Only applied when the unit matches the catalog's default unit.
const CRITICAL = {
  potassium: { unit: 'mmol/L', low: 2.5, high: 6.5 },
  sodium: { unit: 'mmol/L', low: 120, high: 160 },
  glucose_fasting: { unit: 'mg/dL', low: 50, high: 400 },
  glucose_random: { unit: 'mg/dL', low: 50, high: 400 },
  glucose_pp: { unit: 'mg/dL', low: 50, high: 400 },
  hemoglobin: { unit: 'g/dL', low: 7, high: 20 },
  calcium: { unit: 'mg/dL', low: 6.5, high: 13 },
  creatinine: { unit: 'mg/dL', low: null, high: 5 },
};

function sameUnit(a = '', b = '') {
  const n = (u) => u.toLowerCase().replace(/\s/g, '').replace('μ', 'µ');
  return n(a) === n(b);
}

function classify(row) {
  const out = { status: 'Normal', deviation: 0, critical: false };

  if (row.value === null || row.value === undefined || Number.isNaN(row.value)) {
    out.status = 'Not graded'; // qualitative results are shown as reported
    return out;
  }
  const { value, refLow, refHigh } = row;
  if (refLow == null && refHigh == null) {
    out.status = 'No range';
  } else if (refLow != null && value < refLow) {
    out.status = 'Low';
    out.deviation = refLow === 0 ? 100 : round(((refLow - value) / refLow) * 100);
  } else if (refHigh != null && value > refHigh) {
    out.status = 'High';
    out.deviation = refHigh === 0 ? 100 : round(((value - refHigh) / refHigh) * 100);
  }

  const c = CRITICAL[row.key];
  if (c && sameUnit(c.unit, row.unit || c.unit)) {
    if ((c.low != null && value <= c.low) || (c.high != null && value >= c.high)) out.critical = true;
  }
  return out;
}

/**
 * Position of the value on a 0..100 scale where the reference range spans 25..75.
 * Used by the frontend gauges.
 */
function gaugePosition(row) {
  const { value, refLow, refHigh } = row;
  if (value == null) return null;
  if (refLow != null && refHigh != null && refHigh > refLow) {
    const pos = 25 + ((value - refLow) / (refHigh - refLow)) * 50;
    return clamp(round(pos), 0, 100);
  }
  if (refHigh != null) return clamp(round((value / refHigh) * 75), 0, 100);
  if (refLow != null) return clamp(round((value / refLow) * 25), 0, 100);
  return null;
}

const STATUS_WEIGHT = { Normal: 0, 'No range': 0, 'Not graded': 0, Low: 1, High: 1 };

/** Health score 0..100 for a set of classified rows (simple, explainable formula). */
function score(rows) {
  const graded = rows.filter((r) => r.status === 'Normal' || r.status === 'High' || r.status === 'Low');
  if (!graded.length) return null;
  const penalty = graded.reduce((acc, r) => {
    if (r.status === 'Normal') return acc;
    const dev = Math.min(r.deviation || 0, 100);
    return acc + 0.5 + dev / 200; // 0.5 .. 1.0 per abnormal value
  }, 0);
  return clamp(Math.round(100 - (penalty / graded.length) * 100), 0, 100);
}

function round(n) {
  return Math.round(n * 10) / 10;
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

module.exports = { classify, gaugePosition, score, STATUS_WEIGHT };
