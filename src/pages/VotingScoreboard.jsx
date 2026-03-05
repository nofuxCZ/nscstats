import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader } from '../components/Shared';

var SUB_NAMES = ["GF", "SF1", "SF2"];

export default function VotingScoreboard() {
  var [D, setD] = useState(null);
  var [ed, setEd] = useState(null);
  var [sub, setSub] = useState(0);
  var [selNation, setSelNation] = useState(null);
  var [view, setView] = useState("scoreboard"); // scoreboard | received | given

  useEffect(function() {
    loadData("voting").then(function(d) {
      setD(d);
      setEd(d.e[1]); // latest edition
    });
  }, []);

  var allEds = useMemo(function() {
    if (!D) return [];
    return Array.from(new Set(D.r.map(function(r) { return r[0]; }))).sort(function(a, b) { return a - b; });
  }, [D]);

  // Available subs for selected edition
  var availSubs = useMemo(function() {
    if (!D || !ed) return [];
    return Array.from(new Set(D.r.filter(function(r) { return r[0] === ed; }).map(function(r) { return r[1]; }))).sort();
  }, [D, ed]);

  // Build scoreboard matrix for current edition + sub
  var matrix = useMemo(function() {
    if (!D || !ed) return null;
    var recs = D.r.filter(function(r) { return r[0] === ed && r[1] === sub; });
    if (recs.length === 0) return null;

    // Get all contestants (recipients) and voters
    var contestants = new Set();
    var voters = new Set();
    recs.forEach(function(r) {
      voters.add(r[2]);
      var pairs = r[3];
      for (var i = 0; i < pairs.length; i += 2) contestants.add(pairs[i]);
    });

    // Build points map: voter -> recipient -> points
    var pts = {};
    var recipientTotals = {};
    recs.forEach(function(r) {
      var vi = r[2];
      pts[vi] = pts[vi] || {};
      var pairs = r[3];
      for (var i = 0; i < pairs.length; i += 2) {
        pts[vi][pairs[i]] = pairs[i + 1];
        recipientTotals[pairs[i]] = (recipientTotals[pairs[i]] || 0) + pairs[i + 1];
      }
    });

    // Sort contestants by total points desc
    var cList = Array.from(contestants).sort(function(a, b) { return (recipientTotals[b] || 0) - (recipientTotals[a] || 0); });
    var vList = Array.from(voters).sort(function(a, b) { return (D.n[a] || "").localeCompare(D.n[b] || ""); });

    return { contestants: cList, voters: vList, pts: pts, totals: recipientTotals };
  }, [D, ed, sub]);

  // Build nation-by-edition breakdown
  var breakdown = useMemo(function() {
    if (!D || selNation == null) return null;
    // Points RECEIVED by selNation from each voter, by edition
    var received = {}; // { edition: { voterIdx: points } }
    var given = {}; // { edition: { recipientIdx: points } }
    D.r.forEach(function(r) {
      var redition = r[0], rcat = r[1], vi = r[2], pairs = r[3];
      for (var i = 0; i < pairs.length; i += 2) {
        if (pairs[i] === selNation) {
          // selNation received points from vi in this edition
          if (!received[redition]) received[redition] = {};
          received[redition][vi] = (received[redition][vi] || 0) + pairs[i + 1];
        }
        if (vi === selNation) {
          // selNation gave points to pairs[i]
          if (!given[redition]) given[redition] = {};
          given[redition][pairs[i]] = (given[redition][pairs[i]] || 0) + pairs[i + 1];
        }
      }
    });
    return { received: received, given: given };
  }, [D, selNation]);

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

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>{"Voting Scoreboard"}</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>{"Detailed voting data for editions " + D.e[0] + "\u2013" + D.e[1]}</p>

      {/* View tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 16 }}>
        {[["scoreboard", "Edition Scoreboard"], ["received", "Points Received"], ["given", "Points Given"]].map(function(t) {
          return <button key={t[0]} className={"tt " + (view === t[0] ? "on" : "")} onClick={function() { setView(t[0]); }}>{t[1]}</button>;
        })}
      </div>

      {/* SCOREBOARD VIEW */}
      {view === "scoreboard" && (
        <div className="fi">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <select value={ed || ""} onChange={function(e) { setEd(Number(e.target.value)); setSub(0); }}
              style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 700, background: "var(--input-bg)", border: "1px solid var(--border-10)", color: "var(--gold)", cursor: "pointer", fontFamily: "var(--font-display)" }}>
              {allEds.map(function(e) { return <option key={e} value={e} style={{ background: "var(--dropdown-bg)", color: "var(--text)" }}>{"#" + e}</option>; })}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              {availSubs.map(function(s) {
                return <button key={s} className={"fb " + (sub === s ? "on" : "")} onClick={function() { setSub(s); }}>{SUB_NAMES[s] || String(s)}</button>;
              })}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-30)" }}>
              {matrix ? String(matrix.contestants.length) + " contestants, " + String(matrix.voters.length) + " voters" : "No data"}
            </span>
          </div>

          {matrix && (
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "75vh" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th style={{ position: "sticky", left: 0, zIndex: 3, padding: "6px 8px", background: "var(--bg)", borderBottom: "2px solid var(--border)", fontWeight: 600, color: "var(--text-30)", fontSize: 10, textTransform: "uppercase" }}>{"Nation"}</th>
                    <th style={{ position: "sticky", left: 0, zIndex: 2, padding: "6px 8px", background: "var(--bg)", borderBottom: "2px solid var(--border)", fontWeight: 600, color: "var(--text-30)", fontSize: 10, textTransform: "uppercase", textAlign: "right" }}>{"Pts"}</th>
                    {matrix.voters.map(function(vi) {
                      return <th key={vi} style={{
                        padding: "4px 2px", borderBottom: "2px solid var(--border)", fontWeight: 500,
                        color: "var(--text-40)", fontSize: 10, textAlign: "center",
                        writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80, maxWidth: 22,
                      }}>{nn[vi] || String(vi)}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrix.contestants.map(function(ci, rank) {
                    return <tr key={ci} style={rank < 3 ? { background: rank === 0 ? "rgba(255,215,0,0.04)" : "var(--text-02)" } : undefined}>
                      <td style={{ position: "sticky", left: 0, zIndex: 1, padding: "5px 8px", background: "var(--bg)", fontWeight: 600, color: rank < 3 ? "var(--gold)" : "var(--text)", borderBottom: "1px solid var(--text-04)", fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {String(rank + 1) + ". " + (nn[ci] || String(ci))}
                      </td>
                      <td style={{ position: "sticky", left: 0, padding: "5px 6px", background: "var(--bg)", fontWeight: 700, color: "var(--blue)", textAlign: "right", borderBottom: "1px solid var(--text-04)", fontSize: 12 }}>
                        {String(matrix.totals[ci] || 0)}
                      </td>
                      {matrix.voters.map(function(vi) {
                        var p = matrix.pts[vi] && matrix.pts[vi][ci];
                        return <td key={vi} style={{
                          padding: "3px 2px", textAlign: "center", fontSize: 11,
                          fontWeight: p >= 10 ? 700 : p ? 500 : 400,
                          color: p >= 12 ? "var(--gold)" : p >= 10 ? "var(--blue)" : p ? "var(--text-45)" : "var(--text-10)",
                          background: cellBg(p),
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
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Select Nation"}</div>
            <select value={selNation != null ? selNation : ""} onChange={function(e) { setSelNation(e.target.value ? Number(e.target.value) : null); }}
              style={{ padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "var(--input-bg)", border: "1px solid var(--border-10)", color: "var(--blue)", cursor: "pointer", minWidth: 200 }}>
              <option value="">{"Choose..."}</option>
              {nn.slice().map(function(n, i) { return [n, i]; }).sort(function(a, b) { return a[0].localeCompare(b[0]); }).map(function(pair) {
                return <option key={pair[1]} value={pair[1]} style={{ background: "var(--dropdown-bg)", color: "var(--text)" }}>{pair[0]}</option>;
              })}
            </select>
          </div>

          {selNation != null && breakdown && (function() {
            var dataMap = view === "received" ? breakdown.received : breakdown.given;
            var eds = Object.keys(dataMap).map(Number).sort(function(a, b) { return a - b; });
            if (eds.length === 0) return <div style={{ padding: 32, color: "var(--text-25)", textAlign: "center" }}>{"No voting data for " + nn[selNation]}</div>;

            // Get all nations involved
            var allNations = new Set();
            eds.forEach(function(eid) { Object.keys(dataMap[eid]).forEach(function(k) { allNations.add(Number(k)); }); });
            // Sort nations by total points
            var nList = Array.from(allNations).map(function(ni) {
              var total = 0;
              eds.forEach(function(eid) { total += (dataMap[eid][ni] || 0); });
              return { idx: ni, total: total };
            }).sort(function(a, b) { return b.total - a.total; });

            return (
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 4, color: "var(--blue)" }}>
                  {nn[selNation] + " \u2014 Points " + (view === "received" ? "Received From" : "Given To")}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-30)", marginBottom: 12 }}>
                  {eds.length + " editions with data \u00B7 " + nList.length + " " + (view === "received" ? "voters" : "recipients")}
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
                      {nList.slice(0, 50).map(function(item) {
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
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
