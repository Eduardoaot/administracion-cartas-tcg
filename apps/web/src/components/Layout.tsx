import { Link, Outlet } from 'react-router';

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Bóveda <span className="text-amber-400">TCG</span>
        </Link>
      </header>
      <main className="flex-1 pb-8">
        <Outlet />
      </main>
      <footer className="py-4 text-xs text-slate-500">
        Toda la IA corre en tu equipo. Ninguna foto sale de tu servidor.
      </footer>
    </div>
  );
}
