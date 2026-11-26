import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from './HomePage';
import type { HealthReport } from '../lib/health';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  );
}

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, ...response }));
}

const report = (aiOk: boolean, missing: string[] = []): HealthReport => ({
  status: aiOk ? 'ok' : 'degraded',
  service: 'api',
  time: new Date().toISOString(),
  checks: {
    ai: aiOk ? { ok: true, latencyMs: 3 } : { ok: false, latencyMs: 3, error: 'HTTP 502' },
    mysql: { ok: true, latencyMs: 2 },
    ollama: { ok: true, latencyMs: 4, detail: { installed: [], missing } },
  },
});

afterEach(() => vi.unstubAllGlobals());

describe('HomePage', () => {
  it('muestra api e ia en verde cuando ambos responden', async () => {
    mockFetch({ json: async () => report(true) });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('status-api')).toHaveAttribute('data-ok', 'true'),
    );
    expect(screen.getByTestId('status-ai')).toHaveAttribute('data-ok', 'true');
  });

  it('muestra la IA en rojo si el api la reporta caída', async () => {
    mockFetch({ json: async () => report(false) });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('status-ai')).toHaveAttribute('data-ok', 'false'),
    );
    expect(screen.getByText('HTTP 502')).toBeInTheDocument();
  });

  it('muestra api e ia en rojo si el api no responde', async () => {
    mockFetch({ ok: false, status: 502 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('status-api')).toHaveAttribute('data-ok', 'false'),
    );
    expect(screen.getByTestId('status-ai')).toHaveAttribute('data-ok', 'false');
  });

  it('indica cómo descargar los modelos faltantes', async () => {
    mockFetch({ json: async () => report(true, ['llama3.2:3b']) });
    renderPage();
    expect(
      await screen.findByText(/docker compose exec ollama ollama pull llama3.2:3b/),
    ).toBeInTheDocument();
  });
});
