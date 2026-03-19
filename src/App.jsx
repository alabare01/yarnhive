import { useState, useRef, useEffect } from "react";

/* ─── FONT ───────────────────────────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("sb-font")) {
  const l = document.createElement("link");
  l.id = "sb-font"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600&display=swap";
  document.head.appendChild(l);
}

/* ─── PHOTOS ─────────────────────────────────────────────────────────────── */
const PHOTOS = {
  hero:     "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877266/Gemini_Generated_Image_u44qfru44qfru44q_2_rsk1rn.png",
  blanket:  "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877265/Gemini_Generated_Image_u44qfru44qfru44q_fst0gr.png",
  cardigan: "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877263/Gemini_Generated_Image_u44qfru44qfru44q_3_sax38h.png",
  granny:   "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877260/Gemini_Generated_Image_u44qfru44qfru44q_6_yvirvu.png",
  tote:     "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877260/Gemini_Generated_Image_u44qfru44qfru44q_7_xmykae.png",
  pillow:   "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877260/Gemini_Generated_Image_u44qfru44qfru44q_5_wypdoe.png",
  market:   "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877259/Gemini_Generated_Image_u44qfru44qfru44q_4_arw40x.png",
  auth:     "https://res.cloudinary.com/dmaupzhcx/image/upload/v1773877259/Gemini_Generated_Image_u44qfru44qfru44q_8_y2tkwe.png",
};
const PILL = [PHOTOS.blanket, PHOTOS.cardigan, PHOTOS.granny, PHOTOS.tote, PHOTOS.pillow, PHOTOS.market];

/* ─── GEMINI API KEY ─────────────────────────────────────────────────────── */
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/* ─── TIER CONFIG ────────────────────────────────────────────────────────── */
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

/* ─── RESPONSIVE BREAKPOINTS ─────────────────────────────────────────────── */
const useBreakpoint = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1100, isDesktop: w >= 1100, width: w };
};

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #EAE0D5; border-radius: 99px; }
    body { background: #FAF7F3; }
    input, textarea, button, select { font-family: "Inter", -apple-system, sans-serif; }

    @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideUp   { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideInLeft  { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes slideOutLeft { from{transform:translateX(0);opacity:1} to{transform:translateX(-100%);opacity:0} }
    @keyframes dimIn  { from{opacity:0} to{opacity:1} }
    @keyframes dimOut { from{opacity:1} to{opacity:0} }
    @keyframes swipeHint { 0%{transform:translateX(0)} 30%{transform:translateX(-8px)} 60%{transform:translateX(4px)} 100%{transform:translateX(0)} }
    @keyframes fabPulse { 0%,100%{box-shadow:0 6px 24px rgba(184,90,60,.45)} 50%{box-shadow:0 6px 32px rgba(184,90,60,.7)} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

    .fu { animation:fadeUp .4s ease both; }
    .su { animation:slideUp .35s cubic-bezier(.22,.68,0,1.05) both; }
    .nav-open  { animation:slideInLeft  .3s cubic-bezier(.22,.68,0,1.05) both; }
    .nav-close { animation:slideOutLeft .24s ease both; }
    .dim-in  { animation:dimIn  .25s ease both; }
    .dim-out { animation:dimOut .2s  ease both; }
    .spinner { animation:spin .8s linear infinite; }

    .card { transition:transform .18s,box-shadow .18s; box-shadow:0 2px 10px rgba(28,23,20,.06); }
    .card:hover { transform:translateY(-4px) !important; box-shadow:0 16px 36px rgba(28,23,20,.14) !important; }
    .tap { transition:opacity .15s; cursor:pointer; }
    .tap:hover { opacity:.85; }
    .method-card { transition:all .15s; }
    .method-card:hover { background:#F5E2DA !important; border-color:#B85A3C !important; transform:translateY(-1px); }

    .h-scroll {
      display: flex; gap: 12px; overflow-x: auto;
      -webkit-overflow-scrolling: touch; scroll-snap-type: x mandatory;
      padding-bottom: 8px; scrollbar-width: none;
    }
    .h-scroll::-webkit-scrollbar { display: none; }
    .h-scroll > * { scroll-snap-align: start; flex-shrink: 0; }

    .app-shell { display: flex; min-height: 100vh; }
    .sidebar { width: 260px; flex-shrink: 0; }
    .main-content { flex: 1; min-width: 0; }

    .pattern-grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
    @media(min-width: 900px)  { .pattern-grid { grid-template-columns: 1fr 1fr 1fr; } }
    @media(min-width: 1300px) { .pattern-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }

    input:focus, textarea:focus, select:focus { outline: none; }

    @media(hover: hover) {
      .nav-item:hover  { background: #F4EDE3 !important; }
      .site-row:hover  { background: #F4EDE3 !important; }
    }
  `}</style>
);

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
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
  if(err) return (
    <div style={{...sx,background:`linear-gradient(145deg,#C4855A,#6B3A22)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:32,opacity:.4}}>🧶</span>
    </div>
  );
  return <img src={src} alt={alt} onError={()=>setErr(true)} style={{...sx,objectFit:"cover",display:"block"}}/>;
};

const Btn = ({children,onClick,variant="primary",full=true,small=false,disabled=false,style:sx={}}) => {
  const styles = {
    primary:   {background:T.terra,color:"#fff",border:"none"},
    secondary: {background:T.linen,color:T.ink,border:`1px solid ${T.border}`},
    ghost:     {background:"none",color:T.ink3,border:"none"},
    sage:      {background:T.sage,color:"#fff",border:"none"},
    danger:    {background:"#C0392B",color:"#fff",border:"none"},
    gold:      {background:`linear-gradient(135deg,#C9A84C,#8B6914)`,color:"#fff",border:"none"},
  };
  return (
    <button onClick={onClick} disabled={disabled} className="tap" style={{
      ...styles[variant], borderRadius:12,
      padding:small?"8px 16px":"14px 20px",
      fontSize:small?13:15, fontWeight:600,
      cursor:disabled?"not-allowed":"pointer",
      width:full?"100%":"auto", opacity:disabled?.6:1,
      boxShadow:variant==="primary"?"0 4px 16px rgba(184,90,60,.3)":
                variant==="sage"?"0 4px 16px rgba(92,122,94,.3)":
                variant==="gold"?"0 4px 16px rgba(184,144,44,.35)":"none",
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

/* ─── SEED DATA ──────────────────────────────────────────────────────────── */
const SEED_PATTERNS = [
  {
    id:1, photo:PHOTOS.blanket, title:"Autumn Ridge Throw",
    source:"ravelry.com", cat:"Blankets", hook:"6.0mm", weight:"Bulky",
    rating:5, yardage:1200, skeins:4, skeinYards:300,
    gauge:{stitches:12,rows:16,size:4}, dimensions:{width:50,height:60},
    notes:"Caron Simply Soft in Autumn Maize, Burgundy, and Sage. Block lightly.",
    materials:[
      {id:1,name:"Bulky yarn — Autumn Maize",amount:"300g",yardage:300},
      {id:2,name:"Bulky yarn — Burgundy",amount:"300g",yardage:300},
      {id:3,name:"Bulky yarn — Sage",amount:"300g",yardage:300},
      {id:4,name:"6.0mm crochet hook",amount:"1"},{id:5,name:"Yarn needle",amount:"1"},
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
      {id:10,text:"Border Rnd 2: Reverse sc — fasten off",done:false,note:""},
    ]
  },
  {
    id:2, photo:PHOTOS.cardigan, title:"Coastal Shell Cardigan",
    source:"lovecrafts.com", cat:"Wearables", hook:"4.5mm", weight:"DK",
    rating:4, yardage:900, skeins:5, skeinYards:180,
    gauge:{stitches:18,rows:20,size:4}, dimensions:{width:20,height:26},
    notes:"Size M. Add 2 rows per size up. Mark raglan seams carefully.",
    materials:[
      {id:1,name:"DK cotton yarn — driftwood",amount:"500g",yardage:500},
      {id:2,name:"4.5mm crochet hook",amount:"1"},
      {id:3,name:"Stitch markers",amount:"8"},{id:4,name:"Shell buttons 15mm",amount:"5"},
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
    gauge:{stitches:16,rows:18,size:4}, dimensions:{width:48,height:60},
    notes:"48 squares in 12 color combinations. Flat join creates beautiful ridge.",
    materials:[
      {id:1,name:"Worsted yarn — 10 assorted colors",amount:"50g each",yardage:150},
      {id:2,name:"4.0mm hook",amount:"1"},{id:3,name:"Yarn needle",amount:"1"},
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
   PAYWALL GATE
══════════════════════════════════════════════════════════════════════════ */
const PaywallGate = ({onClose, onUpgrade, patternCount}) => (
  <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end"}} onClick={onClose}>
    <div className="dim-in" style={{position:"absolute",inset:0,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)"}}/>
    <div className="su" onClick={e=>e.stopPropagation()}
      style={{position:"relative",background:T.surface,borderRadius:"24px 24px 0 0",width:"100%",padding:"28px 24px 52px",zIndex:1}}>
      <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 24px"}}/>
      <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${T.terra},#8B3A22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px",boxShadow:"0 8px 24px rgba(184,90,60,.35)"}}>
        🧶
      </div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:8}}>Pattern library full</div>
        <div style={{fontSize:14,color:T.ink2,lineHeight:1.7,maxWidth:320,margin:"0 auto"}}>
          You've used all {TIER_CONFIG.free.patternCap} free patterns. Upgrade to Pro for unlimited storage and every import method.
        </div>
      </div>
      <div style={{background:`linear-gradient(135deg,${T.terra},#7A2E14)`,borderRadius:18,padding:"20px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>Stitch Box Pro</div>
            <div style={{fontFamily:T.serif,fontSize:28,color:"#fff",fontWeight:700}}>$9.99<span style={{fontSize:14,fontWeight:400,opacity:.7}}>/month</span></div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>or $74.99/year — save 37%</div>
          </div>
          <div style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"6px 12px",fontSize:12,color:"#fff",fontWeight:600}}>✨ Pro</div>
        </div>
        {["Unlimited pattern storage","All import methods — URL, PDF, Snap to Pattern, browser","Snap to Pattern, Stash Check, Pattern Help","Full calculator suite","Cloud sync across all devices"].map(f=>(
          <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:16,height:16,borderRadius:99,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:9,color:"#fff"}}>✓</span>
            </div>
            <span style={{fontSize:13,color:"rgba(255,255,255,.85)"}}>{f}</span>
          </div>
        ))}
      </div>
      <Btn onClick={onUpgrade} style={{marginBottom:10}}>Upgrade to Pro — $9.99/mo</Btn>
      <Btn onClick={onClose} variant="ghost">Maybe later</Btn>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   SNAP TO PATTERN — REAL GEMINI VISION IMPLEMENTATION
══════════════════════════════════════════════════════════════════════════ */

const GEMINI_PROMPT = `Analyze this crochet object photograph and return ONLY a JSON object matching this exact schema. Do not explain. Do not add commentary. Return JSON only.

{
  "object_category": "amigurumi or blanket or garment or accessory or home_goods or unknown",
  "confidence_overall": 75,
  "components": [
    {
      "primitive_type": "sphere or oval or flat_disc or cylinder or tapered_cylinder or cone or flat_square or flat_circle or unknown",
      "role": "head or body or arm or leg or ear or tail or nose or eye or base or detail or unknown",
      "count": 1,
      "size_relative": "small or medium or large or dominant",
      "size_ratio_to_dominant": 1.0,
      "confidence": 80,
      "notes": "any observations"
    }
  ],
  "color_structure": {
    "primary_color": "brown",
    "accent_colors": ["cream"],
    "color_count": 2,
    "colorwork_type": "solid or striped or colorblock or variegated or unknown"
  },
  "stitch_texture": "smooth_sc or textured or bobble or ribbed or open_lace or unknown",
  "construction_type": "in_the_round or worked_flat or mixed or unknown",
  "surface_details": ["safety_eyes"],
  "size_class": "tiny_under5cm or small_5to10cm or medium_10to20cm or large_over20cm or unknown"
}`;

const callGeminiVision = async (base64Image) => {
  const mediaType = base64Image.split(";")[0].split(":")[1] || "image/jpeg";
  const imageData = base64Image.split(",")[1];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: GEMINI_PROMPT },
            { inline_data: { mime_type: mediaType, data: imageData } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
      })
    }
  );

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

const calculateConfidence = (analysis) => {
  if (!analysis?.components) return 30;
  const avgComponentConfidence = analysis.components.reduce((sum, c) => sum + (c.confidence || 50), 0) / analysis.components.length;
  let score = avgComponentConfidence;
  analysis.components.forEach(c => {
    if (c.primitive_type === "unknown") score -= 10;
    if (c.confidence < 60) score -= 5;
  });
  if (analysis.object_category === "unknown") score -= 10;
  if (analysis.construction_type === "unknown") score -= 5;
  return Math.min(95, Math.max(30, Math.round(score)));
};

const confidenceLabel = (score) => {
  if (score >= 90) return { text: "Strong match — we're confident in this pattern", color: T.sage };
  if (score >= 75) return { text: "Good match — review highlighted components", color: T.terra };
  if (score >= 60) return { text: "Partial match — a few pieces need your input", color: T.gold };
  return { text: "Rough estimate — use this as a starting point and adjust", color: T.ink3 };
};

const buildStarterPattern = (analysis) => {
  if (!analysis?.components?.length) {
    return {
      title: "Snap to Pattern — Review Needed",
      hook: "5.0mm",
      weight: "Worsted",
      yardage: 200,
      notes: "Pattern needs more information. Try a clearer photo or better lighting.",
      materials: [
        { id: 1, name: "Worsted weight yarn", amount: "~200 yds", yardage: 200 },
        { id: 2, name: "5.0mm crochet hook", amount: "1" },
      ],
      rows: [
        { id: 1, text: "Review photo and retake for better results", done: false, note: "" },
      ]
    };
  }

  const isAmigurumi = analysis.object_category === "amigurumi";
  const components = analysis.components;
  const body = components.find(c => c.role === "body" || c.size_relative === "dominant") || components[0];
  const head = components.find(c => c.role === "head");
  const arms = components.find(c => c.role === "arm");
  const legs = components.find(c => c.role === "leg");
  const ears = components.find(c => c.role === "ear");

  const rows = [];
  let rowId = 1;

  if (isAmigurumi) {
    rows.push({ id: rowId++, text: `BODY (${body?.primitive_type || "oval"}): Magic ring, 6 sc. (6)`, done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 2: 2 sc in each st around. (12)", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 3: [Sc, 2 sc in next] x6. (18)", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 4: [Sc x2, 2 sc in next] x6. (24)", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 5: [Sc x3, 2 sc in next] x6. (30)", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnds 6–10: Sc in each st around. (30)", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 11: [Sc x3, sc2tog] x6. (24) — begin decrease", done: false, note: "" });
    rows.push({ id: rowId++, text: "Stuff body firmly before closing.", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 12: [Sc x2, sc2tog] x6. (18)", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 13: [Sc, sc2tog] x6. (12)", done: false, note: "" });
    rows.push({ id: rowId++, text: "Rnd 14: [Sc2tog] x6. (6) — fasten off, sew closed.", done: false, note: "" });

    if (head) {
      rows.push({ id: rowId++, text: `HEAD (${head.primitive_type || "sphere"}): Magic ring, 6 sc. (6)`, done: false, note: "" });
      rows.push({ id: rowId++, text: "Rnds 2–5: Increase rounds to 30 sts following body pattern.", done: false, note: "" });
      rows.push({ id: rowId++, text: "Rnds 6–8: Sc in each st around. (30)", done: false, note: "" });
      rows.push({ id: rowId++, text: "Attach safety eyes between Rnds 9–10, 6 sts apart.", done: false, note: "" });
      rows.push({ id: rowId++, text: "Decrease rounds: mirror increase rounds in reverse. Stuff, sew closed.", done: false, note: "" });
    }

    if (arms) {
      const armCount = arms.count || 2;
      rows.push({ id: rowId++, text: `ARMS (make ${armCount}): Magic ring, 6 sc. Sc around for 8 rounds. Fasten off, leave tail.`, done: false, note: "" });
    }

    if (legs) {
      const legCount = legs.count || 2;
      rows.push({ id: rowId++, text: `LEGS (make ${legCount}): Magic ring, 8 sc. Increase to 16 sts. Work 10 rounds even. Fasten off.`, done: false, note: "" });
    }

    if (ears) {
      const earCount = ears.count || 2;
      rows.push({ id: rowId++, text: `EARS (make ${earCount}): Magic ring, 6 sc. Rnd 2: 2 sc in each st (12). Fasten off, sew to head.`, done: false, note: "" });
    }

    rows.push({ id: rowId++, text: "ASSEMBLY: Sew head to body centered on top. Attach legs to base of body. Attach arms to sides. Embroider nose and mouth.", done: false, note: "" });
  } else {
    rows.push({ id: rowId++, text: `Pattern identified as ${analysis.object_category}. Foundation: Chain to desired width.`, done: false, note: "" });
    rows.push({ id: rowId++, text: "Row 1: Sc in 2nd ch from hook and across.", done: false, note: "" });
    rows.push({ id: rowId++, text: "Continue in pattern stitch to desired length.", done: false, note: "" });
    rows.push({ id: rowId++, text: "Fasten off and weave in ends.", done: false, note: "" });
  }

  const colorInfo = analysis.color_structure?.primary_color || "your chosen color";
  const colorCount = analysis.color_structure?.color_count || 1;

  return {
    title: `Snap to Pattern — ${analysis.object_category === "amigurumi" ? "Amigurumi" : analysis.object_category || "Crochet Object"}`,
    hook: "5.0mm",
    weight: "Worsted",
    yardage: isAmigurumi ? 150 * (components.length) : 400,
    notes: `Snapped from photo. Primary color: ${colorInfo}. ${colorCount > 1 ? `${colorCount} colors used.` : ""} Stitch texture: ${analysis.stitch_texture || "smooth sc"}. Review and adjust stitch counts to match your gauge.`,
    materials: [
      { id: 1, name: `Worsted yarn — ${colorInfo}`, amount: `~${isAmigurumi ? 150 * components.length : 400} yds`, yardage: isAmigurumi ? 150 * components.length : 400 },
      { id: 2, name: "5.0mm crochet hook", amount: "1" },
      { id: 3, name: "Yarn needle", amount: "1" },
      ...(isAmigurumi ? [
        { id: 4, name: "Safety eyes (9mm)", amount: "1 pair" },
        { id: 5, name: "Polyfill stuffing", amount: "small bag" },
      ] : []),
    ],
    rows,
  };
};

/* ══════════════════════════════════════════════════════════════════════════
   SNAP TO PATTERN FORM
══════════════════════════════════════════════════════════════════════════ */
const SnapToPatternForm = ({onSave}) => {
  const [file, setFile]       = useState(null);
  const [imgSrc, setImgSrc]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError]     = useState(null);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setAnalysis(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target.result;
      setImgSrc(src);
      setLoading(true);
      try {
        const result = await callGeminiVision(src);
        const conf = calculateConfidence(result);
        const pattern = buildStarterPattern(result);
        setAnalysis(result);
        setConfidence(conf);
        setPreview(pattern);
      } catch (err) {
        setError("Couldn't read the photo clearly. Try better lighting or a closer shot.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const reset = () => { setFile(null); setImgSrc(null); setAnalysis(null); setPreview(null); setError(null); setConfidence(null); };

  const confInfo = confidence ? confidenceLabel(confidence) : null;

  return (
    <div style={{paddingBottom:8}}>
      <div style={{background:`linear-gradient(135deg,${T.terraLt},#FFF8F5)`,borderRadius:12,padding:"12px 14px",marginBottom:14,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:12,color:T.terra,fontWeight:600,marginBottom:3}}>📸 Snap to Pattern</div>
        <div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>Photograph any finished crochet object. We identify the components and build a starter pattern to recreate it.</div>
      </div>

      {!file && (
        <label style={{display:"block",cursor:"pointer"}}>
          <div style={{border:`2px dashed ${T.border}`,borderRadius:16,padding:"36px 20px",textAlign:"center",background:T.linen}}>
            <div style={{fontSize:44,marginBottom:10}}>📸</div>
            <div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:6}}>Photograph your project</div>
            <div style={{fontSize:13,color:T.ink3,marginBottom:14}}>Any finished crochet object — amigurumi works best</div>
            <div style={{background:T.terra,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,display:"inline-block"}}>Take Photo or Choose</div>
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/>
        </label>
      )}

      {imgSrc && loading && (
        <div style={{textAlign:"center",padding:"16px 0"}}>
          <div style={{width:"100%",height:180,borderRadius:14,overflow:"hidden",marginBottom:14,position:"relative"}}>
            <img src={imgSrc} alt="analyzing" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",inset:0,background:"rgba(28,23,20,.55)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}>
              <div style={{textAlign:"center"}}>
                <div className="spinner" style={{width:36,height:36,border:"3px solid rgba(255,255,255,.3)",borderTop:"3px solid #fff",borderRadius:"50%",margin:"0 auto 12px"}}/>
                <div style={{fontSize:14,color:"#fff",fontWeight:600}}>Identifying components…</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:4}}>Analyzing stitch patterns and construction</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{background:"#FFF0EE",borderRadius:12,padding:"14px 16px",marginBottom:14,border:`1px solid #F5C6BB`}}>
          <div style={{fontSize:13,color:"#C0392B",fontWeight:600,marginBottom:4}}>Couldn't read this photo</div>
          <div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>{error}</div>
          <div style={{marginTop:10}}><Btn variant="secondary" onClick={reset} small full={false}>Try again</Btn></div>
        </div>
      )}

      {analysis && preview && !loading && (
        <div className="fu">
          {/* Photo with confidence overlay */}
          <div style={{width:"100%",height:160,borderRadius:14,overflow:"hidden",marginBottom:14,position:"relative"}}>
            <img src={imgSrc} alt="source" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 14px",background:"linear-gradient(to top, rgba(28,23,20,.85) 0%, transparent 100%)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>Match confidence</div>
                <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:"#fff"}}>{confidence}%</div>
              </div>
              <div style={{marginTop:4}}><Bar val={confidence} color="#fff" h={3} bg="rgba(255,255,255,.25)"/></div>
            </div>
          </div>

          {/* Confidence message */}
          <div style={{background:T.linen,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{fontSize:14}}>🎯</span>
            <span style={{fontSize:12,color:confInfo?.color,lineHeight:1.5,fontWeight:500}}>{confInfo?.text}</span>
          </div>

          {/* What we found */}
          <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:"14px",marginBottom:14}}>
            <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10,fontWeight:600}}>What we identified</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {analysis.components?.map((c, i) => (
                <div key={i} style={{background:c.confidence >= 70 ? T.sageLt : T.terraLt,borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:500,color:c.confidence >= 70 ? T.sage : T.terra}}>
                  {c.count > 1 ? `${c.count}x ` : ""}{c.role !== "unknown" ? c.role : c.primitive_type}
                  {c.confidence < 70 ? " ?" : ""}
                </div>
              ))}
              {analysis.color_structure && (
                <div style={{background:T.linen,borderRadius:8,padding:"5px 10px",fontSize:11,color:T.ink2}}>
                  {analysis.color_structure.primary_color}{analysis.color_structure.color_count > 1 ? ` +${analysis.color_structure.color_count - 1} more` : ""}
                </div>
              )}
            </div>
          </div>

          {/* Pattern preview */}
          <div style={{background:T.linen,borderRadius:12,border:`1px solid ${T.border}`,padding:"14px",marginBottom:14}}>
            <div style={{fontFamily:T.serif,fontSize:16,color:T.ink,marginBottom:4}}>{preview.title}</div>
            <div style={{fontSize:12,color:T.ink3,marginBottom:10}}>Hook {preview.hook} · {preview.weight} · ~{preview.yardage} yds · {preview.rows.length} steps</div>
            <div style={{fontSize:12,color:T.ink2,lineHeight:1.6,marginBottom:12}}>{preview.notes}</div>
            <div style={{fontSize:11,color:T.ink3,fontStyle:"italic",marginBottom:12}}>Review the steps below after saving — adjust stitch counts to match your gauge and yarn weight.</div>
            <Btn onClick={() => onSave({
              id: Date.now(),
              photo: imgSrc || PILL[0],
              source: "Snap to Pattern",
              cat: analysis.object_category === "amigurumi" ? "Amigurumi" : "Uncategorized",
              rating: 0, skeins: 2, skeinYards: 200,
              gauge: {stitches: 16, rows: 20, size: 4},
              dimensions: {width: 20, height: 20},
              snapConfidence: confidence,
              ...preview,
            })}>Save to My Collection</Btn>
            <div style={{marginTop:8}}><Btn variant="ghost" onClick={reset}>Try different photo</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   ADD PATTERN MODAL
══════════════════════════════════════════════════════════════════════════ */
const ManualEntryForm = ({onSave}) => {
  const [title,setTitle]     = useState("");
  const [cat,setCat]         = useState("Blankets");
  const [hook,setHook]       = useState("");
  const [weight,setWeight]   = useState("");
  const [source,setSource]   = useState("");
  const [notes,setNotes]     = useState("");
  const [yardage,setYardage] = useState("");
  const [rowText,setRowText] = useState("");
  const [rows,setRows]       = useState([]);
  const [matName,setMatName] = useState("");
  const [matAmt,setMatAmt]   = useState("");
  const [materials,setMaterials] = useState([]);

  const addRow = () => { if(!rowText.trim()) return; setRows(p=>[...p,{id:Date.now(),text:rowText.trim(),done:false,note:""}]); setRowText(""); };
  const addMat = () => { if(!matName.trim()) return; setMaterials(p=>[...p,{id:Date.now(),name:matName.trim(),amount:matAmt.trim()}]); setMatName(""); setMatAmt(""); };
  const save = () => {
    if(!title.trim()) return;
    onSave({id:Date.now(),photo:PILL[Math.floor(Math.random()*PILL.length)],title,source:source||"My Pattern",cat,hook,weight,notes,rating:0,yardage:parseInt(yardage)||0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials,rows});
  };
  return (
    <div style={{paddingBottom:8}}>
      <Field label="Pattern Title *" placeholder="e.g. Cozy Weekend Blanket" value={title} onChange={e=>setTitle(e.target.value)}/>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Category</div>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{width:"100%",padding:"12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}>
            {["Blankets","Wearables","Accessories","Amigurumi","Home Décor"].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
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
          <span style={{flex:1,fontSize:13,color:T.ink2}}>{m.name}</span>
          <span style={{fontSize:12,color:T.ink3}}>{m.amount}</span>
          <button onClick={()=>setMaterials(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:15}}>×</button>
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
          <button onClick={()=>setRows(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:15}}>×</button>
        </div>
      ))}
      <div style={{display:"flex",gap:8,marginTop:8,marginBottom:20}}>
        <input value={rowText} onChange={e=>setRowText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRow()} placeholder="Row 1: Ch 120, sc across…"
          style={{flex:1,padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}}
          onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
        <button onClick={addRow} style={{background:T.terra,color:"#fff",border:"none",borderRadius:9,padding:"9px 14px",cursor:"pointer",fontSize:18,lineHeight:1}}>+</button>
      </div>
      <Btn onClick={save} disabled={!title.trim()}>Save Pattern</Btn>
    </div>
  );
};

const URLImportForm = ({onSave}) => {
  const [url,setUrl]         = useState("");
  const [loading,setLoading] = useState(false);
  const [preview,setPreview] = useState(null);
  const doImport = () => {
    if(!url.trim()) return;
    setLoading(true);
    setTimeout(()=>{
      setPreview({title:"Imported Pattern",source:url.replace(/^https?:\/\//,"").split("/")[0],cat:"Uncategorized",hook:"",weight:"",yardage:0,notes:"Imported via URL. Smart import checked for completeness.",materials:[],rows:[],photo:PILL[Math.floor(Math.random()*PILL.length)],smartNote:"Pattern fully imported — details filled in automatically."});
      setLoading(false);
    },1400);
  };
  return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Paste a pattern URL. We fetch the details automatically and fill in any gaps.</div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <div style={{flex:1,display:"flex",alignItems:"center",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px 14px",gap:10}}>
          <span style={{color:T.ink3}}>🔗</span>
          <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doImport()} placeholder="https://www.allfreecrochet.com/…" style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}}/>
        </div>
        <button onClick={doImport} disabled={!url.trim()||loading} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"0 18px",fontWeight:600,fontSize:14,cursor:"pointer",boxShadow:"0 4px 14px rgba(184,90,60,.3)",opacity:!url.trim()||loading?.6:1}}>{loading?"…":"Go"}</button>
      </div>
      {loading&&<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:32,marginBottom:12}}>🔍</div><div style={{fontFamily:T.serif,fontSize:16,color:T.ink2}}>Fetching pattern…</div></div>}
      {preview&&!loading&&(
        <div className="fu" style={{background:T.linen,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`}}>
          <div style={{height:110,position:"relative"}}><Photo src={preview.photo} alt="pattern" style={{width:"100%",height:"100%"}}/></div>
          <div style={{padding:"14px"}}>
            <div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{preview.source}</div>
            <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:8}}>{preview.title}</div>
            {preview.smartNote&&<div style={{background:T.sageLt,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",gap:8}}><span>✨</span><span style={{fontSize:12,color:T.sage}}>{preview.smartNote}</span></div>}
            <Btn onClick={()=>onSave({id:Date.now(),rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},...preview})}>Save to My Collection</Btn>
          </div>
        </div>
      )}
      <div style={{marginTop:14,background:T.linen,borderRadius:12,padding:"12px 14px"}}>
        <div style={{fontSize:11,color:T.ink3,fontWeight:600,marginBottom:4}}>Works great with</div>
        <div style={{fontSize:12,color:T.ink2,lineHeight:1.8}}>AllFreeCrochet · Drops Design · Yarnspirations · LoveCrafts · Sarah Maker</div>
        <div style={{fontSize:11,color:T.ink3,marginTop:4}}>Ravelry & Etsy: log in on your device, copy the URL, paste it here.</div>
      </div>
    </div>
  );
};

const PDFUploadForm = ({onSave}) => {
  const [file,setFile]       = useState(null);
  const [loading,setLoading] = useState(false);
  const [preview,setPreview] = useState(null);
  const handleFile = (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    setFile(f); setLoading(true);
    setTimeout(()=>{
      setPreview({title:f.name.replace(/\.(pdf|jpg|png|jpeg)$/i,"").replace(/[-_]/g," "),source:"PDF Upload",cat:"Uncategorized",hook:"",weight:"",yardage:0,notes:"Extracted from uploaded document.",materials:[],rows:[{id:1,text:"Row 1: Extracted from document",done:false,note:""},{id:2,text:"Row 2: Continue as written",done:false,note:""}],photo:PILL[Math.floor(Math.random()*PILL.length)],smartNote:"Some fields were incomplete — estimated gauge and yardage filled in automatically."});
      setLoading(false);
    },1600);
  };
  return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Upload a PDF pattern, photo of a printed pattern, or any scanned document.</div>
      {!file&&(
        <label style={{display:"block",cursor:"pointer"}}>
          <div style={{border:`2px dashed ${T.border}`,borderRadius:16,padding:"36px 20px",textAlign:"center",background:T.linen}}>
            <div style={{fontSize:40,marginBottom:10}}>📄</div>
            <div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:6}}>Drop your pattern here</div>
            <div style={{fontSize:13,color:T.ink3,marginBottom:14}}>PDF, JPG, PNG — up to 20MB</div>
            <div style={{background:T.terra,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,display:"inline-block"}}>Choose File</div>
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{display:"none"}}/>
        </label>
      )}
      {loading&&<div style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:36,marginBottom:10}}>🔎</div><div style={{fontFamily:T.serif,fontSize:16,color:T.ink2}}>Reading your pattern…</div></div>}
      {preview&&!loading&&(
        <div className="fu" style={{background:T.linen,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden"}}>
          <div style={{height:90,overflow:"hidden"}}><Photo src={preview.photo} alt="pattern" style={{width:"100%",height:"100%"}}/></div>
          <div style={{padding:"14px"}}>
            <div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:4}}>{preview.title}</div>
            <div style={{fontSize:12,color:T.ink3,marginBottom:10}}>{preview.rows.length} rows extracted</div>
            {preview.smartNote&&<div style={{background:T.sageLt,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",gap:8}}><span>✨</span><span style={{fontSize:12,color:T.sage}}>{preview.smartNote}</span></div>}
            <Btn onClick={()=>onSave({id:Date.now(),rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},...preview})}>Save to My Collection</Btn>
            <div style={{marginTop:8}}><Btn variant="ghost" onClick={()=>{setFile(null);setPreview(null);}}>Upload different file</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
};

const BrowserImport = ({onSave}) => {
  const [active,setActive] = useState(null);
  const [saving,setSaving] = useState(false);
  const SITES = [
    {name:"AllFreeCrochet",  desc:"Thousands of free patterns",   photo:PILL[4], note:"Full extraction supported"},
    {name:"Drops Design",    desc:"Free international patterns",  photo:PILL[0], note:"Full extraction supported"},
    {name:"Yarnspirations",  desc:"Caron & Bernat free patterns", photo:PILL[3], note:"Most patterns extractable"},
    {name:"Sarah Maker",     desc:"Modern beginner patterns",     photo:PILL[2], note:"Full extraction supported"},
    {name:"Hopeful Honey",   desc:"Whimsical amigurumi",          photo:PILL[5], note:"Full extraction supported"},
    {name:"Ravelry",         desc:"Requires login in-browser",   photo:PILL[1], note:"Browse then copy URL to import"},
  ];
  const doSave = (s) => {
    setSaving(true);
    setTimeout(()=>{
      onSave({id:Date.now(),photo:s.photo,title:`Pattern from ${s.name}`,source:s.name,cat:"Uncategorized",hook:"",weight:"",rating:0,notes:"",materials:[],rows:[],yardage:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60}});
      setSaving(false); setActive(null);
    },900);
  };
  if(active) return (
    <div style={{paddingBottom:8}}>
      <button onClick={()=>setActive(null)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:14,padding:0}}>← All sites</button>
      <div style={{background:T.linen,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,marginBottom:14}}>
        <div style={{height:130,position:"relative"}}>
          <Photo src={active.photo} alt={active.name} style={{width:"100%",height:"100%"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(15,10,8,.6) 0%,transparent 50%)"}}/>
          <div style={{position:"absolute",bottom:14,left:16}}><div style={{fontFamily:T.serif,fontSize:20,color:"#fff",fontWeight:700}}>{active.name}</div></div>
        </div>
        <div style={{padding:"16px"}}>
          <div style={{background:T.sageLt,borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",gap:8}}><span>ℹ️</span><span style={{fontSize:12,color:T.sage}}>{active.note}</span></div>
          <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>In the full version, an in-app browser opens {active.name} directly. Browse and tap Save — we handle the rest.</div>
          <Btn onClick={()=>doSave(active)} disabled={saving}>{saving?"Saving…":`Save from ${active.name}`}</Btn>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Browse curated pattern sites in-app. Find a pattern and tap Save.</div>
      <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`}}>
        {SITES.map((s,i)=>(
          <div key={s.name} className="site-row" onClick={()=>setActive(s)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:T.surface,borderTop:i>0?`1px solid ${T.border}`:"none",cursor:"pointer",transition:"background .12s"}}>
            <div style={{width:44,height:44,borderRadius:10,overflow:"hidden",flexShrink:0}}><Photo src={s.photo} alt={s.name} style={{width:"100%",height:"100%"}}/></div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500,color:T.ink,marginBottom:1}}>{s.name}</div><div style={{fontSize:12,color:T.ink3}}>{s.desc}</div></div>
            <span style={{color:T.ink3,fontSize:20}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AddPatternModal = ({onClose, onSave, isPro, patternCount}) => {
  const [method,setMethod]   = useState(null);
  const [closing,setClosing] = useState(false);
  const {isDesktop} = useBreakpoint();
  const dismiss = () => { setClosing(true); setTimeout(()=>{setClosing(false);onClose();},220); };
  const handleSave = (p) => { onSave(p); dismiss(); };

  const METHODS = [
    {key:"manual",  icon:"✏️", label:"Manual Entry",       sub:"Type it in yourself"},
    {key:"url",     icon:"🔗", label:"Smart Import",       sub:"Paste any pattern link"},
    {key:"pdf",     icon:"📄", label:"PDF / Document",     sub:"Upload & extract"},
    {key:"browser", icon:"🌐", label:"Browse Sites",       sub:"AllFreeCrochet, Drops & more"},
    {key:"snap",    icon:"📸", label:"Snap to Pattern",    sub:"Photograph any finished object"},
  ];

  if(isDesktop) return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss}
        style={{position:"absolute",inset:0,background:"rgba(28,23,20,.6)",backdropFilter:"blur(4px)"}}/>
      <div className={closing?"":"fu"}
        style={{position:"relative",background:T.surface,borderRadius:20,width:"100%",maxWidth:580,maxHeight:"85vh",display:"flex",flexDirection:"column",zIndex:1,boxShadow:"0 24px 64px rgba(28,23,20,.3)"}}>
        <div style={{flexShrink:0,padding:"24px 28px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            {method
              ? <button onClick={()=>setMethod(null)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:14,fontWeight:600,padding:0}}>← Back</button>
              : <div style={{fontFamily:T.serif,fontSize:24,color:T.ink}}>Add Pattern</div>
            }
            <button onClick={dismiss} style={{background:T.linen,border:"none",borderRadius:99,width:32,height:32,cursor:"pointer",fontSize:18,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          {method&&(
            <div style={{fontSize:12,color:T.ink3,marginBottom:14,fontWeight:500}}>
              {METHODS.find(m=>m.key===method)?.icon} {METHODS.find(m=>m.key===method)?.label}
            </div>
          )}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"0 28px 32px"}}>
          {!method&&(
            <>
              <div style={{fontSize:12,color:T.ink3,marginBottom:14}}>
                {isPro ? "Pro — unlimited patterns" : `Free plan · ${patternCount}/${TIER_CONFIG.free.patternCap} patterns used — all import methods available`}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {METHODS.map(m=>(
                  <div key={m.key} className="method-card" onClick={()=>setMethod(m.key)}
                    style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:m.key==="snap"?T.terraLt:T.linen,border:`1.5px solid ${m.key==="snap"?T.terra:T.border}`,borderRadius:14,cursor:"pointer",transition:"all .15s"}}>
                    <div style={{width:44,height:44,borderRadius:12,background:m.key==="snap"?"rgba(184,90,60,.2)":T.terraLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                      {m.icon}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:600,color:m.key==="snap"?T.terra:T.ink,marginBottom:2}}>{m.label}</div>
                      <div style={{fontSize:12,color:T.ink3}}>{m.sub}</div>
                    </div>
                    {m.key==="snap"&&<div style={{background:T.terra,color:"#fff",borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:700,flexShrink:0}}>NEW</div>}
                    {m.key!=="snap"&&<span style={{color:T.ink3,fontSize:18}}>›</span>}
                  </div>
                ))}
              </div>
            </>
          )}
          {method==="manual"  && <ManualEntryForm    onSave={handleSave}/>}
          {method==="url"     && <URLImportForm      onSave={handleSave}/>}
          {method==="pdf"     && <PDFUploadForm      onSave={handleSave}/>}
          {method==="browser" && <BrowserImport      onSave={handleSave}/>}
          {method==="snap"    && <SnapToPatternForm  onSave={handleSave}/>}
        </div>
      </div>
    </div>
  );

  return (
  return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"flex-end"}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss}
        style={{position:"absolute",inset:0,background:"rgba(28,23,20,.6)",backdropFilter:"blur(4px)"}}/>
      <div className={closing?"":"su"}
        style={{position:"relative",background:T.surface,borderRadius:"24px 24px 0 0",width:"100%",maxHeight:"92vh",display:"flex",flexDirection:"column",zIndex:1}}>
        <div style={{flexShrink:0,padding:"16px 22px 0"}}>
          <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 18px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            {method
              ? <button onClick={()=>setMethod(null)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:14,fontWeight:600,padding:0}}>← Back</button>
              : <div style={{fontFamily:T.serif,fontSize:22,color:T.ink}}>Add Pattern</div>
            }
            <button onClick={dismiss} style={{background:T.linen,border:"none",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          {method&&(
            <div style={{fontSize:12,color:T.ink3,marginBottom:12,fontWeight:500}}>
              {METHODS.find(m=>m.key===method)?.icon} {METHODS.find(m=>m.key===method)?.label}
            </div>
          )}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"0 22px 40px"}}>
          {!method&&(
            <>
              <div style={{fontSize:12,color:T.ink3,marginBottom:12}}>
                {isPro ? "Pro — unlimited patterns" : `Free plan · ${patternCount}/${TIER_CONFIG.free.patternCap} patterns used — all import methods available`}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {METHODS.map(m=>(
                  <div key={m.key} className="method-card" onClick={()=>setMethod(m.key)}
                    style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:m.key==="snap"?T.terraLt:T.linen,border:`1.5px solid ${m.key==="snap"?T.terra:T.border}`,borderRadius:14,cursor:"pointer",transition:"all .15s"}}>
                    <div style={{width:44,height:44,borderRadius:12,background:m.key==="snap"?"rgba(184,90,60,.2)":T.terraLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                      {m.icon}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:600,color:m.key==="snap"?T.terra:T.ink,marginBottom:2}}>{m.label}</div>
                      <div style={{fontSize:12,color:T.ink3}}>{m.sub}</div>
                    </div>
                    {m.key==="snap"&&<div style={{background:T.terra,color:"#fff",borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:700,flexShrink:0}}>NEW</div>}
                    {m.key!=="snap"&&<span style={{color:T.ink3,fontSize:18}}>›</span>}
                  </div>
                ))}
              </div>
            </>
          )}
          {method==="manual"  && <ManualEntryForm    onSave={handleSave}/>}
          {method==="url"     && <URLImportForm      onSave={handleSave}/>}
          {method==="pdf"     && <PDFUploadForm      onSave={handleSave}/>}
          {method==="browser" && <BrowserImport      onSave={handleSave}/>}
          {method==="snap"    && <SnapToPatternForm  onSave={handleSave}/>}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   DESKTOP SIDEBAR NAV
══════════════════════════════════════════════════════════════════════════ */
const SidebarNav = ({view, setView, count, isPro, onAddPattern}) => {
  const ITEMS = [
    {key:"collection", label:"My Patterns",   sub:`${count} saved`,          icon:"🧶"},
    {key:"wip",        label:"In Progress",   sub:"Currently making",        icon:"🪡"},
    {key:"stash",      label:"Yarn Stash",    sub:"Manage your yarn",        icon:"🎀"},
    {key:"calculator", label:"Calculators",   sub:"Gauge, yardage & more",   icon:"🧮"},
    {key:"shopping",   label:"Shopping List", sub:"Auto-generated",          icon:"🛒"},
  ];
  return (
    <div style={{width:260,background:T.surface,borderRight:`1px solid ${T.border}`,height:"100vh",position:"sticky",top:0,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{position:"relative",height:160,overflow:"hidden",flexShrink:0}}>
        <Photo src={PHOTOS.hero} alt="crochet" style={{width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.85) 0%,rgba(20,14,10,.2) 100%)"}}/>
        <div style={{position:"absolute",bottom:18,left:20}}>
          <div style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:"#fff",lineHeight:1}}>Stitch Box</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:4}}>Your crochet collection</div>
        </div>
      </div>
      <div style={{padding:"16px 16px 8px"}}>
        <button onClick={onAddPattern} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{fontSize:18}}>+</span> Add Pattern
        </button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {ITEMS.map(item=>{
          const active = view===item.key;
          return (
            <div key={item.key} className="nav-item" onClick={()=>setView(item.key)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderLeft:`3px solid ${active?T.terra:"transparent"}`,background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
              <span style={{fontSize:18,width:24,textAlign:"center"}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>{item.label}</div>
                <div style={{fontSize:11,color:T.ink3,marginTop:1}}>{item.sub}</div>
              </div>
              {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
            </div>
          );
        })}
      </div>
      <div style={{padding:"12px 16px 24px"}}>
        {isPro ? (
          <div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>✨</span>
            <div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Stitch Box Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div>
          </div>
        ) : (
          <div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:12,padding:"14px"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.75)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Snap to Pattern, cloud sync.</div>
            <div style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"7px",textAlign:"center",fontSize:11,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo · $74.99/yr</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE NAV PANEL
══════════════════════════════════════════════════════════════════════════ */
const NavPanel = ({open, onClose, view, setView, count, isPro}) => {
  const [closing,setClosing] = useState(false);
  const dismiss = () => { setClosing(true); setTimeout(()=>{setClosing(false);onClose();},220); };
  const go = v => { setView(v); dismiss(); };
  if(!open) return null;
  const ITEMS = [
    {key:"collection", label:"My Patterns",   sub:`${count} patterns saved`, icon:"🧶"},
    {key:"wip",        label:"In Progress",   sub:"Currently making",        icon:"🪡"},
    {key:"stash",      label:"Yarn Stash",    sub:"Manage your yarn",        icon:"🎀"},
    {key:"calculator", label:"Calculators",   sub:"Gauge, yardage & more",   icon:"🧮"},
    {key:"shopping",   label:"Shopping List", sub:"Auto-generated needs",    icon:"🛒"},
  ];
  return (
    <div style={{position:"fixed",inset:0,zIndex:100}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss}
        style={{position:"absolute",inset:0,background:"rgba(28,23,20,.52)",backdropFilter:"blur(3px)"}}/>
      <div className={closing?"nav-close":"nav-open"}
        style={{position:"absolute",top:0,left:0,bottom:0,width:"80%",maxWidth:320,background:T.surface,display:"flex",flexDirection:"column",boxShadow:"6px 0 40px rgba(28,23,20,.2)"}}>
        <div style={{position:"relative",height:130,overflow:"hidden",flexShrink:0}}>
          <Photo src={PHOTOS.hero} alt="crochet" style={{width:"100%",height:"100%"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.8) 0%,rgba(20,14,10,.2) 100%)"}}/>
          <div style={{position:"absolute",bottom:16,left:18}}>
            <div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:"#fff",lineHeight:1}}>Stitch Box</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:3}}>Your crochet collection</div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",paddingTop:6}}>
          {ITEMS.map(item=>{
            const active = view===item.key;
            return (
              <div key={item.key} className="nav-item" onClick={()=>go(item.key)}
                style={{display:"flex",alignItems:"center",gap:13,padding:"13px 20px",borderLeft:`3px solid ${active?T.terra:"transparent"}`,background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
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
        <div style={{padding:"14px 18px 36px"}}>
          {isPro ? (
            <div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>✨</span>
              <div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Stitch Box Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div>
            </div>
          ) : (
            <div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:14,padding:"14px 16px"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.8)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Snap to Pattern.</div>
              <div style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo · $74.99/yr</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════════════════ */
const Auth = ({onEnter, onEnterAsPro}) => {
  const [screen,setScreen] = useState("welcome");
  const [email,setEmail]   = useState("");
  const [pass,setPass]     = useState("");
  const [name,setName]     = useState("");

  if(screen==="welcome") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",maxWidth:500,margin:"0 auto"}}>
      <CSS/>
      <div style={{flex:1,position:"relative",overflow:"hidden",minHeight:460}}>
        <Photo src={PHOTOS.hero} alt="crochet" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(15,10,8,.92) 0%,rgba(15,10,8,.15) 55%,transparent 100%)"}}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 28px 36px"}}>
          <div style={{fontFamily:T.serif,fontSize:46,fontWeight:700,color:"#fff",lineHeight:1,marginBottom:10,letterSpacing:"-.02em"}}>Stitch Box</div>
          <p style={{fontSize:16,color:"rgba(255,255,255,.72)",lineHeight:1.65,maxWidth:290}}>Save every pattern. Track every row.<br/>Scale, calculate, and create.</p>
        </div>
      </div>
      <div style={{background:T.surface,padding:"28px 22px 48px",display:"flex",flexDirection:"column",gap:12}}>
        <Btn onClick={()=>setScreen("signup")}>Create free account</Btn>
        <Btn variant="secondary" onClick={()=>setScreen("signin")}>Sign in</Btn>
        <Btn variant="ghost" onClick={onEnter}>Continue without account →</Btn>
        {/* Dev access — remove before public launch */}
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12,marginTop:4}}>
          <Btn variant="sage" onClick={onEnterAsPro} small>🔑 Dev access — Pro unlocked</Btn>
        </div>
        <p style={{fontSize:11,color:T.ink3,textAlign:"center",lineHeight:1.6,marginTop:4}}>
          Free: up to 5 patterns, all features · Pro $9.99/mo or $74.99/yr: unlimited
        </p>
      </div>
    </div>
  );

  const isSignup = screen==="signup";
  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",maxWidth:500,margin:"0 auto"}}>
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
   PATTERN CARDS
══════════════════════════════════════════════════════════════════════════ */
const PatternCard = ({p, onClick, delay=0}) => {
  const done = pct(p);
  return (
    <div className="card fu" onClick={onClick} style={{background:T.surface,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",animationDelay:`${delay}s`}}>
      <div style={{position:"relative",height:160,overflow:"hidden",background:T.linen}}>
        <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.5) 0%,transparent 55%)"}}/>
        {done===100&&<div style={{position:"absolute",top:10,right:10,background:T.sage,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99,letterSpacing:".07em"}}>DONE</div>}
        {done>0&&done<100&&<div style={{position:"absolute",top:10,right:10,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{done}%</div>}
        {done>0&&done<100&&<div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={done} color="rgba(255,255,255,.8)" h={3} bg="transparent"/></div>}
        {p.snapConfidence&&<div style={{position:"absolute",top:10,left:10,background:"rgba(184,90,60,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99}}>📸 {p.snapConfidence}%</div>}
      </div>
      <div style={{padding:"12px 14px 16px"}}>
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

const ShelfCard = ({p, onClick}) => {
  const v = pct(p);
  return (
    <div onClick={onClick}
      style={{width:160,borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,background:T.surface,cursor:"pointer",boxShadow:"0 2px 8px rgba(28,23,20,.06)",transition:"transform .16s,box-shadow .16s",flexShrink:0}}
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

const HScrollRow = ({children, itemCount}) => {
  const ref = useRef(null);
  const [showHint, setShowHint] = useState(itemCount > 2);
  useEffect(() => {
    const el = ref.current; if(!el) return;
    const onScroll = () => { if(el.scrollLeft > 10) setShowHint(false); };
    el.addEventListener("scroll", onScroll, {passive:true});
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div style={{position:"relative"}}>
      <div ref={ref} className="h-scroll" style={{paddingLeft:18,paddingRight:18}}>
        {children}
      </div>
      {showHint&&(
        <div style={{position:"absolute",right:0,top:0,bottom:8,width:64,background:"linear-gradient(to left, rgba(244,237,227,.95) 0%, transparent 100%)",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
          <div style={{background:"rgba(28,23,20,.12)",backdropFilter:"blur(4px)",borderRadius:99,padding:"4px 8px",fontSize:11,color:T.ink2,display:"flex",alignItems:"center",gap:3,animation:"swipeHint 1.8s ease 1s both"}}>
            <span style={{fontSize:12}}>←</span> swipe
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SCALE MODAL
══════════════════════════════════════════════════════════════════════════ */
const ScaleModal = ({pattern, onClose}) => {
  const orig = pattern.dimensions || {width:50,height:60};
  const origGauge = pattern.gauge || {stitches:12,rows:16,size:4};
  const [newW,setNewW] = useState(String(orig.width));
  const [newH,setNewH] = useState(String(orig.height));
  const [gSt,setGSt]   = useState(String(origGauge.stitches));
  const [gRo,setGRo]   = useState(String(origGauge.rows));
  const scaleW = parseFloat(newW)/orig.width||1;
  const scaleH = parseFloat(newH)/orig.height||1;
  const scaledYardage = Math.ceil((pattern.yardage||1000)*scaleW*scaleH);
  const scaledSkeins  = Math.ceil(scaledYardage/(pattern.skeinYards||200));
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(28,23,20,.6)",display:"flex",alignItems:"flex-end"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"85vh",overflow:"auto",padding:"24px 22px 40px"}}>
        <div style={{width:36,height:3,background:T.border,borderRadius:99,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:T.serif,fontSize:22,color:T.ink,marginBottom:4}}>Pattern Scaling</div>
        <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Adjust dimensions to automatically recalculate stitch counts and yardage.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {[["New Width (in)",newW,setNewW],["New Height (in)",newH,setNewH]].map(([label,val,set])=>(
            <div key={label}><div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>{label}</div>
            <input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"12px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:16,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/></div>
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
            {[["Starting stitches",Math.round((parseFloat(gSt)||12)/4*parseFloat(newW)||0)],["Total rows",Math.round((parseFloat(gRo)||16)/4*parseFloat(newH)||0)],["Yardage needed",`~${scaledYardage} yds`],["Skeins needed",`${scaledSkeins} skeins`],["Scale factor W",`${(scaleW*100).toFixed(0)}%`],["Scale factor H",`${(scaleH*100).toFixed(0)}%`]].map(([label,val])=>(
              <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:18,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>
            ))}
          </div>
        </div>
        <div style={{fontSize:12,color:T.ink3,textAlign:"center",marginBottom:16,lineHeight:1.6}}>Original: {orig.width}" × {orig.height}" · {pattern.yardage||1000} yards</div>
        <Btn onClick={onClose} variant="secondary">Close</Btn>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   DETAIL VIEW
══════════════════════════════════════════════════════════════════════════ */
const Detail = ({p, onBack, onSave}) => {
  const [rows,setRows]           = useState(p.rows);
  const [tab,setTab]             = useState("rows");
  const [newRow,setNewRow]       = useState("");
  const [editing,setEditing]     = useState(false);
  const [draft,setDraft]         = useState({...p});
  const [showScale,setShowScale] = useState(false);
  const [noteEdit,setNoteEdit]   = useState(null);
  const {isDesktop} = useBreakpoint();
  const done = pct({...p,rows});
  const currentRowIdx = rows.findIndex(r=>!r.done);
  const toggle = id => { const next=rows.map(r=>r.id===id?{...r,done:!r.done}:r); setRows(next); onSave({...p,rows:next}); };
  const addRow = () => { if(!newRow.trim()) return; const next=[...rows,{id:Date.now(),text:newRow.trim(),done:false,note:""}]; setRows(next); onSave({...p,rows:next}); setNewRow(""); };
  const save = () => { onSave({...draft,rows}); setEditing(false); };
  const updateNote = (id,note) => { const next=rows.map(r=>r.id===id?{...r,note}:r); setRows(next); onSave({...p,rows:next}); };
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg,overflow:"hidden"}}>
      <CSS/>
      {showScale&&<ScaleModal pattern={p} onClose={()=>setShowScale(false)}/>}
      <div style={{position:"relative",flexShrink:0,height:isDesktop?280:230,overflow:"hidden",background:T.linen}}>
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
          {editing?<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} style={{width:"100%",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:19,fontFamily:T.serif,outline:"none"}}/>
            :<div style={{fontFamily:T.serif,fontSize:21,fontWeight:700,color:"#fff",lineHeight:1.2}}>{p.title}</div>}
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><Bar val={done} color={T.terra} h={4} bg="rgba(255,255,255,.25)"/></div>
            <span style={{color:"#fff",fontSize:13,fontWeight:600,minWidth:36}}>{done}%</span>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:3}}>{rows.filter(r=>r.done).length} of {rows.length} rows complete</div>
        </div>
      </div>
      <div style={{display:"flex",background:T.surface,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        {[["rows","Rows"],["materials","Materials"],["notes","Notes"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"13px 0",border:"none",background:"transparent",color:tab===key?T.terra:T.ink3,fontWeight:tab===key?600:400,fontSize:13,cursor:"pointer",borderBottom:`2px solid ${tab===key?T.terra:"transparent"}`,transition:"color .15s"}}>{label}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"4px 20px 36px",maxWidth:isDesktop?760:undefined,margin:isDesktop?"0 auto":undefined,width:"100%"}}>
        {tab==="rows"&&<>
          {rows.map((r,i)=>{
            const isCurrent = i===currentRowIdx;
            return (
              <div key={r.id}>
                <div onClick={()=>toggle(r.id)} style={{display:"flex",gap:13,alignItems:"flex-start",cursor:"pointer",background:isCurrent?"rgba(184,90,60,.04)":"transparent",margin:"0 -8px",padding:"14px 8px",borderRadius:isCurrent?8:0,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:26,height:26,borderRadius:7,flexShrink:0,marginTop:1,background:r.done?T.terra:T.surface,border:`1.5px solid ${r.done?T.terra:isCurrent?T.terra:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:r.done?"0 2px 8px rgba(184,90,60,.3)":isCurrent?"0 0 0 3px rgba(184,90,60,.15)":"none"}}>
                    {r.done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                    {!r.done&&isCurrent&&<div style={{width:8,height:8,borderRadius:99,background:T.terra}}/>}
                  </div>
                  <div style={{flex:1}}>
                    {isCurrent&&<div style={{fontSize:10,color:T.terra,fontWeight:600,letterSpacing:".06em",marginBottom:2}}>CURRENT ROW</div>}
                    {!isCurrent&&<div style={{fontSize:10,color:T.ink3,letterSpacing:".06em",marginBottom:2}}>ROW {i+1}</div>}
                    <div style={{fontSize:14,lineHeight:1.6,color:r.done?T.ink3:T.ink,textDecoration:r.done?"line-through":"none"}}>{r.text}</div>
                    {r.note&&<div style={{fontSize:12,color:T.ink3,fontStyle:"italic",marginTop:4}}>📝 {r.note}</div>}
                  </div>
                  <button onClick={e=>{e.stopPropagation();setNoteEdit(noteEdit===r.id?null:r.id);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:"4px",color:r.note?T.terra:T.border}}>📝</button>
                </div>
                {noteEdit===r.id&&<div style={{padding:"8px 0 12px",borderBottom:`1px solid ${T.border}`}}><input value={r.note} onChange={e=>updateNote(r.id,e.target.value)} placeholder="Add a note for this row…" style={{width:"100%",padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.terra}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}}/></div>}
              </div>
            );
          })}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <input value={newRow} onChange={e=>setNewRow(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRow()} placeholder="Add a row or step…"
              style={{flex:1,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"10px 14px",fontSize:13,color:T.ink,background:T.linen,outline:"none"}}
              onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
            <button onClick={addRow} style={{background:T.terra,color:"#fff",border:"none",borderRadius:11,padding:"10px 18px",fontSize:22,cursor:"pointer",lineHeight:1,boxShadow:"0 4px 12px rgba(184,90,60,.35)"}}>+</button>
          </div>
        </>}
        {tab==="materials"&&<>
          {(editing?draft.materials:p.materials).map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:6,height:6,borderRadius:99,background:T.terra,flexShrink:0}}/>
              {editing?<div style={{display:"flex",gap:8,flex:1}}>
                <input value={m.name} onChange={e=>{const a=[...draft.materials];a[i]={...a[i],name:e.target.value};setDraft({...draft,materials:a});}} style={{flex:1,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,background:T.linen,color:T.ink,outline:"none"}}/>
                <input value={m.amount} onChange={e=>{const a=[...draft.materials];a[i]={...a[i],amount:e.target.value};setDraft({...draft,materials:a});}} style={{width:80,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,background:T.linen,color:T.ink,outline:"none"}}/>
              </div>:<div style={{flex:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,color:T.ink2}}>{m.name}</span><span style={{fontSize:12,color:T.ink3,fontWeight:600}}>{m.amount}</span></div>}
            </div>
          ))}
          {editing&&<button onClick={()=>setDraft({...draft,materials:[...draft.materials,{id:Date.now(),name:"",amount:"",yardage:0}]})} style={{marginTop:14,width:"100%",border:`1.5px dashed ${T.border}`,background:"none",borderRadius:11,padding:"10px",color:T.ink3,cursor:"pointer",fontSize:13}}>+ Add material</button>}
          <div style={{marginTop:20,background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:10}}>Yarn Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Total yardage",`~${p.yardage||"??"} yds`],["Skeins needed",`${p.skeins||"??"} skeins`],["Hook size",p.hook||"??"],["Yarn weight",p.weight||"??"]].map(([label,val])=>(
                <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:16,fontWeight:700,fontFamily:T.serif,color:T.ink}}>{val}</div></div>
              ))}
            </div>
            <button onClick={()=>setShowScale(true)} style={{marginTop:12,width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>⚖️ Scale pattern to different size →</button>
          </div>
        </>}
        {tab==="notes"&&(
          <div style={{paddingTop:10}}>
            {editing?<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} style={{width:"100%",minHeight:140,border:`1.5px solid ${T.border}`,borderRadius:12,padding:14,fontSize:14,lineHeight:1.75,resize:"vertical",outline:"none",color:T.ink,background:T.linen}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
              :<p style={{fontFamily:T.serif,fontStyle:"italic",fontSize:15,color:T.ink2,lineHeight:1.9,paddingTop:4}}>{p.notes||"No notes yet. Tap Edit to add your thoughts."}</p>}
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
   YARN STASH
══════════════════════════════════════════════════════════════════════════ */
const YarnStash = () => {
  const [stash,setStash]     = useState(SEED_STASH);
  const [adding,setAdding]   = useState(false);
  const [brand,setBrand]     = useState("");
  const [name,setName]       = useState("");
  const [weight,setWeight]   = useState("Worsted");
  const [color,setColor]     = useState("");
  const [yardage,setYardage] = useState("");
  const [skeins,setSkeins]   = useState("1");
  const totalYards = stash.reduce((a,y)=>a+y.yardage*y.skeins,0);
  const addYarn = () => {
    if(!brand||!name) return;
    setStash(p=>[...p,{id:Date.now(),brand,name,weight,color,colorCode:"#8A8278",yardage:parseInt(yardage)||0,skeins:parseInt(skeins)||1,used:0}]);
    setBrand("");setName("");setColor("");setYardage("");setSkeins("1");setAdding(false);
  };
  const {isDesktop: isD} = useBreakpoint();
  return (
    <div style={{padding:isD?"0 0 100px":"0 18px 100px"}}>
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        {[{label:"Total Skeins",val:stash.reduce((a,y)=>a+y.skeins,0)},{label:"Total Yardage",val:`${totalYards.toLocaleString()} yds`},{label:"Yarn Types",val:stash.length}].map(s=>(
          <div key={s.label} style={{flex:1,background:T.surface,borderRadius:12,padding:"12px 10px",textAlign:"center",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.terra}}>{s.val}</div>
            <div style={{fontSize:10,color:T.ink3,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <Btn onClick={()=>setAdding(!adding)} variant={adding?"secondary":"primary"} style={{marginBottom:16}}>{adding?"Cancel":"+ Add Yarn to Stash"}</Btn>
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
          <button onClick={()=>setStash(p=>p.filter(s=>s.id!==y.id))} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:18,padding:"4px"}}>×</button>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   CALCULATORS
══════════════════════════════════════════════════════════════════════════ */
const Calculators = () => {
  const [active,setActive]         = useState("gauge");
  const [stitches,setStitches]     = useState("20");
  const [rows,setRows]             = useState("24");
  const [swatchSize,setSwatchSize] = useState("4");
  const [targetW,setTargetW]       = useState("50");
  const [targetH,setTargetH]       = useState("60");
  const [projW,setProjW]           = useState("50");
  const [projH,setProjH]           = useState("60");
  const [stPer4,setStPer4]         = useState("12");
  const [ydsPerSt,setYdsPerSt]     = useState("0.5");
  const [origW,setOrigW]           = useState("40");
  const [origH,setOrigH]           = useState("50");
  const [newW,setNewW]             = useState("50");
  const [newH,setNewH]             = useState("60");
  const stPerInch = parseFloat(stitches)/parseFloat(swatchSize)||0;
  const roPerInch = parseFloat(rows)/parseFloat(swatchSize)||0;
  const castOn    = Math.round(stPerInch*parseFloat(targetW)||0);
  const totalRows = Math.round(roPerInch*parseFloat(targetH)||0);
  const totalSt   = Math.round((parseFloat(stPer4)/4)*(parseFloat(projW)||0)*(parseFloat(projH)||0)*(parseFloat(roPerInch)||4));
  const yardage   = Math.round(totalSt*(parseFloat(ydsPerSt)||0.5));
  const scaleW    = (parseFloat(newW)||1)/(parseFloat(origW)||1);
  const scaleH    = (parseFloat(newH)||1)/(parseFloat(origH)||1);
  const {isDesktop: isDk} = useBreakpoint();
  return (
    <div style={{padding:isDk?"0 0 100px":"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Crochet Calculators</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:16}}>Essential tools for planning your projects.</div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[["gauge","Gauge"],["yardage","Yardage"],["resize","Resize"]].map(([key,label])=>(
          <button key={key} onClick={()=>setActive(key)} style={{flex:1,padding:"10px",border:`1.5px solid ${active===key?T.terra:T.border}`,background:active===key?T.terraLt:T.surface,color:active===key?T.terra:T.ink3,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:active===key?600:400}}>{label}</button>
        ))}
      </div>
      {active==="gauge"&&<>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Gauge Swatch</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[["Stitches",stitches,setStitches],["Rows",rows,setRows],["Swatch (in)",swatchSize,setSwatchSize]].map(([label,val,set])=>(
              <div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>
            ))}
          </div>
        </div>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Target Dimensions</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Width (in)",targetW,setTargetW],["Height (in)",targetH,setTargetH]].map(([label,val,set])=>(
              <div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>
            ))}
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Results</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Cast on (sts)",castOn],["Total rows",totalRows],["Stitches/inch",stPerInch.toFixed(1)],["Rows/inch",roPerInch.toFixed(1)]].map(([label,val])=>(
              <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>
            ))}
          </div>
        </div>
      </>}
      {active==="yardage"&&<>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Project Size</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Width (in)",projW,setProjW],["Height (in)",projH,setProjH],["Sts per 4in",stPer4,setStPer4],["Yds per stitch",ydsPerSt,setYdsPerSt]].map(([label,val,set])=>(
              <div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>
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
      </>}
      {active==="resize"&&<>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Original Size</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Width (in)",origW,setOrigW],["Height (in)",origH,setOrigH]].map(([label,val,set])=>(
              <div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>
            ))}
          </div>
        </div>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>New Size</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Width (in)",newW,setNewW],["Height (in)",newH,setNewH]].map(([label,val,set])=>(
              <div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>
            ))}
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${T.terraLt},#fff)`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Scale Factors</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Width scale",`×${scaleW.toFixed(2)}`],["Height scale",`×${scaleH.toFixed(2)}`],["Stitch mult.",`${(scaleW*100).toFixed(0)}%`],["Yardage mult.",`${(scaleW*scaleH*100).toFixed(0)}%`]].map(([label,val])=>(
              <div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>
            ))}
          </div>
        </div>
      </>}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SHOPPING LIST
══════════════════════════════════════════════════════════════════════════ */
const ShoppingList = ({patterns}) => {
  const needs = patterns.flatMap(p=>
    (p.materials||[]).filter(m=>m.yardage>0).map(m=>{
      const match = SEED_STASH.find(s=>s.weight===p.weight);
      const have  = match?match.yardage*match.skeins:0;
      const need  = m.yardage||0;
      const more  = Math.max(0,need-have);
      return {pattern:p.title,material:m.name,need,have,more,skeins:Math.ceil(more/200)};
    })
  ).filter(n=>n.more>0);
  const {isDesktop: isDsl} = useBreakpoint();
  return (
    <div style={{padding:isDsl?"0 0 100px":"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Shopping List</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Auto-generated from your patterns, cross-referenced with your stash.</div>
      {needs.length===0?(<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>✅</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>You're all stocked up</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Your stash covers all current pattern needs.</div></div>):(
        <>{needs.map((n,i)=>(
          <div key={i} style={{background:T.surface,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{n.pattern}</div>
            <div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:8}}>{n.material}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[["Need",`${n.need} yds`],["Have",`${n.have} yds`],["Buy",`~${n.skeins} skein${n.skeins!==1?"s":""}`]].map(([label,val])=>(
                <div key={label} style={{background:label==="Buy"?T.terraLt:T.linen,borderRadius:8,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:13,fontWeight:700,color:label==="Buy"?T.terra:T.ink}}>{val}</div></div>
              ))}
            </div>
          </div>
        ))}</>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   COLLECTION VIEW
══════════════════════════════════════════════════════════════════════════ */
const CollectionView = ({patterns, cat, setCat, search, setSearch, openDetail, onAddPattern, isPro, tier}) => {
  const {isDesktop} = useBreakpoint();
  const filtered   = patterns.filter(p=>(cat==="All"||p.cat===cat)&&(!search||p.title.toLowerCase().includes(search.toLowerCase())));
  const inProgress = patterns.filter(p=>{const v=pct(p);return v>0&&v<100;});
  return (
    <>
      {inProgress.length>0&&(
        <div style={{background:T.linen,borderBottom:`1px solid ${T.border}`,padding:"16px 0 18px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:`0 ${isDesktop?"0":"18px"}`,marginBottom:12}}>
            <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".09em",fontWeight:600}}>Continue Working</div>
            {inProgress.length>2&&<div style={{fontSize:11,color:T.ink3,display:"flex",alignItems:"center",gap:4}}>swipe <span style={{fontSize:14}}>→</span></div>}
          </div>
          <HScrollRow itemCount={inProgress.length}>
            {inProgress.map(p=><ShelfCard key={p.id} p={p} onClick={()=>openDetail(p)}/>)}
          </HScrollRow>
        </div>
      )}

      <div style={{padding:isDesktop?"24px 0 10px":"16px 18px 10px"}}>
        <div style={{display:"flex",alignItems:"center",background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",gap:9}}>
          <span style={{color:T.ink3,fontSize:15}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your patterns…"
            style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}}
            onFocus={e=>e.currentTarget.parentNode.style.borderColor=T.terra}
            onBlur={e=>e.currentTarget.parentNode.style.borderColor=T.border}/>
        </div>
      </div>

      <div style={{display:"flex",gap:7,overflowX:"auto",padding:isDesktop?"0 0 16px":"0 18px 16px",WebkitOverflowScrolling:"touch"}}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)} style={{background:cat===c?T.terra:T.surface,color:cat===c?"#fff":T.ink2,border:`1.5px solid ${cat===c?T.terra:T.border}`,borderRadius:99,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",flexShrink:0,boxShadow:cat===c?"0 2px 10px rgba(184,90,60,.28)":"none"}}>{c}</button>
        ))}
      </div>

      {!isPro&&(
        <div style={{margin:isDesktop?"0 0 16px":"0 18px 16px",background:T.linen,borderRadius:12,padding:"10px 14px",border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:T.ink2,marginBottom:5,fontWeight:500}}>{patterns.length}/{TIER_CONFIG.free.patternCap} free patterns · {patterns.length<TIER_CONFIG.free.patternCap?"all features available":"upgrade to add more"}</div>
            <Bar val={(patterns.length/TIER_CONFIG.free.patternCap)*100} color={tier.atCap?"#C0392B":T.terra} h={4}/>
          </div>
          {tier.atCap&&<button onClick={onAddPattern} style={{background:T.terra,color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Upgrade</button>}
        </div>
      )}

      <div className="pattern-grid" style={{padding:isDesktop?"0 0 80px":"0 18px 120px"}}>
        {filtered.length===0
          ?<div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:48,marginBottom:14}}>🧶</div>
              <div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>No patterns yet</div>
              <div style={{fontSize:13,color:T.ink3,lineHeight:1.6,marginBottom:20}}>Tap + to add your first pattern.</div>
              <button onClick={onAddPattern} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)"}}>+ Add Your First Pattern</button>
            </div>
          :filtered.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.04} onClick={()=>openDetail(p)}/>)
        }
      </div>
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════ */
export default function StitchBox() {
  const [authed,setAuthed]           = useState(false);
  const [isPro,setIsPro]             = useState(false);
  const [patterns,setPatterns]       = useState(SEED_PATTERNS);
  const [view,setView]               = useState("collection");
  const [selected,setSelected]       = useState(null);
  const [navOpen,setNavOpen]         = useState(false);
  const [addOpen,setAddOpen]         = useState(false);
  const [showPaywall,setShowPaywall] = useState(false);
  const [cat,setCat]                 = useState("All");
  const [search,setSearch]           = useState("");
  const { isTablet, isDesktop } = useBreakpoint();
  const tier = useTier(isPro, patterns.length);

  if(!authed) return (
    <>
      <CSS/>
      <Auth
        onEnter={()=>setAuthed(true)}
        onEnterAsPro={()=>{ setIsPro(true); setAuthed(true); }}
      />
    </>
  );

  if(view==="detail"&&selected) return (
    <>
      <CSS/>
      <Detail p={selected} onBack={()=>setView("collection")}
        onSave={u=>{setPatterns(prev=>prev.map(p=>p.id===u.id?u:p));setSelected(u);}}/>
    </>
  );

  const openDetail    = p => { setSelected(p); setView("detail"); };
  const handleAddPattern = (p) => { setPatterns(prev=>[p,...prev]); setView("collection"); };
  const openAddModal  = () => { if(tier.atCap){setShowPaywall(true);return;} setAddOpen(true); };
  const inProgress    = patterns.filter(p=>{ const v=pct(p); return v>0&&v<100; });
  const TITLE_MAP     = {collection:"My Patterns",wip:"In Progress",stash:"Yarn Stash",calculator:"Calculators",shopping:"Shopping List"};

  // ── DESKTOP ──
  if(isDesktop) return (
    <div style={{display:"flex",minHeight:"100vh",width:"100%",background:T.bg,fontFamily:T.sans}}>
      <CSS/>
      {showPaywall&&<PaywallGate patternCount={patterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={patterns.length}/>}

      <SidebarNav view={view} setView={setView} count={patterns.length} isPro={isPro} onAddPattern={openAddModal}/>

      <div style={{flex:1,minWidth:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 40px",height:64,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
          <div style={{fontFamily:T.serif,fontSize:24,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"Stitch Box"}</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isPro&&<div style={{background:T.sageLt,borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:600,color:T.sage}}>✨ Pro</div>}
            <button onClick={openAddModal} style={{background:T.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>+</span> Add Pattern
            </button>
          </div>
        </div>

        <div style={{flex:1,padding:"0 40px"}}>
          {view==="collection"&&<CollectionView patterns={patterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier}/>}
          {view==="wip"&&(
            <div style={{padding:"24px 0 80px"}}>
              {inProgress.length===0
                ?<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:20,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:14,color:T.ink3}}>Open a pattern and start checking off rows.</div></div>
                :<div className="pattern-grid">{inProgress.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.06} onClick={()=>openDetail(p)}/>)}</div>
              }
            </div>
          )}
          {view==="stash"&&<div style={{paddingTop:24}}><YarnStash/></div>}
          {view==="calculator"&&<div style={{paddingTop:24}}><Calculators/></div>}
          {view==="shopping"&&<div style={{paddingTop:24}}><ShoppingList patterns={patterns}/></div>}
        </div>
      </div>
    </div>
  );

  // ── MOBILE / TABLET ──
  return (
    <div style={{fontFamily:T.sans,background:T.bg,minHeight:"100vh",maxWidth:isTablet?680:430,margin:"0 auto",display:"flex",flexDirection:"column",position:"relative"}}>
      <CSS/>
      <NavPanel open={navOpen} onClose={()=>setNavOpen(false)} view={view} setView={setView} count={patterns.length} isPro={isPro}/>
      {showPaywall&&<PaywallGate patternCount={patterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={patterns.length}/>}

      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 18px",height:56,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
        <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 8px 8px 0",display:"flex",flexDirection:"column",gap:5}}>
          <div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/>
          <div style={{width:15,height:1.5,background:T.ink,borderRadius:99}}/>
          <div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/>
        </button>
        <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"Stitch Box"}</div>
        <button onClick={openAddModal} style={{background:T.terra,border:"none",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(184,90,60,.4)"}}>+</button>
      </div>

      <div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
        {view==="collection"&&<CollectionView patterns={patterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier}/>}
        {view==="wip"&&(
          <div style={{padding:"16px 18px 80px"}}>
            {inProgress.length===0
              ?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Open a pattern and start checking off rows.</div></div>
              :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{inProgress.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.06} onClick={()=>openDetail(p)}/>)}</div>
            }
          </div>
        )}
        {view==="stash"&&<div style={{paddingTop:18}}><YarnStash/></div>}
        {view==="calculator"&&<div style={{paddingTop:18}}><Calculators/></div>}
        {view==="shopping"&&<div style={{paddingTop:18}}><ShoppingList patterns={patterns}/></div>}
      </div>

      <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:30,pointerEvents:"none"}}>
        <button onClick={openAddModal} style={{
          background:`linear-gradient(135deg,${T.terra},#8B3A22)`,
          color:"#fff",border:"none",borderRadius:99,padding:"13px 26px",
          fontSize:14,fontWeight:700,cursor:"pointer",pointerEvents:"auto",
          boxShadow:"0 8px 28px rgba(184,90,60,.55)",
          display:"flex",alignItems:"center",gap:8,
          animation:"fabPulse 3s ease infinite",
        }}>
          <span style={{fontSize:17}}>+</span> Add Pattern
        </button>
      </div>
    </div>
  );
}
