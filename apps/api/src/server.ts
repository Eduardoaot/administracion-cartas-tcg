import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { createDefaultChecks } from './health.js';

const config = loadConfig();
const app = createApp({
  webOrigin: config.WEB_ORIGIN,
  checks: createDefaultChecks(config),
  healthTimeoutMs: config.HEALTH_TIMEOUT_MS,
});

const server = app.listen(config.API_PORT, () => {
  console.log(`api escuchando en :${config.API_PORT} (${config.NODE_ENV})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
