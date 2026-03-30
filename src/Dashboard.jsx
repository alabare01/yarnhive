import { useState, useRef, useEffect } from "react";
import { T, useBreakpoint } from "./theme.jsx";
import { PILL } from "./constants.js";

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

const PatternCard = ({p,onClick,onPark,onUnpark,onDelete,onCoverChange,onRename,delay=0,pct,catFallbackPhoto,Photo,Bar,Stars}) => {
  const done=pct(p);
  const [menuOpen,setMenuOpen]=useState(false);
  const [renaming,setRenaming]=useState(false);
  const isParked=p.status==="parked";
  const cardPhoto=p.cover_image_url||(PILL.includes(p.photo)?catFallbackPhoto(p.cat):p.photo)||catFallbackPhoto(p.cat);
  const isPlaceholder=!p.cover_image_url&&PILL.includes(p.photo);
  return (
    <div className="card fu" onClick={onClick} style={{background:"#FFFFFF",borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",animationDelay:delay+"s",position:"relative",boxShadow:T.shadow}}>
      {renaming&&<RenameModal pattern={p} onCancel={()=>setRenaming(false)} onSave={newTitle=>{setRenaming(false);onRename&&onRename(p,newTitle);}}/>}
      {!p.isStarter&&(onPark||onDelete)&&<div style={{position:"absolute",top:8,right:8,zIndex:5}}>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}} style={{background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)",border:"none",borderRadius:99,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>⋮</button>
        {menuOpen&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:32,background:T.modal,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(155,126,200,.12)",zIndex:10,minWidth:150,overflow:"hidden"}}>
          {onRename&&<div onClick={()=>{setMenuOpen(false);setRenaming(true);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Rename pattern</div>}
          {!p.isStarter&&onCoverChange&&<div onClick={()=>{setMenuOpen(false);onCoverChange(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Change cover image</div>}
          {isParked
            ?<div onClick={()=>{setMenuOpen(false);onUnpark&&onUnpark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Unpark</div>
            :<div onClick={()=>{setMenuOpen(false);onPark&&onPark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Park for later</div>
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

const ShelfCard = ({p,onClick,pct,catFallbackPhoto,Photo,Bar}) => {
  const v=pct(p);
  const cardPhoto=p.cover_image_url||p.photo||catFallbackPhoto(p.cat);
  return (
    <div onClick={onClick} style={{width:160,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,background:"#FFFFFF",cursor:"pointer",boxShadow:T.shadow,transition:"transform .16s,box-shadow .16s",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=T.shadowLg;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadow;}}>
      <div style={{height:100,position:"relative",background:T.linen,overflow:"hidden"}}><Photo src={cardPhoto} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/><div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={v} color={T.terra} h={3} bg="rgba(0,0,0,.2)"/></div></div>
      <div style={{padding:"9px 12px 11px"}}><div style={{fontFamily:T.serif,fontSize:13,color:T.ink,lineHeight:1.3,marginBottom:2}}>{p.title}</div><div style={{fontSize:11,color:T.terra,fontWeight:600}}>{v}% done</div></div>
    </div>
  );
};

const HScrollRow = ({children,itemCount}) => {
  const ref=useRef(null),[showHint,setShowHint]=useState(itemCount>2);
  useEffect(()=>{const el=ref.current;if(!el)return;const onScroll=()=>{if(el.scrollLeft>10)setShowHint(false);};el.addEventListener("scroll",onScroll,{passive:true});return()=>el.removeEventListener("scroll",onScroll);},[]);
  return (
    <div style={{position:"relative",overflow:"hidden"}}>
      <div ref={ref} className="h-scroll" style={{paddingLeft:18,paddingRight:18}}>{children}</div>
      {showHint&&<div className="mobile-swipe-hint" style={{position:"absolute",right:0,top:0,bottom:8,width:80,background:"linear-gradient(to left,rgba(255,255,255,.98) 0%,transparent 100%)",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:12}}><div style={{background:T.terraLt,borderRadius:9999,padding:"4px 10px",fontSize:11,color:T.terra,display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:12}}>←</span> swipe</div></div>}
    </div>
  );
};

const CAROUSEL_CARDS = [
  {id:"welcome",type:"image",src:"https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,w_400,h_200,g_center/v1774405608/x0f1g5ugglvlce5kq2kj.png",title:"Welcome to Wovely",sub:"Your crafting journey starts here"},
  {id:"community",type:"image",src:"https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,w_400,h_200,g_center/v1774405611/dpdkta0ii5q5zo2m7myq.png",title:"847 makers active",sub:"this week"},
  {id:"tip",type:"image",src:"https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,w_400,h_200,g_center/v1774405613/fjneuxzjdexijyerdit4.png",title:"Pro tip",sub:"Block finished pieces for a pro look"},
  {id:"seasonal",type:"image",src:"https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,w_400,h_200,g_center/v1774405616/emjhufj6ujhuwyhodr4z.png",title:"Spring patterns",sub:"Browse trending now"},
];

const HiveCarousel = () => {
  const [idx,setIdx]=useState(0);
  const{isMobile}=useBreakpoint();
  const [toast,setToast]=useState(false);
  const total=CAROUSEL_CARDS.length;
  const touchRef=useRef(null);

  useEffect(()=>{
    const t=setInterval(()=>setIdx(i=>(i+1)%total),5000);
    return ()=>clearInterval(t);
  },[total]);

  const handleClick=()=>{setToast(true);setTimeout(()=>setToast(false),2000);};
  const onTouchStart=(e)=>{touchRef.current=e.touches[0].clientX;};
  const onTouchEnd=(e)=>{if(touchRef.current===null)return;const diff=touchRef.current-e.changedTouches[0].clientX;if(Math.abs(diff)>50){if(diff>0)setIdx(i=>(i+1)%total);else setIdx(i=>(i-1+total)%total);}touchRef.current=null;};
  const cardW=isMobile?280:280;

  return (
    <div style={{padding:"16px 0 8px",position:"relative"}}>
      {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:900,background:T.ink,color:"#fff",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,.3)"}}>Coming soon — stay tuned! 🧶</div>}
      <div style={{position:"relative",overflow:"hidden",margin:"0 18px"}}>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{display:"flex",gap:12,transform:`translateX(-${idx*(cardW+12)}px)`,transition:"transform .35s ease"}}>
          {CAROUSEL_CARDS.map(c=>(
            <div key={c.id} onClick={handleClick} style={{width:cardW,minWidth:cardW,height:200,borderRadius:16,overflow:"hidden",position:"relative",cursor:"pointer",flexShrink:0}}>
              {c.type==="image"
                ?<><img src={c.src} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.6) 0%,rgba(0,0,0,.1) 100%)"}}/></>
                :<><div style={{position:"absolute",inset:0,background:c.bg}}/><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 30% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.2) 0%,transparent 100%)"}}/></>
              }
              <div style={{position:"relative",zIndex:1,padding:20,display:"flex",flexDirection:"column",justifyContent:"flex-end",height:"100%"}}>
                <div style={{color:"#fff",fontSize:16,fontWeight:700,lineHeight:1.3,textShadow:"0 1px 4px rgba(0,0,0,.4)"}}>{c.title}</div>
                <div style={{color:"rgba(255,255,255,.85)",fontSize:13,marginTop:4,lineHeight:1.3,textShadow:"0 1px 3px rgba(0,0,0,.3)"}}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
        {!isMobile&&<><button onClick={()=>setIdx(i=>(i-1+total)%total)} style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.9)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:T.ink,boxShadow:"0 2px 8px rgba(155,126,200,.15)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>‹</button>
        <button onClick={()=>setIdx(i=>(i+1)%total)} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.9)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:T.ink,boxShadow:"0 2px 8px rgba(155,126,200,.15)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>›</button></>}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:10}}>
        {CAROUSEL_CARDS.map((_,i)=><div key={i} onClick={()=>setIdx(i)} style={{width:idx===i?16:6,height:6,borderRadius:99,background:idx===i?T.terra:T.border,cursor:"pointer",transition:"all .2s"}}/>)}
      </div>
    </div>
  );
};

const SLOT_SVGS = [
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><circle cx="24" cy="24" r="14"/><path d="M18 18c3-3 9-3 12 0"/><path d="M14 24c0-2 2-6 10-6s10 4 10 6"/><path d="M24 10v4M24 34v4"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M20 8l-4 30"/><path d="M16 20c0-6 12-6 12 0s-12 6-12 0"/><circle cx="30" cy="14" r="3"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M18 10l12 14-12 14"/><path d="M30 10l-12 14 12 14"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M24 6l10 6v12l-10 6-10-6V12z"/><path d="M24 18v12"/><path d="M14 12l10 6 10-6"/></svg>`,
  `<svg viewBox="0 0 48 48" fill="none" stroke="#C4B5A0" stroke-width="1.5"><path d="M24 8l4 10h10l-8 6 3 10-9-7-9 7 3-10-8-6h10z"/></svg>`,
];

const EmptySlotCard = ({onClick,slotIndex=0}) => (
  <div onClick={onClick} style={{background:T.surface,borderRadius:16,border:`2px dashed ${T.border}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:220,transition:"border-color .2s, background .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.terra;e.currentTarget.style.background=T.terraLt;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.surface;}}>
    <div style={{width:48,height:48,marginBottom:10}} dangerouslySetInnerHTML={{__html:SLOT_SVGS[slotIndex%SLOT_SVGS.length]}}/>
    <div style={{fontSize:13,color:T.ink2}}>Add a pattern</div>
  </div>
);

const CollectionView = ({userPatterns,starterPatterns,cat,setCat,search,setSearch,openDetail,onAddPattern,isPro,tier,setView,onPark,onUnpark,onDelete,onCoverChange,onRename,pct,catFallbackPhoto,Photo,Bar,Stars,CATS,TIER_CONFIG}) => {
  const{isDesktop,isMobile}=useBreakpoint();
  const allPatterns = [...userPatterns,...starterPatterns];
  const visible=allPatterns.filter(p=>p.status!=="deleted");
  const starterPats=visible.filter(p=>p.isStarter);
  const addedPats=visible.filter(p=>!p.isStarter);
  const filteredAll=[...addedPats,...starterPats].filter(p=>(cat==="All"||p.cat===cat)&&(!search||p.title.toLowerCase().includes(search.toLowerCase())));
  const inProgress=visible.filter(p=>{const v=pct(p);return v>0&&v<100;});
  const [viewMode,setViewMode]=useState("grid");
  const pad=isDesktop?"0":"0 18px";
  const emptySlots=isPro?0:Math.max(0,TIER_CONFIG.free.patternCap-addedPats.length);
  return (
    <>
      <HiveCarousel/>
      {inProgress.length>0&&(
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"16px 0 18px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 "+(isDesktop?"0":"18px"),marginBottom:12}}>
            <div style={{fontSize:10,color:"#B0AEC4",textTransform:"uppercase",letterSpacing:".12em",fontWeight:700,marginBottom:12}}>Continue Working</div>
          </div>
          <HScrollRow itemCount={inProgress.length}>{inProgress.map(p=><ShelfCard key={p.id} p={p} onClick={()=>openDetail(p)} pct={pct} catFallbackPhoto={catFallbackPhoto} Photo={Photo} Bar={Bar}/>)}</HScrollRow>
        </div>
      )}
      <div style={{padding:isDesktop?"16px 0 10px":"16px 18px 10px"}}>
        <div style={{display:"flex",alignItems:"center",background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"10px 14px",gap:9}}>
          <span style={{color:T.ink3,fontSize:15}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your patterns…" style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}} onFocus={e=>e.currentTarget.parentNode.style.borderColor=T.terra} onBlur={e=>e.currentTarget.parentNode.style.borderColor=T.border}/>
        </div>
      </div>
      <div style={{display:"flex",gap:7,overflowX:"auto",padding:isDesktop?"0 0 16px":"0 18px 16px",WebkitOverflowScrolling:"touch"}}>
        {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?T.terra:T.terraLt,color:cat===c?"#fff":T.terra,border:"none",borderRadius:9999,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",flexShrink:0,textTransform:"uppercase",letterSpacing:".05em"}}>{c}</button>)}
      </div>
      {/* Counter + view toggle */}
      <div style={{padding:pad,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          {!isPro&&<div style={{fontSize:12,color:"#6B6B8A",fontWeight:500}}>{tier.userCount} of {TIER_CONFIG.free.patternCap} free slots used{tier.userCount===0?" · add your first":tier.atCap?" · upgrade for unlimited":""}</div>}
        </div>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setViewMode("grid")} style={{background:viewMode==="grid"?T.linen:"transparent",border:`1px solid ${viewMode==="grid"?T.border:"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:T.ink3,lineHeight:1}}>▦</button>
          <button onClick={()=>setViewMode("list")} style={{background:viewMode==="list"?T.linen:"transparent",border:`1px solid ${viewMode==="list"?T.border:"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:T.ink3,lineHeight:1}}>☰</button>
        </div>
      </div>
      {/* Unified grid */}
      {viewMode==="grid"?(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(3,1fr)",gap:isMobile?14:20,padding:isDesktop?"0 0 80px":"0 18px 120px"}}>
          {filteredAll.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.04} onClick={()=>openDetail(p)} onPark={onPark} onUnpark={onUnpark} onDelete={onDelete} onCoverChange={onCoverChange} onRename={onRename} pct={pct} catFallbackPhoto={catFallbackPhoto} Photo={Photo} Bar={Bar} Stars={Stars}/>)}
          {!isPro&&cat==="All"&&!search&&Array.from({length:emptySlots}).map((_,i)=><EmptySlotCard key={"slot_"+i} slotIndex={i} onClick={onAddPattern}/>)}
        </div>
      ):(
        <div style={{padding:isDesktop?"0 0 80px":"0 18px 120px",display:"flex",flexDirection:"column",gap:8}}>
          {filteredAll.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:T.ink3,fontSize:13}}>No patterns yet. Add your first!</div>}
          {filteredAll.map((p,i)=>(
            <div key={p.id} className="fu" onClick={()=>openDetail(p)} style={{display:"flex",gap:12,background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:16,padding:10,cursor:"pointer",animationDelay:i*.04+"s",boxShadow:T.shadow}}>
              <div style={{width:56,height:56,borderRadius:10,overflow:"hidden",flexShrink:0,background:T.linen}}><Photo src={p.cover_image_url||p.photo||catFallbackPhoto(p.cat)} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:T.serif,fontSize:15,fontWeight:600,color:"#2D2D4E",lineHeight:1.3}}>{p.title}</div>
                <div style={{fontSize:12,color:"#6B6B8A",marginTop:2}}>{p.cat&&p.cat.toLowerCase()!=="uncategorized"?p.cat:""}{pct(p)>0?" · "+pct(p)+"%":""}{p.isStarter?" · Free Starter":""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export { PatternCard };
export default CollectionView;
