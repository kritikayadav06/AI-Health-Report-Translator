/**
 * Pattern-based parser that turns raw report text into structured test rows:
 *   { name, key, organ, value, valueText, unit, refLow, refHigh, refText }
 *
 * This is the primary extraction method (see synopsis, step 4). The AI
 * service is only used as a fallback when this finds too little.
 */
const { matchAtStart, slugify, lookup, ORGANS } = require('./testCatalog');

const NUM = '\\d[\\d,]*(?:\\.\\d+)?';
const QUALITATIVE = /^(negative|positive|nil|absent|present|reactive|non[- ]?reactive|normal|abnormal|trace|not detected|detected)\b/i;

function toNumber(str) {
  if (str === null || str === undefined) return null;
  const cleaned = String(str).replace(/,/g, '').replace(/[<>≤≥=\s]/g, '');
  if (cleaned === '' || Number.isNaN(Number(cleaned))) return null;
  return Number(cleaned);
}

/**
 * Parse a reference range expression found somewhere in `text`.
 * Returns { low, high, text, index, length } for the LAST range found, or null.
 */
function findRange(text) {
  const patterns = [
    { re: new RegExp(`(${NUM})\\s*(?:-|–|—|to)\\s*(${NUM})`, 'gi'), kind: 'between' },
    { re: new RegExp(`(?:<=?|≤|up\\s*to|upto|less than|below)\\s*(${NUM})`, 'gi'), kind: 'max' },
    { re: new RegExp(`(?:>=?|≥|more than|above|greater than)\\s*(${NUM})`, 'gi'), kind: 'min' },
  ];
  let best = null;
  for (const { re, kind } of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const candidate = { index: m.index, length: m[0].length, text: m[0].trim(), kind };
      if (kind === 'between') {
        candidate.low = toNumber(m[1]);
        candidate.high = toNumber(m[2]);
      } else if (kind === 'max') {
        candidate.low = null;
        candidate.high = toNumber(m[1]);
      } else {
        candidate.low = toNumber(m[1]);
        candidate.high = null;
      }
      // prefer the right-most range; ties go to "between" (listed first)
      if (!best || candidate.index > best.index) best = candidate;
    }
  }
  return best;
}

/** Split "rest of line after the test name" into value, unit and range. */
function parseTail(tail) {
  let rest = tail
    .replace(/^[\s:.\-–=]*/, '')
    .replace(/^\((?:[^)]*)\)\s*/, '') // e.g. "(Method: Photometry)"
    .replace(/^[\s:.\-–=]*/, '');

  const qual = rest.match(QUALITATIVE);
  if (qual) {
    return { value: null, valueText: qual[1], unit: '', range: null };
  }

  const valueMatch = rest.match(new RegExp(`^([<>]?\\s*${NUM})`));
  if (!valueMatch) return null;
  const valueText = valueMatch[1].replace(/\s+/g, '');
  rest = rest.slice(valueMatch[0].length);

  const range = findRange(rest);
  let unit = rest;
  if (range) unit = rest.slice(0, range.index) + ' ' + rest.slice(range.index + range.length);
  unit = unit
    .replace(/(^|\s)(H|L|High|Low|HIGH|LOW|Normal|NORMAL|\*+)(?=\s|$)/g, ' ')
    .replace(/[()[\]*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')[0] || '';

  return { value: toNumber(valueText), valueText, unit, range };
}

const GENERIC_LINE = new RegExp(`^([A-Za-z][A-Za-z0-9 ()\\-/.,']{1,48}?)\\s*[:\\s]\\s*([<>]?${NUM})\\s+(.*)$`);
const SKIP_LINE = /(patient|name|age|sex|gender|date|ref\.?\s*by|doctor|dr\.|lab no|sample|collected|reported|registered|page|phone|mobile|address|email|uhid|barcode|id\s*no)/i;

function parseLine(rawLine) {
  const line = rawLine.replace(/\t/g, ' ').replace(/\s{2,}/g, '  ').trim();
  if (line.length < 3 || line.length > 200) return null;

  const match = matchAtStart(line);
  if (match) {
    // Cut the alias off the original line (case-insensitive, same length after normalisation)
    const idx = line.toLowerCase().indexOf(match.alias);
    const tail = idx >= 0 ? line.slice(idx + match.alias.length) : line.slice(match.alias.length);
    const parsed = parseTail(tail);
    if (!parsed) return null;
    return buildRow(match.test.name, match.test.key, match.test.organ, parsed, match.test.unit);
  }

  // Unknown test: only accept if it looks like "<Name> <number> <unit> <range>"
  if (SKIP_LINE.test(line)) return null;
  const g = line.match(GENERIC_LINE);
  if (!g) return null;
  const parsed = parseTail(`${g[2]} ${g[3]}`);
  if (!parsed || !parsed.range) return null;
  const name = g[1].trim().replace(/[\s:.-]+$/, '');
  return buildRow(name, slugify(name), 'other', parsed);
}

/** Canonical unit spelling so the same unit always compares equal (e.g. Greek mu vs micro sign). */
function canonicalUnit(unit = '') {
  return String(unit).trim().replace(/\u03bc/g, '\u00b5').replace(/^u(?=[gIi]|mol)/, '\u00b5').replace(/\s+/g, '');
}

function buildRow(name, key, organ, parsed, defaultUnit = '') {
  const { value, valueText, unit, range } = parsed;
  return {
    name,
    key,
    organ: ORGANS[organ] ? organ : 'other',
    value,
    valueText,
    unit: canonicalUnit(unit || defaultUnit || ''),
    refLow: range ? range.low : null,
    refHigh: range ? range.high : null,
    refText: range ? range.text : '',
  };
}

const DATE_LABEL = /(report(?:ed)?(?:\s*date|\s*on)?|collected(?:\s*on)?|collection date|sample date|date)\s*[:\-]?\s*([0-3]?\d[\/\-.\s](?:[01]?\d|[A-Za-z]{3,9})[\/\-.\s](?:\d{4}|\d{2}))/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseDate(str) {
  const parts = str.split(/[\/\-.\s]+/);
  if (parts.length !== 3) return null;
  let [d, m, y] = parts;
  let month = Number(m);
  if (Number.isNaN(month)) month = MONTHS.indexOf(m.slice(0, 3).toLowerCase()) + 1;
  let year = Number(y);
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month - 1, Number(d)));
  if (Number.isNaN(date.getTime()) || month < 1 || month > 12) return null;
  return date;
}

/** Parse full report text. */
function parseReportText(text = '') {
  const lines = String(text).split(/\r?\n/);
  const results = [];
  const seen = new Set();
  for (const line of lines) {
    const row = parseLine(line);
    if (row && !seen.has(row.key)) {
      seen.add(row.key);
      results.push(row);
    }
  }
  const dateMatch = String(text).match(DATE_LABEL);
  const reportDate = dateMatch ? parseDate(dateMatch[2]) : null;
  return { results, reportDate };
}

/** Normalise a row that came from the user or the AI (fills key/organ from the catalog). */
function normaliseRow(row) {
  const test = lookup(row.name || '');
  const value = typeof row.value === 'number' ? row.value : toNumber(row.value);
  return {
    name: test ? test.name : String(row.name || '').trim(),
    key: test ? test.key : slugify(row.name || 'test'),
    organ: test ? test.organ : ORGANS[row.organ] ? row.organ : 'other',
    value,
    valueText: row.valueText != null && row.valueText !== '' ? String(row.valueText) : value != null ? String(value) : '',
    unit: canonicalUnit(row.unit ? String(row.unit) : test ? test.unit : ''),
    refLow: row.refLow === '' || row.refLow == null ? null : toNumber(row.refLow),
    refHigh: row.refHigh === '' || row.refHigh == null ? null : toNumber(row.refHigh),
    refText: row.refText ? String(row.refText) : '',
  };
}

module.exports = { canonicalUnit, parseReportText, parseLine, findRange, toNumber, normaliseRow, parseDate };
