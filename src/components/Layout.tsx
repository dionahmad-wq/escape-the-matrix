import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, BookOpen, ClipboardCheck, Home, Library, Settings } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Start', icon: Home, end: true },
  { to: '/training', label: 'Lernen', icon: BookOpen },
  { to: '/pruefung', label: 'Prüfung', icon: ClipboardCheck },
  { to: '/statistik', label: 'Statistik', icon: BarChart3 },
  { to: '/katalog', label: 'Katalog', icon: Library },
];

/** Standard-Layout mit Navigation (oben auf Desktop, unten als Tab-Leiste auf dem Smartphone). */
export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Zum Inhalt springen
      </a>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-sm text-white">B</span>
            Theorie-Trainer
          </NavLink>
          <nav className="hidden gap-1 text-sm md:flex" aria-label="Hauptnavigation">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/einstellungen"
            aria-label="Einstellungen"
            className={({ isActive }) => `rounded-md p-2 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Settings size={18} />
          </NavLink>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 sm:py-10 md:pb-10">
        <Outlet />
      </main>

      <footer className="mx-auto hidden w-full max-w-5xl px-4 py-6 text-xs text-slate-400 md:block">
        Übungsfragen sind eigene Beispielinhalte, keine amtlichen Prüfungsfragen. Lernstand wird lokal im Browser gespeichert.
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Hauptnavigation"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-blue-700' : 'text-slate-500'}`}
              >
                <n.icon size={20} />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
