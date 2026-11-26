import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { buildHealthReport, type Check } from './health.js';

export type AppDeps = {
  webOrigin: string;
  checks: Record<string, Check>;
  healthTimeoutMs: number;
};

export function createApp(deps: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: deps.webOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  /** Liveness simple, usado por el healthcheck de Docker. */
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', service: 'api' });
  });

  /** Estado del api y de todas sus dependencias (incluido el servicio de IA). */
  app.get('/health', async (_req, res) => {
    const report = await buildHealthReport(deps.checks, deps.healthTimeoutMs);
    res.set('Cache-Control', 'no-store').json(report);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'No encontrado' });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  };
  app.use(errorHandler);

  return app;
}
