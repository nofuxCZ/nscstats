import { useState, useEffect } from 'react';
import { loadData } from '../data/loader';
import { Loader } from '../components/Shared';

export default function HomePage() {
  const [d, setD] = useState(null);
  useEffect(() => { loadData("homepage").then(setD); }, []);
  if (!d) return <Loader />;
  const s = d.s;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      {/* Latest Winner Banner */}
      <div style={{
        position: "relative", padding: "28px 32px",
        background: "var(--winner-card-bg)", border: "1px solid var(--winner-card-border)",
        borderRadius: 16, marginBottom: 28, overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -10, fontSize: 100, opacity: 0.04, pointerEvents: "none" }}>🏆</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
          Latest Winner — Edition #{s.le}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, color: "var(--text)" }}>{s.lw}</div>
        <div style={{ fontSize: 15, color: "var(--text-60)", marginTop: 4 }}>{s.la} — <em>"{s.ls}"</em></div>
        <div style={{
          marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--gold-glow-12)", border: "1px solid var(--gold-glow-25)",
          borderRadius: 20, padding: "4px 14px", fontSize: 14, fontWeight: 700, color: "var(--gold)",
        }}>🏆 {s.lp} points</div>
      </div>

      {/* Key Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 32 }}>
        {[[s.te, "Editions"], [s.tn, "Nations"], [s.gf, "GF Entries"], [s.sf, "SF Entries"], [s.ua, "Artists"], [s.hs, "Record Pts"]].map(([v, l]) => (
          <div key={l} style={{
            background: "var(--text-03)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "18px 16px", textAlign: "center",
          }}>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800,
              background: "var(--grad-blue-purple)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>{(v || 0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "var(--text-40)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Two-column: Top Nations + Recent Winners */}
      <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Most Successful Nations</div>
          {d.tn.slice(0, 10).map((n, i) => (
            <div key={n.n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ width: 120, fontSize: 13, color: "var(--text-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.n}</span>
              <div style={{ flex: 1, height: 22, background: "var(--text-04)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{
                  height: "100%", borderRadius: 4, width: `${(n.w / d.tn[0].w) * 100}%`,
                  background: i === 0 ? "var(--grad-winner-bar)" : i < 3 ? "var(--grad-silver-bar)" : "var(--grad-blue-bar)",
                }} />
                <span style={{ position: "absolute", right: 8, top: 2, fontSize: 12, fontWeight: 700, color: "var(--text-60)" }}>{n.w}</span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Recent Winners</div>
          {d.rw.slice(0, 12).map(w => (
            <div key={w.e} style={{ display: "grid", gridTemplateColumns: "42px 1fr 50px", padding: "6px 8px", borderBottom: "1px solid var(--text-03)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--text-25)" }}>#{w.e}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{w.n}</div>
                <div style={{ fontSize: 12, color: "var(--text-40)" }}>{w.a}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--blue)" }}>{w.p}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
