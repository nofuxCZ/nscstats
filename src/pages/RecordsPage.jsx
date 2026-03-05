import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader, SN } from '../components/Shared';

const TABS = [
  { k: "records", l: "All-Time Records" },
  { k: "nations", l: "Nation Leaderboards" },
  { k: "qualrate", l: "Qualification Rates" },
  { k: "artists", l: "Top Artists" },
  { k: "draws", l: "Draw Statistics" },
];

export default function RecordsPage() {
  const [db, setDb] = useState(null);
  const [nat, setNat] = useState(null);
  const [tab, setTab] = useState("records");
  const [nationBoard, setNationBoard] = useState("wins");
  const [recordType, setRecordType] = useState("gfHighPts");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Promise.all([loadData("database"), loadData("nations")])
      .then(([d, n]) => { setDb(d); setNat(n); });
  }, []);

  // Reset expand when changing tabs/subtabs
  useEffect(() => { setExpanded(false); }, [tab, nationBoard, recordType]);

  const data = useMemo(() => {
    if (!db || !nat) return null;
    const entries = db.map(r => ({
      edition: r[0], sub: r[1], draw: r[2], nation: r[3],
      artist: r[4], song: r[5], place: r[6], points: r[7],
    }));
    const gf = entries.filter(e => e.sub === 0);
    const sf = entries.filter(e => e.sub === 1 || e.sub === 2);
    const gfP = gf.filter(e => e.points != null && e.place != null);
    const sfP = sf.filter(e => e.points != null && e.place != null);

    const sortD = (a, k) => [...a].sort((x, y) => (y[k] ?? 0) - (x[k] ?? 0));
    const sortA = (a, k) => [...a].sort((x, y) => (x[k] ?? 999) - (y[k] ?? 999));

    // Records
    const records = {
      gfHighPts: sortD(gfP, "points").slice(0, 50),
      gfLowWin: sortA(gfP.filter(e => e.place === 1), "points").slice(0, 25),
      sfHighPts: sortD(sfP, "points").slice(0, 50),
      sfLowQ: sortA(sfP.filter(e => e.place <= 10), "points").slice(0, 25),
    };

    // Nation boards
    const profiles = Object.values(nat.p);
    const boards = {
      wins: sortD(profiles, "w"),
      podiums: sortD(profiles, "t3"),
      top6: sortD(profiles, "t6"),
      gfEntries: sortD(profiles, "gf"),
      editions: sortD(profiles, "te"),
      avgPlace: sortA(profiles.filter(p => p.apl != null && p.gf >= 5), "apl"),
      avgPts: sortD(profiles.filter(p => p.ap != null && p.gf >= 5), "ap"),
      bestStreak: sortD(profiles.filter(p => p.bs > 0), "bs"),
      lastPlace: sortD(profiles.filter(p => p.gl > 0), "gl"),
    };

    // Qual rates
    const qualRates = profiles.filter(p => p.sf >= 5 && p.qr != null).sort((a, b) => b.qr - a.qr);

    // Artists
    const ac = {};
    entries.forEach(e => {
      if (!e.artist) return;
      if (!ac[e.artist]) ac[e.artist] = { name: e.artist, count: 0, ns: new Set(), gfc: 0, bp: 999 };
      const a = ac[e.artist]; a.count++; a.ns.add(e.nation);
      if (e.sub === 0) { a.gfc++; if (e.place && e.place < a.bp) a.bp = e.place; }
    });
    const artists = Object.values(ac).map(a => ({
      ...a, nc: a.ns.size, bp: a.bp === 999 ? null : a.bp
    })).sort((a, b) => b.count - a.count);

    // Draw stats GF
    const gfDraw = {};
    gfP.forEach(e => {
      if (!e.draw) return;
      const d = gfDraw[e.draw] || (gfDraw[e.draw] = { draw: e.draw, n: 0, tp: 0, w: 0, t3: 0, t6: 0, tpts: 0 });
      d.n++; d.tp += e.place; d.tpts += e.points;
      if (e.place === 1) d.w++;
      if (e.place <= 3) d.t3++;
      if (e.place <= 6) d.t6++;
    });
    const drawGF = Object.values(gfDraw).sort((a, b) => a.draw - b.draw);

    // Draw stats SF
    const sfDraw = {};
    sfP.forEach(e => {
      if (!e.draw) return;
      const d = sfDraw[e.draw] || (sfDraw[e.draw] = { draw: e.draw, n: 0, tp: 0, q: 0, tpts: 0 });
      d.n++; d.tp += e.place; d.tpts += e.points;
      if (e.place <= 10) d.q++;
    });
    const drawSF = Object.values(sfDraw).sort((a, b) => a.draw - b.draw);

    return { records, boards, qualRates, artists, drawGF, drawSF };
  }, [db, nat]);

  if (!data) return <Loader t="Loading records..." />;

  const S = { padding: "8px 10px", fontSize: 13 };
  const SC = { ...S, textAlign: "center" };
  const SR = { ...S, textAlign: "right", fontWeight: 600 };
  const medal = i => i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : i < 6 ? "var(--blue)" : "var(--text-25)";

  const showN = 20;

  const boardCfg = {
    wins: { label: "Wins", val: n => String(n.w) },
    podiums: { label: "Podiums", val: n => String(n.t3) },
    top6: { label: "Top 6 (PQ)", val: n => String(n.t6 || 0) },
    gfEntries: { label: "GF Entries", val: n => String(n.gf) },
    editions: { label: "Editions", val: n => String(n.te) },
    avgPlace: { label: "Avg GF Place", val: n => String(n.apl) },
    avgPts: { label: "Avg GF Points", val: n => String(n.ap) },
    bestStreak: { label: "Best GF Streak", val: n => String(n.bs) },
    lastPlace: { label: "Last Places", val: n => String(n.gl) },
  };

  const recCfg = {
    gfHighPts: "GF Highest Points",
    gfLowWin: "GF Lowest Winning Score",
    sfHighPts: "SF Highest Points",
    sfLowQ: "SF Lowest Qualifying Score",
  };

  const slice = (arr) => expanded ? arr : arr.slice(0, showN);
  const expandBtn = (total) => total > showN ? (
    <button className="xb" style={{ marginTop: 12 }} onClick={() => setExpanded(!expanded)}>
      {expanded ? "Show Top " + showN : "Show All " + total}
    </button>
  ) : null;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
        Records & Statistics
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>All-time records, leaderboards, and analysis</p>

      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.k} className={"tt " + (tab === t.k ? "on" : "")} onClick={() => setTab(t.k)}>{t.l}</button>)}
      </div>

      {/* ALL-TIME RECORDS */}
      {tab === "records" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(recCfg).map(([k, l]) => (
              <button key={k} className={"fb " + (recordType === k ? "on" : "")} onClick={() => { setRecordType(k); setExpanded(false); }}>{l}</button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 600 }}>
              <thead><tr>
                {["#", "Ed.", "Nation", "Artist", "Song", "Points", "Place"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","left","left","left","left","right","center"][i], borderBottom: "1px solid var(--border-08)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {slice(data.records[recordType]).map((r, i) => (
                  <tr key={r.edition + "-" + r.nation + "-" + i}>
                    <td style={{ ...SC, fontWeight: 700, color: medal(i) }}>{i + 1}</td>
                    <td style={{ ...S, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{String(r.edition)}</td>
                    <td style={{ ...S, fontWeight: 600, color: "var(--text)" }}>{String(r.nation)}</td>
                    <td style={{ ...S, color: "var(--text-60)" }}>{String(r.artist || "")}</td>
                    <td style={{ ...S, fontStyle: "italic", color: "var(--text-45)" }}>{String(r.song || "")}</td>
                    <td style={{ ...SR, color: i === 0 ? "var(--gold)" : "var(--blue)" }}>{String(r.points ?? "")}</td>
                    <td style={SC}>{String(r.place ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expandBtn(data.records[recordType].length)}
        </div>
      )}

      {/* NATION LEADERBOARDS */}
      {tab === "nations" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(boardCfg).map(([k, v]) => (
              <button key={k} className={"fb " + (nationBoard === k ? "on" : "")} onClick={() => { setNationBoard(k); setExpanded(false); }}>{v.label}</button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["#", "Nation", boardCfg[nationBoard].label, "GF", "Editions"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","left","right","center","center"][i], borderBottom: "1px solid var(--border-08)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {slice(data.boards[nationBoard] || []).map((n, i) => (
                  <tr key={n.n}>
                    <td style={{ ...SC, fontWeight: 700, color: medal(i) }}>{i + 1}</td>
                    <td style={{ ...S, fontWeight: 600 }}>{String(n.n)}</td>
                    <td style={{ ...SR, color: i < 3 ? "var(--gold)" : "var(--blue)" }}>{boardCfg[nationBoard].val(n)}</td>
                    <td style={{ ...SC, color: "var(--text-45)" }}>{String(n.gf)}</td>
                    <td style={{ ...SC, color: "var(--text-45)" }}>{String(n.te)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expandBtn((data.boards[nationBoard] || []).length)}
        </div>
      )}

      {/* QUALIFICATION RATES */}
      {tab === "qualrate" && (
        <div className="fi">
          <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>Nations with 5+ semifinal appearances</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["#", "Nation", "QF Rate", "Qualified", "Total SF", "GF Entries"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","left","right","center","center","center"][i], borderBottom: "1px solid var(--border-08)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {slice(data.qualRates).map((n, i) => (
                  <tr key={n.n}>
                    <td style={{ ...SC, fontWeight: 700, color: medal(i) }}>{i + 1}</td>
                    <td style={{ ...S, fontWeight: 600 }}>{String(n.n)}</td>
                    <td style={{ ...SR, color: n.qr >= 80 ? "var(--gold)" : n.qr >= 60 ? "var(--green)" : n.qr >= 40 ? "var(--text)" : "var(--red)" }}>{String(n.qr) + "%"}</td>
                    <td style={SC}>{String(n.sfQ)}</td>
                    <td style={SC}>{String(n.sf)}</td>
                    <td style={SC}>{String(n.gf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expandBtn(data.qualRates.length)}
        </div>
      )}

      {/* TOP ARTISTS */}
      {tab === "artists" && (
        <div className="fi">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["#", "Artist", "Entries", "Nations", "GF", "Best GF"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","left","center","center","center","center"][i], borderBottom: "1px solid var(--border-08)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {slice(data.artists.slice(0, 200)).map((a, i) => (
                  <tr key={a.name}>
                    <td style={{ ...SC, fontWeight: 700, color: medal(i) }}>{i + 1}</td>
                    <td style={{ ...S, fontWeight: 600, color: "var(--text)" }}>{String(a.name)}</td>
                    <td style={{ ...SC, fontWeight: 700, color: "var(--blue)" }}>{String(a.count)}</td>
                    <td style={SC}>{String(a.nc)}</td>
                    <td style={SC}>{String(a.gfc)}</td>
                    <td style={{ ...SC, color: a.bp === 1 ? "var(--gold)" : a.bp && a.bp <= 3 ? "var(--silver)" : "var(--text-45)" }}>{a.bp != null ? String(a.bp) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expandBtn(Math.min(data.artists.length, 200))}
        </div>
      )}

      {/* DRAW STATISTICS */}
      {tab === "draws" && (
        <div className="fi">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Grand Final Draw Statistics</h3>
          <p style={{ fontSize: 12, color: "var(--text-35)", marginBottom: 12 }}>Performance by draw position in the Grand Final</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["Draw", "Entries", "Wins", "Top 3", "Top 6", "Avg Place", "Avg Pts"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: i >= 5 ? "right" : "center", borderBottom: "1px solid var(--border-08)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.drawGF.map(d => (
                  <tr key={d.draw}>
                    <td style={{ ...SC, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{String(d.draw)}</td>
                    <td style={SC}>{String(d.n)}</td>
                    <td style={{ ...SC, fontWeight: 600, color: d.w > 0 ? "var(--gold)" : "var(--text-20)" }}>{String(d.w)}</td>
                    <td style={{ ...SC, color: d.t3 > 0 ? "var(--silver)" : "var(--text-20)" }}>{String(d.t3)}</td>
                    <td style={{ ...SC, color: d.t6 > 0 ? "var(--blue)" : "var(--text-20)" }}>{String(d.t6)}</td>
                    <td style={{ ...SR, color: "var(--text-45)" }}>{d.n > 0 ? (d.tp / d.n).toFixed(1) : "—"}</td>
                    <td style={{ ...SR, color: "var(--blue)" }}>{d.n > 0 ? (d.tpts / d.n).toFixed(1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>Semifinal Draw Statistics</h3>
          <p style={{ fontSize: 12, color: "var(--text-35)", marginBottom: 12 }}>Qualification success by draw position</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["Draw", "Entries", "Qualified", "QF Rate", "Avg Place", "Avg Pts"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: i >= 4 ? "right" : "center", borderBottom: "1px solid var(--border-08)" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.drawSF.map(d => (
                  <tr key={d.draw}>
                    <td style={{ ...SC, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{String(d.draw)}</td>
                    <td style={SC}>{String(d.n)}</td>
                    <td style={{ ...SC, color: "var(--green)" }}>{String(d.q)}</td>
                    <td style={{ ...SC, fontWeight: 600, color: d.n > 0 && (d.q / d.n) >= 0.5 ? "var(--green)" : "var(--red)" }}>{d.n > 0 ? ((d.q / d.n) * 100).toFixed(1) + "%" : "—"}</td>
                    <td style={{ ...SR, color: "var(--text-45)" }}>{d.n > 0 ? (d.tp / d.n).toFixed(1) : "—"}</td>
                    <td style={{ ...SR, color: "var(--blue)" }}>{d.n > 0 ? (d.tpts / d.n).toFixed(1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
