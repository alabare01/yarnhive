import { useState, useRef, useEffect } from "react";
import { T, useBreakpoint } from "./theme.jsx";
import { PILL } from "./constants.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, getSession, supabaseAuth } from "./supabase.js";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const hoursSince = (dateStr) => dateStr ? (Date.now() - new Date(dateStr).getTime()) / 3600000 : Infinity;
const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const h = hoursSince(dateStr);
  if (h < 1) return "Updated just now";
  if (h < 24) return `Updated ${Math.round(h)}h ago`;
  const d = Math.round(h / 24);
  return `Updated ${d} day${d !== 1 ? "s" : ""} ago`;
};

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const CARD = {
  bg: "#FFFFFF",
  radius: 20,
  shadow: "0 4px 24px rgba(155,126,200,0.09)",
  border: "1px solid #EDE4F7",
};
const PF = "'Playfair Display',Georgia,serif";
const INTER = "Inter,sans-serif";
const NAVY = "#2D3A7C";
const INK = "#2D2D4E";
const ACCENT = "#9B7EC8";
const MUTED = "#6B6B8A";
const PILL_BG = "#F3EFF8";

// ─── RENAME MODAL ───────────────────────────────────────────────────────────
const RenameModal = ({pattern,onSave,onCancel}) => {
  const [val,setVal]=useState(pattern.title||"");
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onCancel}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(3px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:"#fff",borderRadius:16,padding:"24px 22px 20px",width:"100%",maxWidth:360,boxShadow:"0 12px 40px rgba(0,0,0,.2)"}}>
        <div style={{fontFamily:PF,fontSize:18,fontWeight:700,color:INK,marginBottom:14}}>Rename pattern</div>
        <input value={val} onChange={e=>setVal(e.target.value)} autoFocus style={{width:"100%",padding:"10px 14px",border:"1.5px solid #EDE4F7",borderRadius:10,fontSize:14,fontFamily:INTER,color:INK,outline:"none",boxSizing:"border-box",marginBottom:16}} onFocus={e=>e.target.style.borderColor=ACCENT} onBlur={e=>e.target.style.borderColor="#EDE4F7"}/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{background:"none",border:"1px solid #EDE4F7",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:600,color:MUTED,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave(val.trim())} disabled={!val.trim()} style={{background:val.trim()?ACCENT:"#D5CBE8",border:"none",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:600,color:"#fff",cursor:val.trim()?"pointer":"not-allowed"}}>Save</button>
        </div>
      </div>
    </div>
  );
};

// ─── PATTERN CARD ───────────────────────────────────────────────────────────
const PatternCard = ({p,onClick,onPark,onUnpark,onDelete,onCoverChange,onRename,delay=0,pct,catFallbackPhoto,Photo,Bar,Stars}) => {
  const done=pct(p);
  const [menuOpen,setMenuOpen]=useState(false);
  const [renaming,setRenaming]=useState(false);
  const isParked=p.status==="parked";
  const cardPhoto=p.cover_image_url||(PILL.includes(p.photo)?catFallbackPhoto(p.cat):p.photo)||catFallbackPhoto(p.cat);
  const isPlaceholder=!p.cover_image_url&&PILL.includes(p.photo);
  const hasImage = !!cardPhoto && !isPlaceholder;
  return (
    <div className="card fu" onClick={onClick} style={{background:CARD.bg,borderRadius:CARD.radius,overflow:"hidden",border:CARD.border,cursor:"pointer",animationDelay:delay+"s",position:"relative",boxShadow:CARD.shadow,transition:"transform 0.15s ease, box-shadow 0.15s ease"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(155,126,200,0.15)";}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=CARD.shadow;}}>
      {renaming&&<RenameModal pattern={p} onCancel={()=>setRenaming(false)} onSave={newTitle=>{setRenaming(false);onRename&&onRename(p,newTitle);}}/>}
      {!p.isStarter&&(onPark||onDelete)&&<div style={{position:"absolute",top:8,right:8,zIndex:5}}>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}} style={{background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)",border:"none",borderRadius:99,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>⋮</button>
        {menuOpen&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:32,background:T.modal,border:CARD.border,borderRadius:10,boxShadow:CARD.shadow,zIndex:10,minWidth:150,overflow:"hidden"}}>
          {onRename&&<div onClick={()=>{setMenuOpen(false);setRenaming(true);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:"1px solid #EDE4F7"}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Rename pattern</div>}
          {!p.isStarter&&onCoverChange&&<div onClick={()=>{setMenuOpen(false);onCoverChange(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:"1px solid #EDE4F7"}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Change cover image</div>}
          {isParked
            ?<div onClick={()=>{setMenuOpen(false);onUnpark&&onUnpark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:"1px solid #EDE4F7"}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Unpark</div>
            :<div onClick={()=>{setMenuOpen(false);onPark&&onPark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:"1px solid #EDE4F7"}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Park for later</div>
          }
          <div onClick={()=>{setMenuOpen(false);onDelete&&onDelete(p);}} style={{padding:"10px 14px",fontSize:13,color:"#C05A5A",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Delete pattern</div>
        </div>}
      </div>}
      {/* Image container — 200px height, full bleed */}
      <div style={{position:"relative",height:200,overflow:"hidden",borderRadius:`${CARD.radius}px ${CARD.radius}px 0 0`,background:"linear-gradient(135deg, #EDE4F7 0%, #F5F0FA 100%)"}}>
        {hasImage
          ? <Photo src={cardPhoto} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",display:"block"}}/>
          : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:PF,fontSize:36,color:ACCENT,opacity:0.5}}>{(p.title||"?")[0]}</span>
            </div>
        }
        {/* Status badges */}
        {isParked?<div style={{position:"absolute",top:10,left:10,background:"rgba(92,79,68,.8)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Parked</div>
        :p.isStarter?<div style={{position:"absolute",top:10,left:10,background:"rgba(184,144,44,.9)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Free Starter</div>
        :done===100?<div style={{position:"absolute",top:10,right:10,background:T.sage,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99,letterSpacing:".07em"}}>DONE</div>
        :done>0&&done<100?<><div style={{position:"absolute",top:10,right:10,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{done}%</div><div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={done} color="rgba(255,255,255,.8)" h={3} bg="transparent"/></div></>
        :null}
        {!isParked&&!p.isStarter&&done===0&&!p.started&&p.rows&&p.rows.length>0&&<div style={{position:"absolute",top:10,right:10,background:"rgba(92,122,94,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Ready to build</div>}
        {!p.isStarter&&p.snapConfidence&&<div style={{position:"absolute",top:10,left:10,background:"rgba(155,126,200,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99}}>✨ {p.snapConfidence}%</div>}
        {isPlaceholder&&!p.isStarter&&onCoverChange&&<button onClick={e=>{e.stopPropagation();onCoverChange(p);}} style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",background:"rgba(255,255,255,.15)",backdropFilter:"blur(4px)",border:`1.5px solid ${T.terra}`,borderRadius:10,padding:"6px 14px",fontSize:11,fontWeight:600,color:"#fff",cursor:"pointer",whiteSpace:"nowrap"}}>Set cover image</button>}
      </div>
      {/* Card body */}
      <div style={{padding:"14px 16px 16px"}}>
        {p.cat&&p.cat.toLowerCase()!=="uncategorized"&&<div style={{fontFamily:INTER,fontSize:10,fontWeight:600,color:ACCENT,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{p.cat}</div>}
        <div style={{fontFamily:PF,fontSize:15,fontWeight:600,color:NAVY,lineHeight:1.3,margin:"0 0 6px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",whiteSpace:"normal"}}>{p.title}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Stars val={p.rating} ro/><span style={{fontFamily:INTER,fontSize:11,color:"#9B87B8"}}>{p.source}</span></div>
        {p.isStarter&&<div style={{fontSize:12,color:MUTED,opacity:.6,marginTop:6,fontStyle:"italic"}}>A gift from Wovely — yours to keep</div>}
      </div>
    </div>
  );
};

// ─── EMPTY SLOT CARDS ───────────────────────────────────────────────────────
const SLOT_SVGS = [
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><circle cx="24" cy="24" r="14"/><path d="M18 18c3-3 9-3 12 0"/><path d="M14 24c0-2 2-6 10-6s10 4 10 6"/><path d="M24 10v4M24 34v4"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M20 8l-4 30"/><path d="M16 20c0-6 12-6 12 0s-12 6-12 0"/><circle cx="30" cy="14" r="3"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M18 10l12 14-12 14"/><path d="M30 10l-12 14 12 14"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M24 6l10 6v12l-10 6-10-6V12z"/><path d="M24 18v12"/><path d="M14 12l10 6 10-6"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M24 8l4 10h10l-8 6 3 10-9-7-9 7 3-10-8-6h10z"/></svg>`,
];

const EmptySlotCard = ({onClick,slotIndex=0}) => (
  <div onClick={onClick} style={{background:T.surface,borderRadius:CARD.radius,border:"2px dashed #D4C5ED",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:220,transition:"border-color .2s, background .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.terra;e.currentTarget.style.background=T.terraLt;}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#D4C5ED";e.currentTarget.style.background=T.surface;}}>
    <div style={{width:48,height:48,marginBottom:10}} dangerouslySetInnerHTML={{__html:SLOT_SVGS[slotIndex%SLOT_SVGS.length]}}/>
    <div style={{fontSize:13,color:T.ink2}}>Add a pattern</div>
  </div>
);

// Playfair italic accent span helper
const Em = ({ children }) => <span style={{ fontFamily: PF, fontStyle: "italic", color: ACCENT }}>{children}</span>;

// ─── ZONE A: BEV CORNER ─────────────────────────────────────────────────────
const BevCorner = ({ patterns, isMobile }) => {
  const inProgress = patterns.filter(p => p.status === "in_progress" || p.started);
  const mostRecent = [...inProgress].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];

  let content;
  if (patterns.length === 0) {
    content = <>Your craft room is empty. <Em>Let's hang something on the walls.</Em> 🧶</>;
  } else if (inProgress.length > 0 && mostRecent && hoursSince(mostRecent.updated_at) > 72) {
    content = <>Psst… <Em>"{mostRecent.title}"</Em> is still waiting. You okay? 👀</>;
  } else if (inProgress.length > 0 && mostRecent && hoursSince(mostRecent.updated_at) < 2) {
    content = <>Look at you go. <Em>Bev's genuinely impressed.</Em> 💜</>;
  } else if (new Date().getHours() >= 18 && new Date().getHours() <= 22) {
    content = <>Evening craft session? <Em>Bev approves.</Em> 🌙</>;
  } else {
    content = <>Hey! You've got <Em>{inProgress.length} pattern{inProgress.length !== 1 ? "s" : ""} in progress.</Em> Bev's watching. 🐍</>;
  }

  return (
    <div style={{
      gridColumn: "1 / -1",
      display: "flex", alignItems: "flex-start", gap: 16,
      padding: "20px 24px", background: CARD.bg, borderRadius: CARD.radius,
      border: CARD.border, boxShadow: "0 2px 16px rgba(155,126,200,0.08)", marginBottom: 24,
    }}>
      <img src="/bev_neutral.png" alt="Bev" style={{
        width: isMobile ? 68 : 88, height: "auto", flexShrink: 0,
        filter: "drop-shadow(0 6px 20px rgba(155,126,200,0.4))",
      }} />
      <div style={{
        position: "relative", background: "#F8F6FF",
        borderRadius: "4px 18px 18px 18px", padding: "18px 22px", flex: 1,
      }}>
        <div style={{ fontFamily: INTER, fontSize: 15, color: INK, lineHeight: 1.6 }}>{content}</div>
      </div>
    </div>
  );
};

// ─── ZONE B: ON THE HOOK ────────────────────────────────────────────────────
const OnTheHook = ({ inProgress, openDetail, onAddPattern, pct, catFallbackPhoto, Photo, isMobile }) => {
  const sectionLabel = <div style={{ fontFamily: PF, fontSize: 20, fontWeight: 600, color: NAVY, marginBottom: 12 }}>On the Hook</div>;

  if (inProgress.length === 0) {
    return (
      <div>
        {sectionLabel}
        <div style={{
          border: "2px dashed #D4C5ED", borderRadius: CARD.radius, padding: "40px 24px",
          textAlign: "center", background: "#FDFBFF", boxShadow: CARD.shadow,
        }}>
          <div style={{ fontFamily: INTER, fontSize: 14, color: MUTED, marginBottom: 4 }}>Nothing on the hook yet.</div>
          <div style={{ fontFamily: PF, fontStyle: "italic", fontSize: 14, color: ACCENT, marginBottom: 16 }}>Ready to start something?</div>
          <button onClick={onAddPattern} style={{
            background: ACCENT, color: "#fff", border: "none", borderRadius: 12,
            padding: "12px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: INTER,
          }}>Import a Pattern</button>
        </div>
      </div>
    );
  }

  const hero = inProgress[0];
  const rest = inProgress.slice(1);
  const heroPhoto = hero.cover_image_url || hero.photo || catFallbackPhoto(hero.cat);
  const rows = Array.isArray(hero.rows) ? hero.rows : [];
  const doneRows = rows.filter(r => r && r.done).length;
  const totalRows = rows.length;

  return (
    <div>
      {sectionLabel}

      {/* Hero card */}
      <div onClick={() => openDetail(hero)} style={{
        background: CARD.bg, borderRadius: CARD.radius, boxShadow: CARD.shadow, border: CARD.border,
        overflow: "hidden", cursor: "pointer",
      }}>
        <div style={{
          height: isMobile ? 160 : 200, overflow: "hidden",
          borderRadius: `${CARD.radius}px ${CARD.radius}px 0 0`, position: "relative",
          background: "linear-gradient(135deg, #EDE4F7, #F5F0FA)",
        }}>
          {heroPhoto
            ? <Photo src={heroPhoto} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: PF, fontSize: 40, color: ACCENT, opacity: 0.5 }}>{(hero.title || "?")[0]}</span>
              </div>
          }
        </div>
        <div style={{ padding: "20px 22px 22px" }}>
          <div style={{ fontFamily: PF, fontSize: 18, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{hero.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: totalRows > 0 ? 12 : 0 }}>
            {hero.difficulty && <span style={{ fontFamily: INTER, fontSize: 10, background: PILL_BG, color: ACCENT, borderRadius: 20, padding: "3px 10px" }}>{hero.difficulty}</span>}
            <span style={{ fontFamily: INTER, fontSize: 11, color: MUTED }}>{timeAgo(hero.updated_at)}</span>
          </div>
          {totalRows > 0 && (
            <>
              <div style={{ height: 6, background: "#EDE4F7", borderRadius: 3, overflow: "hidden", margin: "0 0 6px" }}>
                <div style={{ width: (doneRows / totalRows * 100) + "%", height: "100%", background: ACCENT, borderRadius: 3, transition: "width .3s" }} />
              </div>
              <div style={{ fontFamily: INTER, fontSize: 11, color: MUTED, marginBottom: 18 }}>{doneRows} of {totalRows} rows</div>
            </>
          )}
          <button style={{
            background: ACCENT, color: "#fff", border: "none", borderRadius: 12,
            padding: "12px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", width: "100%",
            marginTop: 18, fontFamily: INTER,
          }}>Pick up where you left off →</button>

          {/* Scroll row for remaining — inside hero card */}
          {rest.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: "#9B87B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Also in progress</div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {rest.map(p => {
                  const photo = p.cover_image_url || p.photo;
                  return (
                    <div key={p.id} onClick={(e) => { e.stopPropagation(); openDetail(p); }} style={{
                      flexShrink: 0, width: 130, borderRadius: 14, border: "1px solid #EDE4F7",
                      overflow: "hidden", background: "#fff", cursor: "pointer",
                    }}>
                      {photo
                        ? <img src={photo} alt={p.title} style={{ width: "100%", height: 85, objectFit: "cover", display: "block" }} />
                        : <div style={{
                            height: 85, background: "linear-gradient(135deg,#EDE4F7,#F5F0FA)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: PF, fontSize: 24, color: ACCENT, opacity: 0.6,
                          }}>{p.title?.charAt(0) || "?"}</div>
                      }
                      <p style={{
                        fontSize: 11, color: INK, padding: "8px 10px", margin: 0, lineHeight: 1.4,
                        fontFamily: INTER, overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>{p.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ZONE: BRAG SHELF ───────────────────────────────────────────────────────
const BragShelf = ({ patterns, pct, isMobile }) => {
  const [stitchCount, setStitchCount] = useState(null);

  useEffect(() => {
    const user = supabaseAuth.getUser();
    if (!user) return;
    const session = getSession();
    if (!session?.access_token) return;

    fetch(`${SUPABASE_URL}/rest/v1/stitch_results?user_id=eq.${user.id}&select=id`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(rows => setStitchCount(rows.length))
      .catch(err => { console.log("[BragShelf] stitch_results query error:", err); setStitchCount(0); });
  }, []);

  const rowsTracked = patterns.reduce((sum, p) => {
    if (!Array.isArray(p.rows)) return sum;
    return sum + p.rows.filter(r => r && r.done === true).length;
  }, 0);

  const stats = [
    { value: patterns.length, label: "Patterns Saved" },
    { value: rowsTracked, label: "Rows Tracked" },
    { value: stitchCount, label: "Stitches Found" },
  ];

  const skeleton = <div style={{ width: 40, height: 24, background: "#EDE4F7", borderRadius: 6, margin: "0 auto" }} />;

  return (
    <div style={isMobile
      ? { display: "flex", gap: 12, gridColumn: "1 / -1" }
      : { display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 20 }
    }>
      <div style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: "#9B87B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, ...(isMobile ? { display: "none" } : {}) }}>Your Wovely</div>
      {stats.map(s => (
        <div key={s.label} style={{
          flex: isMobile ? 1 : undefined,
          background: CARD.bg, borderRadius: CARD.radius, boxShadow: CARD.shadow,
          border: CARD.border, padding: isMobile ? 12 : 20, textAlign: "center",
        }}>
          <div style={{ fontFamily: PF, fontSize: isMobile ? 24 : 32, color: ACCENT, fontWeight: 600 }}>
            {s.value === null ? skeleton : s.value}
          </div>
          <div style={{
            fontFamily: INTER, fontSize: 10, color: MUTED,
            letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN COLLECTION VIEW ───────────────────────────────────────────────────
const CollectionView = ({userPatterns,starterPatterns,cat,setCat,search,setSearch,openDetail,onAddPattern,isPro,tier,setView,onPark,onUnpark,onDelete,onCoverChange,onRename,pct,catFallbackPhoto,Photo,Bar,Stars,CATS,TIER_CONFIG}) => {
  const{isDesktop,isMobile}=useBreakpoint();
  const allPatterns = [...userPatterns,...starterPatterns];
  const visible=allPatterns.filter(p=>p.status!=="deleted");
  const starterPats=visible.filter(p=>p.isStarter);
  const addedPats=visible.filter(p=>!p.isStarter);
  const filteredAll=[...addedPats,...starterPats].filter(p=>(cat==="All"||p.cat===cat)&&(!search||p.title.toLowerCase().includes(search.toLowerCase())));
  const inProgress=visible.filter(p=>{const v=pct(p);return !p.isStarter&&p.status!=="parked"&&(p.status==="in_progress"||p.started||(v>0&&v<100))&&v<100;}).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
  const [viewMode,setViewMode]=useState("grid");
  const emptySlots=isPro?0:Math.max(0,TIER_CONFIG.free.patternCap-addedPats.length);

  return (
    <div style={{
      background: "linear-gradient(160deg, rgba(250,248,245,0.78) 0%, rgba(245,240,250,0.75) 100%), url('/wovely_landing_bg_v1.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "scroll",
      backgroundRepeat: "no-repeat",
      position: "relative",
      minHeight: "100vh",
      padding: isMobile ? "20px 16px 120px" : "28px 32px 80px",
    }}>
      {/* Two-column grid on desktop, single column on mobile */}
      <div style={isMobile ? { display: "flex", flexDirection: "column", gap: 16 } : {
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gridTemplateRows: "auto auto 1fr",
        gap: 24,
      }}>

        {/* Time-of-day greeting — replaces redundant "My Wovely" header */}
        <div style={{ gridColumn: "1 / -1" }}>
          <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 16, color: "#9B87B8", marginBottom: 20, marginTop: 4 }}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, here's your space.
          </p>
        </div>

        {/* ZONE A — Bev Corner — full width */}
        <BevCorner patterns={visible} isMobile={isMobile} />

        {/* ZONE B — On the Hook — left column */}
        <OnTheHook
          inProgress={inProgress}
          openDetail={openDetail}
          onAddPattern={onAddPattern}
          pct={pct}
          catFallbackPhoto={catFallbackPhoto}
          Photo={Photo}
          isMobile={isMobile}
        />

        {/* ZONE: Brag Shelf — right column on desktop, full width row on mobile */}
        <BragShelf patterns={visible} pct={pct} isMobile={isMobile} />

        {/* ZONE C — Your Library — full width */}
        <div style={{ gridColumn: "1 / -1", marginTop: 32 }}>
          <div style={{ fontFamily: PF, fontSize: 20, fontWeight: 600, color: NAVY, marginBottom: 12 }}>Your Library</div>

          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", background: CARD.bg, border: CARD.border, borderRadius: 12, padding: "10px 14px", gap: 9 }}>
              <span style={{ color: MUTED, fontSize: 15 }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your patterns…" style={{ border: "none", background: "transparent", flex: 1, fontSize: 14, color: INK, outline: "none", fontFamily: INTER }} />
            </div>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 16, WebkitOverflowScrolling: "touch" }}>
            {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?ACCENT:PILL_BG,color:cat===c?"#fff":ACCENT,border:"none",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",flexShrink:0,textTransform:"uppercase",letterSpacing:".05em",fontFamily:INTER}}>{c}</button>)}
          </div>

          {/* Counter + view toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              {!isPro&&<div style={{fontSize:12,color:MUTED,fontWeight:500,fontFamily:INTER}}>{tier.userCount} of {TIER_CONFIG.free.patternCap} free slots used{tier.userCount===0?" · add your first":tier.atCap?" · upgrade for unlimited":""}</div>}
            </div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setViewMode("grid")} style={{background:viewMode==="grid"?PILL_BG:"transparent",border:`1px solid ${viewMode==="grid"?"#EDE4F7":"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:MUTED,lineHeight:1}}>▦</button>
              <button onClick={()=>setViewMode("list")} style={{background:viewMode==="list"?PILL_BG:"transparent",border:`1px solid ${viewMode==="list"?"#EDE4F7":"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:MUTED,lineHeight:1}}>☰</button>
            </div>
          </div>

          {/* Grid / List */}
          {viewMode==="grid"?(
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(3,1fr)",gap:isMobile?14:20}}>
              {filteredAll.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.04} onClick={()=>openDetail(p)} onPark={onPark} onUnpark={onUnpark} onDelete={onDelete} onCoverChange={onCoverChange} onRename={onRename} pct={pct} catFallbackPhoto={catFallbackPhoto} Photo={Photo} Bar={Bar} Stars={Stars}/>)}
              {!isPro&&cat==="All"&&!search&&Array.from({length:emptySlots}).map((_,i)=><EmptySlotCard key={"slot_"+i} slotIndex={i} onClick={onAddPattern}/>)}
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filteredAll.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:MUTED,fontSize:13}}>No patterns yet. Add your first!</div>}
              {filteredAll.map((p,i)=>(
                <div key={p.id} className="fu" onClick={()=>openDetail(p)} style={{display:"flex",gap:12,background:CARD.bg,border:CARD.border,borderRadius:CARD.radius,padding:10,cursor:"pointer",animationDelay:i*.04+"s",boxShadow:CARD.shadow}}>
                  <div style={{width:56,height:56,borderRadius:10,overflow:"hidden",flexShrink:0,background:T.linen}}><Photo src={p.cover_image_url||p.photo||catFallbackPhoto(p.cat)} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:T.serif,fontSize:15,fontWeight:600,color:INK,lineHeight:1.3}}>{p.title}</div>
                    <div style={{fontSize:12,color:MUTED,marginTop:2}}>{p.cat&&p.cat.toLowerCase()!=="uncategorized"?p.cat:""}{pct(p)>0?" · "+pct(p)+"%":""}{p.isStarter?" · Free Starter":""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { PatternCard };
export default CollectionView;
