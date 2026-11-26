import { useQuery } from '@tanstack/react-query';
import { fetchHealth, missingModels, SERVICE_LABELS } from '../lib/health';

function StatusDot({ ok }: { ok: boolean | undefined }) {
  const color = ok === undefined ? 'bg-slate-500' : ok ? 'bg-emerald-500' : 'bg-rose-500';
  return <span aria-hidden className={`inline-block size-3 shrink-0 rounded-full ${color}`} />;
}

function StatusRow({
  label,
  ok,
  note,
  testId,
}: {
  label: string;
  ok: boolean | undefined;
  note?: string;
  testId: string;
}) {
  const text = ok === undefined ? 'Revisando…' : ok ? 'En línea' : 'Sin respuesta';
  return (
    <li
      data-testid={testId}
      data-ok={ok === undefined ? 'pending' : String(ok)}
      className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3"
    >
      <StatusDot ok={ok} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        {note && <p className="truncate text-xs text-slate-400">{note}</p>}
      </div>
      <span className="text-sm text-slate-300">{text}</span>
    </li>
  );
}

export function HomePage() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 10_000,
  });

  const apiOk = isPending ? undefined : !isError;
  const checks = data?.checks ?? {};
  const aiOk = isPending ? undefined : isError ? false : checks.ai?.ok;
  const others = Object.entries(checks).filter(([name]) => name !== 'ai');
  const missing = missingModels(data);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estado del sistema</h1>
        <p className="mt-1 text-sm text-slate-400">
          Fase 0: revisa que todos los servicios estén en línea.
        </p>
      </div>

      <ul className="space-y-2">
        <StatusRow
          testId="status-api"
          label="API"
          ok={apiOk}
          note={isError ? (error as Error).message : undefined}
        />
        <StatusRow testId="status-ai" label={SERVICE_LABELS.ai} ok={aiOk} note={checks.ai?.error} />
      </ul>

      {others.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Infraestructura
          </h2>
          <ul className="space-y-2">
            {others.map(([name, r]) => (
              <StatusRow
                key={name}
                testId={`status-${name}`}
                label={SERVICE_LABELS[name] ?? name}
                ok={r.ok}
                note={r.ok ? `${r.latencyMs} ms` : r.error}
              />
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          <p className="font-semibold text-amber-300">Faltan modelos de Ollama</p>
          <p className="mt-1 text-slate-300">Descárgalos con:</p>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-xs">
            {missing.map((m) => `docker compose exec ollama ollama pull ${m}`).join('\n')}
          </pre>
        </div>
      )}

      <button
        type="button"
        onClick={() => void refetch()}
        disabled={isFetching}
        className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60 sm:w-auto"
      >
        {isFetching ? 'Revisando…' : 'Volver a revisar'}
      </button>
    </section>
  );
}
