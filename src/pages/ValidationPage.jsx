import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader } from '../components/Shared';

// Map: voting subevent code -> editions.json key
var SUB_TO_DB = { 0: "gf", 1: "sf1", 2: "sf2" };
var SUB_LABELS = { 0: "GF", 1: "SF1", 2: "SF2" };

// Name aliases: DB name -> voting name
var NAME_ALIASES = {
  "FR Meridia": "Federal Republic of Meridia",
  "Meridia": "Federal Republic of Meridia",
  "Grandy Duchy of Strenci": "Grand Duchy of Strenci",
  "GD Strenci": "Grand Duchy of Strenci",
  "UK Destrion": "United Kingdom of Destrion",
  "Dez Reublic": "Dež Republic",
  "Waiting list of Shelley & Nici": "Waiting Iist of Shelley & Nici",
  "Waiting Iist of Shelley & Nici, Tanner & Josh, Tiffany & Krista and Denise & James Earl": "Waiting Iist of Shelley & Nici",
  "Emsfrõnt": "Emsfrynt",
};

// Strip diacritics for fuzzy matching
function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Try to find nation index with fuzzy matching
function findNationIdx(nat, nn, nnLower) {
  // Direct match
  var direct = nn.indexOf(nat);
  if (direct >= 0) return direct;
  // Alias
  var alias = NAME_ALIASES[nat];
  if (alias) { var ai = nn.indexOf(alias); if (ai >= 0) return ai; }
  // Case-insensitive
  var low = nat.toLowerCase();
  if (nnLower[low] !== undefined) return nnLower[low];
  // Alias lowercase
  if (alias) { var al = alias.toLowerCase(); if (nnLower[al] !== undefined) return nnLower[al]; }
  // Diacritics-stripped
  var stripped = stripDiacritics(nat);
  for (var i = 0; i < nn.length; i++) {
    if (stripDiacritics(nn[i]) === stripped) return i;
  }
  return -1;
}

// Find nation idx, preferring whichever has actual votes for this edition+subevent
function findBestNationIdx(nat, nn, nnLower, votingTotals) {
  var directIdx = nn.indexOf(nat);
  var aliasIdx = -1;
  var alias = NAME_ALIASES[nat];
  if (alias) aliasIdx = nn.indexOf(alias);

  // If only one found, use it
  if (directIdx >= 0 && aliasIdx < 0) return directIdx;
  if (aliasIdx >= 0 && directIdx < 0) return aliasIdx;
  if (directIdx < 0 && aliasIdx < 0) return findNationIdx(nat, nn, nnLower); // fallback to fuzzy

  // Both found — prefer whichever has votes in this context
  var directPts = votingTotals[directIdx] || 0;
  var aliasPts = votingTotals[aliasIdx] || 0;
  if (aliasPts > 0 && directPts === 0) return aliasIdx;
  return directIdx; // default to direct
}

export default function ValidationPage() {
  var [voting, setVoting] = useState(null);
  var [editions, setEditions] = useState(null);

  useEffect(function() {
    Promise.all([loadData("voting"), loadData("editions")]).then(function(arr) {
      setVoting(arr[0]);
      setEditions(arr[1]);
    });
  }, []);

  var results = useMemo(function() {
    if (!voting || !editions) return null;
    var nn = voting.n;
    var nnLower = {};
    nn.forEach(function(n, i) { nnLower[n.toLowerCase()] = i; });
    var allEds = Array.from(new Set(voting.r.map(function(r) { return r[0]; }))).sort(function(a, b) { return a - b; });

    var edResults = [];
    var totalMismatches = 0;
    var totalChecked = 0;
    var totalEditions = 0;
    var cleanEditions = 0;

    allEds.forEach(function(edNum) {
      var edData = editions[String(edNum)];
      if (!edData) return;
      totalEditions++;
      var edMismatches = [];

      // Check each subevent: 0->gf, 1->sf1, 2->sf2
      [0, 1, 2].forEach(function(subCode) {
        var dbKey = SUB_TO_DB[subCode];
        var dbEntries = edData[dbKey];
        if (!dbEntries || dbEntries.length === 0) return;

        // Sum up points from voting records for this edition + subevent
        var votingTotals = {};
        voting.r.forEach(function(r) {
          if (r[0] !== edNum || r[1] !== subCode) return;
          var pairs = r[3];
          for (var i = 0; i < pairs.length; i += 2) {
            votingTotals[pairs[i]] = (votingTotals[pairs[i]] || 0) + pairs[i + 1];
          }
        });

        var hasVotingData = Object.keys(votingTotals).length > 0;
        if (!hasVotingData) return;

        dbEntries.forEach(function(entry) {
          var nat = entry[1];
          var dbPts = entry[5] || 0;
          var place = entry[4];
          // Find nation index
          var ni = findBestNationIdx(nat, nn, nnLower, votingTotals);
          var votPts = ni >= 0 ? (votingTotals[ni] || 0) : -1;
          totalChecked++;

          if (ni < 0) {
            // Nation not found in voting names
            edMismatches.push({
              edition: edNum, sub: SUB_LABELS[subCode], nation: nat, place: place,
              dbPts: dbPts, votPts: 0, diff: dbPts,
              reason: "Nation not in voting data" + (NAME_ALIASES[nat] ? " (alias tried: " + NAME_ALIASES[nat] + ")" : "")
            });
            totalMismatches++;
          } else if (Math.abs(dbPts - votPts) > 0.5) {
            edMismatches.push({
              edition: edNum, sub: SUB_LABELS[subCode], nation: nat, place: place,
              dbPts: dbPts, votPts: votPts, diff: dbPts - votPts,
              reason: "Points mismatch"
            });
            totalMismatches++;
          }
        });
      });

      if (edMismatches.length === 0) {
        cleanEditions++;
      }
      edResults.push({ edition: edNum, mismatches: edMismatches });
    });

    return {
      editions: edResults,
      totalMismatches: totalMismatches,
      totalChecked: totalChecked,
      totalEditions: totalEditions,
      cleanEditions: cleanEditions,
    };
  }, [voting, editions]);

  if (!voting || !editions) return <Loader t="Loading data..." />;
  if (!results) return <Loader t="Computing validation..." />;

  var mismatched = results.editions.filter(function(e) { return e.mismatches.length > 0; });
  var allMismatches = [];
  mismatched.forEach(function(e) {
    e.mismatches.forEach(function(m) { allMismatches.push(m); });
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "linear-gradient(135deg, var(--text), var(--red, #e74c3c))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
        Data Validation
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 20 }}>
        Cross-checks voting scoreboard point totals against the database. Each subevent (GF, SF1, SF2) is checked independently.
      </p>

      {/* Summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          [results.totalChecked, "Entries Checked", "var(--blue)"],
          [results.cleanEditions + " / " + results.totalEditions, "Clean Editions", "var(--green, #27ae60)"],
          [results.totalMismatches, "Mismatches", results.totalMismatches > 0 ? "var(--red, #e74c3c)" : "var(--green, #27ae60)"],
        ].map(function(s) {
          return (
            <div key={s[1]} style={{
              flex: "1 1 160px", padding: "16px 20px", borderRadius: 12,
              background: "var(--text-03)", border: "1px solid var(--border)",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color: s[2] }}>{s[0]}</div>
              <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1 }}>{s[1]}</div>
            </div>
          );
        })}
      </div>

      {results.totalMismatches === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--green, #27ae60)", fontSize: 16, fontWeight: 700 }}>
          All voting scoreboard totals match the database. No mismatches found.
        </div>
      ) : (
        <div className="fi">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 12, color: "var(--red, #e74c3c)" }}>
            {allMismatches.length} Mismatches Found
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Edition", "Subevent", "Nation", "Place", "DB Points", "Voting Points", "Diff", "Reason"].map(function(h, i) {
                    return <th key={h} style={{
                      padding: "10px 10px", fontSize: 11, fontWeight: 600,
                      color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.5px",
                      textAlign: i >= 4 && i <= 6 ? "right" : "left",
                      borderBottom: "1px solid var(--border-08)",
                    }}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {allMismatches.map(function(m, i) {
                  var diffColor = m.diff > 0 ? "var(--red, #e74c3c)" : m.diff < 0 ? "var(--blue)" : "var(--text-40)";
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? "var(--text-02)" : "transparent" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--gold)" }}>#{m.edition}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--blue)" }}>{m.sub}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--text)" }}>{m.nation}</td>
                      <td style={{ padding: "8px 10px", color: "var(--text-40)" }}>{m.place || "\u2014"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "var(--text-60)" }}>{m.dbPts}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: m.votPts === 0 && m.reason.indexOf("not in") >= 0 ? "var(--text-20)" : "var(--text-60)" }}>{m.votPts}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: diffColor }}>
                        {m.diff > 0 ? "+" : ""}{Math.round(m.diff)}
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-30)", fontStyle: "italic" }}>{m.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Per-edition summary */}
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 12, color: "var(--text-60)" }}>
            By Edition
          </h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {results.editions.map(function(e) {
              var n = e.mismatches.length;
              return (
                <div key={e.edition} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: n === 0 ? "var(--green-glow-10, rgba(39,174,96,0.1))" : "var(--red-glow-10, rgba(231,76,60,0.1))",
                  border: "1px solid " + (n === 0 ? "var(--green-glow-25, rgba(39,174,96,0.25))" : "var(--red-glow-25, rgba(231,76,60,0.25))"),
                  color: n === 0 ? "var(--green, #27ae60)" : "var(--red, #e74c3c)",
                }}>
                  #{e.edition}{n > 0 ? " (" + n + ")" : ""}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
