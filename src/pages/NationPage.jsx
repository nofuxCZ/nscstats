import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { loadData } from '../data/loader';
import { Loader, NP, Pg } from '../components/Shared';

function St(props) {
  var v = props.v, l = props.l, c = props.c, sub = props.sub;
  var color = c || "var(--blue)";
  var display = (v == null) ? "\u2014" : String(v);
  return (
    <div style={{ textAlign: "center", padding: "12px 8px", minWidth: 72 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 900, color: color, lineHeight: 1.1 }}>{display}</div>
      <div style={{ fontSize: 9, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{String(l)}</div>
      {sub != null && <div style={{ fontSize: 9, color: "var(--text-15)", marginTop: 1 }}>{String(sub)}</div>}
    </div>
  );
}

export default function NationPage() {
  var _st = useState(null); var D = _st[0]; var setD = _st[1];
  var _st2 = useState("Calypso"); var sel = _st2[0]; var setSel = _st2[1];
  var _st3 = useState(0); var hp = _st3[0]; var setHp = _st3[1];

  useEffect(function() { loadData("nations").then(setD); }, []);

  // ALL hooks MUST be before any return
  var sortedList = useMemo(function() {
    if (!D) return [];
    return D.l.slice().sort(function(a, b) { return String(a[0]).localeCompare(String(b[0])); });
  }, [D]);

  var p = D ? D.p[sel] : null;
  var h = p ? (p.h || []) : [];

  var badges = useMemo(function() {
    if (!p) return [];
    var b = [];
    if (p.w > 0) b.push("\u{1F3C6} " + String(p.w) + " win" + (p.w > 1 ? "s" : ""));
    if (p.t3 > 0) b.push("\u{1F948} " + String(p.t3) + " podium finishes");
    if ((p.t6 || 0) > 0) b.push("\u2B50 " + String(p.t6) + " top-6 (PQ) finishes");
    if (p.bs > 0) b.push("\u{1F525} " + String(p.bs) + "-edition GF streak");
    if (p.ta) b.push("\u266B Most sent: " + String(p.ta) + " (" + String(p.tac || 0) + "x)");
    if ((p.gl || 0) > 0) b.push("\u{1F4C9} " + String(p.gl) + " last place" + (p.gl > 1 ? "s" : "") + " in GF");
    if ((p.sfD || 0) > 0) b.push("\u274C " + String(p.sfD) + " SF elimination" + (p.sfD > 1 ? "s" : ""));
    if ((p.rj || 0) > 0) b.push("\u{1F3AB} " + String(p.rj) + " REJU qualification" + (p.rj > 1 ? "s" : ""));
    // NQ streaks computed from history
    if (h.length > 0) {
      var best = 0, cur = 0, cNQ = 0;
      for (var i = 0; i < h.length; i++) {
        var hasSF = h[i][1] != null;
        var hasGF = h[i][4] != null;
        var dnq = hasSF && !hasGF;
        if (dnq) { cur++; best = Math.max(best, cur); } else { cur = 0; }
      }
      // Current NQ streak (from most recent edition backwards)
      for (var j = h.length - 1; j >= 0; j--) {
        var hasSF2 = h[j][1] != null;
        var hasGF2 = h[j][4] != null;
        if (hasSF2 && !hasGF2) cNQ++; else break;
      }
      if (best >= 3) b.push("\u{1F6AB} " + String(best) + "-edition worst NQ streak");
      if (cNQ >= 2) b.push("\u26A0\uFE0F Currently on " + String(cNQ) + "-edition NQ streak");
    }
    return b;
  }, [p, h]);

  var PS = 25;
  var tp = Math.ceil(h.length / PS);
  var hs = useMemo(function() {
    return h.slice().reverse().slice(hp * PS, (hp + 1) * PS);
  }, [h, hp]);

  var chartData = useMemo(function() {
    if (!h || h.length === 0) return [];
    return h.map(function(r) {
      return { ed: r[0], gfP: r[4] || null, isWin: r[4] === 1, isPod: r[4] && r[4] <= 3, isPq: r[4] && r[4] >= 4 && r[4] <= 6 };
    }).filter(function(d) { return d.gfP != null; });
  }, [h]);

  // NOW we can do conditional returns
  if (!D) return <Loader />;

  function handleSel(n) { setSel(n || "Calypso"); setHp(0); }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
      <div style={{ fontSize: 11, color: "var(--text-20)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{"Nation Profile"}</div>

      <NP nations={sortedList} sel={sel} onSel={handleSel} color="var(--blue)" />

      {p ? (
        <div>
          <div className="fi" key={sel} style={{ marginTop: 24, background: "var(--nation-card-bg)", border: "1px solid var(--nation-card-border)", borderRadius: 16, padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,42px)", fontWeight: 900, background: p.w > 0 ? "var(--grad-title)" : "var(--grad-blue-purple)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>{String(sel)}</h1>
                <div style={{ fontSize: 13, color: "var(--text-35)", marginTop: 6 }}>{"Active since #" + String(p.fe || "") + " \u00B7 Last seen in #" + String(p.le || "") + " \u00B7 " + String(p.te || 0) + " editions total"}</div>
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
              <St v={p.qr != null ? String(p.qr) + "%" : null} l="QF Rate" c={p.qr != null ? (p.qr >= 70 ? "var(--green)" : p.qr >= 50 ? "var(--gold)" : "var(--red)") : "var(--text-30)"} sub={String(p.sfQ || 0) + "/" + String(p.sf || 0)} />
              <St v={p.bs} l="Best" c="var(--text-45)" sub="GF streak" />
              <St v={p.gl || 0} l="Last" c="var(--red)" sub="GF places" />
              <St v={p.sfl || 0} l="Last" c="var(--red)" sub="SF places" />
              <St v={p.sfD || 0} l="SF" c="var(--text-45)" sub="Eliminations" />
            </div>
            {badges.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
                {badges.map(function(b, i) {
                  return <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, background: "var(--text-03)", border: "1px solid var(--border)", color: "var(--text-60)" }}>{String(b)}</div>;
                })}
              </div>
            )}
          </div>

          {chartData.length > 2 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-60)", marginBottom: 6 }}>
                {"Grand Final Placement History "}
                <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-30)" }}>{"(lower is better)"}</span>
              </div>
              <div style={{ background: "var(--card-dark)", borderRadius: 12, padding: "16px 8px 8px 0" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                    <XAxis dataKey="ed" tick={{ fill: "var(--text-25)", fontSize: 10 }} axisLine={{ stroke: "var(--border-08)" }} tickLine={false} label={{ value: "Edition", position: "insideBottom", offset: -2, fill: "var(--text-20)", fontSize: 11 }} />
                    <YAxis reversed domain={[1, "auto"]} tick={{ fill: "var(--text-25)", fontSize: 10 }} axisLine={{ stroke: "var(--border-08)" }} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ background: "var(--dropdown-bg)", border: "1px solid var(--border-10)", borderRadius: 8, fontSize: 13, color: "var(--text)" }} labelFormatter={function(v) { return "Edition " + v; }} formatter={function(v) { return [v, "GF Place"]; }} />
                    <ReferenceLine y={6} stroke="var(--blue-glow-50)" strokeDasharray="4 4" strokeWidth={1} />
                    <Line type="monotone" dataKey="gfP" stroke="var(--gold)" strokeWidth={1.5} dot={function(props) {
                      var d = props.payload;
                      var fill = d.isWin ? "var(--gold)" : d.isPod ? "var(--silver)" : d.isPq ? "var(--blue)" : "var(--text-30)";
                      var r = d.isWin ? 4 : d.isPod ? 3.5 : d.isPq ? 3 : 2;
                      return <circle cx={props.cx} cy={props.cy} r={r} fill={fill} stroke="none" />;
                    }} activeDot={{ r: 5, fill: "var(--gold)" }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {h.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-60)", marginBottom: 6 }}>
                {"Recent Results "}
                <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-30)" }}>{"(last 20 editions)"}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-25)", display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <span>{"Numbers = GF place"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--red-light)" }} />{"DNQ (shows SF place)"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gold)" }} />{"Win"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--blue-glow-20)", border: "1px solid var(--blue)" }} />{"PQ (4\u20136)"}</span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {h.slice(-20).map(function(r) {
                  var ed = r[0], sfP = r[2], gfP = r[4];
                  var isW = gfP === 1;
                  var isM = gfP && gfP <= 3;
                  var isPq = gfP && gfP >= 4 && gfP <= 6;
                  var dnq = r[1] && !gfP;
                  var bg, color, num, border;
                  if (isW) { bg = "var(--gold)"; color = "var(--btn-body)"; num = gfP; border = "none"; }
                  else if (isM) { bg = "var(--card-dark)"; color = "var(--text)"; num = gfP; border = "1px solid var(--border-08)"; }
                  else if (isPq) { bg = "var(--blue-glow-20)"; color = "var(--blue)"; num = gfP; border = "1.5px solid var(--blue-glow-50)"; }
                  else if (dnq) { bg = "var(--red-light)"; color = "var(--red-text)"; num = sfP || "?"; border = "none"; }
                  else if (gfP) { bg = "var(--card-dark)"; color = "var(--text-60)"; num = gfP; border = "1px solid var(--border-08)"; }
                  else { bg = "var(--text-04)"; color = "var(--text-20)"; num = "\u2014"; border = "none"; }
                  return (
                    <div key={ed} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      {dnq ? <div style={{ fontSize: 8, fontWeight: 700, color: "var(--red-text)", textTransform: "uppercase", lineHeight: 1 }}>{"DNQ"}</div> : <div style={{ height: 10 }} />}
                      <div style={{
                        width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: isW ? "50%" : 6, background: bg, border: border,
                        fontSize: 13, fontWeight: 700, color: color,
                      }}>{String(num)}</div>
                      <div style={{ fontSize: 9, color: "var(--text-20)" }}>{String(ed)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {h.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-60)", marginBottom: 10 }}>{"Edition History (" + String(h.length) + " editions)"}</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 2px", minWidth: 700 }}>
                  <thead><tr>{["Ed.", "SF", "SF Pl.", "SF Pts", "GF Pl.", "GF Pts", "Artist", "Song"].map(function(hd, i) {
                    return <th key={hd} style={{ padding: "10px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-30)", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: ["center","center","center","right","center","right","left","left"][i], borderBottom: "1px solid var(--border-08)", width: [48,50,52,56,56,56,null,null][i] }}>{hd}</th>;
                  })}</tr></thead>
                  <tbody>{hs.map(function(r) {
                    var e=r[0],sfS=r[1],sfP=r[2],sfPt=r[3],gfP=r[4],gfPt=r[5],art=r[6],song=r[7];
                    var isW=gfP===1,isM=gfP&&gfP<=3,isPq=gfP&&gfP>=4&&gfP<=6,dnq=sfS&&!gfP;
                    var mc={1:"var(--gold)",2:"var(--silver)",3:"var(--bronze)"};
                    var bg=isW?"rgba(255,215,0,0.05)":isM?"var(--text-02)":isPq?"var(--blue-glow-02)":dnq?"rgba(255,80,80,0.02)":"transparent";
                    return <tr key={String(e)}>
                      <td style={{padding:"8px 10px",textAlign:"center",fontSize:14,fontWeight:700,color:"var(--text-25)",fontFamily:"var(--font-display)",background:bg,borderRadius:"8px 0 0 8px"}}>{String(e)}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",background:bg}}>{sfS?<span style={{fontSize:11,fontWeight:700,padding:"2px 6px",borderRadius:3,background:String(sfS)==="SF1"?"var(--blue-glow-15)":"var(--purple-glow-15)",color:String(sfS)==="SF1"?"var(--blue)":"var(--purple)"}}>{String(sfS)}</span>:gfP?<span style={{fontSize:10,color:"var(--gold-text-40)",fontWeight:600}}>{"PQ"}</span>:<span style={{color:"var(--text-10)"}}>{"\u2014"}</span>}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontSize:13,color:sfP?"var(--text-45)":"var(--text-15)",background:bg}}>{sfP!=null?String(sfP):"\u2014"}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontSize:13,color:sfPt?"var(--text-40)":"var(--text-10)",background:bg}}>{sfPt!=null?String(sfPt):"\u2014"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",background:bg}}>{mc[gfP]?<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:"50%",fontWeight:700,fontSize:12,background:mc[gfP],color:"var(--btn-body)"}}>{String(gfP)}</span>:isPq?<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:"50%",fontWeight:700,fontSize:12,background:"var(--blue-glow-20)",border:"1.5px solid var(--blue-glow-50)",color:"var(--blue)"}}>{String(gfP)}</span>:dnq?<span style={{fontSize:11,fontWeight:700,color:"var(--red-text)",background:"var(--red-light)",padding:"2px 8px",borderRadius:4}}>{"DNQ"}</span>:gfP?<span style={{color:"var(--text-45)"}}>{String(gfP)}</span>:<span style={{color:"var(--text-10)"}}>{"\u2014"}</span>}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:600,fontSize:13,background:bg,color:isW?"var(--gold)":isM?"var(--text-60)":gfPt?"var(--text-45)":"var(--text-10)"}}>{gfPt!=null?String(gfPt):"\u2014"}</td>
                      <td style={{padding:"8px 10px",fontSize:13,color:dnq?"var(--text-30)":"var(--text-60)",background:bg,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{art?String(art):"\u2014"}</td>
                      <td style={{padding:"8px 10px",fontSize:13,fontStyle:"italic",color:dnq?"var(--text-20)":"var(--text-40)",background:bg,borderRadius:"0 8px 8px 0",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{song?String(song):"\u2014"}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <Pg p={hp} t={tp} set={setHp} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-30)" }}>{"Select a nation from the dropdown above"}</div>
      )}
    </div>
  );
}
