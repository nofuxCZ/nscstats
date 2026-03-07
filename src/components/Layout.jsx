import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const navItems = [
  { path: '/', label: 'Overview' },
  { path: '/database', label: 'Database' },
  { path: '/editions', label: 'Editions' },
  { path: '/nations', label: 'Nations' },
  { path: '/records', label: 'Records' },
  { path: '/voting', label: 'Voting' },
  { path: '/scoreboard', label: 'Scoreboard' },
  { path: '/validation', label: 'Validation' },
  { path: '/roster', label: 'Roster' },
];

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          <NavLink to="/" className="nav-logo">NSC Stats</NavLink>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nl${isActive ? ' on' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <button className="theme-toggle" onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <a href="https://nationsongcontest.miraheze.org" target="_blank" rel="noreferrer"
            className="nl" style={{ fontSize: 12 }}>Wiki ↗</a>
        </div>
      </nav>
      {children}
      <footer style={{
        textAlign: "center", padding: "32px 24px",
        borderTop: "1px solid var(--border)",
        fontSize: 12, color: "var(--text-15)",
      }}>
        NSC Statistics · Data from{' '}
        <a href="https://nationsongcontest.miraheze.org" style={{ color: "var(--gold-text-40)" }}>nscwiki.com</a>
        {' '}· Updated every 14 days
      </footer>
    </>
  );
}
