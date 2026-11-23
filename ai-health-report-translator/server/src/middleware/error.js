const multer = require('multer');
const mongoose = require('mongoose');
const env = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `File is larger than ${env.MAX_UPLOAD_MB} MB` : err.message;
    return res.status(413).json({ error: msg });
  }
  if (err instanceof mongoose.Error.CastError) return res.status(404).json({ error: 'Not found' });
  if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });

  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err.message); // never log request bodies (health data)
  return res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
