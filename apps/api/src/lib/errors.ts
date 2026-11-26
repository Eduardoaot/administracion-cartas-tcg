import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, code?: string) => new HttpError(400, msg, code);
export const unauthorized = (msg = 'No autenticado', code?: string) =>
  new HttpError(401, msg, code);
export const forbidden = (msg = 'No tienes permiso para esta acción', code?: string) =>
  new HttpError(403, msg, code);
export const notFound = (msg = 'No encontrado') => new HttpError(404, msg);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      code: 'VALIDATION_ERROR',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code, ...err.extra });
    return;
  }
  // express.json() con cuerpo mal formado o demasiado grande
  const status = (err as { status?: number }).status;
  if (status === 400 || status === 413) {
    res.status(status).json({ error: status === 413 ? 'Cuerpo demasiado grande' : 'JSON inválido' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
};
