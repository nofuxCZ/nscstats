import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader, SN, SB, PB, PL, Pg, YtLink } from '../components/Shared';

export default function DatabasePage() {
  const [d, setD] = useState(null);
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(0);
  const [sc, setSc] = useState("edition");
  const [sd, setSd] = useState("desc");
  const [subFilter, setSubFilter] = useState("All");
  const [nationFilter, setNationFilter] = useState("");

  useEffect(() => {
    loadData("database").then(r => {
      setD(r.map(r => ({
        edition: r[0], sub: SN[r[1]], draw: r[2], nation: r[3],
        artist: r[4], song: r[5], place: r[6], points: r[7], yt: r[8],
      })));
    });
  }, []);

  const PS = 50;
  const qs = q.toLowerCase().trim();

  const nations = useMemo(() => {
    if (!d) return [];
    return [...new Set(d.map(r => r.nation))].sort();
  }, [d]);

  const fl = useMemo(() => {
    if (!d) return [];
    let rows = d;
    if (subFilter !== "All") rows = rows.filter(r => r.sub === subFilter);
    if (nationFilter) rows = rows.filter(r => r.nation === nationFilter);
    if (qs) rows = rows.filter(r =>
      r.artist.toLowerCase().includes(qs) ||
      r.song.toLowerCase().includes(qs) ||
      r.nation.toLowerCase().includes(qs)
    );
    return [...rows].sort((a, b) => {
      let va = a[sc], vb = b[sc];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
      return sd === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  }, [d, qs, sc, sd, subFilter, nationFilter]);

  if (!d) return <Loader t="Loading 18,807 entries…" />;

  const tp = Math.ceil(fl.length / PS);
  const rows = fl.slice(pg * PS, (pg + 1) * PS);

  const sort = c => {
    if (sc === c) setSd(x => x === "asc" ? "desc" : "asc");
    else { setSc(c); setSd(c === "edition" ? "desc" : "asc"); }
    setPg(0);
  };

  const TH = ({ c, l, w, a }) => (
    <th onClick={() => sort(c)} style={{
      width: w, cursor: "pointer", padding: "10px 8px", fontSize: 11, fontWeight: 600,
      color: sc === c ? "var(--gold)" : "var(--text-35)", textTransform: "uppercase",
      letterSpacing: "0.8px", textAlign: a || "left",
      borderBottom: "1px solid var(--border-08)", whiteSpace: "nowrap",
    }}>{l}{sc === c ? (sd === "asc" ? " ↑" : " ↓") : ""}</th>
  );

  const hl = t => {
    if (!qs || !t) return t;
    const i = t.toLowerCase().indexOf(qs);
    if (i === -1) return t;
    return <>{t.slice(0, i)}<span style={{ background: "var(--gold-glow-12)", borderRadius: 2, padding: "0 1px" }}>{t.slice(i, i + qs.length)}</span>{t.slice(i + qs.length)}</>;
  };

  const xCSV = () => {
    const h = "Edition,Subevent,Draw,Nation,Artist,Song,Place,Points,YouTube\n";
    const esc = s => (s || "").split('"').join('""');
    const b = fl.map(r => [
      r.edition, r.sub, r.draw || "",
      '"' + esc(r.nation) + '"', '"' + esc(r.artist) + '"', '"' + esc(r.song) + '"',
      r.place || "", r.points || "",
      r.yt ? (r.yt.startsWith("http") ? r.yt : "https://www.youtube.com/watch?v=" + r.yt) : "",
    ].join(",")).join("\n");
    const bl = new Blob(["\uFEFF" + h + b], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(bl);
    a.download = "nsc_export.csv";
    a.click();
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900,
        background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: 4,
      }}>NSC Database</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 8 }}>
        {d.length.toLocaleString()} entries · All editions
      </p>
      <PL />

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14, marginBottom: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["All", "GF", "SF1", "SF2", "MPQ"].map(s => (
            <button key={s} className={`fb ${subFilter === s ? "on" : ""}`}
              onClick={() => { setSubFilter(s); setPg(0); }}>{s}</button>
          ))}
        </div>
        <select
          value={nationFilter}
          onChange={e => { setNationFilter(e.target.value); setPg(0); }}
          style={{
            padding: "6px 28px 6px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: "var(--input-bg)", border: "1px solid var(--border-08)",
            color: nationFilter ? "var(--blue)" : "var(--text-45)", cursor: "pointer",
            appearance: "none",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
          }}
        >
          <option value="">All Nations</option>
          {nations.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {(subFilter !== "All" || nationFilter) && (
          <button className="xb" onClick={() => { setSubFilter("All"); setNationFilter(""); setPg(0); }}>
            Clear Filters
          </button>
        )}
      </div>

      <input type="text" placeholder="Search by artist, song, or nation…" value={q}
        onChange={e => { setQ(e.target.value); setPg(0); }}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 15, fontWeight: 500,
          background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)",
          marginTop: 14, marginBottom: 14,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-30)" }}>
          {fl.length.toLocaleString()} entries{qs && <> matching "<span style={{ color: "var(--gold)" }}>{q}</span>"</>}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {fl.length > 0 && <button className="xb" onClick={xCSV}>Export CSV</button>}
          {tp > 1 && <span style={{ fontSize: 12, color: "var(--text-20)" }}>Page {pg + 1}/{tp}</span>}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 800 }}>
          <thead>
            <tr>
              <TH c="edition" l="Ed." w={48} />
              <TH c="sub" l="Sub" w={52} />
              <TH c="draw" l="#" w={36} a="center" />
              <TH c="nation" l="Nation" />
              <TH c="artist" l="Artist" />
              <TH c="song" l="Song" />
              <th style={{ width: 30, padding: "10px 4px", borderBottom: "1px solid var(--border-08)", fontSize: 11, color: "var(--text-20)", textAlign: "center" }}>♫</th>
              <TH c="place" l="Place" w={50} a="center" />
              <TH c="points" l="Pts" w={46} a="right" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: "var(--text-20)" }}>No entries match your search.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={`${r.edition}-${r.sub}-${r.nation}-${i}`}>
                <td style={{ padding: "7px 8px", fontSize: 14, fontWeight: 700, color: "var(--text-25)", fontFamily: "var(--font-display)" }}>{r.edition}</td>
                <td style={{ padding: "7px 8px" }}><SB s={r.sub} /></td>
                <td style={{ padding: "7px 6px", fontSize: 12, color: "var(--text-25)", textAlign: "center" }}>{r.draw || ""}</td>
                <td style={{ padding: "7px 8px", fontSize: 13, fontWeight: 600, color: "var(--text)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hl(r.nation)}</td>
                <td style={{ padding: "7px 8px", fontSize: 13, color: "var(--text-60)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hl(r.artist)}</td>
                <td style={{ padding: "7px 8px", fontSize: 13, color: "var(--text-45)", fontStyle: "italic", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hl(r.song)}</td>
                <td style={{ padding: "7px 4px", textAlign: "center" }}><YtLink yt={r.yt} /></td>
                <td style={{ padding: "7px 8px", textAlign: "center" }}><PB p={r.place} s={r.sub} /></td>
                <td style={{ padding: "7px 8px", fontSize: 13, fontWeight: 600, textAlign: "right", color: r.place === 1 ? "var(--gold)" : r.points ? "var(--text-45)" : "var(--text-10)" }}>{r.points || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pg p={pg} t={tp} set={setPg} />
    </div>
  );
}
