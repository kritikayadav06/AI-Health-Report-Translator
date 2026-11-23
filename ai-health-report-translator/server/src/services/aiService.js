/**
 * AI analysis (synopsis, steps 7-8): plain-language explanations, a short
 * summary and questions for the doctor. Uses the Claude API with a strict
 * JSON schema and a non-diagnostic prompt. Every response is validated and
 * filtered before it is saved. If no API key is configured, a deterministic
 * offline generator built from the test catalog is used instead, so the app
 * always works in development and demos.
 *
 * Only test names, values, units, ranges and statuses are sent: no names,
 * contact details or other identifiers.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');
const env = require('../config/env');
const { BY_KEY, ORGANS } = require('./testCatalog');
const { redact } = require('./anonymizer');

let client = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 2 });
  return client;
}

const DISCLAIMER =
  'This is an informational and educational summary, not medical advice, diagnosis or treatment. Please discuss your results with a qualified healthcare professional.';

const SYSTEM_PROMPT = `You explain medical laboratory results to patients in simple, friendly, non-technical language (reading age about 12).

Rules you must always follow:
- Base everything ONLY on the test values, units, reference ranges and statuses supplied. Do not invent other results.
- The Normal / High / Low status has already been decided by the software from the printed reference range. Never change or contradict it.
- Never diagnose. Never name a disease or condition as a conclusion about this person (do not write "you have ...", "this means you have ...", "this confirms ...").
  You may say a value "can be associated with several possible reasons" and that a doctor can help interpret it.
- Never recommend medicines, supplements, dosages or treatments, and never tell the person to start or stop any medication.
- General, widely-accepted lifestyle context (for example sleep, balanced diet, staying active) is allowed only in neutral terms like "doctors often discuss ...".
- Be calm and reassuring. Avoid alarming words. Keep each explanation to 2-3 short sentences.
- Doctor questions must be open questions the person could ask at an appointment, focused on the out-of-range values first.`;

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'tests', 'doctorQuestions', 'organNotes'],
  properties: {
    summary: { type: 'string', description: 'A 3-5 sentence plain-language overview of the whole report.' },
    tests: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'explanation'],
        properties: {
          id: { type: 'string', description: 'The id of the test exactly as given in the input.' },
          explanation: { type: 'string' },
        },
      },
    },
    doctorQuestions: { type: 'array', items: { type: 'string' } },
    organNotes: {
      type: 'array',
      description: 'One short note per body area that has results.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['organ', 'note'],
        properties: {
          organ: { type: 'string', enum: Object.keys(ORGANS) },
          note: { type: 'string' },
        },
      },
    },
  },
};

const AnalysisZ = z.object({
  summary: z.string().min(1),
  tests: z.array(z.object({ id: z.string(), explanation: z.string() })),
  doctorQuestions: z.array(z.string()).max(12),
  organNotes: z.array(z.object({ organ: z.string(), note: z.string() })),
});

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tests', 'reportDate'],
  properties: {
    reportDate: { type: ['string', 'null'], description: 'Report date as YYYY-MM-DD if printed, else null.' },
    tests: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'value', 'unit', 'refLow', 'refHigh', 'refText'],
        properties: {
          name: { type: 'string' },
          value: { type: ['number', 'string'], description: 'Numeric value, or the text result such as "Negative".' },
          unit: { type: 'string' },
          refLow: { type: ['number', 'null'] },
          refHigh: { type: ['number', 'null'] },
          refText: { type: 'string', description: 'Reference range exactly as printed, or empty.' },
        },
      },
    },
  },
};

const ExtractionZ = z.object({
  reportDate: z.string().nullable(),
  tests: z.array(
    z.object({
      name: z.string(),
      value: z.union([z.number(), z.string()]),
      unit: z.string(),
      refLow: z.number().nullable(),
      refHigh: z.number().nullable(),
      refText: z.string(),
    })
  ),
});

// Output guard: phrases that would make a statement diagnostic or prescriptive.
const UNSAFE = [
  /\byou (?:have|are suffering from|definitely have|likely have|probably have)\b/i,
  /\b(?:this|these results?) (?:confirms?|proves?|means you have)\b/i,
  /\bdiagnos(?:e|ed|is)\b/i,
  /\b(?:take|start|stop|increase|decrease)\s+(?:your\s+)?(?:medication|medicine|tablets?|pills?|insulin|supplements?)\b/i,
  /\b\d+\s?(?:mg|mcg|iu|units)\b(?!\/)/i,
];

function isSafe(text) {
  return !UNSAFE.some((re) => re.test(text));
}

async function callClaude({ system, user, schema, effort = 'medium' }) {
  const response = await getClient().beta.messages.create({
    model: env.AI_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (response.stop_reason === 'refusal') throw new Error('AI service declined the request');
  if (response.stop_reason === 'max_tokens') throw new Error('AI response was cut off');
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { data: JSON.parse(text), model: response.model };
}

// ---------------------------------------------------------------- analysis

function describeStatus(r) {
  if (r.status === 'High') return 'above';
  if (r.status === 'Low') return 'below';
  return 'within';
}

function offlineExplanation(r) {
  const base = BY_KEY[r.key]?.description || `${r.name} is one of the values measured in your report.`;
  if (r.status === 'Normal') return `${base} Your result is within the reference range printed on the report.`;
  if (r.status === 'High' || r.status === 'Low') {
    const amount = r.deviation < 10 ? 'slightly ' : '';
    return `${base} Your result is ${amount}${describeStatus(r)} the reference range printed on the report. There can be several reasons for this, so it is worth discussing with a qualified healthcare professional.`;
  }
  if (r.status === 'Not graded') return `${base} This result is shown as reported and is not graded by the app.`;
  return `${base} No reference range was found on the report, so the app did not grade this value.`;
}

function offlineAnalysis(results) {
  const abnormal = results.filter((r) => r.status === 'High' || r.status === 'Low');
  const organs = [...new Set(results.map((r) => r.organ))];
  const summary = abnormal.length
    ? `Your report contains ${results.length} test results. ${results.length - abnormal.length} are within the printed reference range and ${abnormal.length} ${abnormal.length === 1 ? 'is' : 'are'} outside it: ${abnormal
        .map((r) => `${r.name} (${r.status.toLowerCase()})`)
        .join(', ')}. Values slightly outside a range are common and can have many explanations. A doctor can look at these together with your history.`
    : `Your report contains ${results.length} test results and all graded values are within the printed reference ranges. Keep your reports so you can compare them over time.`;

  const doctorQuestions = [
    ...abnormal.slice(0, 5).map((r) => `My ${r.name} is ${r.status.toLowerCase()} (${r.valueText} ${r.unit}). What could be the reasons, and does it need follow-up?`),
    'Do any of these results need to be repeated, and when?',
    'Are there any lifestyle factors I should discuss with you based on these results?',
  ];

  const organNotes = organs.map((organ) => {
    const rows = results.filter((r) => r.organ === organ);
    const off = rows.filter((r) => r.status === 'High' || r.status === 'Low');
    return {
      organ,
      note: off.length
        ? `${off.length} of ${rows.length} ${ORGANS[organ]?.name || organ} values are outside the reference range.`
        : `All ${rows.length} ${ORGANS[organ]?.name || organ} values are within the reference range.`,
    };
  });

  return {
    summary,
    explanations: Object.fromEntries(results.map((r) => [String(r.id), offlineExplanation(r)])),
    doctorQuestions,
    organNotes,
    provider: 'offline',
    model: 'rule-based',
  };
}

async function analyzeResults(results) {
  if (!env.AI_ENABLED) return offlineAnalysis(results);

  const payload = results.map((r) => ({
    id: String(r.id),
    test: r.name,
    bodyArea: r.organ,
    value: r.value ?? r.valueText,
    unit: r.unit,
    referenceRange: r.refText || [r.refLow, r.refHigh].filter((x) => x != null).join(' - '),
    status: r.status,
  }));

  try {
    const { data, model } = await callClaude({
      system: SYSTEM_PROMPT,
      user: `Here are the lab results as JSON. Write the explanations, summary, doctor questions and body-area notes.\n\n${JSON.stringify(payload)}`,
      schema: ANALYSIS_SCHEMA,
    });
    const parsed = AnalysisZ.parse(data);
    const fallback = offlineAnalysis(results);

    // Keep AI text only where it passes the safety guard; otherwise use the cautious offline text.
    const explanations = { ...fallback.explanations };
    for (const t of parsed.tests) {
      if (explanations[t.id] !== undefined && isSafe(t.explanation)) explanations[t.id] = t.explanation.trim();
    }
    return {
      summary: isSafe(parsed.summary) ? parsed.summary.trim() : fallback.summary,
      explanations,
      doctorQuestions: parsed.doctorQuestions.filter(isSafe).slice(0, 8),
      organNotes: parsed.organNotes.filter((n) => ORGANS[n.organ] && isSafe(n.note)),
      provider: 'claude',
      model,
    };
  } catch (err) {
    console.error('[ai] analysis failed, using offline analysis:', err.message);
    return { ...offlineAnalysis(results), warning: 'The AI service was unavailable, so a basic summary was generated instead.' };
  }
}

// -------------------------------------------------------------- extraction

/** AI-assisted structuring of report text the pattern parser could not read well. */
async function structureText(rawText) {
  if (!env.AI_ENABLED) return null;
  const text = redact(rawText).slice(0, 30_000);
  try {
    const { data } = await callClaude({
      system:
        'You convert the text of a medical laboratory report into structured JSON. Copy values exactly as printed. Include only laboratory test results, never patient details. Do not interpret the results.',
      user: `Report text:\n<report>\n${text}\n</report>`,
      schema: EXTRACTION_SCHEMA,
      effort: 'low',
    });
    return ExtractionZ.parse(data);
  } catch (err) {
    console.error('[ai] extraction failed:', err.message);
    return null;
  }
}

module.exports = { analyzeResults, structureText, offlineAnalysis, isSafe, DISCLAIMER };
