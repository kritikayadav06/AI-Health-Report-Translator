require('dotenv').config({ quiet: true });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_health_reporter',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB) || 10,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'claude-opus-5-5',
  // If the pattern parser finds fewer than this many tests, ask the AI service to
  // structure the (redacted) report text. Set to 0 to never send report text to the AI.
  AI_EXTRACTION_MIN_RESULTS: Number(process.env.AI_EXTRACTION_MIN_RESULTS ?? 3),
  OCR_MAX_PAGES: Number(process.env.OCR_MAX_PAGES) || 5,
};

if (!env.JWT_SECRET) {
  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  env.JWT_SECRET = 'dev-only-insecure-secret-change-me';
  console.warn('[env] JWT_SECRET not set: using an insecure development secret');
}

env.AI_ENABLED = Boolean(env.ANTHROPIC_API_KEY);

module.exports = env;
