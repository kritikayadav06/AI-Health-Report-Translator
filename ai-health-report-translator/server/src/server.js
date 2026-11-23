const env = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const { shutdown: stopOcr } = require('./services/textExtractor');

async function main() {
  await connectDB(env.MONGO_URI);
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT} (AI: ${env.AI_ENABLED ? env.AI_MODEL : 'offline mode'})`);
  });
  const stop = async () => {
    server.close();
    await stopOcr();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('[api] failed to start:', err.message);
  process.exit(1);
});
