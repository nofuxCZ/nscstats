import { useState } from 'react';

var BASE = "https://nscstats.com/data";

var ENDPOINTS = [
  {
    id: "database",
    name: "Database",
    url: BASE + "/database.json",
    size: "~2.1 MB",
    desc: "Complete entry database — every nation, artist, song, placement, and points across all editions.",
    format: "Array of arrays. Each entry:",
    fields: [
      ["[0]", "edition", "number", "Edition number (1–248)"],
      ["[1]", "subevent", "number", "0 = Grand Final, 1 = SF1, 2 = SF2, 3 = MPQ"],
      ["[2]", "draw", "number|null", "Running order position"],
      ["[3]", "nation", "string", "Nation name"],
      ["[4]", "artist", "string", "Artist name"],
      ["[5]", "song", "string", "Song title"],
      ["[6]", "place", "number|null", "Final placement"],
      ["[7]", "points", "number|null", "Total points received"],
      ["[8]", "youtube", "string|null", "YouTube/Vimeo URL or video ID"],
    ],
    example: '[248, 0, 10, "New Bander State", "The Family Crest", "Beneath the Brine", 1, 169.0, "https://vimeo.com/1162896077?"]',
    snippets: {
      python: `import requests\n\ndata = requests.get("${BASE}/database.json").json()\n\n# All GF winners\nwinners = [e for e in data if e[1] == 0 and e[6] == 1]\nfor w in winners[-5:]:\n    print(f"#{w[0]}: {w[3]} — {w[4]} \\"{w[5]}\\" ({w[7]} pts)")`,
      javascript: `const res = await fetch("${BASE}/database.json");\nconst data = await res.json();\n\n// Top 10 highest-scoring GF entries\nconst gf = data.filter(e => e[1] === 0 && e[7]);\ngf.sort((a, b) => b[7] - a[7]);\ngf.slice(0, 10).forEach(e =>\n  console.log(\`#\${e[0]} \${e[3]}: \${e[7]} pts\`)\n);`,
    },
  },
  {
    id: "editions",
    name: "Editions",
    url: BASE + "/editions.json",
    size: "~2.0 MB",
    desc: "Per-edition results with metadata, separated by subevent (GF, SF1, SF2, MPQ).",
    format: 'Object keyed by edition number (string). Each edition contains:',
    fields: [
      ["m", "meta", "object", "Edition metadata (see below)"],
      ["gf", "grand final", "array", "GF results — each entry: [draw, nation, artist, song, place, points, youtube]"],
      ["sf1", "semifinal 1", "array", "SF1 results (same format)"],
      ["sf2", "semifinal 2", "array", "SF2 results (same format)"],
      ["mpq", "microstate QF", "array", "MPQ results (same format, older editions only)"],
    ],
    example: null,
    meta: [
      ["w", "Winner nation name"],
      ["wa", "Winner artist"],
      ["ws", "Winner song"],
      ["wp", "Winner points"],
      ["gs", "GF participant count"],
      ["s1 / s2", "SF1 / SF2 participant count"],
      ["mg", "Margin of victory (points)"],
      ["ru", "Runner-up nation"],
      ["rup", "Runner-up points"],
      ["r1 / r2", "REJU qualifier from SF1 / SF2"],
      ["nw", "Nth win for this nation"],
    ],
    snippets: {
      python: `import requests\n\ndata = requests.get("${BASE}/editions.json").json()\ned = data["248"]\n\nprint(f"Winner: {ed['m']['w']} — {ed['m']['wa']} \\"{ed['m']['ws']}\\" ({ed['m']['wp']} pts)")\nprint(f"Runner-up: {ed['m']['ru']} ({ed['m']['rup']} pts)")\n\n# GF top 6\nfor entry in sorted(ed["gf"], key=lambda x: x[4] or 999)[:6]:\n    print(f"  {entry[4]}. {entry[1]} — {entry[5]} pts")`,
      javascript: `const data = await (await fetch("${BASE}/editions.json")).json();\nconst ed = data["248"];\n\nconsole.log(\`Winner: \${ed.m.w} with \${ed.m.wp} pts\`);\n\n// SF1 qualifiers (top 10)\ned.sf1\n  .filter(e => e[4] <= 10)\n  .sort((a, b) => a[4] - b[4])\n  .forEach(e => console.log(\`  \${e[4]}. \${e[1]}\`));`,
    },
  },
  {
    id: "nations",
    name: "Nations",
    url: BASE + "/nations.json",
    size: "~1.0 MB",
    desc: "Nation profiles with career stats and full edition history.",
    format: 'Object with keys "p" (profiles) and "l" (leaderboard). Profiles keyed by nation name.',
    fields: [
      ["n", "name", "string", "Nation name"],
      ["gf", "GF entries", "number", "Total Grand Final appearances"],
      ["sf", "SF entries", "number", "Total semifinal appearances"],
      ["sfQ / sfD", "SF qual/elim", "number", "Times qualified / eliminated from SF"],
      ["qr", "qual rate", "number", "Qualification rate (%)"],
      ["te", "total editions", "number", "Total editions participated"],
      ["fe / le", "first/last ed", "number", "First and last edition number"],
      ["w", "wins", "number", "Total wins"],
      ["we", "win editions", "array", "Edition numbers of wins"],
      ["t3 / t6 / t10", "top N", "number", "Podiums / Top 6 / Top 10 count"],
      ["bp / bpts", "best place/pts", "number", "Best GF placement / highest GF points"],
      ["ap / apl", "avg pts/place", "number", "Average GF points / average GF placement"],
      ["bs", "best streak", "number", "Longest consecutive GF qualification streak"],
      ["rj", "REJU quals", "number", "Times qualified via REJU"],
      ["h", "history", "array", "Per-edition history (see below)"],
    ],
    example: null,
    meta: [
      ["h[0]", "Edition number"],
      ["h[1]", "SF subevent (\"SF1\"/\"SF2\") or null if pre-qualified"],
      ["h[2]", "SF draw position (or null)"],
      ["h[3]", "SF points (or null)"],
      ["h[4]", "GF place (or null if didn't qualify)"],
      ["h[5]", "GF points (or null)"],
      ["h[6]", "Artist"],
      ["h[7]", "Song"],
    ],
    snippets: {
      python: `import requests\n\ndata = requests.get("${BASE}/nations.json").json()\np = data["p"]["Trollheimr"]\n\nprint(f"{p['n']}: {p['w']} wins, {p['gf']} GF entries, avg place {p['apl']}")\nprint(f"Qual rate: {p['qr']}% ({p['sfQ']}/{p['sf']})")\n\n# Last 5 results\nfor h in p["h"][-5:]:\n    gf = f"GF #{h[4]} ({h[5]} pts)" if h[4] else "DNQ"\n    print(f"  Ed {h[0]}: {h[6]} — {gf}")`,
      javascript: `const data = await (await fetch("${BASE}/nations.json")).json();\n\n// Top 10 nations by win count\nconst nations = Object.values(data.p);\nnations.sort((a, b) => b.w - a.w);\nnations.slice(0, 10).forEach((n, i) =>\n  console.log(\`\${i+1}. \${n.n}: \${n.w} wins, \${n.gf} GFs\`)\n);`,
    },
  },
  {
    id: "voting",
    name: "Voting",
    url: BASE + "/voting.json",
    size: "~840 KB",
    desc: "Voting records for editions with scoreboard data (currently 188–248). Used for similarity analysis and points breakdown.",
    format: "Object with keys:",
    fields: [
      ["r", "records", "array", "Voting records — each: [edition, subevent, voter_idx, [recipient_idx, points, ...], is_participant]"],
      ["n", "names", "array", "Nation name lookup — index corresponds to voter/recipient indices in records"],
      ["l", "love list", "array", "Top 300 mutual point exchanges — [from_idx, to_idx, total_pts, edition_count]"],
      ["e", "edition range", "array", "[first_edition, last_edition] with voting data"],
      ["og", "owner groups", "array", "Groups of nation indices belonging to same owner"],
    ],
    example: null,
    meta: [
      ["r subevent codes", "0 = GF, 1 = SF1, 2 = SF2, 3 = WL Jury, 4 = REJU 1, 5 = REJU 2"],
      ["r[3] pairs", "Flat array of [nation_idx, points, nation_idx, points, ...] — the voter's full set of points"],
      ["r[4] is_participant", "1 if the voter was also a contestant in that subevent, 0 if external voter (e.g. WL jury)"],
    ],
    snippets: {
      python: `import requests\n\ndata = requests.get("${BASE}/voting.json").json()\nnames = data["n"]\n\n# Find who gave Trollheimr the most 12-point votes\ntroll_idx = names.index("Trollheimr")\ntwelves = {}  # voter_name -> count\nfor rec in data["r"]:\n    ed, sub, voter_idx, pairs, _ = rec\n    for i in range(0, len(pairs), 2):\n        if pairs[i] == troll_idx and pairs[i+1] == 12:\n            vn = names[voter_idx]\n            twelves[vn] = twelves.get(vn, 0) + 1\n\nfor n, c in sorted(twelves.items(), key=lambda x: -x[1])[:5]:\n    print(f"  {n}: {c} times 12 pts")`,
      javascript: `const data = await (await fetch("${BASE}/voting.json")).json();\nconst names = data.n;\n\n// Edition 248 GF scoreboard totals\nconst recs = data.r.filter(r => r[0] === 248 && r[1] === 0);\nconst totals = {};\nrecs.forEach(([ed, sub, vi, pairs]) => {\n  for (let i = 0; i < pairs.length; i += 2)\n    totals[pairs[i]] = (totals[pairs[i]] || 0) + pairs[i+1];\n});\nObject.entries(totals)\n  .sort((a, b) => b[1] - a[1])\n  .slice(0, 5)\n  .forEach(([ni, pts]) => console.log(\`\${names[ni]}: \${pts} pts\`));`,
    },
  },
  {
    id: "roster",
    name: "Roster",
    url: BASE + "/roster.json",
    size: "~39 KB",
    desc: "Current, WL, and defunct nation registry with owner information.",
    format: "Object with keys:",
    fields: [
      ["r", "roster", "array", 'Nation entries — each: {n: name, s: status ("current"/"wl"/"defunct"), o: owner, ln: latest_nation_name}'],
      ["ol", "owner lookup", "object", "owner_name → their current/latest nation name"],
      ["on", "owner nations", "object", "owner_name → array of all nation names they've owned"],
    ],
    example: '{"n": "Trollheimr", "s": "current", "o": "Stargazer", "ln": "Trollheimr"}',
    snippets: {
      python: `import requests\n\ndata = requests.get("${BASE}/roster.json").json()\n\ncurrent = [r for r in data["r"] if r["s"] == "current"]\nprint(f"{len(current)} active nations")\nfor r in sorted(current, key=lambda x: x['n'])[:10]:\n    print(f"  {r['n']} (owner: {r['o']})")`,
      javascript: `const data = await (await fetch("${BASE}/roster.json")).json();\n\n// Find all nations owned by a specific player\nconst owner = "Stargazer";\nconst nations = data.on[owner] || [];\nconsole.log(\`\${owner} owns: \${nations.join(", ")}\`);`,
    },
  },
  {
    id: "homepage",
    name: "Homepage Stats",
    url: BASE + "/homepage.json",
    size: "~4 KB",
    desc: "Pre-computed dashboard statistics, top nations, recent winners, top artists, and record scores.",
    format: "Object with keys:",
    fields: [
      ["s", "stats", "object", "Aggregate stats (te=total editions, tn=total nations, gf=GF entries, sf=SF entries, ue/ua/us=unique entries/artists/songs, hs=highest score, etc.)"],
      ["tn", "top nations", "array", "Top 15 nations by wins — {n, w, e, t3, t5, ap, apl}"],
      ["rw", "recent winners", "array", "Last 15 edition winners — {e, n, a, s, p}"],
      ["ta", "top artists", "array", "Most-entered artists — {a, c} (artist, count)"],
      ["rs", "record scores", "array", "All-time highest GF scores — {e, n, a, s, p}"],
    ],
    example: null,
    snippets: {
      python: `import requests\n\ndata = requests.get("${BASE}/homepage.json").json()\ns = data["s"]\nprint(f"NSC: {s['te']} editions, {s['tn']} nations, {s['ue']} unique entries")\nprint(f"All-time high score: {s['hs']} pts by {s['hsn']} (Ed {s['hse']})")`,
      javascript: `const data = await (await fetch("${BASE}/homepage.json")).json();\n\n// Last 5 winners\ndata.rw.slice(0, 5).forEach(w =>\n  console.log(\`#\${w.e}: \${w.n} — \${w.a} "\${w.s}" (\${w.p} pts)\`)\n);`,
    },
  },
];

function CodeBlock({ code, lang }) {
  var [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 1500);
    });
  }
  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", background: "var(--text-06)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase" }}>{lang}</span>
        <span onClick={copy} style={{ fontSize: 11, cursor: "pointer", color: copied ? "var(--green, #48bb78)" : "var(--text-30)" }}>
          {copied ? "Copied!" : "Copy"}
        </span>
      </div>
      <pre style={{ margin: 0, padding: "12px 14px", background: "var(--text-03)", fontSize: 12, lineHeight: 1.5, color: "var(--text-60)", overflowX: "auto", whiteSpace: "pre" }}><code>{code}</code></pre>
    </div>
  );
}

export default function ApiDocsPage() {
  var [openId, setOpenId] = useState("database");
  var [lang, setLang] = useState("python");

  var ep = ENDPOINTS.find(function(e) { return e.id === openId; }) || ENDPOINTS[0];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "linear-gradient(135deg, var(--text), var(--blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
        Data API
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-45)", marginBottom: 6 }}>
        All NSC Stats data is available as public JSON files. No authentication required.
      </p>
      <p style={{ fontSize: 13, color: "var(--text-30)", marginBottom: 20 }}>
        Fetch any endpoint directly and filter client-side. Data updates automatically after each edition via GitHub Actions.
        Perfect for Discord bots, spreadsheets, or custom tools.
      </p>

      {/* Endpoint tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 2, marginBottom: 24, overflowX: "auto" }}>
        {ENDPOINTS.map(function(e) {
          return <button key={e.id} className={"tt " + (openId === e.id ? "on" : "")} onClick={function() { setOpenId(e.id); }}>
            {e.name}
          </button>;
        })}
      </div>

      {/* Endpoint detail */}
      <div className="fi" key={ep.id}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{ep.name}</h2>
            <p style={{ fontSize: 13, color: "var(--text-40)", marginBottom: 8 }}>{ep.desc}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-25)", padding: "3px 8px", borderRadius: 4, background: "var(--text-04)" }}>{ep.size}</span>
            <a href={ep.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", padding: "4px 12px", borderRadius: 6, background: "var(--blue-glow-15)", textDecoration: "none" }}>
              Open JSON ↗
            </a>
          </div>
        </div>

        {/* URL */}
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--text-03)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 13, color: "var(--gold)", marginBottom: 16, overflowX: "auto", whiteSpace: "nowrap" }}>
          GET {ep.url}
        </div>

        {/* Format */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Structure</div>
          <p style={{ fontSize: 13, color: "var(--text-45)", marginBottom: 8 }}>{ep.format}</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Key", "Field", "Type", "Description"].map(function(h) {
                  return <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid var(--border-08)" }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {ep.fields.map(function(f) {
                return <tr key={f[0]}>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>{f[0]}</td>
                  <td style={{ padding: "6px 10px", color: "var(--text-60)" }}>{f[1]}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11, color: "var(--blue)" }}>{f[2]}</td>
                  <td style={{ padding: "6px 10px", color: "var(--text-40)", fontSize: 12 }}>{f[3]}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        {/* Additional meta table (editions, nations, voting) */}
        {ep.meta && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              {ep.id === "editions" ? "Meta Fields (m)" : ep.id === "nations" ? "History Entry (h)" : "Notes"}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {ep.meta.map(function(m) {
                  return <tr key={m[0]}>
                    <td style={{ padding: "5px 10px", fontFamily: "monospace", fontSize: 12, color: "var(--gold)", fontWeight: 600, width: 120 }}>{m[0]}</td>
                    <td style={{ padding: "5px 10px", color: "var(--text-40)", fontSize: 12 }}>{m[1]}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Example value */}
        {ep.example && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Example Entry</div>
            <pre style={{ padding: "10px 14px", borderRadius: 8, background: "var(--text-03)", fontSize: 12, color: "var(--text-50)", overflowX: "auto", whiteSpace: "pre-wrap", margin: 0 }}>{ep.example}</pre>
          </div>
        )}

        {/* Code examples */}
        {ep.snippets && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1 }}>Code Examples</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[["python", "Python"], ["javascript", "JavaScript"]].map(function(l) {
                  return <button key={l[0]} className={"fb " + (lang === l[0] ? "on" : "")}
                    onClick={function() { setLang(l[0]); }}
                    style={{ fontSize: 11, padding: "3px 10px" }}>{l[1]}</button>;
                })}
              </div>
            </div>
            <CodeBlock code={ep.snippets[lang]} lang={lang} />
          </div>
        )}
      </div>

      {/* Rate limits note */}
      <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, background: "var(--text-03)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-60)", marginBottom: 6 }}>Usage Notes</div>
        <div style={{ fontSize: 13, color: "var(--text-40)", lineHeight: 1.6 }}>
          These are static files served via Vercel's CDN. There are no rate limits, but please cache responses locally — the data only updates after each new edition (roughly every 2 weeks).
          For Discord bots, fetch once on startup or on a timer, then query your local copy. The total download for all files is about 6 MB.
          Data is provided as-is from the NSC Wiki. If you find errors, report them on the wiki or contact the NSC Stats team.
        </div>
      </div>
    </div>
  );
}
