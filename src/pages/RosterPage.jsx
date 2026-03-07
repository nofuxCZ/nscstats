import React, { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader } from '../components/Shared';

var PASS_HASH = "nscadmin2025";

export default function RosterPage() {
  var [roster, setRoster] = useState(null);
  var [filter, setFilter] = useState("all");
  var [q, setQ] = useState("");
  var [pw, setPw] = useState("");
  var [authed, setAuthed] = useState(false);
  var [editIdx, setEditIdx] = useState(null);
  var [editData, setEditData] = useState(null);
  var [addMode, setAddMode] = useState(false);
  var [newNation, setNewNation] = useState({ n: "", s: "current", o: "", ln: "" });
  var [changes, setChanges] = useState(0);

  useEffect(function() {
    loadData("roster").then(function(d) {
      setRoster(d.r.map(function(r, i) { return Object.assign({}, r, { _id: i }); }));
    });
  }, []);

  function tryAuth() {
    if (pw === PASS_HASH) { setAuthed(true); } else { setPw(""); }
  }

  var filtered = useMemo(function() {
    if (!roster) return [];
    var rows = roster;
    if (filter !== "all") rows = rows.filter(function(r) { return r.s === filter; });
    if (q) {
      var lq = q.toLowerCase();
      rows = rows.filter(function(r) {
        return r.n.toLowerCase().includes(lq) || r.o.toLowerCase().includes(lq) || (r.ln || "").toLowerCase().includes(lq);
      });
    }
    // Sort: current first, then WL, then defunct; alphabetically within each group
    var statusOrder = { current: 0, wl: 1, defunct: 2 };
    rows = rows.slice().sort(function(a, b) {
      var sa = statusOrder[a.s] != null ? statusOrder[a.s] : 3;
      var sb = statusOrder[b.s] != null ? statusOrder[b.s] : 3;
      if (sa !== sb) return sa - sb;
      return a.n.localeCompare(b.n);
    });
    return rows;
  }, [roster, filter, q]);

  var stats = useMemo(function() {
    if (!roster) return {};
    return {
      total: roster.length,
      current: roster.filter(function(r) { return r.s === "current"; }).length,
      wl: roster.filter(function(r) { return r.s === "wl"; }).length,
      defunct: roster.filter(function(r) { return r.s === "defunct"; }).length,
    };
  }, [roster]);

  if (!roster) return <Loader t="Loading roster..." />;

  function startEdit(r) { setEditIdx(r._id); setEditData(Object.assign({}, r)); }
  function cancelEdit() { setEditIdx(null); setEditData(null); }
  function saveEdit() {
    setRoster(function(prev) { return prev.map(function(r) { return r._id === editIdx ? Object.assign({}, editData, { _id: editIdx }) : r; }); });
    setEditIdx(null); setEditData(null); setChanges(function(c) { return c + 1; });
  }
  function deleteNation(id) {
    if (!confirm("Remove this nation from the roster?")) return;
    setRoster(function(prev) { return prev.filter(function(r) { return r._id !== id; }); });
    setChanges(function(c) { return c + 1; });
  }
  function addNation() {
    if (!newNation.n.trim()) return;
    var nn = { n: newNation.n.trim(), s: newNation.s, o: newNation.o.trim(), ln: newNation.ln.trim() || newNation.n.trim(), _id: Date.now() };
    setRoster(function(prev) { return prev.concat([nn]); });
    setNewNation({ n: "", s: "current", o: "", ln: "" });
    setAddMode(false); setChanges(function(c) { return c + 1; });
  }
  function exportJSON() {
    var clean = roster.map(function(r) { return { n: r.n, s: r.s, o: r.o, ln: r.ln }; });
    var ol = {}, on = {};
    clean.forEach(function(r) {
      if (r.o) {
        if (r.s === "current") ol[r.o] = r.n;
        if (!on[r.o]) on[r.o] = [];
        on[r.o].push(r.n);
      }
    });
    clean.forEach(function(r) { if (r.o && !ol[r.o]) ol[r.o] = r.ln; });
    var blob = new Blob([JSON.stringify({ r: clean, ol: ol, on: on }, null, 2)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "roster.json"; a.click();
    setChanges(0);
  }
  function exportCSV() {
    var h = "Nation,Status,Owner,Notes\n";
    var b = roster.map(function(r) {
      var esc = function(s) { return '"' + (s || "").split('"').join('""') + '"'; };
      var status = r.s === "current" ? "Current nation" : r.s === "wl" ? "WL nation" : "Defunct Nation";
      return [esc(r.n), esc(status), esc(r.o), esc(r.ln === r.n ? "" : r.ln)].join(",");
    }).join("\n");
    var blob = new Blob(["\uFEFF" + h + b], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "NSCRoster.csv"; a.click();
  }

  var iStyle = { padding: "6px 10px", borderRadius: 6, fontSize: 13, background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)", width: "100%" };
  var statusColors = { current: "var(--green, #48bb78)", wl: "var(--gold)", defunct: "var(--text-30)" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>Nation Roster</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>
        {stats.total + " nations \u00B7 " + stats.current + " current \u00B7 " + stats.wl + " WL \u00B7 " + stats.defunct + " defunct"}
        {authed && changes > 0 && <span style={{ marginLeft: 12, color: "var(--gold)", fontWeight: 600 }}>{changes + " change" + (changes > 1 ? "s" : "") + " — Export JSON to save!"}</span>}
      </p>

      {/* Filters + auth */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input type="text" placeholder="Search by nation, owner..." value={q} onChange={function(e) { setQ(e.target.value); }}
          style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 8, fontSize: 14, background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[["all", "All"], ["current", "Current"], ["wl", "WL"], ["defunct", "Defunct"]].map(function(p) {
            return <button key={p[0]} className={"fb " + (filter === p[0] ? "on" : "")} onClick={function() { setFilter(p[0]); }}>{p[1]}</button>;
          })}
        </div>
        {!authed && (
          <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: "auto" }}>
            <input type="password" value={pw} onChange={function(e) { setPw(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") tryAuth(); }}
              placeholder="Admin password" style={{ padding: "7px 12px", borderRadius: 6, fontSize: 12, width: 130, background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
            <button className="xb" onClick={tryAuth} style={{ fontSize: 11 }}>Unlock</button>
          </div>
        )}
        {authed && (
          <>
            <button className="xb" onClick={function() { setAddMode(!addMode); }} style={{ background: addMode ? "var(--gold-glow-12)" : undefined }}>+ Add Nation</button>
            <button className="xb" onClick={exportJSON} style={changes > 0 ? { background: "var(--gold-glow-25)", color: "var(--gold)", fontWeight: 700, border: "1px solid var(--gold)" } : undefined}>
              {changes > 0 ? "\u2B07 Save JSON (" + changes + ")" : "Export JSON"}
            </button>
            <button className="xb" onClick={exportCSV}>Export CSV</button>
          </>
        )}
      </div>

      {/* Add form (only when authed) */}
      {authed && addMode && (
        <div style={{ background: "var(--text-03)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Nation Name</div>
            <input value={newNation.n} onChange={function(e) { setNewNation(Object.assign({}, newNation, { n: e.target.value })); }} style={iStyle} />
          </div>
          <div style={{ flex: "0 0 120px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Status</div>
            <select value={newNation.s} onChange={function(e) { setNewNation(Object.assign({}, newNation, { s: e.target.value })); }} style={Object.assign({}, iStyle, { cursor: "pointer" })}>
              <option value="current">Current</option><option value="wl">WL</option><option value="defunct">Defunct</option>
            </select>
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Owner</div>
            <input value={newNation.o} onChange={function(e) { setNewNation(Object.assign({}, newNation, { o: e.target.value })); }} style={iStyle} />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Latest Nation</div>
            <input value={newNation.ln} onChange={function(e) { setNewNation(Object.assign({}, newNation, { ln: e.target.value })); }} style={iStyle} placeholder={newNation.n || "..."} />
          </div>
          <button className="xb" onClick={addNation} style={{ fontWeight: 700 }}>Add</button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px", minWidth: 600 }}>
          <thead>
            <tr>
              {(authed ? ["Nation", "Status", "Owner", "Latest Nation", ""] : ["Nation", "Status", "Owner", "Latest Nation"]).map(function(h, i) {
                return <th key={h || "act"} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "left", borderBottom: "1px solid var(--border-08)", width: authed ? [null, 90, null, null, 80][i] : [null, 90, null, null][i] }}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map(function(r, idx) {
              var colCount = authed ? 5 : 4;
              // Show group header when status changes
              var prevStatus = idx > 0 ? filtered[idx - 1].s : null;
              var groupHeader = (filter === "all" && r.s !== prevStatus) ? (
                <tr key={"group-" + r.s}>
                  <td colSpan={colCount} style={{
                    padding: "10px 10px 6px", fontSize: 12, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase",
                    color: r.s === "current" ? "var(--green, #48bb78)" : r.s === "wl" ? "var(--gold)" : "var(--text-30)",
                    borderBottom: "2px solid " + (r.s === "current" ? "var(--green, #48bb78)" : r.s === "wl" ? "var(--gold)" : "var(--text-10)"),
                  }}>
                    {r.s === "current" ? "Current Nations" : r.s === "wl" ? "Waiting List" : "Defunct Nations"}
                  </td>
                </tr>
              ) : null;
              var isEditing = authed && editIdx === r._id;
              if (isEditing) {
                return <React.Fragment key={r._id}>
                  {groupHeader}
                  <tr style={{ background: "var(--gold-glow-12)" }}>
                  <td style={{ padding: "6px 10px" }}><input value={editData.n} onChange={function(e) { setEditData(Object.assign({}, editData, { n: e.target.value })); }} style={iStyle} /></td>
                  <td style={{ padding: "6px 10px" }}>
                    <select value={editData.s} onChange={function(e) { setEditData(Object.assign({}, editData, { s: e.target.value })); }} style={Object.assign({}, iStyle, { cursor: "pointer" })}>
                      <option value="current">Current</option><option value="wl">WL</option><option value="defunct">Defunct</option>
                    </select>
                  </td>
                  <td style={{ padding: "6px 10px" }}><input value={editData.o} onChange={function(e) { setEditData(Object.assign({}, editData, { o: e.target.value })); }} style={iStyle} /></td>
                  <td style={{ padding: "6px 10px" }}><input value={editData.ln} onChange={function(e) { setEditData(Object.assign({}, editData, { ln: e.target.value })); }} style={iStyle} /></td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <button className="xb" onClick={saveEdit} style={{ fontSize: 11, marginRight: 4 }}>Save</button>
                    <button className="xb" onClick={cancelEdit} style={{ fontSize: 11 }}>Cancel</button>
                  </td>
                </tr></React.Fragment>;
              }
              return <React.Fragment key={r._id}>
                {groupHeader}
                <tr>
                <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.n}</td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: r.s === "current" ? "rgba(72,187,120,0.15)" : r.s === "wl" ? "var(--gold-glow-12)" : "var(--text-04)", color: statusColors[r.s] }}>
                    {r.s === "current" ? "Current" : r.s === "wl" ? "WL" : "Defunct"}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", fontSize: 13, color: "var(--text-60)" }}>{r.o}</td>
                <td style={{ padding: "8px 10px", fontSize: 13, color: r.ln !== r.n ? "var(--blue)" : "var(--text-20)" }}>{r.ln !== r.n ? r.ln : "\u2014"}</td>
                {authed && <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                  <button className="xb" onClick={function() { startEdit(r); }} style={{ fontSize: 11, marginRight: 4 }}>Edit</button>
                  <button className="xb" onClick={function() { deleteNation(r._id); }} style={{ fontSize: 11, color: "var(--red, #e74c3c)" }}>Del</button>
                </td>}
              </tr></React.Fragment>;
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-25)" }}>
        {"Showing " + filtered.length + " of " + roster.length + " nations." + (authed ? " Edits are in-memory only \u2014 click Save JSON to download and replace public/data/roster.json." : "")}
      </div>
    </div>
  );
}
