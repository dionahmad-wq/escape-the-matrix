import { Link } from 'react-router-dom';
import { catalog } from '@/data/catalog';
import { computeCatalogStats } from '@/domain/catalog';
import { CATEGORY_LIST } from '@/domain/categories';

export function DashboardPage() {
  const stats = computeCatalogStats(catalog.questions);
  const errors = catalog.issues.filter((i) => i.severity === 'error').length;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Führerschein Klasse B: Theorie</h1>
        <p className="mt-2 text-slate-600">
          Lernmodi, Prüfungssimulation und Statistiken folgen in den nächsten Meilensteinen. Hier siehst du den
          aktuell geladenen Fragenkatalog.
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Fragen" value={stats.total} />
        <Stat label="Grundstoff" value={stats.byMaterial.grundstoff ?? 0} />
        <Stat label="Zusatzstoff" value={stats.byMaterial.zusatzstoff ?? 0} />
        <Stat label="Mit Bild" value={stats.withMedia} />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Themenbereiche</h2>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {CATEGORY_LIST.map((c) => (
            <li key={c.id}>
              <Link
                to={`/katalog?kategorie=${c.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-sm text-slate-500">{c.description}</div>
                </div>
                <span className="shrink-0 tabular-nums text-slate-700">{stats.byCategory[c.id] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Geladene Katalogdateien</h2>
        <ul className="text-sm space-y-1">
          {catalog.files.map((f) => (
            <li key={f.name} className="flex justify-between gap-4">
              <span className="font-mono text-slate-600 truncate">{f.name}</span>
              <span className="tabular-nums text-slate-500 shrink-0">
                {f.count} · {f.meta.source} · v{f.meta.version}
              </span>
            </li>
          ))}
        </ul>
        {catalog.issues.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            {errors} Fehler und {catalog.issues.length - errors} Warnungen beim Laden, Details mit <code>npm run validate</code>.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
