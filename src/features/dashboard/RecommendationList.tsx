import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, PartyPopper } from 'lucide-react';
import type { Recommendation } from '@/domain/stats';
import { Button } from '@/components/ui';
import { usePracticeLauncher } from '@/features/practice/usePracticeLauncher';

export function RecommendationList({ items }: { items: Recommendation[] }) {
  const navigate = useNavigate();
  const launcher = usePracticeLauncher();

  const run = (r: Recommendation) => {
    const a = r.action;
    switch (a.kind) {
      case 'quick':
        return launcher.quick();
      case 'weakness':
        return launcher.weakness();
      case 'review':
        return launcher.review();
      case 'topic':
        return launcher.topic(a.category);
      case 'new':
        return navigate('/training');
      case 'exam':
        return navigate('/pruefung');
    }
  };

  return (
    <ul className="space-y-2">
      {items.map((r) => {
        const Icon = r.tone === 'warning' ? AlertTriangle : r.tone === 'success' ? PartyPopper : Info;
        const color = r.tone === 'warning' ? 'text-amber-600' : r.tone === 'success' ? 'text-emerald-600' : 'text-blue-600';
        return (
          <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-nowrap">
            <Icon size={20} className={`shrink-0 ${color}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-slate-600">{r.text}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => run(r)} className="shrink-0">
              {r.actionLabel}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
