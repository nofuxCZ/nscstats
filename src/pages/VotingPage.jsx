import { useState, useEffect, useMemo, useCallback } from 'react';
import { loadData } from '../data/loader';
import { Loader, NP } from '../components/Shared';

function SimBar({ v }) {
  const c = v > 60 ? "var(--gold)" : v > 40 ? "var(--blue)" : "var(--text-40)";
  return (
    <div style={{ width: "100%", height: 8, background: "var(--sim-bar-bg)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, v)}%`, height: "100%", borderRadius: 4, background: c, opacity: 0.8 }} />
    </div>
  );
}

function PtsBar({ v, mx, c = "var(--blue)" }) {
  return (
    <div style={{ width: "100%", height: 6, background: "var(--sim-bar-bg)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, (v / Math.max(mx, 1)) * 100)}%`, height: "100%", borderRadius: 3, background: c, opacity: 0.7 }} />
    </div>
  );
}

function NPanel({ names, loveLists, idx, top, color }) {
  if (idx == null) return null;
  const tgt = loveLists.filter(l => l[0] === idx).sort((a, b) => b[2] - a[2]).slice(0, 8).map(l => ({ to: l[1], t: l[2], c: l[3] }));
  const src = loveLists.filter(l => l[1] === idx).sort((a, b) => b[2] - a[2]).slice(0, 8).map(l => ({ fr: l[0], t: l[2], c: l[3] }));

  const Sec = ({ title, items, renderItem }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, color: "var(--text-35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      {items.map(renderItem)}
    </div>
  );

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color, marginBottom: 16 }}>{names[idx]}</h3>
      <Sec title="Most Similar Voters" items={top.slice(0, 8)} renderItem={(r, i) => (
        <div key={r.i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ width: 16, fontSize: 12, fontWeight: 700, color: i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : "var(--text-25)", textAlign: "right" }}>{i + 1}</span>
          <span style={{ width: 110, fontSize: 13, fontWeight: 500, color: "var(--text-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names[r.i]}</span>
          <div style={{ flex: 1 }}><SimBar v={r.s} /></div>
          <span style={{ width: 48, fontSize: 12, fontWeight: 700, color, textAlign: "right" }}>{r.s}%</span>
        </div>
      )} />
      <Sec title="Most Points Given To" items={tgt} renderItem={(x, i) => (
        <div key={x.to} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 16, fontSize: 12, fontWeight: 700, color: "var(--text-25)", textAlign: "right" }}>{i + 1}</span>
          <span style={{ width: 110, fontSize: 13, color: "var(--text-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names[x.to]}</span>
          <div style={{ flex: 1 }}><PtsBar v={x.t} mx={tgt[0]?.t || 1} c={color} /></div>
          <span style={{ width: 50, fontSize: 12, color: "var(--text-40)", textAlign: "right" }}>{x.t} ({x.c}x)</span>
        </div>
      )} />
      <Sec title="Most Points Received From" items={src} renderItem={(x, i) => (
        <div key={x.fr} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 16, fontSize: 12, fontWeight: 700, color: "var(--text-25)", textAlign: "right" }}>{i + 1}</span>
          <span style={{ width: 110, fontSize: 13, color: "var(--text-60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names[x.fr]}</span>
          <div style={{ flex: 1 }}><PtsBar v={x.t} mx={src[0]?.t || 1} c={color} /></div>
          <span style={{ width: 50, fontSize: 12, color: "var(--text-40)", textAlign: "right" }}>{x.t} ({x.c}x)</span>
        </div>
      )} />
    </div>
  );
}

export default function VotingPage() {
  const [D, setD] = useState(null);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null);
  const [cmp, setCmp] = useState(null);
  const [view, setView] = useState("explorer");
  const [edFrom, setEdFrom] = useState(188);
  const [edTo, setEdTo] = useState(238);
  const [minEd, setMinEd] = useState(5);
  const [allPairs, setAllPairs] = useState(null);
  const [computing, setComputing] = useState(false);
  const [catFilter, setCatFilter] = useState("all");

  useEffect(() => {
    loadData("voting").then(d => {
      setD(d);
      setEdFrom(d.e[0]);
      setEdTo(d.e[1]);
      const trollIdx = d.n.indexOf("Trollheimr");
      setSel(trollIdx >= 0 ? trollIdx : 0);
    }).catch(err => setError(err.message));
  }, []);

  const { RM, RV, AE } = useMemo(() => {
    if (!D) return { RM: new Map(), RV: new Map(), AE: [] };
    const RM = new Map(), RV = new Map();
    for (const rec of D.r) {
      const [ed, cat, vi, pairs] = rec;
      const key = ed + "_" + cat + "_" + vi;
      const m = new Map();
      for (let i = 0; i < pairs.length; i += 2) m.set(pairs[i], pairs[i + 1]);
      RM.set(key, m);
      const rk = ed + "_" + cat;
      if (!RV.has(rk)) RV.set(rk, []);
      RV.get(rk).push(vi);
    }
    const AE = [...new Set(D.r.map(r => r[0]))].sort((a, b) => a - b);
    return { RM, RV, AE };
  }, [D]);

  const MAX = 448;
  const cats = catFilter === "gf" ? [0] : catFilter === "sf" ? [1] : [0, 1];

  const csim = useCallback((v1, v2) => {
    let ts = 0, cnt = 0;
    for (const ed of AE) {
      if (ed < edFrom || ed > edTo) continue;
      if (catFilter === "all") {
        // Average GF+SF within same edition into one score
        let edScore = 0, edFound = 0;
        for (const cat of [0, 1]) {
          const m1 = RM.get(ed + "_" + cat + "_" + v1);
          const m2 = RM.get(ed + "_" + cat + "_" + v2);
          if (!m1 || !m2) continue;
          let sc = 0;
          for (const [ni, p1] of m1) { const p2 = m2.get(ni); if (p2) sc += p1 * p2; }
          edScore += sc / MAX; edFound++;
        }
        if (edFound > 0) { ts += edScore / edFound; cnt++; }
      } else {
        // Single category: each subevent counted separately
        for (const cat of cats) {
          const m1 = RM.get(ed + "_" + cat + "_" + v1);
          const m2 = RM.get(ed + "_" + cat + "_" + v2);
          if (!m1 || !m2) continue;
          let sc = 0;
          for (const [ni, p1] of m1) { const p2 = m2.get(ni); if (p2) sc += p1 * p2; }
          ts += sc / MAX; cnt++;
        }
      }
    }
    return cnt >= minEd ? { s: Math.round((ts / cnt) * 1000) / 10, n: cnt } : null;
  }, [AE, RM, edFrom, edTo, minEd, catFilter, cats]);

  const pairSim = useMemo(() => (sel != null && cmp != null) ? csim(sel, cmp) : null, [sel, cmp, csim]);

  const nTop = useMemo(() => {
    if (sel == null || !D) return [];
    const r = [];
    for (let j = 0; j < D.n.length; j++) { if (j === sel) continue; const s = csim(sel, j); if (s) r.push({ i: j, ...s }); }
    r.sort((a, b) => b.s - a.s);
    return r.slice(0, 10);
  }, [sel, csim, D]);

  const cTop = useMemo(() => {
    if (cmp == null || !D) return [];
    const r = [];
    for (let j = 0; j < D.n.length; j++) { if (j === cmp) continue; const s = csim(cmp, j); if (s) r.push({ i: j, ...s }); }
    r.sort((a, b) => b.s - a.s);
    return r.slice(0, 10);
  }, [cmp, csim, D]);

  const doAll = useCallback(() => {
    setComputing(true);
    setTimeout(() => {
      const active = new Map();
      for (const ed of AE) {
        if (ed < edFrom || ed > edTo) continue;
        if (catFilter === "all") {
          var edVoters = new Set();
          for (const cat of [0, 1]) { const vs = RV.get(ed + "_" + cat) || []; for (const vi of vs) edVoters.add(vi); }
          for (const vi of edVoters) active.set(vi, (active.get(vi) || 0) + 1);
        } else {
          for (const cat of cats) { const vs = RV.get(ed + "_" + cat) || []; for (const vi of vs) active.set(vi, (active.get(vi) || 0) + 1); }
        }
      }
      const avs = [...active.entries()].filter(([, c]) => c >= minEd).map(([vi]) => vi).sort((a, b) => a - b);
      const pairs = [];
      for (let i = 0; i < avs.length; i++) for (let j = i + 1; j < avs.length; j++) { const r = csim(avs[i], avs[j]); if (r) pairs.push({ a: avs[i], b: avs[j], ...r }); }
      pairs.sort((a, b) => b.s - a.s);
      setAllPairs(pairs); setComputing(false);
    }, 50);
  }, [AE, RV, edFrom, edTo, minEd, csim, catFilter, cats]);

  const subLabel = catFilter === "all" ? "editions" : "subevents";

  const xCSV = () => {
    if (!allPairs || !D) return;
    const h = "Voter 1,Voter 2,Similarity %,Shared " + (catFilter === "all" ? "Editions" : "Subevents") + "\n";
    const b = allPairs.map(p => '"' + D.n[p.a] + '","' + D.n[p.b] + '",' + p.s + ',' + p.n).join("\n");
    const bl = new Blob(["\uFEFF" + h + b], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "nsc_voting_similarity.csv"; a.click();
  };

  if (error) return <div style={{ padding: 40, color: "var(--red)" }}>Error: {error}</div>;
  if (!D) return <Loader t="Loading voting data..." />;

  const nn = D.n;
  const iStyle = { width: 60, padding: "6px 8px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "linear-gradient(135deg, var(--text), var(--purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>Voting Analysis</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 4 }}>{nn.length} nations · Editions {D.e[0]}–{D.e[1]}</p>
      <p style={{ fontSize: 11, color: "var(--text-20)", marginBottom: 12 }}>Similarity = avg(sum(pts1 × pts2) / 448) per {catFilter === "all" ? "edition (GF+SF averaged)" : "subevent"}. Computed live in your browser.</p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-30)" }}>Editions</span>
        <input type="number" value={edFrom} onChange={e => { setEdFrom(Number(e.target.value)); setAllPairs(null); }} style={iStyle} />
        <span style={{ color: "var(--text-15)" }}>to</span>
        <input type="number" value={edTo} onChange={e => { setEdTo(Number(e.target.value)); setAllPairs(null); }} style={iStyle} />
        <span style={{ fontSize: 11, color: "var(--text-30)", marginLeft: 8 }}>Min. shared</span>
        <input type="number" value={minEd} onChange={e => { setMinEd(Number(e.target.value) || 1); setAllPairs(null); }} style={{ ...iStyle, width: 50 }} />
        <span style={{ fontSize: 11, color: "var(--text-30)", marginLeft: 8 }}>Subevent</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[["all", "All"], ["gf", "GF"], ["sf", "SF"]].map(([k, l]) => (
            <button key={k} className={"fb " + (catFilter === k ? "on" : "")}
              onClick={() => { setCatFilter(k); setAllPairs(null); }}
              style={{ fontSize: 11, padding: "3px 10px" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 16 }}>
        {[["explorer", "Nation Explorer"], ["leaderboard", "All Pairs"]].map(([k, l]) => (
          <button key={k} className={"tt " + (view === k ? "on" : "")} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      {view === "explorer" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <NP nations={nn} sel={sel != null ? nn[sel] : null} onSel={n => setSel(n ? nn.indexOf(n) : null)} label="Primary Nation" color="var(--blue)" />
            <NP nations={nn} sel={cmp != null ? nn[cmp] : null} onSel={n => setCmp(n ? nn.indexOf(n) : null)} label="Compare With" color="var(--purple)" />
          </div>
          {sel != null && cmp != null && (
            <div style={{ background: "var(--text-03)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px", marginBottom: 24, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--blue)" }}>{nn[sel]}</span>
                <span style={{ color: "var(--text-20)" }}>↔</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--purple)" }}>{nn[cmp]}</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 900, color: pairSim ? (pairSim.s > 60 ? "var(--gold)" : pairSim.s > 40 ? "var(--blue)" : "var(--text-45)") : "var(--text-20)" }}>{pairSim ? pairSim.s + "%" : "N/A"}</div>
              <div style={{ fontSize: 11, color: "var(--text-30)" }}>VOTING SIMILARITY{pairSim ? " · " + pairSim.n + " shared " + subLabel : ""}</div>
            </div>
          )}
          <div className="g2" style={{ display: "grid", gridTemplateColumns: cmp != null ? "1fr 1fr" : "1fr", gap: 20 }}>
            {sel != null && <NPanel names={nn} loveLists={D.l} idx={sel} top={nTop} color="var(--blue)" />}
            {cmp != null && <NPanel names={nn} loveLists={D.l} idx={cmp} top={cTop} color="var(--purple)" />}
          </div>
        </div>
      )}

      {view === "leaderboard" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <button className="xb" onClick={doAll} disabled={computing}>{computing ? "Computing..." : "Compute All Pairs"}</button>
            {allPairs && <button className="xb" onClick={xCSV}>Export CSV ({allPairs.length} pairs)</button>}
          </div>
          {!allPairs && !computing && <div style={{ padding: 32, textAlign: "center", color: "var(--text-25)" }}>Click "Compute All Pairs" to generate the full similarity matrix.</div>}
          {computing && <div style={{ padding: 32, textAlign: "center", color: "var(--gold)" }}>Computing...</div>}
          {allPairs && (
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px" }}>
              <thead><tr>
                {["#", "Nation A", "Nation B", "Similarity", catFilter === "all" ? "Ed." : "Sub."].map((h, i) => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", textAlign: i >= 3 ? "center" : "left", borderBottom: "1px solid var(--border-08)", width: [36, null, null, 160, 60][i] }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {allPairs.slice(0, 100).map((p, i) => (
                  <tr key={p.a + "-" + p.b} style={{ cursor: "pointer" }} onClick={() => { setSel(p.a); setCmp(p.b); setView("explorer"); }}>
                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700, color: i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : "var(--text-25)", borderRadius: "8px 0 0 8px" }}>{i + 1}</td>
                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>{nn[p.a]}</td>
                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "var(--purple)" }}>{nn[p.b]}</td>
                    <td style={{ padding: "8px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><SimBar v={p.s} /><span style={{ fontWeight: 700, fontSize: 13, color: p.s > 60 ? "var(--gold)" : "var(--blue)", minWidth: 48, textAlign: "right" }}>{p.s}%</span></div></td>
                    <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 13, color: "var(--text-40)", borderRadius: "0 8px 8px 0" }}>{p.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
