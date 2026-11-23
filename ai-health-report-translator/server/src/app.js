const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN.split(','), credentials: false }));
  app.use(express.json({ limit: '200kb' }));
  // Log method, path, status and timing only. Never bodies (they contain health data).
  if (env.NODE_ENV !== 'test') app.use(morgan(':method :url :status :response-time ms'));
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
