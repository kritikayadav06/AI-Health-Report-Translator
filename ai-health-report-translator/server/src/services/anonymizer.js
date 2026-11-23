/**
 * Remove personal identifiers from report text before it is sent to an
 * external AI service (synopsis: privacy considerations).
 */
const LABELLED = /^(.*?\b(patient(?:'s)?\s*name|name|mr\.?|mrs\.?|ms\.?|ref(?:erred)?\.?\s*by|consultant|doctor|dr\.?|address|phone|mobile|contact|e-?mail|uhid|mrn|patient\s*id|lab\s*no|reg(?:istration)?\.?\s*no|barcode|sample\s*id|aadhaar|abha)\b\s*[:\-.]).*$/gim;

function redact(text = '') {
  return String(text)
    .replace(LABELLED, '$1 [REDACTED]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
    .replace(/(\+\d{1,3}[\s-]?)?\b\d{5}\s?\d{5}\b/g, '[PHONE]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[ID]');
}

module.exports = { redact };
