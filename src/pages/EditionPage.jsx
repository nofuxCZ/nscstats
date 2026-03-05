import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader, SC, PL, YtLink } from '../components/Shared';

export default function EditionPage() {
  const [D, setD] = useState(null);
  const [ed, setEd] = useState(null);
  const [tab, setTab] = useState("gf");

  useEffect(() => {
    loadData("editions").then(d => {
      setD(d);
      const eds = Object.keys(d).map(Number).sort((a, b) => a - b);
      setEd(eds[eds.length - 1]);
    });
  }, []);

  if (!D || !ed) return <Loader />;

  const allEds = Object.keys(D).map(Number).sort((a, b) => a - b);
  const e = D[String(ed)];
  if (!e) return <div style={{ padding: 40, color: "var(--text-30)" }}>Edition not found</div>;
  const m = e.m;

  const tabs = [];
  if (e.sf1 && e.sf1.length) tabs.push({ k: "sf1", l: "Semifinal 1", n: e.sf1.length });
  if (e.sf2 && e.sf2.length) tabs.push({ k: "sf2", l: "Semifinal 2", n: e.sf2.length });
  if (e.mpq && e.mpq.length) tabs.push({ k: "mpq", l: "Microstate QF", n: e.mpq.length });
  if (e.gf && e.gf.length) tabs.push({ k: "gf", l: "Grand Final", n: e.gf.length });

  const ct = tabs.find(t => t.k === tab) ? tab : tabs.length ? tabs[tabs.length - 1].k : "gf";
  const td = [...(e[ct] || [])].sort((a, b) => (a[4] ?? 999) - (b[4] ?? 999));
  const gfN = new Set((e.gf || []).map(x => x[1]));
  const reju = ct === "sf1" ? m.r1 : ct === "sf2" ? m.r2 : null;

  const facts = [];
  if (m.nw) {
    facts.push(m.nw === 1 ? `✨ First victory for ${m.w}!` :
      `🏆 ${m.nw}${m.nw === 2 ? "nd" : m.nw === 3 ? "rd" : "th"} win for ${m.w} (${m.tw} total)`);
  }
  if (m.mg !== null && m.mg !== undefined) {
    facts.push(m.mg === 0 ? `⚡ Dead heat with ${m.ru}!` :
      m.mg <= 3 ? `🔥 ${m.mg}-point margin over ${m.ru}` :
      `📊 ${m.mg}-point margin over ${m.ru} (${m.rup} pts)`);
  }

  const ei = allEds.indexOf(ed);
  const SN_NAMES = ["GF", "SF1", "SF2", "MPQ"];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      {/* Edition Navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <button className="fb" disabled={ei <= 0} onClick={() => { setEd(allEds[ei - 1]); setTab("gf"); }}>
          ← #{allEds[ei - 1] || "—"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select value={ed} onChange={ev => { setEd(Number(ev.target.value)); setTab("gf"); }}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 15, fontWeight: 700,
              background: "var(--input-bg)", border: "1px solid var(--border-10)",
              color: "var(--gold)", cursor: "pointer", fontFamily: "var(--font-display)",
            }}>
            {allEds.map(e => <option key={e} value={e} style={{ background: "var(--dropdown-bg)", color: "var(--text)" }}>#{e}</option>)}
          </select>
        </div>
        <button className="fb" disabled={ei >= allEds.length - 1} onClick={() => { setEd(allEds[ei + 1]); setTab("gf"); }}>
          #{allEds[ei + 1] || "—"} →
        </button>
      </div>

      {/* Winner Banner */}
      <div className="fi" key={ed} style={{
        background: "var(--winner-card-bg)", border: "1px solid var(--winner-card-border)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 20, position: "relative", overflow: "hidden",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
          Nation Song Contest #{ed}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 900, color: "var(--text)" }}>
          {m.w || "—"}
        </div>
        <div style={{ fontSize: 15, color: "var(--text-60)", marginTop: 4 }}>
          {m.wa} — <em>"{m.ws}"</em>
        </div>
        <div style={{
          marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--gold-glow-12)", border: "1px solid var(--gold-glow-25)",
          borderRadius: 20, padding: "4px 14px", fontSize: 14, fontWeight: 700, color: "var(--gold)",
        }}>🏆 {m.wp} pts</div>

        {facts.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
            {facts.map((f, i) => (
              <div key={i} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 12,
                background: "var(--text-03)", border: "1px solid var(--border)",
                color: "var(--text-45)",
              }}>{f}</div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          {[[m.gs, "Grand Final", SC.GF],
            m.s1 > 0 && [m.s1, "Semi 1", SC.SF1],
            m.s2 > 0 && [m.s2, "Semi 2", SC.SF2],
            m.ms > 0 && [m.ms, "Micro QF", SC.MPQ],
          ].filter(Boolean).map(([v, l, c]) => (
            <div key={l}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: "var(--font-display)" }}>{v}</div>
              <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 0.8 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 16, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.k} className={`tt ${ct === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>
            {t.l} ({t.n})
          </button>
        ))}
      </div>

      {/* SF Legend */}
      {(ct === "sf1" || ct === "sf2") && (
        <div style={{ fontSize: 12, color: "var(--text-25)", marginBottom: 12 }}>
          <span style={{ color: "var(--blue)", fontWeight: 600 }}>Blue</span> = Qualified ·{" "}
          {reju && <><span style={{ color: "var(--purple)", fontWeight: 600 }}>Purple</span> = REJU ({reju}) · </>}
          <span style={{ opacity: 0.5 }}>Grey = DNQ</span>
        </div>
      )}
      {ct === "gf" && <PL />}

      {/* Results Table */}
      <div className="fi" key={`${ed}-${ct}`} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 700 }}>
          <thead>
            <tr>
              {["Draw", "Nation", "Artist", "Song", "♫", "Place", "Points"].map((h, i) => (
                <th key={h} style={{
                  width: [40, null, null, null, 30, 50, 50][i],
                  padding: "10px 10px", fontSize: 11, fontWeight: 600,
                  color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px",
                  textAlign: ["center", "left", "left", "left", "center", "center", "right"][i],
                  borderBottom: "1px solid var(--border-08)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {td.map((r, i) => {
              const [draw, nat, art, song, place, pts, yt] = r;
              const isSF = ct === "sf1" || ct === "sf2";
              const isGF = ct === "gf";
              const qf = isSF && gfN.has(nat);
              const isReju = isSF && nat === reju;
              const dnq = isSF && !qf;
              const isWin = place === 1 && isGF;
              const isMed = place && place <= 3 && isGF;
              const isPq = place && place >= 4 && place <= 6 && isGF;
              const mc = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };

              const bg = isWin ? "rgba(255,215,0,0.04)" : isMed ? "var(--text-02)" :
                isPq ? "var(--blue-glow-02)" : isReju ? "var(--purple-glow-03)" : "transparent";
              const nc = isWin ? "var(--gold)" : isReju ? "var(--purple)" :
                (isSF && place && place <= 10) ? "var(--blue)" : dnq ? "var(--text-30)" : "var(--text)";

              return (
                <tr key={`${nat}-${i}`}>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "var(--text-25)", background: bg }}>{draw}</td>
                  <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: nc, background: bg }}>
                    {nat}
                    {isReju && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "var(--purple-glow-15)", color: "var(--purple)", fontWeight: 700 }}>REJU</span>}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 13, color: dnq ? "var(--text-20)" : "var(--text-60)", background: bg, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{art}</td>
                  <td style={{ padding: "8px 10px", fontSize: 13, fontStyle: "italic", color: dnq ? "var(--text-15)" : "var(--text-40)", background: bg, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song}</td>
                  <td style={{ padding: "8px 4px", textAlign: "center", background: bg }}><YtLink yt={yt} /></td>
                  <td style={{ padding: "8px 10px", textAlign: "center", background: bg }}>
                    {mc[place] ? (
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", fontWeight: 700, fontSize: 13, background: mc[place], color: "var(--btn-body)" }}>{place}</span>
                    ) : isPq ? (
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", fontWeight: 700, fontSize: 13, background: "var(--blue-glow-20)", border: "1.5px solid var(--blue-glow-50)", color: "var(--blue)" }}>{place}</span>
                    ) : dnq ? (
                      <span style={{ color: "var(--text-20)" }}>{place || "—"}</span>
                    ) : (
                      <span style={{ color: "var(--text-45)" }}>{place || "—"}</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: 13, background: bg, color: isWin ? "var(--gold)" : isMed ? "var(--text-60)" : dnq ? "var(--text-15)" : "var(--text-45)" }}>
                    {pts || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Wiki Link */}
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <a href={`https://nationsongcontest.miraheze.org/wiki/Nation_Song_Contest_${ed}`}
          target="_blank" rel="noreferrer"
          style={{ fontSize: 13, color: "var(--text-25)", borderBottom: "1px solid var(--text-10)", paddingBottom: 2 }}>
          View on Wiki →
        </a>
      </div>
    </div>
  );
}
