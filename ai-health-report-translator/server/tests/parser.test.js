const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReportText, findRange, parseLine } = require('../src/services/labParser');
const { classify, score } = require('../src/services/classifier');
const { isSafe } = require('../src/services/aiService');
const { redact } = require('../src/services/anonymizer');

test('synopsis example: WBC 11,200 with range 4,000-11,000 is High', () => {
  const row = parseLine('Total WBC Count   11,200  cells/cumm   4,000 - 11,000');
  assert.equal(row.key, 'wbc');
  assert.equal(row.value, 11200);
  assert.equal(row.refLow, 4000);
  assert.equal(row.refHigh, 11000);
  assert.equal(classify(row).status, 'High');
});

test('parses one-sided ranges', () => {
  assert.deepEqual(pick(findRange('mg/dL < 200')), { low: null, high: 200 });
  assert.deepEqual(pick(findRange('Up to 130')), { low: null, high: 130 });
  assert.deepEqual(pick(findRange('> 40')), { low: 40, high: null });
});

test('longest alias wins and units survive flag removal', () => {
  const ldl = parseLine('LDL Cholesterol  150 H  mg/dL  Up to 130');
  assert.equal(ldl.key, 'ldl');
  assert.equal(ldl.unit, 'mg/dL');
  const alt = parseLine('SGPT (ALT)  42  U/L  7 - 56');
  assert.equal(alt.key, 'alt');
  assert.equal(alt.unit, 'U/L');
  assert.equal(parseLine('HbA1c 5.9 % 4.0 - 5.6').key, 'hba1c');
});

test('qualitative results are not graded', () => {
  const row = parseLine('Urine Sugar Negative');
  assert.equal(row, null); // unknown + no range is ignored by the parser
  assert.equal(classify({ value: null, valueText: 'Negative' }).status, 'Not graded');
});

test('parses a full report and its date', () => {
  const text = `Patient Name: X\nReport Date: 12/03/2026\nHemoglobin 11.2 g/dL 12.0 - 15.0\nTSH 5.8 µIU/mL 0.4 - 4.0\nSerum Magnesium 2.1 mg/dL 1.7 - 2.2`;
  const { results, reportDate } = parseReportText(text);
  assert.equal(results.length, 3);
  assert.equal(results[2].organ, 'other');
  assert.equal(reportDate.toISOString().slice(0, 10), '2026-03-12');
});

test('critical values are flagged', () => {
  assert.equal(classify({ key: 'potassium', value: 6.8, unit: 'mmol/L', refLow: 3.5, refHigh: 5.1 }).critical, true);
  assert.equal(classify({ key: 'potassium', value: 5.3, unit: 'mmol/L', refLow: 3.5, refHigh: 5.1 }).critical, false);
});

test('health score is 100 when all normal and drops with abnormal values', () => {
  assert.equal(score([{ status: 'Normal' }, { status: 'Normal' }]), 100);
  assert.ok(score([{ status: 'Normal' }, { status: 'High', deviation: 20 }]) < 100);
  assert.equal(score([{ status: 'No range' }]), null);
});

test('safety guard rejects diagnostic or prescriptive text', () => {
  assert.equal(isSafe('You have diabetes.'), false);
  assert.equal(isSafe('Take 1000 IU of vitamin D daily.'), false);
  assert.equal(isSafe('Start medication for this.'), false);
  assert.equal(isSafe('Your value is slightly above the range. A doctor can help interpret it.'), true);
});

test('redaction removes identifiers but keeps ranges', () => {
  const out = redact('Patient Name: Asha Verma\nMobile: 98765 43210\nPlatelet 250000 /cumm 150000-450000');
  assert.ok(!out.includes('Asha'));
  assert.ok(!out.includes('43210'));
  assert.ok(out.includes('150000-450000'));
});

function pick(r) {
  return { low: r.low, high: r.high };
}
