import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import { Loader } from './components/Shared';

const HomePage = lazy(() => import('./pages/HomePage'));
const DatabasePage = lazy(() => import('./pages/DatabasePage'));
const EditionPage = lazy(() => import('./pages/EditionPage'));
const NationPage = lazy(() => import('./pages/NationPage'));
const VotingPage = lazy(() => import('./pages/VotingPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/database" element={<DatabasePage />} />
            <Route path="/editions" element={<EditionPage />} />
            <Route path="/nations" element={<NationPage />} />
            <Route path="/voting" element={<VotingPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
