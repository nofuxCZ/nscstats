import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader, NP, Pg } from '../components/Shared';

export default function NationPage() {
  const [D, setD] = useState(null);
  const [sel, setSel] = useState("Calypso");
  const [hp, setHp] = useState(0);
  useEffect(() => { loadData("nations").then(setD); }, []);
  if (!D) return <Loader />;

  const p = D.p[sel];
  if (!p) return <div style={{ padding: 40, color: "var(--text-30)" }}>Select a nation</div>;

  const h = p.h || [];
  const PS = 25;
  const tp = Math.ceil(h.length / PS);
  const hs = [...h].reverse().slice(hp * PS, (hp + 1) * PS);

  // Compute extra stats from history
  const extra = useMemo(() => {
    if (!h.length) return {};
    // h format: [edition, sfStage, sfPlace, sfPts, gfPlace, gfPts, artist, song]
    let nqStreak = 0, maxNq = 0, pqStreak = 0, maxPq = 0;
    let rejuQ = 0, justMissed = 0, sfLast = 0;
    for (const r of h) {
      const [, sfS, sfP, , gfP] = r;
      const dnq = sfS && !gfP;
      if (dnq) { nqStreak++; maxNq = Math.max(maxNq, nqStreak); pqStreak = 0; }
      else if (gfP) { pqStreak++; maxPq = Math.max(maxPq, pqStreak); nqStreak = 0; }
      // #11 in SF = just missed
      if (sfP === 11 && !gfP) justMissed++;
      // SF last place (crude: sfP >= 20)
      if (sfS && sfP) {
        // We don't know exact SF size, but if sfP is high and DNQ...
      }
    }
    return { maxNq, maxPq, justMissed };
  }, [h]);

  const St = ({ v, l, c = "var(--blue)", sub }) => (
    <div style={{ textAlign: "center", padding: "12px 8px", minWidth: 72 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: c, lineHeight: 1.1 }}>{v ?? "—"}</div>
      <div style={{ fontSize: 9, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{l}</div>
      {sub && <div style={{ fontSize: 9, color: "var(--text-15)", marginTop: 1 }}>{sub}</div>}
    </div>
  );

  // Highlight badges
  const badges = [];
  if (p.w > 0) badges.push({ icon: "🏆", text: p.w + " win" + (p.w > 1 ? "s" : "") });
  if (p.t3 > 0) badges.push({ icon: "🥈", text: p.t3 + " podium finishes" });
  if (p.t6 > 0) badges.push({ icon: "⭐", text: p.t6 + " top-6 (PQ) finishes" });
  if (p.bs > 0) badges.push({ icon: "🔥", text: p.bs + "-edition GF streak" });
  if (p.ta) badges.push({ icon: "♫", text: "Most sent: " + p.ta + " (" + p.tac + "×)" });
  if (p.gl > 0) badges.push({ icon: "📉", text: p.gl + " last place" + (p.gl > 1 ? "s" : "") + " in GF" });
  if (p.sfD > 0) badges.push({ icon: "❌", text: p.sfD + " SF elimination" + (p.sfD > 1 ? "s" : "") });
  if (extra.maxNq > 1) badges.push({ icon: "💀", text: extra.maxNq + "-edition NQ streak" });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      <div style={{ fontSize: 11, color: "var(--text-20)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Nation Profile</div>

      <NP nations={D.l} sel={sel} onSel={n => { setSel(n); setHp(0); }} color="var(--blue)" />

      <div className="fi" key={sel} style={{
        marginTop: 24, background: "var(--nation-card-bg)", border: "1px solid var(--nation-card-border)",
        borderRadius: 16, padding: "28px 32px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,42px)", fontWeight: 900,
              background: p.w > 0 ? "var(--grad-title)" : "var(--grad-blue-purple)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1,
            }}>{sel}</h1>
            <div style={{ fontSize: 13, color: "var(--text-35)", marginTop: 6 }}>
              Active since #{p.fe} · Last seen in #{p.le} · {p.te} editions total
            </div>
          </div>
          {p.w > 0 && (
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: Math.min(p.w, 12) }).map((_, i) => (
                <span key={i} style={{ fontSize: 20 }} title={"Win: Edition " + (p.we[i] || "?")}>🏆</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 20, background: "var(--card-dark)", borderRadius: 12, padding: "6px 2px" }}>
          <St v={p.gf} l="GF Entries" c="var(--gold)" />
          <St v={p.w} l="Wins" c={p.w > 0 ? "var(--gold)" : "var(--text-30)"} />
          <St v={p.t3} l="Podiums" c="var(--silver)" />
          <St v={p.t6} l="Top 6" c="var(--blue)" />
          <St v={p.bp} l="Best" c="var(--gold)" sub="GF place" />
          <St v={p.apl} l="Avg" c="var(--text-60)" sub="GF place" />
          <St v={p.ap} l="Avg" c="var(--text-60)" sub="GF pts" />
          <St v={p.bpts} l="Best" c="var(--purple)" sub="GF score" />
          <St v={p.qr !== null ? p.qr + "%" : "—"} l="QF Rate" c={p.qr >= 70 ? "var(--green)" : p.qr >= 50 ? "var(--gold)" : "var(--red)"} sub={p.sfQ + "/" + p.sf} />
          <St v={p.bs} l="Best" c="var(--text-45)" sub="GF streak" />
          <St v={p.gl} l="Last" c="var(--red)" sub="GF places" />
          <St v={p.sfD} l="Last" c="var(--text-45)" sub="SF places" />
        </div>

        {/* Highlight badges */}
        {badges.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {badges.map((b, i) => (
              <div key={i} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
                background: "var(--text-03)", border: "1px solid var(--border)", color: "var(--text-60)",
              }}>{b.icon} {b.text}</div>
            ))}
          </div>
        )}
      </div>

      {/* Edition History */}
      {h.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-60)", marginBottom: 10 }}>
            Edition History ({h.length} editions)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px", minWidth: 700 }}>
              <thead>
                <tr>
                  {["Ed.", "SF", "SF Pl.", "SF Pts", "GF Pl.", "GF Pts", "Artist", "Song"].map((hd, i) => (
                    <th key={hd} style={{
                      padding: "10px 10px", fontSize: 11, fontWeight: 600,
                      color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px",
                      textAlign: ["center","center","center","right","center","right","left","left"][i],
                      borderBottom: "1px solid var(--border-08)",
                      width: [48, 50, 52, 56, 56, 56, null, null][i],
                    }}>{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hs.map(r => {
                  const [e, sfS, sfP, sfPt, gfP, gfPt, art, song] = r;
                  const isW = gfP === 1;
                  const isM = gfP && gfP <= 3;
                  const isPq = gfP && gfP >= 4 && gfP <= 6;
                  const dnq = sfS && !gfP;
                  const mc = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };
                  const bg = isW ? "rgba(255,215,0,0.05)" : isM ? "var(--text-02)" :
                    isPq ? "var(--blue-glow-02)" : dnq ? "rgba(255,80,80,0.02)" : "transparent";
                  return (
                    <tr key={e}>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--text-25)", fontFamily: "var(--font-display)", background: bg, borderRadius: "8px 0 0 8px" }}>{e}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", background: bg }}>
                        {sfS ? <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: sfS === "SF1" ? "var(--blue-glow-15)" : "var(--purple-glow-15)", color: sfS === "SF1" ? "var(--blue)" : "var(--purple)" }}>{sfS}</span>
                          : gfP ? <span style={{ fontSize: 10, color: "var(--gold-text-40)", fontWeight: 600 }}>PQ</span>
                          : <span style={{ color: "var(--text-10)" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 13, color: sfP ? "var(--text-45)" : "var(--text-15)", background: bg }}>{sfP || "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 13, color: sfPt ? "var(--text-40)" : "var(--text-10)", background: bg }}>{sfPt || "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", background: bg }}>
                        {mc[gfP] ? <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", fontWeight: 700, fontSize: 12, background: mc[gfP], color: "var(--btn-body)" }}>{gfP}</span>
                          : isPq ? <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", fontWeight: 700, fontSize: 12, background: "var(--blue-glow-20)", border: "1.5px solid var(--blue-glow-50)", color: "var(--blue)" }}>{gfP}</span>
                          : dnq ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red-text)", background: "var(--red-light)", padding: "2px 8px", borderRadius: 4 }}>DNQ</span>
                          : gfP ? <span style={{ color: "var(--text-45)" }}>{gfP}</span>
                          : <span style={{ color: "var(--text-10)" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: 13, background: bg, color: isW ? "var(--gold)" : isM ? "var(--text-60)" : gfPt ? "var(--text-45)" : "var(--text-10)" }}>{gfPt || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, color: dnq ? "var(--text-30)" : "var(--text-60)", background: bg, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{art || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, fontStyle: "italic", color: dnq ? "var(--text-20)" : "var(--text-40)", background: bg, borderRadius: "0 8px 8px 0", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pg p={hp} t={tp} set={setHp} />
        </div>
      )}
    </div>
  );
}
