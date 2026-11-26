import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { buildHealthReport, runCheck, withTimeout } from '../src/health.js';
import { loadConfig } from '../src/config.js';

const ok = async () => ({ fine: true });
const fail = async () => {
  throw new Error('conexión rechazada');
};
const hang = () => new Promise(() => {});

describe('runCheck', () => {
  it('marca ok con detalle cuando la revisión responde', async () => {
    const r = await runCheck(ok, 100);
    expect(r.ok).toBe(true);
    expect(r.detail).toEqual({ fine: true });
  });

  it('reporta el error cuando la revisión falla', async () => {
    const r = await runCheck(fail, 100);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('conexión rechazada');
  });

  it('corta por tiempo una revisión colgada', async () => {
    const r = await runCheck(hang, 30);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Tiempo agotado/);
  });
});

describe('withTimeout', () => {
  it('resuelve antes del límite', async () => {
    await expect(withTimeout(Promise.resolve(1), 50)).resolves.toBe(1);
  });
});

describe('buildHealthReport', () => {
  it('es ok si todas las dependencias responden', async () => {
    const report = await buildHealthReport({ a: ok, b: ok }, 100);
    expect(report.status).toBe('ok');
  });

  it('es degraded si alguna dependencia falla', async () => {
    const report = await buildHealthReport({ a: ok, b: fail }, 100);
    expect(report.status).toBe('degraded');
    expect(report.checks.a.ok).toBe(true);
    expect(report.checks.b.ok).toBe(false);
  });
});

describe('GET /health', () => {
  const app = createApp({
    webOrigin: 'http://localhost:8080',
    checks: { ai: ok, mysql: fail },
    healthTimeoutMs: 100,
  });

  it('responde 200 con el estado de cada dependencia', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('api');
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.ai.ok).toBe(true);
    expect(res.body.checks.mysql.ok).toBe(false);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('aplica cabeceras de seguridad y oculta x-powered-by', async () => {
    const res = await request(app).get('/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('solo permite CORS al origen del frontend', async () => {
    const allowed = await request(app).get('/health/live').set('Origin', 'http://localhost:8080');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    const denied = await request(app)
      .get('/health/live')
      .set('Origin', 'https://malicioso.example');
    expect(denied.headers['access-control-allow-origin']).not.toBe('https://malicioso.example');
  });

  it('responde 404 en rutas desconocidas', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('loadConfig', () => {
  it('rechaza un puerto inválido', () => {
    expect(() => loadConfig({ API_PORT: 'abc' })).toThrow(/Configuración inválida/);
  });

  it('aplica valores por defecto', () => {
    const c = loadConfig({});
    expect(c.API_PORT).toBe(4000);
    expect(c.OLLAMA_VISION_MODEL).toBe('qwen3-vl:4b');
  });
});
