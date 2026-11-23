/**
 * Text extraction (synopsis, step 3):
 *  - PDFs with a text layer: read text directly.
 *  - Scanned PDFs: render pages to images, then OCR.
 *  - Images: OCR with Tesseract.
 */
const { PDFParse } = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const path = require('path');
const env = require('../config/env');

// English language data is bundled via npm, so OCR works offline and report
// images never depend on a third-party CDN.
const LANG_PATH =
  process.env.OCR_LANG_PATH || path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');

let workerPromise = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      // Without an errorHandler, tesseract.js throws inside the worker and crashes the server.
      errorHandler: (err) => console.error('[ocr] worker error:', String(err).slice(0, 200)),
      langPath: LANG_PATH,
      gzip: true,
      cacheMethod: 'none',
    }).catch((err) => {
      workerPromise = null;
      throw new Error(`OCR engine could not start: ${String(err?.message || err).slice(0, 120)}`);
    });
  }
  return workerPromise;
}

async function ocrImage(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return data.text || '';
}

const MIN_TEXT_CHARS = 40;

async function extractFromPdf(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = (result.text || '').replace(/-- \d+ of \d+ --/g, '');
    const pages = result.total || (result.pages ? result.pages.length : undefined);
    if (text.replace(/\s/g, '').length >= MIN_TEXT_CHARS) {
      return { text, method: 'pdf-text', pages };
    }
    // Scanned PDF: render the first pages and OCR them
    const shots = await parser.getScreenshot({ first: env.OCR_MAX_PAGES, scale: 2, imageDataUrl: false });
    const parts = [];
    for (const page of shots.pages) parts.push(await ocrImage(Buffer.from(page.data)));
    return { text: parts.join('\n'), method: 'ocr', pages };
  } finally {
    await parser.destroy();
  }
}

async function extractText(buffer, kind) {
  if (kind === 'pdf') return extractFromPdf(buffer);
  return { text: await ocrImage(buffer), method: 'ocr', pages: 1 };
}

async function shutdown() {
  if (workerPromise) {
    const w = await workerPromise.catch(() => null);
    if (w) await w.terminate();
    workerPromise = null;
  }
}

module.exports = { extractText, shutdown };
