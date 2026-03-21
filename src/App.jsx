import { useState, useRef, useEffect, useCallback } from "react";

if (typeof document !== "undefined" && !document.getElementById("sb-font")) {
  const l = document.createElement("link");
  l.id = "sb-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap";
  document.head.appendChild(l);
}

const PHOTOS = {
  hero:     "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877266/Gemini_Generated_Image_u44qfru44qfru44q_2_rsk1rn.png",
  world:    "https://res.cloudinary.com/dmaupzhcx/image/upload/v1774116735/yarnhive_bg_v2.jpg",
  blanket:  "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877265/Gemini_Generated_Image_u44qfru44qfru44q_fst0gr.png",
  cardigan: "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877263/Gemini_Generated_Image_u44qfru44qfru44q_3_sax38h.png",
  granny:   "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877260/Gemini_Generated_Image_u44qfru44qfru44q_6_yvirvu.png",
  tote:     "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877260/Gemini_Generated_Image_u44qfru44qfru44q_7_xmykae.png",
  pillow:   "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877260/Gemini_Generated_Image_u44qfru44qfru44q_5_wypdoe.png",
  market:   "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877259/Gemini_Generated_Image_u44qfru44qfru44q_4_arw40x.png",
  auth:     "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877259/Gemini_Generated_Image_u44qfru44qfru44q_8_y2tkwe.png",
};
const PILL = [PHOTOS.blanket, PHOTOS.cardigan, PHOTOS.granny, PHOTOS.tote, PHOTOS.pillow, PHOTOS.market];

const APP_VERSION = "v1.3.8 — Mar 21 2026";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const TIER_CONFIG = {
  free: { patternCap: 5, priceLabel: "Free" },
  pro:  { patternCap: Infinity, priceMonthly: 9.99, priceAnnual: 74.99, priceLabel: "$9.99/mo", priceAnnualLabel: "$74.99/yr" },
};

const useTier = (isPro, patternCount) => {
  const atCap  = !isPro && patternCount >= TIER_CONFIG.free.patternCap;
  const canAdd = isPro  || patternCount  < TIER_CONFIG.free.patternCap;
  const hasFeature = () => canAdd;
  return { isPro, atCap, canAdd, hasFeature };
};

const T = {
  bg:"#FAF7F3", surface:"#FFFFFF", linen:"#F4EDE3", ink:"#1C1714", ink2:"#5C4F44", ink3:"#9E8E82",
  border:"#EAE0D5", terra:"#B85A3C", terraLt:"#F5E2DA", sage:"#5C7A5E", sageLt:"#D8EAD8", gold:"#B8902C",
  serif:'"Playfair Display", Georgia, serif', sans:'"DM Sans", -apple-system, sans-serif',
};

const useBreakpoint = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1100, isDesktop: w >= 1100, width: w };
};

const CSS = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #EAE0D5; border-radius: 99px; }
    body { background: #FAF7F3; }
    input, textarea, button, select { font-family: "DM Sans", -apple-system, sans-serif; }
    @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideUp   { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideInLeft  { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes slideOutLeft { from{transform:translateX(0);opacity:1} to{transform:translateX(-100%);opacity:0} }
    @keyframes dimIn  { from{opacity:0} to{opacity:1} }
    @keyframes dimOut { from{opacity:1} to{opacity:0} }
    @keyframes fabPulse { 0%,100%{box-shadow:0 6px 24px rgba(184,90,60,.45)} 50%{box-shadow:0 6px 32px rgba(184,90,60,.7)} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes progressShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes confidencePop { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
    .fu { animation:fadeUp .4s ease both; }
    .su { animation:slideUp .35s cubic-bezier(.22,.68,0,1.05) both; }
    .nav-open  { animation:slideInLeft  .3s cubic-bezier(.22,.68,0,1.05) both; }
    .nav-close { animation:slideOutLeft .24s ease both; }
    .dim-in  { animation:dimIn  .25s ease both; }
    .dim-out { animation:dimOut .2s  ease both; }
    .spinner { animation:spin .8s linear infinite; }
    .conf-pop { animation:confidencePop .5s cubic-bezier(.22,.68,0,1.05) both; }
    .card { transition:transform .18s,box-shadow .18s; box-shadow:0 2px 10px rgba(28,23,20,.06); }
    .card:hover { transform:translateY(-4px) !important; box-shadow:0 16px 36px rgba(28,23,20,.14) !important; }
    .tap { transition:opacity .15s; cursor:pointer; }
    .tap:hover { opacity:.85; }
    .method-card { transition:all .15s; }
    .method-card:hover { background:#F5E2DA !important; border-color:#B85A3C !important; transform:translateY(-1px); }
    .progress-bar-fill { background:linear-gradient(90deg,#B85A3C 0%,#C97A5E 50%,#B85A3C 100%); background-size:200% 100%; animation:progressShimmer 1.5s ease infinite; }
    .wireframe-container canvas { touch-action: none; }
    .h-scroll { display:flex; gap:12px; overflow-x:auto; -webkit-overflow-scrolling:touch; scroll-snap-type:x mandatory; padding-bottom:8px; scrollbar-width:none; }
    .h-scroll::-webkit-scrollbar { display:none; }
    .h-scroll > * { scroll-snap-align:start; flex-shrink:0; }
    .pattern-grid { display:grid; gap:16px; grid-template-columns:1fr 1fr; }
    @media(min-width:900px)  { .pattern-grid { grid-template-columns:1fr 1fr 1fr; } }
    @media(min-width:1300px) { .pattern-grid { grid-template-columns:1fr 1fr 1fr 1fr; } }
    @media(min-width:768px) {
      .mobile-swipe-hint { display:none !important; }
      .h-scroll { display:grid !important; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)) !important; overflow-x:visible !important; scroll-snap-type:none !important; }
      .h-scroll > * { flex-shrink:unset !important; }
    }
    input:focus, textarea:focus, select:focus { outline:none; }
    @media(hover:hover) { .nav-item:hover { background:#F4EDE3 !important; } .site-row:hover { background:#F4EDE3 !important; } }
  `}</style>
);

const pct = p => p.rows.length ? Math.round(p.rows.filter(r=>r.done).length/p.rows.length*100) : 0;
const estYards = p => {
  if (p.yardage > 0) return p.yardage;
  return (p.materials||[]).reduce((s,m) => {
    if (m.yardage > 0) return s + m.yardage;
    const t = ((m.name||"")+" "+(m.amount||"")).toLowerCase();
    const b = t.match(/(\d+)\s*ball/); const sk = t.match(/(\d+)\s*skein/);
    if (b) return s + parseInt(b[1])*200; if (sk) return s + parseInt(sk[1])*200;
    return s;
  }, 0);
};
const estSkeins = p => { const y=estYards(p); return y>0?Math.ceil(y/200):0; };

const Bar = ({val,color=T.terra,h=3,bg=T.border,animated=false}) => (
  <div style={{background:bg,borderRadius:99,height:h,overflow:"hidden"}}>
    <div className={animated?"progress-bar-fill":""} style={{width:`${val}%`,height:h,background:animated?"":color,borderRadius:99,transition:"width .4s ease"}}/>
  </div>
);
const Stars = ({val=0,onChange,ro}) => (
  <div style={{display:"flex",gap:2}}>
    {[1,2,3,4,5].map(i=><span key={i} onClick={()=>!ro&&onChange?.(i)} style={{fontSize:12,cursor:ro?"default":"pointer",color:i<=val?T.gold:T.border}}>★</span>)}
  </div>
);
const Photo = ({src,alt,style:sx}) => {
  const [err,setErr]=useState(false);
  if(err) return <div style={{...sx,background:"linear-gradient(145deg,#C4855A,#6B3A22)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32,opacity:.4}}>🧶</span></div>;
  return <img src={src} alt={alt} onError={()=>setErr(true)} style={{...sx,objectFit:"cover",display:"block"}}/>;
};
const Btn = ({children,onClick,variant="primary",full=true,small=false,disabled=false,style:sx={}}) => {
  const styles = {
    primary:{background:T.terra,color:"#fff",border:"none"},
    secondary:{background:T.linen,color:T.ink,border:`1px solid ${T.border}`},
    ghost:{background:"none",color:T.ink3,border:"none"},
    sage:{background:T.sage,color:"#fff",border:"none"},
    danger:{background:"#C0392B",color:"#fff",border:"none"},
    gold:{background:"linear-gradient(135deg,#C9A84C,#8B6914)",color:"#fff",border:"none"},
  };
  return <button onClick={onClick} disabled={disabled} className="tap" style={{...styles[variant],borderRadius:12,padding:small?"8px 16px":"14px 20px",fontSize:small?13:15,fontWeight:600,cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",opacity:disabled?.6:1,boxShadow:variant==="primary"?"0 4px 16px rgba(184,90,60,.3)":variant==="sage"?"0 4px 16px rgba(92,122,94,.3)":variant==="gold"?"0 4px 16px rgba(184,144,44,.35)":"none",...sx}}>{children}</button>;
};
const Field = ({label,value,onChange,type="text",placeholder,rows:r}) => (
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>{label}</div>}
    {r?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={r} style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14,resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
      :<input value={value} onChange={onChange} type={type} placeholder={placeholder} style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>}
  </div>
);

const SEED_PATTERNS = [
  {id:1,photo:PHOTOS.blanket,title:"Autumn Ridge Throw",source:"ravelry.com",cat:"Blankets",hook:"6.0mm",weight:"Bulky",rating:5,yardage:1200,skeins:4,skeinYards:300,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},notes:"Caron Simply Soft in Autumn Maize, Burgundy, and Sage. Block lightly.",materials:[{id:1,name:"Bulky yarn — Autumn Maize",amount:"300g",yardage:300},{id:2,name:"Bulky yarn — Burgundy",amount:"300g",yardage:300},{id:3,name:"Bulky yarn — Sage",amount:"300g",yardage:300},{id:4,name:"6.0mm crochet hook",amount:"1"},{id:5,name:"Yarn needle",amount:"1"}],rows:[{id:1,text:"Foundation chain: Ch 120 loosely",done:true,note:""},{id:2,text:"Row 1: Sc in 2nd ch from hook and across (119 sts)",done:true,note:""},{id:3,text:"Rows 2–15: Ch 1 turn, sc across — Autumn Maize",done:true,note:""},{id:4,text:"Row 16: Join Burgundy, sc across",done:false,note:""},{id:5,text:"Rows 17–30: Sc across, Burgundy section",done:false,note:""},{id:6,text:"Row 31: Join Sage, sc across",done:false,note:""},{id:7,text:"Rows 32–45: Sc across, Sage section",done:false,note:""},{id:8,text:"Repeat 3-color block sequence twice more",done:false,note:""},{id:9,text:"Border Rnd 1: Sc evenly around, 3 sc in corners",done:false,note:""},{id:10,text:"Border Rnd 2: Reverse sc — fasten off",done:false,note:""}]},
  {id:2,photo:PHOTOS.cardigan,title:"Coastal Shell Cardigan",source:"lovecrafts.com",cat:"Wearables",hook:"4.5mm",weight:"DK",rating:4,yardage:900,skeins:5,skeinYards:180,gauge:{stitches:18,rows:20,size:4},dimensions:{width:20,height:26},notes:"Size M. Add 2 rows per size up. Mark raglan seams carefully.",materials:[{id:1,name:"DK cotton yarn — driftwood",amount:"500g",yardage:500},{id:2,name:"4.5mm crochet hook",amount:"1"},{id:3,name:"Stitch markers",amount:"8"},{id:4,name:"Shell buttons 15mm",amount:"5"}],rows:[{id:1,text:"Back panel: Ch 82, shell stitch 40 rows",done:true,note:""},{id:2,text:"Front panels x2: Ch 42 each, match back",done:true,note:""},{id:3,text:"Sleeves x2: Inc 1 st each side every 6th row",done:false,note:""},{id:4,text:"Join shoulders with slip stitch seam",done:false,note:""},{id:5,text:"Set in sleeves, seam underarms",done:false,note:""},{id:6,text:"Neckline: 3 rounds sc, picot edge",done:false,note:""},{id:7,text:"Button band along front opening",done:false,note:""},{id:8,text:"Sew buttons, weave ends, block flat",done:false,note:""}]},
  {id:3,photo:PHOTOS.granny,title:"Meadow Granny Squares",source:"sarahmaker.com",cat:"Blankets",hook:"4.0mm",weight:"Worsted",rating:5,yardage:1500,skeins:10,skeinYards:150,gauge:{stitches:16,rows:18,size:4},dimensions:{width:48,height:60},notes:"48 squares in 12 color combinations. Flat join creates beautiful ridge.",materials:[{id:1,name:"Worsted yarn — 10 assorted colors",amount:"50g each",yardage:150},{id:2,name:"4.0mm hook",amount:"1"},{id:3,name:"Yarn needle",amount:"1"}],rows:[{id:1,text:"Magic ring, [ch 3, 2 dc, ch 2] x4, sl st",done:true,note:""},{id:2,text:"Rnd 2: Corner clusters + ch-1 side spaces",done:true,note:""},{id:3,text:"Rnd 3: Larger corners, 2 side groups",done:true,note:""},{id:4,text:"Complete all 48 squares — 12 color combos",done:false,note:""},{id:5,text:"Lay out 6x8 grid, photograph arrangement",done:false,note:""},{id:6,text:"Join squares into rows — sc flat join",done:false,note:""},{id:7,text:"Join all rows together",done:false,note:""},{id:8,text:"Outer border: 3 rounds, picot finish",done:false,note:""}]},
];

const SEED_STASH = [
  {id:1,brand:"Lion Brand",name:"Pound of Love",weight:"Worsted",color:"Antique White",colorCode:"#F5F0E8",yardage:1020,skeins:2,used:0},
  {id:2,brand:"Caron",name:"Simply Soft",weight:"Worsted",color:"Autumn Maize",colorCode:"#D4A44C",yardage:315,skeins:3,used:0},
  {id:3,brand:"WeCrochet",name:"Swish DK",weight:"DK",color:"Cobblestone Heather",colorCode:"#8A8078",yardage:123,skeins:4,used:0},
  {id:4,brand:"Paintbox",name:"Simply DK",weight:"DK",color:"Pillar Red",colorCode:"#C0392B",yardage:137,skeins:2,used:0},
];

const CATS = ["All","Blankets","Wearables","Accessories","Amigurumi","Home Décor"];

const normalizeRole = (role,primitive) => {
  if(!role) return "unknown";
  const r=role.toLowerCase().trim();
  const KNOWN=["body","head","arm","leg","ear","tail","nose","eye","base"];
  if(KNOWN.includes(r)) return r;
  if(["hat","cap","hood","brim","top"].includes(r)) return "hat";
  if(["beard","moustache","mustache","mouth","snout","beak","tuft","pom"].includes(r)) return "beard";
  if(["wing","fin","flipper"].includes(r)) return "wing";
  if(["torso","chest","trunk","midsection"].includes(r)) return "body";
  if(["hand","paw","foot","hoof","claw"].includes(r)) return "arm";
  if(["antenna","horn","spike"].includes(r)) return "horn";
  if(["flower","bow","ribbon","accessory","button","pompom"].includes(r)) return "accessory";
  if(r==="detail"||r==="unknown") {
    if(primitive==="cone"||primitive==="tapered_cylinder") return "hat";
    if(primitive==="oval") return "beard";
    if(primitive==="flat_disc"||primitive==="flat_circle") return "base";
    if(primitive==="sphere") return "beard";
    return "detail";
  }
  return "detail";
};

// Positions are relative to body center (y=0). Positive y = up, negative y = down.
// zOff = forward offset so face parts protrude naturally from the front.
// mirror:true = component is duplicated and placed symmetrically on both sides (x and -x).
const SLOT_POSITIONS = {
  base:     {y:-1.9, x:0,    zOff:0,    mirror:false},  // flat disc at very bottom
  body:     {y: 0.0, x:0,    zOff:0,    mirror:false},  // dominant center mass
  leg:      {y:-1.2, x:0.55, zOff:0,    mirror:true },  // below body, spread out
  arm:      {y: 0.1, x:1.15, zOff:0.1,  mirror:true },  // sides of body, slight forward lean
  tail:     {y:-0.5, x:0,    zOff:-0.9, mirror:false},  // behind body
  head:     {y: 1.55,x:0,    zOff:0,    mirror:false},  // directly above body
  ear:      {y: 1.9, x:0.65, zOff:0,    mirror:true },  // sides of head
  hat:      {y: 2.85,x:0,    zOff:0,    mirror:false},  // on top of head
  horn:     {y: 2.55,x:0.28, zOff:0.1,  mirror:true },  // front-top of head
  eye:      {y: 1.65,x:0.32, zOff:0.65, mirror:true },  // front face, symmetric
  nose:     {y: 1.45,x:0,    zOff:0.8,  mirror:false},  // front center face, lower than eyes
  beard:    {y: 1.1, x:0,    zOff:0.55, mirror:false},  // below nose, protrudes forward
  wing:     {y: 0.5, x:1.4,  zOff:-0.2, mirror:true },  // back-sides of body
  accessory:{y: 2.0, x:0,    zOff:0.3,  mirror:false},  // front of head/body area
  detail:   {y: 0.6, x:0,    zOff:0.4,  mirror:false},  // generic fallback, front-center
};

const ROLE_COLORS = {
  body:0xB85A3C,head:0xC97A5E,hat:0xA04828,beard:0xE8D4B8,nose:0xC07050,eye:0x3A2A20,
  ear:0xE8B49A,arm:0xD4956E,leg:0xD4956E,tail:0xD4B89A,base:0x9A7060,horn:0xD4956E,
  wing:0xC8A878,accessory:0xB8902C,detail:0xD4A870,unknown:0xB89A80,
};

const WireframeViewer = ({components,labeled=false,height=220,fillContainer=false}) => {
  const mountRef=useRef(null),cameraRef=useRef(null),groupRef=useRef(null);
  const isDragging=useRef(false),lastMouse=useRef({x:0,y:0}),rotRef=useRef({x:0.25,y:0.4});
  const zoomRef=useRef(11.0),pinchRef=useRef(null);
  const [threeLoaded,setThreeLoaded]=useState(false),[loadError,setLoadError]=useState(false);
  useEffect(()=>{
    if(window.THREE){setThreeLoaded(true);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload=()=>setThreeLoaded(true); s.onerror=()=>setLoadError(true);
    document.head.appendChild(s);
  },[]);
  const buildGeo=useCallback((THREE,primitive,s)=>{
    const r=Math.max(0.15,s);
    switch(primitive){
      case "sphere": return new THREE.SphereGeometry(r,16,12);
      case "oval": { const g=new THREE.SphereGeometry(r,16,12); g.scale(1,1.5,1); return g; }
      case "flat_disc": return new THREE.CylinderGeometry(r,r,r*0.18,16);
      case "cylinder": return new THREE.CylinderGeometry(r*0.42,r*0.42,r*1.5,14);
      case "tapered_cylinder": return new THREE.CylinderGeometry(r*0.18,r*0.52,r*1.6,14);
      case "cone": return new THREE.ConeGeometry(r*0.58,r*1.8,16);
      case "flat_square": return new THREE.BoxGeometry(r*1.3,r*0.14,r*1.3);
      case "flat_circle": return new THREE.CylinderGeometry(r,r,r*0.1,20);
      default: return new THREE.SphereGeometry(r*0.5,10,8);
    }
  },[]);
  useEffect(()=>{
    if(!threeLoaded||!mountRef.current||!components?.length) return;
    const THREE=window.THREE, el=mountRef.current;
    let initialized=false,animFrame,renderer;
    const init=(W,H)=>{
      if(initialized||W<10||H<10) return; initialized=true;
      const scene=new THREE.Scene(); scene.background=new THREE.Color(0xFAF7F3);
      const camera=new THREE.PerspectiveCamera(40,W/H,0.1,100);
      camera.position.set(0,0,zoomRef.current); cameraRef.current=camera;
      renderer=new THREE.WebGLRenderer({antialias:true});
      renderer.setSize(W,H); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
      el.innerHTML=""; el.appendChild(renderer.domElement);
      scene.add(new THREE.AmbientLight(0xfff5ee,0.75));
      const d=new THREE.DirectionalLight(0xffffff,0.85); d.position.set(3,5,5); scene.add(d);
      const f=new THREE.DirectionalLight(0xffe8d8,0.35); f.position.set(-3,-2,-3); scene.add(f);
      const group=new THREE.Group(); groupRef.current=group;
      const slotCount={};
      components.forEach(comp=>{
        const rawRole=comp.role||"unknown", primitive=comp.primitive_type||"sphere";
        const ratio=Math.max(0.15,comp.size_ratio_to_dominant||0.5), count=Math.min(comp.count||1,4);
        const slot=normalizeRole(rawRole,primitive), pos=SLOT_POSITIONS[slot]||SLOT_POSITIONS.detail;
        const color=ROLE_COLORS[slot]||ROLE_COLORS.unknown;
        const stackIdx=slotCount[slot]||0; slotCount[slot]=stackIdx+1;
        const geo=buildGeo(THREE,primitive,ratio*0.75), stitchGeo=buildGeo(THREE,primitive,ratio*0.75);
        const wireMat=new THREE.MeshPhongMaterial({color,wireframe:true,transparent:true,opacity:0.7});
        const solidMat=new THREE.MeshPhongMaterial({color,transparent:true,opacity:0.08,side:THREE.FrontSide});
        const edgesGeo=new THREE.EdgesGeometry(stitchGeo,15);
        const stitchMat=new THREE.LineBasicMaterial({color:0xC07040,transparent:true,opacity:0.35});
        const stitchMesh=new THREE.LineSegments(edgesGeo,stitchMat);
        for(let i=0;i<count;i++){
          const wm=new THREE.Mesh(geo,wireMat), sm=new THREE.Mesh(geo,solidMat), st=stitchMesh.clone();
          let xPos=pos.x||0;
          const yPos=(pos.y||0)+stackIdx*0.45, zPos=pos.zOff||0;
          if(pos.mirror&&count>1) xPos=i===0?Math.abs(pos.x):-Math.abs(pos.x);
          else if(!pos.mirror&&count>1) xPos=(i-(count-1)/2)*0.5;
          [wm,sm,st].forEach(m=>{
            m.position.set(xPos,yPos,zPos);
            if(slot==="tail") m.rotation.x=0.5;
            if(slot==="nose") m.rotation.x=Math.PI/2;
            if((slot==="arm"||slot==="leg")&&count>1) m.rotation.z=i===0?-0.4:0.4;
          });
          group.add(sm); group.add(wm); group.add(st);
          if(labeled){
            const cv=document.createElement("canvas"); cv.width=320; cv.height=58;
            const ctx=cv.getContext("2d"); ctx.clearRect(0,0,320,58);
            ctx.fillStyle="#B85A3C"; ctx.font="bold 22px Inter, sans-serif"; ctx.textAlign="center";
            const rawLabel=comp.label||rawRole;
            const displayLabel=(rawLabel!=="unknown"&&rawLabel!=="detail")?rawLabel.toUpperCase():slot!=="detail"?slot.toUpperCase():primitive.toUpperCase();
            ctx.fillText(displayLabel,160,40);
            const tex=new THREE.CanvasTexture(cv);
            const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
            sprite.scale.set(1.6,0.38,1); sprite.position.set(xPos,yPos+ratio*0.85+0.5,zPos+0.15);
            group.add(sprite);
          }
        }
      });
      const bodyComp=components.find(c=>normalizeRole(c.role||"",c.primitive_type||"")==="body");
      const bodyRatio=bodyComp?Math.max(0.15,bodyComp.size_ratio_to_dominant||1.0):0.75;
      const sceneScale=0.9/(bodyRatio*0.75);
      group.scale.setScalar(Math.min(sceneScale,1.4));
      group.position.set(0,-SLOT_POSITIONS.body.y*group.scale.y*0.5,0);
      group.rotation.x=rotRef.current.x; group.rotation.y=rotRef.current.y;
      scene.add(group);
      const grid=new THREE.GridHelper(10,14,0xEAE0D5,0xEAE0D5);
      grid.position.y=-2.5; grid.material.transparent=true; grid.material.opacity=0.3;
      scene.add(grid);
      const animate=()=>{ animFrame=requestAnimationFrame(animate); if(!isDragging.current&&group) group.rotation.y+=0.003; renderer.render(scene,camera); };
      animate();
    };
    const W0=el.clientWidth||0, H0=el.clientHeight||el.clientWidth||0;
    if(W0>10&&H0>10){ init(W0,H0); } else {
      const ro=new ResizeObserver(entries=>{
        for(const entry of entries){
          const{width,height}=entry.contentRect;
          if(width>10&&height>10){ init(width,height); ro.disconnect(); }
        }
      });
      ro.observe(el);
      return ()=>{ ro.disconnect(); cancelAnimationFrame(animFrame); renderer?.dispose(); };
    }
    return ()=>{ cancelAnimationFrame(animFrame); renderer?.dispose(); };
  },[threeLoaded,components,labeled,height,fillContainer,buildGeo]);
  const getXY=e=>({x:e.clientX??e.touches?.[0]?.clientX,y:e.clientY??e.touches?.[0]?.clientY});
  const onDown=e=>{ isDragging.current=true; lastMouse.current=getXY(e); };
  const onUp=()=>{ isDragging.current=false; pinchRef.current=null; };
  const onMove=e=>{
    if(!isDragging.current||!groupRef.current) return;
    if(e.touches?.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(pinchRef.current!==null){ zoomRef.current=Math.max(2,Math.min(14,zoomRef.current+(pinchRef.current-dist)*0.04)); if(cameraRef.current) cameraRef.current.position.z=zoomRef.current; }
      pinchRef.current=dist; return;
    }
    pinchRef.current=null;
    const{x,y}=getXY(e);
    groupRef.current.rotation.y+=(x-lastMouse.current.x)*0.012;
    groupRef.current.rotation.x+=(y-lastMouse.current.y)*0.012;
    rotRef.current={x:groupRef.current.rotation.x,y:groupRef.current.rotation.y};
    lastMouse.current={x,y};
  };
  const onWheel=e=>{ e.preventDefault(); zoomRef.current=Math.max(2,Math.min(14,zoomRef.current+e.deltaY*0.012)); if(cameraRef.current) cameraRef.current.position.z=zoomRef.current; };
  const outerStyle=fillContainer?{position:"absolute",inset:0}:{position:"relative"};
  const mountStyle=fillContainer?{width:"100%",height:"100%",cursor:"grab",userSelect:"none"}:{width:"100%",height,borderRadius:12,overflow:"hidden",cursor:"grab",userSelect:"none"};
  if(loadError) return <div style={{...outerStyle,display:"flex",alignItems:"center",justifyContent:"center",background:T.linen,borderRadius:12}}><div style={{fontSize:12,color:T.ink3}}>3D preview unavailable</div></div>;
  if(!threeLoaded) return <div style={{...outerStyle,display:"flex",alignItems:"center",justifyContent:"center",background:T.linen,borderRadius:12}}><div className="spinner" style={{width:24,height:24,border:`2px solid ${T.border}`,borderTop:`2px solid ${T.terra}`,borderRadius:"50%"}}/></div>;
  return (
    <div style={outerStyle}>
      <div ref={mountRef} className="wireframe-container" style={mountStyle} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} onWheel={onWheel}/>
      <div style={{position:"absolute",bottom:8,right:10,fontSize:10,color:T.ink3,pointerEvents:"none",display:"flex",gap:6}}><span>⟳ drag</span><span style={{opacity:.4}}>·</span><span>scroll/pinch to zoom</span></div>
    </div>
  );
};

const PaywallGate = ({onClose,onUpgrade,patternCount}) => (
  <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
    <div className="dim-in" style={{position:"absolute",inset:0,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)"}}/>
    <div className="su" onClick={e=>e.stopPropagation()} style={{position:"relative",background:T.surface,borderRadius:"24px 24px 0 0",width:"100%",padding:"28px 24px 52px",zIndex:1}}>
      <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 24px"}}/>
      <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${T.terra},#8B3A22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px",boxShadow:"0 8px 24px rgba(184,90,60,.35)"}}>🧶</div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Pattern library full</div>
        <div style={{fontSize:14,color:T.ink2,lineHeight:1.7,maxWidth:320,margin:"0 auto"}}>You've used all {TIER_CONFIG.free.patternCap} free patterns. Upgrade to Pro for unlimited storage and every import method.</div>
      </div>
      <div style={{background:`linear-gradient(135deg,${T.terra},#7A2E14)`,borderRadius:18,padding:"20px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>YarnHive Pro</div>
            <div style={{fontFamily:T.serif,fontSize:28,color:"#fff",fontWeight:700}}>$9.99<span style={{fontSize:14,fontWeight:400,opacity:.7}}>/month</span></div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>or $74.99/year — save 37%</div>
          </div>
          <div style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"6px 12px",fontSize:12,color:"#fff",fontWeight:600}}>✨ Pro</div>
        </div>
        {["Unlimited pattern storage","All import methods — URL, PDF, Hive Vision, browser","Hive Vision, Stash Check, Pattern Help","Full calculator suite","Cloud sync across all devices"].map(f=>(
          <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:16,height:16,borderRadius:99,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:9,color:"#fff"}}>✓</span></div>
            <span style={{fontSize:13,color:"rgba(255,255,255,.85)"}}>{f}</span>
          </div>
        ))}
      </div>
      <Btn onClick={onUpgrade} style={{marginBottom:10}}>Upgrade to Pro — $9.99/mo</Btn>
      <Btn onClick={onClose} variant="ghost">Maybe later</Btn>
    </div>
  </div>
);

const GEMINI_PROMPT = `You are an expert crochet pattern designer with deep knowledge of amigurumi, garment construction, blankets, and all crochet techniques. Analyze this photograph of a finished crochet object.

Your task: identify every distinct visible component, determine the exact crochet construction technique that produces each shape, and provide enough detail that a crocheter could recreate the object from scratch.

Return ONLY valid raw JSON. No markdown. No explanation. No backticks. Just the JSON object.

{
  "object_name": "the actual name of what this is",
  "object_category": "amigurumi or blanket or garment or accessory or home_goods or unknown",
  "confidence_overall": 85,
  "size_class": "tiny_under5cm or small_5to10cm or medium_10to20cm or large_over20cm",
  "color_structure": { "primary_color": "red", "accent_colors": ["cream","brown"], "color_count": 3 },
  "components": [
    {
      "id": "body", "role": "body", "label": "Body",
      "primitive_type": "cylinder or sphere or oval or cone or tapered_cylinder or flat_disc or flat_square or flat_circle",
      "size_relative": "dominant or large or medium or small",
      "size_ratio_to_dominant": 1.0, "color": "main color", "confidence": 90,
      "construction": { "technique": "worked_in_the_round or worked_flat or joined_granny_squares", "stitch": "single_crochet or half_double_crochet or double_crochet or bobble or ribbed", "start": "magic_ring or chain_foundation or chain_ring", "increase_to": 36, "even_rounds": 10, "decrease_from": 36, "final_sts": 6, "stuffed": true, "notes": "detailed note" },
      "join_to": "head", "join_method": "sew_flat_to_bottom_of_head or sew_side_to_body or worked_as_extension or no_join"
    }
  ],
  "assembly_order": ["list component ids in order"],
  "assembly_notes": "Specific assembly instructions"
}

CRITICAL RULES: Identify EVERY distinct visible part. Use real part names for role (hat, head, beard, body, arm, leg, ear, tail, nose, eye, base). size_ratio_to_dominant: body=1.0, head=0.7-0.9, arm=0.3, nose=0.08-0.15. Be specific with stitch counts.`;

const callGeminiVision = async (base64Image) => {
  const mediaType=base64Image.split(";")[0].split(":")[1]||"image/jpeg";
  const imageData=base64Image.split(",")[1];
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+GEMINI_API_KEY,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts:[{text:GEMINI_PROMPT},{inline_data:{mime_type:mediaType,data:imageData}}]}],generationConfig:{temperature:0.1,maxOutputTokens:8192}})
  });
  if(!response.ok) throw new Error("Gemini API error: "+response.status);
  const data=await response.json();
  const text=data.candidates?.[0]?.content?.parts?.[0]?.text||"";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
};

const calculateConfidence = (analysis) => {
  if(!analysis?.components) return 30;
  const comps=analysis.components;
  const avgConf=comps.reduce((s,c)=>s+(c.confidence||50),0)/comps.length;
  let score=avgConf;
  comps.forEach(c=>{
    if(c.primitive_type==="unknown") score-=8;
    if(c.role==="unknown"||c.role==="detail") score-=5;
    if(c.confidence<60) score-=5;
    if(c.construction?.increase_to>0) score+=3;
  });
  if(analysis.object_category==="unknown") score-=10;
  if(!analysis.object_name||analysis.object_name==="unknown") score-=5;
  return Math.min(97,Math.max(30,Math.round(score)));
};

const confidenceLabel = (score) => {
  if(score>=90) return{text:"Strong match — we're confident in this pattern",color:T.sage,emoji:"✅"};
  if(score>=75) return{text:"Good match — review highlighted components",color:T.terra,emoji:"🎯"};
  if(score>=60) return{text:"Partial match — a few pieces need your input",color:T.gold,emoji:"⚠️"};
  return{text:"Rough estimate — use this as a starting point and adjust",color:T.ink3,emoji:"🔍"};
};

const buildComponentRows = (comp,rowIdStart) => {
  const rows=[]; let id=rowIdStart;
  const c=comp.construction||{}, label=comp.label||comp.role||"Part", color=comp.color?" — "+comp.color+" yarn":"";
  const technique=c.technique||"worked_in_the_round", stitch=c.stitch||"single_crochet";
  const stitchAbbr=stitch==="single_crochet"?"sc":stitch==="half_double_crochet"?"hdc":stitch==="double_crochet"?"dc":"sc";
  const incTo=c.increase_to||24, evenRnds=c.even_rounds||6, decFrom=c.decrease_from||incTo, finalSts=c.final_sts||6, stuffed=c.stuffed!==false;
  rows.push({id:id++,text:"━━━ "+label.toUpperCase()+color+" ━━━",done:false,note:c.notes||""});
  if(technique==="worked_in_the_round"){
    if(c.start==="chain_ring") rows.push({id:id++,text:"Ch 4, sl st to form ring. Rnd 1: 6 "+stitchAbbr+" in ring. (6)",done:false,note:""});
    else rows.push({id:id++,text:"Magic ring, 6 "+stitchAbbr+". (6)",done:false,note:""});
    const startSts=6, incRoundsNeeded=Math.ceil((incTo-startSts)/6);
    if(incRoundsNeeded>=1) rows.push({id:id++,text:"Rnd 2: 2 "+stitchAbbr+" in each st. ("+(startSts*2)+")",done:false,note:""});
    if(incRoundsNeeded>=2){
      let prev=startSts*2;
      for(let r=2;r<=incRoundsNeeded&&prev<incTo;r++){
        const next=Math.min(prev+6,incTo), evenStr=(r-1)===1?"sc":(r-1)+" sc";
        rows.push({id:id++,text:`Rnd ${r+1}: [${evenStr}, 2 sc in next] x6. (${next})`,done:false,note:""}); prev=next;
      }
    }
    if(evenRnds>0) rows.push({id:id++,text:"Rnds "+(incRoundsNeeded+2)+"–"+(incRoundsNeeded+1+evenRnds)+": "+stitchAbbr+" in each st around. ("+incTo+")",done:false,note:""});
    if(stuffed&&decFrom>12) rows.push({id:id++,text:"Stuff "+label.toLowerCase()+" firmly before closing.",done:false,note:""});
    if(decFrom>finalSts){
      let cur=decFrom;
      for(let r=0;r<Math.ceil((decFrom-finalSts)/6)&&cur>finalSts;r++){
        const next=Math.max(cur-6,finalSts);
        if(next<=6) rows.push({id:id++,text:"Final dec: [sc2tog] x"+(cur/2)+". ("+next+") — fasten off, leave tail.",done:false,note:""});
        else rows.push({id:id++,text:"Dec rnd "+(r+1)+": ["+(cur/6-1)+" sc, sc2tog] x6. ("+next+")",done:false,note:""});
        cur=next;
      }
    } else rows.push({id:id++,text:"Fasten off, leave long tail for sewing.",done:false,note:""});
  } else if(technique==="worked_flat"){
    const chainLen=c.chain_length||incTo||20, rowCount=c.row_count||evenRnds||10;
    rows.push({id:id++,text:"Foundation: Ch "+chainLen+".",done:false,note:""});
    rows.push({id:id++,text:"Row 1: "+stitchAbbr.toUpperCase()+" in 2nd ch from hook and across. ("+(chainLen-1)+" sts)",done:false,note:""});
    rows.push({id:id++,text:"Rows 2–"+rowCount+": Ch 1, turn, "+stitchAbbr+" across. ("+(chainLen-1)+" sts)",done:false,note:""});
    rows.push({id:id++,text:"Fasten off, weave in ends.",done:false,note:""});
  }
  return{rows,nextId:id};
};

const buildStarterPattern = (analysis) => {
  if(!analysis?.components?.length) return {title:"Hive Vision — Review Needed",hook:"5.0mm",weight:"Worsted",yardage:200,notes:"Pattern needs more information. Try a clearer photo.",materials:[{id:1,name:"Worsted weight yarn",amount:"~200 yds",yardage:200},{id:2,name:"5.0mm crochet hook",amount:"1"}],rows:[{id:1,text:"Retake photo with better lighting for best results.",done:false,note:""}]};
  const components=analysis.components, isAmigurumi=analysis.object_category==="amigurumi";
  const objectName=analysis.object_name||analysis.object_category||"Crochet Object";
  const colorInfo=analysis.color_structure?.primary_color||"your chosen color";
  const colorCount=analysis.color_structure?.color_count||1;
  const assemblyOrder=analysis.assembly_order?.length?analysis.assembly_order:components.map(c=>c.id||c.role);
  const ordered=assemblyOrder.map(id=>components.find(c=>(c.id||c.role)===id)).filter(Boolean).concat(components.filter(c=>!assemblyOrder.includes(c.id||c.role)));
  const allRows=[]; let rowId=1;
  ordered.forEach(comp=>{ if(!comp) return; const result=buildComponentRows(comp,rowId); allRows.push(...result.rows); rowId=result.nextId; });
  allRows.push({id:rowId++,text:"━━━ ASSEMBLY ━━━",done:false,note:""});
  if(analysis.assembly_notes){ analysis.assembly_notes.split(/[.!]/).filter(s=>s.trim().length>10).forEach(step=>allRows.push({id:rowId++,text:step.trim()+".",done:false,note:""})); }
  else { ordered.forEach(comp=>{ if(comp.join_to&&comp.join_method) allRows.push({id:rowId++,text:(comp.label||comp.role)+": "+comp.join_method.replace(/_/g," ")+" to "+comp.join_to+".",done:false,note:""}); }); if(isAmigurumi) allRows.push({id:rowId++,text:"Sew all pieces firmly. Weave in all ends. Add safety eyes if not already attached.",done:false,note:""}); }
  const totalYards=components.reduce((sum,c)=>{ const i=c.construction?.increase_to||24, e=c.construction?.even_rounds||6; return sum+Math.round(i*(e+i/6)*0.025); },0);
  const colorMap={}; components.forEach(c=>{ const col=c.color||colorInfo; if(!colorMap[col]) colorMap[col]=0; colorMap[col]+=Math.round((c.construction?.increase_to||24)*((c.construction?.even_rounds||6)+4)*0.025); });
  const yarnMaterials=Object.entries(colorMap).map(([color,yds],i)=>({id:i+1,name:"Worsted yarn — "+color,amount:"~"+Math.max(20,yds)+" yds",yardage:Math.max(20,yds)}));
  const materials=[...yarnMaterials,{id:yarnMaterials.length+1,name:"5.0mm crochet hook",amount:"1"},{id:yarnMaterials.length+2,name:"Yarn needle",amount:"1"},...(isAmigurumi?[{id:yarnMaterials.length+3,name:"Safety eyes (9mm)",amount:"2"},{id:yarnMaterials.length+4,name:"Polyfill stuffing",amount:"small bag"}]:[])];
  return {title:"Hive Vision — "+objectName.charAt(0).toUpperCase()+objectName.slice(1),hook:"5.0mm",weight:"Worsted",yardage:Math.max(150,totalYards),notes:["Scanned from photo of a "+objectName+".",colorCount>1?colorCount+" colors: "+(analysis.color_structure?.accent_colors||[]).concat([colorInfo]).join(", ")+".":"Primary color: "+colorInfo+".","Stitch counts estimated from photo proportions — adjust to match your gauge.",components.length+" components identified."].join(" "),materials,rows:allRows};
};

const useSnapProgress = (active) => {
  const [progress,setProgress]=useState(0),[phase,setPhase]=useState("");
  const intervalRef=useRef(null),stageRef=useRef(0);
  const PHASES=[{label:"Preparing image…",target:20},{label:"Sending to Hive Vision…",target:35},{label:"Identifying components…",target:70},{label:"Calculating stitch math…",target:88},{label:"Assembling pattern…",target:96}];
  useEffect(()=>{
    if(!active){clearInterval(intervalRef.current);return;}
    stageRef.current=0; setProgress(0); setPhase(PHASES[0].label);
    const tick=()=>setProgress(prev=>{
      const stage=stageRef.current; if(stage>=PHASES.length) return prev;
      const target=PHASES[stage].target;
      if(prev>=target){stageRef.current=Math.min(stage+1,PHASES.length-1); if(stageRef.current<PHASES.length) setPhase(PHASES[stageRef.current].label); return prev;}
      return Math.min(prev+0.8,target);
    });
    intervalRef.current=setInterval(tick,80);
    return ()=>clearInterval(intervalRef.current);
  },[active]);
  const complete=()=>{clearInterval(intervalRef.current);setPhase("Pattern ready!");setProgress(100);};
  return{progress,phase,complete};
};

const HiveVisionForm = ({onSave}) => {
  const [file,setFile]=useState(null),[imgSrc,setImgSrc]=useState(null),[loading,setLoading]=useState(false);
  const [analysis,setAnalysis]=useState(null),[confidence,setConfidence]=useState(null),[preview,setPreview]=useState(null);
  const [error,setError]=useState(null),[wireframeMode,setWireframeMode]=useState("labeled"),[lightbox,setLightbox]=useState(null);
  const{progress,phase,complete}=useSnapProgress(loading);
  const handleFile=async(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    setFile(f);setError(null);setAnalysis(null);setPreview(null);
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const src=ev.target.result; setImgSrc(src); setLoading(true);
      try{
        const result=await callGeminiVision(src);
        const conf=calculateConfidence(result), pattern=buildStarterPattern(result);
        complete(); await new Promise(r=>setTimeout(r,400));
        setAnalysis(result);setConfidence(conf);setPreview(pattern);
      }catch(err){setError("Couldn't read the photo clearly. Try better lighting or a closer shot.");console.error(err);}
      finally{setLoading(false);}
    };
    reader.readAsDataURL(f);
  };
  const reset=()=>{setFile(null);setImgSrc(null);setAnalysis(null);setPreview(null);setError(null);setConfidence(null);};
  const confInfo=confidence?confidenceLabel(confidence):null;
  return (
    <div style={{paddingBottom:8}}>
      {lightbox&&(
        <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,.92)",display:"flex",flexDirection:"column"}} onClick={()=>setLightbox(null)}>
          <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,.7)",fontWeight:500}}>{lightbox==="photo"?(analysis?.object_name||"Source Photo"):"3D Component Map"}</div>
            <button onClick={()=>setLightbox(null)} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:99,width:32,height:32,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px 32px"}} onClick={e=>e.stopPropagation()}>
            {lightbox==="photo"?<img src={imgSrc} alt="source" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:12}}/>
              :<div style={{width:"100%",maxWidth:600,height:"70vh"}}><WireframeViewer components={analysis?.components} labeled={wireframeMode==="labeled"} height={window.innerHeight*0.65}/></div>}
          </div>
          {lightbox==="wireframe"&&<div style={{textAlign:"center",paddingBottom:24,fontSize:12,color:"rgba(255,255,255,.5)"}}>⟳ drag to rotate · scroll/pinch to zoom</div>}
        </div>
      )}
      <div style={{background:`linear-gradient(135deg,${T.terraLt},#FFF8F5)`,borderRadius:12,padding:"12px 14px",marginBottom:14,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:12,color:T.terra,fontWeight:600,marginBottom:3}}>🐝 Hive Vision — 3 free scans/month</div>
        <div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>Photograph any finished crochet object. We identify the components and build a starter pattern to recreate it.</div>
      </div>
      {!file&&(
        <label style={{display:"block",cursor:"pointer"}}>
          <div style={{border:`2px dashed ${T.border}`,borderRadius:16,padding:"36px 20px",textAlign:"center",background:T.linen}}>
            <div style={{fontSize:44,marginBottom:10}}>📸</div>
            <div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:6}}>Point, Click, Stitch!</div>
            <div style={{fontSize:13,color:T.ink3,marginBottom:14}}>Take a photo or choose from your library</div>
            <div style={{background:T.terra,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,display:"inline-block"}}>Take Photo or Choose from Library</div>
          </div>
          <input type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
        </label>
      )}
      {imgSrc&&loading&&(
        <div>
          <div style={{width:"100%",height:160,borderRadius:14,overflow:"hidden",marginBottom:16,position:"relative"}}>
            <img src={imgSrc} alt="analyzing" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",inset:0,background:"rgba(28,23,20,.5)",backdropFilter:"blur(2px)"}}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:13,color:"#fff",fontWeight:600,marginBottom:4}}>{phase}</div><div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Analyzing stitch structure…</div></div>
            </div>
          </div>
          <div style={{padding:"0 2px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:12,color:T.ink2,fontWeight:500}}>{phase}</div>
              <div style={{fontSize:12,color:T.terra,fontWeight:700}}>{Math.round(progress)}%</div>
            </div>
            <div style={{background:T.border,borderRadius:99,height:6,overflow:"hidden",marginBottom:6}}>
              <div className="progress-bar-fill" style={{width:progress+"%",height:6,borderRadius:99,transition:"width .3s ease"}}/>
            </div>
            <div style={{fontSize:11,color:T.ink3,textAlign:"center"}}>
              {progress<35&&"Reading image data…"}{progress>=35&&progress<70&&"Hive Vision is identifying components…"}{progress>=70&&progress<90&&"Running stitch count math…"}{progress>=90&&"Finalizing your pattern…"}
            </div>
          </div>
        </div>
      )}
      {error&&(
        <div style={{background:"#FFF0EE",borderRadius:12,padding:"14px 16px",marginBottom:14,border:"1px solid #F5C6BB"}}>
          <div style={{fontSize:13,color:"#C0392B",fontWeight:600,marginBottom:4}}>Couldn't read this photo</div>
          <div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>{error}</div>
          <div style={{marginTop:10}}><Btn variant="secondary" onClick={reset} small full={false}>Try again</Btn></div>
        </div>
      )}
      {analysis&&preview&&!loading&&(
        <div className="fu">
          <div className="conf-pop" style={{background:T.surface,borderRadius:14,border:`2px solid ${confInfo?.color||T.border}`,padding:"16px",marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".09em",marginBottom:6}}>Pattern Confidence</div>
            <div style={{fontFamily:T.serif,fontSize:52,fontWeight:700,color:confInfo?.color,lineHeight:1,marginBottom:4}}>{confidence}%</div>
            <div style={{fontSize:12,color:T.ink2,marginBottom:10}}>{confInfo?.emoji} {confInfo?.text}</div>
            <Bar val={confidence} color={confInfo?.color} h={5}/>
            <div style={{fontSize:11,color:T.ink3,marginTop:8,lineHeight:1.5}}>Tap either panel to view fullscreen. Stitch counts are estimated — adjust after saving.</div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
              <div style={{flex:1,fontSize:12,fontWeight:600,color:T.ink2,textAlign:"center"}}>Your Photo</div>
              <div style={{width:1,height:16,background:T.border}}/>
              <div style={{flex:1,fontSize:12,fontWeight:600,color:T.ink2,textAlign:"center"}}>3D Component Map</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div onClick={()=>setLightbox("photo")} style={{position:"relative",borderRadius:12,overflow:"hidden",border:`1px solid ${T.border}`,height:240,background:T.linen,cursor:"zoom-in"}}>
                <img src={imgSrc} alt="source" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",display:"block"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.75) 0%,transparent 60%)"}}/>
                <div style={{position:"absolute",bottom:8,left:10,right:10,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.85)"}}>{analysis.object_name?(analysis.object_name.charAt(0).toUpperCase()+analysis.object_name.slice(1)):"Source"}</div>
                  <div style={{background:"rgba(0,0,0,.4)",borderRadius:6,padding:"2px 7px",fontSize:9,color:"rgba(255,255,255,.8)"}}>⤢ expand</div>
                </div>
              </div>
              <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${T.border}`,height:240,background:"#FAF7F3",position:"relative",cursor:"zoom-in"}} onClick={()=>setLightbox("wireframe")}>
                <WireframeViewer components={analysis.components} labeled={wireframeMode==="labeled"} height={240}/>
                <div style={{position:"absolute",bottom:8,right:10,background:"rgba(0,0,0,.35)",borderRadius:6,padding:"2px 7px",fontSize:9,color:"rgba(255,255,255,.8)",pointerEvents:"none"}}>⤢ expand</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"center",alignItems:"center"}}>
              <span style={{fontSize:11,color:T.ink3,marginRight:4}}>Component labels:</span>
              {[["labeled","On"],["clean","Off"]].map(([mode,label])=>(
                <button key={mode} onClick={()=>setWireframeMode(mode)} style={{background:wireframeMode===mode?T.terra:T.linen,color:wireframeMode===mode?"#fff":T.ink3,border:`1px solid ${wireframeMode===mode?T.terra:T.border}`,borderRadius:8,padding:"5px 14px",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>{label}</button>
              ))}
            </div>
            <div style={{marginTop:10,background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8,fontWeight:600}}>Build Order · {analysis.components?.length} Components</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {analysis.components?.map((c,i)=>{
                  const conf=c.confidence>=75, label=c.label||c.role||c.primitive_type||"part";
                  const notes=c.construction?.notes||[c.construction?.technique?.replace(/_/g," "),c.construction?.increase_to?"~"+c.construction.increase_to+" sts":null,c.construction?.even_rounds?c.construction.even_rounds+" rnds":null,c.color?c.color+" yarn":null].filter(Boolean).join(" · ");
                  return (
                    <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 10px",background:conf?T.sageLt:T.terraLt,borderRadius:8,border:`1px solid ${conf?"rgba(92,122,94,.2)":"rgba(184,90,60,.2)"}`}}>
                      <div style={{width:22,height:22,borderRadius:99,background:conf?T.sage:T.terra,color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:conf?T.sage:T.terra,textTransform:"uppercase",marginBottom:2}}>{label} <span style={{fontWeight:400,opacity:.6}}>({c.primitive_type})</span></div>
                        <div style={{fontSize:11,color:T.ink2,lineHeight:1.5}}>{notes||"—"}</div>
                        {c.join_to&&<div style={{fontSize:10,color:T.ink3,marginTop:2}}>→ Joins to: {c.join_to}</div>}
                      </div>
                      <div style={{fontSize:10,color:T.ink3,flexShrink:0,marginTop:1}}>{c.confidence}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{background:T.linen,borderRadius:12,border:`1px solid ${T.border}`,padding:"14px",marginBottom:14}}>
            <div style={{fontFamily:T.serif,fontSize:16,color:T.ink,marginBottom:4}}>{preview.title}</div>
            <div style={{fontSize:12,color:T.ink3,marginBottom:10}}>Hook {preview.hook} · {preview.weight} · ~{preview.yardage} yds · {preview.rows.length} steps</div>
            <div style={{fontSize:12,color:T.ink2,lineHeight:1.6,marginBottom:12}}>{preview.notes}</div>
            <div style={{fontSize:11,color:T.ink3,fontStyle:"italic",marginBottom:12}}>Review the steps after saving — adjust stitch counts to match your gauge and yarn weight.</div>
            <Btn onClick={()=>onSave({id:Date.now(),photo:imgSrc||PILL[0],source:"Hive Vision",cat:analysis.object_category==="amigurumi"?"Amigurumi":"Uncategorized",rating:0,skeins:2,skeinYards:200,gauge:{stitches:16,rows:20,size:4},dimensions:{width:20,height:20},snapConfidence:confidence,snapComponents:analysis.components||[],snapObjectName:analysis.object_name||"",...preview})}>Save to Your Hive</Btn>
            <div style={{marginTop:8}}><Btn variant="ghost" onClick={reset}>Try different photo</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
};

const ManualEntryForm = ({onSave}) => {
  const [title,setTitle]=useState(""),[cat,setCat]=useState("Blankets"),[hook,setHook]=useState(""),[weight,setWeight]=useState(""),[source,setSource]=useState(""),[notes,setNotes]=useState(""),[yardage,setYardage]=useState(""),[rowText,setRowText]=useState(""),[rows,setRows]=useState([]),[matName,setMatName]=useState(""),[matAmt,setMatAmt]=useState(""),[materials,setMaterials]=useState([]);
  const addRow=()=>{if(!rowText.trim())return;setRows(p=>[...p,{id:Date.now(),text:rowText.trim(),done:false,note:""}]);setRowText("");};
  const addMat=()=>{if(!matName.trim())return;setMaterials(p=>[...p,{id:Date.now(),name:matName.trim(),amount:matAmt.trim()}]);setMatName("");setMatAmt("");};
  const save=()=>{if(!title.trim())return;onSave({id:Date.now(),photo:PILL[Math.floor(Math.random()*PILL.length)],title,source:source||"My Pattern",cat,hook,weight,notes,rating:0,yardage:parseInt(yardage)||0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials,rows});};
  return (
    <div style={{paddingBottom:8}}>
      <Field label="Pattern Title *" placeholder="e.g. Cozy Weekend Blanket" value={title} onChange={e=>setTitle(e.target.value)}/>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:1}}><div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Category</div><select value={cat} onChange={e=>setCat(e.target.value)} style={{width:"100%",padding:"12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}>{["Blankets","Wearables","Accessories","Amigurumi","Home Décor"].map(c=><option key={c}>{c}</option>)}</select></div>
        <div style={{flex:1}}><Field label="Hook Size" placeholder="5.0mm" value={hook} onChange={e=>setHook(e.target.value)}/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Field label="Yarn Weight" placeholder="Worsted…" value={weight} onChange={e=>setWeight(e.target.value)}/></div>
        <div style={{flex:1}}><Field label="Total Yardage" placeholder="800" value={yardage} onChange={e=>setYardage(e.target.value)}/></div>
      </div>
      <Field label="Source" placeholder="ravelry.com" value={source} onChange={e=>setSource(e.target.value)}/>
      <Field label="Notes" placeholder="Special notes…" value={notes} onChange={e=>setNotes(e.target.value)} rows={2}/>
      <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Materials</div>
      {materials.map((m,i)=>(
        <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:5,height:5,borderRadius:99,background:T.terra,flexShrink:0}}/>
          <span style={{flex:1,fontSize:13,color:T.ink2}}>{m.name}</span><span style={{fontSize:12,color:T.ink3}}>{m.amount}</span>
          <button onClick={()=>setMaterials(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:15}}>x</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:8,marginBottom:18}}>
        <input value={matName} onChange={e=>setMatName(e.target.value)} placeholder="Material name" style={{flex:1,padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        <input value={matAmt} onChange={e=>setMatAmt(e.target.value)} placeholder="Amt" style={{width:70,padding:"9px 10px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}}/>
        <button onClick={addMat} style={{background:T.terra,color:"#fff",border:"none",borderRadius:9,padding:"9px 14px",cursor:"pointer",fontSize:18,lineHeight:1}}>+</button>
      </div>
      <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Rows / Steps</div>
      {rows.map((r,i)=>(
        <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,color:T.ink3,minWidth:20,textAlign:"center",fontWeight:600}}>{i+1}</div>
          <span style={{flex:1,fontSize:13,color:T.ink2}}>{r.text}</span>
          <button onClick={()=>setRows(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:15}}>x</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:8,marginBottom:20}}>
        <input value={rowText} onChange={e=>setRowText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRow()} placeholder="Row 1: Ch 120, sc across…" style={{flex:1,padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        <button onClick={addRow} style={{background:T.terra,color:"#fff",border:"none",borderRadius:9,padding:"9px 14px",cursor:"pointer",fontSize:18,lineHeight:1}}>+</button>
      </div>
      <Btn onClick={save} disabled={!title.trim()}>Save Pattern</Btn>
    </div>
  );
};

const URLImportForm = ({onSave}) => {
  const [url,setUrl]=useState(""),[loading,setLoading]=useState(false),[progress,setProgress]=useState(0),[phase,setPhase]=useState(""),[preview,setPreview]=useState(null),[error,setError]=useState(null);
  const doImport=async()=>{
    if(!url.trim()) return;
    setLoading(true);setError(null);setPreview(null);setProgress(0);setPhase("Fetching pattern page…");
    const p1=setInterval(()=>setProgress(p=>Math.min(p+3,28)),120);
    let data;
    try{
      const res=await fetch("/api/fetch-pattern",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim()})});
      clearInterval(p1);setProgress(30);setPhase("Reading and extracting pattern…");
      const p2=setInterval(()=>setProgress(p=>Math.min(p+1,84)),120);
      data=await res.json(); clearInterval(p2);
      if(!res.ok||data.error) throw new Error(data.error||"Could not read that page");
      setPhase("Structuring your pattern…");setProgress(90);
      await new Promise(r=>setTimeout(r,400));setProgress(100);await new Promise(r=>setTimeout(r,300));
    }catch(err){setError("Couldn't read that pattern. Try a different URL or use Manual Entry.");setLoading(false);setProgress(0);return;}
    const rows=(data.rows||[]).map((r,i)=>({id:Date.now()+i,text:r.text||"",done:false,note:""}));
    const estimatedYardage=data.yardage>0?data.yardage:(data.materials||[]).reduce((sum,m)=>{if(m.yardage>0)return sum+m.yardage;const t=((m.name||"")+" "+(m.amount||"")).toLowerCase();const b=t.match(/(\d+)\s*ball/),s=t.match(/(\d+)\s*skein/);if(b)return sum+parseInt(b[1])*200;if(s)return sum+parseInt(s[1])*200;return sum;},0);
    const missing=[];if(!data.hook)missing.push("hook size");if(!data.weight)missing.push("yarn weight");if(!(data.yardage>0)&&!(estimatedYardage>0))missing.push("yardage");if(!(data.materials||[]).length)missing.push("materials list");
    setPreview({...data,rows,yardage:estimatedYardage||data.yardage||0,photo:data.thumbnail_url||PILL[Math.floor(Math.random()*PILL.length)],smartNote:rows.length+" steps extracted and ready to track.",qualityNote:missing.length===0?null:"Not found on source page: "+missing.join(", ")+". Pattern quality depends on the source."});
    setLoading(false);
  };
  return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Paste any crochet pattern URL. We read the page and extract every step automatically.</div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <div style={{flex:1,display:"flex",alignItems:"center",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px 14px",gap:10}}>
          <span style={{color:T.ink3}}>🔗</span>
          <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doImport()} placeholder="https://www.allfreecrochet.com/…" style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}}/>
        </div>
        <button onClick={doImport} disabled={!url.trim()||loading} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"0 18px",fontWeight:600,fontSize:14,cursor:"pointer",boxShadow:"0 4px 14px rgba(184,90,60,.3)",opacity:!url.trim()||loading?0.6:1}}>{loading?"…":"Go"}</button>
      </div>
      {loading&&<div style={{padding:"24px 0 32px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:13,color:T.ink2,fontWeight:500}}>{phase}</div><div style={{fontSize:13,color:T.terra,fontWeight:700}}>{progress}%</div></div><div style={{background:T.border,borderRadius:99,height:6,overflow:"hidden",marginBottom:10}}><div className="progress-bar-fill" style={{width:progress+"%",height:6,borderRadius:99,transition:"width .3s ease"}}/></div></div>}
      {error&&<div style={{background:"#FFF0EE",borderRadius:12,padding:"14px 16px",marginBottom:14,border:"1px solid #F5C6BB"}}><div style={{fontSize:13,color:"#C0392B",fontWeight:600,marginBottom:4}}>Couldn't read this URL</div><div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>{error}</div></div>}
      {preview&&!loading&&(
        <div className="fu" style={{background:T.linen,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`}}>
          <div style={{height:100,position:"relative"}}><Photo src={preview.photo} alt="pattern" style={{width:"100%",height:"100%"}}/></div>
          <div style={{padding:"14px"}}>
            <div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{preview.source}</div>
            <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>{preview.title}</div>
            <div style={{fontSize:12,color:T.ink3,marginBottom:8}}>{[preview.hook&&"Hook "+preview.hook,preview.weight,preview.yardage>0&&"~"+preview.yardage+" yds"].filter(Boolean).join(" · ")}</div>
            {preview.smartNote&&<div style={{background:T.sageLt,borderRadius:8,padding:"8px 12px",marginBottom:10,display:"flex",gap:8}}><span>✨</span><span style={{fontSize:12,color:T.sage}}>{preview.smartNote}</span></div>}
            {preview.qualityNote&&<div style={{background:"#FFF8EC",borderRadius:8,padding:"8px 12px",marginBottom:12,border:"1px solid #F0D9A8",display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:13,flexShrink:0}}>⚠️</span><span style={{fontSize:11,color:"#8B6914",lineHeight:1.6}}>{preview.qualityNote}</span></div>}
            {preview.rows?.length>0&&<div style={{background:T.surface,borderRadius:10,padding:"10px 12px",marginBottom:12,maxHeight:160,overflowY:"auto",border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8,fontWeight:600}}>Preview — {preview.rows.length} steps</div>{preview.rows.slice(0,5).map((r,i)=><div key={i} style={{fontSize:12,color:T.ink2,padding:"4px 0",borderBottom:i<4?`1px solid ${T.border}`:"none",lineHeight:1.5}}>{r.text}</div>)}{preview.rows.length>5&&<div style={{fontSize:11,color:T.ink3,marginTop:6}}>+{preview.rows.length-5} more steps…</div>}</div>}
            <Btn onClick={()=>onSave({id:Date.now(),rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},...preview})}>Save to Your Hive</Btn>
            <div style={{marginTop:8}}><Btn variant="ghost" onClick={()=>{setPreview(null);setUrl("");}}>Try different URL</Btn></div>
          </div>
        </div>
      )}
      <div style={{marginTop:14,background:T.linen,borderRadius:12,padding:"12px 14px"}}><div style={{fontSize:11,color:T.ink3,fontWeight:600,marginBottom:4}}>Works great with</div><div style={{fontSize:12,color:T.ink2,lineHeight:1.8}}>AllFreeCrochet · Drops Design · Yarnspirations · LoveCrafts · Sarah Maker · WordPress pattern blogs</div></div>
    </div>
  );
};

const PDFUploadForm = ({onSave}) => {
  const [file,setFile]=useState(null),[loading,setLoading]=useState(false),[preview,setPreview]=useState(null);
  const handleFile=(e)=>{const f=e.target.files?.[0];if(!f)return;setFile(f);setLoading(true);setTimeout(()=>{setPreview({title:f.name.replace(/\.(pdf|jpg|png|jpeg)$/i,"").replace(/[-_]/g," "),source:"PDF Upload",cat:"Uncategorized",hook:"",weight:"",yardage:0,notes:"Extracted from uploaded document.",materials:[],rows:[{id:1,text:"Row 1: Extracted from document",done:false,note:""},{id:2,text:"Row 2: Continue as written",done:false,note:""}],photo:PILL[Math.floor(Math.random()*PILL.length)],smartNote:"Some fields were incomplete — estimated gauge and yardage filled in automatically."});setLoading(false);},1600);};
  return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Upload a PDF pattern, photo of a printed pattern, or any scanned document.</div>
      {!file&&<label style={{display:"block",cursor:"pointer"}}><div style={{border:`2px dashed ${T.border}`,borderRadius:16,padding:"36px 20px",textAlign:"center",background:T.linen}}><div style={{fontSize:40,marginBottom:10}}>📄</div><div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:6}}>Drop your pattern here</div><div style={{fontSize:13,color:T.ink3,marginBottom:14}}>PDF, JPG, PNG — up to 20MB</div><div style={{background:T.terra,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,display:"inline-block"}}>Choose File</div></div><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{display:"none"}}/></label>}
      {loading&&<div style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:36,marginBottom:10}}>🔎</div><div style={{fontFamily:T.serif,fontSize:16,color:T.ink2}}>Reading your pattern…</div></div>}
      {preview&&!loading&&(
        <div className="fu" style={{background:T.linen,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden"}}>
          <div style={{height:90,overflow:"hidden"}}><Photo src={preview.photo} alt="pattern" style={{width:"100%",height:"100%"}}/></div>
          <div style={{padding:"14px"}}>
            <div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:4}}>{preview.title}</div>
            <div style={{fontSize:12,color:T.ink3,marginBottom:10}}>{preview.rows.length} rows extracted</div>
            {preview.smartNote&&<div style={{background:T.sageLt,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",gap:8}}><span>✨</span><span style={{fontSize:12,color:T.sage}}>{preview.smartNote}</span></div>}
            <Btn onClick={()=>onSave({id:Date.now(),rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},...preview})}>Save to Your Hive</Btn>
            <div style={{marginTop:8}}><Btn variant="ghost" onClick={()=>{setFile(null);setPreview(null);}}>Upload different file</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
};

const BrowserImport = ({onSave}) => {
  const [active,setActive]=useState(null),[saving,setSaving]=useState(false);
  const SITES=[{name:"AllFreeCrochet",desc:"Thousands of free patterns",photo:PILL[4],note:"Full extraction supported"},{name:"Drops Design",desc:"Free international patterns",photo:PILL[0],note:"Full extraction supported"},{name:"Yarnspirations",desc:"Caron & Bernat free patterns",photo:PILL[3],note:"Most patterns extractable"},{name:"Sarah Maker",desc:"Modern beginner patterns",photo:PILL[2],note:"Full extraction supported"},{name:"Hopeful Honey",desc:"Whimsical amigurumi",photo:PILL[5],note:"Full extraction supported"},{name:"Ravelry",desc:"Requires login in-browser",photo:PILL[1],note:"Browse then copy URL to import"}];
  const doSave=(s)=>{setSaving(true);setTimeout(()=>{onSave({id:Date.now(),photo:s.photo,title:"Pattern from "+s.name,source:s.name,cat:"Uncategorized",hook:"",weight:"",rating:0,notes:"",materials:[],rows:[],yardage:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60}});setSaving(false);setActive(null);},900);};
  if(active) return (
    <div style={{paddingBottom:8}}>
      <button onClick={()=>setActive(null)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:14,padding:0}}>← All sites</button>
      <div style={{background:T.linen,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,marginBottom:14}}>
        <div style={{height:130,position:"relative"}}><Photo src={active.photo} alt={active.name} style={{width:"100%",height:"100%"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(15,10,8,.6) 0%,transparent 50%)"}}/>
          <div style={{position:"absolute",bottom:14,left:16}}><div style={{fontFamily:T.serif,fontSize:20,color:"#fff",fontWeight:700}}>{active.name}</div></div>
        </div>
        <div style={{padding:"16px"}}>
          <div style={{background:T.sageLt,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",gap:8}}><span>ℹ️</span><span style={{fontSize:12,color:T.sage}}>{active.note}</span></div>
          <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>In the full version, an in-app browser opens {active.name} directly. Browse and tap Save — we handle the rest.</div>
          <Btn onClick={()=>doSave(active)} disabled={saving}>{saving?"Saving…":"Save from "+active.name}</Btn>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Browse curated pattern sites in-app. Find a pattern and tap Save.</div>
      <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`}}>
        {SITES.map((s,i)=>(
          <div key={s.name} className="site-row" onClick={()=>setActive(s)} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:T.surface,borderTop:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",transition:"background .12s"}}>
            <div style={{width:44,height:44,borderRadius:10,overflow:"hidden",flexShrink:0}}><Photo src={s.photo} alt={s.name} style={{width:"100%",height:"100%"}}/></div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:T.ink,marginBottom:1}}>{s.name}</div><div style={{fontSize:12,color:T.ink3}}>{s.desc}</div></div>
            <span style={{color:T.ink3,fontSize:20}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AddPatternModal = ({onClose,onSave,isPro,patternCount}) => {
  const [method,setMethod]=useState(null),[closing,setClosing]=useState(false);
  const{isDesktop}=useBreakpoint();
  const dismiss=()=>{setClosing(true);setTimeout(()=>{setClosing(false);onClose();},220);};
  const handleSave=(p)=>{onSave(p);dismiss();};
  const METHODS=[
    {key:"manual",icon:"✏️",label:"Manual Entry",sub:"Type it in yourself"},
    {key:"url",icon:"🔗",label:"Smart Import",sub:"Paste any pattern link"},
    {key:"pdf",icon:"📄",label:"PDF / Document",sub:"Upload & extract"},
    {key:"browser",icon:"🌐",label:"Browse Sites",sub:"AllFreeCrochet, Drops & more"},
    {key:"snap",icon:"🐝",label:"Hive Vision",sub:"Photograph any finished object — 3 free scans/mo"},
  ];
  const MethodList=()=>(
    <>
      <div style={{fontSize:12,color:T.ink3,marginBottom:14}}>{isPro?"Pro — unlimited patterns":"Free plan · "+patternCount+"/"+TIER_CONFIG.free.patternCap+" patterns used — all import methods available"}</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {METHODS.map(m=>(
          <div key={m.key} className="method-card" onClick={()=>setMethod(m.key)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:m.key==="snap"?T.terraLt:T.linen,border:"1.5px solid "+(m.key==="snap"?T.terra:T.border),borderRadius:14,cursor:"pointer",transition:"all .15s"}}>
            <div style={{width:44,height:44,borderRadius:12,background:m.key==="snap"?"rgba(184,90,60,.2)":T.terraLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.icon}</div>
            <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:m.key==="snap"?T.terra:T.ink,marginBottom:2}}>{m.label}</div><div style={{fontSize:12,color:T.ink3}}>{m.sub}</div></div>
            {m.key==="snap"&&<div style={{background:T.sage,color:"#fff",borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:700,flexShrink:0}}>FREE</div>}
            {m.key!=="snap"&&<span style={{color:T.ink3,fontSize:18}}>›</span>}
          </div>
        ))}
      </div>
    </>
  );
  if(isDesktop) return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss} style={{position:"absolute",inset:0,background:"rgba(28,23,20,.6)",backdropFilter:"blur(4px)"}}/>
      <div className={closing?"":"fu"} style={{position:"relative",background:T.surface,borderRadius:20,width:"100%",maxWidth:580,maxHeight:"85vh",display:"flex",flexDirection:"column",zIndex:1,boxShadow:"0 24px 64px rgba(28,23,20,.3)"}}>
        <div style={{flexShrink:0,padding:"24px 28px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            {method?<button onClick={()=>setMethod(null)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:14,fontWeight:600,padding:0}}>← Back</button>:<div style={{fontFamily:T.serif,fontSize:24,color:T.ink}}>Add Pattern</div>}
            <button onClick={dismiss} style={{background:T.linen,border:"none",borderRadius:99,width:32,height:32,cursor:"pointer",fontSize:18,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          {method&&<div style={{fontSize:12,color:T.ink3,marginBottom:14,fontWeight:500}}>{METHODS.find(m=>m.key===method)?.icon} {METHODS.find(m=>m.key===method)?.label}</div>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"0 28px 32px"}}>
          {!method&&<MethodList/>}
          {method==="manual"&&<ManualEntryForm onSave={handleSave}/>}
          {method==="url"&&<URLImportForm onSave={handleSave}/>}
          {method==="pdf"&&<PDFUploadForm onSave={handleSave}/>}
          {method==="browser"&&<BrowserImport onSave={handleSave}/>}
          {method==="snap"&&<HiveVisionForm onSave={handleSave}/>}
        </div>
      </div>
    </div>
  );
  return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"flex-end"}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss} style={{position:"absolute",inset:0,background:"rgba(28,23,20,.6)",backdropFilter:"blur(4px)"}}/>
      <div className={closing?"":"su"} style={{position:"relative",background:T.surface,borderRadius:"24px 24px 0 0",width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",zIndex:1}}>
        <div style={{flexShrink:0,padding:"16px 22px 0"}}>
          <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 18px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            {method?<button onClick={()=>setMethod(null)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:14,fontWeight:600,padding:0}}>← Back</button>:<div style={{fontFamily:T.serif,fontSize:22,color:T.ink}}>Add Pattern</div>}
            <button onClick={dismiss} style={{background:T.linen,border:"none",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          {method&&<div style={{fontSize:12,color:T.ink3,marginBottom:12,fontWeight:500}}>{METHODS.find(m=>m.key===method)?.icon} {METHODS.find(m=>m.key===method)?.label}</div>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"0 22px 40px"}}>
          {!method&&<MethodList/>}
          {method==="manual"&&<ManualEntryForm onSave={handleSave}/>}
          {method==="url"&&<URLImportForm onSave={handleSave}/>}
          {method==="pdf"&&<PDFUploadForm onSave={handleSave}/>}
          {method==="browser"&&<BrowserImport onSave={handleSave}/>}
          {method==="snap"&&<HiveVisionForm onSave={handleSave}/>}
        </div>
      </div>
    </div>
  );
};

const SidebarNav = ({view,setView,count,isPro,onAddPattern}) => {
  const ITEMS=[{key:"collection",label:"Your Hive",sub:count+" saved",icon:"🧶"},{key:"wip",label:"In Progress",sub:"Currently making",icon:"🪡"},{key:"browse",label:"Browse Sites",sub:"Find free patterns",icon:"🌐"},{key:"stash",label:"Yarn Stash",sub:"Manage your yarn",icon:"🎀"},{key:"calculator",label:"Calculators",sub:"Gauge, yardage & more",icon:"🧮"},{key:"shopping",label:"Shopping List",sub:"Auto-generated",icon:"🛒"}];
  return (
    <div style={{width:260,background:T.surface,borderRight:`1px solid ${T.border}`,height:"100vh",position:"sticky",top:0,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{position:"relative",height:160,overflow:"hidden",flexShrink:0}}>
        <Photo src="https://res.cloudinary.com/dmaupzhcx/image/upload/v1774123693/yarnhive_sidebar_bee.jpg" alt="YarnHive bee" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 60%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.85) 0%,rgba(20,14,10,.2) 100%)"}}/>
        <div style={{position:"absolute",bottom:18,left:20}}><div style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:"#fff",lineHeight:1}}>YarnHive</div><div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:4}}>Your crochet hive</div></div>
      </div>
      <div style={{padding:"16px 16px 8px"}}><button onClick={onAddPattern} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:18}}>+</span> Add Pattern</button></div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {ITEMS.map(item=>{const active=view===item.key;return(
          <div key={item.key} className="nav-item" onClick={()=>setView(item.key)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderLeft:"3px solid "+(active?T.terra:"transparent"),background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
            <span style={{fontSize:18,width:24,textAlign:"center"}}>{item.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>{item.label}</div><div style={{fontSize:11,color:T.ink3,marginTop:1}}>{item.sub}</div></div>
            {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
          </div>
        );})}
      </div>
      <div style={{padding:"12px 16px 24px"}}>
        {isPro?<div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>✨</span><div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>YarnHive Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div></div>
        :<div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:12,padding:"14px"}}><div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.75)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Hive Vision, cloud sync.</div><div style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"7px",textAlign:"center",fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo · $74.99/yr</div></div>}
      </div>
    </div>
  );
};

const NavPanel = ({open,onClose,view,setView,count,isPro}) => {
  const [closing,setClosing]=useState(false);
  const dismiss=()=>{setClosing(true);setTimeout(()=>{setClosing(false);onClose();},220);};
  const go=v=>{setView(v);dismiss();};
  if(!open) return null;
  const ITEMS=[{key:"collection",label:"Your Hive",sub:count+" patterns saved",icon:"🧶"},{key:"wip",label:"In Progress",sub:"Currently making",icon:"🪡"},{key:"browse",label:"Browse Sites",sub:"Find free patterns",icon:"🌐"},{key:"stash",label:"Yarn Stash",sub:"Manage your yarn",icon:"🎀"},{key:"calculator",label:"Calculators",sub:"Gauge, yardage & more",icon:"🧮"},{key:"shopping",label:"Shopping List",sub:"Auto-generated needs",icon:"🛒"}];
  return (
    <div style={{position:"fixed",inset:0,zIndex:100}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss} style={{position:"absolute",inset:0,background:"rgba(28,23,20,.52)",backdropFilter:"blur(3px)"}}/>
      <div className={closing?"nav-close":"nav-open"} style={{position:"absolute",top:0,left:0,bottom:0,width:"80%",maxWidth:320,background:T.surface,display:"flex",flexDirection:"column",boxShadow:"6px 0 40px rgba(28,23,20,.2)"}}>
        <div style={{position:"relative",height:130,overflow:"hidden",flexShrink:0}}>
          <Photo src="https://res.cloudinary.com/dmaupzhcx/image/upload/v1774123693/yarnhive_sidebar_bee.jpg" alt="YarnHive bee" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 60%"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.8) 0%,rgba(20,14,10,.2) 100%)"}}/>
          <div style={{position:"absolute",bottom:16,left:18}}><div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:"#fff",lineHeight:1}}>YarnHive</div><div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:3}}>Your crochet hive</div></div>
        </div>
        <div style={{flex:1,overflowY:"auto",paddingTop:6}}>
          {ITEMS.map(item=>{const active=view===item.key;return(
            <div key={item.key} className="nav-item" onClick={()=>go(item.key)} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 20px",borderLeft:"3px solid "+(active?T.terra:"transparent"),background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
              <span style={{fontSize:20,width:26,textAlign:"center"}}>{item.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>{item.label}</div><div style={{fontSize:11,color:T.ink3,marginTop:1}}>{item.sub}</div></div>
              {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
            </div>
          );})}
        </div>
        <div style={{padding:"14px 18px 36px"}}>
          {isPro?<div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>✨</span><div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>YarnHive Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div></div>
          :<div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:14,padding:"14px 16px"}}><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.8)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Hive Vision.</div><div style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo · $74.99/yr</div></div>}
        </div>
      </div>
    </div>
  );
};

const BeeAnimator = ({visible, isDesktop}) => {
  const size = isDesktop ? 52 : 44;
  const W = isDesktop ? 440 : 370;
  const H = isDesktop ? 180 : 155;

  return (
    <div style={{
      width: W, height: H,
      marginBottom: -(H - 26),
      position: 'relative', zIndex: 2,
      pointerEvents: 'none',
      flexShrink: 0,
      opacity: visible ? 1 : 0,
      transition: 'opacity .3s ease',
    }}>
      <style>{`
        @keyframes beefly {
          0%   { transform: translate(${-size}px, ${isDesktop ? 130 : 108}px) rotate(-8deg); opacity: 0; }
          4%   { opacity: 1; }
          30%  { transform: translate(${Math.round(W*0.18)}px, ${Math.round(H*0.08)}px) rotate(-22deg); }
          65%  { transform: translate(${Math.round(W*0.58)}px, ${Math.round(H*0.06)}px) rotate(-10deg); }
          88%  { transform: translate(${Math.round(W*0.72)}px, ${Math.round(H*0.52)}px) rotate(4deg); }
          100% { transform: translate(${Math.round(W*0.72)}px, ${Math.round(H*0.64)}px) rotate(0deg); opacity: 1; }
        }
        @keyframes beebob {
          0%, 100% { transform: translate(${Math.round(W*0.72)}px, ${Math.round(H*0.64)}px) rotate(0deg); }
          50%       { transform: translate(${Math.round(W*0.72)}px, ${Math.round(H*0.64) - 4}px) rotate(0deg); }
        }
        @keyframes trailFade {
          0%   { opacity: 0.7; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.3); }
        }
        .bee-fly {
          position: absolute;
          top: 0; left: 0;
          font-size: ${size}px;
          line-height: 1;
          transform: scaleX(-1);
          animation:
            beefly 3.2s cubic-bezier(.25,.46,.45,.94) 0.9s both,
            beebob 2.2s ease-in-out ${0.9 + 3.2}s infinite;
          will-change: transform;
          user-select: none;
        }
        .bee-trail {
          position: absolute;
          top: 0; left: 0;
          pointer-events: none;
        }
        .bee-trail span {
          position: absolute;
          border-radius: 50%;
          animation: trailFade .8s ease-out forwards;
        }
      `}</style>
      <div className="bee-fly">🐝</div>
    </div>
  );
};

const Auth = ({onEnter,onEnterAsPro}) => {
  const [screen,setScreen]=useState("welcome"),[email,setEmail]=useState(""),[pass,setPass]=useState(""),[name,setName]=useState("");
  const{isDesktop}=useBreakpoint();

  const isSignup=screen==="signup";
  const showForm=screen==="signup"||screen==="signin";
  const BG = PHOTOS.world;

  const CARD_STYLE = {
    background: isDesktop ? "rgba(250,247,243,0.88)" : "rgba(250,247,243,0.78)",
    backdropFilter:"blur(36px) saturate(1.6) brightness(1.05)",
    WebkitBackdropFilter:"blur(36px) saturate(1.6) brightness(1.05)",
    borderRadius:28,
    boxShadow:"0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, 0 2px 0 rgba(255,255,255,0.7) inset",
    border:"1px solid rgba(255,255,255,0.38)",
    padding: isDesktop ? "44px 48px 40px" : "28px 24px 32px",
    width:"100%",
    maxWidth: isDesktop ? 420 : 360,
    position:"relative",
  };

  const Badges = ({onBadgeClick}) => (
    <div style={{marginTop:18}}>
      <div style={{fontSize:9,color:T.ink3,textTransform:"uppercase",letterSpacing:".12em",marginBottom:8,fontWeight:600,textAlign:"center"}}>Coming to mobile</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div onClick={()=>onBadgeClick('ios')} style={{background:"#000",borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity='.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:7,color:"rgba(255,255,255,.45)",letterSpacing:".07em",lineHeight:1}}>DOWNLOAD ON THE</div>
            <div style={{fontSize:13,fontWeight:600,color:"#fff",lineHeight:1.25}}>App Store</div>
          </div>
          <div style={{fontSize:8,color:"rgba(255,255,255,.35)",border:"1px solid rgba(255,255,255,.15)",borderRadius:5,padding:"2px 6px"}}>Soon</div>
        </div>
        <div onClick={()=>onBadgeClick('android')} style={{background:"#000",borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity='.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4.5 21.5L13.5 12L4.5 2.5C4 2.8 3.5 3.4 3.5 4.2v15.6c0 .8.5 1.4 1 1.7z" fill="#4285F4"/>
            <path d="M17 15.5L14 13.8 13.5 12 14 10.2 17 8.5 20.5 10.5c1 .6 1 1.4 0 2L17 15.5z" fill="#FBBC05"/>
            <path d="M4.5 21.5L13.5 12 17 15.5 6.5 21.2c-.8.4-1.6.3-2-.3z" fill="#EA4335"/>
            <path d="M4.5 2.5L13.5 12 17 8.5 6.5 2.8c-.8-.4-1.6-.3-2 .3-.1.1-.1.2 0 .4z" fill="#34A853"/>
          </svg>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:7,color:"rgba(255,255,255,.45)",letterSpacing:".07em",lineHeight:1}}>GET IT ON</div>
            <div style={{fontSize:13,fontWeight:600,color:"#fff",lineHeight:1.25}}>Google Play</div>
          </div>
          <div style={{fontSize:8,color:"rgba(255,255,255,.35)",border:"1px solid rgba(255,255,255,.15)",borderRadius:5,padding:"2px 6px"}}>Soon</div>
        </div>
      </div>
    </div>
  );

  /* ── Tier / App Store info modals ── */
  const ICON = {
    yarn: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 6.5 17.5M2.5 8.5A10 10 0 0 1 19 19M2 12h4M18 12h4M12 2v4M12 18v4"/></svg>,
    sparkle: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
    apple: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,
    googleplay: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4.5 21.5L13.5 12L4.5 2.5C4 2.8 3.5 3.4 3.5 4.2v15.6c0 .8.5 1.4 1 1.7z" fill="#4285F4"/><path d="M17 15.5L14 13.8 13.5 12 14 10.2 17 8.5 20.5 10.5c1 .6 1 1.4 0 2L17 15.5z" fill="#FBBC05"/><path d="M4.5 21.5L13.5 12 17 15.5 6.5 21.2c-.8.4-1.6.3-2-.3z" fill="#EA4335"/><path d="M4.5 2.5L13.5 12 17 8.5 6.5 2.8c-.8-.4-1.6-.3-2 .3-.1.1-.1.2 0 .4z" fill="#34A853"/></svg>,
  };

  const MODALS = {
    free: {
      icon: ICON.yarn,
      iconBg: T.terraLt,
      iconColor: T.terra,
      title:"Start for Free",
      subtitle:"Everything you need to get started — no credit card required.",
      gradient: null,
      features:[
        {label:"5 pattern slots",sub:"Save your favorite patterns and track progress"},
        {label:"Hive Vision scans",sub:"3 free photo-to-pattern scans per month"},
        {label:"Full calculator suite",sub:"Gauge, yardage, resize — all unlocked"},
        {label:"Yarn stash tracker",sub:"Know exactly what you have before you buy"},
        {label:"All import methods",sub:"URL, PDF, manual entry — use them all"},
      ],
      cta:"Create free account",
      ctaAction: "signup",
      footnote:"Upgrade to Pro anytime — your patterns come with you.",
    },
    pro: {
      icon: ICON.sparkle,
      iconBg: `linear-gradient(145deg,${T.terra},#6B2410)`,
      iconColor: "#fff",
      title:"YarnHive Pro",
      subtitle:"Unlimited everything. Built for makers who are serious about their craft.",
      gradient: `linear-gradient(145deg,${T.terra},#6B2410)`,
      features:[
        {label:"Unlimited patterns",sub:"No cap. Save every pattern you'll ever make"},
        {label:"Unlimited Hive Vision",sub:"Scan as many finished objects as you want"},
        {label:"Cloud sync",sub:"Access your hive on every device, always in sync"},
        {label:"Pattern Help AI",sub:"Get AI-powered help for any row you're stuck on"},
        {label:"Advanced analytics",sub:"Track your making history and stash usage"},
        {label:"Early access",sub:"First to get every new feature we ship"},
      ],
      cta:"Get Pro — $9.99/mo",
      ctaAlt:"$74.99/yr — save 37%",
      ctaAction: "signup",
      footnote:"Cancel anytime. No questions asked.",
    },
    ios: {
      icon: ICON.apple,
      iconBg: "#000",
      iconColor: "#fff",
      title:"YarnHive for iPhone",
      subtitle:"The full YarnHive experience in your pocket — coming to the App Store.",
      gradient: null,
      features:[
        {label:"Camera-first Hive Vision",sub:"Point, tap, get a pattern — right from your camera"},
        {label:"Row reminders",sub:"Never lose your place with smart row notifications"},
        {label:"Offline mode",sub:"Access your patterns anywhere, no signal needed"},
        {label:"Seamless sync",sub:"Start on web, continue on mobile — everything syncs"},
      ],
      cta:"Notify me when it's live",
      ctaAction: "notify",
      badge:"Coming Soon",
      footnote:"Be first in line — we'll email you the day it launches.",
    },
    android: {
      icon: ICON.googleplay,
      iconBg: "#fff",
      iconColor: "#000",
      title:"YarnHive for Android",
      subtitle:"Everything iPhone gets, built natively for Android — coming to Google Play.",
      gradient: null,
      features:[
        {label:"Native camera scanner",sub:"Hive Vision built right into the Android experience"},
        {label:"Row reminders",sub:"Smart notifications keep you on track"},
        {label:"Offline mode",sub:"Your patterns are always available, signal or not"},
        {label:"Cross-device sync",sub:"Web, iOS, Android — one hive everywhere"},
      ],
      cta:"Notify me when it's live",
      ctaAction: "notify",
      badge:"Coming Soon",
      footnote:"We'll let you know the moment it hits Google Play.",
    },
  };

  const [activeModal, setActiveModal] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const modal = activeModal ? MODALS[activeModal] : null;

  // Swipe-to-close state
  const swipeStartY = useRef(null);
  const sheetRef = useRef(null);

  const closeModal = () => { setActiveModal(null); setNotifyEmail(''); setNotifySubmitted(false); setNotifyLoading(false); };

  const handleSwipeStart = e => { swipeStartY.current = e.touches?.[0]?.clientY ?? null; };
  const handleSwipeMove = e => {
    if (swipeStartY.current === null || !sheetRef.current) return;
    const dy = (e.touches?.[0]?.clientY ?? 0) - swipeStartY.current;
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const handleSwipeEnd = e => {
    if (swipeStartY.current === null || !sheetRef.current) return;
    const dy = (e.changedTouches?.[0]?.clientY ?? 0) - swipeStartY.current;
    if (dy > 80) { closeModal(); }
    else { sheetRef.current.style.transform = 'translateY(0)'; sheetRef.current.style.transition = 'transform .25s ease'; setTimeout(()=>{ if(sheetRef.current) sheetRef.current.style.transition = ''; }, 250); }
    swipeStartY.current = null;
  };

  const handleNotifySubmit = async () => {
    if (!notifyEmail.trim() || !notifyEmail.includes('@')) return;
    setNotifyLoading(true);
    try {
      await fetch('https://vbtsdyxvqqwxjzpuseaf.supabase.co/functions/v1/waitlist', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({email: notifyEmail.trim().toLowerCase(), platform: activeModal}),
      });
    } catch(e) { console.error('Waitlist:', e); }
    setNotifyLoading(false);
    setNotifySubmitted(true);
  };

  const handleModalCTA = () => {
    if (modal.ctaAction === 'signup') { closeModal(); setScreen('signup'); }
  };

  const WelcomeCard = () => (
    <div style={CARD_STYLE}>

      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:9,background:"rgba(184,90,60,.09)",borderRadius:14,padding:"7px 16px",border:"1px solid rgba(184,90,60,.18)"}}>
          <span style={{fontSize:18}}>🐝</span>
          <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink,letterSpacing:"-.02em",lineHeight:1}}>YarnHive</div>
        </div>
      </div>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontFamily:T.serif,fontSize:isDesktop?34:28,fontWeight:700,color:T.ink,lineHeight:1.05,letterSpacing:"-.025em",marginBottom:8}}>
          The pattern<br/>
          <span style={{fontStyle:"italic",fontWeight:400,color:T.terra}}>you've been</span><br/>
          looking for.
        </div>
        <p style={{fontSize:13,color:T.ink3,lineHeight:1.65,fontWeight:300,margin:0}}>Save every pattern. Track every row.<br/>Scan anything with Hive Vision.</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
        <button onClick={()=>setScreen("signup")} style={{width:"100%",background:`linear-gradient(135deg,${T.terra} 0%,#7A2E14 100%)`,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 28px rgba(184,90,60,.5), 0 1px 0 rgba(255,255,255,.2) inset",letterSpacing:".01em",transition:"transform .15s,box-shadow .15s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 14px 36px rgba(184,90,60,.6), 0 1px 0 rgba(255,255,255,.2) inset";}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 8px 28px rgba(184,90,60,.5), 0 1px 0 rgba(255,255,255,.2) inset";}}>Create free account</button>
        <button onClick={()=>setScreen("signin")} style={{width:"100%",background:"rgba(255,255,255,0.55)",color:T.ink,border:"1px solid rgba(255,255,255,0.7)",borderRadius:14,padding:"14px",fontSize:14,fontWeight:500,cursor:"pointer",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",boxShadow:"0 2px 8px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,.6) inset",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.82)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.55)";}}>Sign in</button>
        <button onClick={onEnter} style={{background:"none",border:"none",color:"rgba(92,79,68,0.6)",fontSize:12,cursor:"pointer",padding:"2px 0"}}>Continue without account →</button>
      </div>
      <div style={{height:"1px",background:"rgba(28,23,20,.07)",margin:"2px 0 14px"}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:2}}>
        <div onClick={()=>setActiveModal('free')} style={{background:"rgba(244,237,227,0.75)",backdropFilter:"blur(8px)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.6)",textAlign:"center",cursor:"pointer",transition:"transform .15s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
          <div style={{fontFamily:T.serif,fontSize:20,color:T.terra,fontWeight:700,lineHeight:1}}>Free</div>
          <div style={{fontSize:10,color:T.ink3,marginTop:4,lineHeight:1.4}}>5 patterns<br/>All core features</div>
          <div style={{fontSize:9,color:T.terra,marginTop:6,fontWeight:600,letterSpacing:".05em"}}>SEE WHAT'S INCLUDED →</div>
        </div>
        <div onClick={()=>setActiveModal('pro')} style={{background:`linear-gradient(145deg,${T.terra},#6B2410)`,borderRadius:14,padding:"12px 14px",textAlign:"center",boxShadow:"0 6px 20px rgba(184,90,60,.5)",position:"relative",overflow:"hidden",cursor:"pointer",transition:"transform .15s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(135deg,rgba(255,255,255,0) 30%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0) 70%)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:10,right:-20,background:"rgba(255,255,255,0.18)",padding:"3px 28px",transform:"rotate(35deg)",fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:".06em",whiteSpace:"nowrap"}}>HIVE VISION</div>
          <div style={{fontFamily:T.serif,fontSize:20,color:"#fff",fontWeight:700,lineHeight:1,position:"relative"}}>Pro</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:4,lineHeight:1.4,position:"relative"}}>$9.99/mo<br/>Unlimited everything</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,.75)",marginTop:6,fontWeight:600,letterSpacing:".05em",position:"relative"}}>SEE WHAT'S INCLUDED →</div>
        </div>
      </div>
      <Badges onBadgeClick={setActiveModal}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,paddingTop:12,borderTop:"1px solid rgba(28,23,20,.06)"}}>
        <span style={{fontSize:9,color:T.ink3,opacity:.4,letterSpacing:".06em"}}>{APP_VERSION}</span>
        <button onClick={onEnterAsPro} style={{background:"rgba(92,122,94,.12)",border:"1px solid rgba(92,122,94,.22)",borderRadius:7,padding:"4px 11px",fontSize:10,color:T.sage,cursor:"pointer",fontWeight:500}}>🔑 Dev</button>
      </div>
    </div>
  );

  const FormCard = () => (
    <div style={CARD_STYLE}>
      <button onClick={()=>setScreen("welcome")} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:13,fontWeight:600,padding:0,marginBottom:24,display:"flex",alignItems:"center",gap:6}}>← Back</button>
      <div style={{textAlign:"center",marginBottom:8}}>
        <div style={{fontFamily:T.serif,fontSize:26,color:T.ink,letterSpacing:"-.02em",fontWeight:700}}>{isSignup?"Create account":"Welcome back"}</div>
        <p style={{fontSize:13,color:T.ink3,marginTop:4,fontWeight:300}}>{isSignup?"Start your pattern collection":"Your hive is waiting"}</p>
      </div>
      <div style={{marginTop:20}}>
        {isSignup&&<Field label="Your name" placeholder="e.g. Sarah" value={name} onChange={e=>setName(e.target.value)}/>}
        <Field label="Email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
        <Field label="Password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} type="password"/>
        {!isSignup&&<div style={{textAlign:"right",marginBottom:16}}><span style={{fontSize:12,color:T.terra,cursor:"pointer",fontWeight:500}}>Forgot password?</span></div>}
        <button onClick={onEnter} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#7A2E14)`,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 24px rgba(184,90,60,.45)",marginTop:8}}>{isSignup?"Create my YarnHive":"Sign in"}</button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",fontFamily:T.sans,position:"relative",overflow:"hidden",background:"#0A0804"}}>
      <CSS/>
      <style>{`
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes modalPop { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes worldPan { from{transform:scale(1.06) translateY(-8px)} to{transform:scale(1) translateY(0)} }
        @keyframes cardRise { from{opacity:0;transform:translateY(28px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        .world-bg  { animation: worldPan 1.6s cubic-bezier(.22,.68,0,1.05) both; }
        .card-rise { animation: cardRise .6s cubic-bezier(.22,.68,0,1.05) .2s both; }
      `}</style>
      <div className="world-bg" style={{position:"fixed",inset:"-5%",zIndex:0}}>
        <img src={BG} alt="YarnHive world" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",filter:"saturate(1.25) brightness(0.92) contrast(1.05)"}}/>
        <div style={{position:"absolute",inset:0,background:isDesktop
          ?"radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.58) 100%)"
          :"radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.4) 100%)"
        }}/>
      </div>
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
        <BeeAnimator visible={!showForm && !activeModal} isDesktop={isDesktop}/>
        <div className="card-rise" style={{width:"100%",maxWidth:isDesktop?420:360}}>
          {showForm ? <FormCard/> : <WelcomeCard/>}
        </div>
      </div>
      {/* Modal — true viewport fixed, outside all card stacking contexts */}
      {modal && (
        <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:isDesktop?"center":"flex-end",justifyContent:"center"}} onClick={closeModal}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(10px)"}}/>
          <div
            ref={sheetRef}
            onClick={e=>e.stopPropagation()}
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            style={{
              position:"relative",
              background:"#FDFAF7",
              borderRadius: isDesktop ? 20 : "22px 22px 0 0",
              width: isDesktop ? "min(480px, 90vw)" : "100%",
              maxHeight: isDesktop ? "min(640px, 85vh)" : "88vh",
              display:"flex",
              flexDirection:"column",
              zIndex:1,
              boxShadow: isDesktop ? "0 24px 80px rgba(0,0,0,0.4)" : "0 -12px 48px rgba(0,0,0,0.28)",
              overflow:"hidden",
              animation: isDesktop ? "modalPop .25s cubic-bezier(.22,.68,0,1.05) both" : "sheetUp .3s cubic-bezier(.22,.68,0,1.05) both",
            }}
          >
            {/* Handle row */}
            <div style={{flexShrink:0,height:44,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",borderBottom:`1px solid rgba(28,23,20,0.06)`}}>
              <div style={{width:36,height:4,background:"rgba(28,23,20,0.15)",borderRadius:99}}/>
              <button onClick={closeModal} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",width:30,height:30,borderRadius:"50%",background:"rgba(28,23,20,0.07)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(28,23,20,0.45)",lineHeight:1}}>×</button>
            </div>
            {/* Content */}
            <div style={{flex:1,overflowY:"auto",padding:"20px 20px 48px"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:22}}>
                <div style={{
                  width:56,height:56,borderRadius:16,flexShrink:0,
                  background:modal.iconBg||"rgba(184,90,60,0.12)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:modal.iconColor||"#B85A3C",
                  border: modal.iconBg==="#fff" ? "1px solid rgba(28,23,20,0.1)" : "none",
                  boxShadow: (modal.iconBg==="#000") ? "0 6px 20px rgba(0,0,0,0.4)" : "0 6px 20px rgba(184,90,60,0.25)",
                  overflow:"hidden",
                }}>
                  {typeof modal.icon === 'string'
                    ? <span style={{fontSize:28}}>{modal.icon}</span>
                    : <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>{modal.icon}</span>
                  }
                </div>
                <div style={{flex:1,minWidth:0,paddingTop:2}}>
                  {modal.badge&&(
                    <div style={{display:"inline-flex",alignItems:"center",background:"rgba(184,90,60,0.1)",borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,color:"#B85A3C",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>
                      {modal.badge}
                    </div>
                  )}
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#1C1714",lineHeight:1.15,marginBottom:4}}>{modal.title}</div>
                  <div style={{fontSize:13,color:"rgba(28,23,20,0.5)",lineHeight:1.55,fontWeight:300}}>{modal.subtitle}</div>
                </div>
              </div>
              {/* Features — clean iOS grouped list style */}
              <div style={{background:"rgba(244,237,227,0.6)",borderRadius:14,overflow:"hidden",border:"1px solid rgba(28,23,20,0.07)",marginBottom:20}}>
                {modal.features.map((f,i)=>(
                  <div key={i} style={{padding:"12px 16px",borderBottom: i<modal.features.length-1 ? "1px solid rgba(28,23,20,0.07)" : "none"}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#1C1714",lineHeight:1.2,marginBottom:2}}>{f.label}</div>
                    <div style={{fontSize:12,color:"rgba(28,23,20,0.48)",lineHeight:1.5}}>{f.sub}</div>
                  </div>
                ))}
              </div>
              {/* CTA */}
              {modal.ctaAction === 'notify' ? (
                notifySubmitted ? (
                  <div style={{background:"rgba(92,122,94,0.1)",borderRadius:14,padding:"20px 16px",textAlign:"center"}}>
                    <div style={{fontSize:28,marginBottom:8}}>🎉</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#5C7A5E",marginBottom:4}}>You're on the list!</div>
                    <div style={{fontSize:12,color:"rgba(28,23,20,0.5)",lineHeight:1.6}}>We'll email you the day it launches. Thanks for your support.</div>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#1C1714",marginBottom:10}}>Get notified when we launch</div>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <input
                        value={notifyEmail}
                        onChange={e=>setNotifyEmail(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&handleNotifySubmit()}
                        placeholder="your@email.com"
                        type="email"
                        style={{flex:1,padding:"13px 14px",background:"rgba(244,237,227,0.8)",border:"1.5px solid rgba(28,23,20,0.12)",borderRadius:12,fontSize:14,color:"#1C1714",outline:"none",fontFamily:"inherit"}}
                        onFocus={e=>e.target.style.borderColor="#B85A3C"}
                        onBlur={e=>e.target.style.borderColor="rgba(28,23,20,0.12)"}
                      />
                      <button
                        onClick={handleNotifySubmit}
                        disabled={notifyLoading||!notifyEmail.includes('@')}
                        style={{background:"linear-gradient(135deg,#B85A3C,#7A2E14)",color:"#fff",border:"none",borderRadius:12,padding:"0 18px",fontSize:14,fontWeight:600,cursor:notifyEmail.includes('@')?"pointer":"not-allowed",opacity:notifyEmail.includes('@')?1:0.45,transition:"opacity .15s",whiteSpace:"nowrap",height:48}}
                      >
                        {notifyLoading ? '...' : 'Notify me'}
                      </button>
                    </div>
                    {modal.footnote&&<div style={{fontSize:11,color:"rgba(28,23,20,0.4)",lineHeight:1.5}}>{modal.footnote}</div>}
                  </div>
                )
              ) : (
                <>
                  <button onClick={handleModalCTA} style={{width:"100%",background:"linear-gradient(135deg,#B85A3C,#7A2E14)",color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 24px rgba(184,90,60,0.35)",marginBottom:modal.ctaAlt?8:0}}>{modal.cta}</button>
                  {modal.ctaAlt&&<button onClick={()=>{closeModal();setScreen('signup');}} style={{width:"100%",background:"rgba(244,237,227,0.8)",border:"1.5px solid rgba(28,23,20,0.1)",borderRadius:14,padding:"13px",fontSize:13,fontWeight:500,color:"rgba(28,23,20,0.7)",cursor:"pointer"}}>{modal.ctaAlt}</button>}
                  {modal.footnote&&<div style={{textAlign:"center",marginTop:10,fontSize:11,color:"rgba(28,23,20,0.4)"}}>{modal.footnote}</div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const STITCH_DICT = {
  "SC":{full:"Single Crochet",url:"https://www.youtube.com/watch?v=JhBBqGBYAHo"},
  "HDC":{full:"Half Double Crochet",url:"https://www.youtube.com/watch?v=Ej-HjuFGUyQ"},
  "DC":{full:"Double Crochet",url:"https://www.youtube.com/watch?v=E4SqvLk0BPI"},
  "TR":{full:"Treble Crochet",url:"https://www.youtube.com/watch?v=6VNbHiHKntY"},
  "SL ST":{full:"Slip Stitch",url:"https://www.youtube.com/watch?v=sGnKTTPvFDA"},
  "SS":{full:"Slip Stitch",url:"https://www.youtube.com/watch?v=sGnKTTPvFDA"},
  "CH":{full:"Chain Stitch",url:"https://www.youtube.com/watch?v=fHAMQBhy09g"},
  "INC":{full:"Increase (2 sc in same st)",url:"https://www.youtube.com/watch?v=IQYHE6jt3_4"},
  "DEC":{full:"Decrease",url:"https://www.youtube.com/watch?v=QYbMPbcqQbE"},
  "SC2TOG":{full:"Single Crochet 2 Together",url:"https://www.youtube.com/watch?v=QYbMPbcqQbE"},
  "MR":{full:"Magic Ring",url:"https://www.youtube.com/watch?v=bUyaQiTOmVA"},
  "MC":{full:"Magic Circle",url:"https://www.youtube.com/watch?v=bUyaQiTOmVA"},
  "FO":{full:"Fasten Off",url:"https://www.youtube.com/watch?v=5w9hr_KNOBU"},
  "BLO":{full:"Back Loop Only",url:"https://www.youtube.com/watch?v=WP2grOxSdz0"},
  "FLO":{full:"Front Loop Only",url:"https://www.youtube.com/watch?v=WP2grOxSdz0"},
  "YO":{full:"Yarn Over",url:"https://www.youtube.com/watch?v=S0jxQ0vaMZk"},
  "PM":{full:"Place Marker",url:"https://www.youtube.com/watch?v=kHhBaJFDmgE"},
  "SM":{full:"Slip Marker",url:"https://www.youtube.com/watch?v=kHhBaJFDmgE"},
};
const ABBR_PATTERN=new RegExp("\\b("+Object.keys(STITCH_DICT).sort((a,b)=>b.length-a.length).map(k=>k.replace(/\s+/g,"\\s+")).join("|")+")\\b","gi");
const findNewAbbr=(text,seenAbbr)=>{
  const found=[],regex=new RegExp(ABBR_PATTERN.source,"gi");let match;
  while((match=regex.exec(text))!==null){const raw=match[0].toUpperCase().replace(/\s+/g," ");const info=STITCH_DICT[raw];if(!info)continue;if(!seenAbbr.has(raw)){seenAbbr.add(raw);found.push({raw,...info});}}
  return found;
};

const BrowseSitesView = ({onSavePattern}) => {
  const{isDesktop}=useBreakpoint();
  const [activeSite,setActiveSite]=useState(null),[currentUrl,setCurrentUrl]=useState(""),[importing,setImporting]=useState(false),[importErr,setImportErr]=useState(null),[importOk,setImportOk]=useState(false);
  const iframeRef=useRef(null);
  const SITES=[
    {name:"AllFreeCrochet",desc:"The largest free crochet pattern library.",url:"https://www.allfreecrochet.com",tags:["Blankets","Amigurumi","Wearables"],free:true,photo:PILL[4]},
    {name:"Drops Design",desc:"Free international patterns.",url:"https://www.garnstudio.com",tags:["Garments","Accessories"],free:true,photo:PILL[0]},
    {name:"Yarnspirations",desc:"Official home of Caron and Bernat patterns.",url:"https://www.yarnspirations.com/collections/crochet-patterns",tags:["Beginner","Blankets"],free:true,photo:PILL[3]},
    {name:"Sarah Maker",desc:"Modern, well-photographed patterns.",url:"https://sarahmaker.com/crochet-patterns/",tags:["Modern","Beginner","Amigurumi"],free:true,photo:PILL[2]},
    {name:"Hopeful Honey",desc:"Beloved amigurumi patterns.",url:"https://www.hopefulhoney.com/p/free-crochet-patterns.html",tags:["Amigurumi","Toys"],free:true,photo:PILL[5]},
    {name:"The Woobles",desc:"Amigurumi kits and free beginner tutorials.",url:"https://thewoobles.com/pages/free-crochet-patterns",tags:["Amigurumi","Beginner"],free:true,photo:PILL[1]},
    {name:"Ravelry",desc:"World's largest pattern database.",url:"https://www.ravelry.com/patterns/library#craft=crochet",tags:["All categories","Free + Paid"],free:false,photo:PILL[0],note:"Log in on your device, then browse and save any pattern."},
    {name:"LoveCrafts",desc:"Quality free and paid patterns.",url:"https://www.lovecrafts.com/en-us/l/crochet/crochet-patterns?price=free",tags:["Garments","Modern"],free:false,photo:PILL[2]},
  ];
  const handleIframeLoad=()=>{try{const u=iframeRef.current?.contentWindow?.location?.href;if(u&&u!=="about:blank"){setCurrentUrl(u);setImportErr(null);setImportOk(false);}}catch(e){}};
  const closeSite=()=>{setActiveSite(null);setCurrentUrl("");setImportErr(null);setImportOk(false);};
  const doImport=async()=>{
    const urlToImport=currentUrl||activeSite?.url; if(!urlToImport) return;
    setImporting(true);setImportErr(null);setImportOk(false);
    try{
      const res=await fetch("/api/fetch-pattern",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:urlToImport})});
      const data=await res.json(); if(!res.ok||data.error) throw new Error(data.error||"Could not read that page");
      const rows=(data.rows||[]).map((r,i)=>({id:Date.now()+i,text:r.text,done:false,note:""}));
      onSavePattern&&onSavePattern({id:Date.now(),photo:data.thumbnail_url||PILL[Math.floor(Math.random()*PILL.length)],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},...data,rows});
      setImportOk(true); setTimeout(closeSite,1800);
    }catch(e){setImportErr("Couldn't read this page. Try navigating directly to the pattern and tapping Save again.");}
    finally{setImporting(false);}
  };
  if(activeSite) return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column",background:T.bg}}>
      <div style={{background:"#1C1714",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={closeSite} style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,color:"#fff",cursor:"pointer",flexShrink:0}}>← Back</button>
        <div style={{flex:1,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 12px",display:"flex",alignItems:"center",gap:7,minWidth:0}}><span style={{fontSize:10,color:"rgba(255,255,255,.4)",flexShrink:0}}>🌐</span><div style={{fontSize:11,color:"rgba(255,255,255,.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,fontFamily:"monospace"}}>{currentUrl||activeSite.url}</div></div>
        <button onClick={()=>window.open(currentUrl||activeSite.url,"_blank","noopener,noreferrer")} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"8px 10px",fontSize:15,cursor:"pointer",flexShrink:0,color:"rgba(255,255,255,.7)"}}>↗</button>
      </div>
      <div style={{background:"rgba(28,23,20,.06)",borderBottom:`1px solid ${T.border}`,padding:"5px 14px",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
        <div style={{width:6,height:6,borderRadius:99,background:T.terra,flexShrink:0}}/><div style={{fontSize:10,color:T.ink3,fontWeight:500}}>Browsing {activeSite.name} inside YarnHive</div><div style={{flex:1}}/><div style={{fontSize:10,color:T.ink3,opacity:.6}}>Tap "Save This Pattern" when ready</div>
      </div>
      <div style={{flex:1,position:"relative",overflow:"hidden"}}><iframe ref={iframeRef} src={activeSite.url} onLoad={handleIframeLoad} style={{width:"100%",height:"100%",border:"none"}} title={activeSite.name} sandbox="allow-scripts allow-same-origin allow-forms allow-popups"/></div>
      <div style={{background:T.surface,borderTop:`2px solid ${T.terra}`,padding:"12px 16px",flexShrink:0}}>
        {activeSite.note&&<div style={{fontSize:11,color:T.terra,marginBottom:8,display:"flex",gap:6,alignItems:"flex-start"}}><span style={{flexShrink:0}}>ℹ️</span><span>{activeSite.note}</span></div>}
        {importOk?<div style={{background:T.sageLt,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>✅</span><div style={{fontSize:13,fontWeight:600,color:T.sage}}>Pattern saved to Your Hive!</div></div>
        :<><button onClick={doImport} disabled={importing} style={{width:"100%",background:importing?T.ink3:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:14,padding:"15px 20px",fontSize:15,fontWeight:700,cursor:importing?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:importing?"none":"0 4px 20px rgba(184,90,60,.4)",transition:"all .15s",marginBottom:6}}>{importing?<><div className="spinner" style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%"}}/> Reading pattern…</>:<><span style={{fontSize:18}}>🧶</span> Save This Pattern</>}</button>
        <div style={{fontSize:10,color:T.ink3,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 8px"}}>{currentUrl&&currentUrl!==activeSite.url?"Will import: "+currentUrl:"Navigate to a pattern page, then tap Save"}</div>
        {importErr&&<div style={{marginTop:8,background:"#FFF0EE",borderRadius:8,padding:"8px 12px",border:"1px solid #F5C6BB"}}><div style={{fontSize:12,color:"#C0392B"}}>{importErr}</div></div>}</>}
      </div>
    </div>
  );
  return (
    <div style={{padding:isDesktop?"24px 0 80px":"16px 18px 100px"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:13,color:T.ink2,lineHeight:1.7}}>Choose a source below. Browse for a pattern, then paste its URL to import it directly into your collection.</div></div>
      <div style={{display:"grid",gap:14,gridTemplateColumns:isDesktop?"1fr 1fr":"1fr"}}>
        {SITES.map(s=>(
          <div key={s.name} style={{background:T.surface,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 2px 8px rgba(28,23,20,.05)"}}>
            <div style={{height:110,position:"relative",overflow:"hidden"}}><Photo src={s.photo} alt={s.name} style={{width:"100%",height:"100%"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.75) 0%,transparent 60%)"}}/>
              <div style={{position:"absolute",bottom:10,left:12,right:12,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}><div style={{fontFamily:T.serif,fontSize:17,fontWeight:700,color:"#fff"}}>{s.name}</div><div style={{background:s.free?"rgba(92,122,94,.9)":"rgba(184,90,60,.9)",borderRadius:7,padding:"3px 8px",fontSize:10,fontWeight:700,color:"#fff"}}>{s.free?"FREE":"FREE + PAID"}</div></div>
            </div>
            <div style={{padding:"12px 14px"}}>
              <div style={{fontSize:12,color:T.ink2,lineHeight:1.6,marginBottom:8}}>{s.desc}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{s.tags.map(t=><div key={t} style={{background:T.linen,borderRadius:99,padding:"2px 9px",fontSize:10,color:T.ink2,border:`1px solid ${T.border}`}}>{t}</div>)}</div>
              <button onClick={()=>setActiveSite(s)} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span>🌐</span> Browse {s.name}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PatternCard = ({p,onClick,delay=0}) => {
  const done=pct(p);
  return (
    <div className="card fu" onClick={onClick} style={{background:T.surface,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",animationDelay:delay+"s"}}>
      <div style={{position:"relative",height:160,overflow:"hidden",background:T.linen}}>
        <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center center"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.5) 0%,transparent 55%)"}}/>
        {done===100&&<div style={{position:"absolute",top:10,right:10,background:T.sage,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99,letterSpacing:".07em"}}>DONE</div>}
        {done>0&&done<100&&<div style={{position:"absolute",top:10,right:10,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{done}%</div>}
        {done>0&&done<100&&<div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={done} color="rgba(255,255,255,.8)" h={3} bg="transparent"/></div>}
        {p.snapConfidence&&<div style={{position:"absolute",top:10,left:10,background:"rgba(184,90,60,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99}}>🐝 {p.snapConfidence}%</div>}
      </div>
      <div style={{padding:"12px 14px 16px"}}>
        <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:3}}>{p.cat}</div>
        <div style={{fontFamily:T.serif,fontSize:15,fontWeight:500,color:T.ink,lineHeight:1.3,marginBottom:7}}>{p.title}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Stars val={p.rating} ro/><span style={{fontSize:11,color:T.ink3}}>{p.source}</span></div>
      </div>
    </div>
  );
};

const ShelfCard = ({p,onClick}) => {
  const v=pct(p);
  return (
    <div onClick={onClick} style={{width:160,borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,background:T.surface,cursor:"pointer",boxShadow:"0 2px 8px rgba(28,23,20,.06)",transition:"transform .16s,box-shadow .16s",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(28,23,20,.12)";}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(28,23,20,.06)";}}>
      <div style={{height:100,position:"relative",background:T.linen,overflow:"hidden"}}><Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center center"}}/><div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={v} color={T.terra} h={3} bg="rgba(0,0,0,.2)"/></div></div>
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
      {showHint&&<div className="mobile-swipe-hint" style={{position:"absolute",right:0,top:0,bottom:8,width:80,background:"linear-gradient(to left,rgba(244,237,227,.98) 0%,transparent 100%)",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:12}}><div style={{background:"rgba(28,23,20,.1)",borderRadius:99,padding:"4px 10px",fontSize:11,color:T.ink2,display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:12}}>←</span> swipe</div></div>}
    </div>
  );
};

const ScaleModal = ({pattern,onClose}) => {
  const orig=pattern.dimensions||{width:50,height:60},origGauge=pattern.gauge||{stitches:12,rows:16,size:4};
  const [newW,setNewW]=useState(String(orig.width)),[newH,setNewH]=useState(String(orig.height)),[gSt,setGSt]=useState(String(origGauge.stitches)),[gRo,setGRo]=useState(String(origGauge.rows));
  const scaleW=parseFloat(newW)/orig.width||1,scaleH=parseFloat(newH)/orig.height||1;
  const scaledYardage=Math.ceil((pattern.yardage||1000)*scaleW*scaleH),scaledSkeins=Math.ceil(scaledYardage/(pattern.skeinYards||200));
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(28,23,20,.6)",display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"85vh",overflow:"auto",padding:"24px 22px 40px"}}>
        <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:4}}>Pattern Scaling</div>
        <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Adjust dimensions to automatically recalculate stitch counts and yardage.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {[["New Width (in)",newW,setNewW],["New Height (in)",newH,setNewH]].map(([label,val,set])=>(
            <div key={label}><div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:16,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/></div>
          ))}
        </div>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:20}}>
          <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:12}}>Gauge (per 4 inches)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[["Stitches",gSt,setGSt],["Rows",gRo,setGRo]].map(([label,val,set])=>(
              <div key={label}><div style={{fontSize:11,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>
            ))}
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",marginBottom:20,border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:12}}>Scaled Results</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Starting stitches",Math.round((parseFloat(gSt)||12)/4*parseFloat(newW)||0)],["Total rows",Math.round((parseFloat(gRo)||16)/4*parseFloat(newH)||0)],["Yardage needed","~"+scaledYardage+" yds"],["Skeins needed",scaledSkeins+" skeins"],["Scale W",(scaleW*100).toFixed(0)+"%"],["Scale H",(scaleH*100).toFixed(0)+"%"]].map(([label,val])=>(
              <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:18,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>
            ))}
          </div>
        </div>
        <div style={{fontSize:12,color:T.ink3,textAlign:"center",marginBottom:16,lineHeight:1.6}}>Original: {orig.width}" x {orig.height}" · {pattern.yardage||1000} yards</div>
        <Btn onClick={onClose} variant="secondary">Close</Btn>
      </div>
    </div>
  );
};

const ShareCardModal = ({pattern,onClose}) => {
  const done=pct(pattern),isComplete=done===100;
  const [caption,setCaption]=useState(isComplete?"Just finished \""+pattern.title+"\"! 🧶 So happy with how this turned out.":"Working on \""+pattern.title+"\" — "+done+"% done! 🪡 Making progress!");
  const [shared,setShared]=useState(false);
  const shareText=caption+"\n\nMade with YarnHive 📱 #crochet #yarnhive #crochetlife";
  const doShare=async(platformId)=>{
    if(platformId==="native"){if(navigator.share){try{await navigator.share({title:pattern.title,text:shareText,url:"https://yarnhive.app"});setShared(true);}catch(e){}}else{navigator.clipboard?.writeText(shareText);setShared(true);}}
    else{const e=encodeURIComponent(shareText),u=encodeURIComponent("https://yarnhive.app");const urls={twitter:"https://twitter.com/intent/tweet?text="+e,facebook:"https://www.facebook.com/sharer/sharer.php?u="+u+"&quote="+e,pinterest:"https://pinterest.com/pin/create/button/?description="+e+"&url="+u,instagram:"https://www.instagram.com/"};window.open(urls[platformId],"_blank","noopener,noreferrer,width=600,height=500");setShared(true);}
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div className="dim-in" style={{position:"absolute",inset:0,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)"}}/>
      <div className="su" onClick={e=>e.stopPropagation()} style={{position:"relative",background:T.surface,borderRadius:"24px 24px 0 0",width:"100%",padding:"24px 22px 48px",zIndex:1}}>
        <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 20px"}}/>
        <div style={{background:`linear-gradient(135deg,${T.terra},#6B2A10)`,borderRadius:18,padding:"20px",marginBottom:16,position:"relative",overflow:"hidden"}}>
          <div style={{position:"relative"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>{isComplete?"🎉 Finished Object":"🪡 In Progress — "+done+"%"}</div>
            <div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:"#fff",marginBottom:4,lineHeight:1.2}}>{pattern.title}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.65)",marginBottom:12}}>{[pattern.hook&&"Hook "+pattern.hook,pattern.weight,pattern.cat].filter(Boolean).join(" · ")}</div>
            {!isComplete&&<div style={{background:"rgba(255,255,255,.15)",borderRadius:99,height:6,overflow:"hidden",marginBottom:10}}><div style={{width:done+"%",height:"100%",background:"#fff",borderRadius:99}}/></div>}
            {isComplete&&<div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.2)",borderRadius:99,padding:"5px 12px",fontSize:12,color:"#fff",fontWeight:600}}>✓ Complete</div>}
            <div style={{marginTop:12,fontSize:10,color:"rgba(255,255,255,.4)",letterSpacing:".08em"}}>YARNHIVE · yarnhive.app</div>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Your caption</div>
          <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} style={{width:"100%",padding:"12px 14px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,fontSize:13,color:T.ink,resize:"none",outline:"none",lineHeight:1.6,fontFamily:T.sans}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        </div>
        {shared?<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:28,marginBottom:8}}>🎉</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Shared!</div><div style={{fontSize:13,color:T.ink3,marginBottom:16}}>Your progress is out in the world.</div><Btn onClick={onClose} variant="secondary">Done</Btn></div>
        :<><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>{[{id:"instagram",label:"Instagram",icon:"📸"},{id:"pinterest",label:"Pinterest",icon:"📌"},{id:"facebook",label:"Facebook",icon:"👥"},{id:"twitter",label:"X / Twitter",icon:"✖️"}].map(pl=><button key={pl.id} onClick={()=>doShare(pl.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:500,color:T.ink}}><span style={{fontSize:16}}>{pl.icon}</span>{pl.label}</button>)}</div>
        <Btn onClick={()=>doShare("native")}>📤 Share via...</Btn><div style={{marginTop:8}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></>}
      </div>
    </div>
  );
};

const Detail = ({p,onBack,onSave}) => {
  const [rows,setRows]=useState(p.rows),[tab,setTab]=useState("materials"),[newRow,setNewRow]=useState(""),[editing,setEditing]=useState(false),[draft,setDraft]=useState({...p}),[showScale,setShowScale]=useState(false),[noteEdit,setNoteEdit]=useState(null),[showShare,setShowShare]=useState(false),[milestone,setMilestone]=useState(null);
  const prevDone=useRef(pct({...p,rows:p.rows}));
  const{isDesktop}=useBreakpoint();
  const done=pct({...p,rows}),currentRowIdx=rows.findIndex(r=>!r.done);
  const toggle=id=>{const next=rows.map(r=>r.id===id?{...r,done:!r.done}:r);setRows(next);onSave({...p,rows:next});const newDone=pct({...p,rows:next}),prev=prevDone.current;for(const m of [25,50,75,100]){if(prev<m&&newDone>=m){setMilestone(m);break;}}prevDone.current=newDone;};
  const addRow=()=>{if(!newRow.trim())return;const next=[...rows,{id:Date.now(),text:newRow.trim(),done:false,note:""}];setRows(next);onSave({...p,rows:next});setNewRow("");};
  const save=()=>{onSave({...draft,rows});setEditing(false);};
  const updateNote=(id,note)=>{const next=rows.map(r=>r.id===id?{...r,note}:r);setRows(next);onSave({...p,rows:next});};
  const yardDisplay=estYards(p)>0?"~"+estYards(p)+(p.yardage>0?" yds":" yds (est.)"):"Not listed";
  const skeinDisplay=estSkeins(p)>0?"~"+estSkeins(p)+(p.skeins>0?" skeins":" skeins (est.)"):"Not listed";
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg,overflow:"hidden"}}>
      <CSS/>
      {showScale&&<ScaleModal pattern={p} onClose={()=>setShowScale(false)}/>}
      {showShare&&<ShareCardModal pattern={{...p,rows}} onClose={()=>setShowShare(false)}/>}
      {milestone&&(
        <div className="su" style={{position:"fixed",top:0,left:0,right:0,zIndex:400,background:milestone===100?"linear-gradient(135deg,"+T.sage+",#2D4A2F)":"linear-gradient(135deg,"+T.terra+",#8B3A22)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:28}}>{milestone===100?"🎉":"🪡"}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{milestone===100?"Pattern complete!":milestone+"% done — keep going!"}</div><div style={{fontSize:12,color:"rgba(255,255,255,.75)",marginTop:2}}>Share your progress with your followers</div></div>
          <button onClick={()=>{setShowShare(true);setMilestone(null);}} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>Share 📤</button>
          <button onClick={()=>setMilestone(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,.6)",fontSize:18,cursor:"pointer",flexShrink:0,padding:"4px"}}>×</button>
        </div>
      )}
      {/* ── HERO: Hive Vision patterns get split photo+wireframe, others get clean fixed-height photo ── */}
      {p.snapConfidence&&p.snapComponents?.length ? (
        /* ── HIVE VISION SPLIT HERO ── */
        <div style={{flexShrink:0,background:"#1C1714",marginTop:milestone?56:0,transition:"margin .3s"}}>
          {/* top bar */}
          <div style={{position:"relative",zIndex:2,padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <button onClick={onBack} style={{background:"rgba(255,255,255,.12)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 16px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500}}>← Back</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowShare(true)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>📤 Share</button>
              <button onClick={()=>setShowScale(true)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>⚖️ Scale</button>
              <button onClick={()=>editing?save():setEditing(true)} style={{background:editing?T.terra:"rgba(255,255,255,.1)",border:"1px solid "+(editing?T.terra:"rgba(255,255,255,.15)"),borderRadius:10,padding:"7px 16px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>{editing?"Save":"Edit"}</button>
            </div>
          </div>
          {/* split panel */}
          <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 1fr":"1fr 1fr",height:isDesktop?340:240,position:"relative"}}>
            {/* left: photo — contain so full subject always visible */}
            <div style={{position:"relative",overflow:"hidden",background:"#0E0A08"}}>
              <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"contain",objectPosition:"center center"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(14,10,8,.85) 0%,transparent 45%)"}}/>
              <div style={{position:"absolute",bottom:14,left:14,right:0}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:3}}>{p.cat} · {p.weight}</div>
                {editing
                  ?<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} style={{width:"90%",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"5px 8px",color:"#fff",fontSize:16,fontFamily:T.serif,outline:"none"}}/>
                  :<div style={{fontFamily:T.serif,fontSize:isDesktop?20:15,fontWeight:700,color:"#fff",lineHeight:1.2,paddingRight:8}}>{p.title}</div>}
              </div>
              {/* Hive Vision badge */}
              <div style={{position:"absolute",top:10,left:10,background:"rgba(184,90,60,.9)",borderRadius:8,padding:"3px 9px",fontSize:9,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:4}}>
                🐝 Hive Vision · {p.snapConfidence}%
              </div>
            </div>
            {/* right: interactive wireframe */}
            <div style={{position:"relative",background:"#FAF7F3",borderLeft:"1px solid rgba(255,255,255,.08)"}}>
              <WireframeViewer components={p.snapComponents} labeled={true} fillContainer={true}/>
              <div style={{position:"absolute",top:10,right:10,background:"rgba(28,23,20,.55)",backdropFilter:"blur(6px)",borderRadius:8,padding:"3px 9px",fontSize:9,color:"rgba(255,255,255,.8)",fontWeight:600,pointerEvents:"none"}}>
                3D Component Map
              </div>
            </div>
          </div>
          {/* progress bar row */}
          <div style={{padding:"10px 18px 12px",background:"#1C1714"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}><Bar val={done} color={T.terra} h={3} bg="rgba(255,255,255,.15)"/></div>
              <span style={{color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,minWidth:36}}>{done}%</span>
              <span style={{color:"rgba(255,255,255,.35)",fontSize:11}}>{rows.filter(r=>r.done).length}/{rows.length} rows</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── STANDARD PHOTO HERO ── */
        <div style={{position:"relative",flexShrink:0,height:isDesktop?260:220,overflow:"hidden",background:T.linen,marginTop:milestone?56:0,transition:"margin .3s"}}>
          <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.92) 0%,rgba(20,14,10,.3) 50%,rgba(20,14,10,.05) 100%)"}}/>
          <div style={{position:"absolute",top:0,left:0,right:0,padding:"14px 18px",display:"flex",justifyContent:"space-between"}}>
            <button onClick={onBack} style={{background:"rgba(15,10,8,.45)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 16px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500}}>← Back</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowShare(true)} style={{background:"rgba(15,10,8,.45)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>📤 Share</button>
              <button onClick={()=>setShowScale(true)} style={{background:"rgba(15,10,8,.45)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>⚖️ Scale</button>
              <button onClick={()=>editing?save():setEditing(true)} style={{background:editing?T.terra:"rgba(15,10,8,.45)",backdropFilter:"blur(8px)",border:"1px solid "+(editing?T.terra:"rgba(255,255,255,.15)"),borderRadius:10,padding:"7px 16px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>{editing?"Save":"Edit"}</button>
            </div>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 20px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".09em",marginBottom:4}}>{p.cat} · Hook {p.hook} · {p.weight}</div>
            {editing
              ?<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} style={{width:"100%",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:19,fontFamily:T.serif,outline:"none"}}/>
              :<div style={{fontFamily:T.serif,fontSize:isDesktop?24:20,fontWeight:700,color:"#fff",lineHeight:1.2}}>{p.title}</div>}
            <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1}}><Bar val={done} color={T.terra} h={4} bg="rgba(255,255,255,.25)"/></div>
              <span style={{color:"#fff",fontSize:13,fontWeight:600,minWidth:36}}>{done}%</span>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:3}}>{rows.filter(r=>r.done).length} of {rows.length} rows complete</div>
          </div>
        </div>
      )}
      <div style={{display:"flex",background:T.surface,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        {[["materials","Materials"],["rows","Rows"],["notes","Notes"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"13px 0",border:"none",background:"transparent",color:tab===key?T.terra:T.ink3,fontWeight:tab===key?600:400,fontSize:13,cursor:"pointer",borderBottom:"2px solid "+(tab===key?T.terra:"transparent"),transition:"color .15s"}}>{label}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"4px 20px 36px",maxWidth:isDesktop?760:undefined,margin:isDesktop?"0 auto":undefined,width:"100%"}}>
        {tab==="materials"&&(<>
          {(editing?draft.materials:p.materials).map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:6,height:6,borderRadius:99,background:T.terra,flexShrink:0}}/>
              {editing?<div style={{display:"flex",gap:8,flex:1}}><input value={m.name} onChange={e=>{const a=[...draft.materials];a[i]={...a[i],name:e.target.value};setDraft({...draft,materials:a});}} style={{flex:1,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,background:T.linen,color:T.ink,outline:"none"}}/><input value={m.amount} onChange={e=>{const a=[...draft.materials];a[i]={...a[i],amount:e.target.value};setDraft({...draft,materials:a});}} style={{width:80,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,background:T.linen,color:T.ink,outline:"none"}}/></div>
              :<div style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,color:T.ink2}}>{m.name}</span><span style={{fontSize:12,color:T.ink3,fontWeight:600}}>{m.amount}</span></div>}
            </div>
          ))}
          {editing&&<button onClick={()=>setDraft({...draft,materials:[...draft.materials,{id:Date.now(),name:"",amount:"",yardage:0}]})} style={{marginTop:14,width:"100%",border:`1.5px dashed ${T.border}`,background:"none",borderRadius:11,padding:"10px",color:T.ink3,cursor:"pointer",fontSize:13}}>+ Add material</button>}
          <div style={{marginTop:20,background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:10}}>Yarn Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Total yardage",yardDisplay],["Skeins needed",skeinDisplay],["Hook size",p.hook||"??"],["Yarn weight",p.weight||"??"]].map(([label,val])=>(
                <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:16,fontWeight:700,fontFamily:T.serif,color:T.ink}}>{val}</div></div>
              ))}
            </div>
            <button onClick={()=>setShowScale(true)} style={{marginTop:12,width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>⚖️ Scale pattern to different size →</button>
          </div>
        </>)}
        {tab==="rows"&&(<>
          {(()=>{const seenAbbr=new Set();return rows.map((r,i)=>{const isCurrent=i===currentRowIdx,newAbbr=r.done?[]:findNewAbbr(r.text,seenAbbr);return(
            <div key={r.id} style={{borderBottom:`1px solid ${T.border}`}}>
              <div onClick={()=>toggle(r.id)} style={{display:"flex",gap:13,alignItems:"flex-start",cursor:"pointer",background:isCurrent?"rgba(184,90,60,.04)":"transparent",padding:"14px 8px",margin:"0 -8px"}}>
                <div style={{width:26,height:26,borderRadius:7,flexShrink:0,marginTop:1,background:r.done?T.terra:T.surface,border:"1.5px solid "+(r.done?T.terra:isCurrent?T.terra:T.border),display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:r.done?"0 2px 8px rgba(184,90,60,.3)":isCurrent?"0 0 0 3px rgba(184,90,60,.15)":"none"}}>
                  {r.done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}{!r.done&&isCurrent&&<div style={{width:8,height:8,borderRadius:99,background:T.terra}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  {isCurrent&&<div style={{fontSize:10,color:T.terra,fontWeight:600,letterSpacing:".06em",marginBottom:2}}>CURRENT ROW</div>}
                  {!isCurrent&&<div style={{fontSize:10,color:T.ink3,letterSpacing:".06em",marginBottom:2}}>ROW {i+1}</div>}
                  <div style={{fontSize:14,lineHeight:1.6,color:r.done?T.ink3:T.ink,textDecoration:r.done?"line-through":"none"}}>{r.text}</div>
                  {r.note&&<div style={{fontSize:12,color:T.ink3,fontStyle:"italic",marginTop:4}}>📝 {r.note}</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();setNoteEdit(noteEdit===r.id?null:r.id);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:"4px",color:r.note?T.terra:T.border,flexShrink:0}}>📝</button>
              </div>
              {newAbbr.length>0&&<div style={{padding:"0 8px 10px 47px",display:"flex",flexWrap:"wrap",gap:6}} onClick={e=>e.stopPropagation()}>{newAbbr.map(a=><button key={a.raw} onClick={e=>{e.stopPropagation();window.open(a.url,"_blank","noopener,noreferrer");}} style={{display:"flex",alignItems:"center",gap:5,background:"#FF0000",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(255,0,0,.3)"}}><span style={{fontSize:10}}>▶</span><span>{a.raw}</span><span style={{opacity:.8,fontWeight:400}}>— {a.full}</span></button>)}</div>}
              {noteEdit===r.id&&<div style={{padding:"0 8px 12px 47px"}}><input value={r.note} onChange={e=>updateNote(r.id,e.target.value)} placeholder="Add a note for this row…" style={{width:"100%",padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.terra}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}}/></div>}
            </div>
          );});})()}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <input value={newRow} onChange={e=>setNewRow(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRow()} placeholder="Add a row or step…" style={{flex:1,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"10px 14px",fontSize:13,color:T.ink,background:T.linen,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
            <button onClick={addRow} style={{background:T.terra,color:"#fff",border:"none",borderRadius:11,padding:"10px 18px",fontSize:22,cursor:"pointer",lineHeight:1,boxShadow:"0 4px 12px rgba(184,90,60,.35)"}}>+</button>
          </div>
        </>)}
        {tab==="notes"&&(
          <div style={{paddingTop:10}}>
            {editing?<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} style={{width:"100%",minHeight:140,border:`1.5px solid ${T.border}`,borderRadius:12,padding:14,fontSize:14,lineHeight:1.75,resize:"vertical",outline:"none",color:T.ink,background:T.linen}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
            :<p style={{fontFamily:T.serif,fontStyle:"italic",fontSize:15,color:T.ink2,lineHeight:1.9,paddingTop:4}}>{p.notes||"No notes yet. Tap Edit to add your thoughts."}</p>}
            <div style={{marginTop:20,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:12,color:T.ink3}}>Rating</span><Stars val={editing?draft.rating:p.rating} ro={!editing} onChange={v=>setDraft({...draft,rating:v})}/></div>
            <div style={{marginTop:10,fontSize:12,color:T.ink3}}>Source: {p.source}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const YarnStash = () => {
  const [stash,setStash]=useState(SEED_STASH),[adding,setAdding]=useState(false),[brand,setBrand]=useState(""),[name,setName]=useState(""),[weight,setWeight]=useState("Worsted"),[color,setColor]=useState(""),[yardage,setYardage]=useState(""),[skeins,setSkeins]=useState("1");
  const totalYards=stash.reduce((a,y)=>a+y.yardage*y.skeins,0);
  const addYarn=()=>{if(!brand||!name)return;setStash(p=>[...p,{id:Date.now(),brand,name,weight,color,colorCode:"#8A8278",yardage:parseInt(yardage)||0,skeins:parseInt(skeins)||1,used:0}]);setBrand("");setName("");setColor("");setYardage("");setSkeins("1");setAdding(false);};
  const{isDesktop:isD}=useBreakpoint();
  return (
    <div style={{padding:isD?"0 0 100px":"0 18px 100px"}}>
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        {[{label:"Total Skeins",val:stash.reduce((a,y)=>a+y.skeins,0)},{label:"Total Yardage",val:totalYards.toLocaleString()+" yds"},{label:"Yarn Types",val:stash.length}].map(s=>(
          <div key={s.label} style={{flex:1,background:T.surface,borderRadius:12,padding:"12px 10px",textAlign:"center",border:`1px solid ${T.border}`}}><div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.terra}}>{s.val}</div><div style={{fontSize:10,color:T.ink3,marginTop:2}}>{s.label}</div></div>
        ))}
      </div>
      <Btn onClick={()=>setAdding(!adding)} variant={adding?"secondary":"primary"} style={{marginBottom:16}}>{adding?"Cancel":"+ Add Yarn to Stash"}</Btn>
      {adding&&(
        <div className="fu" style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16,border:`1px solid ${T.border}`}}>
          <Field label="Brand" placeholder="e.g. Lion Brand" value={brand} onChange={e=>setBrand(e.target.value)}/>
          <Field label="Yarn Name" placeholder="e.g. Pound of Love" value={name} onChange={e=>setName(e.target.value)}/>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <div style={{flex:1}}><div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Weight</div><select value={weight} onChange={e=>setWeight(e.target.value)} style={{width:"100%",padding:"12px",background:"#fff",border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14}}>{["Lace","Fingering","Sport","DK","Worsted","Bulky","Super Bulky"].map(w=><option key={w}>{w}</option>)}</select></div>
            <div style={{flex:1}}><Field label="Color Name" placeholder="Antique White" value={color} onChange={e=>setColor(e.target.value)}/></div>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <div style={{flex:1}}><Field label="Yds per Skein" placeholder="315" value={yardage} onChange={e=>setYardage(e.target.value)}/></div>
            <div style={{flex:1}}><Field label="# of Skeins" placeholder="2" value={skeins} onChange={e=>setSkeins(e.target.value)}/></div>
          </div>
          <Btn onClick={addYarn} disabled={!brand||!name}>Add to Stash</Btn>
        </div>
      )}
      {stash.map(y=>(
        <div key={y.id} style={{background:T.surface,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`,display:"flex",gap:14,alignItems:"center"}}>
          <div style={{width:44,height:44,borderRadius:10,background:y.colorCode,flexShrink:0,border:"2px solid rgba(0,0,0,.08)"}}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{y.brand} — {y.name}</div><div style={{fontSize:11,color:T.ink3,marginTop:2}}>{y.weight} · {y.color} · {y.yardage} yds/skein</div><div style={{fontSize:12,color:T.terra,fontWeight:600,marginTop:3}}>{y.skeins} skein{y.skeins!==1?"s":""} · {(y.yardage*y.skeins).toLocaleString()} yds total</div></div>
          <button onClick={()=>setStash(p=>p.filter(s=>s.id!==y.id))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:18,padding:"4px"}}>×</button>
        </div>
      ))}
    </div>
  );
};

const Calculators = () => {
  const [active,setActive]=useState("gauge"),[stitches,setStitches]=useState("20"),[rows,setRows]=useState("24"),[swatchSize,setSwatchSize]=useState("4"),[targetW,setTargetW]=useState("50"),[targetH,setTargetH]=useState("60"),[projW,setProjW]=useState("50"),[projH,setProjH]=useState("60"),[stPer4,setStPer4]=useState("12"),[ydsPerSt,setYdsPerSt]=useState("0.5"),[origW,setOrigW]=useState("40"),[origH,setOrigH]=useState("50"),[newW,setNewW]=useState("50"),[newH,setNewH]=useState("60");
  const stPerInch=parseFloat(stitches)/parseFloat(swatchSize)||0,roPerInch=parseFloat(rows)/parseFloat(swatchSize)||0;
  const castOn=Math.round(stPerInch*parseFloat(targetW)||0),totalRows=Math.round(roPerInch*parseFloat(targetH)||0);
  const totalSt=Math.round((parseFloat(stPer4)/4)*(parseFloat(projW)||0)*(parseFloat(projH)||0)*(parseFloat(roPerInch)||4));
  const yardage=Math.round(totalSt*(parseFloat(ydsPerSt)||0.5));
  const scaleW=(parseFloat(newW)||1)/(parseFloat(origW)||1),scaleH=(parseFloat(newH)||1)/(parseFloat(origH)||1);
  const{isDesktop:isDk}=useBreakpoint();
  return (
    <div style={{padding:isDk?"0 0 100px":"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Crochet Calculators</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:16}}>Essential tools for planning your projects.</div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[["gauge","Gauge"],["yardage","Yardage"],["resize","Resize"]].map(([key,label])=>(
          <button key={key} onClick={()=>setActive(key)} style={{flex:1,padding:"10px",border:"1.5px solid "+(active===key?T.terra:T.border),background:active===key?T.terraLt:T.surface,color:active===key?T.terra:T.ink3,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:active===key?600:400}}>{label}</button>
        ))}
      </div>
      {active==="gauge"&&<><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Gauge Swatch</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{[["Stitches",stitches,setStitches],["Rows",rows,setRows],["Swatch (in)",swatchSize,setSwatchSize]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Target Dimensions</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",targetW,setTargetW],["Height (in)",targetH,setTargetH]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Results</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Cast on (sts)",castOn],["Total rows",totalRows],["Stitches/inch",stPerInch.toFixed(1)],["Rows/inch",roPerInch.toFixed(1)]].map(([label,val])=><div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>)}</div></div></>}
      {active==="yardage"&&<><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Project Size</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",projW,setProjW],["Height (in)",projH,setProjH],["Sts per 4in",stPer4,setStPer4],["Yds per stitch",ydsPerSt,setYdsPerSt]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Estimated Yardage</div><div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontFamily:T.serif,fontSize:48,fontWeight:700,color:T.terra}}>{yardage.toLocaleString()}</div><div style={{fontSize:14,color:T.ink3,marginTop:4}}>yards needed</div><div style={{fontSize:13,color:T.ink2,marginTop:8}}>approx. {Math.ceil(yardage/200)} skeins at 200 yds each</div></div></div></>}
      {active==="resize"&&<><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Original Size</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",origW,setOrigW],["Height (in)",origH,setOrigH]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>New Size</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",newW,setNewW],["Height (in)",newH,setNewH]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Scale Factors</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width scale","x"+scaleW.toFixed(2)],["Height scale","x"+scaleH.toFixed(2)],["Stitch mult.",(scaleW*100).toFixed(0)+"%"],["Yardage mult.",(scaleW*scaleH*100).toFixed(0)+"%"]].map(([label,val])=><div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>)}</div></div></>}
    </div>
  );
};

const ShoppingList = ({patterns}) => {
  const needs=patterns.flatMap(p=>(p.materials||[]).filter(m=>m.yardage>0).map(m=>{const match=SEED_STASH.find(s=>s.weight===p.weight),have=match?match.yardage*match.skeins:0,need=m.yardage||0,more=Math.max(0,need-have);return{pattern:p.title,material:m.name,need,have,more,skeins:Math.ceil(more/200)};})).filter(n=>n.more>0);
  const{isDesktop:isDsl}=useBreakpoint();
  return (
    <div style={{padding:isDsl?"0 0 100px":"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Shopping List</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Auto-generated from your patterns, cross-referenced with your stash.</div>
      {needs.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>✅</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>You're all stocked up</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Your stash covers all current pattern needs.</div></div>
      :needs.map((n,i)=>(
        <div key={i} style={{background:T.surface,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{n.pattern}</div>
          <div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:8}}>{n.material}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[["Need",n.need+" yds"],["Have",n.have+" yds"],["Buy","~"+n.skeins+" skein"+(n.skeins!==1?"s":"")]].map(([label,val])=>(
              <div key={label} style={{background:label==="Buy"?T.terraLt:T.linen,borderRadius:8,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:13,fontWeight:700,color:label==="Buy"?T.terra:T.ink}}>{val}</div></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const CollectionView = ({patterns,cat,setCat,search,setSearch,openDetail,onAddPattern,isPro,tier}) => {
  const{isDesktop}=useBreakpoint();
  const filtered=patterns.filter(p=>(cat==="All"||p.cat===cat)&&(!search||p.title.toLowerCase().includes(search.toLowerCase())));
  const inProgress=patterns.filter(p=>{const v=pct(p);return v>0&&v<100;});
  return (
    <>
      {inProgress.length>0&&(
        <div style={{background:T.linen,borderBottom:`1px solid ${T.border}`,padding:"16px 0 18px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 "+(isDesktop?"0":"18px"),marginBottom:12}}>
            <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".09em",fontWeight:600}}>Continue Working</div>
          </div>
          <HScrollRow itemCount={inProgress.length}>{inProgress.map(p=><ShelfCard key={p.id} p={p} onClick={()=>openDetail(p)}/>)}</HScrollRow>
        </div>
      )}
      <div style={{padding:isDesktop?"24px 0 10px":"16px 18px 10px"}}>
        <div style={{display:"flex",alignItems:"center",background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",gap:9}}>
          <span style={{color:T.ink3,fontSize:15}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your hive…" style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}} onFocus={e=>e.currentTarget.parentNode.style.borderColor=T.terra} onBlur={e=>e.currentTarget.parentNode.style.borderColor=T.border}/>
        </div>
      </div>
      <div style={{display:"flex",gap:7,overflowX:"auto",padding:isDesktop?"0 0 16px":"0 18px 16px",WebkitOverflowScrolling:"touch"}}>
        {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?T.terra:T.surface,color:cat===c?"#fff":T.ink2,border:"1.5px solid "+(cat===c?T.terra:T.border),borderRadius:99,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",flexShrink:0,boxShadow:cat===c?"0 2px 10px rgba(184,90,60,.28)":"none"}}>{c}</button>)}
      </div>
      {!isPro&&(
        <div style={{margin:isDesktop?"0 0 16px":"0 18px 16px",background:T.linen,borderRadius:12,padding:"10px 14px",border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}><div style={{fontSize:11,color:T.ink2,marginBottom:5,fontWeight:500}}>{patterns.length}/{TIER_CONFIG.free.patternCap} free patterns · {patterns.length<TIER_CONFIG.free.patternCap?"all features available":"upgrade to add more"}</div><Bar val={(patterns.length/TIER_CONFIG.free.patternCap)*100} color={tier.atCap?"#C0392B":T.terra} h={4}/></div>
          {tier.atCap&&<button onClick={onAddPattern} style={{background:T.terra,color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Upgrade</button>}
        </div>
      )}
      <div className="pattern-grid" style={{padding:isDesktop?"0 0 80px":"0 18px 120px"}}>
        {filtered.length===0
          ?<div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🧶</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>Your Hive is empty</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6,marginBottom:20}}>Tap + to add your first pattern.</div><button onClick={onAddPattern} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)"}}>+ Add Your First Pattern</button></div>
          :filtered.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.04} onClick={()=>openDetail(p)}/>)}
      </div>
    </>
  );
};

export default function YarnHive() {
  const [authed,setAuthed]=useState(false),[isPro,setIsPro]=useState(false),[patterns,setPatterns]=useState(SEED_PATTERNS),[view,setView]=useState("collection"),[selected,setSelected]=useState(null),[navOpen,setNavOpen]=useState(false),[addOpen,setAddOpen]=useState(false),[showPaywall,setShowPaywall]=useState(false),[cat,setCat]=useState("All"),[search,setSearch]=useState("");
  const{isTablet,isDesktop}=useBreakpoint();
  const tier=useTier(isPro,patterns.length);

  if(!authed) return <><CSS/><Auth onEnter={()=>setAuthed(true)} onEnterAsPro={()=>{setIsPro(true);setAuthed(true);}}/></>;
  if(view==="detail"&&selected) return <><CSS/><Detail p={selected} onBack={()=>setView("collection")} onSave={u=>{setPatterns(prev=>prev.map(p=>p.id===u.id?u:p));setSelected(u);}}/></>;

  const openDetail=p=>{setSelected(p);setView("detail");};
  const handleAddPattern=p=>{setPatterns(prev=>[p,...prev]);setView("collection");};
  const openAddModal=()=>{if(tier.atCap){setShowPaywall(true);return;}setAddOpen(true);};
  const inProgress=patterns.filter(p=>{const v=pct(p);return v>0&&v<100;});
  const TITLE_MAP={collection:"Your Hive",wip:"In Progress",browse:"Browse Sites",stash:"Yarn Stash",calculator:"Calculators",shopping:"Shopping List"};

  if(isDesktop) return (
    <div style={{display:"flex",minHeight:"100vh",width:"100%",background:T.bg,fontFamily:T.sans,position:"relative"}}>
      <CSS/>
      {showPaywall&&<PaywallGate patternCount={patterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={patterns.length}/>}
      <SidebarNav view={view} setView={setView} count={patterns.length} isPro={isPro} onAddPattern={openAddModal}/>
      <div style={{flex:1,minWidth:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 40px",height:64,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
          <div style={{fontFamily:T.serif,fontSize:24,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"YarnHive"}</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isPro&&<div style={{background:T.sageLt,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:600,color:T.sage}}>✨ Pro</div>}
            <button onClick={openAddModal} style={{background:T.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>+</span> Add Pattern</button>
          </div>
        </div>
        <div style={{flex:1,padding:"0 40px"}}>
          {view==="collection"&&<CollectionView patterns={patterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier}/>}
          {view==="wip"&&<div style={{padding:"24px 0 80px"}}>{inProgress.length===0?<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:20,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:14,color:T.ink3}}>Open a pattern and start checking off rows.</div></div>:<div className="pattern-grid">{inProgress.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.06} onClick={()=>openDetail(p)}/>)}</div>}</div>}
          {view==="browse"&&<BrowseSitesView onSavePattern={handleAddPattern}/>}
          {view==="stash"&&<div style={{paddingTop:24}}><YarnStash/></div>}
          {view==="calculator"&&<div style={{paddingTop:24}}><Calculators/></div>}
          {view==="shopping"&&<div style={{paddingTop:24}}><ShoppingList patterns={patterns}/></div>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:T.sans,background:T.bg,minHeight:"100vh",maxWidth:isTablet?680:430,margin:"0 auto",display:"flex",flexDirection:"column",position:"relative"}}>
      <CSS/>
      <NavPanel open={navOpen} onClose={()=>setNavOpen(false)} view={view} setView={setView} count={patterns.length} isPro={isPro}/>
      {showPaywall&&<PaywallGate patternCount={patterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={patterns.length}/>}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 18px",height:56,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
        <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 8px 8px 0",display:"flex",flexDirection:"column",gap:5}}><div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/><div style={{width:15,height:1.5,background:T.ink,borderRadius:99}}/><div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/></button>
        <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"YarnHive"}</div>
        <button onClick={openAddModal} style={{background:T.terra,border:"none",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(184,90,60,.4)"}}>+</button>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
        {view==="collection"&&<CollectionView patterns={patterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier}/>}
        {view==="wip"&&<div style={{padding:"16px 18px 80px"}}>{inProgress.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Open a pattern and start checking off rows.</div></div>:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{inProgress.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.06} onClick={()=>openDetail(p)}/>)}</div>}</div>}
        {view==="browse"&&<BrowseSitesView onSavePattern={handleAddPattern}/>}
        {view==="stash"&&<div style={{paddingTop:18}}><YarnStash/></div>}
        {view==="calculator"&&<div style={{paddingTop:18}}><Calculators/></div>}
        {view==="shopping"&&<div style={{paddingTop:18}}><ShoppingList patterns={patterns}/></div>}
      </div>
      <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:30,pointerEvents:"none"}}>
        <button onClick={openAddModal} style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:99,padding:"13px 26px",fontSize:14,fontWeight:700,cursor:"pointer",pointerEvents:"auto",boxShadow:"0 8px 28px rgba(184,90,60,.55)",display:"flex",alignItems:"center",gap:8,animation:"fabPulse 3s ease infinite"}}><span style={{fontSize:17}}>+</span> Add Pattern</button>
      </div>
    </div>
  );
}
