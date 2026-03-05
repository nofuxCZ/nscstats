import { useState, useEffect, useMemo, useRef } from 'react';
import { loadData } from '../data/loader';
import { Loader, SN, SB, PB, PL, Pg, YtLink } from '../components/Shared';

// Multi-select dropdown
function MultiSelect({ items, selected, onToggle, label, color }) {
  var _color = color || "var(--blue)";
  var ref = useRef(null);
  var [open, setOpen] = useState(false);
  var [q, setQ] = useState("");

  useEffect(function() {
    var h = function(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return function() { document.removeEventListener("mousedown", h); };
  }, []);

  var fl = items.filter(function(n) { return n.toLowerCase().includes(q.toLowerCase()); });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div
        onClick={function() { setOpen(!open); }}
        style={{
          minWidth: 180, padding: "6px 10px", borderRadius: 6, fontSize: 13,
          background: "var(--input-bg)", border: "1px solid var(--border-08)",
          color: selected.length > 0 ? _color : "var(--text-45)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minHeight: 34,
        }}
      >
        {selected.length === 0 ? "All" : selected.map(function(s) {
          return <span key={s} style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "1px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: "var(--blue-glow-15)", color: _color,
          }}>
            {s}
            <span onClick={function(e) { e.stopPropagation(); onToggle(s); }} style={{ cursor: "pointer", opacity: 0.6 }}>{"\u00D7"}</span>
          </span>;
        })}
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 4,
          maxHeight: 260, overflowY: "auto", borderRadius: 8,
          background: "var(--dropdown-bg)", border: "1px solid var(--border-10)",
          boxShadow: "var(--dropdown-shadow)", minWidth: 200,
        }}>
          <input value={q} onChange={function(e) { setQ(e.target.value); }}
            placeholder="Search..." autoFocus
            style={{ width: "100%", padding: "8px 12px", border: "none", borderBottom: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, outline: "none" }}
          />
          {selected.length > 0 && (
            <div onClick={function() { selected.forEach(function(s) { onToggle(s); }); }}
              style={{ padding: "6px 12px", fontSize: 11, color: "var(--text-30)", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
              onMouseEnter={function(e) { e.target.style.background = "var(--hover-bg)"; }}
              onMouseLeave={function(e) { e.target.style.background = "transparent"; }}
            >Clear all</div>
          )}
          {fl.slice(0, 100).map(function(n) {
            var isSel = selected.indexOf(n) >= 0;
            return <div key={n} onClick={function() { onToggle(n); }}
              style={{
                padding: "6px 12px", fontSize: 13, cursor: "pointer",
                color: isSel ? _color : "var(--text-60)",
                fontWeight: isSel ? 600 : 400,
                borderBottom: "1px solid var(--text-04)",
              }}
              onMouseEnter={function(e) { e.target.style.background = "var(--hover-bg)"; }}
              onMouseLeave={function(e) { e.target.style.background = "transparent"; }}
            >{(isSel ? "\u2713 " : "") + n}</div>;
          })}
        </div>
      )}
    </div>
  );
}

export default function DatabasePage() {
  var [d, setD] = useState(null);
  var [q, setQ] = useState("");
  var [pg, setPg] = useState(0);
  var [sorts, setSorts] = useState([{ col: "edition", dir: "desc" }]);
  var [subFilter, setSubFilter] = useState("All");
  var [selNations, setSelNations] = useState([]);
  var [multiSort, setMultiSort] = useState(false);
  var [selArtists, setSelArtists] = useState([]);
  var [edFrom, setEdFrom] = useState("");
  var [edTo, setEdTo] = useState("");

  useEffect(function() {
    loadData("database").then(function(r) {
      setD(r.map(function(r) {
        return { edition: r[0], sub: SN[r[1]], draw: r[2], nation: r[3], artist: r[4], song: r[5], place: r[6], points: r[7], yt: r[8] };
      }));
    });
  }, []);

  var PS = 50;
  var qs = q.toLowerCase().trim();

  var nations = useMemo(function() {
    if (!d) return [];
    return Array.from(new Set(d.map(function(r) { return r.nation; }))).sort();
  }, [d]);

  var artists = useMemo(function() {
    if (!d) return [];
    return Array.from(new Set(d.map(function(r) { return r.artist; }).filter(Boolean))).sort();
  }, [d]);

  var toggleNation = function(n) {
    setSelNations(function(prev) {
      return prev.indexOf(n) >= 0 ? prev.filter(function(x) { return x !== n; }) : prev.concat([n]);
    });
    setPg(0);
  };

  var toggleArtist = function(a) {
    setSelArtists(function(prev) {
      return prev.indexOf(a) >= 0 ? prev.filter(function(x) { return x !== a; }) : prev.concat([a]);
    });
    setPg(0);
  };

  var fl = useMemo(function() {
    if (!d) return [];
    var rows = d;
    if (subFilter !== "All") rows = rows.filter(function(r) { return subFilter === "SF" ? (r.sub === "SF1" || r.sub === "SF2") : r.sub === subFilter; });
    if (selNations.length > 0) rows = rows.filter(function(r) { return selNations.indexOf(r.nation) >= 0; });
    if (selArtists.length > 0) rows = rows.filter(function(r) { return selArtists.indexOf(r.artist) >= 0; });
    if (edFrom) rows = rows.filter(function(r) { return r.edition >= Number(edFrom); });
    if (edTo) rows = rows.filter(function(r) { return r.edition <= Number(edTo); });
    if (qs) rows = rows.filter(function(r) {
      return (r.artist || "").toLowerCase().includes(qs) || (r.song || "").toLowerCase().includes(qs) || (r.nation || "").toLowerCase().includes(qs);
    });
    // Multi-column sort
    return rows.slice().sort(function(a, b) {
      for (var s = 0; s < sorts.length; s++) {
        var col = sorts[s].col, dir = sorts[s].dir;
        var va = a[col], vb = b[col];
        if (va == null && vb == null) continue;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
        if (va < vb) return dir === "asc" ? -1 : 1;
        if (va > vb) return dir === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [d, qs, sorts, subFilter, selNations, selArtists, edFrom, edTo]);

  if (!d) return <Loader t="Loading 18,807 entries..." />;

  var tp = Math.ceil(fl.length / PS);
  var rows = fl.slice(pg * PS, (pg + 1) * PS);

  // Click: replace sort. Shift+click: add/toggle in chain
  var handleSort = function(c, e) {
    var shift = (e && e.shiftKey) || multiSort;
    setPg(0);
    setSorts(function(prev) {
      if (shift) {
        var existing = -1;
        for (var i = 0; i < prev.length; i++) { if (prev[i].col === c) { existing = i; break; } }
        if (existing >= 0) {
          var copy = prev.slice();
          copy[existing] = { col: c, dir: copy[existing].dir === "asc" ? "desc" : "asc" };
          return copy;
        }
        return prev.concat([{ col: c, dir: c === "edition" ? "desc" : "asc" }]);
      }
      var cur = prev.length === 1 && prev[0].col === c;
      return [{ col: c, dir: cur ? (prev[0].dir === "asc" ? "desc" : "asc") : (c === "edition" ? "desc" : "asc") }];
    });
  };

  var sortIndex = function(c) {
    for (var i = 0; i < sorts.length; i++) { if (sorts[i].col === c) return i; }
    return -1;
  };

  var TH = function(c, l, w, a) {
    var idx = sortIndex(c);
    var active = idx >= 0;
    var arrow = active ? (sorts[idx].dir === "asc" ? " \u2191" : " \u2193") : "";
    return (
      <th onClick={function(e) { handleSort(c, e); }} style={{
        width: w, cursor: "pointer", padding: "10px 8px", fontSize: 11, fontWeight: 600,
        color: active ? "var(--gold)" : "var(--text-35)", textTransform: "uppercase",
        letterSpacing: "0.8px", textAlign: a || "left",
        borderBottom: "1px solid var(--border-08)", whiteSpace: "nowrap", userSelect: "none",
      }}>
        {l}{arrow}{sorts.length > 1 && active ? <sup style={{ fontSize: 9 }}>{String(idx + 1)}</sup> : null}
      </th>
    );
  };

  var hl = function(t) {
    if (!qs || !t) return t;
    var i = t.toLowerCase().indexOf(qs);
    if (i === -1) return t;
    return <>{t.slice(0, i)}<span style={{ background: "var(--gold-glow-12)", borderRadius: 2, padding: "0 1px" }}>{t.slice(i, i + qs.length)}</span>{t.slice(i + qs.length)}</>;
  };

  var xCSV = function() {
    var h = "Edition,Subevent,Draw,Nation,Artist,Song,Place,Points,YouTube\n";
    var esc = function(s) { return (s || "").split('"').join('""'); };
    var b = fl.map(function(r) {
      return [r.edition, r.sub, r.draw || "", '"' + esc(r.nation) + '"', '"' + esc(r.artist) + '"', '"' + esc(r.song) + '"', r.place || "", r.points || "", r.yt ? (r.yt.startsWith("http") ? r.yt : "https://www.youtube.com/watch?v=" + r.yt) : ""].join(",");
    }).join("\n");
    var bl = new Blob(["\uFEFF" + h + b], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "nsc_export.csv"; a.click();
  };

  var hasFilters = subFilter !== "All" || selNations.length > 0 || selArtists.length > 0 || edFrom || edTo;
  var sortDesc = sorts.map(function(s) { return s.col + (s.dir === "asc" ? "\u2191" : "\u2193"); }).join(" \u2192 ");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900,
        background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4,
      }}>{"NSC Database"}</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 4 }}>
        {d.length.toLocaleString() + " entries \u00B7 All editions"}
      </p>
      <div style={{ fontSize: 12, color: "var(--text-20)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>{"Click column header to sort \u00B7 Shift+click for multi-column sort"}</span>
        <button className={"fb " + (multiSort ? "on" : "")} onClick={function() { setMultiSort(!multiSort); }} style={{ fontSize: 11, padding: "3px 10px" }}>
          {multiSort ? "Multi-sort ON" : "Multi-sort"}
        </button>
      </div>
      <PL />

      {/* Search */}
      <input type="text" placeholder="Search by artist, song, or nation…" value={q}
        onChange={function(e) { setQ(e.target.value); setPg(0); }}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 15, fontWeight: 500,
          background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)",
          marginTop: 14, marginBottom: 14,
        }}
      />

      {/* Filters row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12, alignItems: "flex-end" }}>
        <MultiSelect items={nations} selected={selNations} onToggle={toggleNation} label="Nations" color="var(--blue)" />
        <MultiSelect items={artists} selected={selArtists} onToggle={toggleArtist} label="Artists" color="var(--purple)" />

        <div>
          <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Edition Range"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="number" placeholder="from" value={edFrom}
              onChange={function(e) { setEdFrom(e.target.value); setPg(0); }}
              style={{ width: 60, padding: "6px 8px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
            <span style={{ color: "var(--text-15)" }}>{"to"}</span>
            <input type="number" placeholder="to" value={edTo}
              onChange={function(e) { setEdTo(e.target.value); setPg(0); }}
              style={{ width: 60, padding: "6px 8px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Subevent"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["All", "GF", "SF", "MPQ"].map(function(s) {
              return <button key={s} className={"fb " + (subFilter === s ? "on" : "")}
                onClick={function() { setSubFilter(s); setPg(0); }}>{s}</button>;
            })}
          </div>
        </div>

        {hasFilters && (
          <button className="xb" onClick={function() { setSubFilter("All"); setSelNations([]); setSelArtists([]); setEdFrom(""); setEdTo(""); setPg(0); }}>
            {"Clear Filters"}
          </button>
        )}
      </div>

      {/* Results bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-30)" }}>
          {fl.length.toLocaleString() + " entries"}
          {qs ? <>{" matching \""}<span style={{ color: "var(--gold)" }}>{q}</span>{"\"" }</> : ""}
          {sorts.length > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-20)" }}>{"Sorted by: " + sortDesc}</span>}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {fl.length > 0 && <button className="xb" onClick={xCSV}>{"Export CSV"}</button>}
          {tp > 1 && <span style={{ fontSize: 12, color: "var(--text-20)" }}>{"Page " + (pg + 1) + "/" + tp}</span>}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 1px", minWidth: 800 }}>
          <thead>
            <tr>
              {TH("edition", "Ed.", 48)}
              {TH("sub", "Sub", 52)}
              {TH("draw", "#", 36, "center")}
              {TH("nation", "Nation")}
              {TH("artist", "Artist")}
              {TH("song", "Song")}
              <th style={{ width: 30, padding: "10px 4px", borderBottom: "1px solid var(--border-08)", fontSize: 11, color: "var(--text-20)", textAlign: "center" }}>{"\u266B"}</th>
              {TH("place", "Place", 50, "center")}
              {TH("points", "Pts", 46, "right")}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 48, textAlign: "center", color: "var(--text-20)" }}>{"No entries match."}</td></tr>
            ) : rows.map(function(r, i) {
              return <tr key={r.edition + "-" + r.sub + "-" + r.nation + "-" + i}>
                <td style={{ padding: "7px 8px", fontSize: 14, fontWeight: 700, color: "var(--text-25)", fontFamily: "var(--font-display)" }}>{String(r.edition)}</td>
                <td style={{ padding: "7px 8px" }}><SB s={r.sub} /></td>
                <td style={{ padding: "7px 6px", fontSize: 12, color: "var(--text-25)", textAlign: "center" }}>{r.draw ? String(r.draw) : ""}</td>
                <td style={{ padding: "7px 8px", fontSize: 13, fontWeight: 600, color: "var(--text)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hl(r.nation)}</td>
                <td style={{ padding: "7px 8px", fontSize: 13, color: "var(--text-60)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hl(r.artist)}</td>
                <td style={{ padding: "7px 8px", fontSize: 13, color: "var(--text-45)", fontStyle: "italic", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hl(r.song)}</td>
                <td style={{ padding: "7px 4px", textAlign: "center" }}><YtLink yt={r.yt} /></td>
                <td style={{ padding: "7px 8px", textAlign: "center" }}><PB p={r.place} s={r.sub} /></td>
                <td style={{ padding: "7px 8px", fontSize: 13, fontWeight: 600, textAlign: "right", color: r.place === 1 ? "var(--gold)" : r.points ? "var(--text-45)" : "var(--text-10)" }}>{r.points ? String(r.points) : "\u2014"}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <Pg p={pg} t={tp} set={setPg} />
    </div>
  );
}
