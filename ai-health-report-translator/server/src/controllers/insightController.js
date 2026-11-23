const mongoose = require('mongoose');
const Report = require('../models/Report');
const HttpError = require('../utils/httpError');
const { ORGANS, TESTS, BY_KEY } = require('../services/testCatalog');
const { gaugePosition, score } = require('../services/classifier');
const { DISCLAIMER } = require('../services/aiService');

const isAbnormal = (s) => s === 'High' || s === 'Low';

/** All verified results for the user, oldest first, flattened with their report date. */
async function loadPoints(userId) {
  const reports = await Report.find({ user: userId, state: 'analyzed' }).sort({ reportDate: 1 }).lean();
  const points = [];
  for (const rep of reports) {
    for (const r of rep.results) {
      points.push({ ...r, reportId: rep._id.toString(), reportTitle: rep.title, date: rep.reportDate });
    }
  }
  return { reports, points };
}

function direction(prev, cur) {
  if (prev == null || cur == null) return null;
  if (cur > prev) return 'up';
  if (cur < prev) return 'down';
  return 'flat';
}

/**
 * Body overview for the anatomy view: for every organ, the latest value of each
 * test linked to it, its status, gauge position, change since last time and a
 * small history for sparklines.
 */
async function overview(req, res) {
  const { reports, points } = await loadPoints(req.userId);
  const byKey = new Map();
  for (const p of points) {
    if (!byKey.has(p.key)) byKey.set(p.key, []);
    byKey.get(p.key).push(p);
  }

  const organs = Object.values(ORGANS).map((o) => ({ ...o, tests: [] }));
  const organIndex = Object.fromEntries(organs.map((o) => [o.key, o]));

  for (const [key, history] of byKey) {
    const latest = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : null;
    const organ = organIndex[latest.organ] || organIndex.other;
    organ.tests.push({
      key,
      name: latest.name,
      value: latest.value,
      valueText: latest.valueText,
      unit: latest.unit,
      refLow: latest.refLow,
      refHigh: latest.refHigh,
      refText: latest.refText,
      status: latest.status,
      deviation: latest.deviation,
      critical: latest.critical,
      explanation: latest.explanation,
      gauge: gaugePosition(latest),
      change: prev && prev.unit === latest.unit ? direction(prev.value, latest.value) : null,
      previousValue: prev && prev.unit === latest.unit ? prev.value : null,
      date: latest.date,
      reportId: latest.reportId,
      history: history.slice(-8).map((h) => ({ date: h.date, value: h.value, status: h.status })),
    });
  }

  const latestReport = reports[reports.length - 1];
  const organNotes = Object.fromEntries((latestReport?.analysis?.organNotes || []).map((n) => [n.organ, n.note]));

  for (const o of organs) {
    o.tests.sort((a, b) => Number(isAbnormal(b.status)) - Number(isAbnormal(a.status)) || a.name.localeCompare(b.name));
    const abnormal = o.tests.filter((t) => isAbnormal(t.status)).length;
    o.abnormalCount = abnormal;
    o.status = !o.tests.length ? 'no-data' : o.tests.some((t) => t.critical) ? 'critical' : abnormal ? 'attention' : 'normal';
    o.score = score(o.tests);
    o.note = organNotes[o.key] || '';
  }

  const allLatest = organs.flatMap((o) => o.tests);
  res.json({
    summary: {
      reportCount: reports.length,
      pendingReview: await Report.countDocuments({ user: req.userId, state: 'pending_review' }),
      testCount: allLatest.length,
      abnormalCount: allLatest.filter((t) => isAbnormal(t.status)).length,
      criticalCount: allLatest.filter((t) => t.critical).length,
      healthScore: score(allLatest),
      scoreHistory: reports.map((r) => ({ date: r.reportDate, score: r.healthScore, reportId: r._id.toString() })),
      lastReport: latestReport
        ? { id: latestReport._id.toString(), title: latestReport.title, date: latestReport.reportDate, summary: latestReport.analysis?.summary || '', doctorQuestions: latestReport.analysis?.doctorQuestions || [] }
        : null,
    },
    organs,
    disclaimer: DISCLAIMER,
  });
}

async function trendList(req, res) {
  const { points } = await loadPoints(req.userId);
  const map = new Map();
  for (const p of points) {
    const cur = map.get(p.key) || { key: p.key, name: p.name, organ: p.organ, unit: p.unit, count: 0 };
    cur.count += 1;
    cur.latest = { value: p.value, status: p.status, date: p.date };
    map.set(p.key, cur);
  }
  res.json({ parameters: [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) });
}

async function trend(req, res) {
  const key = String(req.params.key).slice(0, 60);
  const rows = await Report.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId), state: 'analyzed' } },
    { $unwind: '$results' },
    { $match: { 'results.key': key } },
    { $sort: { reportDate: 1 } },
    {
      $project: {
        _id: 0,
        reportId: { $toString: '$_id' },
        reportTitle: '$title',
        date: '$reportDate',
        value: '$results.value',
        unit: '$results.unit',
        status: '$results.status',
        refLow: '$results.refLow',
        refHigh: '$results.refHigh',
      },
    },
  ]);
  if (!rows.length) throw new HttpError(404, 'No results for this test yet');
  const latest = rows[rows.length - 1];
  const units = [...new Set(rows.map((r) => r.unit).filter(Boolean))];
  res.json({
    key,
    name: BY_KEY[key]?.name || key,
    organ: BY_KEY[key]?.organ || 'other',
    description: BY_KEY[key]?.description || '',
    unit: latest.unit,
    refLow: latest.refLow,
    refHigh: latest.refHigh,
    points: rows,
    warnings: units.length > 1 ? [`Values were reported in different units (${units.join(', ')}) and may not be directly comparable.`] : [],
  });
}

function catalog(_req, res) {
  res.json({
    organs: Object.values(ORGANS),
    tests: TESTS.map(({ key, name, organ, unit, description }) => ({ key, name, organ, unit, description })),
  });
}

module.exports = { overview, trendList, trend, catalog };
