import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Übersicht', end: true },
  { to: '/katalog', label: 'Katalog' },
];

export function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between gap-4">
          <NavLink to="/" className="font-semibold tracking-tight">
            <span className="inline-block rounded bg-blue-600 text-white px-1.5 mr-1.5 text-sm">B</span>
            Theorie-Trainer
          </NavLink>
          <nav className="flex gap-1 text-sm">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 transition-colors ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-4xl px-4 py-6 text-xs text-slate-400">
        Übungsfragen sind eigene Beispielinhalte, keine amtlichen Prüfungsfragen.
      </footer>
    </div>
  );
}
