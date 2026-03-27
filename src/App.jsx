import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useParams, Routes, Route, Navigate } from "react-router-dom";
import { T, useBreakpoint, Field } from "./theme.jsx";
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP_ORIGIN, saveSession, getSession, supabaseAuth } from "./supabase.js";
import { PHOTOS, PILL, APP_VERSION } from "./constants.js";
import Calculators from "./Calculators.jsx";
import Auth, { WaitlistPopup } from "./Auth.jsx";
import PatternHeader from "./PatternHeader.jsx";
import RowManager, { ensureRepeatBrackets } from "./RowManager.jsx";
import AddPatternModal, { uploadPatternFile, buildRowsFromComponents } from "./AddPatternModal.jsx";
import CollectionView, { PatternCard } from "./Dashboard.jsx";
import Detail, { CoverImagePicker, DeleteConfirmModal, ReadyToBuildPrompt, PatternCreatedOverlay } from "./PatternDetail.jsx";

if (typeof document !== "undefined" && !document.getElementById("sb-font")) {
  const l = document.createElement("link");
  l.id = "sb-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap";
  document.head.appendChild(l);
}

// ─── ROUTE ↔ VIEW MAPPING ───────────────────────────────────────────────────
const VIEW_TO_PATH = {collection:"/hive",detail:"/hive",wip:"/builds",browse:"/browse",stash:"/stash",calculator:"/tools",shopping:"/shopping",profile:"/profile"};
const PATH_TO_VIEW = {"/hive":"collection","/builds":"wip","/browse":"browse","/stash":"stash","/tools":"calculator","/shopping":"shopping","/profile":"profile","/hive-vision":"hive-vision"};
const viewFromPath = (pathname) => {
  if(pathname.startsWith("/hive/")) return "detail";
  return PATH_TO_VIEW[pathname] || "collection";
};
const patternIdFromPath = (pathname) => {
  const m = pathname.match(/^\/hive\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

// PHOTOS, PILL imported from ./constants.js

// Supabase auth imported from ./supabase.js

// APP_VERSION imported from ./constants.js
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const TIER_CONFIG = {
  free: { patternCap: 5, priceLabel: "Free" },
  pro:  { patternCap: Infinity, priceMonthly: 9.99, priceAnnual: 74.99, priceLabel: "$9.99/mo", priceAnnualLabel: "$74.99/yr" },
};

const useTier = (isPro, userCount, starterCount=0) => {
  const realCount = userCount - starterCount;
  const atCap  = !isPro && realCount >= TIER_CONFIG.free.patternCap;
  const canAdd = isPro  || realCount  < TIER_CONFIG.free.patternCap;
  const hasFeature = () => canAdd;
  return { isPro, atCap, canAdd, hasFeature, userCount: realCount };
};

// T (theme) and useBreakpoint imported from ./theme.js

const CSS = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #EAE0D5; border-radius: 99px; }
    body { background: #F7F3EE; }
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
    .card { transition:transform .18s,box-shadow .18s; box-shadow:0 2px 10px rgba(139,90,60,.08); }
    .card:hover { transform:translateY(-4px) !important; box-shadow:0 16px 36px rgba(139,90,60,.14) !important; }
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
    input[type="password"]::placeholder { opacity:.4; }
    @media(hover:hover) { .nav-item:hover { background:#F4EDE3 !important; } .site-row:hover { background:#F4EDE3 !important; } }
  `}</style>
);

const pct = p => { const checkable=(p.rows||[]).filter(r=>!r.isHeader); return checkable.length ? Math.round(checkable.filter(r=>r.done).length/checkable.length*100) : 0; };

const DEFAULT_STARTERS = [
  {id:"starter_granny",title:"Granny Square",cat:"Blankets",hook:"5.0mm",weight:"Worsted",yardage:120,notes:"",source:"Wovely Starter",photo:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406093/jutheu06ck9xiyfklwd4.png",cover_image_url:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406093/jutheu06ck9xiyfklwd4.png",materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:12,height:12},isStarter:true,rows:[
    {id:1,text:"Magic ring, ch 3 (counts as first dc), 2 dc in ring, ch 2, [3 dc in ring, ch 2] 3 times, sl st to top of ch-3 to join.",done:false,note:""},
    {id:2,text:"Sl st to ch-2 sp, ch 3, 2 dc in same sp, ch 1, [3 dc, ch 2, 3 dc in next ch-2 sp, ch 1] 3 times, 3 dc in first sp, ch 2, sl st to join.",done:false,note:""},
    {id:3,text:"Sl st to ch-2 corner sp, ch 3, 2 dc in same sp, ch 2, 3 dc in same sp, ch 1, 3 dc in ch-1 sp, ch 1, [corner, ch 1, 3 dc in ch-1 sp, ch 1] repeat, sl st to join.",done:false,note:""},
    {id:4,text:"Continue pattern, adding one 3-dc group in each ch-1 sp along sides and working [3 dc, ch 2, 3 dc] in each corner ch-2 sp.",done:false,note:""},
    {id:5,text:"Repeat Row 4 to expand square one more round.",done:false,note:""},
    {id:6,text:"Final round: sc evenly around entire square, working 3 sc in each corner. Fasten off and weave in ends.",done:false,note:""},
  ]},
  {id:"starter_amigurumi",title:"Amigurumi Ball",cat:"Amigurumi",hook:"3.5mm",weight:"DK",yardage:40,notes:"",source:"Wovely Starter",photo:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405272/duiwkpuwzctq42zjox9x.png",cover_image_url:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405272/duiwkpuwzctq42zjox9x.png",materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:4,height:4},isStarter:true,rows:[
    {id:11,text:"Magic ring, 6 sc in ring. (6)",done:false,note:""},
    {id:12,text:"2 sc in each st around. (12)",done:false,note:""},
    {id:13,text:"[ Sc in next st, 2 sc in next st ] repeat around. (18)",done:false,note:""},
    {id:14,text:"Sc in each st around. (18) — repeat this row 3 times total.",done:false,note:""},
    {id:15,text:"[ Sc in next st, sc2tog ] repeat around. (12) — stuff with fiberfill now.",done:false,note:""},
    {id:16,text:"Sc2tog around. (6) — fasten off, close opening, weave in ends.",done:false,note:""},
  ]},
  {id:"starter_beanie",title:"Basic Beanie",cat:"Wearables",hook:"5.0mm",weight:"Worsted",yardage:150,notes:"",source:"Wovely Starter",photo:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406087/zrxoyipglr1degpyufc3.png",cover_image_url:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406087/zrxoyipglr1degpyufc3.png",materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:10,height:8},isStarter:true,rows:[
    {id:21,text:"Magic ring, 6 sc. (6)",done:false,note:""},
    {id:22,text:"2 sc in each st. (12)",done:false,note:""},
    {id:23,text:"[ Sc, 2 sc in next ] repeat. (18)",done:false,note:""},
    {id:24,text:"[ Sc in 2, 2 sc in next ] repeat. (24)",done:false,note:""},
    {id:25,text:"[ Sc in 3, 2 sc in next ] repeat. (30)",done:false,note:""},
    {id:26,text:"Sc in each st around until piece measures 5 inches from top.",done:false,note:""},
    {id:27,text:"Continue even rounds until beanie measures 7.5 inches total.",done:false,note:""},
    {id:28,text:"Last round: sl st in each st around. Fasten off, weave in ends.",done:false,note:""},
  ]},
  {id:"starter_dishcloth",title:"Simple Dishcloth",cat:"Home",hook:"5.0mm",weight:"Cotton",yardage:80,notes:"",source:"Wovely Starter",photo:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406091/fvnjwgm613icxzzsg40p.png",cover_image_url:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406091/fvnjwgm613icxzzsg40p.png",materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:8,height:8},isStarter:true,rows:[
    {id:31,text:"Ch 25. Sc in 2nd ch from hook and in each ch across. (24 sc)",done:false,note:""},
    {id:32,text:"Ch 1, turn. Sc in each st across. (24)",done:false,note:""},
    {id:33,text:"Repeat Row 2. Continue until piece is roughly square.",done:false,note:""},
    {id:34,text:"Final row: ch 1, turn, sc across. Fasten off, weave in ends.",done:false,note:""},
  ]},
  {id:"starter_magicring",title:"Magic Ring Practice Swatch",cat:"Amigurumi",hook:"4.0mm",weight:"Worsted",yardage:30,notes:"",source:"Wovely Starter",photo:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406093/jutheu06ck9xiyfklwd4.png",cover_image_url:"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406093/jutheu06ck9xiyfklwd4.png",materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:5,height:5},isStarter:true,rows:[
    {id:41,text:"Make a magic ring. Ch 1, work 6 sc into ring, pull tight to close. (6)",done:false,note:""},
    {id:42,text:"2 sc in each st around. (12)",done:false,note:""},
    {id:43,text:"[ Sc in next st, 2 sc in next ] repeat around. (18)",done:false,note:""},
    {id:44,text:"[ Sc in next 2 sts, 2 sc in next ] repeat around. (24)",done:false,note:""},
    {id:45,text:"Sc in each st around. (24) — practice round, no increases.",done:false,note:""},
    {id:46,text:"Sl st in next st. Fasten off. This is your gauge swatch — keep it!",done:false,note:""},
  ]},
];
const makeStarterPatterns = () => DEFAULT_STARTERS.map(p=>({...p,rows:p.rows.map(r=>({...r}))}));

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

// ─── CATEGORY FALLBACK IMAGES (Imagen 4.0 generated) ──────────────────────
const CAT_IMG = {
  "Amigurumi":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405272/duiwkpuwzctq42zjox9x.png",
  "Blankets":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405430/u1evbmu4nccpiyg8fc7a.png",
  "Wearables":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405433/yrcitmgukrik0owg1typ.png",
  "Accessories":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405436/uq692cchkcsjowpgu2le.png",
  "Home Décor":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405438/moqrjnlupspgoxt9v4wb.png",
  "Uncategorized":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405441/ggzvsrbeeetyiabs55sn.png",
};
const catImgFor = (cat) => CAT_IMG[cat] || CAT_IMG["Uncategorized"];
const ALL_CAT_ENTRIES = Object.entries(CAT_IMG);


// Category-aware fallback for cards with no cover
const catFallbackPhoto = (cat) => catImgFor(cat);
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
// Field imported from ./theme.js


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
            <div style={{fontSize:11,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>Wovely Pro</div>
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


const SidebarNav = ({view,onNavigate,count,isPro,onAddPattern,onSignOut,onUpgrade,userPatterns=[],allPatterns=[]}) => {
  const starterC=DEFAULT_STARTERS.length;const addedC=userPatterns.filter(p=>!p.isStarter).length;
  const wipCount=allPatterns.filter(p=>!p.isStarter&&(p.status==="in_progress"||p.started)).filter(p=>pct(p)<100).length;
  const ITEMS=[{key:"collection",label:"Your Hive",sub:starterC+" starter"+(starterC!==1?"s":"")+" · "+addedC+" added",icon:"🧶"},{key:"wip",label:"Builds in Progress",sub:wipCount>0?wipCount+" active":"Currently making",icon:"🪡"},{key:"browse",label:"Browse Sites",sub:"Find free patterns",icon:"🌐"},{key:"stash",label:"Yarn Stash",sub:"Manage your yarn",icon:"🎀"},{key:"calculator",label:"Calculators",sub:"Gauge, yardage & more",icon:"🧮"},{key:"shopping",label:"Shopping List",sub:"Auto-generated",icon:"🛒"}];
  return (
    <div style={{width:260,background:T.surface,borderRight:`1px solid ${T.border}`,height:"100vh",position:"sticky",top:0,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div onClick={()=>onNavigate("collection")} style={{position:"relative",height:160,overflow:"hidden",flexShrink:0,cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        <Photo src="https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,g_center,w_400,h_320,z_0.7/v1774123693/yarnhive_sidebar_bee.jpg" alt="Wovely bee" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.85) 0%,rgba(20,14,10,.2) 100%)"}}/>
        <div style={{position:"absolute",bottom:18,left:20}}><div style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:"#fff",lineHeight:1}}>Wovely</div><div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:4}}>Your crochet hive</div></div>
      </div>
      <div style={{padding:"16px 16px 8px"}}><button onClick={onAddPattern} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:18}}>+</span> Add Pattern</button></div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {ITEMS.map(item=>{const active=view===item.key;return(
          <div key={item.key} className="nav-item" onClick={()=>onNavigate(item.key)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderLeft:"3px solid "+(active?T.terra:"transparent"),background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
            <span style={{fontSize:18,width:24,textAlign:"center"}}>{item.icon}</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>{item.label}</div><div style={{fontSize:11,color:T.ink3,marginTop:1}}>{item.sub}</div></div>
            {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
          </div>
        );})}
      </div>
      <div style={{padding:"0 0 8px"}}>
        {(()=>{const active=view==="profile";return(
          <div className="nav-item" onClick={()=>onNavigate("profile")} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderLeft:"3px solid "+(active?T.terra:"transparent"),background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
            <span style={{fontSize:18,width:24,textAlign:"center"}}>👤</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>Profile & Settings</div><div style={{fontSize:11,color:T.ink3,marginTop:1}}>Your account</div></div>
            {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
          </div>
        );})()}
      </div>
      <div style={{padding:"0 16px 24px"}}>
        {isPro?<div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>✨</span><div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Wovely Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div></div>
        :<div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:12,padding:"14px"}}><div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.75)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Hive Vision, cloud sync.</div><div onClick={onUpgrade} style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo</div></div>}
        {onSignOut&&<button onClick={onSignOut} style={{width:"100%",background:"none",border:"1px solid "+T.border,borderRadius:10,padding:"8px",fontSize:12,color:T.ink3,cursor:"pointer",marginTop:10,fontWeight:500}}>Sign out</button>}
      </div>
    </div>
  );
};

const NavPanel = ({open,onClose,view,onNavigate,count,isPro,onSignOut,onUpgrade}) => {
  const [closing,setClosing]=useState(false);
  const dismiss=()=>{setClosing(true);setTimeout(()=>{setClosing(false);onClose();},220);};
  const go=v=>{onNavigate(v);dismiss();};
  if(!open) return null;
  const ITEMS=[{key:"collection",label:"Your Hive",sub:count+" patterns",icon:"🧶"},{key:"wip",label:"Builds in Progress",sub:"Currently making",icon:"🪡"},{key:"browse",label:"Browse Sites",sub:"Find free patterns",icon:"🌐"},{key:"stash",label:"Yarn Stash",sub:"Manage your yarn",icon:"🎀"},{key:"calculator",label:"Calculators",sub:"Gauge, yardage & more",icon:"🧮"},{key:"shopping",label:"Shopping List",sub:"Auto-generated needs",icon:"🛒"}];
  return (
    <div style={{position:"fixed",inset:0,zIndex:100}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss} style={{position:"absolute",inset:0,background:"rgba(28,23,20,.52)",backdropFilter:"blur(3px)"}}/>
      <div className={closing?"nav-close":"nav-open"} style={{position:"absolute",top:0,left:0,bottom:0,width:"80%",maxWidth:320,background:T.surface,display:"flex",flexDirection:"column",boxShadow:"6px 0 40px rgba(28,23,20,.2)"}}>
        <div onClick={()=>go("collection")} style={{position:"relative",height:130,overflow:"hidden",flexShrink:0,cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <Photo src="https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,g_center,w_400,h_320,z_0.7/v1774123693/yarnhive_sidebar_bee.jpg" alt="Wovely bee" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.8) 0%,rgba(20,14,10,.2) 100%)"}}/>
          <div style={{position:"absolute",bottom:16,left:18}}><div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:"#fff",lineHeight:1}}>Wovely</div><div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:3}}>Your crochet hive</div></div>
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
        <div style={{padding:"0 0 8px"}}>
          {(()=>{const active=view==="profile";return(
            <div className="nav-item" onClick={()=>go("profile")} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 20px",borderLeft:"3px solid "+(active?T.terra:"transparent"),background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
              <span style={{fontSize:20,width:26,textAlign:"center"}}>👤</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>Profile & Settings</div><div style={{fontSize:11,color:T.ink3,marginTop:1}}>Your account</div></div>
              {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
            </div>
          );})()}
        </div>
        <div style={{padding:"0 18px 36px"}}>
          {isPro?<div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>✨</span><div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Wovely Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div></div>
          :<div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:12,padding:"14px 16px"}}><div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.75)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Hive Vision.</div><div onClick={onUpgrade} style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo</div></div>}
          {onSignOut&&<button onClick={onSignOut} style={{width:"100%",background:"none",border:"1px solid "+T.border,borderRadius:10,padding:"8px",fontSize:12,color:T.ink3,cursor:"pointer",marginTop:10,fontWeight:500}}>Sign out</button>}
        </div>
      </div>
    </div>
  );
};


const EmailConfirmBanner = ({onDismiss,onResend}) => {
  const [resending,setResending]=useState(false);
  const handleResend = async () => {
    setResending(true);
    if (onResend) await onResend();
    setResending(false);
  };
  return (
    <div style={{background:T.gold,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
      <span style={{fontSize:13,color:"#fff",fontWeight:500,lineHeight:1.4}}>Confirm your email to unlock sharing features — check your inbox.</span>
      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={handleResend} disabled={resending} style={{background:"none",border:"none",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",textDecoration:"underline",opacity:resending?.5:1}}>{resending?"Sending…":"Resend email"}</button>
        <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",color:"#fff",fontSize:18,lineHeight:1,padding:"0 2px",opacity:.75}}>×</button>
      </div>
    </div>
  );
};

const PRO_FEATURES = [
  {label:"Unlimited patterns",sub:"No cap. Save every pattern you'll ever make"},
  {label:"Unlimited Hive Vision",sub:"Scan as many finished objects as you want"},
  {label:"Cloud sync",sub:"Access your hive on every device, always in sync"},
  {label:"Pattern Help AI",sub:"Get AI-powered help for any row you're stuck on"},
  {label:"Advanced analytics",sub:"Track your making history and stash usage"},
  {label:"Early access",sub:"First to get every new feature we ship"},
];

const ProInfoModal = ({onClose}) => {
  const{isDesktop}=useBreakpoint();
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:isDesktop?"center":"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(10px)"}}/>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"relative",background:"#FDFAF7",
        borderRadius:isDesktop?20:"22px 22px 0 0",
        width:isDesktop?"min(480px, 90vw)":"100%",
        maxHeight:isDesktop?"min(640px, 85vh)":"88vh",
        display:"flex",flexDirection:"column",zIndex:1,
        boxShadow:isDesktop?"0 24px 80px rgba(0,0,0,0.4)":"0 -12px 48px rgba(0,0,0,0.28)",
        overflow:"hidden",
        animation:isDesktop?"modalPop .25s cubic-bezier(.22,.68,0,1.05) both":"sheetUp .3s cubic-bezier(.22,.68,0,1.05) both",
      }}>
        <div style={{flexShrink:0,height:44,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",borderBottom:"1px solid rgba(28,23,20,0.06)"}}>
          <div style={{width:36,height:4,background:"rgba(28,23,20,0.15)",borderRadius:99}}/>
          <button onClick={onClose} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",width:30,height:30,borderRadius:"50%",background:"rgba(28,23,20,0.07)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(28,23,20,0.45)",lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px 48px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:22}}>
            <div style={{width:56,height:56,borderRadius:16,flexShrink:0,background:`linear-gradient(145deg,${T.terra},#6B2410)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",boxShadow:"0 6px 20px rgba(184,90,60,0.25)"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            </div>
            <div style={{flex:1,minWidth:0,paddingTop:2}}>
              <div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:T.ink,lineHeight:1.15,marginBottom:4}}>Wovely Pro</div>
              <div style={{fontSize:13,color:T.ink3,lineHeight:1.55,fontWeight:300}}>Unlimited everything. Built for makers who are serious about their craft.</div>
            </div>
          </div>
          <div style={{background:T.linen,borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,marginBottom:20}}>
            {PRO_FEATURES.map((f,i)=>(
              <div key={i} style={{padding:"12px 16px",borderBottom:i<PRO_FEATURES.length-1?`1px solid ${T.border}`:"none"}}>
                <div style={{fontSize:14,fontWeight:600,color:T.ink,lineHeight:1.2,marginBottom:2}}>{f.label}</div>
                <div style={{fontSize:12,color:T.ink3,lineHeight:1.5}}>{f.sub}</div>
              </div>
            ))}
          </div>
          <button style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",marginBottom:6}}>Get Pro — $9.99/mo</button>
          <div style={{textAlign:"center",fontSize:12,color:T.ink3,marginBottom:12}}>$74.99/yr — save 37%</div>
          <div style={{textAlign:"center",fontSize:11,color:T.ink3,opacity:.6}}>Cancel anytime. No questions asked.</div>
        </div>
      </div>
    </div>
  );
};

const ProfileSettingsView = ({isPro,onOpenProModal,onGoHome,onEmailConfirmed}) => {
  const [username,setUsername]=useState(""),[displayName,setDisplayName]=useState(""),[bio,setBio]=useState("");
  const [socialInstagram,setSocialInstagram]=useState(""),[socialPinterest,setSocialPinterest]=useState(""),[socialRavelry,setSocialRavelry]=useState("");
  const [profileSaving,setProfileSaving]=useState(false),[profileMsg,setProfileMsg]=useState(null),[profileLoaded,setProfileLoaded]=useState(false);
  const [saveBtnText,setSaveBtnText]=useState("Save Profile");
  const [welcomeDismissed,setWelcomeDismissed]=useState(()=>localStorage.getItem("yh_welcome_dismissed")==="true");
  const [curPass,setCurPass]=useState(""),[newPass,setNewPass]=useState(""),[passSaving,setPassSaving]=useState(false),[passMsg,setPassMsg]=useState(null);
  const [resending,setResending]=useState(false),[resendMsg,setResendMsg]=useState(null);
  const [emailConfirmed,setEmailConfirmed]=useState(false);
  const{isDesktop}=useBreakpoint();
  const user = supabaseAuth.getUser();
  const session = getSession();

  // Initial check + poll every 10s for email confirmation (GET only — no token refresh)
  useEffect(()=>{
    const checkConfirmed = async () => {
      const s = getSession();
      if (!s?.access_token) return false;
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${s.access_token}`},
        });
        if (res.ok) {
          const u = await res.json();
          if (u.email_confirmed_at) {
            // Confirmed — refresh token once to get updated JWT claims
            if (s.refresh_token) {
              try {
                const tr = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                  method:"POST",
                  headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
                  body:JSON.stringify({refresh_token:s.refresh_token}),
                });
                if (tr.ok) saveSession(await tr.json());
              } catch {}
            }
            setEmailConfirmed(true);
            if (onEmailConfirmed) onEmailConfirmed();
            return true;
          }
        }
      } catch {}
      return false;
    };
    checkConfirmed();
    const interval = setInterval(async ()=>{
      const confirmed = await checkConfirmed();
      if (confirmed) clearInterval(interval);
    }, 10000);
    return ()=>clearInterval(interval);
  },[]);

  const profilePct = Math.round((displayName.trim()?33:0)+(username.trim()?33:0)+(bio.trim()?34:0));

  useEffect(()=>{
    if (!user || profileLoaded) return;
    (async ()=>{
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}&select=username,display_name,bio,social_instagram,social_pinterest,social_ravelry`, {
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`},
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows[0]) { setUsername(rows[0].username||""); setDisplayName(rows[0].display_name||""); setBio(rows[0].bio||""); setSocialInstagram(rows[0].social_instagram||""); setSocialPinterest(rows[0].social_pinterest||""); setSocialRavelry(rows[0].social_ravelry||""); }
        }
      } catch {}
      setProfileLoaded(true);
    })();
  },[user?.id]);

  const handleProfileSave = async () => {
    const handle = username.trim().replace(/^@/,"");
    if (handle && !/^[a-zA-Z0-9_]{2,30}$/.test(handle)) { setProfileMsg({type:"error",text:"Username: 2-30 chars, letters/numbers/underscores only."}); return; }
    setProfileSaving(true); setProfileMsg(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}`, {
        method:"PATCH",
        headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
        body:JSON.stringify({username:handle||null, display_name:displayName.trim()||null, bio:bio.trim()||null, social_instagram:socialInstagram.trim()||null, social_pinterest:socialPinterest.trim()||null, social_ravelry:socialRavelry.trim()||null}),
      });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        if (d.message?.includes("unique") || d.code === "23505") { setProfileMsg({type:"error",text:"Username already taken."}); setProfileSaving(false); return; }
        setProfileMsg({type:"error",text:d.message||"Save failed."}); setProfileSaving(false); return;
      }
      setProfileMsg(null);
      setSaveBtnText("Saved!");
      setTimeout(()=>setSaveBtnText("Save Profile"),2000);
    } catch { setProfileMsg({type:"error",text:"Network error."}); }
    setProfileSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPass || newPass.length < 6) { setPassMsg({type:"error",text:"New password must be at least 6 characters."}); return; }
    setPassSaving(true); setPassMsg(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method:"PUT",
        headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json"},
        body:JSON.stringify({password:newPass}),
      });
      if (!res.ok) { const d = await res.json().catch(()=>({})); setPassMsg({type:"error",text:d.msg||d.error_description||"Failed."}); setPassSaving(false); return; }
      setPassMsg({type:"ok",text:"Password updated."}); setCurPass(""); setNewPass("");
    } catch { setPassMsg({type:"error",text:"Network error."}); }
    setPassSaving(false);
  };

  const handleResendConfirm = async () => {
    setResending(true); setResendMsg(null);
    try {
      const payload = {type:"signup",email:user.email,options:{emailRedirectTo:APP_ORIGIN}};
      console.log("[Wovely] Resend confirmation request:", {url:`${SUPABASE_URL}/auth/v1/resend`, payload, supabaseUrl:SUPABASE_URL});
      const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
        method:"POST",
        headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      const body = await res.text();
      console.log("[Wovely] Resend confirmation response:", {status:res.status, ok:res.ok, body});
      if (res.ok) {
        setResendMsg({type:"ok",text:"Confirmation email sent. Check spam if you don't see it."});
      } else {
        setResendMsg({type:"error",text:`Failed to send (${res.status}). SMTP may not be configured in Supabase dashboard.`});
      }
    } catch (e) { console.error("[Wovely] Resend confirmation error:", e); setResendMsg({type:"error",text:"Network error."}); }
    setResending(false);
  };

  const SECTION = {background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,padding:isDesktop?"24px 28px":"20px 18px"};
  const SECTION_TITLE = {fontFamily:T.serif,fontSize:18,fontWeight:700,color:T.ink,marginBottom:16};
  const DIVIDER = <div style={{height:1,background:T.border,margin:"16px 0"}}/>;
  const Msg = ({msg}) => msg ? <div style={{background:msg.type==="ok"?"rgba(92,122,94,.1)":T.terraLt,border:"1px solid "+(msg.type==="ok"?"rgba(92,122,94,.2)":"rgba(184,90,60,.2)"),borderRadius:10,padding:"10px 14px",fontSize:12,color:msg.type==="ok"?T.sage:T.terra,lineHeight:1.5,marginBottom:8}}>{msg.text}</div> : null;

  return (
    <div style={{padding:isDesktop?"24px 0 80px":"16px 18px 100px",maxWidth:560}}>
      <button onClick={onGoHome} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:13,fontWeight:500,padding:0,marginBottom:16,display:"flex",alignItems:"center",gap:4}}>← Your Hive</button>

      {!welcomeDismissed&&(
        <div style={{borderRadius:16,overflow:"hidden",marginBottom:20,position:"relative",height:220}}>
          <img src="https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,w_1200,h_440,g_center/v1774116735/yarnhive_bg_v2.jpg" alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.05) 100%)"}}/>
          <button onClick={()=>{setWelcomeDismissed(true);localStorage.setItem("yh_welcome_dismissed","true");}} style={{position:"absolute",top:12,right:16,background:"transparent",border:"none",color:"#fff",fontSize:20,cursor:"pointer",lineHeight:1,zIndex:2}}>×</button>
          <div style={{position:"relative",zIndex:1,height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",paddingLeft:32}}>
            <div style={{fontFamily:T.serif,fontSize:32,fontWeight:700,color:"#fff",marginBottom:8,lineHeight:1.2}}>Welcome to your hive. 🐝</div>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.88)",marginBottom:20}}>Your collection is ready. Time to make something.</div>
            <div><button onClick={()=>{setWelcomeDismissed(true);localStorage.setItem("yh_welcome_dismissed","true");onGoHome();}} style={{background:"#B85A3C",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontSize:15,fontWeight:600,cursor:"pointer"}}>Go to Your Hive →</button></div>
          </div>
        </div>
      )}

      {/* Profile completion bar */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:11,color:T.ink3,fontWeight:500}}>Profile completion</div>
          <div style={{fontSize:11,color:profilePct===100?T.sage:T.terra,fontWeight:600}}>{profilePct}%</div>
        </div>
        <div style={{height:4,background:T.linen,borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:profilePct+"%",background:profilePct===100?T.sage:T.terra,borderRadius:99,transition:"width .3s ease"}}/>
        </div>
      </div>

      <div style={SECTION}>
        <div style={SECTION_TITLE}>Your Profile</div>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:T.linen,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:700,color:T.terra,flexShrink:0,border:`2px solid ${T.border}`}}>{(displayName||"Y").charAt(0).toUpperCase()}{(username||"H").charAt(0).toUpperCase()}</div>
          <div><div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:4}}>{displayName||"Your Name"}</div><div style={{fontSize:12,color:T.ink3}}>{username?"@"+username:"Set your username"}</div></div>
        </div>
        <Field label="Display name" placeholder="e.g. Sarah" value={displayName} onChange={e=>setDisplayName(e.target.value)}/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Username</div>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.ink3,fontSize:15,pointerEvents:"none"}}>@</span>
            <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="yourhandle" style={{width:"100%",padding:"13px 16px 13px 30px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
        </div>
        <Field label="Bio" placeholder="Tell us about your craft..." value={bio} onChange={e=>setBio(e.target.value)} rows={3}/>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16,marginTop:8}}>
          <div style={{fontSize:13,fontWeight:600,color:T.ink,marginBottom:12}}>Social Connections</div>
          <Field label="Instagram handle" placeholder="@yourhandle" value={socialInstagram} onChange={e=>setSocialInstagram(e.target.value)}/>
          <Field label="Pinterest handle" placeholder="@yourhandle" value={socialPinterest} onChange={e=>setSocialPinterest(e.target.value)}/>
          <Field label="Ravelry username" placeholder="yourhandle" value={socialRavelry} onChange={e=>setSocialRavelry(e.target.value)}/>
        </div>
        <Msg msg={profileMsg}/>
        <button onClick={handleProfileSave} disabled={profileSaving} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",opacity:profileSaving?.6:1}}>{profileSaving?"Saving…":saveBtnText}</button>
      </div>

      {DIVIDER}

      <div style={SECTION}>
        <div style={SECTION_TITLE}>Account</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Email</div>
          <div style={{padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink2,fontSize:15}}>{user?.email||"—"}</div>
        </div>
        <div style={{marginBottom:16}}>
          {emailConfirmed
            ? <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(92,122,94,.1)",borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:600,color:T.sage}}>Email confirmed</div>
            : <div>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:T.terraLt,borderRadius:99,padding:"5px 12px",fontSize:11,fontWeight:600,color:T.terra,marginBottom:8}}>Email not confirmed</div>
                <div><button onClick={handleResendConfirm} disabled={resending} style={{background:T.linen,border:`1px solid ${T.border}`,borderRadius:12,padding:"8px 16px",fontSize:13,fontWeight:600,color:T.ink,cursor:"pointer",opacity:resending?.6:1}}>{resending?"Sending…":"Resend confirmation email"}</button></div>
                {resendMsg&&<Msg msg={resendMsg}/>}
              </div>
          }
        </div>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16}}>
          <div style={{fontSize:13,fontWeight:600,color:T.ink,marginBottom:12}}>Change Password</div>
          <Field label="Current password" placeholder="••••••••" value={curPass} onChange={e=>setCurPass(e.target.value)} type="password"/>
          <Field label="New password" placeholder="••••••••" value={newPass} onChange={e=>setNewPass(e.target.value)} type="password"/>
          <Msg msg={passMsg}/>
          <button onClick={handleChangePassword} disabled={passSaving} style={{background:T.linen,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,color:T.ink,cursor:"pointer",opacity:passSaving?.6:1}}>{passSaving?"Saving…":"Update Password"}</button>
        </div>
      </div>

      {DIVIDER}

      {isPro
        ? <div style={{...SECTION,background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,border:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>✨</span><div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>Wovely Pro</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>All features active</div></div></div>
          </div>
        : <div style={{...SECTION,background:`linear-gradient(135deg,${T.terra},#8B3A22)`,border:"none"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:4}}>✨ Upgrade to Pro</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.75)",lineHeight:1.5,marginBottom:12}}>Unlimited patterns, all imports, Hive Vision, cloud sync.</div>
            <div onClick={onOpenProModal} style={{background:"rgba(255,255,255,.2)",borderRadius:10,padding:"10px",textAlign:"center",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo</div>
          </div>
      }

      {DIVIDER}

      <div style={SECTION}>
        <div style={SECTION_TITLE}>App Preferences</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontSize:14,color:T.ink3}}>Dark mode</div><div style={{fontSize:11,color:T.ink3,opacity:.6,marginTop:2}}>Coming soon</div></div>
          <div style={{width:44,height:26,borderRadius:13,background:T.border,opacity:.5,position:"relative",cursor:"not-allowed"}}><div style={{width:22,height:22,borderRadius:11,background:"#fff",position:"absolute",top:2,left:2,boxShadow:"0 1px 3px rgba(0,0,0,.15)"}}/></div>
        </div>
      </div>
    </div>
  );
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
        <div style={{width:6,height:6,borderRadius:99,background:T.terra,flexShrink:0}}/><div style={{fontSize:10,color:T.ink3,fontWeight:500}}>Browsing {activeSite.name} inside Wovely</div><div style={{flex:1}}/><div style={{fontSize:10,color:T.ink3,opacity:.6}}>Tap "Save This Pattern" when ready</div>
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

// ─── CLOUDINARY PDF THUMBNAIL HELPER ──────────────────────────────────────
const pdfThumbUrl = (sourceFileUrl) => {
  if (!sourceFileUrl || !sourceFileUrl.endsWith(".pdf")) return null;
  const m = sourceFileUrl.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/);
  if (!m) return null;
  return m[1] + "pg_1,w_400,h_400,c_fill/" + m[2];
};




const SEED_STASH=[
  {id:1,brand:"Lion Brand",name:"Pound of Love",weight:"Worsted",color:"Antique White",colorCode:"#F5F0E1",yardage:315,skeins:2,used:0},
  {id:2,brand:"Red Heart",name:"Super Saver",weight:"Worsted",color:"Cherry Red",colorCode:"#8B1A1A",yardage:364,skeins:1,used:0},
  {id:3,brand:"Caron",name:"Simply Soft",weight:"DK",color:"Ocean",colorCode:"#3A7D8C",yardage:315,skeins:1,used:0},
];
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
            <div style={{flex:1}}><div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Weight</div><select value={weight} onChange={e=>setWeight(e.target.value)} style={{width:"100%",padding:"12px",background:"rgba(250,247,243,0.96)",border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14}}>{["Lace","Fingering","Sport","DK","Worsted","Bulky","Super Bulky"].map(w=><option key={w}>{w}</option>)}</select></div>
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

const SEED_SHOPPING=[
  {id:1,name:"Lion Brand Pound of Love — Antique White",qty:2,unit:"skeins",checked:false},
  {id:2,name:"Clover Amour Crochet Hook Set — 5 sizes",qty:1,unit:"set",checked:false},
  {id:3,name:"Poly-Fil Premium Fiber Fill — 10oz bag",qty:1,unit:"bag",checked:false},
  {id:4,name:"Stitch Markers (locking) — pack of 50",qty:1,unit:"pack",checked:false},
  {id:5,name:"Yarn needle set — tapestry needles",qty:1,unit:"set",checked:false},
];
const ShoppingList = () => {
  const [items,setItems]=useState(SEED_SHOPPING);
  const [newItem,setNewItem]=useState("");
  const{isDesktop:isDsl}=useBreakpoint();
  const toggle=id=>setItems(p=>p.map(i=>i.id===id?{...i,checked:!i.checked}:i));
  const remove=id=>setItems(p=>p.filter(i=>i.id!==id));
  const adjust=(id,d)=>setItems(p=>p.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));
  const addItem=()=>{if(!newItem.trim())return;setItems(p=>[...p,{id:Date.now(),name:newItem.trim(),qty:1,unit:"",checked:false}]);setNewItem("");};
  const unchecked=items.filter(i=>!i.checked),checked=items.filter(i=>i.checked);
  return (
    <div style={{padding:isDsl?"0 0 100px":"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Shopping List</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Everything you need for your current projects.</div>
      {[...unchecked,...checked].map(item=>(
        <div key={item.id} style={{background:T.card,borderRadius:12,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12,opacity:item.checked?.5:1,boxShadow:T.shadow}}>
          <button onClick={()=>toggle(item.id)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${item.checked?T.sage:T.border}`,background:item.checked?T.sage:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}>{item.checked?"✓":""}</button>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,color:T.ink,textDecoration:item.checked?"line-through":"none"}}>{item.name}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
            <button onClick={()=>adjust(item.id,-1)} style={{width:24,height:24,borderRadius:6,border:`1px solid ${T.border}`,background:T.linen,cursor:"pointer",fontSize:14,color:T.ink3}}>−</button>
            <span style={{fontSize:13,fontWeight:600,color:T.ink,minWidth:20,textAlign:"center"}}>{item.qty}</span>
            <button onClick={()=>adjust(item.id,1)} style={{width:24,height:24,borderRadius:6,border:`1px solid ${T.border}`,background:T.linen,cursor:"pointer",fontSize:14,color:T.ink3}}>+</button>
          </div>
          <button onClick={()=>remove(item.id)} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:16,padding:"2px",flexShrink:0}}>×</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()} placeholder="Add an item…" style={{flex:1,padding:"12px 14px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        <button onClick={addItem} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 18px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Add</button>
      </div>
    </div>
  );
};


const STARTER_PHOTO_MAP = {Blankets:PHOTOS.blanket,Amigurumi:PHOTOS.granny,Wearables:PHOTOS.cardigan,Accessories:PHOTOS.tote,Home:PHOTOS.pillow};

const WelcomeToast = ({visible}) => (
  <div style={{position:"fixed",top:16,right:16,zIndex:900,background:T.terra,color:"#fff",borderRadius:14,padding:"12px 24px",fontSize:14,fontWeight:600,boxShadow:"0 8px 32px rgba(184,90,60,.4)",display:"flex",alignItems:"center",gap:8,opacity:visible?1:0,transform:visible?"translateX(0)":"translateX(20px)",transition:"opacity .4s ease, transform .4s ease",pointerEvents:"none"}}>
    <span style={{fontSize:18}}>🐝</span> Welcome back! Your hive is ready.
  </div>
);

const WelcomeBanner = ({visible}) => (
  <div style={{background:T.terra,padding:"10px 16px",display:"flex",alignItems:"center",gap:8,opacity:visible?1:0,maxHeight:visible?50:0,overflow:"hidden",transition:"opacity .4s ease, max-height .4s ease"}}>
    <span style={{fontSize:13,color:"#fff",fontWeight:500,lineHeight:1.4}}>Welcome to Wovely! 🐝 Your starter patterns are ready — start exploring.</span>
  </div>
);

const InfoTooltip = ({text}) => {
  const [show,setShow]=useState(false);
  return (
    <span style={{position:"relative",display:"inline-flex",marginLeft:4,cursor:"pointer"}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(!show)}>
      <span style={{fontSize:12,color:T.ink3,opacity:.7}}>&#9432;</span>
      {show&&<div style={{position:"absolute",bottom:"calc(100% + 6px)",left:"50%",transform:"translateX(-50%)",background:T.ink,color:"#fff",fontSize:11,lineHeight:1.5,padding:"8px 12px",borderRadius:8,width:220,zIndex:10,boxShadow:"0 4px 16px rgba(0,0,0,.2)",pointerEvents:"none"}}>{text}<div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:`6px solid ${T.ink}`}}/></div>}
    </span>
  );
};

const OnboardingScreen = ({onComplete,onBackToAuth}) => {
  const user = supabaseAuth.getUser();
  const session = getSession();
  const emailPrefix = (user?.email||"").split("@")[0].replace(/[^a-zA-Z0-9_]/g,"").slice(0,20);
  const [firstName,setFirstName]=useState(""),[lastName,setLastName]=useState("");
  const [displayName,setDisplayName]=useState(""),[username,setUsername]=useState(emailPrefix);
  const [cellPhone,setCellPhone]=useState(""),[smsOptIn,setSmsOptIn]=useState(true);
  const [saving,setSaving]=useState(false),[error,setError]=useState(null);
  const{isDesktop}=useBreakpoint();

  // Step 2 save — saves to DB, marks onboarding complete, closes modal
  const handleSave = async () => {
    if (!firstName.trim()) { setError("First name is required."); return; }
    if (!lastName.trim()) { setError("Last name is required."); return; }
    if (!displayName.trim()) { setError("Display name is required."); return; }
    const handle = username.trim().replace(/^@/,"");
    if (!handle) { setError("Username is required."); return; }
    if (!/^[a-zA-Z0-9_]{2,30}$/.test(handle)) { setError("Username: 2-30 chars, letters/numbers/underscores only."); return; }
    if (!cellPhone.trim()) { setError("Cell phone is required."); return; }
    setSaving(true); setError(null);
    if (user && session) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}`, {
          method:"PATCH",
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
          body:JSON.stringify({username:handle,display_name:displayName.trim(),first_name:firstName.trim(),last_name:lastName.trim(),cell_phone:cellPhone.trim(),sms_opt_in:smsOptIn,has_completed_onboarding:true}),
        });
        if (!res.ok) {
          const d=await res.json().catch(()=>({}));
          if (d.message?.includes("unique")||d.code==="23505") { setError("Username already taken."); setSaving(false); return; }
          setError(d.message||"Save failed."); setSaving(false); return;
        }
      } catch { setError("Network error."); setSaving(false); return; }
    }
    setSaving(false);
    onComplete();
  };

  const LABEL_WITH_TIP = (label,tip) => (
    <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5,display:"flex",alignItems:"center"}}>{label}<InfoTooltip text={tip}/></div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:T.sans}}>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(12px)"}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",background:"rgba(250,247,243,0.96)",borderRadius:28,boxShadow:"0 20px 60px rgba(139,90,60,.15), 0 0 0 1px rgba(255,255,255,0.45) inset",border:"1px solid rgba(255,255,255,0.38)"}}>
        <div style={{overflowY:"auto",padding:isDesktop?"44px 48px 40px":"28px 24px 32px"}}>
          <button onClick={onBackToAuth} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:13,fontWeight:600,padding:0,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Back</button>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:11,color:T.ink3,fontWeight:500,letterSpacing:".06em",marginBottom:10}}>Step 2 of 2</div>
            <div style={{fontSize:48,marginBottom:12}}>🐝</div>
            <div style={{fontFamily:T.serif,fontSize:isDesktop?32:26,fontWeight:700,color:T.ink,lineHeight:1.1,letterSpacing:"-.02em"}}>Set up your profile</div>
            <p style={{fontSize:14,color:T.ink3,marginTop:8,lineHeight:1.6}}>Let the hive know who you are.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
            <Field label="First name *" placeholder="e.g. Sarah" value={firstName} onChange={e=>setFirstName(e.target.value)}/>
            <Field label="Last name *" placeholder="e.g. Miller" value={lastName} onChange={e=>setLastName(e.target.value)}/>
          </div>
          <div style={{marginBottom:14}}>
            {LABEL_WITH_TIP("Display name *","How other makers see you in The Hive. Can be your name, nickname, anything you like.")}
            <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="e.g. Sarah" style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <div style={{marginBottom:14}}>
            {LABEL_WITH_TIP("Username *","Your unique @handle for your public profile.")}
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.ink3,fontSize:15,pointerEvents:"none"}}>@</span>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="yourhandle" style={{width:"100%",padding:"13px 16px 13px 30px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            {LABEL_WITH_TIP("Cell phone *","Only used for SMS updates if you opt in. Never shared.")}
            <input value={cellPhone} onChange={e=>setCellPhone(e.target.value)} placeholder="e.g. (555) 123-4567" type="tel" style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0 14px"}}>
            <div>
              <div style={{fontSize:13,color:T.ink2,fontWeight:500}}>Text me updates from Wovely</div>
              <div style={{fontSize:11,color:T.ink3,marginTop:2}}>Pattern drops, community updates, and more.</div>
            </div>
            <button onClick={()=>setSmsOptIn(!smsOptIn)} style={{width:44,height:26,borderRadius:13,background:smsOptIn?T.sage:T.border,border:"none",position:"relative",cursor:"pointer",transition:"background .2s ease",flexShrink:0}}>
              <div style={{width:22,height:22,borderRadius:11,background:"#fff",position:"absolute",top:2,left:smsOptIn?20:2,boxShadow:"0 1px 3px rgba(0,0,0,.15)",transition:"left .2s ease"}}/>
            </button>
          </div>
          {error&&<div style={{background:T.terraLt,border:"1px solid rgba(184,90,60,.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:T.terra,lineHeight:1.5,marginBottom:8}}>{error}</div>}
          <button onClick={handleSave} disabled={saving} style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",marginTop:4,opacity:saving?.6:1}}>{saving?"Setting up…":"Set up my profile"}</button>
        </div>
      </div>
    </div>
  );
};

// ─── MASTER DOC VIEWER (private, no app chrome) ──────────────────────────────
const MasterDocView = () => {
  const [pw,setPw]=useState(()=>sessionStorage.getItem("yh_master_pw")||"");
  const [authed,setAuthed]=useState(false);
  const [doc,setDoc]=useState(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [markedReady,setMarkedReady]=useState(false);
  const [activeTab,setActiveTab]=useState("master-doc");
  const {isDesktop}=useBreakpoint();

  // Inject marked.js + noindex meta
  useEffect(()=>{
    const meta=document.createElement("meta");meta.name="robots";meta.content="noindex, nofollow";document.head.appendChild(meta);
    if(!document.getElementById("marked-js")){
      const s=document.createElement("script");s.id="marked-js";s.src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js";
      s.onload=()=>setMarkedReady(true);document.head.appendChild(s);
    } else setMarkedReady(true);
    return ()=>{try{document.head.removeChild(meta);}catch{}};
  },[]);

  const fetchDoc=async(password)=>{
    setLoading(true);setError("");
    try{
      const res=await fetch("/api/master-doc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
      if(res.status===401){setError("Incorrect password");setLoading(false);return;}
      if(!res.ok){setError("Failed to load document");setLoading(false);return;}
      const data=await res.json();
      setDoc(data);setAuthed(true);sessionStorage.setItem("yh_master_pw",password);
    }catch(e){setError("Network error");}
    setLoading(false);
  };

  // Auto-submit on mount if password in sessionStorage
  useEffect(()=>{if(pw)fetchDoc(pw);},[]);

  const renderMarkdown=(content)=>{
    if(!markedReady||!window.marked)return content;
    try{return window.marked.parse(content);}catch{return content;}
  };

  const TabBar = () => (
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`,marginBottom:32}}>
      {[{id:"master-doc",label:"Master Doc"},{id:"changelog",label:"Changelog"}].map(tab=>(
        <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{background:"none",border:"none",borderBottom:activeTab===tab.id?`3px solid ${T.terra}`:"3px solid transparent",padding:"12px 24px",fontSize:14,fontWeight:activeTab===tab.id?700:500,color:activeTab===tab.id?T.ink:T.ink3,cursor:"pointer",transition:"all .15s",letterSpacing:".01em"}}>{tab.label}</button>
      ))}
    </div>
  );

  const ChangelogTab = () => {
    const pad = isDesktop ? "0 0" : "0 0";
    const maxW = isDesktop ? "100%" : "100%";
    return (
      <div style={{maxWidth:maxW,margin:"0 auto",padding:pad}}>
        {/* Hero */}
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:14,color:T.terra,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Release Notes</div>
          <h1 style={{fontFamily:T.serif,fontSize:isDesktop?38:28,fontWeight:700,color:T.ink,lineHeight:1.2,margin:"0 0 12px"}}>What's New in Wovely</h1>
          <p style={{fontSize:15,color:T.ink3,lineHeight:1.6,maxWidth:480,margin:"0 auto"}}>Every stitch of progress, documented. Follow along as we build the crochet companion you deserve.</p>
        </div>
        {/* Coming Soon card */}
        <div style={{background:"linear-gradient(135deg, #2D2235 0%, #1C1724 100%)",borderRadius:20,padding:isDesktop?"32px 36px":"24px 22px",marginBottom:40,border:"1px solid rgba(139,107,174,.25)",boxShadow:"0 8px 32px rgba(44,34,53,.25)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <div style={{background:"rgba(139,107,174,.2)",borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,color:"#C4AAE0",letterSpacing:".06em",textTransform:"uppercase"}}>Coming Soon</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>On the roadmap</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 1fr":"1fr",gap:10}}>
            {COMING_SOON.map((item,i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:"rgba(255,255,255,.04)",borderRadius:12,border:"1px solid rgba(255,255,255,.06)"}}>
                <span style={{color:"#8B6BAE",fontSize:14,marginTop:1,flexShrink:0}}>◇</span>
                <span style={{fontSize:13,color:"rgba(255,255,255,.8)",lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Version entries */}
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:isDesktop?19:15,top:8,bottom:0,width:2,background:T.border,zIndex:0}}/>
          {CHANGELOG_ENTRIES.map((entry, idx) => (
            <div key={entry.version} className="fu" style={{position:"relative",paddingLeft:isDesktop?56:44,marginBottom:idx < CHANGELOG_ENTRIES.length - 1 ? 40 : 0,animationDelay:idx*.08+"s"}}>
              <div style={{position:"absolute",left:isDesktop?10:6,top:6,width:entry.major?22:16,height:entry.major?22:16,borderRadius:99,background:entry.major?T.terra:T.surface,border:`3px solid ${entry.major?T.terra:T.border}`,zIndex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {entry.major && <div style={{width:8,height:8,borderRadius:99,background:"#fff"}}/>}
              </div>
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,overflow:"hidden",boxShadow:entry.major?"0 4px 24px rgba(184,90,60,.1)":T.shadow}}>
                <div style={{padding:isDesktop?"22px 28px 18px":"18px 20px 14px",borderBottom:`1px solid ${T.border}`,background:entry.major?"linear-gradient(135deg, #FAF0EC 0%, "+T.card+" 100%)":T.card}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'DM Sans', monospace",fontSize:isDesktop?22:18,fontWeight:700,color:T.ink,letterSpacing:"-0.02em"}}>{entry.version}</span>
                    {entry.major && <span style={{fontSize:16}} title="Major release">🐝</span>}
                    <span style={{fontSize:12,color:T.ink3,fontWeight:500,marginLeft:"auto"}}>{entry.date}</span>
                  </div>
                </div>
                <div style={{padding:isDesktop?"20px 28px 24px":"16px 20px 20px"}}>
                  {Object.entries(entry.changes).map(([cat, items]) => (
                    <div key={cat} style={{marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{background:CAT_COLORS[cat]||T.terra,borderRadius:6,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff",letterSpacing:".05em",textTransform:"uppercase"}}>{cat}</div>
                        <div style={{flex:1,height:1,background:T.border}}/>
                      </div>
                      {items.map((item, j) => (
                        <div key={j} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0"}}>
                          <span style={{color:CAT_COLORS[cat]||T.terra,fontSize:8,marginTop:5,flexShrink:0}}>●</span>
                          <span style={{fontSize:13,color:T.ink2,lineHeight:1.55}}>{item}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{textAlign:"center",marginTop:56}}>
          <div style={{width:40,height:1,background:T.border,margin:"0 auto 20px"}}/>
          <p style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>That's everything so far. More stitches coming soon.</p>
        </div>
      </div>
    );
  };

  if(authed) return (
    <div style={{minHeight:"100vh",background:"#FAF7F3",fontFamily:'"DM Sans",-apple-system,sans-serif'}}>
      <style>{`
        .md-doc h1,.md-doc h2,.md-doc h3{font-family:"Playfair Display",Georgia,serif;color:#1C1714;margin:1.5em 0 .5em;}
        .md-doc h1{font-size:32px;border-bottom:2px solid #E2D8CC;padding-bottom:12px;}
        .md-doc h2{font-size:24px;color:#B85A3C;}
        .md-doc h3{font-size:18px;}
        .md-doc p{line-height:1.8;color:#5C4F44;margin:.8em 0;}
        .md-doc ul,.md-doc ol{padding-left:24px;color:#5C4F44;line-height:1.8;}
        .md-doc table{width:100%;border-collapse:collapse;margin:1em 0;}
        .md-doc th,.md-doc td{border:1px solid #E2D8CC;padding:10px 14px;text-align:left;font-size:14px;}
        .md-doc th{background:#F0EBE3;font-weight:600;color:#1C1714;}
        .md-doc code{background:#F0EBE3;padding:2px 6px;border-radius:4px;font-size:13px;font-family:monospace;}
        .md-doc pre{background:#F0EBE3;padding:16px;border-radius:10px;overflow-x:auto;margin:1em 0;}
        .md-doc pre code{background:none;padding:0;}
        .md-doc a{color:#B85A3C;text-decoration:underline;}
        .md-doc blockquote{border-left:4px solid #B85A3C;margin:1em 0;padding:8px 16px;background:#F5E2DA;border-radius:0 8px 8px 0;}
      `}</style>
      <CSS/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <div style={{fontFamily:'"Playfair Display",Georgia,serif',fontSize:28,fontWeight:700,color:"#1C1714"}}>Wovely Admin</div>
            <div style={{fontSize:13,color:"#9E8E82",marginTop:4}}>{doc?`Version ${doc.version} · Updated ${new Date(doc.updated_at).toLocaleDateString()}`:""}</div>
          </div>
          <button onClick={()=>{sessionStorage.removeItem("yh_master_pw");setDoc(null);setAuthed(false);setPw("");}} style={{background:"#F0EBE3",border:"1px solid #E2D8CC",borderRadius:8,padding:"8px 16px",fontSize:13,color:"#5C4F44",cursor:"pointer"}}>Lock</button>
        </div>
        <TabBar/>
        {activeTab==="master-doc" && doc && (
          <>
            {doc.change_summary&&<div style={{background:"#F5E2DA",borderRadius:10,padding:"12px 16px",marginBottom:24,fontSize:13,color:"#B85A3C",lineHeight:1.6}}>Latest changes: {doc.change_summary}</div>}
            <div className="md-doc" dangerouslySetInnerHTML={{__html:renderMarkdown(doc.content)}}/>
          </>
        )}
        {activeTab==="changelog" && <ChangelogTab/>}
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#FAF7F3",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:'"DM Sans",-apple-system,sans-serif'}}>
      <div style={{width:"100%",maxWidth:380,padding:"40px 32px",background:"#FAF7F3",borderRadius:20,border:"1px solid #E2D8CC",boxShadow:"0 8px 32px rgba(139,90,60,.08)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:12}}>🐝</div>
          <div style={{fontFamily:'"Playfair Display",Georgia,serif',fontSize:22,fontWeight:700,color:"#1C1714"}}>Wovely Admin</div>
          <div style={{fontSize:13,color:"#9E8E82",marginTop:6}}>Enter password to view</div>
        </div>
        <input value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchDoc(pw)} type="password" placeholder="Password" style={{width:"100%",padding:"13px 16px",background:"#EDE8E0",border:"1.5px solid #E2D8CC",borderRadius:12,color:"#1C1714",fontSize:15,marginBottom:12,outline:"none"}}/>
        {error&&<div style={{fontSize:12,color:"#B85A3C",marginBottom:10}}>{error}</div>}
        <button onClick={()=>fetchDoc(pw)} disabled={loading||!pw} style={{width:"100%",background:"#B85A3C",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:600,cursor:"pointer",opacity:loading?.6:1}}>{loading?"Loading…":"Unlock"}</button>
      </div>
    </div>
  );
};

// ─── CHANGELOG DATA & PAGE ──────────────────────────────────────────────────
const CHANGELOG_ENTRIES = [
  {
    version: "v1.5.x", date: "March 24, 2026", major: true,
    changes: {
      "New": [
        "PDF pattern import with Gemini AI extraction",
        "Collapsible component sections in row manager",
        "Make count tracking (FLIPPER x2 = 2 passes)",
        "Assembly & Finishing extracted as final component",
        "Pattern Notes collapsible header in row manager",
        "Action item rows (place eyes, begin stuffing) with visual treatment",
      ],
      "Improved": [
        "RND vs ROW labeling now detects construction type",
        "Multi-round expansion — RND 10-23 becomes 14 individual rows",
        "View Source Pattern pill in row manager",
      ],
      "Fixed": [
        "Starter patterns always show 5 in nav count",
        "Pattern sort order — newest first, starters below",
      ],
    },
  },
  {
    version: "v1.4.x", date: "March 22, 2026", major: false,
    changes: {
      "New": [
        "Real Supabase auth — signup, signin, signout, session persistence",
        "Three-step onboarding flow",
        "Profile & Settings view",
        "Builds in Progress with live count in nav",
        "Starter patterns (Granny Square, Amigurumi Ball, Basic Beanie)",
        "Row notes persist to Supabase",
      ],
      "Fixed": [
        "Stale sessions redirect to welcome screen correctly",
      ],
    },
  },
  {
    version: "v1.3.x", date: "March 20, 2026", major: true,
    changes: {
      "New": [
        "Wovely brand launch — retired Stitch Box",
        "Smart Import URL pipeline with og:image extraction",
        "Hive Vision (Snap to Pattern) with Gemini Vision",
        "Social sharing with milestone banners and share cards",
        "Welcome screen with illustrated world background",
        "Bee animation (pure CSS — mobile Safari safe)",
        "Free/Pro/App Store modals",
        "Waitlist email capture live in Supabase",
      ],
    },
  },
];

const COMING_SOON = [
  "Sub-counter / in-row repeat tracker for bracket repeats",
  "Stitch tutorial videos (Bella Coco integration)",
  "Hive Vision end-to-end (multi-angle scan)",
  "iOS and Android apps",
];

const CAT_COLORS = {
  "New": T.terra,
  "Improved": T.sage,
  "Fixed": T.gold,
  "Coming Soon": "#8B6BAE",
};

const ChangelogPage = () => {
  const navigate = useNavigate();
  const {isDesktop} = useBreakpoint();

  useEffect(() => {
    document.title = "Wovely Changelog";
    let ogTitle = document.querySelector('meta[property="og:title"]');
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogTitle) { ogTitle = document.createElement("meta"); ogTitle.setAttribute("property","og:title"); document.head.appendChild(ogTitle); }
    if (!ogDesc) { ogDesc = document.createElement("meta"); ogDesc.setAttribute("property","og:description"); document.head.appendChild(ogDesc); }
    ogTitle.setAttribute("content", "Wovely Changelog");
    ogDesc.setAttribute("content", "What's new in Wovely");
    return () => { document.title = "Wovely"; };
  }, []);

  const pad = isDesktop ? "0 60px" : "0 20px";
  const maxW = isDesktop ? 720 : "100%";

  return (
    <div style={{fontFamily:T.sans,background:T.bg,minHeight:"100vh"}}>
      <CSS/>
      {/* Header bar */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>navigate("/")}>
          <span style={{fontSize:22}}>🐝</span>
          <span style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>Wovely</span>
        </div>
        <div style={{fontSize:12,color:T.ink3,fontWeight:500,letterSpacing:".04em",textTransform:"uppercase"}}>Changelog</div>
      </div>

      <div style={{maxWidth:maxW,margin:"0 auto",padding:pad,paddingTop:40,paddingBottom:100}}>
        {/* Hero */}
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:14,color:T.terra,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Release Notes</div>
          <h1 style={{fontFamily:T.serif,fontSize:isDesktop?38:28,fontWeight:700,color:T.ink,lineHeight:1.2,margin:"0 0 12px"}}>What's New in Wovely</h1>
          <p style={{fontSize:15,color:T.ink3,lineHeight:1.6,maxWidth:480,margin:"0 auto"}}>Every stitch of progress, documented. Follow along as we build the crochet companion you deserve.</p>
        </div>

        {/* Coming Soon card */}
        <div style={{background:"linear-gradient(135deg, #2D2235 0%, #1C1724 100%)",borderRadius:20,padding:isDesktop?"32px 36px":"24px 22px",marginBottom:40,border:"1px solid rgba(139,107,174,.25)",boxShadow:"0 8px 32px rgba(44,34,53,.25)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
            <div style={{background:"rgba(139,107,174,.2)",borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,color:"#C4AAE0",letterSpacing:".06em",textTransform:"uppercase"}}>Coming Soon</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>On the roadmap</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 1fr":"1fr",gap:10}}>
            {COMING_SOON.map((item,i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:"rgba(255,255,255,.04)",borderRadius:12,border:"1px solid rgba(255,255,255,.06)"}}>
                <span style={{color:"#8B6BAE",fontSize:14,marginTop:1,flexShrink:0}}>◇</span>
                <span style={{fontSize:13,color:"rgba(255,255,255,.8)",lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Version entries */}
        <div style={{position:"relative"}}>
          {/* Timeline line */}
          <div style={{position:"absolute",left:isDesktop?19:15,top:8,bottom:0,width:2,background:T.border,zIndex:0}}/>

          {CHANGELOG_ENTRIES.map((entry, idx) => (
            <div key={entry.version} className="fu" style={{position:"relative",paddingLeft:isDesktop?56:44,marginBottom:idx < CHANGELOG_ENTRIES.length - 1 ? 40 : 0,animationDelay:idx*.08+"s"}}>
              {/* Timeline dot */}
              <div style={{position:"absolute",left:isDesktop?10:6,top:6,width:entry.major?22:16,height:entry.major?22:16,borderRadius:99,background:entry.major?T.terra:T.surface,border:`3px solid ${entry.major?T.terra:T.border}`,zIndex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {entry.major && <div style={{width:8,height:8,borderRadius:99,background:"#fff"}}/>}
              </div>

              {/* Version card */}
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,overflow:"hidden",boxShadow:entry.major?"0 4px 24px rgba(184,90,60,.1)":T.shadow}}>
                {/* Version header */}
                <div style={{padding:isDesktop?"22px 28px 18px":"18px 20px 14px",borderBottom:`1px solid ${T.border}`,background:entry.major?"linear-gradient(135deg, #FAF0EC 0%, "+T.card+" 100%)":T.card}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'DM Sans', monospace",fontSize:isDesktop?22:18,fontWeight:700,color:T.ink,letterSpacing:"-0.02em"}}>{entry.version}</span>
                    {entry.major && <span style={{fontSize:16}} title="Major release">🐝</span>}
                    <span style={{fontSize:12,color:T.ink3,fontWeight:500,marginLeft:"auto"}}>{entry.date}</span>
                  </div>
                </div>

                {/* Change categories */}
                <div style={{padding:isDesktop?"20px 28px 24px":"16px 20px 20px"}}>
                  {Object.entries(entry.changes).map(([cat, items]) => (
                    <div key={cat} style={{marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{background:CAT_COLORS[cat]||T.terra,borderRadius:6,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff",letterSpacing:".05em",textTransform:"uppercase"}}>{cat}</div>
                        <div style={{flex:1,height:1,background:T.border}}/>
                      </div>
                      {items.map((item, j) => (
                        <div key={j} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0"}}>
                          <span style={{color:CAT_COLORS[cat]||T.terra,fontSize:8,marginTop:5,flexShrink:0}}>●</span>
                          <span style={{fontSize:13,color:T.ink2,lineHeight:1.55}}>{item}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{textAlign:"center",marginTop:56,padding:"0 20px"}}>
          <div style={{width:40,height:1,background:T.border,margin:"0 auto 20px"}}/>
          <p style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>That's everything so far. More stitches coming soon.</p>
          <div style={{marginTop:16}}>
            <button onClick={()=>navigate("/")} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 28px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)"}}>Open Wovely</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Wovely() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authed,setAuthed]=useState(false),[isPro,setIsPro]=useState(false);
  const [authChecked,setAuthChecked]=useState(false);
  const [userPatterns,setUserPatterns]=useState([]);
  const [starterPatterns,setStarterPatterns]=useState(()=>makeStarterPatterns());
  // Derive view from URL path instead of state
  const view = viewFromPath(location.pathname);
  const [selected,setSelected]=useState(null),[navOpen,setNavOpen]=useState(false),[addOpen,setAddOpen]=useState(false),[showPaywall,setShowPaywall]=useState(false),[cat,setCat]=useState("All"),[search,setSearch]=useState("");
  const [showEmailBanner,setShowEmailBanner]=useState(false);
  const [showWelcomeBanner,setShowWelcomeBanner]=useState(false);
  const [showWelcomeToast,setShowWelcomeToast]=useState(false);
  const [showProModal,setShowProModal]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [justCompletedOnboarding,setJustCompletedOnboarding]=useState(false);
  const [createdPattern,setCreatedPattern]=useState(null);
  const [readyPromptPattern,setReadyPromptPattern]=useState(null);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [coverPickerTarget,setCoverPickerTarget]=useState(null);
  const{isTablet,isDesktop}=useBreakpoint();
  const allPatterns = [...userPatterns,...starterPatterns];
  const userStarterCount=userPatterns.filter(p=>p.isStarter).length;
  const tier=useTier(isPro,userPatterns.length,userStarterCount);

  // Validate session against Supabase on mount
  useEffect(()=>{
    const clearAuth = () => {
      saveSession(null);
      setAuthed(false);
    };
    const validate = async () => {
      const s = getSession();
      if (!s?.refresh_token) { clearAuth(); setAuthChecked(true); return; }
      const localUser = supabaseAuth.getUser();
      if (!localUser) { clearAuth(); setAuthChecked(true); return; }
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method:"POST",
          headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
          body:JSON.stringify({refresh_token:s.refresh_token}),
        });
        if (res.ok) {
          const ns = await res.json();
          saveSession(ns);
          setAuthed(true);
          // Check if onboarding was completed
          try {
            const uid = (() => { try { const p=JSON.parse(atob(ns.access_token.split(".")[1])); return p.sub; } catch { return null; } })();
            if (uid) {
              const pr = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${uid}&select=has_completed_onboarding`, {
                headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${ns.access_token}`},
              });
              if (pr.ok) {
                const rows = await pr.json();
                if (rows[0] && !rows[0].has_completed_onboarding) setShowOnboarding(true);
              }
            }
          } catch {}
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      }
      setAuthChecked(true);
    };
    validate();
  },[]);

  const handleSignOut = async () => { await supabaseAuth.signOut(); setAuthed(false); setIsPro(false); setUserPatterns([]); navigate("/"); };

  // Navigation helper — translates view keys to URL paths
  const navigateToView = useCallback((v, patternId) => {
    if (v === "detail" && patternId) {
      navigate("/hive/" + encodeURIComponent(patternId));
    } else {
      const path = VIEW_TO_PATH[v] || "/hive";
      if (path !== location.pathname) navigate(path);
    }
  }, [navigate, location.pathname]);

  // Starter patterns are hardcoded in DEFAULT_STARTERS — no DB fetch needed

  // Fetch user's saved patterns from Supabase on login
  useEffect(()=>{
    console.log("[Wovely] Pattern fetch triggered, authed:", authed, "authChecked:", authChecked);
    if(!authed||!authChecked) return;
    const user=supabaseAuth.getUser();
    const session=getSession();
    console.log("[Wovely] Pattern fetch user id:", user?.id);
    if(!user||!session) return;
    (async()=>{
      try{
        const res=await fetch(`${SUPABASE_URL}/rest/v1/patterns?user_id=eq.${user.id}&order=created_at.desc`,{
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`},
        });
        if(res.ok){
          const data=await res.json();
          console.log("[Wovely] Pattern fetch raw response:", JSON.stringify(data));
          console.log("[Wovely] Pattern fetch count:", data.length);
          if(data.length>0){
            const patterns=data.map(r=>({
              id:r.id,_supabaseId:r.id,title:r.title||"",cat:r.cat||"",source:r.source||"",source_url:r.source_url||"",
              notes:r.notes||"",photo:r.cover_image_url||r.photo||r.image_url||"",cover_image_url:r.cover_image_url||null,hook:r.hook||r.hook_size||"",weight:r.weight||r.yarn_weight||"",
              yardage:r.yardage||0,materials:r.materials||[],rows:(r.rows||[]).map(row=>({...row,done:!!row.done})),
              rating:r.rating||0,skeins:r.skeins||0,skeinYards:r.skein_yards||200,
              gauge:r.gauge||{stitches:12,rows:16,size:4},dimensions:r.dimensions||{},
              isStarter:!!r.is_starter,is_ai_generated:!!r.is_ai_generated,difficulty:r.difficulty||"",tags:r.tags||[],started:r.status==="in_progress",
              source_file_url:r.source_file_url||"",source_file_name:r.source_file_name||"",source_file_type:r.source_file_type||"",
            }));
            // Backfill known patterns missing cover images
            const MARINA_COVER="https://res.cloudinary.com/dmaupzhcx/image/upload/v1774406086/l0rdxjgszsdkctqrnyeh.png";
            patterns.forEach(p=>{
              if(!p.cover_image_url&&p.title&&p.title.toLowerCase().includes("marina")){
                p.cover_image_url=MARINA_COVER;p.photo=MARINA_COVER;
                // Also persist to Supabase
                const pid=p._supabaseId||p.id;
                if(user&&session&&typeof pid==="string"){
                  fetch(`${SUPABASE_URL}/rest/v1/patterns?id=eq.${pid}&user_id=eq.${user.id}`,{method:"PATCH",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({cover_image_url:MARINA_COVER})}).catch(()=>{});
                }
              }
            });
            setUserPatterns(prev=>{
              // Keep local-only patterns (starters, unsaved) that aren't in Supabase
              const supaIds=new Set(patterns.map(p=>p.id));
              const localOnly=prev.filter(p=>!supaIds.has(p.id)&&!supaIds.has(p._supabaseId));
              console.log("[Wovely] Merge: Supabase patterns:", patterns.length, "local-only kept:", localOnly.length, localOnly.map(p=>p.title));
              return [...patterns,...localOnly];
            });
          }else{
            console.log("[Wovely] No patterns in Supabase for this user, keeping local state as-is");
          }
        }else{
          const errText=await res.text();
          console.error("[Wovely] Patterns fetch failed:", res.status, errText);
        }
      }catch(e){console.error("[Wovely] Fetch patterns error:",e);}
    })();
  },[authed,authChecked]);

  // Deep-link resolution: when URL is /hive/:id, resolve selected pattern from loaded data
  useEffect(()=>{
    if(view!=="detail") return;
    const pid=patternIdFromPath(location.pathname);
    if(!pid) return;
    if(selected&&(String(selected.id)===pid||String(selected._supabaseId)===pid)) return;
    const allP=[...userPatterns,...starterPatterns];
    const match=allP.find(p=>String(p.id)===pid||String(p._supabaseId)===pid);
    if(match) setSelected(match);
    else if(authed&&authChecked&&allP.length>0) navigate("/hive",{replace:true});
  },[view,location.pathname,userPatterns,starterPatterns,authed,authChecked]);

  // /hive-vision route: open add-pattern modal (Hive Vision tab) and redirect to /hive
  useEffect(()=>{
    if(view==="hive-vision"&&authed){
      setAddOpen(true);
      navigate("/hive",{replace:true});
    }
  },[view,authed]);

  const isEmailConfirmed = () => {
    const s = getSession(); if(!s?.access_token) return false;
    try { const p=JSON.parse(atob(s.access_token.split(".")[1])); return !!p.email_confirmed_at; } catch { return false; }
  };

  // Poll for email confirmation when banner is visible — auto-dismiss when confirmed (GET only)
  useEffect(()=>{
    if (!showEmailBanner || !authed) return;
    const poll = setInterval(async ()=>{
      const s = getSession();
      if (!s?.access_token) return;
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${s.access_token}`},
        });
        if (res.ok) {
          const u = await res.json();
          if (u.email_confirmed_at) {
            // Confirmed — refresh token once to update JWT
            if (s.refresh_token) {
              try {
                const tr = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                  method:"POST",
                  headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
                  body:JSON.stringify({refresh_token:s.refresh_token}),
                });
                if (tr.ok) saveSession(await tr.json());
              } catch {}
            }
            setShowEmailBanner(false);
            clearInterval(poll);
          }
        }
      } catch {}
    }, 10000);
    return ()=>clearInterval(poll);
  },[showEmailBanner,authed]);

  const showEmailBannerIfNeeded = () => {
    if (!isEmailConfirmed() && !sessionStorage.getItem("yh_banner_dismissed")) setShowEmailBanner(true);
  };

  const handleResendEmail = async () => {
    const user = supabaseAuth.getUser();
    const s = getSession();
    if (!user || !s) return;
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
        method:"POST",
        headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
        body:JSON.stringify({type:"signup",email:user.email,options:{emailRedirectTo:APP_ORIGIN}}),
      });
    } catch {}
  };

  const handleDismissEmailBanner = () => {
    setShowEmailBanner(false);
    sessionStorage.setItem("yh_banner_dismissed","1");
  };

  const handleNewSignup = () => {
    setAuthed(true);
    navigate("/hive");
    setShowOnboarding(true);
    setShowWelcomeBanner(true);
    setTimeout(()=>{
      setShowWelcomeBanner(false);
      showEmailBannerIfNeeded();
    },4000);
  };

  const handleSignIn = () => {
    setAuthed(true);
    navigate("/hive");
    setShowWelcomeToast(true);
    setTimeout(()=>setShowWelcomeToast(false),3000);
    showEmailBannerIfNeeded();
  };

  // Private route: /master-doc (includes changelog tab) — rendered before auth check
  if(location.pathname==="/master-doc") return <MasterDocView/>;
  // Redirect old /changelog URL to /master-doc
  if(location.pathname==="/changelog") return <Navigate to="/master-doc" replace/>;
  // Show nothing until session is validated against Supabase
  if(!authChecked) return <><CSS/><div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spinner" style={{width:28,height:28,border:`3px solid ${T.border}`,borderTopColor:T.terra,borderRadius:"50%"}}/></div></>;
  if(!authed) {
    // Auth guard: redirect any non-root path to / when not logged in
    if(location.pathname!=="/") return <Navigate to="/" replace/>;
    return <><CSS/><WaitlistPopup/><Auth onEnter={handleSignIn} onEnterAsNew={handleNewSignup}/></>;
  }
  // Authed users on root redirect to /hive
  if(location.pathname==="/") return <Navigate to="/hive" replace/>;
  // Unknown routes redirect to /hive
  const knownPaths=["/hive","/builds","/browse","/stash","/tools","/shopping","/profile","/hive-vision","/master-doc"];
  if(!knownPaths.some(p=>location.pathname===p||location.pathname.startsWith("/hive/"))) return <Navigate to="/hive" replace/>;
  const detailOnSave=u=>{
    setUserPatterns(prev=>prev.map(p=>p.id===u.id?u:p));setStarterPatterns(prev=>prev.map(p=>p.id===u.id?u:p));setSelected(u);
    const user=supabaseAuth.getUser();const session=getSession();
    const pid=u._supabaseId||u.id;
    if(user&&session&&typeof pid==="string"&&!pid.startsWith("local_")&&!pid.startsWith("onboard_")&&!pid.startsWith("starter_")){
      fetch(`${SUPABASE_URL}/rest/v1/patterns?id=eq.${pid}&user_id=eq.${user.id}`,{
        method:"PATCH",
        headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
        body:JSON.stringify({rows:u.rows||[],row_count:(u.rows||[]).length,updated_at:new Date().toISOString(),source_file_url:u.source_file_url||null,source_file_name:u.source_file_name||null,source_file_type:u.source_file_type||null}),
      }).then(r=>{console.log("[Wovely] Row progress PATCH status:",r.status,"for pattern:",pid);if(!r.ok)r.text().then(t=>console.error("[Wovely] Row PATCH error body:",t));}).catch(e=>console.error("[Wovely] Row progress save error:",e));
    }
  };
  const detailOnBack=()=>navigate(-1);
  if(view==="detail"&&selected&&!isDesktop) return <><CSS/><Detail p={selected} onBack={detailOnBack} onSave={detailOnSave} pct={pct} estYards={estYards} estSkeins={estSkeins} pdfThumbUrl={pdfThumbUrl} CSS={CSS} Bar={Bar} Photo={Photo} Stars={Stars} WireframeViewer={WireframeViewer} Btn={Btn}/></>;

  const startAndOpenPattern=(p)=>{
    const updated={...p,started:true};
    setUserPatterns(prev=>prev.map(x=>x.id===p.id?updated:x));
    setStarterPatterns(prev=>prev.map(x=>x.id===p.id?updated:x));
    setSelected(updated);
    // Persist started status to Supabase
    const user=supabaseAuth.getUser();const session=getSession();
    const pid=p._supabaseId||p.id;
    if(user&&session&&typeof pid==="string"&&!pid.startsWith("local_")&&!pid.startsWith("starter_")){
      fetch(`${SUPABASE_URL}/rest/v1/patterns?id=eq.${pid}&user_id=eq.${user.id}`,{
        method:"PATCH",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
        body:JSON.stringify({status:"in_progress"}),
      }).catch(e=>console.error("[Wovely] Start pattern error:",e));
    }
    navigateToView("detail",p._supabaseId||p.id);
  };
  const openDetail=p=>{
    // Show "Ready to build?" prompt for unstarted patterns with rows
    if(!p.started&&!p.isStarter&&p.rows&&p.rows.length>0&&pct(p)===0){
      setReadyPromptPattern(p);
      return;
    }
    // Auto-start starter patterns on first open
    if(!p.started&&p.rows&&p.rows.length>0){
      startAndOpenPattern(p);
    } else {
      setSelected(p);
      navigateToView("detail",p._supabaseId||p.id);
    }
  };
  const handleAddPattern=async(p)=>{
    const user=supabaseAuth.getUser();
    const session=getSession();
    // Optimistically add to local state
    const localId=p.id||"local_"+Date.now();
    const localPattern={...p,id:localId};
    setUserPatterns(prev=>[localPattern,...prev]);
    setCreatedPattern(localPattern);
    // Persist to Supabase
    if(user&&session){
      try{
        const res=await fetch(`${SUPABASE_URL}/rest/v1/patterns`,{
          method:"POST",
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=representation"},
          body:JSON.stringify({user_id:user.id,title:p.title||"",cat:p.cat||"",source:p.source||"",source_url:p.source_url||"",notes:p.notes||"",difficulty:p.difficulty||"",yarn_weight:p.weight||"",hook_size:p.hook||"",gauge:p.gauge||{},tags:p.tags||[],is_ai_generated:!!p.is_ai_generated,is_starter:!!p.isStarter,image_url:p.image_url||"",photo:p.photo||"",cover_image_url:p.cover_image_url||null,row_count:(p.rows||[]).length,materials:p.materials||[],rows:p.rows||[],rating:p.rating||0,yardage:p.yardage||0,skeins:p.skeins||0,skein_yards:p.skeinYards||200,dimensions:p.dimensions||{},weight:p.weight||"",hook:p.hook||"",source_file_url:p.source_file_url||null,source_file_name:p.source_file_name||null,source_file_type:p.source_file_type||null,extracted_by_ai:!!p.extracted_by_ai,components:p.components||null}),
        });
        console.log("[Wovely] INSERT response status:", res.status);
        if(res.ok){
          const rows=await res.json();
          console.log("[Wovely] INSERT response body:", JSON.stringify(rows));
          if(rows[0]?.id){
            console.log("[Wovely] Pattern saved with Supabase ID:", rows[0].id);
            // Update local state with Supabase ID
            setUserPatterns(prev=>prev.map(pat=>pat.id===localId?{...pat,id:rows[0].id,_supabaseId:rows[0].id}:pat));
            setCreatedPattern(prev=>prev&&prev.id===localId?{...prev,id:rows[0].id,_supabaseId:rows[0].id}:prev);
          }
        }else{const errText=await res.text();console.error("[Wovely] Pattern save failed:",res.status,errText);}
      }catch(e){console.error("[Wovely] Pattern save error:",e);}
    }
  };
  const openAddModal=()=>{if(tier.atCap){setShowPaywall(true);return;}setAddOpen(true);};
  const updatePatternStatus=(p,status)=>{
    const updated={...p,status};
    setUserPatterns(prev=>prev.map(x=>x.id===p.id?updated:x));
    setStarterPatterns(prev=>prev.map(x=>x.id===p.id?updated:x));
    const user=supabaseAuth.getUser();const session=getSession();
    const pid=p._supabaseId||p.id;
    if(user&&session&&typeof pid==="string"&&!pid.startsWith("local_")&&!pid.startsWith("starter_")){
      fetch(`${SUPABASE_URL}/rest/v1/patterns?id=eq.${pid}&user_id=eq.${user.id}`,{
        method:"PATCH",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
        body:JSON.stringify({status,updated_at:new Date().toISOString()}),
      }).catch(e=>console.error("[Wovely] Status update error:",e));
    }
  };
  const handleParkPattern=(p)=>updatePatternStatus(p,"parked");
  const handleUnparkPattern=(p)=>updatePatternStatus(p,"active");
  const handleDeletePattern=(p)=>setDeleteTarget(p);
  const confirmDelete=()=>{if(deleteTarget){updatePatternStatus(deleteTarget,"deleted");setDeleteTarget(null);}};
  const parkInsteadOfDelete=()=>{if(deleteTarget){updatePatternStatus(deleteTarget,"parked");setDeleteTarget(null);}};
  const handleCoverChange=(p)=>setCoverPickerTarget(p);
  const handleCoverConfirm=async(imageUrl)=>{
    const p=coverPickerTarget;if(!p)return;
    let finalUrl=imageUrl;
    // Optimistic UI update
    const update=pat=>pat.id===p.id?{...pat,cover_image_url:finalUrl,photo:finalUrl||pat.photo}:pat;
    setUserPatterns(prev=>prev.map(update));
    if(selected&&selected.id===p.id)setSelected(prev=>prev?{...prev,cover_image_url:finalUrl,photo:finalUrl||prev.photo}:prev);
    setCoverPickerTarget(null);
    // Persist to Supabase
    const user=supabaseAuth.getUser();const session=getSession();
    const pid=p._supabaseId||p.id;
    if(user&&session&&typeof pid==="string"&&!pid.startsWith("local_")&&!pid.startsWith("starter_")){
      fetch(`${SUPABASE_URL}/rest/v1/patterns?id=eq.${pid}&user_id=eq.${user.id}`,{
        method:"PATCH",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
        body:JSON.stringify({cover_image_url:finalUrl,updated_at:new Date().toISOString()}),
      }).then(r=>{if(r.ok)console.log("[Wovely] Cover image updated for",pid);else r.text().then(t=>console.error("[Wovely] Cover PATCH error:",t));}).catch(e=>console.error("[Wovely] Cover save error:",e));
    }
  };
  const inProgress=allPatterns.filter(p=>{const v=pct(p);return !p.isStarter&&p.status!=="deleted"&&p.status!=="parked"&&((p.status==="in_progress"&&v<100)||(p.started&&v<100)||(v>0&&v<100));});
  const TITLE_MAP={collection:"Your Hive",wip:"Builds in Progress",browse:"Browse Sites",stash:"Yarn Stash",calculator:"Calculators",shopping:"Shopping List",profile:"Profile & Settings"};

  if(isDesktop) return (
    <div style={{display:"flex",minHeight:"100vh",width:"100%",background:T.bg,fontFamily:T.sans,position:"relative"}}>
      <CSS/>
      {showOnboarding&&<OnboardingScreen onComplete={()=>{setShowOnboarding(false);setJustCompletedOnboarding(true);localStorage.removeItem("yh_welcome_dismissed");navigate("/profile");}} onBackToAuth={async()=>{setShowOnboarding(false);await supabaseAuth.signOut();setAuthed(false);setIsPro(false);setUserPatterns([]);}}/>}
      {showPaywall&&<PaywallGate patternCount={userPatterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {showProModal&&<ProInfoModal onClose={()=>setShowProModal(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={userPatterns.length} Btn={Btn} Photo={Photo} Bar={Bar} WireframeViewer={WireframeViewer}/>}
      {createdPattern&&<PatternCreatedOverlay pattern={createdPattern} onStartBuilding={()=>{const p=createdPattern;setCreatedPattern(null);startAndOpenPattern(p);}} onGoToHive={()=>{setCreatedPattern(null);navigateToView("collection");}}/>}
      {readyPromptPattern&&<ReadyToBuildPrompt pattern={readyPromptPattern} onStartBuilding={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);startAndOpenPattern(p);}} onViewDetails={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);setSelected(p);navigateToView("detail",p._supabaseId||p.id);}} onDismiss={()=>setReadyPromptPattern(null)}/>}
      {deleteTarget&&<DeleteConfirmModal pattern={deleteTarget} isPro={isPro} onCancel={()=>setDeleteTarget(null)} onDelete={confirmDelete} onPark={parkInsteadOfDelete} onGoPro={()=>{setDeleteTarget(null);setShowProModal(true);}}/>}
      {coverPickerTarget&&<CoverImagePicker pattern={coverPickerTarget} onConfirm={handleCoverConfirm} onClose={()=>setCoverPickerTarget(null)} pdfThumbUrl={pdfThumbUrl} CAT_IMG={CAT_IMG} ALL_CAT_ENTRIES={ALL_CAT_ENTRIES}/>}
      <WelcomeToast visible={showWelcomeToast}/>
      <SidebarNav view={view} onNavigate={navigateToView} count={userPatterns.length} isPro={isPro} onAddPattern={openAddModal} onSignOut={handleSignOut} onUpgrade={()=>setShowProModal(true)} userPatterns={userPatterns} allPatterns={allPatterns}/>
      <div style={{flex:1,minWidth:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <WelcomeBanner visible={showWelcomeBanner}/>
        {showEmailBanner&&!showWelcomeBanner&&<EmailConfirmBanner onDismiss={handleDismissEmailBanner} onResend={handleResendEmail}/>}
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 40px",height:64,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
          <div style={{fontFamily:T.serif,fontSize:24,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"Wovely"}</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isPro&&<div style={{background:T.sage,borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>✨ Pro</div>}
            <button onClick={openAddModal} style={{background:T.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>+</span> Add Pattern</button>
          </div>
        </div>
        <div style={{flex:1,padding:"0 40px"}}>
          {view==="collection"&&<CollectionView userPatterns={userPatterns} starterPatterns={starterPatterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier} onNavigate={navigateToView} onPark={handleParkPattern} onUnpark={handleUnparkPattern} onDelete={handleDeletePattern} onCoverChange={handleCoverChange} pct={pct} pdfThumbUrl={pdfThumbUrl} catFallbackPhoto={catFallbackPhoto} Photo={Photo} Bar={Bar} Stars={Stars} CATS={CATS} TIER_CONFIG={TIER_CONFIG}/>}
          {view==="wip"&&<div style={{padding:"24px 0 80px"}}><button onClick={()=>navigateToView("collection")} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:13,fontWeight:600,padding:0,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Back</button>{inProgress.length===0?<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:20,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:14,color:T.ink3}}>Open a pattern and start checking off rows.</div></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>{inProgress.map((p,i)=>{const v=pct(p),done=p.rows.filter(r=>r.done).length;return(<div key={p.id} className="card fu" onClick={()=>openDetail(p)} style={{background:T.card,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",animationDelay:i*.06+"s"}}><div style={{position:"relative",height:140,overflow:"hidden",background:T.linen}}><Photo src={p.cover_image_url||pdfThumbUrl(p.source_file_url)||p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.5) 0%,transparent 55%)"}}/><div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={v} color="rgba(255,255,255,.85)" h={4} bg="rgba(0,0,0,.2)"/></div>{p.isStarter&&<div style={{position:"absolute",top:8,left:8,background:"rgba(184,144,44,.9)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Free Starter</div>}</div><div style={{padding:"12px 14px 14px"}}><div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:3}}>{p.cat}</div><div style={{fontFamily:T.serif,fontSize:14,fontWeight:500,color:T.ink,lineHeight:1.3,marginBottom:6}}>{p.title}</div><div style={{fontSize:11,color:T.ink3,marginBottom:8}}>{done} of {p.rows.length} rows complete</div><button style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Continue →</button></div></div>);})}</div>}</div>}
          {view==="detail"&&selected&&<div style={{margin:"0 -40px"}}><Detail p={selected} onBack={detailOnBack} onSave={detailOnSave} pct={pct} estYards={estYards} estSkeins={estSkeins} pdfThumbUrl={pdfThumbUrl} CSS={CSS} Bar={Bar} Photo={Photo} Stars={Stars} WireframeViewer={WireframeViewer} Btn={Btn}/></div>}
          {view==="browse"&&<BrowseSitesView onSavePattern={handleAddPattern}/>}
          {view==="stash"&&<div style={{paddingTop:24}}><YarnStash/></div>}
          {view==="calculator"&&<div style={{paddingTop:24}}><Calculators/></div>}
          {view==="shopping"&&<div style={{paddingTop:24}}><ShoppingList/></div>}
          {view==="profile"&&<ProfileSettingsView isPro={isPro} onOpenProModal={()=>setShowProModal(true)} onGoHome={()=>navigate("/hive")} onEmailConfirmed={()=>setShowEmailBanner(false)}/>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:T.sans,background:T.bg,minHeight:"100vh",maxWidth:isTablet?680:430,margin:"0 auto",display:"flex",flexDirection:"column",position:"relative"}}>
      <CSS/>
      {showOnboarding&&<OnboardingScreen onComplete={()=>{setShowOnboarding(false);setJustCompletedOnboarding(true);localStorage.removeItem("yh_welcome_dismissed");navigate("/profile");}} onBackToAuth={async()=>{setShowOnboarding(false);await supabaseAuth.signOut();setAuthed(false);setIsPro(false);setUserPatterns([]);}}/>}
      <WelcomeToast visible={showWelcomeToast}/>
      <NavPanel open={navOpen} onClose={()=>setNavOpen(false)} view={view} onNavigate={navigateToView} count={userPatterns.length} isPro={isPro} onSignOut={handleSignOut} onUpgrade={()=>setShowProModal(true)}/>
      {showPaywall&&<PaywallGate patternCount={userPatterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {showProModal&&<ProInfoModal onClose={()=>setShowProModal(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={userPatterns.length} Btn={Btn} Photo={Photo} Bar={Bar} WireframeViewer={WireframeViewer}/>}
      {createdPattern&&<PatternCreatedOverlay pattern={createdPattern} onStartBuilding={()=>{const p=createdPattern;setCreatedPattern(null);startAndOpenPattern(p);}} onGoToHive={()=>{setCreatedPattern(null);navigateToView("collection");}}/>}
      {readyPromptPattern&&<ReadyToBuildPrompt pattern={readyPromptPattern} onStartBuilding={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);startAndOpenPattern(p);}} onViewDetails={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);setSelected(p);navigateToView("detail",p._supabaseId||p.id);}} onDismiss={()=>setReadyPromptPattern(null)}/>}
      {deleteTarget&&<DeleteConfirmModal pattern={deleteTarget} isPro={isPro} onCancel={()=>setDeleteTarget(null)} onDelete={confirmDelete} onPark={parkInsteadOfDelete} onGoPro={()=>{setDeleteTarget(null);setShowProModal(true);}}/>}
      {showEmailBanner&&<EmailConfirmBanner onDismiss={handleDismissEmailBanner} onResend={handleResendEmail}/>}
      {showWelcomeBanner&&<WelcomeBanner onDismiss={()=>setShowWelcomeBanner(false)}/>}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 18px",height:56,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
        <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 8px 8px 0",display:"flex",flexDirection:"column",gap:5}}><div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/><div style={{width:15,height:1.5,background:T.ink,borderRadius:99}}/><div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/></button>
        <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"Wovely"}</div>
        <button onClick={openAddModal} style={{background:T.terra,border:"none",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(184,90,60,.4)"}}>+</button>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
        {view==="collection"&&<CollectionView userPatterns={userPatterns} starterPatterns={starterPatterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier} onNavigate={navigateToView} onPark={handleParkPattern} onUnpark={handleUnparkPattern} onDelete={handleDeletePattern} onCoverChange={handleCoverChange} pct={pct} pdfThumbUrl={pdfThumbUrl} catFallbackPhoto={catFallbackPhoto} Photo={Photo} Bar={Bar} Stars={Stars} CATS={CATS} TIER_CONFIG={TIER_CONFIG}/>}
        {view==="wip"&&<div style={{padding:"16px 18px 80px"}}>{inProgress.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Open a pattern and start checking off rows.</div></div>:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{inProgress.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.06} onClick={()=>openDetail(p)} pct={pct} pdfThumbUrl={pdfThumbUrl} catFallbackPhoto={catFallbackPhoto} Photo={Photo} Bar={Bar} Stars={Stars}/>)}</div>}</div>}
        {view==="browse"&&<BrowseSitesView onSavePattern={handleAddPattern}/>}
        {view==="stash"&&<div style={{paddingTop:18}}><YarnStash/></div>}
        {view==="calculator"&&<div style={{paddingTop:18}}><Calculators/></div>}
        {view==="shopping"&&<div style={{paddingTop:18}}><ShoppingList/></div>}
        {view==="profile"&&<ProfileSettingsView isPro={isPro} onOpenProModal={()=>setShowProModal(true)} onGoHome={()=>navigate("/hive")} onEmailConfirmed={()=>setShowEmailBanner(false)}/>}
      </div>
      <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:30,pointerEvents:"none"}}>
        <button onClick={openAddModal} style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:99,padding:"13px 26px",fontSize:14,fontWeight:700,cursor:"pointer",pointerEvents:"auto",boxShadow:"0 8px 28px rgba(184,90,60,.55)",display:"flex",alignItems:"center",gap:8,animation:"fabPulse 3s ease infinite"}}><span style={{fontSize:17}}>+</span> Add Pattern</button>
      </div>
    </div>
  );
}
