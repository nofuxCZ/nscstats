import { useState, useEffect, useMemo } from 'react';
import { loadData } from '../data/loader';
import { Loader, NP, Pg } from '../components/Shared';

function St({ v, l, c, sub }) {
  var color = c || "var(--blue)";
  var display = v === null || v === undefined ? "\u2014" : String(v);
  return (
    <div style={{ textAlign: "center", padding: "12px 8px", minWidth: 72 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: color, lineHeight: 1.1 }}>{display}</div>
      <div style={{ fontSize: 9, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{String(l)}</div>
      {sub != null && <div style={{ fontSize: 9, color: "var(--text-15)", marginTop: 1 }}>{String(sub)}</div>}
    </div>
  );
}

export default function NationPage() {
  var [D, setD] = useState(null);
  var [sel, setSel] = useState("Calypso");
  var [hp, setHp] = useState(0);
  useEffect(function() { loadData("nations").then(setD); }, []);
  if (!D) return <Loader />;

  var sortedList = useMemo(function() {
    return D.l.slice().sort(function(a, b) { return a[0].localeCompare(b[0]); });
  }, [D]);

  var p = sel ? D.p[sel] : null;
  var h = p ? (p.h || []) : [];
  var PS = 25;
  var tp = Math.ceil(h.length / PS);
  var hs = h.length > 0 ? h.slice().reverse().slice(hp * PS, (hp + 1) * PS) : [];

  var badges = [];
  if (p) {
    if (p.w > 0) badges.push("\u{1F3C6} " + p.w + " win" + (p.w > 1 ? "s" : ""));
    if (p.t3 > 0) badges.push("\u{1F948} " + p.t3 + " podium finishes");
    if ((p.t6 || 0) > 0) badges.push("\u2B50 " + p.t6 + " top-6 (PQ) finishes");
    if (p.bs > 0) badges.push("\u{1F525} " + p.bs + "-edition GF streak");
    if (p.ta) badges.push("\u266B Most sent: " + String(p.ta) + " (" + String(p.tac || 0) + "x)");
    if ((p.gl || 0) > 0) badges.push("\u{1F4C9} " + p.gl + " last place" + (p.gl > 1 ? "s" : "") + " in GF");
    if ((p.sfD || 0) > 0) badges.push("\u274C " + p.sfD + " SF elimination" + (p.sfD > 1 ? "s" : ""));
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      <div style={{ fontSize: 11, color: "var(--text-20)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{"Nation Profile"}</div>

      <NP nations={sortedList} sel={sel} onSel={function(n) { setSel(n || "Calypso"); setHp(0); }} color="var(--blue)" />

      {p && (
        <>
        <div className="fi" key={sel} style={{ marginTop: 24, background: "var(--nation-card-bg)", border: "1px solid var(--nation-card-border)", borderRadius: 16, padding: "28px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, background: p.w > 0 ? "var(--grad-title)" : "var(--grad-blue-purple)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>{String(sel)}</h1>
              <div style={{ fontSize: 13, color: "var(--text-35)", marginTop: 6 }}>{"Active since #" + String(p.fe) + " \u00B7 Last seen in #" + String(p.le) + " \u00B7 " + String(p.te) + " editions total"}</div>
            </div>
            {p.w > 0 && <div style={{ display: "flex", gap: 2 }}>{Array.from({ length: Math.min(p.w, 12) }).map(function(_, i) { return <span key={i} style={{ fontSize: 20 }}>🏆</span>; })}</div>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 20, background: "var(--card-dark)", borderRadius: 12, padding: "6px 2px" }}>
            <St v={p.gf} l="GF Entries" c="var(--gold)" />
            <St v={p.w} l="Wins" c={p.w > 0 ? "var(--gold)" : "var(--text-30)"} />
            <St v={p.t3} l="Podiums" c="var(--silver)" />
            <St v={p.t6 || 0} l="Top 6" c="var(--blue)" />
            <St v={p.bp} l="Best" c="var(--gold)" sub="GF place" />
            <St v={p.apl} l="Avg" c="var(--text-60)" sub="GF place" />
            <St v={p.ap} l="Avg" c="var(--text-60)" sub="GF pts" />
            <St v={p.bpts} l="Best" c="var(--purple)" sub="GF score" />
            <St v={p.qr != null ? String(p.qr) + "%" : "\u2014"} l="QF Rate" c={p.qr != null ? (p.qr >= 70 ? "var(--green)" : p.qr >= 50 ? "var(--gold)" : "var(--red)") : "var(--text-30)"} sub={String(p.sfQ || 0) + "/" + String(p.sf || 0)} />
            <St v={p.bs} l="Best" c="var(--text-45)" sub="GF streak" />
            <St v={p.gl || 0} l="Last" c="var(--red)" sub="GF places" />
            <St v={p.sfD || 0} l="Last" c="var(--text-45)" sub="SF places" />
          </div>
          {badges.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>{badges.map(function(b, i) { return <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, background: "var(--text-03)", border: "1px solid var(--border)", color: "var(--text-60)" }}>{String(b)}</div>; })}</div>}
        </div>

        {h.length > 0 && <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-60)", marginBottom: 10 }}>{"Edition History (" + String(h.length) + " editions)"}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px", minWidth: 700 }}>
              <thead><tr>{["Ed.", "SF", "SF Pl.", "SF Pts", "GF Pl.", "GF Pts", "Artist", "Song"].map(function(hd, i) { return <th key={hd} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","center","center","right","center","right","left","left"][i], borderBottom: "1px solid var(--border-08)", width: [48,50,52,56,56,56,null,null][i] }}>{hd}</th>; })}</tr></thead>
              <tbody>{hs.map(function(r) {
                var e=r[0],sfS=r[1],sfP=r[2],sfPt=r[3],gfP=r[4],gfPt=r[5],art=r[6],song=r[7];
                var isW=gfP===1,isM=gfP&&gfP<=3,isPq=gfP&&gfP>=4&&gfP<=6,dnq=sfS&&!gfP;
                var mc={1:"var(--gold)",2:"var(--silver)",3:"var(--bronze)"};
                var bg=isW?"rgba(255,215,0,0.05)":isM?"var(--text-02)":isPq?"var(--blue-glow-02)":dnq?"rgba(255,80,80,0.02)":"transparent";
                return <tr key={e}>
                  <td style={{padding:"8px 10px",textAlign:"center",fontSize:14,fontWeight:700,color:"var(--text-25)",fontFamily:"var(--font-display)",background:bg,borderRadius:"8px 0 0 8px"}}>{String(e)}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",background:bg}}>{sfS?<span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:3,background:sfS==="SF1"?"var(--blue-glow-15)":"var(--purple-glow-15)",color:sfS==="SF1"?"var(--blue)":"var(--purple)"}}>{String(sfS)}</span>:gfP?<span style={{fontSize:10,color:"var(--gold-text-40)",fontWeight:600}}>{"PQ"}</span>:<span style={{color:"var(--text-10)"}}>{"\u2014"}</span>}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",fontSize:13,color:sfP?"var(--text-45)":"var(--text-15)",background:bg}}>{sfP?String(sfP):"\u2014"}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontSize:13,color:sfPt?"var(--text-40)":"var(--text-10)",background:bg}}>{sfPt?String(sfPt):"\u2014"}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",background:bg}}>{mc[gfP]?<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:"50%",fontWeight:700,fontSize:12,background:mc[gfP],color:"var(--btn-body)"}}>{String(gfP)}</span>:isPq?<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:"50%",fontWeight:700,fontSize:12,background:"var(--blue-glow-20)",border:"1.5px solid var(--blue-glow-50)",color:"var(--blue)"}}>{String(gfP)}</span>:dnq?<span style={{fontSize:11,fontWeight:700,color:"var(--red-text)",background:"var(--red-light)",padding:"2px 8px",borderRadius:4}}>{"DNQ"}</span>:gfP?<span style={{color:"var(--text-45)"}}>{String(gfP)}</span>:<span style={{color:"var(--text-10)"}}>{"\u2014"}</span>}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:600,fontSize:13,background:bg,color:isW?"var(--gold)":isM?"var(--text-60)":gfPt?"var(--text-45)":"var(--text-10)"}}>{gfPt?String(gfPt):"\u2014"}</td>
                  <td style={{padding:"8px 10px",fontSize:13,color:dnq?"var(--text-30)":"var(--text-60)",background:bg,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{art?String(art):"\u2014"}</td>
                  <td style={{padding:"8px 10px",fontSize:13,fontStyle:"italic",color:dnq?"var(--text-20)":"var(--text-40)",background:bg,borderRadius:"0 8px 8px 0",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{song?String(song):"\u2014"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <Pg p={hp} t={tp} set={setHp} />
        </div>}
        </>
      )}

      {!p && <div style={{ padding: 40, textAlign: "center", color: "var(--text-30)" }}>{"Select a nation from the dropdown above"}</div>}
    </div>
  );
}
