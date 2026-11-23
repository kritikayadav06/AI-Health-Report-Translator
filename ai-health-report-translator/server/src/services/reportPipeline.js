/**
 * Orchestrates the core workflow from the synopsis:
 * upload -> extract text -> parse -> (AI-assisted structuring) -> user review
 * -> classify -> AI analysis -> store.
 */
const env = require('../config/env');
const { extractText } = require('./textExtractor');
const { parseReportText, normaliseRow } = require('./labParser');
const { classify, score } = require('./classifier');
const { analyzeResults, structureText } = require('./aiService');

function classifyRows(rows) {
  return rows.map((row) => {
    const n = normaliseRow(row);
    return { ...n, ...classify(n), explanation: '' };
  });
}

async function extractFromFile(buffer, kind) {
  const warnings = [];
  const { text, method, pages } = await extractText(buffer, kind);
  let { results, reportDate } = parseReportText(text);
  let extraction = method;

  if (results.length < env.AI_EXTRACTION_MIN_RESULTS && text.trim()) {
    const ai = await structureText(text);
    if (ai && ai.tests.length > results.length) {
      results = ai.tests.map((t) => ({
        ...t,
        valueText: String(t.value),
        value: typeof t.value === 'number' ? t.value : null,
      }));
      if (!reportDate && ai.reportDate) {
        const d = new Date(ai.reportDate);
        if (!Number.isNaN(d.getTime())) reportDate = d;
      }
      extraction = 'ai';
      warnings.push('Some values were read with AI assistance. Please check them carefully.');
    }
  }
  if (!results.length) {
    warnings.push('No test results could be read automatically. You can add them manually in the review step.');
  }
  if (method === 'ocr') {
    warnings.push('This report was read with OCR, which can misread numbers. Please compare each value with your report.');
  }
  return { results: classifyRows(results), reportDate, extraction, pages, warnings };
}

async function runAnalysis(report) {
  const rows = report.results.map((r) => ({ ...r.toObject(), id: r._id.toString() }));
  const ai = await analyzeResults(rows);
  for (const r of report.results) r.explanation = ai.explanations[r._id.toString()] || '';
  report.analysis = {
    summary: ai.summary,
    doctorQuestions: ai.doctorQuestions,
    organNotes: ai.organNotes,
    provider: ai.provider,
    model: ai.model,
    generatedAt: new Date(),
  };
  report.healthScore = score(report.results);
  report.state = 'analyzed';
  report.warnings = (report.warnings || []).filter((w) => !w.startsWith('The AI service'));
  if (ai.warning) report.warnings.push(ai.warning);
  return report;
}

module.exports = { extractFromFile, classifyRows, runAnalysis };
