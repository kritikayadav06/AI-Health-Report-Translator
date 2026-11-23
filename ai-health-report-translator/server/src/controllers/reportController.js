const Report = require('../models/Report');
const HttpError = require('../utils/httpError');
const { extractFromFile, classifyRows, runAnalysis } = require('../services/reportPipeline');
const { gaugePosition } = require('../services/classifier');
const { DISCLAIMER } = require('../services/aiService');
const validators = require('../validators');

function present(report) {
  const json = report.toJSON();
  json.results = json.results.map((r) => ({ ...r, gauge: gaugePosition(r) }));
  json.disclaimer = DISCLAIMER;
  return json;
}

async function findOwned(req) {
  // Every query is filtered by the authenticated user (access control)
  const report = await Report.findOne({ _id: req.params.id, user: req.userId });
  if (!report) throw new HttpError(404, 'Report not found');
  return report;
}

async function upload(req, res) {
  const meta = validators.meta.safeParse(req.body || {});
  if (!meta.success) throw new HttpError(400, 'Invalid report details');
  const extracted = await extractFromFile(req.file.buffer, req.fileKind);
  req.file.buffer = null; // discard the file content as soon as text is extracted

  const report = await Report.create({
    user: req.userId,
    title: meta.data.title || 'Lab report',
    labName: meta.data.labName || '',
    reportDate: meta.data.reportDate || extracted.reportDate || new Date(),
    source: {
      type: req.fileKind,
      fileName: String(req.file.originalname || '').slice(0, 120),
      extraction: extracted.extraction,
      pages: extracted.pages,
    },
    results: extracted.results,
    warnings: extracted.warnings,
  });
  res.status(201).json({ report: present(report) });
}

async function createManual(req, res) {
  const { title, labName, reportDate, results } = req.body;
  const report = await Report.create({
    user: req.userId,
    title: title || 'Manual entry',
    labName: labName || '',
    reportDate: reportDate || new Date(),
    source: { type: 'manual', extraction: 'manual' },
    results: classifyRows(results),
  });
  res.status(201).json({ report: present(report) });
}

async function list(req, res) {
  const reports = await Report.find({ user: req.userId }).sort({ reportDate: -1 }).limit(200);
  res.json({
    reports: reports.map((r) => {
      const abnormal = r.results.filter((x) => x.status === 'High' || x.status === 'Low').length;
      return {
        id: r.id,
        title: r.title,
        labName: r.labName,
        reportDate: r.reportDate,
        state: r.state,
        source: r.source?.type,
        healthScore: r.healthScore,
        testCount: r.results.length,
        abnormalCount: abnormal,
        organs: [...new Set(r.results.map((x) => x.organ))],
        createdAt: r.createdAt,
      };
    }),
  });
}

async function get(req, res) {
  res.json({ report: present(await findOwned(req)) });
}

/** Review step: user corrects the extracted values. Re-classifies and clears old analysis. */
async function update(req, res) {
  const report = await findOwned(req);
  const { title, labName, reportDate, results } = req.body;
  if (title !== undefined) report.title = title;
  if (labName !== undefined) report.labName = labName;
  if (reportDate !== undefined) report.reportDate = reportDate;
  if (results) {
    report.results = classifyRows(results);
    report.analysis = undefined;
    report.healthScore = null;
    report.state = 'pending_review';
  }
  await report.save();
  res.json({ report: present(report) });
}

async function analyze(req, res) {
  const report = await findOwned(req);
  if (!report.results.length) throw new HttpError(400, 'Add at least one test result before analysing');
  await runAnalysis(report);
  await report.save();
  res.json({ report: present(report) });
}

async function remove(req, res) {
  const result = await Report.deleteOne({ _id: req.params.id, user: req.userId });
  if (!result.deletedCount) throw new HttpError(404, 'Report not found');
  res.status(204).end();
}

module.exports = { upload, createManual, list, get, update, analyze, remove };
