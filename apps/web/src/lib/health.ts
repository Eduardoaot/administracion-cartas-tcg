export type CheckResult = {
  ok: boolean;
  latencyMs: number;
  detail?: unknown;
  error?: string;
};

export type HealthReport = {
  status: 'ok' | 'degraded';
  service: 'api';
  time: string;
  checks: Record<string, CheckResult>;
};

export async function fetchHealth(): Promise<HealthReport> {
  const res = await fetch('/api/health', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`El api respondió ${res.status}`);
  return (await res.json()) as HealthReport;
}

export const SERVICE_LABELS: Record<string, string> = {
  ai: 'Servicio de IA',
  mysql: 'MySQL',
  redis: 'Redis',
  minio: 'MinIO (archivos)',
  ollama: 'Ollama (LLM local)',
};

/** Modelos de Ollama configurados que aún no se han descargado. */
export function missingModels(report: HealthReport | undefined): string[] {
  const detail = report?.checks.ollama?.detail as { missing?: string[] } | undefined;
  return detail?.missing ?? [];
}
