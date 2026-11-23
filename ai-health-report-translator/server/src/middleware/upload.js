const multer = require('multer');
const env = require('../config/env');
const HttpError = require('../utils/httpError');

const ALLOWED = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/webp': 'image',
};

// Files are kept in memory only, processed, and discarded (data minimisation).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new HttpError(415, 'Only PDF, PNG, JPG or WEBP files are allowed'));
    return cb(null, true);
  },
});

/** Check magic bytes so a renamed file cannot pretend to be a PDF/image. */
function sniffType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer.slice(0, 5).toString() === '%PDF-') return 'pdf';
  if (buffer[0] === 0x89 && buffer.slice(1, 4).toString() === 'PNG') return 'image';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image';
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return 'image';
  return null;
}

function verifyFile(req, _res, next) {
  if (!req.file) return next(new HttpError(400, 'Please attach a report file in the "file" field'));
  const kind = sniffType(req.file.buffer);
  if (!kind || kind !== ALLOWED[req.file.mimetype]) {
    return next(new HttpError(415, 'The file content does not match a supported PDF or image'));
  }
  req.fileKind = kind;
  return next();
}

module.exports = { upload, verifyFile, sniffType };
