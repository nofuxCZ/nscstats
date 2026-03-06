import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, Component } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import { Loader } from './components/Shared';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ color: "var(--red)", fontFamily: "var(--font-display)", marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ fontSize: 13, color: "var(--text-60)", whiteSpace: "pre-wrap", background: "var(--input-bg)", padding: 16, borderRadius: 8 }}>
            {this.state.error.message}
          </pre>
          <button className="xb" style={{ marginTop: 12 }} onClick={() => { this.setState({ error: null }); window.location.hash = ""; }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const HomePage = lazy(() => import('./pages/HomePage'));
const DatabasePage = lazy(() => import('./pages/DatabasePage'));
const EditionPage = lazy(() => import('./pages/EditionPage'));
const NationPage = lazy(() => import('./pages/NationPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
const VotingPage = lazy(() => import('./pages/VotingPage'));
const VotingScoreboard = lazy(() => import('./pages/VotingScoreboard'));
const RosterPage = lazy(() => import('./pages/RosterPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/database" element={<DatabasePage />} />
            <Route path="/editions" element={<EditionPage />} />
            <Route path="/nations" element={<NationPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/voting" element={<VotingPage />} />
            <Route path="/scoreboard" element={<VotingScoreboard />} />
            <Route path="/roster" element={<RosterPage />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
      <Analytics />
    </BrowserRouter>
  );
}
