import { useState, useEffect, useMemo, useRef } from 'react';
import { loadData } from '../data/loader';
import { Loader, SN, SB, PB, PL, Pg, YtLink } from '../components/Shared';

// Multi-select dropdown
function MultiSelect({ items, selected, onToggle, label, color }) {
  var _color = color || "var(--blue)";
  var ref = useRef(null);
  var [open, setOpen] = useState(false);
  var [q, setQ] = useState("");
  var [visibleCount, setVisibleCount] = useState(200);
  var listRef = useRef(null);

  useEffect(function() {
    var h = function(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return function() { document.removeEventListener("mousedown", h); };
  }, []);

  // Reset visible count when search changes
  useEffect(function() { setVisibleCount(200); }, [q]);

  var fl = useMemo(function() {
    if (!q) return items;
    // "quoted" = exact match, unquoted = substring
    var isExact = q.length >= 2 && q.charAt(0) === '"' && q.charAt(q.length - 1) === '"';
    if (isExact) {
      var term = q.slice(1, -1).toLowerCase();
      return items.filter(function(n) { return n.toLowerCase() === term; });
    }
    var lq = q.toLowerCase();
    return items.filter(function(n) { return n.toLowerCase().indexOf(lq) >= 0; });
  }, [items, q]);

  // Lazy load more on scroll
  function handleScroll(e) {
    var el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setVisibleCount(function(c) { return Math.min(c + 200, fl.length); });
    }
  }

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
          maxHeight: 320, overflowY: "auto", borderRadius: 8,
          background: "var(--dropdown-bg)", border: "1px solid var(--border-10)",
          boxShadow: "var(--dropdown-shadow)", minWidth: 220,
        }} ref={listRef} onScroll={handleScroll}>
          <div style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--dropdown-bg)" }}>
            <input value={q} onChange={function(e) { setQ(e.target.value); }}
              placeholder={'Search\u2026 "quotes" for exact'}
              autoFocus onClick={function(e) { e.stopPropagation(); }}
              style={{ width: "100%", padding: "8px 12px", border: "none", borderBottom: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, outline: "none" }}
            />
            <div style={{ padding: "4px 12px", fontSize: 11, color: "var(--text-20)", borderBottom: "1px solid var(--text-04)", display: "flex", justifyContent: "space-between" }}>
              <span>{fl.length + " match" + (fl.length !== 1 ? "es" : "")}</span>
              {selected.length > 0 && (
                <span onClick={function() { selected.forEach(function(s) { onToggle(s); }); }}
                  style={{ cursor: "pointer", color: "var(--text-30)" }}>Clear all</span>
              )}
            </div>
          </div>
          {fl.slice(0, visibleCount).map(function(n) {
            var isSel = selected.indexOf(n) >= 0;
            return <div key={n} onClick={function() { onToggle(n); }}
              style={{
                padding: "5px 12px", fontSize: 13, cursor: "pointer",
                color: isSel ? _color : "var(--text-60)",
                fontWeight: isSel ? 600 : 400,
                borderBottom: "1px solid var(--text-04)",
              }}
              onMouseEnter={function(e) { e.target.style.background = "var(--hover-bg)"; }}
              onMouseLeave={function(e) { e.target.style.background = "transparent"; }}
            >{(isSel ? "\u2713 " : "") + n}</div>;
          })}
          {visibleCount < fl.length && (
            <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-20)", textAlign: "center" }}>
              {"Scroll for more (" + (fl.length - visibleCount) + " remaining)"}
            </div>
          )}
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
  var [selSongs, setSelSongs] = useState([]);
  var [edFrom, setEdFrom] = useState("");
  var [edTo, setEdTo] = useState("");
  var [placeFrom, setPlaceFrom] = useState("");
  var [placeTo, setPlaceTo] = useState("");
  var [ptsFrom, setPtsFrom] = useState("");
  var [ptsTo, setPtsTo] = useState("");

  useEffect(function() {
    loadData("database").then(function(r) {
      setD(r.map(function(r) {
        return { edition: r[0], sub: SN[r[1]], draw: r[2], nation: r[3], artist: r[4], song: r[5], place: r[6], points: r[7], yt: r[8] };
      }));
    });
  }, []);

  var PS = 50;
  var qs = q.trim();

  var nations = useMemo(function() {
    if (!d) return [];
    return Array.from(new Set(d.map(function(r) { return r.nation; }))).sort();
  }, [d]);

  var artists = useMemo(function() {
    if (!d) return [];
    return Array.from(new Set(d.map(function(r) { return r.artist; }).filter(Boolean))).sort();
  }, [d]);

  var songs = useMemo(function() {
    if (!d) return [];
    return Array.from(new Set(d.map(function(r) { return r.song; }).filter(Boolean))).sort();
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

  var toggleSong = function(s) {
    setSelSongs(function(prev) {
      return prev.indexOf(s) >= 0 ? prev.filter(function(x) { return x !== s; }) : prev.concat([s]);
    });
    setPg(0);
  };

  // Search: "quoted" = exact match, unquoted = substring
  var matchFn = useMemo(function() {
    if (!qs) return null;
    var isExact = qs.length >= 2 && qs.charAt(0) === '"' && qs.charAt(qs.length - 1) === '"';
    if (isExact) {
      var term = qs.slice(1, -1).toLowerCase();
      return function(r) {
        return (r.artist || "").toLowerCase() === term || (r.song || "").toLowerCase() === term || (r.nation || "").toLowerCase() === term;
      };
    } else {
      var lq = qs.toLowerCase();
      return function(r) {
        return (r.artist || "").toLowerCase().includes(lq) || (r.song || "").toLowerCase().includes(lq) || (r.nation || "").toLowerCase().includes(lq);
      };
    }
  }, [qs]);

  var fl = useMemo(function() {
    if (!d) return [];
    var rows = d;
    if (subFilter !== "All") rows = rows.filter(function(r) { return subFilter === "SF" ? (r.sub === "SF1" || r.sub === "SF2") : r.sub === subFilter; });
    if (selNations.length > 0) rows = rows.filter(function(r) { return selNations.indexOf(r.nation) >= 0; });
    if (selArtists.length > 0) rows = rows.filter(function(r) { return selArtists.indexOf(r.artist) >= 0; });
    if (selSongs.length > 0) rows = rows.filter(function(r) { return selSongs.indexOf(r.song) >= 0; });
    if (edFrom) rows = rows.filter(function(r) { return r.edition >= Number(edFrom); });
    if (edTo) rows = rows.filter(function(r) { return r.edition <= Number(edTo); });
    if (placeFrom) rows = rows.filter(function(r) { return r.place != null && r.place >= Number(placeFrom); });
    if (placeTo) rows = rows.filter(function(r) { return r.place != null && r.place <= Number(placeTo); });
    if (ptsFrom) rows = rows.filter(function(r) { return r.points != null && r.points >= Number(ptsFrom); });
    if (ptsTo) rows = rows.filter(function(r) { return r.points != null && r.points <= Number(ptsTo); });
    if (matchFn) rows = rows.filter(matchFn);
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
  }, [d, matchFn, sorts, subFilter, selNations, selArtists, selSongs, edFrom, edTo, placeFrom, placeTo, ptsFrom, ptsTo]);

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
    var isExact = qs.length >= 2 && qs.charAt(0) === '"' && qs.charAt(qs.length - 1) === '"';
    var term = isExact ? qs.slice(1, -1) : qs;
    var i = t.toLowerCase().indexOf(term.toLowerCase());
    if (i === -1) return t;
    return <>{t.slice(0, i)}<span style={{ background: "var(--gold-glow-12)", borderRadius: 2, padding: "0 1px" }}>{t.slice(i, i + term.length)}</span>{t.slice(i + term.length)}</>;
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

  var hasFilters = subFilter !== "All" || selNations.length > 0 || selArtists.length > 0 || selSongs.length > 0 || edFrom || edTo || placeFrom || placeTo || ptsFrom || ptsTo;
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
      <input type="text" placeholder={'Search artist, song, or nation\u2026 Use "quotes" for exact match'} value={q}
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
        <MultiSelect items={songs} selected={selSongs} onToggle={toggleSong} label="Songs" color="var(--green)" />

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

        <div>
          <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Place Range"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="number" placeholder="from" value={placeFrom}
              onChange={function(e) { setPlaceFrom(e.target.value); setPg(0); }}
              style={{ width: 52, padding: "6px 6px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
            <span style={{ color: "var(--text-15)" }}>{"to"}</span>
            <input type="number" placeholder="to" value={placeTo}
              onChange={function(e) { setPlaceTo(e.target.value); setPg(0); }}
              style={{ width: 52, padding: "6px 6px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{"Points Range"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="number" placeholder="from" value={ptsFrom}
              onChange={function(e) { setPtsFrom(e.target.value); setPg(0); }}
              style={{ width: 52, padding: "6px 6px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
            <span style={{ color: "var(--text-15)" }}>{"to"}</span>
            <input type="number" placeholder="to" value={ptsTo}
              onChange={function(e) { setPtsTo(e.target.value); setPg(0); }}
              style={{ width: 52, padding: "6px 6px", borderRadius: 6, fontSize: 13, textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
          </div>
        </div>

        {hasFilters && (
          <button className="xb" onClick={function() { setSubFilter("All"); setSelNations([]); setSelArtists([]); setSelSongs([]); setEdFrom(""); setEdTo(""); setPlaceFrom(""); setPlaceTo(""); setPtsFrom(""); setPtsTo(""); setPg(0); }}>
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
