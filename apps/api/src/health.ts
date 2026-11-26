import mysql from 'mysql2/promise';
import { Redis } from 'ioredis';
import type { Config } from './config.js';

export type CheckResult = {
  ok: boolean;
  latencyMs: number;
  detail?: unknown;
  error?: string;
};

export type Check = () => Promise<unknown>;

export type HealthReport = {
  status: 'ok' | 'degraded';
  service: 'api';
  time: string;
  checks: Record<string, CheckResult>;
};

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tiempo agotado (${ms} ms)`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

export async function runCheck(check: Check, timeoutMs: number): Promise<CheckResult> {
  const start = performance.now();
  try {
    const detail = await withTimeout(check(), timeoutMs);
    return { ok: true, latencyMs: Math.round(performance.now() - start), detail };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function buildHealthReport(
  checks: Record<string, Check>,
  timeoutMs: number,
): Promise<HealthReport> {
  const entries = await Promise.all(
    Object.entries(checks).map(
      async ([name, check]) => [name, await runCheck(check, timeoutMs)] as const,
    ),
  );
  return {
    status: entries.every(([, r]) => r.ok) ? 'ok' : 'degraded',
    service: 'api',
    time: new Date().toISOString(),
    checks: Object.fromEntries(entries),
  };
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  return type.includes('application/json') ? res.json() : null;
}

/** Revisiones reales contra la infraestructura. */
export function createDefaultChecks(config: Config): Record<string, Check> {
  const t = config.HEALTH_TIMEOUT_MS;
  return {
    mysql: async () => {
      const conn = await mysql.createConnection({ uri: config.DATABASE_URL, connectTimeout: t });
      try {
        const [rows] = await conn.query('SELECT VERSION() AS version');
        return { version: (rows as Array<{ version: string }>)[0]?.version };
      } finally {
        await conn.end();
      }
    },
    redis: async () => {
      const redis = new Redis(config.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: t,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
      });
      try {
        await redis.connect();
        return { pong: await redis.ping() };
      } finally {
        redis.disconnect();
      }
    },
    minio: async () => {
      await fetchJson(`${config.MINIO_ENDPOINT}/minio/health/live`, t);
      return null;
    },
    ollama: async () => {
      const data = (await fetchJson(`${config.OLLAMA_URL}/api/tags`, t)) as {
        models?: Array<{ name: string }>;
      };
      const installed = (data.models ?? []).map((m) => m.name);
      const required = [config.OLLAMA_VISION_MODEL, config.OLLAMA_TEXT_MODEL];
      return { installed, missing: required.filter((m) => !installed.includes(m)) };
    },
    ai: async () => fetchJson(`${config.AI_SERVICE_URL}/health`, t),
  };
}
