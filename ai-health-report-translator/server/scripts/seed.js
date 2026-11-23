/**
 * Creates a demo account with four synthetic reports spread over a year so the
 * dashboard, anatomy view and trend charts have data to show.
 *   npm run seed
 * Login: demo@example.com / Demo12345
 * All data is synthetic. No real patient data.
 */
const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Report = require('../src/models/Report');
const { classifyRows, runAnalysis } = require('../src/services/reportPipeline');

const EMAIL = 'demo@example.com';
const PASSWORD = 'Demo12345';

// [name, unit, low, high, [v1, v2, v3, v4]]  (oldest -> newest)
const SERIES = [
  ['Hemoglobin', 'g/dL', 12, 15, [11.1, 11.6, 12.2, 12.6]],
  ['WBC Count', 'cells/µL', 4000, 11000, [7200, 11800, 8600, 7900]],
  ['Platelet Count', 'cells/µL', 150000, 450000, [240000, 260000, 255000, 248000]],
  ['RBC Count', 'million/µL', 4.0, 5.2, [4.1, 4.2, 4.4, 4.5]],
  ['MCV', 'fL', 80, 100, [76, 78, 82, 84]],
  ['Ferritin', 'ng/mL', 15, 150, [9, 14, 28, 41]],
  ['Fasting Blood Sugar', 'mg/dL', 70, 100, [96, 104, 108, 99]],
  ['HbA1c', '%', 4.0, 5.6, [5.4, 5.7, 5.9, 5.6]],
  ['Total Cholesterol', 'mg/dL', null, 200, [188, 214, 232, 205]],
  ['LDL Cholesterol', 'mg/dL', null, 130, [118, 139, 151, 134]],
  ['HDL Cholesterol', 'mg/dL', 40, null, [46, 42, 38, 44]],
  ['Triglycerides', 'mg/dL', null, 150, [132, 168, 182, 149]],
  ['ALT (SGPT)', 'U/L', 7, 56, [28, 34, 61, 40]],
  ['AST (SGOT)', 'U/L', 10, 40, [22, 25, 44, 31]],
  ['Total Bilirubin', 'mg/dL', 0.2, 1.2, [0.7, 0.8, 0.9, 0.8]],
  ['Albumin', 'g/dL', 3.5, 5.0, [4.3, 4.2, 4.1, 4.4]],
  ['Creatinine', 'mg/dL', 0.6, 1.1, [0.8, 0.9, 0.9, 0.85]],
  ['Blood Urea', 'mg/dL', 15, 40, [24, 28, 31, 26]],
  ['Uric Acid', 'mg/dL', 2.4, 6.0, [5.1, 5.8, 6.4, 5.7]],
  ['Sodium', 'mmol/L', 135, 145, [139, 140, 138, 141]],
  ['Potassium', 'mmol/L', 3.5, 5.1, [4.2, 4.4, 4.0, 4.3]],
  ['TSH', 'µIU/mL', 0.4, 4.0, [3.1, 4.6, 5.8, 4.4]],
  ['Free T4', 'ng/dL', 0.8, 1.8, [1.2, 1.0, 0.9, 1.1]],
  ['Vitamin D', 'ng/mL', 30, 100, [16, 19, 24, 27]],
  ['Calcium', 'mg/dL', 8.6, 10.2, [9.1, 9.0, 8.9, 9.3]],
  ['Vitamin B12', 'pg/mL', 200, 900, [180, 240, 310, 420]],
];

const DATES = ['2025-12-10', '2026-03-14', '2026-07-02', '2026-11-08'];
const TITLES = ['Annual health check', 'Follow-up panel', 'Full body checkup', 'Quarterly review'];

async function main() {
  await mongoose.connect(env.MONGO_URI);
  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    await Report.deleteMany({ user: existing._id });
    await existing.deleteOne();
  }
  const user = await User.create({
    name: 'Demo User',
    email: EMAIL,
    passwordHash: await User.hashPassword(PASSWORD),
    consentAcceptedAt: new Date(),
    profile: { sex: 'female', birthYear: 1995 },
  });

  for (let i = 0; i < DATES.length; i += 1) {
    const rows = SERIES.map(([name, unit, low, high, values]) => ({
      name,
      unit,
      value: values[i],
      refLow: low,
      refHigh: high,
      refText: low != null && high != null ? `${low} - ${high}` : high != null ? `< ${high}` : `> ${low}`,
    }));
    const report = new Report({
      user: user._id,
      title: TITLES[i],
      labName: 'Sample Diagnostics (synthetic data)',
      reportDate: new Date(DATES[i]),
      source: { type: 'manual', extraction: 'manual' },
      results: classifyRows(rows),
    });
    await runAnalysis(report);
    await report.save();
    console.log(`[seed] ${report.title}: ${report.results.length} tests, score ${report.healthScore} (${report.analysis.provider})`);
  }
  console.log(`[seed] done. Log in with ${EMAIL} / ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
