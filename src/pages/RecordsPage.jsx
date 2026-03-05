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
  const [drawSort, setDrawSort] = useState({ col: "draw", dir: "asc" });
  const [recSort, setRecSort] = useState({ col: null, dir: "asc" });
  const [recEdFrom, setRecEdFrom] = useState("");
  const [recEdTo, setRecEdTo] = useState("");

  useEffect(() => {
    Promise.all([loadData("database"), loadData("nations")])
      .then(function(r) { setDb(r[0]); setNat(r[1]); });
  }, []);

  useEffect(function() { setExpanded(false); setRecSort({ col: null, dir: "asc" }); }, [tab, nationBoard, recordType]);

  var data = useMemo(function() {
    if (!db || !nat) return null;
    var entries = db.map(function(r) {
      return { edition: r[0], sub: r[1], draw: r[2], nation: r[3], artist: r[4], song: r[5], place: r[6], points: r[7] };
    });
    // Apply edition range filter
    var efrom = recEdFrom ? Number(recEdFrom) : 0;
    var eto = recEdTo ? Number(recEdTo) : 99999;
    if (efrom > 0 || eto < 99999) {
      entries = entries.filter(function(e) { return e.edition >= efrom && e.edition <= eto; });
    }
    var gf = entries.filter(function(e) { return e.sub === 0; });
    var sf = entries.filter(function(e) { return e.sub === 1 || e.sub === 2; });
    var gfP = gf.filter(function(e) { return e.points != null && e.place != null; });
    var sfP = sf.filter(function(e) { return e.points != null && e.place != null; });

    var sortD = function(a, k) { return a.slice().sort(function(x, y) { return (y[k] || 0) - (x[k] || 0); }); };
    var sortA = function(a, k) { return a.slice().sort(function(x, y) { return (x[k] || 999) - (y[k] || 999); }); };

    var records = {
      gfHighPts: sortD(gfP, "points").slice(0, 50),
      gfLowPts: sortA(gfP, "points").slice(0, 50),
      gfLowWin: sortA(gfP.filter(function(e) { return e.place === 1; }), "points").slice(0, 25),
      sfHighPts: sortD(sfP, "points").slice(0, 50),
      sfLowPts: sortA(sfP, "points").slice(0, 50),
      sfLowQ: sortA(sfP.filter(function(e) { return e.place && e.place <= 10; }), "points").slice(0, 50),
    };
    // Compute participants per edition+sub for proportional column
    var partCount = {};
    entries.forEach(function(e) {
      var k = e.edition + "_" + e.sub;
      partCount[k] = (partCount[k] || 0) + 1;
    });
    // Add participant count to each record entry
    Object.keys(records).forEach(function(key) {
      records[key].forEach(function(r) { r.participants = partCount[r.edition + "_" + r.sub] || 0; });
    });

    var profiles = Object.values(nat.p);
    var boards = {
      wins: sortD(profiles, "w"),
      podiums: sortD(profiles, "t3"),
      top6: profiles.slice().sort(function(a, b) { return (b.t6 || 0) - (a.t6 || 0); }),
      gfEntries: sortD(profiles, "gf"),
      editions: sortD(profiles, "te"),
      avgPlace: profiles.filter(function(p) { return p.apl != null && p.gf >= 5; }).sort(function(a, b) { return a.apl - b.apl; }),
      avgPts: profiles.filter(function(p) { return p.ap != null && p.gf >= 5; }).sort(function(a, b) { return b.ap - a.ap; }),
      bestStreak: profiles.filter(function(p) { return p.bs > 0; }).sort(function(a, b) { return b.bs - a.bs; }),
      lastPlace: profiles.filter(function(p) { return (p.gl || 0) > 0; }).sort(function(a, b) { return (b.gl || 0) - (a.gl || 0); }),
      sfEliminations: profiles.filter(function(p) { return (p.sfD || 0) > 0; }).sort(function(a, b) { return (b.sfD || 0) - (a.sfD || 0); }),
    };

    var qualRates = profiles.filter(function(p) { return p.sf >= 5 && p.qr != null; }).sort(function(a, b) { return b.qr - a.qr; });

    var ac = {};
    entries.forEach(function(e) {
      if (!e.artist) return;
      if (!ac[e.artist]) ac[e.artist] = { name: e.artist, count: 0, ns: {}, gfc: 0, bp: 999 };
      var a = ac[e.artist]; a.count++; a.ns[e.nation] = 1;
      if (e.sub === 0) { a.gfc++; if (e.place && e.place < a.bp) a.bp = e.place; }
    });
    var artists = Object.values(ac).map(function(a) {
      return { name: a.name, count: a.count, nc: Object.keys(a.ns).length, gfc: a.gfc, bp: a.bp === 999 ? null : a.bp };
    }).sort(function(a, b) { return b.count - a.count; });

    // Draw stats GF
    var gfDraw = {};
    gfP.forEach(function(e) {
      if (!e.draw) return;
      var d = gfDraw[e.draw] || (gfDraw[e.draw] = { draw: e.draw, n: 0, tp: 0, w: 0, t3: 0, t6: 0, tpts: 0, last: 0 });
      d.n++; d.tp += e.place; d.tpts += e.points;
      if (e.place === 1) d.w++;
      if (e.place <= 3) d.t3++;
      if (e.place <= 6) d.t6++;
    });
    // Count last places per draw (need max place per edition)
    var maxP = {};
    gfP.forEach(function(e) { maxP[e.edition] = Math.max(maxP[e.edition] || 0, e.place); });
    gfP.forEach(function(e) { if (e.draw && e.place === maxP[e.edition] && gfDraw[e.draw]) gfDraw[e.draw].last++; });
    var drawGF = Object.values(gfDraw);

    var sfDraw = {};
    sfP.forEach(function(e) {
      if (!e.draw) return;
      var d = sfDraw[e.draw] || (sfDraw[e.draw] = { draw: e.draw, n: 0, tp: 0, q: 0, tpts: 0, last: 0 });
      d.n++; d.tp += e.place; d.tpts += e.points;
      if (e.place <= 10) d.q++;
    });
    var sfMaxP = {};
    sfP.forEach(function(e) { var k = e.edition + "_" + e.sub; sfMaxP[k] = Math.max(sfMaxP[k] || 0, e.place); });
    sfP.forEach(function(e) { var k = e.edition + "_" + e.sub; if (e.draw && e.place === sfMaxP[k] && sfDraw[e.draw]) sfDraw[e.draw].last++; });
    var drawSF = Object.values(sfDraw);

    return { records: records, boards: boards, qualRates: qualRates, artists: artists, drawGF: drawGF, drawSF: drawSF };
  }, [db, nat, recEdFrom, recEdTo]);

  if (!data) return <Loader t="Loading records..." />;

  var S = { padding: "8px 10px", fontSize: 13 };
  var SC = { padding: "8px 10px", fontSize: 13, textAlign: "center" };
  var SR = { padding: "8px 10px", fontSize: 13, textAlign: "right", fontWeight: 600 };
  var medal = function(i) { return i < 3 ? ["var(--gold)", "var(--silver)", "var(--bronze)"][i] : i < 6 ? "var(--blue)" : "var(--text-25)"; };

  var showN = 20;
  var boardCfg = {
    wins: { label: "Wins", val: function(n) { return String(n.w); } },
    podiums: { label: "Podiums", val: function(n) { return String(n.t3); } },
    top6: { label: "Top 6 (PQ)", val: function(n) { return String(n.t6 || 0); } },
    gfEntries: { label: "GF Entries", val: function(n) { return String(n.gf); } },
    editions: { label: "Editions", val: function(n) { return String(n.te); } },
    avgPlace: { label: "Avg GF Place", val: function(n) { return n.apl != null ? String(n.apl) : "\u2014"; } },
    avgPts: { label: "Avg GF Pts", val: function(n) { return n.ap != null ? String(n.ap) : "\u2014"; } },
    bestStreak: { label: "GF Streak", val: function(n) { return String(n.bs); } },
    lastPlace: { label: "GF Last Places", val: function(n) { return String(n.gl || 0); } },
    sfEliminations: { label: "SF Eliminations", val: function(n) { return String(n.sfD || 0); } },
  };
  var recCfg = {
    gfHighPts: "GF Highest Pts",
    gfLowPts: "GF Lowest Pts",
    gfLowWin: "GF Lowest Win",
    sfHighPts: "SF Highest Pts",
    sfLowPts: "SF Lowest Pts",
    sfLowQ: "SF Lowest Qual",
  };

  var slice = function(arr) { return expanded ? arr : arr.slice(0, showN); };
  var expandBtn = function(total) {
    if (total <= showN) return null;
    return <button className="xb" style={{ marginTop: 12 }} onClick={function() { setExpanded(!expanded); }}>
      {expanded ? "Show Top " + showN : "Show All " + total}
    </button>;
  };

  // Sortable draw table
  var sortDraw = function(list) {
    return list.slice().sort(function(a, b) {
      var va, vb;
      var c = drawSort.col;
      if (c === "avgPlace") { va = a.n > 0 ? a.tp / a.n : 999; vb = b.n > 0 ? b.tp / b.n : 999; }
      else if (c === "avgPts") { va = a.n > 0 ? a.tpts / a.n : 0; vb = b.n > 0 ? b.tpts / b.n : 0; }
      else if (c === "qr") { va = a.n > 0 ? a.q / a.n : 0; vb = b.n > 0 ? b.q / b.n : 0; }
      else { va = a[c] || 0; vb = b[c] || 0; }
      return drawSort.dir === "asc" ? va - vb : vb - va;
    });
  };
  var toggleDrawSort = function(col) {
    if (drawSort.col === col) setDrawSort({ col: col, dir: drawSort.dir === "asc" ? "desc" : "asc" });
    else setDrawSort({ col: col, dir: col === "draw" ? "asc" : "desc" });
  };
  var arrow = function(col) { return drawSort.col === col ? (drawSort.dir === "asc" ? " \u2191" : " \u2193") : ""; };
  var drawTH = function(col, label) {
    return <th onClick={function() { toggleDrawSort(col); }} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: drawSort.col === col ? "var(--gold)" : "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "center", borderBottom: "1px solid var(--border-08)", cursor: "pointer", whiteSpace: "nowrap" }}>{label + arrow(col)}</th>;
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
        {"Records & Statistics"}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 12 }}>{"All-time records, leaderboards, and analysis"}</p>

      {/* Edition range filter */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1 }}>{"Edition Range"}</span>
        <input type="number" placeholder="from" value={recEdFrom}
          onChange={function(e) { setRecEdFrom(e.target.value); }}
          style={{ width: 60, padding: "6px 8px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
        <span style={{ color: "var(--text-15)" }}>{"to"}</span>
        <input type="number" placeholder="to" value={recEdTo}
          onChange={function(e) { setRecEdTo(e.target.value); }}
          style={{ width: 60, padding: "6px 8px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
        {(recEdFrom || recEdTo) && (
          <button className="xb" onClick={function() { setRecEdFrom(""); setRecEdTo(""); }}>{"Clear"}</button>
        )}
        {(recEdFrom || recEdTo) && (
          <span style={{ fontSize: 12, color: "var(--gold)" }}>{"Showing editions " + (recEdFrom || "1") + "\u2013" + (recEdTo || "latest") + " (applies to Records, Draw Stats, Artists)"}</span>
        )}
      </div>

      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(function(t) { return <button key={t.k} className={"tt " + (tab === t.k ? "on" : "")} onClick={function() { setTab(t.k); }}>{t.l}</button>; })}
      </div>

      {tab === "records" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(recCfg).map(function(kv) { return <button key={kv[0]} className={"fb " + (recordType === kv[0] ? "on" : "")} onClick={function() { setRecordType(kv[0]); setExpanded(false); }}>{kv[1]}</button>; })}
          </div>
          {(() => {
            var recs = data.records[recordType] || [];
            // Apply record sort if active
            if (recSort.col) {
              recs = recs.slice().sort(function(a, b) {
                var va, vb;
                var c = recSort.col;
                if (c === "pctPlace") { va = a.participants > 0 ? a.points / a.participants : 0; vb = b.participants > 0 ? b.points / b.participants : 0; }
                else { va = a[c]; vb = b[c]; }
                if (va == null) return 1; if (vb == null) return -1;
                var cmp = recSort.dir === "asc" ? va - vb : vb - va;
                // Tiebreak by points (desc for high, asc for low)
                if (cmp === 0 && a.points != null && b.points != null) return b.points - a.points;
                return cmp;
              });
            }
            var shown = expanded ? recs : recs.slice(0, showN);
            var toggleRecSort = function(col) {
              setRecSort(function(prev) {
                if (prev.col === col) return { col: col, dir: prev.dir === "asc" ? "desc" : "asc" };
                return { col: col, dir: col === "place" ? "asc" : "desc" };
              });
            };
            var recArr = function(col) { return recSort.col === col ? (recSort.dir === "asc" ? " \u2191" : " \u2193") : ""; };
            var recTH = function(col, label, align) {
              return <th onClick={function() { toggleRecSort(col); }} style={{
                padding: "10px 10px", fontSize: 11, fontWeight: 600,
                color: recSort.col === col ? "var(--gold)" : "var(--text-30)",
                textTransform: "uppercase", letterSpacing: "0.8px", textAlign: align || "left",
                borderBottom: "1px solid var(--border-08)", cursor: "pointer", whiteSpace: "nowrap",
              }}>{label + recArr(col)}</th>;
            };

            return <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 700 }}>
                  <thead><tr>
                    <th style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "center", borderBottom: "1px solid var(--border-08)" }}>{"#"}</th>
                    <th style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid var(--border-08)" }}>{"Ed."}</th>
                    <th style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid var(--border-08)" }}>{"Nation"}</th>
                    <th style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid var(--border-08)" }}>{"Artist"}</th>
                    <th style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", borderBottom: "1px solid var(--border-08)" }}>{"Song"}</th>
                    {recTH("points", "Points", "right")}
                    {recTH("place", "Place", "center")}
                    {recTH("participants", "N", "center")}
                    {recTH("pctPlace", "Pts/N", "center")}
                  </tr></thead>
                  <tbody>
                    {shown.map(function(r, i) {
                      var avg = r.participants > 0 ? (r.points / r.participants).toFixed(1) : "";
                      return <tr key={String(r.edition) + "-" + String(r.nation) + "-" + i}>
                        <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, color: medal(i) }}>{String(i + 1)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{String(r.edition)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{String(r.nation)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, color: "var(--text-60)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r.artist || "")}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontStyle: "italic", color: "var(--text-45)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r.song || "")}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "right", fontWeight: 600, color: i === 0 ? "var(--gold)" : "var(--blue)" }}>{String(r.points != null ? r.points : "")}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(r.place != null ? r.place : "")}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, textAlign: "center", color: "var(--text-30)" }}>{String(r.participants || "")}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, textAlign: "center", color: "var(--text-30)" }}>{avg || ""}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              {expandBtn(recs.length)}
            </>;
          })()}
        </div>
      )}

      {tab === "nations" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.entries(boardCfg).map(function(kv) { return <button key={kv[0]} className={"fb " + (nationBoard === kv[0] ? "on" : "")} onClick={function() { setNationBoard(kv[0]); setExpanded(false); }}>{kv[1].label}</button>; })}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["#", "Nation", boardCfg[nationBoard].label, "GF Entries", "Tot. Ed."].map(function(h, i) {
                  return <th key={h + i} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: i === 2 ? "var(--gold)" : "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","left","right","center","center"][i], borderBottom: "1px solid var(--border-08)" }}>{h}</th>;
                })}
              </tr></thead>
              <tbody>
                {slice(data.boards[nationBoard] || []).map(function(n, i) {
                  return <tr key={String(n.n)}>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, color: medal(i) }}>{String(i + 1)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>{String(n.n)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "right", fontWeight: 600, color: i < 3 ? "var(--gold)" : "var(--blue)" }}>{boardCfg[nationBoard].val(n)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: "var(--text-45)" }}>{String(n.gf)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: "var(--text-45)" }}>{String(n.te)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {expandBtn((data.boards[nationBoard] || []).length)}
        </div>
      )}

      {tab === "qualrate" && (
        <div className="fi">
          <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>{"Nations with 5+ semifinal appearances"}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["#", "Nation", "QF Rate", "Qualified", "Total SF", "GF"].map(function(h, i) {
                  return <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","left","right","center","center","center"][i], borderBottom: "1px solid var(--border-08)" }}>{h}</th>;
                })}
              </tr></thead>
              <tbody>
                {slice(data.qualRates).map(function(n, i) {
                  return <tr key={String(n.n)}>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, color: medal(i) }}>{String(i + 1)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>{String(n.n)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "right", fontWeight: 600, color: n.qr >= 80 ? "var(--gold)" : n.qr >= 60 ? "var(--green)" : n.qr >= 40 ? "var(--text)" : "var(--red)" }}>{String(n.qr) + "%"}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(n.sfQ)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(n.sf)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(n.gf)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {expandBtn(data.qualRates.length)}
        </div>
      )}

      {tab === "artists" && (
        <div className="fi">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {["#", "Artist", "Entries", "Nations", "GF", "Best GF"].map(function(h, i) {
                  return <th key={h} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","left","center","center","center","center"][i], borderBottom: "1px solid var(--border-08)" }}>{h}</th>;
                })}
              </tr></thead>
              <tbody>
                {slice(data.artists.slice(0, 200)).map(function(a, i) {
                  return <tr key={a.name}>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, color: medal(i) }}>{String(i + 1)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{String(a.name)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, color: "var(--blue)" }}>{String(a.count)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(a.nc)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(a.gfc)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: a.bp === 1 ? "var(--gold)" : a.bp != null && a.bp <= 3 ? "var(--silver)" : "var(--text-45)" }}>{a.bp != null ? String(a.bp) : "\u2014"}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {expandBtn(Math.min(data.artists.length, 200))}
        </div>
      )}

      {tab === "draws" && (
        <div className="fi">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{"Grand Final Draw Statistics"}</h3>
          <p style={{ fontSize: 12, color: "var(--text-35)", marginBottom: 12 }}>{"Click column header to sort"}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 600 }}>
              <thead><tr>
                {drawTH("draw", "Draw")}
                {drawTH("n", "Entries")}
                {drawTH("w", "Wins")}
                {drawTH("t3", "Top 3")}
                {drawTH("t6", "Top 6")}
                {drawTH("last", "Last")}
                {drawTH("avgPlace", "Avg Pl.")}
                {drawTH("avgPts", "Avg Pts")}
              </tr></thead>
              <tbody>
                {sortDraw(data.drawGF).map(function(d) {
                  return <tr key={d.draw}>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{String(d.draw)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(d.n)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 600, color: d.w > 0 ? "var(--gold)" : "var(--text-20)" }}>{String(d.w)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: d.t3 > 0 ? "var(--silver)" : "var(--text-20)" }}>{String(d.t3)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: d.t6 > 0 ? "var(--blue)" : "var(--text-20)" }}>{String(d.t6)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: d.last > 0 ? "var(--red)" : "var(--text-20)" }}>{String(d.last)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: "var(--text-45)" }}>{d.n > 0 ? (d.tp / d.n).toFixed(1) : "\u2014"}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "right", fontWeight: 600, color: "var(--blue)" }}>{d.n > 0 ? (d.tpts / d.n).toFixed(1) : "\u2014"}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 4 }}>{"Semifinal Draw Statistics"}</h3>
          <p style={{ fontSize: 12, color: "var(--text-35)", marginBottom: 12 }}>{"Click column header to sort"}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 500 }}>
              <thead><tr>
                {drawTH("draw", "Draw")}
                {drawTH("n", "Entries")}
                {drawTH("q", "Qualified")}
                {drawTH("qr", "QF Rate")}
                {drawTH("last", "Last")}
                {drawTH("avgPlace", "Avg Pl.")}
                {drawTH("avgPts", "Avg Pts")}
              </tr></thead>
              <tbody>
                {sortDraw(data.drawSF).map(function(d) {
                  return <tr key={d.draw}>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{String(d.draw)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center" }}>{String(d.n)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: "var(--green)" }}>{String(d.q)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", fontWeight: 600, color: d.n > 0 && (d.q / d.n) >= 0.5 ? "var(--green)" : "var(--red)" }}>{d.n > 0 ? ((d.q / d.n) * 100).toFixed(1) + "%" : "\u2014"}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: d.last > 0 ? "var(--red)" : "var(--text-20)" }}>{String(d.last)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "center", color: "var(--text-45)" }}>{d.n > 0 ? (d.tp / d.n).toFixed(1) : "\u2014"}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13, textAlign: "right", fontWeight: 600, color: "var(--blue)" }}>{d.n > 0 ? (d.tpts / d.n).toFixed(1) : "\u2014"}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
