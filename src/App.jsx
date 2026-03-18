import { useState, useCallback } from "react";

/* ─── FONT ───────────────────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("sb-font")) {
  const l = document.createElement("link");
  l.id = "sb-font";
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600&display=swap";
  document.head.appendChild(l);
}

/* ─── PHOTOS ─────────────────────────────────────────────────────────────── */
const PHOTOS = {
  hero:     "https://images.unsplash.com/photo-1604537529428-15bcbeecfe4d?w=800&q=80",
  blanket:  "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600&q=80",
  cardigan: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&q=80",
  granny:   "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80",
  tote:     "https://images.unsplash.com/photo-1473188588951-666fce8e7c68?w=600&q=80",
  pillow:   "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=600&q=80",
  market:   "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&q=80",
  auth:     "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&q=80",
  yarn1:    "https://images.unsplash.com/photo-1610878180933-123728745d23?w=600&q=80",
  yarn2:    "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600&q=80",
};

const PILL = [PHOTOS.blanket, PHOTOS.cardigan, PHOTOS.granny, PHOTOS.tote, PHOTOS.pillow, PHOTOS.market];

/* ─── TOKENS ─────────────────────────────────────────────────────────────── */
const T = {
  bg:      "#FAF7F3",
  surface: "#FFFFFF",
  linen:   "#F4EDE3",
  ink:     "#1C1714",
  ink2:    "#5C4F44",
  ink3:    "#9E8E82",
  border:  "#EAE0D5",
  terra:   "#B85A3C",
  terraLt: "#F5E2DA",
  sage:    "#5C7A5E",
  sageLt:  "#D8EAD8",
  gold:    "#B8902C",
  serif:   '"Playfair Display", Georgia, serif',
  sans:    '"Inter", -apple-system, sans-serif',
};

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { display: none; }
    body { background: #FAF7F3; }
    input, textarea, button, select { font-family: "Inter", -apple-system, sans-serif; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideInLeft  { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes slideOutLeft { from{transform:translateX(0);opacity:1} to{transform:translateX(-100%);opacity:0} }
    @keyframes dimIn  { from{opacity:0} to{opacity:1} }
    @keyframes dimOut { from{opacity:1} to{opacity:0} }
    .fu { animation:fadeUp .4s ease both; }
    .nav-open  { animation:slideInLeft  .3s cubic-bezier(.22,.68,0,1.05) both; }
    .nav-close { animation:slideOutLeft .24s ease both; }
    .dim-in { animation:dimIn  .25s ease both; }
    .dim-out{ animation:dimOut .2s  ease both; }
    .card { transition:transform .18s,box-shadow .18s; box-shadow:0 2px 10px rgba(28,23,20,.06); }
    .card:hover { transform:translateY(-3px) !important; box-shadow:0 12px 30px rgba(28,23,20,.13) !important; }
    .tap { transition:opacity .15s; }
    .tap:hover { opacity:.85; }
    input:focus, textarea:focus, select:focus { outline:none; }
  `}</style>
);

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
const pct = p => p.rows.length ? Math.round(p.rows.filter(r=>r.done).length/p.rows.length*100) : 0;

const Bar = ({val, color=T.terra, h=3, bg=T.border}) => (
  <div style={{background:bg,borderRadius:99,height:h,overflow:"hidden"}}>
    <div style={{width:`${val}%`,height:h,background:color,borderRadius:99,transition:"width .5s"}}/>
  </div>
);

const Stars = ({val=0, onChange, ro}) => (
  <div style={{display:"flex",gap:2}}>
    {[1,2,3,4,5].map(i=>(
      <span key={i} onClick={()=>!ro&&onChange?.(i)}
        style={{fontSize:12,cursor:ro?"default":"pointer",color:i<=val?T.gold:T.border}}>★</span>
    ))}
  </div>
);

const Photo = ({src, alt, style:sx}) => {
  const [err,setErr] = useState(false);
  if(err) return <div style={{...sx,background:`linear-gradient(145deg,#C4855A,#6B3A22)`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32,opacity:.4}}>🧶</span></div>;
  return <img src={src} alt={alt} onError={()=>setErr(true)} style={{...sx,objectFit:"cover",display:"block"}}/>;
};

const Btn = ({children,onClick,variant="primary",full=true,small=false,disabled=false,style:sx={}}) => {
  const styles = {
    primary:   {background:T.terra,color:"#fff",border:"none"},
    secondary: {background:T.linen,color:T.ink,border:`1px solid ${T.border}`},
    ghost:     {background:"none",color:T.ink3,border:"none"},
    sage:      {background:T.sage,color:"#fff",border:"none"},
    danger:    {background:"#C0392B",color:"#fff",border:"none"},
  };
  return (
    <button onClick={onClick} disabled={disabled} className="tap" style={{
      ...styles[variant],
      borderRadius:12, padding:small?"8px 16px":"14px 20px",
      fontSize:small?13:15, fontWeight:600, cursor:disabled?"not-allowed":"pointer",
      width:full?"100%":"auto", opacity:disabled?.6:1,
      boxShadow:variant==="primary"?"0 4px 16px rgba(184,90,60,.3)":variant==="sage"?"0 4px 16px rgba(92,122,94,.3)":"none",
      ...sx
    }}>{children}</button>
  );
};

const Field = ({label,value,onChange,type="text",placeholder,rows:r}) => (
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>{label}</div>}
    {r
      ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={r}
          style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14,resize:"vertical",lineHeight:1.6}}
          onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
      : <input value={value} onChange={onChange} type={type} placeholder={placeholder}
          style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}}
          onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
    }
  </div>
);

/* ─── SEED DATA ─────────────────────────────────────────────────────────── */
const SEED_PATTERNS = [
  {
    id:1, photo:PHOTOS.blanket, title:"Autumn Ridge Throw",
    source:"ravelry.com", cat:"Blankets", hook:"6.0mm", weight:"Bulky",
    rating:5, yardage:1200, skeins:4, skeinYards:300,
    gauge:{stitches:12,rows:16,size:4},
    dimensions:{width:50,height:60},
    notes:"Caron Simply Soft in Autumn Maize, Burgundy, and Sage. Block lightly.",
    materials:[
      {id:1,name:"Bulky yarn — Autumn Maize",amount:"300g",yardage:300},
      {id:2,name:"Bulky yarn — Burgundy",amount:"300g",yardage:300},
      {id:3,name:"Bulky yarn — Sage",amount:"300g",yardage:300},
      {id:4,name:"6.0mm crochet hook",amount:"1"},
      {id:5,name:"Yarn needle",amount:"1"},
    ],
    rows:[
      {id:1,text:"Foundation chain: Ch 120 loosely",done:true,note:""},
      {id:2,text:"Row 1: Sc in 2nd ch from hook and across (119 sts)",done:true,note:""},
      {id:3,text:"Rows 2–15: Ch 1 turn, sc across — Autumn Maize",done:true,note:""},
      {id:4,text:"Row 16: Join Burgundy, sc across",done:false,note:""},
      {id:5,text:"Rows 17–30: Sc across, Burgundy section",done:false,note:""},
      {id:6,text:"Row 31: Join Sage, sc across",done:false,note:""},
      {id:7,text:"Rows 32–45: Sc across, Sage section",done:false,note:""},
      {id:8,text:"Repeat 3-color block sequence twice more",done:false,note:""},
      {id:9,text:"Border Rnd 1: Sc evenly around, 3 sc in corners",done:false,note:""},
      {id:10,text:"Border Rnd 2: Reverse sc (crab stitch) — fasten off",done:false,note:""},
    ]
  },
  {
    id:2, photo:PHOTOS.cardigan, title:"Coastal Shell Cardigan",
    source:"lovecrafts.com", cat:"Wearables", hook:"4.5mm", weight:"DK",
    rating:4, yardage:900, skeins:5, skeinYards:180,
    gauge:{stitches:18,rows:20,size:4},
    dimensions:{width:20,height:26},
    notes:"Size M. Add 2 rows per size up. Mark raglan seams carefully.",
    materials:[
      {id:1,name:"DK cotton yarn — driftwood",amount:"500g",yardage:500},
      {id:2,name:"4.5mm crochet hook",amount:"1"},
      {id:3,name:"Stitch markers",amount:"8"},
      {id:4,name:"Shell buttons 15mm",amount:"5"},
    ],
    rows:[
      {id:1,text:"Back panel: Ch 82, shell stitch 40 rows",done:true,note:""},
      {id:2,text:"Front panels ×2: Ch 42 each, match back",done:true,note:""},
      {id:3,text:"Sleeves ×2: Inc 1 st each side every 6th row",done:false,note:""},
      {id:4,text:"Join shoulders with slip stitch seam",done:false,note:""},
      {id:5,text:"Set in sleeves, seam underarms",done:false,note:""},
      {id:6,text:"Neckline: 3 rounds sc, picot edge",done:false,note:""},
      {id:7,text:"Button band along front opening",done:false,note:""},
      {id:8,text:"Sew buttons, weave ends, block flat",done:false,note:""},
    ]
  },
  {
    id:3, photo:PHOTOS.granny, title:"Meadow Granny Squares",
    source:"sarahmaker.com", cat:"Blankets", hook:"4.0mm", weight:"Worsted",
    rating:5, yardage:1500, skeins:10, skeinYards:150,
    gauge:{stitches:16,rows:18,size:4},
    dimensions:{width:48,height:60},
    notes:"48 squares in 12 color combinations. Flat join creates beautiful ridge.",
    materials:[
      {id:1,name:"Worsted yarn — 10 assorted colors",amount:"50g each",yardage:150},
      {id:2,name:"4.0mm hook",amount:"1"},
      {id:3,name:"Yarn needle",amount:"1"},
    ],
    rows:[
      {id:1,text:"Magic ring, [ch 3, 2 dc, ch 2] ×4, sl st",done:true,note:""},
      {id:2,text:"Rnd 2: Corner clusters + ch-1 side spaces",done:true,note:""},
      {id:3,text:"Rnd 3: Larger corners, 2 side groups",done:true,note:""},
      {id:4,text:"Complete all 48 squares — 12 color combos",done:false,note:""},
      {id:5,text:"Lay out 6×8 grid, photograph arrangement",done:false,note:""},
      {id:6,text:"Join squares into rows — sc flat join",done:false,note:""},
      {id:7,text:"Join all rows together",done:false,note:""},
      {id:8,text:"Outer border: 3 rounds, picot finish",done:false,note:""},
    ]
  },
];

const SEED_STASH = [
  {id:1,brand:"Lion Brand",name:"Pound of Love",weight:"Worsted",color:"Antique White",colorCode:"#F5F0E8",yardage:1020,skeins:2,used:0},
  {id:2,brand:"Caron",name:"Simply Soft",weight:"Worsted",color:"Autumn Maize",colorCode:"#D4A44C",yardage:315,skeins:3,used:0},
  {id:3,brand:"WeCrochet",name:"Swish DK",weight:"DK",color:"Cobblestone Heather",colorCode:"#8A8078",yardage:123,skeins:4,used:0},
  {id:4,brand:"Paintbox",name:"Simply DK",weight:"DK",color:"Pillar Red",colorCode:"#C0392B",yardage:137,skeins:2,used:0},
];

const CATS = ["All","Blankets","Wearables","Accessories","Amigurumi","Home Décor"];

/* ══════════════════════════════════════════════════════════════════════════
   NAV PANEL
══════════════════════════════════════════════════════════════════════════ */
const NavPanel = ({open,onClose,view,setView,count}) => {
  const [closing,setClosing] = useState(false);
  const dismiss = () => {setClosing(true);setTimeout(()=>{setClosing(false);onClose();},220);};
  const go = v => {setView(v);dismiss();};
  if(!open) return null;

  const ITEMS = [
    {key:"collection",  label:"My Patterns",    sub:`${count} patterns saved`, icon:"🧶"},
    {key:"wip",         label:"In Progress",    sub:"Currently making",        icon:"🪡"},
    {key:"find",        label:"Find Patterns",  sub:"Browse & import",         icon:"🔍"},
    {key:"create",      label:"Create Pattern", sub:"Build from scratch",      icon:"✍️"},
    {key:"stash",       label:"Yarn Stash",     sub:"Manage your yarn",        icon:"🎀"},
    {key:"calculator",  label:"Calculators",    sub:"Gauge, yardage & more",   icon:"🧮"},
    {key:"shopping",    label:"Shopping List",  sub:"Auto-generated needs",    icon:"🛒"},
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:100}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss}
        style={{position:"absolute",inset:0,background:"rgba(28,23,20,.52)",backdropFilter:"blur(3px)"}}/>
      <div className={closing?"nav-close":"nav-open"}
        style={{position:"absolute",top:0,left:0,bottom:0,width:"80%",maxWidth:320,background:T.surface,display:"flex",flexDirection:"column",boxShadow:"6px 0 40px rgba(28,23,20,.2)"}}>
        {/* Header */}
        <div style={{position:"relative",height:130,overflow:"hidden",flexShrink:0}}>
          <Photo src={PHOTOS.hero} alt="crochet" style={{width:"100%",height:"100%"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.8) 0%,rgba(20,14,10,.2) 100%)"}}/>
          <div style={{position:"absolute",bottom:16,left:18}}>
            <div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:"#fff",lineHeight:1}}>Stitch Box</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:3}}>Your crochet collection</div>
          </div>
        </div>
        {/* Items */}
        <div style={{flex:1,overflowY:"auto",paddingTop:6}}>
          {ITEMS.map(item=>{
            const active = view===item.key;
            return (
              <div key={item.key} onClick={()=>go(item.key)}
                style={{display:"flex",alignItems:"center",gap:13,padding:"13px 20px",borderLeft:`3px solid ${active?T.terra:"transparent"}`,background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}
                onMouseEnter={e=>!active&&(e.currentTarget.style.background=T.linen)}
                onMouseLeave={e=>!active&&(e.currentTarget.style.background="transparent")}>
                <span style={{fontSize:20,width:26,textAlign:"center"}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>{item.label}</div>
                  <div style={{fontSize:11,color:T.ink3,marginTop:1}}>{item.sub}</div>
                </div>
                {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
              </div>
            );
          })}
        </div>
        {/* Pro card */}
        <div style={{padding:"14px 18px 36px"}}>
          <div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.8)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, PDF export, cloud sync & pattern scaling.</div>
            <div style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>$3.99 / month</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════════════════ */
const Auth = ({onEnter}) => {
  const [screen,setScreen] = useState("welcome");
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const [name,setName]   = useState("");

  if(screen==="welcome") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column"}}>
      <CSS/>
      <div style={{flex:1,position:"relative",overflow:"hidden",minHeight:460}}>
        <Photo src={PHOTOS.hero} alt="crochet" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(15,10,8,.92) 0%,rgba(15,10,8,.15) 55%,transparent 100%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 28px 36px"}}>
          <div style={{fontFamily:T.serif,fontSize:46,fontWeight:700,color:"#fff",lineHeight:1,marginBottom:10,letterSpacing:"-.02em"}}>Stitch Box</div>
          <p style={{fontSize:16,color:"rgba(255,255,255,.72)",lineHeight:1.65,maxWidth:290}}>
            Save every pattern. Track every row.<br/>Scale, calculate, and create.
          </p>
        </div>
      </div>
      <div style={{background:T.surface,padding:"28px 22px 48px",display:"flex",flexDirection:"column",gap:12}}>
        <Btn onClick={()=>setScreen("signup")}>Create free account</Btn>
        <Btn variant="secondary" onClick={()=>setScreen("signin")}>Sign in</Btn>
        <Btn variant="ghost" onClick={onEnter}>Continue without account →</Btn>
        <p style={{fontSize:11,color:T.ink3,textAlign:"center",lineHeight:1.6}}>Free: up to 10 patterns · Pro $3.99/mo: unlimited + export + sync</p>
      </div>
    </div>
  );

  const isSignup = screen==="signup";
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column"}}>
      <CSS/>
      <div style={{height:200,position:"relative",overflow:"hidden"}}>
        <Photo src={PHOTOS.auth} alt="yarn" style={{width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",inset:0,background:"rgba(15,10,8,.45)"}}/>
        <div style={{position:"absolute",bottom:22,left:24}}>
          <div style={{fontFamily:T.serif,fontSize:28,color:"#fff",fontWeight:700}}>{isSignup?"Create account":"Welcome back"}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.65)",marginTop:3}}>{isSignup?"Start your pattern collection":"Your patterns are waiting"}</div>
        </div>
      </div>
      <div style={{flex:1,padding:"28px 24px 40px"}}>
        {isSignup&&<Field label="Your name" placeholder="e.g. Sarah" value={name} onChange={e=>setName(e.target.value)}/>}
        <Field label="Email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
        <Field label="Password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} type="password"/>
        {!isSignup&&<div style={{textAlign:"right",marginBottom:18}}><span style={{fontSize:13,color:T.terra,cursor:"pointer"}}>Forgot password?</span></div>}
        <Btn onClick={onEnter} style={{marginTop:8,marginBottom:12}}>{isSignup?"Create my Stitch Box":"Sign in"}</Btn>
        <Btn variant="ghost" onClick={()=>setScreen("welcome")} full>← Back</Btn>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   PATTERN CARD
══════════════════════════════════════════════════════════════════════════ */
const PatternCard = ({p,onClick,delay=0}) => {
  const done = pct(p);
  return (
    <div className="card fu" onClick={onClick} style={{background:T.surface,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",animationDelay:`${delay}s`}}>
      <div style={{position:"relative",height:150,overflow:"hidden",background:T.linen}}>
        <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.5) 0%,transparent 55%)"}}/>
        {done===100&&<div style={{position:"absolute",top:10,right:10,background:T.sage,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99,letterSpacing:".07em"}}>DONE</div>}
        {done>0&&done<100&&<div style={{position:"absolute",top:10,right:10,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{done}%</div>}
        {done>0&&done<100&&<div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={done} color="rgba(255,255,255,.8)" h={3} bg="transparent"/></div>}
      </div>
      <div style={{padding:"11px 13px 14px"}}>
        <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:3}}>{p.cat}</div>
        <div style={{fontFamily:T.serif,fontSize:15,fontWeight:500,color:T.ink,lineHeight:1.3,marginBottom:7}}>{p.title}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <Stars val={p.rating} ro/>
          <span style={{fontSize:11,color:T.ink3}}>{p.source}</span>
        </div>
      </div>
    </div>
  );
};

const ShelfCard = ({p,onClick}) => {
  const v = pct(p);
  return (
    <div onClick={onClick} style={{minWidth:160,borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,background:T.surface,cursor:"pointer",flexShrink:0,boxShadow:"0 2px 8px rgba(28,23,20,.06)",transition:"transform .16s,box-shadow .16s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(28,23,20,.12)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(28,23,20,.06)";}}>
      <div style={{height:100,position:"relative",background:T.linen,overflow:"hidden"}}>
        <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={v} color={T.terra} h={3} bg="rgba(0,0,0,.2)"/></div>
      </div>
      <div style={{padding:"9px 12px 11px"}}>
        <div style={{fontFamily:T.serif,fontSize:13,color:T.ink,lineHeight:1.3,marginBottom:2}}>{p.title}</div>
        <div style={{fontSize:11,color:T.terra,fontWeight:600}}>{v}% done</div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SCALING ENGINE MODAL
══════════════════════════════════════════════════════════════════════════ */
const ScaleModal = ({pattern,onClose}) => {
  const orig = pattern.dimensions || {width:50,height:60};
  const origGauge = pattern.gauge || {stitches:12,rows:16,size:4};
  const [newW,setNewW] = useState(String(orig.width));
  const [newH,setNewH] = useState(String(orig.height));
  const [gSt,setGSt]   = useState(String(origGauge.stitches));
  const [gRo,setGRo]   = useState(String(origGauge.rows));

  const scaleW = parseFloat(newW)/orig.width || 1;
  const scaleH = parseFloat(newH)/orig.height || 1;
  const scaledYardage = Math.ceil((pattern.yardage||1000) * scaleW * scaleH);
  const scaledSkeins  = Math.ceil(scaledYardage / (pattern.skeinYards||200));

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(28,23,20,.6)",display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"85vh",overflow:"auto",padding:"24px 22px 40px"}}>
        <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:4}}>Pattern Scaling</div>
        <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Adjust dimensions to automatically recalculate stitch counts and yardage.</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div>
            <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>New Width (in)</div>
            <input value={newW} onChange={e=>setNewW(e.target.value)} type="number"
              style={{width:"100%",padding:"12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:16,fontWeight:600,color:T.ink,textAlign:"center"}}
              onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <div>
            <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>New Height (in)</div>
            <input value={newH} onChange={e=>setNewH(e.target.value)} type="number"
              style={{width:"100%",padding:"12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:16,fontWeight:600,color:T.ink,textAlign:"center"}}
              onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
        </div>

        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:20}}>
          <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:12}}>Gauge (per 4 inches)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <div style={{fontSize:11,color:T.ink3,marginBottom:4}}>Stitches</div>
              <input value={gSt} onChange={e=>setGSt(e.target.value)} type="number"
                style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center"}}/>
            </div>
            <div>
              <div style={{fontSize:11,color:T.ink3,marginBottom:4}}>Rows</div>
              <input value={gRo} onChange={e=>setGRo(e.target.value)} type="number"
                style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center"}}/>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",marginBottom:20,border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:12}}>Scaled Results</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              ["Starting stitches", Math.round((parseFloat(gSt)||12)/4 * parseFloat(newW)||0)],
              ["Total rows",        Math.round((parseFloat(gRo)||16)/4 * parseFloat(newH)||0)],
              ["Yardage needed",    `~${scaledYardage} yds`],
              ["Skeins needed",     `${scaledSkeins} skeins`],
              ["Scale factor W",    `${(scaleW*100).toFixed(0)}%`],
              ["Scale factor H",    `${(scaleH*100).toFixed(0)}%`],
            ].map(([label,val])=>(
              <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div>
                <div style={{fontSize:18,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{fontSize:12,color:T.ink3,textAlign:"center",marginBottom:16,lineHeight:1.6}}>
          Original: {orig.width}" × {orig.height}" · {pattern.yardage||1000} yards · {pattern.skeins||5} skeins
        </div>
        <Btn onClick={onClose} variant="secondary">Close</Btn>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   DETAIL VIEW
══════════════════════════════════════════════════════════════════════════ */
const Detail = ({p,onBack,onSave}) => {
  const [rows,setRows]       = useState(p.rows);
  const [tab,setTab]         = useState("rows");
  const [newRow,setNewRow]   = useState("");
  const [editing,setEditing] = useState(false);
  const [draft,setDraft]     = useState({...p});
  const [showScale,setShowScale] = useState(false);
  const [noteEdit,setNoteEdit]   = useState(null);
  const done = pct({...p,rows});
  const currentRowIdx = rows.findIndex(r=>!r.done);

  const toggle = id => {
    const next = rows.map(r=>r.id===id?{...r,done:!r.done}:r);
    setRows(next); onSave({...p,rows:next});
  };
  const addRow = () => {
    if(!newRow.trim()) return;
    const next=[...rows,{id:Date.now(),text:newRow.trim(),done:false,note:""}];
    setRows(next); onSave({...p,rows:next}); setNewRow("");
  };
  const save = () => {onSave({...draft,rows});setEditing(false);};
  const updateNote = (id,note) => {
    const next=rows.map(r=>r.id===id?{...r,note}:r);
    setRows(next); onSave({...p,rows:next});
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg,overflow:"hidden"}}>
      <CSS/>
      {showScale&&<ScaleModal pattern={p} onClose={()=>setShowScale(false)}/>}

      {/* Hero */}
      <div style={{position:"relative",flexShrink:0,height:230,overflow:"hidden",background:T.linen}}>
        <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.9) 0%,rgba(20,14,10,.2) 55%,transparent 100%)"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,padding:"16px 18px",display:"flex",justifyContent:"space-between"}}>
          <button onClick={onBack} style={{background:"rgba(15,10,8,.4)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 16px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500}}>← Back</button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowScale(true)} style={{background:"rgba(15,10,8,.4)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"7px 14px",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>⚖️ Scale</button>
            <button onClick={()=>editing?save():setEditing(true)} style={{background:editing?T.terra:"rgba(15,10,8,.4)",backdropFilter:"blur(8px)",border:`1px solid ${editing?T.terra:"rgba(255,255,255,.15)"}`,borderRadius:10,padding:"7px 16px",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>{editing?"Save":"Edit"}</button>
          </div>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 20px 16px"}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.55)",textTransform:"uppercase",letterSpacing:".09em",marginBottom:4}}>{p.cat} · Hook {p.hook} · {p.weight}</div>
          {editing
            ?<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} style={{width:"100%",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:19,fontFamily:T.serif,outline:"none"}}/>
            :<div style={{fontFamily:T.serif,fontSize:21,fontWeight:700,color:"#fff",lineHeight:1.2}}>{p.title}</div>
          }
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><Bar val={done} color={T.terra} h={4} bg="rgba(255,255,255,.25)"/></div>
            <span style={{color:"#fff",fontSize:13,fontWeight:600,minWidth:36}}>{done}%</span>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:3}}>{rows.filter(r=>r.done).length} of {rows.length} rows complete</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:T.surface,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        {[["rows","Rows"],["materials","Materials"],["notes","Notes"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"13px 0",border:"none",background:"transparent",color:tab===key?T.terra:T.ink3,fontWeight:tab===key?600:400,fontSize:13,cursor:"pointer",borderBottom:`2px solid ${tab===key?T.terra:"transparent"}`,transition:"color .15s"}}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"4px 20px 36px"}}>

        {tab==="rows"&&<>
          {rows.map((r,i)=>{
            const isCurrent = i===currentRowIdx;
            return (
              <div key={r.id}>
                <div onClick={()=>toggle(r.id)}
                  style={{display:"flex",gap:13,alignItems:"flex-start",padding:"14px 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:isCurrent?"rgba(184,90,60,.04)":"transparent",margin:"0 -8px",padding:"14px 8px",borderRadius:isCurrent?8:0}}>
                  <div style={{width:26,height:26,borderRadius:7,flexShrink:0,marginTop:1,background:r.done?T.terra:T.surface,border:`1.5px solid ${r.done?T.terra:isCurrent?T.terra:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:r.done?"0 2px 8px rgba(184,90,60,.3)":isCurrent?"0 0 0 3px rgba(184,90,60,.15)":"none"}}>
                    {r.done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                    {!r.done&&isCurrent&&<div style={{width:8,height:8,borderRadius:99,background:T.terra}}/>}
                  </div>
                  <div style={{flex:1}}>
                    {isCurrent&&<div style={{fontSize:10,color:T.terra,fontWeight:600,letterSpacing:".06em",marginBottom:2}}>CURRENT ROW</div>}
                    {!isCurrent&&<div style={{fontSize:10,color:T.ink3,letterSpacing:".06em",marginBottom:2}}>ROW {i+1}</div>}
                    <div style={{fontSize:14,lineHeight:1.6,color:r.done?T.ink3:T.ink,textDecoration:r.done?"line-through":"none",transition:"all .2s"}}>{r.text}</div>
                    {r.note&&<div style={{fontSize:12,color:T.ink3,fontStyle:"italic",marginTop:4}}>📝 {r.note}</div>}
                  </div>
                  <button onClick={e=>{e.stopPropagation();setNoteEdit(noteEdit===r.id?null:r.id);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:"4px",color:r.note?T.terra:T.border}}>📝</button>
                </div>
                {noteEdit===r.id&&(
                  <div style={{padding:"8px 0 12px",borderBottom:`1px solid ${T.border}`}}>
                    <input value={r.note} onChange={e=>updateNote(r.id,e.target.value)} placeholder="Add a note for this row…"
                      style={{width:"100%",padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.terra}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}}/>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <input value={newRow} onChange={e=>setNewRow(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRow()} placeholder="Add a row or step…"
              style={{flex:1,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"10px 14px",fontSize:13,color:T.ink,background:T.linen,outline:"none",transition:"border-color .15s"}}
              onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
            <button onClick={addRow} style={{background:T.terra,color:"#fff",border:"none",borderRadius:11,padding:"10px 18px",fontSize:22,cursor:"pointer",lineHeight:1,boxShadow:"0 4px 12px rgba(184,90,60,.35)"}}>+</button>
          </div>
          {/* Repeat section helper */}
          <div style={{marginTop:16,background:T.linen,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:11,color:T.ink3,fontWeight:600,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Repeat Section</div>
            <div style={{fontSize:13,color:T.ink2}}>Tap <strong>+</strong> and type <code style={{background:"rgba(0,0,0,.06)",padding:"1px 5px",borderRadius:4}}>Repeat rows X–Y, Z times</code> to add a repeat block.</div>
          </div>
        </>}

        {tab==="materials"&&<>
          {(editing?draft.materials:p.materials).map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:6,height:6,borderRadius:99,background:T.terra,flexShrink:0}}/>
              {editing
                ?<div style={{display:"flex",gap:8,flex:1}}>
                    <input value={m.name} onChange={e=>{const a=[...draft.materials];a[i]={...a[i],name:e.target.value};setDraft({...draft,materials:a});}} style={{flex:1,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,background:T.linen,color:T.ink,outline:"none"}}/>
                    <input value={m.amount} onChange={e=>{const a=[...draft.materials];a[i]={...a[i],amount:e.target.value};setDraft({...draft,materials:a});}} style={{width:80,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,background:T.linen,color:T.ink,outline:"none"}}/>
                  </div>
                :<div style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:14,color:T.ink2,lineHeight:1.5}}>{m.name}</span>
                    <span style={{fontSize:12,color:T.ink3,fontWeight:600}}>{m.amount}</span>
                  </div>
              }
            </div>
          ))}
          {editing&&<button onClick={()=>setDraft({...draft,materials:[...draft.materials,{id:Date.now(),name:"",amount:"",yardage:0}]})} style={{marginTop:14,width:"100%",border:`1.5px dashed ${T.border}`,background:"none",borderRadius:11,padding:"10px",color:T.ink3,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>+ Add material</button>}

          {/* Yarn calculation summary */}
          <div style={{marginTop:20,background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:10}}>Yarn Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                ["Total yardage",`~${p.yardage||"??"} yds`],
                ["Skeins needed",`${p.skeins||"??"} skeins`],
                ["Hook size",p.hook||"??"],
                ["Yarn weight",p.weight||"??"],
              ].map(([label,val])=>(
                <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"9px 11px"}}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div>
                  <div style={{fontSize:16,fontWeight:700,fontFamily:T.serif,color:T.ink}}>{val}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowScale(true)} style={{marginTop:12,width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              ⚖️ Scale pattern to different size →
            </button>
          </div>

          <div style={{display:"flex",gap:10,marginTop:14}}>
            {[["Hook Size","hook"],["Yarn Weight","weight"]].map(([label,key])=>(
              <div key={key} style={{flex:1,background:T.linen,borderRadius:12,padding:"12px 14px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{label}</div>
                {editing?<input value={draft[key]||""} onChange={e=>setDraft({...draft,[key]:e.target.value})} style={{border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 8px",fontSize:14,width:"100%",background:"#fff",color:T.ink,outline:"none"}}/>:<div style={{fontFamily:T.serif,fontSize:18,fontWeight:500,color:T.ink}}>{p[key]||"—"}</div>}
              </div>
            ))}
          </div>
        </>}

        {tab==="notes"&&(
          <div style={{paddingTop:10}}>
            {editing?<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} style={{width:"100%",minHeight:140,border:`1.5px solid ${T.border}`,borderRadius:12,padding:14,fontSize:14,lineHeight:1.75,resize:"vertical",outline:"none",color:T.ink,background:T.linen}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>:<p style={{fontFamily:T.serif,fontStyle:"italic",fontSize:15,color:T.ink2,lineHeight:1.9,paddingTop:4}}>{p.notes||"No notes yet. Tap Edit to add your thoughts."}</p>}
            <div style={{marginTop:20,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:12,color:T.ink3}}>Rating</span>
              <Stars val={editing?draft.rating:p.rating} ro={!editing} onChange={v=>setDraft({...draft,rating:v})}/>
            </div>
            <div style={{marginTop:10,fontSize:12,color:T.ink3}}>Source: {p.source}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   FIND PATTERNS
══════════════════════════════════════════════════════════════════════════ */
const FindPatterns = ({onSave}) => {
  const [url,setUrl]     = useState("");
  const [ready,setReady] = useState(false);
  const [saving,setSaving] = useState(false);
  const [pasteText,setPasteText] = useState("");
  const [mode,setMode] = useState("browse"); // browse | paste | url

  const SITES = [
    {name:"Ravelry",        desc:"World's largest pattern library",   photo:PILL[0]},
    {name:"LoveCrafts",     desc:"Patterns, yarn & community",        photo:PILL[1]},
    {name:"Sarah Maker",    desc:"Modern beginner-friendly patterns", photo:PILL[2]},
    {name:"Yarnspirations", desc:"Free Caron & Bernat patterns",      photo:PILL[3]},
    {name:"AllFreeCrochet", desc:"Thousands of free patterns",        photo:PILL[4]},
    {name:"Hopeful Honey",  desc:"Whimsical amigurumi",               photo:PILL[5]},
  ];

  const doSave = () => {
    setSaving(true);
    setTimeout(()=>{
      const rows = mode==="paste"&&pasteText
        ? pasteText.split("\n").filter(l=>l.trim()).map((text,i)=>({id:i+1,text:text.trim(),done:false,note:""}))
        : [];
      onSave({id:Date.now(),photo:PILL[Math.floor(Math.random()*PILL.length)],title:"New Pattern",source:url||"manual",cat:"Uncategorized",hook:"",weight:"",rating:0,notes:"",materials:[],rows,yardage:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60}});
      setSaving(false);setReady(false);setUrl("");setPasteText("");
    },900);
  };

  return (
    <div style={{padding:"0 18px 100px"}}>
      {/* Mode tabs */}
      <div style={{display:"flex",gap:6,marginBottom:18}}>
        {[["browse","🌐 Browse"],["paste","📋 Paste Pattern"],["url","🔗 Import URL"]].map(([key,label])=>(
          <button key={key} onClick={()=>setMode(key)} style={{flex:1,padding:"9px 6px",border:`1.5px solid ${mode===key?T.terra:T.border}`,background:mode===key?T.terraLt:T.surface,color:mode===key?T.terra:T.ink3,borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:mode===key?600:400}}>{label}</button>
        ))}
      </div>

      {mode==="browse"&&<>
        <p style={{fontFamily:T.serif,fontStyle:"italic",fontSize:14,color:T.ink3,marginBottom:18,lineHeight:1.7}}>Tap a site below to browse patterns, then save directly to your collection.</p>
        <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`}}>
          {SITES.map((s,i)=>(
            <div key={s.name} onClick={()=>{setUrl(s.name.toLowerCase().replace(/\s/g,"")+".com");setMode("url");setReady(true);}}
              style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:T.surface,borderTop:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",transition:"background .12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=T.linen}
              onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
              <div style={{width:46,height:46,borderRadius:10,overflow:"hidden",flexShrink:0,background:T.linen}}>
                <Photo src={s.photo} alt={s.name} style={{width:"100%",height:"100%"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:T.ink,marginBottom:2}}>{s.name}</div>
                <div style={{fontSize:12,color:T.ink3}}>{s.desc}</div>
              </div>
              <span style={{color:T.ink3,fontSize:20}}>›</span>
            </div>
          ))}
        </div>
      </>}

      {mode==="paste"&&<>
        <div style={{fontSize:13,color:T.ink2,marginBottom:12,lineHeight:1.6}}>Paste your pattern text below. Each line will become a trackable row.</div>
        <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={"Row 1: Ch 120, sc across...\nRow 2: Turn, sc across...\nRow 3: ..."}
          style={{width:"100%",minHeight:200,border:`1.5px solid ${T.border}`,borderRadius:12,padding:14,fontSize:13,lineHeight:1.7,resize:"vertical",outline:"none",color:T.ink,background:T.linen,marginBottom:12}}
          onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        {pasteText&&<div style={{fontSize:12,color:T.ink3,marginBottom:16}}>Will create {pasteText.split("\n").filter(l=>l.trim()).length} rows</div>}
        <Btn onClick={doSave} disabled={!pasteText.trim()||saving}>{saving?"Saving…":"Save Pattern from Text"}</Btn>
      </>}

      {mode==="url"&&<>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <div style={{flex:1,display:"flex",alignItems:"center",background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px 16px",gap:10}}>
            <span style={{color:T.ink3,fontSize:16}}>🔗</span>
            <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&setReady(true)} placeholder="Paste pattern URL…" style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}}/>
          </div>
          <button onClick={()=>setReady(true)} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"0 18px",fontWeight:600,fontSize:14,cursor:"pointer",boxShadow:"0 4px 14px rgba(184,90,60,.3)"}}>Go</button>
        </div>
        {ready&&(
          <div className="fu" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
            <div style={{height:150,position:"relative",background:T.linen,overflow:"hidden"}}>
              <Photo src={PHOTOS.hero} alt="pattern" style={{width:"100%",height:"100%"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(15,10,8,.4) 0%,transparent 60%)"}}/>
            </div>
            <div style={{padding:"20px 20px 24px"}}>
              <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{url}</div>
              <div style={{fontFamily:T.serif,fontSize:20,color:T.ink,marginBottom:8}}>Ready to save</div>
              <p style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:18}}>Save to your collection and track every row as you go.</p>
              <Btn onClick={doSave} disabled={saving}>{saving?"Saving…":"Save to My Collection"}</Btn>
              <div style={{marginTop:8}}><Btn variant="ghost" onClick={()=>setReady(false)}>← Back</Btn></div>
            </div>
          </div>
        )}
      </>}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   PATTERN CREATOR
══════════════════════════════════════════════════════════════════════════ */
const CreatePattern = ({onSave}) => {
  const [title,setTitle]   = useState("");
  const [cat,setCat]       = useState("Blankets");
  const [hook,setHook]     = useState("");
  const [weight,setWeight] = useState("");
  const [source,setSource] = useState("");
  const [notes,setNotes]   = useState("");
  const [yardage,setYardage] = useState("");
  const [rowText,setRowText] = useState("");
  const [rows,setRows]     = useState([]);
  const [matName,setMatName] = useState("");
  const [matAmt,setMatAmt]   = useState("");
  const [materials,setMaterials] = useState([]);

  const addRow = () => {
    if(!rowText.trim()) return;
    setRows(prev=>[...prev,{id:Date.now(),text:rowText.trim(),done:false,note:""}]);
    setRowText("");
  };
  const addMat = () => {
    if(!matName.trim()) return;
    setMaterials(prev=>[...prev,{id:Date.now(),name:matName.trim(),amount:matAmt.trim()}]);
    setMatName(""); setMatAmt("");
  };
  const save = () => {
    if(!title.trim()) return;
    onSave({id:Date.now(),photo:PILL[Math.floor(Math.random()*PILL.length)],title,source:source||"My Pattern",cat,hook,weight,notes,rating:0,yardage:parseInt(yardage)||0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials,rows});
  };

  return (
    <div style={{padding:"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Create a Pattern</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Build your own crochet pattern row by row.</div>

      <Field label="Pattern Title *" placeholder="e.g. Cozy Weekend Blanket" value={title} onChange={e=>setTitle(e.target.value)}/>

      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Category</div>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{width:"100%",padding:"12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}>
            {["Blankets","Wearables","Accessories","Amigurumi","Home Décor"].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{flex:1}}>
          <Field label="Hook Size" placeholder="e.g. 5.0mm" value={hook} onChange={e=>setHook(e.target.value)}/>
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:4}}>
        <div style={{flex:1}}><Field label="Yarn Weight" placeholder="Worsted, DK…" value={weight} onChange={e=>setWeight(e.target.value)}/></div>
        <div style={{flex:1}}><Field label="Total Yardage" placeholder="e.g. 800" value={yardage} onChange={e=>setYardage(e.target.value)}/></div>
      </div>

      <Field label="Source / Website" placeholder="ravelry.com" value={source} onChange={e=>setSource(e.target.value)}/>
      <Field label="Notes" placeholder="Special notes about this pattern…" value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/>

      {/* Materials */}
      <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Materials</div>
      {materials.map((m,i)=>(
        <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:6,height:6,borderRadius:99,background:T.terra,flexShrink:0}}/>
          <span style={{flex:1,fontSize:13,color:T.ink2}}>{m.name}</span>
          <span style={{fontSize:12,color:T.ink3}}>{m.amount}</span>
          <button onClick={()=>setMaterials(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:16}}>×</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:8,marginBottom:20}}>
        <input value={matName} onChange={e=>setMatName(e.target.value)} placeholder="Material name" style={{flex:1,padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        <input value={matAmt} onChange={e=>setMatAmt(e.target.value)} placeholder="Amt" style={{width:70,padding:"9px 10px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        <button onClick={addMat} style={{background:T.terra,color:"#fff",border:"none",borderRadius:9,padding:"9px 14px",cursor:"pointer",fontSize:18,lineHeight:1}}>+</button>
      </div>

      {/* Rows */}
      <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Rows / Steps</div>
      {rows.map((r,i)=>(
        <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,color:T.ink3,minWidth:20,textAlign:"center",fontWeight:600}}>{i+1}</div>
          <span style={{flex:1,fontSize:13,color:T.ink2}}>{r.text}</span>
          <button onClick={()=>setRows(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:16}}>×</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:8,marginBottom:24}}>
        <input value={rowText} onChange={e=>setRowText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRow()} placeholder="Row 1: Ch 120, sc across…"
          style={{flex:1,padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}}
          onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        <button onClick={addRow} style={{background:T.terra,color:"#fff",border:"none",borderRadius:9,padding:"9px 14px",cursor:"pointer",fontSize:18,lineHeight:1}}>+</button>
      </div>

      <Btn onClick={save} disabled={!title.trim()}>Save Pattern to Collection</Btn>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   YARN STASH
══════════════════════════════════════════════════════════════════════════ */
const YarnStash = () => {
  const [stash,setStash] = useState(SEED_STASH);
  const [adding,setAdding] = useState(false);
  const [brand,setBrand]   = useState("");
  const [name,setName]     = useState("");
  const [weight,setWeight] = useState("Worsted");
  const [color,setColor]   = useState("");
  const [yardage,setYardage] = useState("");
  const [skeins,setSkeins]   = useState("1");
  const totalYards = stash.reduce((a,y)=>a+y.yardage*y.skeins,0);

  const addYarn = () => {
    if(!brand||!name) return;
    setStash(prev=>[...prev,{id:Date.now(),brand,name,weight,color,colorCode:"#8A8278",yardage:parseInt(yardage)||0,skeins:parseInt(skeins)||1,used:0}]);
    setBrand("");setName("");setColor("");setYardage("");setSkeins("1");setAdding(false);
  };

  return (
    <div style={{padding:"0 18px 100px"}}>
      {/* Summary */}
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        {[
          {label:"Total Skeins",val:stash.reduce((a,y)=>a+y.skeins,0)},
          {label:"Total Yardage",val:`${totalYards.toLocaleString()} yds`},
          {label:"Yarn Types",val:stash.length},
        ].map(s=>(
          <div key={s.label} style={{flex:1,background:T.surface,borderRadius:12,padding:"12px 10px",textAlign:"center",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.terra}}>{s.val}</div>
            <div style={{fontSize:10,color:T.ink3,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      <Btn onClick={()=>setAdding(!adding)} variant={adding?"secondary":"primary"} style={{marginBottom:16}}>
        {adding?"Cancel":"+ Add Yarn to Stash"}
      </Btn>

      {adding&&(
        <div className="fu" style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16,border:`1px solid ${T.border}`}}>
          <Field label="Brand" placeholder="e.g. Lion Brand" value={brand} onChange={e=>setBrand(e.target.value)}/>
          <Field label="Yarn Name" placeholder="e.g. Pound of Love" value={name} onChange={e=>setName(e.target.value)}/>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Weight</div>
              <select value={weight} onChange={e=>setWeight(e.target.value)} style={{width:"100%",padding:"12px",background:"#fff",border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14}}>
                {["Lace","Fingering","Sport","DK","Worsted","Bulky","Super Bulky"].map(w=><option key={w}>{w}</option>)}
              </select>
            </div>
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
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:T.ink}}>{y.brand} — {y.name}</div>
            <div style={{fontSize:11,color:T.ink3,marginTop:2}}>{y.weight} · {y.color} · {y.yardage} yds/skein</div>
            <div style={{fontSize:12,color:T.terra,fontWeight:600,marginTop:3}}>{y.skeins} skein{y.skeins!==1?"s":""} · {(y.yardage*y.skeins).toLocaleString()} yds total</div>
          </div>
          <button onClick={()=>setStash(prev=>prev.filter(s=>s.id!==y.id))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:18,padding:"4px"}}>×</button>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   CALCULATORS
══════════════════════════════════════════════════════════════════════════ */
const Calculators = () => {
  const [active,setActive] = useState("gauge");

  // Gauge calc
  const [stitches,setStitches] = useState("20");
  const [rows,setRows]         = useState("24");
  const [swatchSize,setSwatchSize] = useState("4");
  const [targetW,setTargetW]   = useState("50");
  const [targetH,setTargetH]   = useState("60");

  // Yardage calc
  const [projW,setProjW] = useState("50");
  const [projH,setProjH] = useState("60");
  const [stPer4,setStPer4] = useState("12");
  const [ydsPerSt,setYdsPerSt] = useState("0.5");

  // Resize calc
  const [origW,setOrigW] = useState("40");
  const [origH,setOrigH] = useState("50");
  const [newW,setNewW]   = useState("50");
  const [newH,setNewH]   = useState("60");

  const stPerInch = parseFloat(stitches)/parseFloat(swatchSize)||0;
  const roPerInch = parseFloat(rows)/parseFloat(swatchSize)||0;
  const castOn    = Math.round(stPerInch*parseFloat(targetW)||0);
  const totalRows = Math.round(roPerInch*parseFloat(targetH)||0);

  const totalSt   = Math.round((parseFloat(stPer4)/4)*(parseFloat(projW)||0)*(parseFloat(projH)||0)*(parseFloat(roPerInch)||4));
  const yardage   = Math.round(totalSt*(parseFloat(ydsPerSt)||0.5));

  const scaleW = (parseFloat(newW)||1)/(parseFloat(origW)||1);
  const scaleH = (parseFloat(newH)||1)/(parseFloat(origH)||1);

  const CALCS = [
    {key:"gauge",    label:"Gauge"},
    {key:"yardage",  label:"Yardage"},
    {key:"resize",   label:"Resize"},
  ];

  return (
    <div style={{padding:"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Crochet Calculators</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:16}}>Essential tools for planning your projects.</div>

      {/* Calc selector */}
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {CALCS.map(c=>(
          <button key={c.key} onClick={()=>setActive(c.key)} style={{flex:1,padding:"10px",border:`1.5px solid ${active===c.key?T.terra:T.border}`,background:active===c.key?T.terraLt:T.surface,color:active===c.key?T.terra:T.ink3,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:active===c.key?600:400}}>
            {c.label}
          </button>
        ))}
      </div>

      {active==="gauge"&&(
        <>
          <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Gauge Swatch</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[["Stitches",stitches,setStitches],["Rows",rows,setRows],["Swatch (in)",swatchSize,setSwatchSize]].map(([label,val,set])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Target Dimensions</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Width (in)",targetW,setTargetW],["Height (in)",targetH,setTargetH]].map(([label,val,set])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Results</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Cast on (sts)",castOn],["Total rows",totalRows],["Stitches/inch",stPerInch.toFixed(1)],["Rows/inch",roPerInch.toFixed(1)]].map(([label,val])=>(
                <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div>
                  <div style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {active==="yardage"&&(
        <>
          <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Project Size</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Width (in)",projW,setProjW],["Height (in)",projH,setProjH],["Sts per 4in",stPer4,setStPer4],["Yds per stitch",ydsPerSt,setYdsPerSt]].map(([label,val,set])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Estimated Yardage</div>
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontFamily:T.serif,fontSize:48,fontWeight:700,color:T.terra}}>{yardage.toLocaleString()}</div>
              <div style={{fontSize:14,color:T.ink3,marginTop:4}}>yards needed</div>
              <div style={{fontSize:13,color:T.ink2,marginTop:8}}>≈ {Math.ceil(yardage/200)} skeins at 200 yds each</div>
            </div>
          </div>
        </>
      )}

      {active==="resize"&&(
        <>
          <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Original Size</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Width (in)",origW,setOrigW],["Height (in)",origH,setOrigH]].map(([label,val,set])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>New Size</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Width (in)",newW,setNewW],["Height (in)",newH,setNewH]].map(([label,val,set])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Scale Factors</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Width scale",`×${scaleW.toFixed(2)}`],["Height scale",`×${scaleH.toFixed(2)}`],["Stitch mult.",`${(scaleW*100).toFixed(0)}%`],["Yardage mult.",`${(scaleW*scaleH*100).toFixed(0)}%`]].map(([label,val])=>(
                <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div>
                  <div style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SHOPPING LIST
══════════════════════════════════════════════════════════════════════════ */
const ShoppingList = ({patterns}) => {
  const stash = SEED_STASH;

  const needs = patterns.flatMap(p=>
    (p.materials||[])
      .filter(m=>m.yardage>0)
      .map(m=>{
        const match = stash.find(s=>s.weight===p.weight);
        const have  = match ? match.yardage*match.skeins : 0;
        const need  = m.yardage||0;
        const more  = Math.max(0,need-have);
        return {pattern:p.title,material:m.name,need,have,more,skeins:Math.ceil(more/200)};
      })
  ).filter(n=>n.more>0);

  return (
    <div style={{padding:"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Shopping List</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Auto-generated from your patterns, cross-referenced with your stash.</div>

      {needs.length===0?(
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:48,marginBottom:14}}>✅</div>
          <div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>You're all stocked up</div>
          <div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Your stash covers all current pattern needs.</div>
        </div>
      ):(
        <>
          <div style={{background:T.terraLt,borderRadius:14,padding:"12px 16px",marginBottom:16,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:13,color:T.terra,fontWeight:600}}>{needs.length} item{needs.length!==1?"s":""} needed across {new Set(needs.map(n=>n.pattern)).size} patterns</div>
          </div>
          {needs.map((n,i)=>(
            <div key={i} style={{background:T.surface,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{n.pattern}</div>
              <div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:8}}>{n.material}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[["Need",`${n.need} yds`],["Have",`${n.have} yds`],["Buy",`~${n.skeins} skein${n.skeins!==1?"s":""}`]].map(([label,val])=>(
                  <div key={label} style={{background:label==="Buy"?T.terraLt:T.linen,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:label==="Buy"?T.terra:T.ink}}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════ */
export default function StitchBox() {
  const [authed,setAuthed]     = useState(false);
  const [patterns,setPatterns] = useState(SEED_PATTERNS);
  const [view,setView]         = useState("collection");
  const [selected,setSelected] = useState(null);
  const [navOpen,setNavOpen]   = useState(false);
  const [cat,setCat]           = useState("All");
  const [search,setSearch]     = useState("");

  if(!authed) return <><CSS/><Auth onEnter={()=>setAuthed(true)}/></>;

  if(view==="detail"&&selected) return (
    <><CSS/><Detail p={selected} onBack={()=>setView("collection")}
      onSave={u=>{setPatterns(prev=>prev.map(p=>p.id===u.id?u:p));setSelected(u);}}/></>
  );

  const filtered   = patterns.filter(p=>(cat==="All"||p.cat===cat)&&(!search||p.title.toLowerCase().includes(search.toLowerCase())));
  const inProgress = patterns.filter(p=>{const v=pct(p);return v>0&&v<100;});
  const openDetail = p=>{setSelected(p);setView("detail");};

  const TITLE_MAP = {collection:"My Patterns",wip:"In Progress",find:"Find Patterns",create:"Create Pattern",stash:"Yarn Stash",calculator:"Calculators",shopping:"Shopping List"};

  return (
    <div style={{fontFamily:T.sans,background:T.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <CSS/>
      <NavPanel open={navOpen} onClose={()=>setNavOpen(false)} view={view} setView={setView} count={patterns.length}/>

      {/* Top bar */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 18px",height:56,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
        <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 8px 8px 0",display:"flex",flexDirection:"column",gap:5}}>
          <div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/>
          <div style={{width:15,height:1.5,background:T.ink,borderRadius:99}}/>
          <div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/>
        </button>
        <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"Stitch Box"}</div>
        <button onClick={()=>setView(view==="create"?"collection":"create")} style={{background:view==="create"?T.sage:T.terra,border:"none",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 10px ${view==="create"?"rgba(92,122,94,.4)":"rgba(184,90,60,.4)"}`}}>
          {view==="create"?"✓":"+"}
        </button>
      </div>

      <div style={{flex:1,overflowY:"auto",paddingBottom:24}}>

        {/* COLLECTION */}
        {view==="collection"&&<>
          {inProgress.length>0&&(
            <div style={{background:T.linen,borderBottom:`1px solid ${T.border}`,padding:"16px 0 18px 18px"}}>
              <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".09em",fontWeight:600,marginBottom:12,paddingRight:18}}>Continue Working</div>
              <div style={{display:"flex",gap:12,overflowX:"auto",paddingRight:18,paddingBottom:2}}>
                {inProgress.map(p=><ShelfCard key={p.id} p={p} onClick={()=>openDetail(p)}/>)}
              </div>
            </div>
          )}
          <div style={{padding:"16px 18px 10px"}}>
            <div style={{display:"flex",alignItems:"center",background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",gap:9,transition:"border-color .15s"}}>
              <span style={{color:T.ink3,fontSize:15}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your patterns…"
                style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}}
                onFocus={e=>e.currentTarget.parentNode.style.borderColor=T.terra}
                onBlur={e=>e.currentTarget.parentNode.style.borderColor=T.border}/>
            </div>
          </div>
          <div style={{display:"flex",gap:7,overflowX:"auto",padding:"0 18px 16px"}}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCat(c)} style={{background:cat===c?T.terra:T.surface,color:cat===c?"#fff":T.ink2,border:`1.5px solid ${cat===c?T.terra:T.border}`,borderRadius:99,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",boxShadow:cat===c?"0 2px 10px rgba(184,90,60,.28)":"none"}}>{c}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,padding:"0 18px 32px"}}>
            {filtered.length===0
              ?<div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 20px"}}>
                  <div style={{fontSize:48,marginBottom:14}}>🧶</div>
                  <div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>No patterns yet</div>
                  <div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Tap + to create or find a pattern.</div>
                </div>
              :filtered.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.05} onClick={()=>openDetail(p)}/>)
            }
          </div>
        </>}

        {view==="wip"&&(
          <div style={{padding:"16px 18px 80px"}}>
            {inProgress.length===0
              ?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Open a pattern and start checking off rows.</div></div>
              :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{inProgress.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.06} onClick={()=>openDetail(p)}/>)}</div>
            }
          </div>
        )}

        {view==="find"&&<div style={{paddingTop:18}}><FindPatterns onSave={p=>{setPatterns(prev=>[p,...prev]);setView("collection");}}/></div>}
        {view==="create"&&<div style={{paddingTop:18}}><CreatePattern onSave={p=>{setPatterns(prev=>[p,...prev]);setView("collection");}}/></div>}
        {view==="stash"&&<div style={{paddingTop:18}}><YarnStash/></div>}
        {view==="calculator"&&<div style={{paddingTop:18}}><Calculators/></div>}
        {view==="shopping"&&<div style={{paddingTop:18}}><ShoppingList patterns={patterns}/></div>}
      </div>
    </div>
  );
}
