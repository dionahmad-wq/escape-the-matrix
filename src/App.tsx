import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { BookmarksPage } from '@/features/bookmarks/BookmarksPage';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ExamIntroPage } from '@/features/exam/ExamIntroPage';
import { ExamResultPage } from '@/features/exam/ExamResultPage';
import { ExamRunnerPage } from '@/features/exam/ExamRunnerPage';
import { PracticePage } from '@/features/practice/PracticePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StatsPage } from '@/features/stats/StatsPage';
import { TrainingPage } from '@/features/training/TrainingPage';
import { LinkButton } from '@/components/ui';

export default function App() {
  return (
    <Routes>
      {/* Ablenkungsfreie Vollbild-Ansichten ohne Navigation */}
      <Route path="lernen" element={<PracticePage />} />
      <Route path="pruefung/laufend" element={<ExamRunnerPage />} />

      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="pruefung" element={<ExamIntroPage />} />
        <Route path="pruefung/ergebnis/:id" element={<ExamResultPage />} />
        <Route path="statistik" element={<StatsPage />} />
        <Route path="katalog" element={<CatalogPage />} />
        <Route path="lesezeichen" element={<BookmarksPage />} />
        <Route path="einstellungen" element={<SettingsPage />} />
        <Route
          path="*"
          element={
            <div className="py-16 text-center">
              <p className="text-slate-600">Seite nicht gefunden.</p>
              <LinkButton to="/" className="mt-4">Zur Übersicht</LinkButton>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
