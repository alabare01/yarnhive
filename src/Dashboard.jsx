import { useState, useRef, useEffect } from "react";
import { T, useBreakpoint } from "./theme.jsx";
import { PILL } from "./constants.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, getSession, supabaseAuth } from "./supabase.js";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const hoursSince = (dateStr) => dateStr ? (Date.now() - new Date(dateStr).getTime()) / 3600000 : Infinity;

// ─── RENAME MODAL (unchanged) ───────────────────────────────────────────────
const RenameModal = ({pattern,onSave,onCancel}) => {
  const [val,setVal]=useState(pattern.title||"");
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onCancel}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(3px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:"#fff",borderRadius:16,padding:"24px 22px 20px",width:"100%",maxWidth:360,boxShadow:"0 12px 40px rgba(0,0,0,.2)"}}>
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,fontWeight:700,color:"#2D2D4E",marginBottom:14}}>Rename pattern</div>
        <input value={val} onChange={e=>setVal(e.target.value)} autoFocus style={{width:"100%",padding:"10px 14px",border:"1.5px solid #EDE4F7",borderRadius:10,fontSize:14,fontFamily:"Inter,sans-serif",color:"#2D2D4E",outline:"none",boxSizing:"border-box",marginBottom:16}} onFocus={e=>e.target.style.borderColor="#9B7EC8"} onBlur={e=>e.target.style.borderColor="#EDE4F7"}/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{background:"none",border:`1px solid #EDE4F7`,borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:600,color:"#6B6B8A",cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave(val.trim())} disabled={!val.trim()} style={{background:val.trim()?"#9B7EC8":"#D5CBE8",border:"none",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:600,color:"#fff",cursor:val.trim()?"pointer":"not-allowed"}}>Save</button>
        </div>
      </div>
    </div>
  );
};

// ─── PATTERN CARD (updated visual tokens) ───────────────────────────────────
const CARD = { bg: "#FFFFFF", radius: 20, shadow: "0 6px 28px rgba(155,126,200,0.10)", border: "1px solid #EDE4F7" };

const PatternCard = ({p,onClick,onPark,onUnpark,onDelete,onCoverChange,onRename,delay=0,pct,catFallbackPhoto,Photo,Bar,Stars}) => {
  const done=pct(p);
  const [menuOpen,setMenuOpen]=useState(false);
  const [renaming,setRenaming]=useState(false);
  const isParked=p.status==="parked";
  const cardPhoto=p.cover_image_url||(PILL.includes(p.photo)?catFallbackPhoto(p.cat):p.photo)||catFallbackPhoto(p.cat);
  const isPlaceholder=!p.cover_image_url&&PILL.includes(p.photo);
  return (
    <div className="card fu" onClick={onClick} style={{background:CARD.bg,borderRadius:CARD.radius,overflow:"hidden",border:CARD.border,cursor:"pointer",animationDelay:delay+"s",position:"relative",boxShadow:CARD.shadow}}>
      {renaming&&<RenameModal pattern={p} onCancel={()=>setRenaming(false)} onSave={newTitle=>{setRenaming(false);onRename&&onRename(p,newTitle);}}/>}
      {!p.isStarter&&(onPark||onDelete)&&<div style={{position:"absolute",top:8,right:8,zIndex:5}}>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}} style={{background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)",border:"none",borderRadius:99,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>⋮</button>
        {menuOpen&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:32,background:T.modal,border:CARD.border,borderRadius:10,boxShadow:CARD.shadow,zIndex:10,minWidth:150,overflow:"hidden"}}>
          {onRename&&<div onClick={()=>{setMenuOpen(false);setRenaming(true);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid #EDE4F7`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Rename pattern</div>}
          {!p.isStarter&&onCoverChange&&<div onClick={()=>{setMenuOpen(false);onCoverChange(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid #EDE4F7`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Change cover image</div>}
          {isParked
            ?<div onClick={()=>{setMenuOpen(false);onUnpark&&onUnpark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid #EDE4F7`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Unpark</div>
            :<div onClick={()=>{setMenuOpen(false);onPark&&onPark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid #EDE4F7`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Park for later</div>
          }
          <div onClick={()=>{setMenuOpen(false);onDelete&&onDelete(p);}} style={{padding:"10px 14px",fontSize:13,color:"#C05A5A",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Delete pattern</div>
        </div>}
      </div>}
      <div style={{position:"relative",aspectRatio:"1",overflow:"hidden",background:T.linen}}>
        <Photo src={cardPhoto} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.5) 0%,transparent 55%)"}}/>
        {isParked?<div style={{position:"absolute",top:10,left:10,background:"rgba(92,79,68,.8)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Parked</div>
        :p.isStarter?<div style={{position:"absolute",top:10,left:10,background:"rgba(184,144,44,.9)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Free Starter</div>
        :done===100?<div style={{position:"absolute",top:10,right:10,background:T.sage,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99,letterSpacing:".07em"}}>DONE</div>
        :done>0&&done<100?<><div style={{position:"absolute",top:10,right:10,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{done}%</div><div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={done} color="rgba(255,255,255,.8)" h={3} bg="transparent"/></div></>
        :null}
        {!isParked&&!p.isStarter&&done===0&&!p.started&&p.rows&&p.rows.length>0&&<div style={{position:"absolute",top:10,right:10,background:"rgba(92,122,94,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Ready to build</div>}
        {!p.isStarter&&p.snapConfidence&&<div style={{position:"absolute",top:10,left:10,background:"rgba(155,126,200,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99}}>✨ {p.snapConfidence}%</div>}
        {isPlaceholder&&!p.isStarter&&onCoverChange&&<button onClick={e=>{e.stopPropagation();onCoverChange(p);}} style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",background:"rgba(255,255,255,.15)",backdropFilter:"blur(4px)",border:`1.5px solid ${T.terra}`,borderRadius:10,padding:"6px 14px",fontSize:11,fontWeight:600,color:"#fff",cursor:"pointer",whiteSpace:"nowrap"}}>Set cover image</button>}
      </div>
      <div style={{padding:"12px 14px 16px"}}>
        {p.cat&&p.cat.toLowerCase()!=="uncategorized"&&<div style={{fontSize:12,color:T.ink2,textTransform:"uppercase",letterSpacing:".08em",marginBottom:3}}>{p.cat}</div>}
        <div style={{fontFamily:T.serif,fontSize:15,fontWeight:600,color:"#2D2D4E",lineHeight:1.3,marginBottom:7,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",whiteSpace:"normal"}}>{p.title}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Stars val={p.rating} ro/><span style={{fontSize:12,color:"#6B6B8A"}}>{p.source}</span></div>
        {p.isStarter&&<div style={{fontSize:12,color:"#6B6B8A",opacity:.6,marginTop:6,fontStyle:"italic"}}>A gift from Wovely — yours to keep</div>}
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
  <div onClick={onClick} style={{background:T.surface,borderRadius:CARD.radius,border:`2px dashed #EDE4F7`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:220,transition:"border-color .2s, background .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.terra;e.currentTarget.style.background=T.terraLt;}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#EDE4F7";e.currentTarget.style.background=T.surface;}}>
    <div style={{width:48,height:48,marginBottom:10}} dangerouslySetInnerHTML={{__html:SLOT_SVGS[slotIndex%SLOT_SVGS.length]}}/>
    <div style={{fontSize:13,color:T.ink2}}>Add a pattern</div>
  </div>
);

// ─── ZONE A: BEV CORNER ─────────────────────────────────────────────────────
const BevCorner = ({ patterns, isMobile }) => {
  const inProgressPatterns = patterns.filter(p => p.status === "in_progress" || p.started);
  const mostRecent = [...inProgressPatterns].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];

  let message;
  if (patterns.length === 0) {
    message = "Your craft room is empty. Let's hang something on the walls. 🧶";
  } else if (inProgressPatterns.length > 0 && mostRecent && hoursSince(mostRecent.updated_at) > 72) {
    message = `Psst… "${mostRecent.title}" is still waiting for you. You okay? 👀`;
  } else if (inProgressPatterns.length > 0 && mostRecent && hoursSince(mostRecent.updated_at) < 2) {
    message = "Look at you go. Bev's genuinely impressed. 💜";
  } else if (new Date().getHours() >= 18 && new Date().getHours() <= 22) {
    message = "Evening craft session? Bev approves. 🌙";
  } else {
    message = `Hey! You've got ${inProgressPatterns.length} pattern${inProgressPatterns.length !== 1 ? "s" : ""} in progress. Bev's watching. 🐍`;
  }

  return (
    <div style={{
      background: CARD.bg, borderRadius: CARD.radius, boxShadow: CARD.shadow, border: CARD.border,
      borderLeft: "4px solid #9B7EC8", display: "flex", alignItems: "center", gap: 16,
      padding: "16px 20px", marginBottom: 24,
    }}>
      <img src="/bev_neutral.png" alt="Bev" style={{
        width: isMobile ? 56 : 72, height: "auto", flexShrink: 0,
        filter: "drop-shadow(0 4px 12px rgba(155,126,200,0.25))",
      }} />
      <div style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#2D2D4E", lineHeight: 1.5 }}>{message}</div>
    </div>
  );
};

// ─── ZONE B: ON THE HOOK ────────────────────────────────────────────────────
const OnTheHook = ({ inProgress, openDetail, onAddPattern, pct, catFallbackPhoto, Photo, Bar, isMobile }) => {
  if (inProgress.length === 0) {
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#2D3A7C", marginBottom: 16 }}>On the Hook</div>
        <div style={{
          border: "2px dashed #EDE4F7", borderRadius: CARD.radius, padding: 32, textAlign: "center",
          background: CARD.bg, boxShadow: CARD.shadow,
        }}>
          <div style={{ fontSize: 14, color: "#6B6B8A", marginBottom: 16 }}>Nothing on the hook yet — ready to start something?</div>
          <button onClick={onAddPattern} style={{
            background: "#9B7EC8", color: "#fff", border: "none", borderRadius: 12,
            padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Import a Pattern</button>
        </div>
      </div>
    );
  }

  const hero = inProgress[0];
  const rest = inProgress.slice(1);
  const heroPhoto = hero.cover_image_url || hero.photo || catFallbackPhoto(hero.cat);

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#2D3A7C", marginBottom: 16 }}>On the Hook</div>

      {/* Hero card */}
      <div onClick={() => openDetail(hero)} style={{
        background: CARD.bg, borderRadius: CARD.radius, boxShadow: CARD.shadow, border: CARD.border,
        overflow: "hidden", cursor: "pointer", marginBottom: rest.length > 0 ? 16 : 0,
      }}>
        <div style={{
          height: isMobile ? 160 : 200, overflow: "hidden", borderRadius: `${CARD.radius}px ${CARD.radius}px 0 0`,
          background: heroPhoto ? undefined : "linear-gradient(135deg, #EDE4F7 0%, #F8F6FF 100%)",
        }}>
          {heroPhoto && <Photo src={heroPhoto} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: "#2D3A7C", marginBottom: 6 }}>{hero.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 4, background: "#EDE4F7", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: pct(hero) + "%", height: "100%", background: "#9B7EC8", borderRadius: 99, transition: "width .3s" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#9B7EC8" }}>{pct(hero)}%</span>
          </div>
          {hero.difficulty && <span style={{ background: "#F3EFF8", color: "#9B7EC8", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 10 }}>{hero.difficulty}</span>}
          <button style={{
            background: "#9B7EC8", color: "#fff", border: "none", borderRadius: 12,
            padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 16,
          }}>Pick up where you left off →</button>
        </div>
      </div>

      {/* Scroll row for remaining */}
      {rest.length > 0 && (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {rest.map(p => {
            const photo = p.cover_image_url || p.photo || catFallbackPhoto(p.cat);
            return (
              <div key={p.id} onClick={() => openDetail(p)} style={{
                flexShrink: 0, width: 160, background: CARD.bg, borderRadius: CARD.radius,
                boxShadow: CARD.shadow, border: CARD.border, overflow: "hidden", cursor: "pointer",
              }}>
                <div style={{
                  height: 100, overflow: "hidden",
                  background: photo ? undefined : "linear-gradient(135deg, #EDE4F7 0%, #F8F6FF 100%)",
                }}>
                  {photo && <Photo src={photo} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ padding: 8 }}>
                  <div style={{
                    fontSize: 13, fontFamily: "Inter,sans-serif", color: "#2D2D4E", lineHeight: 1.3,
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>{p.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── ZONE D: BRAG SHELF ─────────────────────────────────────────────────────
const BragShelf = ({ patterns, pct }) => {
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

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          flex: 1, background: CARD.bg, borderRadius: CARD.radius, boxShadow: CARD.shadow,
          border: CARD.border, padding: 20, textAlign: "center",
        }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#9B7EC8", fontWeight: 700 }}>
            {s.value === null ? "—" : s.value}
          </div>
          <div style={{
            fontFamily: "Inter,sans-serif", fontSize: 11, color: "#6B6B8A",
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
  const inProgress=visible.filter(p=>{const v=pct(p);return v>0&&v<100;});
  const [viewMode,setViewMode]=useState("grid");
  const pad=isDesktop?"0 0":"0 16px";
  const emptySlots=isPro?0:Math.max(0,TIER_CONFIG.free.patternCap-addedPats.length);

  return (
    <div style={{ position: "relative", minHeight: "100%", background: "linear-gradient(150deg, #FAF8F5 0%, #F3EFF8 60%, #F8F6FF 100%)" }}>
      {/* Decorative background overlays */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 340, height: 340, overflow: "hidden", opacity: isMobile ? 0.05 : 0.09, pointerEvents: "none", zIndex: 0 }}>
        <img src="/wovely_landing_bg_v1.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" }} />
      </div>
      {!isMobile && <div style={{ position: "fixed", bottom: 0, right: 0, width: 300, height: 300, overflow: "hidden", opacity: 0.07, pointerEvents: "none", zIndex: 0 }}>
        <img src="/wovely_landing_bg_v1.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "bottom right" }} />
      </div>}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "16px 16px 120px" : "24px 0 80px" }}>

        {/* ZONE A — Bev Corner */}
        <BevCorner patterns={visible} isMobile={isMobile} />

        {/* ZONE B — On the Hook */}
        <OnTheHook
          inProgress={inProgress}
          openDetail={openDetail}
          onAddPattern={onAddPattern}
          pct={pct}
          catFallbackPhoto={catFallbackPhoto}
          Photo={Photo}
          Bar={Bar}
          isMobile={isMobile}
        />

        {/* ZONE C — Your Library */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#2D3A7C", marginBottom: 16 }}>Your Library</div>

          {/* Search */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", background: CARD.bg, border: CARD.border, borderRadius: 12, padding: "10px 14px", gap: 9 }}>
              <span style={{ color: "#6B6B8A", fontSize: 15 }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your patterns…" style={{ border: "none", background: "transparent", flex: 1, fontSize: 14, color: "#2D2D4E", outline: "none", fontFamily: "Inter,sans-serif" }} />
            </div>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 16, WebkitOverflowScrolling: "touch" }}>
            {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?"#9B7EC8":"#F3EFF8",color:cat===c?"#fff":"#9B7EC8",border:"none",borderRadius:9999,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",flexShrink:0,textTransform:"uppercase",letterSpacing:".05em"}}>{c}</button>)}
          </div>

          {/* Counter + view toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              {!isPro&&<div style={{fontSize:12,color:"#6B6B8A",fontWeight:500}}>{tier.userCount} of {TIER_CONFIG.free.patternCap} free slots used{tier.userCount===0?" · add your first":tier.atCap?" · upgrade for unlimited":""}</div>}
            </div>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setViewMode("grid")} style={{background:viewMode==="grid"?"#F3EFF8":"transparent",border:`1px solid ${viewMode==="grid"?"#EDE4F7":"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:"#6B6B8A",lineHeight:1}}>▦</button>
              <button onClick={()=>setViewMode("list")} style={{background:viewMode==="list"?"#F3EFF8":"transparent",border:`1px solid ${viewMode==="list"?"#EDE4F7":"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:"#6B6B8A",lineHeight:1}}>☰</button>
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
              {filteredAll.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"#6B6B8A",fontSize:13}}>No patterns yet. Add your first!</div>}
              {filteredAll.map((p,i)=>(
                <div key={p.id} className="fu" onClick={()=>openDetail(p)} style={{display:"flex",gap:12,background:CARD.bg,border:CARD.border,borderRadius:CARD.radius,padding:10,cursor:"pointer",animationDelay:i*.04+"s",boxShadow:CARD.shadow}}>
                  <div style={{width:56,height:56,borderRadius:10,overflow:"hidden",flexShrink:0,background:T.linen}}><Photo src={p.cover_image_url||p.photo||catFallbackPhoto(p.cat)} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:T.serif,fontSize:15,fontWeight:600,color:"#2D2D4E",lineHeight:1.3}}>{p.title}</div>
                    <div style={{fontSize:12,color:"#6B6B8A",marginTop:2}}>{p.cat&&p.cat.toLowerCase()!=="uncategorized"?p.cat:""}{pct(p)>0?" · "+pct(p)+"%":""}{p.isStarter?" · Free Starter":""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ZONE D — Brag Shelf */}
        <BragShelf patterns={visible} pct={pct} />
      </div>
    </div>
  );
};

export { PatternCard };
export default CollectionView;
