import { useState, useEffect, useMemo, useRef } from 'react';

// Subevent names and colors
export const SN = ["GF", "SF1", "SF2", "MPQ"];
export const SC = { "GF": "var(--gold)", "SF": "var(--blue)", "SF1": "var(--blue)", "SF2": "var(--purple)", "MPQ": "var(--pink)" };

// Loader
export function Loader({ t }) {
  return (
    <div className="ld">
      <div className="ld-s" />
      <div className="ld-t">{t || "Loading…"}</div>
    </div>
  );
}

// Subevent badge
export function SB({ s }) {
  const n = typeof s === "number" ? SN[s] : s;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.5px",
      background: SC[n] || "var(--text-10)",
      color: n === "GF" ? "var(--btn-body)" : "var(--text)",
      opacity: n === "GF" ? 1 : 0.85,
    }}>{n}</span>
  );
}

// Place badge
export function PB({ p, s }) {
  if (!p) return <span style={{ color: "var(--text-15)" }}>—</span>;
  const m = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };
  if (m[p]) return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 26, height: 26, borderRadius: "50%", fontWeight: 700, fontSize: 12,
      background: m[p], color: "var(--btn-body)",
    }}>{p}</span>
  );
  if ((s === "GF" || s === 0) && p >= 4 && p <= 6) return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 26, height: 26, borderRadius: "50%", fontWeight: 700, fontSize: 12,
      background: "var(--blue-glow-20)", border: "1.5px solid var(--blue-glow-50)",
      color: "var(--blue)",
    }}>{p}</span>
  );
  return <span style={{ color: "var(--text-40)" }}>{p}</span>;
}

// Placement legend
export function PL() {
  return (
    <div style={{ fontSize: 12, color: "var(--text-20)", display: "flex", gap: 12, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gold)" }} />Winner</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--silver)" }} />2nd</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--bronze)" }} />3rd</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, border: "1.5px solid var(--blue)", background: "var(--blue-glow-20)" }} />PQ (4–6)</span>
    </div>
  );
}

// Pagination
export function Pg({ p, t, set }) {
  if (t <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
      {[["«", () => set(0), p === 0], ["‹", () => set(x => x - 1), p === 0]].map(([l, fn, d], i) => (
        <button key={i} disabled={d} onClick={fn} style={{
          padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
          background: "transparent", color: "var(--text-40)", cursor: d ? "default" : "pointer",
          fontSize: 12, fontWeight: 600, opacity: d ? 0.25 : 1,
        }}>{l}</button>
      ))}
      {Array.from({ length: Math.min(t, 7) }, (_, i) => {
        let pg;
        if (t <= 7) pg = i;
        else if (p < 3) pg = i;
        else if (p > t - 4) pg = t - 7 + i;
        else pg = p - 3 + i;
        return (
          <button key={pg} onClick={() => set(pg)} style={{
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid " + (p === pg ? "var(--gold-glow-25)" : "var(--border)"),
            background: p === pg ? "var(--gold-glow-12)" : "transparent",
            color: p === pg ? "var(--gold)" : "var(--text-40)",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>{pg + 1}</button>
        );
      })}
      {[["›", () => set(x => x + 1), p >= t - 1], ["»", () => set(t - 1), p >= t - 1]].map(([l, fn, d], i) => (
        <button key={i + 10} disabled={d} onClick={fn} style={{
          padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
          background: "transparent", color: "var(--text-40)", cursor: d ? "default" : "pointer",
          fontSize: 12, fontWeight: 600, opacity: d ? 0.25 : 1,
        }}>{l}</button>
      ))}
    </div>
  );
}

// YouTube link
export function YtLink({ yt }) {
  if (!yt) return null;
  const url = yt.startsWith("http") ? yt : `https://www.youtube.com/watch?v=${yt}`;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ color: "var(--text-30)", fontSize: 15 }}
      onMouseEnter={e => e.target.style.color = "#ff4444"}
      onMouseLeave={e => e.target.style.color = "var(--text-30)"}
    >▶</a>
  );
}

// Nation Picker (FIXED: shows all nations on focus, not just 40)
export function NP({ nations, sel, onSel, label, color = "var(--blue)" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fl = useMemo(() => {
    const filtered = nations.filter(n =>
      (typeof n === "string" ? n : n[0]).toLowerCase().includes(q.toLowerCase())
    );
    // Show all matches (not limited to 40)
    return filtered;
  }, [nations, q]);

  const getName = n => typeof n === "string" ? n : n[0];

  return (
    <div ref={ref} style={{ position: "relative", flex: "1 1 200px" }}>
      {label && <div style={{ fontSize: 11, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>}
      <input
        value={open ? q : (sel || "")}
        onFocus={() => { setOpen(true); setQ(""); }}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        placeholder="Select nation…"
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600,
          background: "var(--input-bg)", border: `1px solid ${sel ? color + "44" : "var(--border-08)"}`,
          color: sel ? color : "var(--text)",
        }}
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 4,
          maxHeight: 320, overflowY: "auto", borderRadius: 8,
          background: "var(--dropdown-bg)", border: "1px solid var(--border-10)",
          boxShadow: "var(--dropdown-shadow)",
        }}>
          {sel && (
            <div onClick={() => { onSel(null); setQ(""); }}
              style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-30)", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
              onMouseEnter={e => e.target.style.background = "var(--hover-bg)"}
              onMouseLeave={e => e.target.style.background = "transparent"}
            >Clear selection</div>
          )}
          {fl.map(n => {
            const name = getName(n);
            return (
              <div key={name} onClick={() => { onSel(name); setOpen(false); setQ(""); }}
                style={{ padding: "8px 14px", fontSize: 13, color: "var(--text-60)", cursor: "pointer", borderBottom: "1px solid var(--text-04)" }}
                onMouseEnter={e => e.target.style.background = "var(--hover-bg)"}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >
                {typeof n === "string" ? n : (
                  <><span>{n[0]}</span><span style={{ float: "right", fontSize: 11, color: "var(--text-30)" }}>{n[1]} GF{n[2] > 0 ? ` · ${n[2]}🏆` : ""}</span></>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
