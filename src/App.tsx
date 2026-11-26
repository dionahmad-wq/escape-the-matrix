import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CatalogPage } from '@/features/catalog/CatalogPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="katalog" element={<CatalogPage />} />
        <Route path="*" element={<p className="text-slate-600">Seite nicht gefunden.</p>} />
      </Route>
    </Routes>
  );
}
