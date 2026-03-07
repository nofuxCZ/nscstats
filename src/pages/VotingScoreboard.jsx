import { useState, useEffect, useMemo, useRef } from 'react';
import { loadData } from '../data/loader';
import { Loader } from '../components/Shared';

var SUB_NAMES = { 0: "Grand Final", 1: "Semifinal 1", 2: "Semifinal 2", 3: "WL Jury", 4: "REJU 1", 5: "REJU 2" };
var SUB_SHORT = { 0: "GF", 1: "SF1", 2: "SF2", 3: "WL", 4: "R1", 5: "R2" };

function Tooltip({ text, children }) {
  var ref = useRef(null);
  var [show, setShow] = useState(false);
  var [pos, setPos] = useState({ x: 0, y: 0 });
  function onEnter(e) { setShow(true); setPos({ x: e.clientX, y: e.clientY }); }
  function onMove(e) { setPos({ x: e.clientX, y: e.clientY }); }
  function onLeave() { setShow(false); }
  return (
    <span ref={ref} onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave} style={{ cursor: text ? "help" : undefined }}>
      {children}
      {show && text && (
        <span style={{
          position: "fixed", left: pos.x + 12, top: pos.y - 8, zIndex: 999,
          padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: "var(--dropdown-bg)", border: "1px solid var(--border-10)",
          boxShadow: "0 4px 16px rgba(0,0,0,.25)", color: "var(--text)",
          whiteSpace: "nowrap", pointerEvents: "none", maxWidth: 340,
        }}>{text}</span>
      )}
    </span>
  );
}

export default function VotingScoreboard() {
  var [D, setD] = useState(null);
  var [edData, setEdData] = useState(null);
  var [ed, setEd] = useState(null);
  var [subs, setSubs] = useState([0]);
  var [selNation, setSelNation] = useState(null);
  var [view, setView] = useState("scoreboard");
  var [expandAll, setExpandAll] = useState(false);
  var [searchQ, setSearchQ] = useState("");
  var [brkEdFrom, setBrkEdFrom] = useState(null);
  var [brkEdTo, setBrkEdTo] = useState(null);
  var [secNation, setSecNation] = useState(null);

  useEffect(function() {
    Promise.all([loadData("voting"), loadData("editions")]).then(function(arr) {
      setD(arr[0]);
      setEdData(arr[1]);
      setEd(arr[0].e[1]);
      setBrkEdFrom(arr[0].e[0]);
      setBrkEdTo(arr[0].e[1]);
    });
  }, []);

  var allEds = useMemo(function() {
    if (!D) return [];
    return Array.from(new Set(D.r.map(function(r) { return r[0]; }))).sort(function(a, b) { return a - b; });
  }, [D]);

  var availSubs = useMemo(function() {
    if (!D || !ed) return [];
    return Array.from(new Set(D.r.filter(function(r) { return r[0] === ed; }).map(function(r) { return r[1]; }))).sort();
  }, [D, ed]);

  function toggleSub(s) {
    setSubs(function(prev) {
      if (prev.indexOf(s) >= 0) { var n = prev.filter(function(x) { return x !== s; }); return n.length > 0 ? n : [s]; }
      return prev.concat([s]);
    });
  }

  // Build entry lookup: edition -> nation name -> { artist, song }
  var entryLookup = useMemo(function() {
    if (!edData) return {};
    var lookup = {};
    Object.keys(edData).forEach(function(edKey) {
      var e = edData[edKey];
      lookup[edKey] = {};
      ["gf", "sf1", "sf2", "mpq"].forEach(function(sub) {
        if (!e[sub]) return;
        e[sub].forEach(function(row) {
          lookup[edKey][row[1]] = { artist: row[2], song: row[3], place: row[4], pts: row[5] };
        });
      });
    });
    return lookup;
  }, [edData]);

  // Build scoreboard matrix
  var matrix = useMemo(function() {
    if (!D || !ed) return null;
    var recs = D.r.filter(function(r) { return r[0] === ed && subs.indexOf(r[1]) >= 0; });
    if (recs.length === 0) return null;
    var contestants = new Set();
    var voters = new Set();
    recs.forEach(function(r) {
      voters.add(r[2]);
      var pairs = r[3];
      for (var i = 0; i < pairs.length; i += 2) contestants.add(pairs[i]);
    });
    var pts = {};
    var recipientTotals = {};
    recs.forEach(function(r) {
      var vi = r[2];
      pts[vi] = pts[vi] || {};
      var pairs = r[3];
      for (var i = 0; i < pairs.length; i += 2) {
        pts[vi][pairs[i]] = (pts[vi][pairs[i]] || 0) + pairs[i + 1];
        recipientTotals[pairs[i]] = (recipientTotals[pairs[i]] || 0) + pairs[i + 1];
      }
    });
    var cList = Array.from(contestants).sort(function(a, b) { return (recipientTotals[b] || 0) - (recipientTotals[a] || 0); });
    var vList = Array.from(voters).sort(function(a, b) { return (D.n[a] || "").localeCompare(D.n[b] || ""); });
    return { contestants: cList, voters: vList, pts: pts, totals: recipientTotals };
  }, [D, ed, subs]);

  var [selCats, setSelCats] = useState([]);
  function toggleCat(c) {
    setSelCats(function(prev) {
      if (prev.indexOf(c) >= 0) return prev.filter(function(x) { return x !== c; });
      return prev.concat([c]);
    });
  }

  // Build nation-by-edition breakdown with filters
  var breakdown = useMemo(function() {
    if (!D || selNation == null) return null;
    var received = {};
    var given = {};
    var efrom = brkEdFrom || D.e[0];
    var eto = brkEdTo || D.e[1];
    D.r.forEach(function(r) {
      var redition = r[0], rcat = r[1], vi = r[2], pairs = r[3];
      if (redition < efrom || redition > eto) return;
      if (selCats.length > 0 && selCats.indexOf(rcat) < 0) return;
      for (var i = 0; i < pairs.length; i += 2) {
        var ri = pairs[i];
        if (ri === vi) continue;
        if (ri === selNation && vi !== selNation) {
          if (secNation != null && vi !== secNation) continue;
          if (!received[redition]) received[redition] = {};
          received[redition][vi] = (received[redition][vi] || 0) + pairs[i + 1];
        }
        if (vi === selNation && ri !== selNation) {
          if (secNation != null && ri !== secNation) continue;
          if (!given[redition]) given[redition] = {};
          given[redition][ri] = (given[redition][ri] || 0) + pairs[i + 1];
        }
      }
    });
    return { received: received, given: given };
  }, [D, selNation, selCats, brkEdFrom, brkEdTo, secNation]);

  if (!D) return <Loader t="Loading voting data..." />;

  var nn = D.n;
  var cellBg = function(pts) {
    if (!pts) return "transparent";
    if (pts >= 12) return "var(--gold-glow-25)";
    if (pts >= 10) return "var(--blue-glow-20)";
    if (pts >= 7) return "var(--blue-glow-15)";
    if (pts >= 1) return "var(--text-04)";
    return "transparent";
  };

  var sq = searchQ.toLowerCase().trim();
  var sortedNations = nn.slice().map(function(n, i) { return [n, i]; }).sort(function(a, b) { return a[0].localeCompare(b[0]); });
  var iStyle = { width: 60, padding: "6px 8px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>{"Voting Scoreboard"}</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>{"Detailed voting data for editions " + D.e[0] + "\u2013" + D.e[1]}</p>

      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 16 }}>
        {[["scoreboard", "Edition Scoreboard"], ["received", "Points Received"], ["given", "Points Given"]].map(function(t) {
          return <button key={t[0]} className={"tt " + (view === t[0] ? "on" : "")} onClick={function() { setView(t[0]); setExpandAll(false); }}>{t[1]}</button>;
        })}
      </div>

      {/* SCOREBOARD VIEW */}
      {view === "scoreboard" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <select value={ed || ""} onChange={function(e) { setEd(Number(e.target.value)); setSubs([0]); setSearchQ(""); }}
              style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 700, background: "var(--input-bg)", border: "1px solid var(--border-10)", color: "var(--gold)", cursor: "pointer", fontFamily: "var(--font-display)" }}>
              {allEds.map(function(e) { return <option key={e} value={e} style={{ background: "var(--dropdown-bg)", color: "var(--text)" }}>{"#" + e}</option>; })}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              {availSubs.map(function(s) {
                return <button key={s} className={"fb " + (subs.indexOf(s) >= 0 ? "on" : "")} onClick={function() { toggleSub(s); }}>{SUB_SHORT[s] || String(s)}</button>;
              })}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-30)" }}>
              {matrix ? String(matrix.contestants.length) + " contestants, " + String(matrix.voters.length) + " voters" : "No data"}
            </span>
            <div style={{ marginLeft: "auto" }}>
              <input type="text" value={searchQ} onChange={function(e) { setSearchQ(e.target.value); }}
                placeholder="Search nation\u2026"
                style={{ padding: "7px 12px", borderRadius: 8, fontSize: 13, width: 170, background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
            </div>
          </div>

          {matrix && (
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "75vh" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th style={{ position: "sticky", left: 0, zIndex: 3, padding: "6px 8px", background: "var(--bg)", borderBottom: "2px solid var(--border)", fontWeight: 600, color: "var(--text-30)", fontSize: 10, textTransform: "uppercase", textAlign: "left" }}>{"Nation"}</th>
                    <th style={{ padding: "6px 8px", background: "var(--bg)", borderBottom: "2px solid var(--border)", fontWeight: 600, color: "var(--text-30)", fontSize: 10, textTransform: "uppercase", textAlign: "left", minWidth: 140 }}>{"Entry"}</th>
                    <th style={{ padding: "6px 8px", background: "var(--bg)", borderBottom: "2px solid var(--border)", fontWeight: 700, color: "var(--text-30)", fontSize: 10, textTransform: "uppercase", textAlign: "right" }}>{"Pts"}</th>
                    {matrix.voters.map(function(vi) {
                      var vName = nn[vi] || String(vi);
                      var isHl = sq && vName.toLowerCase().indexOf(sq) >= 0;
                      return <th key={vi} style={{
                        padding: "4px 2px", borderBottom: "2px solid var(--border)", fontWeight: isHl ? 700 : 500,
                        color: isHl ? "var(--gold)" : "var(--text-40)", fontSize: 10, textAlign: "center",
                        writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80, maxWidth: 22,
                        background: isHl ? "var(--gold-glow-12)" : "transparent",
                      }}>{vName}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrix.contestants.map(function(ci, rank) {
                    var cName = nn[ci] || String(ci);
                    var isHl = sq && cName.toLowerCase().indexOf(sq) >= 0;
                    var entry = entryLookup[String(ed)] && entryLookup[String(ed)][cName];
                    var entryFull = entry ? entry.artist + " \u2014 " + entry.song : "";
                    var entryShort = entry
                      ? (entry.artist.length > 14 ? entry.artist.slice(0, 13) + "\u2026" : entry.artist) + " \u2014 " +
                        (entry.song.length > 16 ? entry.song.slice(0, 15) + "\u2026" : entry.song)
                      : "";
                    var rowBg = isHl ? "var(--gold-glow-12)" : rank < 3 ? (rank === 0 ? "rgba(255,215,0,0.04)" : "var(--text-02)") : undefined;

                    return <tr key={ci} style={{ background: rowBg }}>
                      <td style={{
                        position: "sticky", left: 0, zIndex: 1, padding: "5px 8px",
                        background: isHl ? "var(--gold-glow-12)" : "var(--bg)",
                        fontWeight: 600, color: isHl ? "var(--gold)" : rank < 3 ? "var(--gold)" : "var(--text)",
                        borderBottom: "1px solid var(--text-04)", fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {String(rank + 1) + ". " + cName}
                      </td>
                      <td style={{
                        padding: "5px 6px", borderBottom: "1px solid var(--text-04)", fontSize: 11,
                        color: "var(--text-40)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis",
                        background: isHl ? "var(--gold-glow-12)" : "transparent",
                      }}>
                        <Tooltip text={entryFull}>
                          <span style={{ fontStyle: "italic" }}>{entryShort || "\u2014"}</span>
                        </Tooltip>
                      </td>
                      <td style={{
                        padding: "5px 6px", fontWeight: 700, color: "var(--blue)", textAlign: "right",
                        borderBottom: "1px solid var(--text-04)", fontSize: 12,
                        background: isHl ? "var(--gold-glow-12)" : "transparent",
                      }}>
                        {String(matrix.totals[ci] || 0)}
                      </td>
                      {matrix.voters.map(function(vi) {
                        var p = matrix.pts[vi] && matrix.pts[vi][ci];
                        var voterHl = sq && (nn[vi] || "").toLowerCase().indexOf(sq) >= 0;
                        return <td key={vi} style={{
                          padding: "3px 2px", textAlign: "center", fontSize: 11,
                          fontWeight: p >= 10 ? 700 : p ? 500 : 400,
                          color: p >= 12 ? "var(--gold)" : p >= 10 ? "var(--blue)" : p ? "var(--text-45)" : "var(--text-10)",
                          background: (isHl || voterHl) ? "var(--gold-glow-12)" : cellBg(p),
                          borderBottom: "1px solid var(--text-04)", minWidth: 22,
                        }}>{p ? String(p) : ""}</td>;
                      })}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* POINTS RECEIVED / GIVEN */}
      {(view === "received" || view === "given") && (
        <div className="fi">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Select Nation"}</div>
              <select value={selNation != null ? selNation : ""} onChange={function(e) { setSelNation(e.target.value ? Number(e.target.value) : null); setExpandAll(false); setSecNation(null); }}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "var(--input-bg)", border: "1px solid var(--border-10)", color: "var(--blue)", cursor: "pointer", minWidth: 200 }}>
                <option value="">{"Choose..."}</option>
                {sortedNations.map(function(pair) {
                  return <option key={pair[1]} value={pair[1]} style={{ background: "var(--dropdown-bg)", color: "var(--text)" }}>{pair[0]}</option>;
                })}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Filter " + (view === "received" ? "From" : "To") + " Nation"}</div>
              <select value={secNation != null ? secNation : ""} onChange={function(e) { setSecNation(e.target.value !== "" ? Number(e.target.value) : null); setExpandAll(false); }}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "var(--input-bg)", border: "1px solid var(--border-10)", color: "var(--purple)", cursor: "pointer", minWidth: 200 }}>
                <option value="">{"All nations"}</option>
                {sortedNations.map(function(pair) {
                  return <option key={pair[1]} value={pair[1]} style={{ background: "var(--dropdown-bg)", color: "var(--text)" }}>{pair[0]}</option>;
                })}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Edition Range"}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" value={brkEdFrom || ""} onChange={function(e) { setBrkEdFrom(Number(e.target.value) || D.e[0]); }} style={iStyle} />
                <span style={{ color: "var(--text-15)", fontSize: 12 }}>{"\u2013"}</span>
                <input type="number" value={brkEdTo || ""} onChange={function(e) { setBrkEdTo(Number(e.target.value) || D.e[1]); }} style={iStyle} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Subevent (none = all)"}</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[[0, "GF"], [3, "WL"], [1, "SF1"], [2, "SF2"], [4, "R1"], [5, "R2"]].map(function(pair) {
                  return <button key={pair[0]} className={"fb " + (selCats.indexOf(pair[0]) >= 0 ? "on" : "")} onClick={function() { toggleCat(pair[0]); }}>{pair[1]}</button>;
                })}
                {selCats.length > 0 && <button className="xb" onClick={function() { setSelCats([]); }} style={{ fontSize: 11, padding: "3px 8px" }}>All</button>}
              </div>
            </div>
          </div>

          {selNation != null && breakdown && (function() {
            var dataMap = view === "received" ? breakdown.received : breakdown.given;
            var eds = Object.keys(dataMap).map(Number).sort(function(a, b) { return a - b; });
            if (eds.length === 0) return <div style={{ padding: 32, color: "var(--text-25)", textAlign: "center" }}>{"No voting data for " + nn[selNation] + (secNation != null ? " with " + nn[secNation] : "") + " in this range"}</div>;

            var allNations = new Set();
            eds.forEach(function(eid) { Object.keys(dataMap[eid]).forEach(function(k) { allNations.add(Number(k)); }); });
            var nList = Array.from(allNations).map(function(ni) {
              var total = 0;
              eds.forEach(function(eid) { total += (dataMap[eid][ni] || 0); });
              return { idx: ni, total: total };
            }).sort(function(a, b) { return b.total - a.total; });
            var grandTotal = nList.reduce(function(s, x) { return s + x.total; }, 0);

            return (
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 4, color: "var(--blue)" }}>
                  {nn[selNation] + " \u2014 Points " + (view === "received" ? "Received" : "Given")}
                  {secNation != null && <span style={{ color: "var(--purple)" }}>{" " + (view === "received" ? "from " : "to ") + nn[secNation]}</span>}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-30)", marginBottom: 12 }}>
                  {eds.length + " editions \u00B7 " + nList.length + " " + (view === "received" ? "voters" : "recipients") + " \u00B7 " + grandTotal + " total points"}
                </p>
                <div style={{ overflowX: "auto", maxHeight: "70vh" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
                    <thead>
                      <tr>
                        <th style={{ position: "sticky", left: 0, zIndex: 2, padding: "6px 8px", background: "var(--bg)", borderBottom: "2px solid var(--border)", fontWeight: 600, color: "var(--text-30)", fontSize: 10, textTransform: "uppercase" }}>
                          {view === "received" ? "From voter" : "To nation"}
                        </th>
                        <th style={{ padding: "6px 6px", borderBottom: "2px solid var(--border)", fontWeight: 700, color: "var(--text-30)", fontSize: 10, textTransform: "uppercase", textAlign: "right" }}>{"Total"}</th>
                        {eds.map(function(eid) {
                          return <th key={eid} style={{ padding: "4px 2px", borderBottom: "2px solid var(--border)", fontWeight: 500, color: "var(--text-40)", fontSize: 10, textAlign: "center", minWidth: 28 }}>{String(eid)}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(expandAll ? nList : nList.slice(0, 50)).map(function(item) {
                        return <tr key={item.idx}>
                          <td style={{ position: "sticky", left: 0, zIndex: 1, padding: "4px 8px", background: "var(--bg)", fontWeight: 600, color: "var(--text-60)", borderBottom: "1px solid var(--text-04)", fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {nn[item.idx] || String(item.idx)}
                          </td>
                          <td style={{ padding: "4px 6px", fontWeight: 700, color: "var(--blue)", textAlign: "right", borderBottom: "1px solid var(--text-04)", fontSize: 12 }}>
                            {String(item.total)}
                          </td>
                          {eds.map(function(eid) {
                            var p = dataMap[eid] && dataMap[eid][item.idx];
                            return <td key={eid} style={{
                              padding: "3px 2px", textAlign: "center", fontSize: 11,
                              fontWeight: p >= 10 ? 700 : p ? 500 : 400,
                              color: p >= 12 ? "var(--gold)" : p >= 10 ? "var(--blue)" : p ? "var(--text-45)" : "var(--text-10)",
                              background: cellBg(p),
                              borderBottom: "1px solid var(--text-04)", minWidth: 28,
                            }}>{p ? String(p) : ""}</td>;
                          })}
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                {nList.length > 50 && (
                  <button className="xb" style={{ marginTop: 12 }} onClick={function() { setExpandAll(!expandAll); }}>
                    {expandAll ? "Show Top 50" : "Show All " + nList.length}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
