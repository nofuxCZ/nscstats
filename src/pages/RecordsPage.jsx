import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader, SN } from '../components/Shared';

function ExpandTable({ headers, rows, defaultShow = 15, aligns }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, defaultShow);

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={h} style={{
                  padding: "10px 10px", fontSize: 11, fontWeight: 600,
                  color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px",
                  textAlign: aligns?.[i] || "left", borderBottom: "1px solid var(--border-08)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{shown}</tbody>
        </table>
      </div>
      {rows.length > defaultShow && (
        <button className="xb" style={{ marginTop: 12 }} onClick={() => setExpanded(!expanded)}>
          {expanded ? `Show Top ${defaultShow}` : `Show All ${rows.length}`}
        </button>
      )}
    </>
  );
}

const TABS = [
  { k: "records", l: "All-Time Records" },
  { k: "nations", l: "Nation Leaderboards" },
  { k: "qualrate", l: "Qualification Rates" },
  { k: "artists", l: "Top Artists" },
  { k: "draws", l: "Draw Statistics" },
];

export default function RecordsPage() {
  const [db, setDb] = useState(null);
  const [hp, setHp] = useState(null);
  const [nat, setNat] = useState(null);
  const [tab, setTab] = useState("records");

  useEffect(() => {
    Promise.all([loadData("database"), loadData("homepage"), loadData("nations")])
      .then(([d, h, n]) => { setDb(d); setHp(h); setNat(n); });
  }, []);

  const data = useMemo(() => {
    if (!db || !hp || !nat) return null;

    // Parse database entries
    const entries = db.map(r => ({
      edition: r[0], sub: SN[r[1]], draw: r[2], nation: r[3],
      artist: r[4], song: r[5], place: r[6], points: r[7],
    }));

    const gf = entries.filter(e => e.sub === "GF");
    const sf = entries.filter(e => e.sub === "SF1" || e.sub === "SF2");

    // === ALL-TIME RECORDS ===
    const gfWithPts = gf.filter(e => e.points != null && e.place != null);
    const sfWithPts = sf.filter(e => e.points != null && e.place != null);

    const sortBy = (arr, key, dir = "desc") =>
      [...arr].sort((a, b) => dir === "desc" ? (b[key] ?? 0) - (a[key] ?? 0) : (a[key] ?? 999) - (b[key] ?? 999));

    const records = {
      gfHighPts: sortBy(gfWithPts, "points").slice(0, 25),
      gfLowPts: sortBy(gfWithPts.filter(e => e.place === 1), "points", "asc").slice(0, 15),
      sfHighPts: sortBy(sfWithPts, "points").slice(0, 25),
      gfMostNations: (() => {
        const edCount = {};
        gf.forEach(e => { edCount[e.edition] = (edCount[e.edition] || 0) + 1; });
        return Object.entries(edCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([ed, c]) => ({ edition: Number(ed), count: c }));
      })(),
    };

    // === NATION LEADERBOARDS ===
    const profiles = Object.values(nat.p);
    const nationBoards = {
      wins: [...profiles].sort((a, b) => b.w - a.w),
      podiums: [...profiles].sort((a, b) => b.t3 - a.t3),
      top6: [...profiles].sort((a, b) => (b.t6 || 0) - (a.t6 || 0)),
      gfEntries: [...profiles].sort((a, b) => b.gf - a.gf),
      editions: [...profiles].sort((a, b) => b.te - a.te),
      avgPlace: [...profiles].filter(p => p.apl != null && p.gf >= 5).sort((a, b) => a.apl - b.apl),
      avgPts: [...profiles].filter(p => p.ap != null && p.gf >= 5).sort((a, b) => b.ap - a.ap),
      bestStreak: [...profiles].filter(p => p.bs > 0).sort((a, b) => b.bs - a.bs),
      lastPlace: [...profiles].filter(p => p.gl > 0).sort((a, b) => b.gl - a.gl),
    };

    // === QUALIFICATION RATES ===
    const qualRates = profiles
      .filter(p => p.sf >= 5 && p.qr != null)
      .sort((a, b) => b.qr - a.qr);

    // === TOP ARTISTS ===
    const artistCount = {};
    entries.forEach(e => {
      if (!e.artist) return;
      if (!artistCount[e.artist]) artistCount[e.artist] = { name: e.artist, count: 0, nations: new Set(), gfCount: 0, bestPlace: Infinity };
      artistCount[e.artist].count++;
      artistCount[e.artist].nations.add(e.nation);
      if (e.sub === "GF") {
        artistCount[e.artist].gfCount++;
        if (e.place && e.place < artistCount[e.artist].bestPlace) artistCount[e.artist].bestPlace = e.place;
      }
    });
    const topArtists = Object.values(artistCount)
      .map(a => ({ ...a, nationCount: a.nations.size, bestPlace: a.bestPlace === Infinity ? null : a.bestPlace }))
      .sort((a, b) => b.count - a.count);

    // === DRAW STATISTICS ===
    const drawStats = {};
    gfWithPts.forEach(e => {
      if (!e.draw) return;
      if (!drawStats[e.draw]) drawStats[e.draw] = { draw: e.draw, count: 0, totalPlace: 0, wins: 0, top3: 0, top6: 0, totalPts: 0 };
      const d = drawStats[e.draw];
      d.count++;
      d.totalPlace += e.place;
      d.totalPts += e.points;
      if (e.place === 1) d.wins++;
      if (e.place <= 3) d.top3++;
      if (e.place <= 6) d.top6++;
    });
    const drawList = Object.values(drawStats)
      .map(d => ({ ...d, avgPlace: d.count > 0 ? (d.totalPlace / d.count).toFixed(1) : null, avgPts: d.count > 0 ? (d.totalPts / d.count).toFixed(1) : null }))
      .sort((a, b) => a.draw - b.draw);

    // SF draw stats
    const sfDrawStats = {};
    sfWithPts.forEach(e => {
      if (!e.draw) return;
      if (!sfDrawStats[e.draw]) sfDrawStats[e.draw] = { draw: e.draw, count: 0, totalPlace: 0, quals: 0, totalPts: 0 };
      const d = sfDrawStats[e.draw];
      d.count++;
      d.totalPlace += e.place;
      d.totalPts += e.points;
      if (e.place <= 10) d.quals++;
    });
    const sfDrawList = Object.values(sfDrawStats)
      .map(d => ({ ...d, avgPlace: d.count > 0 ? (d.totalPlace / d.count).toFixed(1) : null, avgPts: d.count > 0 ? (d.totalPts / d.count).toFixed(1) : null, qualRate: d.count > 0 ? ((d.quals / d.count) * 100).toFixed(1) : null }))
      .sort((a, b) => a.draw - b.draw);

    return { records, nationBoards, qualRates, topArtists, drawList, sfDrawList };
  }, [db, hp, nat]);

  if (!data) return <Loader t="Loading records..." />;

  const td = { padding: "8px 10px", fontSize: 13 };
  const tdR = { ...td, textAlign: "right", fontWeight: 600 };
  const tdC = { ...td, textAlign: "center" };

  const RecordRow = ({ r, i }) => (
    <tr key={`${r.edition}-${r.nation}-${i}`}>
      <td style={{ ...tdC, fontWeight: 700, color: i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : "var(--text-25)" }}>{i + 1}</td>
      <td style={{ ...td, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-display)" }}>{r.edition}</td>
      <td style={{ ...td, fontWeight: 600, color: "var(--text)" }}>{r.nation}</td>
      <td style={{ ...td, color: "var(--text-60)" }}>{r.artist}</td>
      <td style={{ ...td, fontStyle: "italic", color: "var(--text-45)" }}>{r.song}</td>
      <td style={{ ...tdR, color: i === 0 ? "var(--gold)" : "var(--blue)" }}>{r.points}</td>
      <td style={tdC}>{r.place}</td>
    </tr>
  );

  const NationRow = ({ n, i, valueKey, format }) => (
    <tr key={n.n}>
      <td style={{ ...tdC, fontWeight: 700, color: i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : i < 6 ? "var(--blue)" : "var(--text-25)" }}>{i + 1}</td>
      <td style={{ ...td, fontWeight: 600 }}>{n.n}</td>
      <td style={{ ...tdR, color: i < 3 ? "var(--gold)" : "var(--blue)" }}>{format ? format(n) : n[valueKey]}</td>
      <td style={{ ...tdC, color: "var(--text-45)" }}>{n.gf}</td>
      <td style={{ ...tdC, color: "var(--text-45)" }}>{n.te}</td>
    </tr>
  );

  const [nationBoard, setNationBoard] = useState("wins");
  const [recordType, setRecordType] = useState("gfHighPts");

  const boardConfig = {
    wins: { label: "Wins", key: "w" },
    podiums: { label: "Podiums (Top 3)", key: "t3" },
    top6: { label: "Top 6 (PQ)", key: "t6" },
    gfEntries: { label: "GF Entries", key: "gf" },
    editions: { label: "Editions", key: "te" },
    avgPlace: { label: "Best Avg Place", key: "apl", format: n => n.apl },
    avgPts: { label: "Best Avg Points", key: "ap", format: n => n.ap },
    bestStreak: { label: "Best GF Streak", key: "bs" },
    lastPlace: { label: "Most Last Places", key: "gl" },
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900,
        background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4,
      }}>Records & Statistics</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>All-time records, leaderboards, and statistical analysis</p>

      {/* Main Tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.k} className={`tt ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* ALL-TIME RECORDS */}
      {tab === "records" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {[["gfHighPts", "GF Highest Points"], ["gfLowPts", "GF Lowest Winning Score"], ["sfHighPts", "SF Highest Points"], ["gfMostNations", "Most Nations in GF"]].map(([k, l]) => (
              <button key={k} className={`fb ${recordType === k ? "on" : ""}`} onClick={() => setRecordType(k)}>{l}</button>
            ))}
          </div>

          {recordType === "gfMostNations" ? (
            <ExpandTable
              headers={["#", "Edition", "Nations"]}
              aligns={["center", "center", "center"]}
              rows={data.records.gfMostNations.map((r, i) => (
                <tr key={r.edition}>
                  <td style={{ ...tdC, fontWeight: 700, color: i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : "var(--text-25)" }}>{i + 1}</td>
                  <td style={{ ...tdC, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{r.edition}</td>
                  <td style={{ ...tdC, fontWeight: 700, color: "var(--blue)" }}>{r.count}</td>
                </tr>
              ))}
            />
          ) : (
            <ExpandTable
              headers={["#", "Ed.", "Nation", "Artist", "Song", "Points", "Place"]}
              aligns={["center", "left", "left", "left", "left", "right", "center"]}
              defaultShow={20}
              rows={data.records[recordType].map((r, i) => <RecordRow key={`${r.edition}-${r.nation}-${i}`} r={r} i={i} />)}
            />
          )}
        </div>
      )}

      {/* NATION LEADERBOARDS */}
      {tab === "nations" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(boardConfig).map(([k, v]) => (
              <button key={k} className={`fb ${nationBoard === k ? "on" : ""}`} onClick={() => setNationBoard(k)}>{v.label}</button>
            ))}
          </div>

          <ExpandTable
            headers={["#", "Nation", boardConfig[nationBoard].label, "GF", "Editions"]}
            aligns={["center", "left", "right", "center", "center"]}
            defaultShow={20}
            rows={(data.nationBoards[nationBoard] || []).map((n, i) => (
              <NationRow key={n.n} n={n} i={i} valueKey={boardConfig[nationBoard].key} format={boardConfig[nationBoard].format} />
            ))}
          />
        </div>
      )}

      {/* QUALIFICATION RATES */}
      {tab === "qualrate" && (
        <div className="fi">
          <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>Nations with 5+ semifinal appearances</p>
          <ExpandTable
            headers={["#", "Nation", "QF Rate", "Qualified", "Total SF", "GF Entries"]}
            aligns={["center", "left", "right", "center", "center", "center"]}
            defaultShow={25}
            rows={data.qualRates.map((n, i) => (
              <tr key={n.n}>
                <td style={{ ...tdC, fontWeight: 700, color: i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : i < 6 ? "var(--blue)" : "var(--text-25)" }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{n.n}</td>
                <td style={{ ...tdR, color: n.qr >= 80 ? "var(--gold)" : n.qr >= 60 ? "var(--green)" : n.qr >= 40 ? "var(--text)" : "var(--red)" }}>{n.qr}%</td>
                <td style={tdC}>{n.sfQ}</td>
                <td style={tdC}>{n.sf}</td>
                <td style={tdC}>{n.gf}</td>
              </tr>
            ))}
          />
        </div>
      )}

      {/* TOP ARTISTS */}
      {tab === "artists" && (
        <div className="fi">
          <ExpandTable
            headers={["#", "Artist", "Entries", "Nations", "GF Entries", "Best GF"]}
            aligns={["center", "left", "center", "center", "center", "center"]}
            defaultShow={30}
            rows={data.topArtists.slice(0, 200).map((a, i) => (
              <tr key={a.name}>
                <td style={{ ...tdC, fontWeight: 700, color: i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : "var(--text-25)" }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600, color: "var(--text)" }}>{a.name}</td>
                <td style={{ ...tdC, fontWeight: 700, color: "var(--blue)" }}>{a.count}</td>
                <td style={tdC}>{a.nationCount}</td>
                <td style={tdC}>{a.gfCount}</td>
                <td style={{ ...tdC, color: a.bestPlace === 1 ? "var(--gold)" : a.bestPlace && a.bestPlace <= 3 ? "var(--silver)" : "var(--text-45)" }}>
                  {a.bestPlace || "—"}
                </td>
              </tr>
            ))}
          />
        </div>
      )}

      {/* DRAW STATISTICS */}
      {tab === "draws" && (
        <div className="fi">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Grand Final Draw Statistics</h3>
          <p style={{ fontSize: 12, color: "var(--text-35)", marginBottom: 12 }}>How successful is each draw position in the Grand Final?</p>
          <ExpandTable
            headers={["Draw", "Entries", "Wins", "Top 3", "Top 6", "Avg Place", "Avg Pts"]}
            aligns={["center", "center", "center", "center", "center", "center", "right"]}
            defaultShow={30}
            rows={data.drawList.map(d => (
              <tr key={d.draw}>
                <td style={{ ...tdC, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{d.draw}</td>
                <td style={tdC}>{d.count}</td>
                <td style={{ ...tdC, fontWeight: 600, color: d.wins > 0 ? "var(--gold)" : "var(--text-20)" }}>{d.wins}</td>
                <td style={{ ...tdC, color: d.top3 > 0 ? "var(--silver)" : "var(--text-20)" }}>{d.top3}</td>
                <td style={{ ...tdC, color: d.top6 > 0 ? "var(--blue)" : "var(--text-20)" }}>{d.top6}</td>
                <td style={{ ...tdC, color: "var(--text-45)" }}>{d.avgPlace}</td>
                <td style={{ ...tdR, color: "var(--blue)" }}>{d.avgPts}</td>
              </tr>
            ))}
          />

          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>Semifinal Draw Statistics</h3>
          <p style={{ fontSize: 12, color: "var(--text-35)", marginBottom: 12 }}>Qualification success by draw position in Semifinals</p>
          <ExpandTable
            headers={["Draw", "Entries", "Qualified", "QF Rate", "Avg Place", "Avg Pts"]}
            aligns={["center", "center", "center", "center", "center", "right"]}
            defaultShow={30}
            rows={data.sfDrawList.map(d => (
              <tr key={d.draw}>
                <td style={{ ...tdC, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{d.draw}</td>
                <td style={tdC}>{d.count}</td>
                <td style={{ ...tdC, color: "var(--green)" }}>{d.quals}</td>
                <td style={{ ...tdC, fontWeight: 600, color: Number(d.qualRate) >= 50 ? "var(--green)" : "var(--red)" }}>{d.qualRate}%</td>
                <td style={{ ...tdC, color: "var(--text-45)" }}>{d.avgPlace}</td>
                <td style={{ ...tdR, color: "var(--blue)" }}>{d.avgPts}</td>
              </tr>
            ))}
          />
        </div>
      )}
    </div>
  );
}
