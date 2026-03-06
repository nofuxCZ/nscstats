import { useState, useEffect, useMemo, useRef } from 'react';
import { loadData } from '../data/loader';
import { Loader } from '../components/Shared';

var PASS_KEY = "nsc_roster_auth";
var PASS_HASH = "nscadmin2025"; // Simple password — not truly secure, just a gate

function Gate({ onAuth }) {
  var [pw, setPw] = useState("");
  var [err, setErr] = useState(false);
  return (
    <div style={{ maxWidth: 400, margin: "120px auto", textAlign: "center" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--gold)", marginBottom: 16 }}>Roster Editor</h2>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 20 }}>This page is restricted. Enter the password to continue.</p>
      <input type="password" value={pw} onChange={function(e) { setPw(e.target.value); setErr(false); }}
        onKeyDown={function(e) { if (e.key === "Enter") { if (pw === PASS_HASH) { sessionStorage.setItem(PASS_KEY, "1"); onAuth(); } else setErr(true); } }}
        placeholder="Password" autoFocus
        style={{ width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 15, background: "var(--input-bg)", border: "1px solid " + (err ? "var(--red)" : "var(--border-08)"), color: "var(--text)", marginBottom: 12 }} />
      <button className="xb" onClick={function() { if (pw === PASS_HASH) { sessionStorage.setItem(PASS_KEY, "1"); onAuth(); } else setErr(true); }}>Enter</button>
      {err && <div style={{ marginTop: 8, fontSize: 13, color: "var(--red)" }}>Incorrect password</div>}
    </div>
  );
}

export default function RosterPage() {
  var [authed, setAuthed] = useState(function() { return sessionStorage.getItem(PASS_KEY) === "1"; });
  var [roster, setRoster] = useState(null);
  var [filter, setFilter] = useState("all");
  var [q, setQ] = useState("");
  var [editIdx, setEditIdx] = useState(null);
  var [editData, setEditData] = useState(null);
  var [addMode, setAddMode] = useState(false);
  var [newNation, setNewNation] = useState({ n: "", s: "current", o: "", ln: "" });
  var [changes, setChanges] = useState(0);

  useEffect(function() {
    if (!authed) return;
    loadData("roster").then(function(d) {
      setRoster(d.r.map(function(r, i) { return Object.assign({}, r, { _id: i }); }));
    });
  }, [authed]);

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

  if (!authed) return <Gate onAuth={function() { setAuthed(true); }} />;
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
  }

  function exportXLSX() {
    // Export as CSV (universal, no library needed)
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
  var statusColors = { current: "var(--green)", wl: "var(--gold)", defunct: "var(--text-30)" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,34px)", fontWeight: 900, background: "var(--grad-title)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>Roster Editor</h1>
      <p style={{ fontSize: 13, color: "var(--text-35)", marginBottom: 16 }}>
        {stats.total + " nations \u00B7 " + stats.current + " current \u00B7 " + stats.wl + " WL \u00B7 " + stats.defunct + " defunct"}
        {changes > 0 && <span style={{ marginLeft: 12, color: "var(--gold)", fontWeight: 600 }}>{changes + " unsaved change" + (changes > 1 ? "s" : "")}</span>}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input type="text" placeholder="Search by nation, owner..." value={q} onChange={function(e) { setQ(e.target.value); }}
          style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 8, fontSize: 14, background: "var(--input-bg)", border: "1px solid var(--border-08)", color: "var(--text)" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[["all", "All"], ["current", "Current"], ["wl", "WL"], ["defunct", "Defunct"]].map(function(p) {
            return <button key={p[0]} className={"fb " + (filter === p[0] ? "on" : "")} onClick={function() { setFilter(p[0]); }}>{p[1]}</button>;
          })}
        </div>
        <button className="xb" onClick={function() { setAddMode(!addMode); }} style={{ background: addMode ? "var(--gold-glow-12)" : undefined }}>{"+ Add Nation"}</button>
        <button className="xb" onClick={exportJSON}>{"Export JSON"}</button>
        <button className="xb" onClick={exportXLSX}>{"Export CSV"}</button>
      </div>

      {addMode && (
        <div style={{ background: "var(--text-03)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Nation Name</div>
            <input value={newNation.n} onChange={function(e) { setNewNation(Object.assign({}, newNation, { n: e.target.value })); }} style={iStyle} />
          </div>
          <div style={{ flex: "0 0 120px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Status</div>
            <select value={newNation.s} onChange={function(e) { setNewNation(Object.assign({}, newNation, { s: e.target.value })); }}
              style={Object.assign({}, iStyle, { cursor: "pointer" })}>
              <option value="current">Current</option>
              <option value="wl">WL</option>
              <option value="defunct">Defunct</option>
            </select>
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Owner</div>
            <input value={newNation.o} onChange={function(e) { setNewNation(Object.assign({}, newNation, { o: e.target.value })); }} style={iStyle} />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ fontSize: 11, color: "var(--text-30)", marginBottom: 4 }}>Latest Nation (leave empty if same)</div>
            <input value={newNation.ln} onChange={function(e) { setNewNation(Object.assign({}, newNation, { ln: e.target.value })); }} style={iStyle} placeholder={newNation.n || "..."} />
          </div>
          <button className="xb" onClick={addNation} style={{ fontWeight: 700 }}>{"Add"}</button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px", minWidth: 700 }}>
          <thead>
            <tr>
              {["Nation", "Status", "Owner", "Latest Nation", ""].map(function(h, i) {
                return <th key={h || "act"} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "left", borderBottom: "1px solid var(--border-08)", width: [null, 90, null, null, 80][i] }}>{h}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map(function(r) {
              var isEditing = editIdx === r._id;
              if (isEditing) {
                return <tr key={r._id} style={{ background: "var(--gold-glow-12)" }}>
                  <td style={{ padding: "6px 10px" }}><input value={editData.n} onChange={function(e) { setEditData(Object.assign({}, editData, { n: e.target.value })); }} style={iStyle} /></td>
                  <td style={{ padding: "6px 10px" }}>
                    <select value={editData.s} onChange={function(e) { setEditData(Object.assign({}, editData, { s: e.target.value })); }} style={Object.assign({}, iStyle, { cursor: "pointer" })}>
                      <option value="current">Current</option>
                      <option value="wl">WL</option>
                      <option value="defunct">Defunct</option>
                    </select>
                  </td>
                  <td style={{ padding: "6px 10px" }}><input value={editData.o} onChange={function(e) { setEditData(Object.assign({}, editData, { o: e.target.value })); }} style={iStyle} /></td>
                  <td style={{ padding: "6px 10px" }}><input value={editData.ln} onChange={function(e) { setEditData(Object.assign({}, editData, { ln: e.target.value })); }} style={iStyle} /></td>
                  <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                    <button className="xb" onClick={saveEdit} style={{ fontSize: 11, marginRight: 4 }}>Save</button>
                    <button className="xb" onClick={cancelEdit} style={{ fontSize: 11 }}>Cancel</button>
                  </td>
                </tr>;
              }
              return <tr key={r._id}>
                <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.n}</td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: r.s === "current" ? "rgba(72,187,120,0.15)" : r.s === "wl" ? "var(--gold-glow-12)" : "var(--text-04)", color: statusColors[r.s] }}>
                    {r.s === "current" ? "Current" : r.s === "wl" ? "WL" : "Defunct"}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", fontSize: 13, color: "var(--text-60)" }}>{r.o}</td>
                <td style={{ padding: "8px 10px", fontSize: 13, color: r.ln !== r.n ? "var(--blue)" : "var(--text-20)" }}>{r.ln !== r.n ? r.ln : "\u2014"}</td>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                  <button className="xb" onClick={function() { startEdit(r); }} style={{ fontSize: 11, marginRight: 4 }}>Edit</button>
                  <button className="xb" onClick={function() { deleteNation(r._id); }} style={{ fontSize: 11, color: "var(--red)" }}>Del</button>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-25)" }}>
        {"Showing " + filtered.length + " of " + roster.length + " nations. Export JSON to update the site, or CSV to update the Excel master."}
      </div>
    </div>
  );
}
