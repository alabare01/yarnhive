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

// ─── SUPABASE AUTH (no package needed) ───────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const APP_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://yarnhive.app";
const saveSession = (s) => { try { if(s) localStorage.setItem("yh_session",JSON.stringify(s)); else localStorage.removeItem("yh_session"); } catch{} };
const getSession = () => { try { const r=localStorage.getItem("yh_session"); return r?JSON.parse(r):null; } catch{return null;} };

const supabaseAuth = {
  signUp: async (email, password) => {
    console.log("[YarnHive] Signup request:", {supabaseUrl:SUPABASE_URL, redirectTo:APP_ORIGIN});
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:"POST", headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email, password, options:{emailRedirectTo:APP_ORIGIN}}),
    });
    const data = await res.json();
    console.log("[YarnHive] Signup response:", {status:res.status, hasSession:!!data.session, confirmationSentAt:data.confirmation_sent_at||"none"});
    if(!res.ok) return {error: data};
    if(data.session) saveSession(data.session);
    return {data};
  },
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email, password}),
    });
    const data = await res.json();
    if(!res.ok) return {error: data};
    if(data.access_token) saveSession(data);
    return {data};
  },
  signOut: async () => {
    const s = getSession();
    if(s?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method:"POST", headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${s.access_token}`},
      });
    }
    saveSession(null);
  },
  getUser: () => {
    const s = getSession(); if(!s?.access_token) return null;
    try {
      const p = JSON.parse(atob(s.access_token.split(".")[1]));
      if(p.exp*1000 < Date.now()) { saveSession(null); return null; }
      return {id:p.sub, email:p.email};
    } catch { return null; }
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const APP_VERSION = "v1.4.0 — Mar 22 2026";
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

const T = {
  bg:"#F7F3EE", surface:"#F0EBE3", linen:"#EDE8E0", ink:"#1C1714", ink2:"#5C4F44", ink3:"#9E8E82",
  border:"#E2D8CC", terra:"#B85A3C", terraLt:"#F5E2DA", sage:"#5C7A5E", sageLt:"#D8EAD8", gold:"#B8902C",
  modal:"#FAF7F3", card:"#F0EBE3",
  serif:'"Playfair Display", Georgia, serif', sans:'"DM Sans", -apple-system, sans-serif',
  shadow:"0 2px 10px rgba(139,90,60,.08)",
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
  {id:"starter_granny",title:"Granny Square",cat:"Blankets",hook:"5.0mm",weight:"Worsted",yardage:120,notes:"",source:"YarnHive Starter",photo:PHOTOS.blanket,materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:12,height:12},isStarter:true,rows:[
    {id:1,text:"Magic ring, ch 3 (counts as first dc), 2 dc in ring, ch 2, [3 dc in ring, ch 2] 3 times, sl st to top of ch-3 to join.",done:false,note:""},
    {id:2,text:"Sl st to ch-2 sp, ch 3, 2 dc in same sp, ch 1, [3 dc, ch 2, 3 dc in next ch-2 sp, ch 1] 3 times, 3 dc in first sp, ch 2, sl st to join.",done:false,note:""},
    {id:3,text:"Sl st to ch-2 corner sp, ch 3, 2 dc in same sp, ch 2, 3 dc in same sp, ch 1, 3 dc in ch-1 sp, ch 1, [corner, ch 1, 3 dc in ch-1 sp, ch 1] repeat, sl st to join.",done:false,note:""},
    {id:4,text:"Continue pattern, adding one 3-dc group in each ch-1 sp along sides and working [3 dc, ch 2, 3 dc] in each corner ch-2 sp.",done:false,note:""},
    {id:5,text:"Repeat Row 4 to expand square one more round.",done:false,note:""},
    {id:6,text:"Final round: sc evenly around entire square, working 3 sc in each corner. Fasten off and weave in ends.",done:false,note:""},
  ]},
  {id:"starter_amigurumi",title:"Amigurumi Ball",cat:"Amigurumi",hook:"3.5mm",weight:"DK",yardage:40,notes:"",source:"YarnHive Starter",photo:PHOTOS.granny,materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:4,height:4},isStarter:true,rows:[
    {id:11,text:"Magic ring, 6 sc in ring. (6)",done:false,note:""},
    {id:12,text:"2 sc in each st around. (12)",done:false,note:""},
    {id:13,text:"[ Sc in next st, 2 sc in next st ] repeat around. (18)",done:false,note:""},
    {id:14,text:"Sc in each st around. (18) — repeat this row 3 times total.",done:false,note:""},
    {id:15,text:"[ Sc in next st, sc2tog ] repeat around. (12) — stuff with fiberfill now.",done:false,note:""},
    {id:16,text:"Sc2tog around. (6) — fasten off, close opening, weave in ends.",done:false,note:""},
  ]},
  {id:"starter_beanie",title:"Basic Beanie",cat:"Wearables",hook:"5.0mm",weight:"Worsted",yardage:150,notes:"",source:"YarnHive Starter",photo:PHOTOS.cardigan,materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:10,height:8},isStarter:true,rows:[
    {id:21,text:"Magic ring, 6 sc. (6)",done:false,note:""},
    {id:22,text:"2 sc in each st. (12)",done:false,note:""},
    {id:23,text:"[ Sc, 2 sc in next ] repeat. (18)",done:false,note:""},
    {id:24,text:"[ Sc in 2, 2 sc in next ] repeat. (24)",done:false,note:""},
    {id:25,text:"[ Sc in 3, 2 sc in next ] repeat. (30)",done:false,note:""},
    {id:26,text:"Sc in each st around until piece measures 5 inches from top.",done:false,note:""},
    {id:27,text:"Continue even rounds until beanie measures 7.5 inches total.",done:false,note:""},
    {id:28,text:"Last round: sl st in each st around. Fasten off, weave in ends.",done:false,note:""},
  ]},
  {id:"starter_dishcloth",title:"Simple Dishcloth",cat:"Home",hook:"5.0mm",weight:"Cotton",yardage:80,notes:"",source:"YarnHive Starter",photo:PHOTOS.pillow,materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:8,height:8},isStarter:true,rows:[
    {id:31,text:"Ch 25. Sc in 2nd ch from hook and in each ch across. (24 sc)",done:false,note:""},
    {id:32,text:"Ch 1, turn. Sc in each st across. (24)",done:false,note:""},
    {id:33,text:"Repeat Row 2. Continue until piece is roughly square.",done:false,note:""},
    {id:34,text:"Final row: ch 1, turn, sc across. Fasten off, weave in ends.",done:false,note:""},
  ]},
  {id:"starter_magicring",title:"Magic Ring Practice Swatch",cat:"Amigurumi",hook:"4.0mm",weight:"Worsted",yardage:30,notes:"",source:"YarnHive Starter",photo:PHOTOS.granny,materials:[],rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:5,height:5},isStarter:true,rows:[
    {id:41,text:"Make a magic ring. Ch 1, work 6 sc into ring, pull tight to close. (6)",done:false,note:""},
    {id:42,text:"2 sc in each st around. (12)",done:false,note:""},
    {id:43,text:"[ Sc in next st, 2 sc in next ] repeat around. (18)",done:false,note:""},
    {id:44,text:"[ Sc in next 2 sts, 2 sc in next ] repeat around. (24)",done:false,note:""},
    {id:45,text:"Sc in each st around. (24) — practice round, no increases.",done:false,note:""},
    {id:46,text:"Sl st in next st. Fasten off. This is your gauge swatch — keep it!",done:false,note:""},
  ]},
];
const makeStarterPatterns = () => DEFAULT_STARTERS.map(p=>({...p,rows:p.rows.map(r=>({...r}))}));
// Upload pattern file to Cloudinary (PDF, JPG, PNG)
const uploadPatternFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "yarnhive_patterns");
  formData.append("resource_type", "auto");
  if(onProgress) onProgress("uploading");
  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/dmaupzhcx/auto/upload", {
      method: "POST", body: formData,
    });
    if (!res.ok) throw new Error("Upload failed: " + res.status);
    const data = await res.json();
    if(onProgress) onProgress("done");
    return { url: data.secure_url, filename: data.original_filename + "." + (data.format||"pdf"), type: file.type };
  } catch (e) {
    if(onProgress) onProgress("error");
    console.error("[YarnHive] File upload error:", e);
    return null;
  }
};

// Extract pattern data from PDF/image using Gemini Vision
// Convert File to base64 (call before Cloudinary upload)
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const extractPatternFromPDF = async (base64Data, filename, mimeType) => {
  console.log("[YarnHive] Gemini extraction starting, mime:", mimeType, "base64 length:", base64Data.length);
  if (!GEMINI_API_KEY) { console.error("[YarnHive] No Gemini API key"); throw new Error("Gemini API key not configured"); }

  const prompt = `You are a crochet pattern extraction specialist. Analyze this crochet pattern and extract all structured data. Return ONLY valid JSON with no markdown, no backticks, no explanation.

Return this exact structure:
{"title":"string","designer":"string","source_url":null,"finished_size":"string","difficulty":"Beginner or Intermediate or Advanced","yarn_weight":"string","hook_size":"string","gauge":"string or null","materials":[{"name":"string","amount":"string","notes":"string"}],"abbreviations":[{"abbr":"string","meaning":"string"}],"abbreviations_map":{"mr":"magic ring","sc":"single crochet"},"suggested_resources":[{"label":"string","url":"string"}],"pattern_notes":"string","components":[{"name":"string","make_count":1,"rows":[{"id":"rnd-1","label":"RND 1","text":"full instruction text","stitch_count":null,"action_item":false,"repeat_brackets":[{"sequence":"string","count":2}]}]}],"assembly_notes":"string","image_description":"string"}

For patterns worked in the round, use 'RND' as the label prefix (RND 1, RND 2, etc). For patterns worked in rows, use 'ROW'. Detect from context which applies per component.

For any instruction covering multiple rounds like 'RND 10-23: sc x40 (24) (14 RNDs total)', expand into individual rows: RND 10, RND 11, RND 12... each with the same instruction text. Never leave a range as a single row. Every round the user needs to complete must be its own checkable row.

For mid-pattern instructions that are not stitch rows (examples: 'Place the eyes now', 'Begin stuffing', 'PM in front post', 'See page 7 for details') -- include these as rows with label 'NOTE' and set action_item: true. These are critical build steps not stitch instructions.

For components like 'FLIPPER (MAKE 2)', make_count should be 2. Always extract make_count as a number, default 1 if not specified.

After all construction components, extract any assembly, finishing, or detail sections as a final component named 'ASSEMBLY & FINISHING'. Extract each distinct step as a row. Examples: 'Place safety eyes between RND 5 and 6', 'Attach flippers to body at RND 9-14'. Use label: 'STEP' and action_item: true for all assembly rows.

Extract pattern_notes as a single string containing all special technique notes, tension notes, and construction tips. Include: special stitch methods, decrease methods, tension guidance, and technique-specific instructions.

Extract abbreviations_map as a flat key-value object mapping each abbreviation to its full meaning, e.g. {"mr":"magic ring","sc":"single crochet","inc":"increase","dec":"decrease"}. Source this from the abbreviations/legend section of the pattern. Default to empty object {} if none found.

Extract suggested_resources as an array of {label, url} objects from any "Suggested Tutorials", "Resources", or hyperlink sections in the pattern. Default to empty array [] if none found.

For each row/round, extract repeat_brackets: an array of bracket repeat patterns found in that instruction. For example, "Round 16: (6 sc, inc) x 2 -- 16 sts" should produce repeat_brackets: [{"sequence":"6 sc, inc","count":2}]. Look for patterns like (sequence) x N, [sequence] x N, or *sequence* repeat N times. If a row has no bracket repeats, set repeat_brackets: [].

Be thorough -- extract every component, every round, every material. Ensure the JSON is complete and valid. Do not truncate.`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType || "application/pdf", data: base64Data } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
  };

  console.log("[YarnHive] Sending Gemini request, parts:", body.contents[0].parts.length, "model: gemini-2.5-flash");
  const geminiCall = async (model) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return r;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  };
  let res;
  try {
    res = await geminiCall("gemini-2.5-flash");
  } catch (e) {
    console.error("[YarnHive] Gemini first attempt failed:", e.name === "AbortError" ? "timeout (90s)" : e.message);
    console.log("[YarnHive] Retrying Gemini extraction...");
    await new Promise(r => setTimeout(r, 2000));
    try {
      res = await geminiCall("gemini-2.5-flash");
    } catch (e2) {
      console.error("[YarnHive] Gemini retry also failed:", e2.message);
      console.log("[YarnHive] Falling back to gemini-2.0-flash-lite...");
      res = await geminiCall("gemini-2.0-flash-lite");
    }
  }

  console.log("[YarnHive] Gemini raw response status:", res.status);
  const rawText = await res.text();
  console.log("[YarnHive] Gemini raw response body:", rawText.substring(0, 500));

  if (!res.ok) {
    console.error("[YarnHive] Gemini API error:", res.status, rawText);
    // If 2.5 flash failed, try 1.5 flash
    if (res.status === 404 || res.status === 400) {
      console.log("[YarnHive] Retrying with gemini-2.0-flash-lite...");
      const res2 = await geminiCall("gemini-2.0-flash-lite");
      console.log("[YarnHive] Fallback response status:", res2.status);
      if (!res2.ok) {
        const err2 = await res2.text();
        console.error("[YarnHive] Fallback also failed:", err2.substring(0, 300));
        throw new Error("Gemini extraction failed: " + res2.status);
      }
      const data2 = await res2.json();
      const text2 = data2.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned2 = text2.replace(/```json/g, "").replace(/```/g, "").trim();
      console.log("[YarnHive] Fallback extracted text:", cleaned2.substring(0, 200));
      return JSON.parse(cleaned2);
    }
    throw new Error("Gemini extraction failed: " + res.status);
  }

  let data;
  try { data = JSON.parse(rawText); } catch (e) {
    console.error("[YarnHive] Response is not valid JSON wrapper:", e);
    throw new Error("Invalid Gemini response format");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("[YarnHive] Gemini extracted text length:", text.length);
  console.log("[YarnHive] Gemini extracted text preview:", text.substring(0, 300));

  // Strip markdown fences thoroughly
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    console.log("[YarnHive] Extraction successful:", parsed.title, "—", (parsed.components||[]).length, "components");
    return parsed;
  } catch (e) {
    console.error("[YarnHive] JSON parse failed. Cleaned text:", cleaned.substring(0, 300));
    console.error("[YarnHive] Parse error:", e.message);
    throw new Error("Could not parse extraction results");
  }
};

// Build rows array from extracted components
const buildRowsFromComponents = (components) => {
  const rows = [];
  let rowId = 1;
  (components || []).forEach(comp => {
    const makeCount = comp.make_count || 1;
    const label = comp.name + (makeCount > 1 ? ` (MAKE ${makeCount})` : "");
    rows.push({ id: "header-" + (comp.name || rowId).toLowerCase().replace(/\s+/g, "-"), text: "── " + label.toUpperCase() + " ──", isHeader: true, done: false, note: "", componentName: comp.name, makeCount });
    (comp.rows || []).forEach(r => {
      const isAction = !!r.action_item;
      const prefix = isAction ? "📌 " : "";
      const labelText = r.label ? r.label + ": " : "";
      const stitchSuffix = r.stitch_count ? " (" + r.stitch_count + ")" : "";
      rows.push({ id: "row-" + rowId++, text: prefix + labelText + r.text + stitchSuffix, done: false, note: "", isAction, componentName: comp.name, repeat_brackets: r.repeat_brackets || [] });
    });
  });
  return rows;
};

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
  const [fileUrl,setFileUrl]=useState(""),[fileName,setFileName]=useState(""),[fileType,setFileType]=useState(""),[fileUploading,setFileUploading]=useState(false);
  const fileRef=useRef(null);
  const handleFileUpload=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setFileUploading(true);
    const result=await uploadPatternFile(file);
    setFileUploading(false);
    if(result){setFileUrl(result.url);setFileName(result.filename);setFileType(result.type);}
  };
  const addRow=()=>{if(!rowText.trim())return;setRows(p=>[...p,{id:Date.now(),text:rowText.trim(),done:false,note:""}]);setRowText("");};
  const addMat=()=>{if(!matName.trim())return;setMaterials(p=>[...p,{id:Date.now(),name:matName.trim(),amount:matAmt.trim()}]);setMatName("");setMatAmt("");};
  const save=()=>{if(!title.trim())return;onSave({id:Date.now(),photo:PILL[Math.floor(Math.random()*PILL.length)],title,source:source||"My Pattern",cat,hook,weight,notes,rating:0,yardage:parseInt(yardage)||0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials,rows,source_file_url:fileUrl||undefined,source_file_name:fileName||undefined,source_file_type:fileType||undefined});};
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
      <div style={{marginBottom:18}}>
        <div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>Attach source pattern (optional)</div>
        <div style={{fontSize:12,color:T.ink3,marginBottom:8}}>PDF, JPG, or PNG — we'll keep it handy while you build</div>
        {fileUrl?(
          <div style={{display:"flex",alignItems:"center",gap:8,background:T.linen,borderRadius:10,padding:"10px 14px",border:`1px solid ${T.border}`}}>
            <span style={{color:T.sage,fontSize:14}}>✓</span>
            <span style={{flex:1,fontSize:13,color:T.ink2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fileName}</span>
            <button onClick={()=>{setFileUrl("");setFileName("");setFileType("");}} style={{background:"none",border:"none",color:T.ink3,cursor:"pointer",fontSize:16}}>×</button>
          </div>
        ):(
          <>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} style={{display:"none"}}/>
            <button onClick={()=>fileRef.current?.click()} disabled={fileUploading} style={{background:T.linen,border:`1.5px dashed ${T.border}`,borderRadius:10,padding:"12px 16px",cursor:"pointer",fontSize:13,color:T.ink2,width:"100%",fontWeight:500,opacity:fileUploading?.6:1}}>{fileUploading?"Uploading…":"📎 Choose file"}</button>
          </>
        )}
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
  const [stage,setStage]=useState("pick");
  const [progress,setProgress]=useState(0);
  const [stageText,setStageText]=useState("");
  const [extracted,setExtracted]=useState(null);
  const [fileInfo,setFileInfo]=useState(null);
  const [errorMsg,setErrorMsg]=useState("");
  const [editTitle,setEditTitle]=useState("");
  const [editDesigner,setEditDesigner]=useState("");
  const [editHook,setEditHook]=useState("");
  const [editWeight,setEditWeight]=useState("");
  const handleFile=async(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    // Size check before anything
    if(f.size>10*1024*1024){setStage("error");setErrorMsg("Pattern file is too large for automatic reading (max 10MB). Try a smaller file.");return;}
    try{
      // Convert to base64 FIRST (before Cloudinary upload) for Gemini
      console.log("[YarnHive] Converting file to base64...", f.name, f.type, (f.size/1024).toFixed(0)+"KB");
      const base64Data=await fileToBase64(f);
      const fileMime=f.type||"application/pdf";
      console.log("[YarnHive] Base64 ready, length:", base64Data.length);
      // Stage 1: Upload to Cloudinary for storage
      setStage("uploading");setStageText("Uploading your pattern...");setProgress(10);
      const intv1=setInterval(()=>setProgress(p=>Math.min(p+3,30)),200);
      const uploaded=await uploadPatternFile(f);
      clearInterval(intv1);
      if(!uploaded){setStage("error");setErrorMsg("Upload failed — check your connection and try again.");return;}
      setFileInfo({url:uploaded.url,name:uploaded.filename,type:uploaded.type});setProgress(33);
      // Stage 2: Extract with Gemini using local base64 (no re-fetch needed)
      setStage("extracting");setStageText("Reading your pattern...");
      const intv2=setInterval(()=>setProgress(p=>Math.min(p+1,62)),300);
      let result;
      try{result=await extractPatternFromPDF(base64Data,f.name,fileMime);}
      catch(ex){clearInterval(intv2);console.error("[YarnHive] Extraction failed:",ex);setStage("error");setErrorMsg("We couldn't read this pattern automatically. You can still save it manually.");setExtracted({title:f.name.replace(/\.(pdf|jpg|png|jpeg)$/i,"").replace(/[-_]/g," "),components:[],materials:[],pattern_notes:"",hook_size:"",yarn_weight:"",designer:"",difficulty:"",assembly_notes:""});return;}
      clearInterval(intv2);setProgress(66);
      setStage("building");setStageText("Building your workspace...");
      await new Promise(r=>setTimeout(r,600));setProgress(100);
      setExtracted(result);setEditTitle(result.title||"");setEditDesigner(result.designer||"");setEditHook(result.hook_size||"");setEditWeight(result.yarn_weight||"");
      await new Promise(r=>setTimeout(r,400));setStage("review");
    }catch(ex){console.error("[YarnHive] PDF import error:",ex);setStage("error");setErrorMsg("Something went wrong. Try again or use manual entry.");}
  };
  const handleSave=()=>{
    const rows=buildRowsFromComponents(extracted.components);
    const mats=(extracted.materials||[]).map((m,i)=>({id:i+1,name:m.name||"",amount:m.amount||"",yardage:0,notes:m.notes||""}));
    onSave({id:Date.now(),title:editTitle||"Imported Pattern",source:editDesigner||"PDF Import",cat:"Uncategorized",hook:editHook||"",weight:editWeight||"",notes:extracted.pattern_notes||"",yardage:0,rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials:mats,rows,photo:PILL[Math.floor(Math.random()*PILL.length)],source_file_url:fileInfo?.url||"",source_file_name:fileInfo?.name||"",source_file_type:fileInfo?.type||"",extracted_by_ai:true,components:extracted.components||[],assembly_notes:extracted.assembly_notes||"",difficulty:extracted.difficulty||"",abbreviations_map:extracted.abbreviations_map||{},suggested_resources:extracted.suggested_resources||[]});
  };
  const handleFallbackSave=()=>{onSave({id:Date.now(),title:extracted?.title||"Imported Pattern",source:"PDF Import",cat:"Uncategorized",hook:"",weight:"",notes:"",yardage:0,rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials:[],rows:[],photo:PILL[Math.floor(Math.random()*PILL.length)],source_file_url:fileInfo?.url||"",source_file_name:fileInfo?.name||"",source_file_type:fileInfo?.type||""});};
  if(stage==="pick") return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Upload your pattern — PDF or photo. We'll read it and set up your workspace.</div>
      <label style={{display:"block",cursor:"pointer"}}><div style={{border:`2px dashed ${T.border}`,borderRadius:16,padding:"36px 20px",textAlign:"center",background:T.linen,transition:"border-color .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.terra} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}><div style={{fontSize:40,marginBottom:10}}>📄</div><div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:6}}>Upload your pattern</div><div style={{fontSize:13,color:T.ink3,marginBottom:14}}>PDF or photo — we'll read it and set up your workspace</div><div style={{background:T.terra,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,display:"inline-block"}}>Choose File</div></div><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{display:"none"}}/></label>
    </div>
  );
  if(stage==="uploading"||stage==="extracting"||stage==="building") return (
    <div style={{padding:"40px 0",textAlign:"center"}}>
      <div style={{fontSize:36,marginBottom:16}}>{stage==="building"?"✓":"🔎"}</div>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:8}}>{stageText}</div>
      {stage==="extracting"&&<div style={{fontSize:12,color:T.ink3,marginBottom:16}}>This may take 30–60 seconds for detailed patterns</div>}
      <div style={{height:8,background:T.linen,borderRadius:99,overflow:"hidden",margin:"0 auto",maxWidth:300}}><div className={stage==="extracting"?"progress-bar-fill":""} style={{height:"100%",width:progress+"%",background:stage==="building"?T.sage:T.terra,borderRadius:99,transition:"width .4s ease"}}/></div>
    </div>
  );
  if(stage==="error") return (
    <div style={{padding:"24px 0"}}>
      <div style={{background:T.terraLt,borderRadius:14,padding:"20px",border:`1px solid rgba(184,90,60,.2)`,marginBottom:16}}><div style={{fontSize:14,fontWeight:600,color:T.terra,marginBottom:6}}>Extraction incomplete</div><div style={{fontSize:13,color:T.ink2,lineHeight:1.6}}>{errorMsg}</div></div>
      {fileInfo&&<Btn onClick={handleFallbackSave}>Save with file attached (manual entry)</Btn>}
      <div style={{marginTop:8}}><Btn variant="ghost" onClick={()=>{setStage("pick");setProgress(0);setErrorMsg("");}}>Try another file</Btn></div>
    </div>
  );
  const totalRows=(extracted?.components||[]).reduce((s,c)=>(s+(c.rows||[]).length),0);
  return (
    <div style={{paddingBottom:8}}>
      <div style={{background:T.sageLt,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>✓</span><span style={{fontSize:13,color:T.sage,fontWeight:600}}>We read your pattern — does this look right?</span></div>
      <Field label="Pattern title" value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Pattern name"/>
      <Field label="Designer" value={editDesigner} onChange={e=>setEditDesigner(e.target.value)} placeholder="Designer name"/>
      <div style={{display:"flex",gap:10,marginBottom:14}}><div style={{flex:1}}><Field label="Hook size" value={editHook} onChange={e=>setEditHook(e.target.value)} placeholder="5.0mm"/></div><div style={{flex:1}}><Field label="Yarn weight" value={editWeight} onChange={e=>setEditWeight(e.target.value)} placeholder="Worsted"/></div></div>
      {(extracted?.materials||[]).length>0&&<div style={{marginBottom:14}}><div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Materials ({extracted.materials.length})</div>{extracted.materials.map((m,i)=><div key={i} style={{fontSize:13,color:T.ink2,padding:"4px 0",borderBottom:`1px solid ${T.border}`}}>{m.name}{m.amount?" — "+m.amount:""}</div>)}</div>}
      {(extracted?.components||[]).length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Components found ({extracted.components.length})</div>{extracted.components.map((c,i)=>(<div key={i} style={{background:T.linen,borderRadius:12,padding:"12px 14px",marginBottom:8,border:`1px solid ${T.border}`}}><div style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:4}}>{c.name}{c.make_count>1?" × "+c.make_count:""}</div><div style={{fontSize:11,color:T.ink3,marginBottom:6}}>{(c.rows||[]).length} rows</div>{(c.rows||[]).slice(0,3).map((r,j)=><div key={j} style={{fontSize:12,color:T.ink2,lineHeight:1.5,padding:"2px 0"}}>{r.label}: {r.text?.substring(0,60)}{r.text?.length>60?"…":""}</div>)}{(c.rows||[]).length>3&&<div style={{fontSize:11,color:T.ink3,fontStyle:"italic",marginTop:4}}>+{(c.rows||[]).length-3} more rows</div>}</div>))}<div style={{fontSize:12,color:T.terra,fontWeight:600,marginTop:4}}>{totalRows} total rows ready to build</div></div>}
      <Btn onClick={handleSave}>Looks good — save pattern</Btn>
      <div style={{marginTop:8}}><Btn variant="ghost" onClick={()=>{setStage("pick");setProgress(0);setExtracted(null);}}>Try a different file</Btn></div>
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
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {METHODS.filter(m=>m.key!=="snap").map(m=>(
          <div key={m.key} onClick={()=>setMethod(m.key)} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:16,padding:20,cursor:"pointer",transition:"all .15s",boxShadow:T.shadow}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(139,90,60,.12)";}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadow;}}>
            <div style={{fontSize:32,marginBottom:10}}>{m.icon}</div>
            <div style={{fontSize:15,fontWeight:600,color:T.ink,marginBottom:4}}>{m.label==="Manual Entry"?"Write it yourself":m.label==="Smart Import"?"Paste a link":m.label==="PDF / Document"?"Upload a file":"Explore free patterns"}</div>
            <div style={{fontSize:12,color:T.ink3,lineHeight:1.5}}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div onClick={()=>setMethod("snap")} style={{background:"linear-gradient(135deg,#B85A3C 0%,#8B3A2C 100%)",borderRadius:16,padding:20,cursor:"pointer",position:"relative",overflow:"hidden",transition:"transform .15s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
        <div style={{position:"absolute",top:10,right:12,background:"rgba(255,255,255,.2)",borderRadius:99,padding:"3px 10px",fontSize:10,fontWeight:700,color:"#fff"}}>3 free scans/mo</div>
        <div style={{fontSize:32,marginBottom:8}}>🐝</div>
        <div style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:4}}>Hive Vision — Point. Click. Stitch.</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.85)",lineHeight:1.5}}>Photograph any finished object. Get the complete pattern instantly.</div>
      </div>
    </>
  );
  if(isDesktop) return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss} style={{position:"absolute",inset:0,background:"rgba(28,23,20,.6)",backdropFilter:"blur(4px)"}}/>
      <div className={closing?"":"fu"} style={{position:"relative",background:T.surface,borderRadius:20,width:"100%",maxWidth:580,maxHeight:"85vh",display:"flex",flexDirection:"column",zIndex:1,boxShadow:"0 24px 64px rgba(28,23,20,.3)"}}>
        <div style={{flexShrink:0,padding:"24px 28px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            {method?<button onClick={()=>setMethod(null)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:14,fontWeight:600,padding:0}}>← Back</button>:<div style={{fontFamily:T.serif,fontSize:22,color:T.ink}}>What are you adding to your hive?</div>}
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

const SidebarNav = ({view,setView,count,isPro,onAddPattern,onSignOut,onUpgrade,userPatterns=[],allPatterns=[]}) => {
  const starterC=DEFAULT_STARTERS.length;const addedC=userPatterns.filter(p=>!p.isStarter).length;
  const wipCount=allPatterns.filter(p=>!p.isStarter&&(p.status==="in_progress"||p.started)).filter(p=>pct(p)<100).length;
  const ITEMS=[{key:"collection",label:"Your Hive",sub:starterC+" starter"+(starterC!==1?"s":"")+" · "+addedC+" added",icon:"🧶"},{key:"wip",label:"Builds in Progress",sub:wipCount>0?wipCount+" active":"Currently making",icon:"🪡"},{key:"browse",label:"Browse Sites",sub:"Find free patterns",icon:"🌐"},{key:"stash",label:"Yarn Stash",sub:"Manage your yarn",icon:"🎀"},{key:"calculator",label:"Calculators",sub:"Gauge, yardage & more",icon:"🧮"},{key:"shopping",label:"Shopping List",sub:"Auto-generated",icon:"🛒"}];
  return (
    <div style={{width:260,background:T.surface,borderRight:`1px solid ${T.border}`,height:"100vh",position:"sticky",top:0,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div onClick={()=>setView("collection")} style={{position:"relative",height:160,overflow:"hidden",flexShrink:0,cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
        <Photo src="https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,g_center,w_400,h_320,z_0.7/v1774123693/yarnhive_sidebar_bee.jpg" alt="YarnHive bee" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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
      <div style={{padding:"0 0 8px"}}>
        {(()=>{const active=view==="profile";return(
          <div className="nav-item" onClick={()=>setView("profile")} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderLeft:"3px solid "+(active?T.terra:"transparent"),background:active?T.terraLt:"transparent",cursor:"pointer",transition:"background .12s"}}>
            <span style={{fontSize:18,width:24,textAlign:"center"}}>👤</span>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:active?600:400,color:active?T.terra:T.ink}}>Profile & Settings</div><div style={{fontSize:11,color:T.ink3,marginTop:1}}>Your account</div></div>
            {active&&<div style={{width:6,height:6,borderRadius:99,background:T.terra}}/>}
          </div>
        );})()}
      </div>
      <div style={{padding:"0 16px 24px"}}>
        {isPro?<div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>✨</span><div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>YarnHive Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div></div>
        :<div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:12,padding:"14px"}}><div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.75)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Hive Vision, cloud sync.</div><div onClick={onUpgrade} style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo</div></div>}
        {onSignOut&&<button onClick={onSignOut} style={{width:"100%",background:"none",border:"1px solid "+T.border,borderRadius:10,padding:"8px",fontSize:12,color:T.ink3,cursor:"pointer",marginTop:10,fontWeight:500}}>Sign out</button>}
      </div>
    </div>
  );
};

const NavPanel = ({open,onClose,view,setView,count,isPro,onSignOut,onUpgrade}) => {
  const [closing,setClosing]=useState(false);
  const dismiss=()=>{setClosing(true);setTimeout(()=>{setClosing(false);onClose();},220);};
  const go=v=>{setView(v);dismiss();};
  if(!open) return null;
  const ITEMS=[{key:"collection",label:"Your Hive",sub:count+" patterns",icon:"🧶"},{key:"wip",label:"Builds in Progress",sub:"Currently making",icon:"🪡"},{key:"browse",label:"Browse Sites",sub:"Find free patterns",icon:"🌐"},{key:"stash",label:"Yarn Stash",sub:"Manage your yarn",icon:"🎀"},{key:"calculator",label:"Calculators",sub:"Gauge, yardage & more",icon:"🧮"},{key:"shopping",label:"Shopping List",sub:"Auto-generated needs",icon:"🛒"}];
  return (
    <div style={{position:"fixed",inset:0,zIndex:100}}>
      <div className={closing?"dim-out":"dim-in"} onClick={dismiss} style={{position:"absolute",inset:0,background:"rgba(28,23,20,.52)",backdropFilter:"blur(3px)"}}/>
      <div className={closing?"nav-close":"nav-open"} style={{position:"absolute",top:0,left:0,bottom:0,width:"80%",maxWidth:320,background:T.surface,display:"flex",flexDirection:"column",boxShadow:"6px 0 40px rgba(28,23,20,.2)"}}>
        <div onClick={()=>go("collection")} style={{position:"relative",height:130,overflow:"hidden",flexShrink:0,cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <Photo src="https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,g_center,w_400,h_320,z_0.7/v1774123693/yarnhive_sidebar_bee.jpg" alt="YarnHive bee" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
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
          {isPro?<div style={{background:`linear-gradient(135deg,${T.sage},#3D5E3F)`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>✨</span><div><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>YarnHive Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>All features active</div></div></div>
          :<div style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,borderRadius:12,padding:"14px 16px"}}><div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:3}}>✨ Upgrade to Pro</div><div style={{fontSize:11,color:"rgba(255,255,255,.75)",lineHeight:1.5,marginBottom:10}}>Unlimited patterns, all imports, Hive Vision.</div><div onClick={onUpgrade} style={{background:"rgba(255,255,255,.2)",borderRadius:8,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}>$9.99/mo</div></div>}
          {onSignOut&&<button onClick={onSignOut} style={{width:"100%",background:"none",border:"1px solid "+T.border,borderRadius:10,padding:"8px",fontSize:12,color:T.ink3,cursor:"pointer",marginTop:10,fontWeight:500}}>Sign out</button>}
        </div>
      </div>
    </div>
  );
};

const BeeAnimator = ({visible, isDesktop}) => {
  const size = isDesktop ? 52 : 42;
  const W = isDesktop ? 440 : 370;
  const H = isDesktop ? 200 : 170;
  const canvasRef=useRef(null);
  const beeRef=useRef(null);
  const pathRef=useRef(null);

  useEffect(()=>{
    if(!visible)return;
    // Generate random bezier control points
    const rnd=(min,max)=>Math.round(min+Math.random()*(max-min));
    const pts=[
      {x:W+size, y:rnd(H*.2,H*.8)},
      {x:rnd(W*.6,W*.9), y:rnd(0,H*.3)},
      {x:rnd(W*.3,W*.6), y:rnd(0,H*.25)},
      {x:rnd(W*.1,W*.4), y:rnd(H*.15,H*.5)},
      {x:rnd(W*.05,W*.2), y:rnd(H*.6,H*.85)},
      {x:rnd(W*.02,W*.15), y:rnd(H*.8,H*.95)},
    ];
    pathRef.current=pts;
    const bezier=(pts,t)=>{let p=[...pts];while(p.length>1){const next=[];for(let i=0;i<p.length-1;i++)next.push({x:p[i].x+(p[i+1].x-p[i].x)*t,y:p[i].y+(p[i+1].y-p[i].y)*t});p=next;}return p[0];};
    const trail=[];
    let start=null;const dur=4500;
    const animate=(ts)=>{
      if(!start)start=ts;
      const elapsed=ts-start;
      const t=Math.min(elapsed/dur,1);
      const eased=t<.5?2*t*t:(1-Math.pow(-2*t+2,2)/2);
      const pos=bezier(pts,eased);
      if(beeRef.current){
        beeRef.current.style.transform=`translate(${pos.x}px,${pos.y}px)`;
        beeRef.current.style.opacity=t<.03?"0":"1";
      }
      // Leave trail dots
      if(canvasRef.current&&t>0.03){
        const dot=document.createElement("div");
        dot.style.cssText=`position:absolute;left:${pos.x+size/2}px;top:${pos.y+size/2}px;width:3px;height:3px;border-radius:50%;background:#B8902C;opacity:0.6;pointer-events:none;transition:opacity 1.5s ease;`;
        canvasRef.current.appendChild(dot);
        trail.push(dot);
        requestAnimationFrame(()=>{dot.style.opacity="0";});
        setTimeout(()=>{if(dot.parentNode)dot.parentNode.removeChild(dot);},1600);
      }
      if(t<1)requestAnimationFrame(animate);
    };
    const delay=setTimeout(()=>requestAnimationFrame(animate),850);
    return ()=>{clearTimeout(delay);trail.forEach(d=>{if(d.parentNode)d.parentNode.removeChild(d);});};
  },[visible,W,H,size]);

  return (
    <div style={{width:W,height:H,marginBottom:-(H-26),position:"relative",zIndex:2,pointerEvents:"none",flexShrink:0,opacity:visible?1:0,transition:"opacity .3s ease"}}>
      <div ref={canvasRef} style={{position:"absolute",inset:0}}/>
      <div ref={beeRef} style={{position:"absolute",top:0,left:0,fontSize:size,lineHeight:1,userSelect:"none",opacity:0,willChange:"transform"}}>🐝</div>
    </div>
  );
};

const FormCard = ({cardStyle,isSignup,email,setEmail,pass,setPass,confirmPass,setConfirmPass,authError,handleAuth,loading,onBack}) => {
  const mismatch = isSignup && confirmPass.length > 0 && pass !== confirmPass;
  const signupDisabled = isSignup && (pass !== confirmPass || !confirmPass);
  const onKey = e => { if(e.key==="Enter"&&!loading&&!(isSignup&&signupDisabled)) handleAuth(); };
  return (
  <div style={cardStyle}>
    <button onClick={onBack} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:13,fontWeight:600,padding:0,marginBottom:24,display:"flex",alignItems:"center",gap:6}}>← Back</button>
    <div style={{textAlign:"center",marginBottom:8}}>
      {isSignup&&<div style={{fontSize:11,color:T.ink3,fontWeight:500,letterSpacing:".06em",marginBottom:6}}>Step 1 of 2</div>}
      <div style={{fontFamily:T.serif,fontSize:26,color:T.ink,letterSpacing:"-.02em",fontWeight:700}}>{isSignup?"Create account":"Welcome back"}</div>
      <p style={{fontSize:13,color:T.ink3,marginTop:4,fontWeight:300}}>{isSignup?"Start your pattern collection":"Your hive is waiting"}</p>
    </div>
    <div style={{marginTop:20}} onKeyDown={onKey}>
      <Field label="Email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
      <div style={isSignup?{opacity:1}:undefined}><Field label="Password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} type="password"/></div>
      {isSignup&&<>
        <Field label="Confirm password" placeholder="••••••••" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} type="password"/>
        {mismatch&&<div style={{fontSize:12,color:T.terra,marginTop:-8,marginBottom:10}}>Passwords don't match</div>}
      </>}
      {!isSignup&&<div style={{textAlign:"right",marginBottom:16}}><span style={{fontSize:12,color:T.terra,cursor:"pointer",fontWeight:500}}>Forgot password?</span></div>}
      {authError&&<div style={{background:T.terraLt,border:"1px solid rgba(184,90,60,.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:T.terra,lineHeight:1.5,marginBottom:8}}>{authError}</div>}
      <button onClick={handleAuth} disabled={loading||(isSignup&&signupDisabled)} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#7A2E14)`,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 24px rgba(184,90,60,.45)",marginTop:8,opacity:(loading||(isSignup&&signupDisabled))?.5:1}}>{loading?"Please wait…":isSignup?"Create my YarnHive":"Sign in"}</button>
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
              <div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:T.ink,lineHeight:1.15,marginBottom:4}}>YarnHive Pro</div>
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
      console.log("[YarnHive] Resend confirmation request:", {url:`${SUPABASE_URL}/auth/v1/resend`, payload, supabaseUrl:SUPABASE_URL});
      const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
        method:"POST",
        headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      const body = await res.text();
      console.log("[YarnHive] Resend confirmation response:", {status:res.status, ok:res.ok, body});
      if (res.ok) {
        setResendMsg({type:"ok",text:"Confirmation email sent. Check spam if you don't see it."});
      } else {
        setResendMsg({type:"error",text:`Failed to send (${res.status}). SMTP may not be configured in Supabase dashboard.`});
      }
    } catch (e) { console.error("[YarnHive] Resend confirmation error:", e); setResendMsg({type:"error",text:"Network error."}); }
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
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>✨</span><div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>YarnHive Pro</div><div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>All features active</div></div></div>
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

const WaitlistPopup = () => {
  const [show,setShow]=useState(false),[wlEmail,setWlEmail]=useState(""),[wlPhone,setWlPhone]=useState(""),[submitted,setSubmitted]=useState(false),[saving,setSaving]=useState(false);
  useEffect(()=>{
    if(sessionStorage.getItem("yh_popup_shown")) return;
    const t=setTimeout(()=>{setShow(true);sessionStorage.setItem("yh_popup_shown","1");},3000);
    return ()=>clearTimeout(t);
  },[]);
  const handleSubmit=async()=>{
    if(!wlEmail.trim())return;
    setSaving(true);
    try{await fetch(`${SUPABASE_URL}/rest/v1/waitlist`,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({email:wlEmail.trim(),phone:wlPhone.trim()||null,platform:"web_popup"})});}catch{}
    setSaving(false);setSubmitted(true);
    setTimeout(()=>setShow(false),2000);
  };
  if(!show)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={()=>setShow(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
      <div className="fu" style={{position:"relative",zIndex:1,background:T.modal,borderRadius:20,padding:40,maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(139,90,60,.2)"}}>
        <button onClick={()=>setShow(false)} style={{position:"absolute",top:14,right:16,background:"none",border:"none",color:T.ink3,fontSize:20,cursor:"pointer"}}>×</button>
        {submitted?<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:40,marginBottom:12}}>🐝</div><div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>You're on the list!</div><div style={{fontSize:14,color:T.ink3,marginTop:8}}>We'll be in touch.</div></div>:(
          <>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:T.ink,lineHeight:1.2}}>Join the hive early. 🐝</div>
              <div style={{fontSize:14,color:T.ink3,marginTop:8,lineHeight:1.6}}>Get your first month of Pro free when we launch. No credit card needed.</div>
            </div>
            <div style={{marginBottom:12}}><input value={wlEmail} onChange={e=>setWlEmail(e.target.value)} placeholder="your@email.com" type="email" style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/></div>
            <div style={{marginBottom:16}}><input value={wlPhone} onChange={e=>setWlPhone(e.target.value)} placeholder="(555) 123-4567" type="tel" style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/></div>
            <button onClick={handleSubmit} disabled={saving} style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",opacity:saving?.6:1}}>{saving?"Joining…":"Claim my free month →"}</button>
          </>
        )}
      </div>
    </div>
  );
};

const Auth = ({onEnter,onEnterAsNew}) => {
  const [screen,setScreen]=useState("welcome"),[email,setEmail]=useState(""),[pass,setPass]=useState(""),[confirmPass,setConfirmPass]=useState("");
  const [loading,setLoading]=useState(false),[authError,setAuthError]=useState(null);
  const{isDesktop}=useBreakpoint();

  const handleAuth = async () => {
    setAuthError(null);
    if (!email.trim() || !pass) { setAuthError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      if (screen === "signup") {
        const {data, error} = await supabaseAuth.signUp(email.trim(), pass);
        if (error) { setAuthError(error.msg || error.error_description || error.message || "Sign-up failed."); setLoading(false); return; }
        // If email confirmation required, sign in immediately anyway
        if (data && !data.session) {
          const {error: signInErr} = await supabaseAuth.signIn(email.trim(), pass);
          if (signInErr) { setAuthError(signInErr.error_description || signInErr.msg || signInErr.message || "Sign-up succeeded but sign-in failed."); setLoading(false); return; }
        }
        onEnterAsNew();
      } else {
        const {data, error} = await supabaseAuth.signIn(email.trim(), pass);
        if (error) { setAuthError(error.error_description || error.msg || error.message || "Invalid email or password."); setLoading(false); return; }
        onEnter();
      }
    } catch (e) {
      setAuthError("Network error — please try again.");
    }
    setLoading(false);
  };

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
      <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid rgba(28,23,20,.06)"}}>
        <span style={{fontSize:9,color:T.ink3,opacity:.4,letterSpacing:".06em"}}>{APP_VERSION}</span>
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
          {showForm ? <FormCard cardStyle={CARD_STYLE} isSignup={isSignup} email={email} setEmail={setEmail} pass={pass} setPass={setPass} confirmPass={confirmPass} setConfirmPass={setConfirmPass} authError={authError} handleAuth={handleAuth} loading={loading} onBack={()=>setScreen("welcome")}/> : <WelcomeCard/>}
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

const DeleteConfirmModal = ({pattern,isPro,onCancel,onDelete,onPark,onGoPro}) => (
  <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:T.sans}}>
    <div onClick={onCancel} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)"}}/>
    <div className="fu" style={{position:"relative",zIndex:1,width:"100%",maxWidth:380,background:T.modal,borderRadius:20,padding:"32px 28px",boxShadow:"0 16px 48px rgba(139,90,60,.18)"}}>
      <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:T.ink,marginBottom:8}}>Delete this pattern?</div>
      <div style={{fontSize:13,color:T.ink3,lineHeight:1.6,marginBottom:20}}>{isPro?"This pattern will be permanently removed.":"This pattern will be removed from your library. It will still count toward your pattern limit."}</div>
      {!isPro&&<>
        <button onClick={onPark} style={{width:"100%",background:T.sageLt,color:T.sage,border:`1px solid ${T.sage}`,borderRadius:12,padding:"12px",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:6}}>Park it instead</button>
        <div style={{fontSize:11,color:T.ink3,marginBottom:12,lineHeight:1.5,textAlign:"center"}}>Parking saves your progress and frees up your active view.<br/><span onClick={onGoPro} style={{color:T.terra,cursor:"pointer",fontWeight:600}}>Go Pro for unlimited patterns →</span></div>
      </>}
      <button onClick={onDelete} style={{width:"100%",background:"#C0392B",color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:6}}>Delete</button>
      <button onClick={onCancel} style={{width:"100%",background:T.linen,color:T.ink2,border:`1px solid ${T.border}`,borderRadius:12,padding:"11px",fontSize:13,fontWeight:500,cursor:"pointer"}}>Cancel</button>
    </div>
  </div>
);

const PatternCard = ({p,onClick,onPark,onUnpark,onDelete,delay=0}) => {
  const done=pct(p);
  const [menuOpen,setMenuOpen]=useState(false);
  const isParked=p.status==="parked";
  return (
    <div className="card fu" onClick={onClick} style={{background:T.surface,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",animationDelay:delay+"s",position:"relative"}}>
      {!p.isStarter&&(onPark||onDelete)&&<div style={{position:"absolute",top:8,right:8,zIndex:5}}>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(!menuOpen);}} style={{background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)",border:"none",borderRadius:99,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>⋮</button>
        {menuOpen&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:32,background:T.modal,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(139,90,60,.12)",zIndex:10,minWidth:150,overflow:"hidden"}}>
          {isParked
            ?<div onClick={()=>{setMenuOpen(false);onUnpark&&onUnpark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Unpark</div>
            :<div onClick={()=>{setMenuOpen(false);onPark&&onPark(p);}} style={{padding:"10px 14px",fontSize:13,color:T.ink,cursor:"pointer",borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Park for later</div>
          }
          <div onClick={()=>{setMenuOpen(false);onDelete&&onDelete(p);}} style={{padding:"10px 14px",fontSize:13,color:"#C0392B",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.linen} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Delete pattern</div>
        </div>}
      </div>}
      <div style={{position:"relative",height:160,overflow:"hidden",background:T.linen}}>
        <Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center center"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.5) 0%,transparent 55%)"}}/>
        {isParked?<div style={{position:"absolute",top:10,left:10,background:"rgba(92,79,68,.8)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Parked</div>
        :p.isStarter?<div style={{position:"absolute",top:10,left:10,background:"rgba(184,144,44,.9)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Free Starter</div>
        :done===100?<div style={{position:"absolute",top:10,right:10,background:T.sage,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99,letterSpacing:".07em"}}>DONE</div>
        :done>0&&done<100?<><div style={{position:"absolute",top:10,right:10,background:"rgba(28,23,20,.65)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:99}}>{done}%</div><div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={done} color="rgba(255,255,255,.8)" h={3} bg="transparent"/></div></>
        :null}
        {!isParked&&!p.isStarter&&done===0&&!p.started&&p.rows&&p.rows.length>0&&<div style={{position:"absolute",top:10,right:10,background:"rgba(92,122,94,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Ready to build</div>}
        {!p.isStarter&&p.snapConfidence&&<div style={{position:"absolute",top:10,left:10,background:"rgba(184,90,60,.85)",backdropFilter:"blur(4px)",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99}}>🐝 {p.snapConfidence}%</div>}
      </div>
      <div style={{padding:"12px 14px 16px"}}>
        <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:3}}>{p.cat}</div>
        <div style={{fontFamily:T.serif,fontSize:15,fontWeight:500,color:T.ink,lineHeight:1.3,marginBottom:7}}>{p.title}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><Stars val={p.rating} ro/><span style={{fontSize:11,color:T.ink3}}>{p.source}</span></div>
        {p.isStarter&&<div style={{fontSize:10,color:T.ink3,opacity:.6,marginTop:6,fontStyle:"italic"}}>A gift from YarnHive — yours to keep</div>}
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
              <div key={label}><div style={{fontSize:11,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>
            ))}
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"16px",marginBottom:20,border:`1px solid ${T.border}`}}>
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
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>{isComplete?"🎉 Finished Object":"🪡 Build in Progress — "+done+"%"}</div>
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

const SourceFileViewer = ({url,name,type,onClose}) => {
  const isImage=type&&(type.startsWith("image")||/\.(jpg|jpeg|png|gif|webp)$/i.test(url));
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.sans}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)"}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:800,maxHeight:"90vh",background:T.modal,borderRadius:20,overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div><div style={{fontSize:14,fontWeight:600,color:T.ink}}>Source Pattern</div><div style={{fontSize:11,color:T.ink3,marginTop:2}}>{name}</div></div>
          <button onClick={onClose} style={{background:T.linen,border:"none",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{flex:1,overflow:"auto",padding:0}}>
          {isImage?<img src={url} alt={name} style={{width:"100%",display:"block"}}/>
          :<iframe src={"https://docs.google.com/viewer?url="+encodeURIComponent(url)+"&embedded=true"} title={name} style={{width:"100%",height:"80vh",border:"none"}}/>}
        </div>
      </div>
    </div>
  );
};

const Detail = ({p,onBack,onSave}) => {
  const [rows,setRows]=useState(p.rows),[tab,setTab]=useState("materials"),[newRow,setNewRow]=useState(""),[editing,setEditing]=useState(false),[draft,setDraft]=useState({...p}),[showScale,setShowScale]=useState(false),[noteEdit,setNoteEdit]=useState(null),[showShare,setShowShare]=useState(false),[milestone,setMilestone]=useState(null);
  const [noteSaved,setNoteSaved]=useState(false);
  const [showSourceFile,setShowSourceFile]=useState(false);
  const [attachUploading,setAttachUploading]=useState(false);
  const [expandedSections,setExpandedSections]=useState({});
  const attachRef=useRef(null);
  const handleAttachFile=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setAttachUploading(true);
    const result=await uploadPatternFile(file);
    setAttachUploading(false);
    if(result){
      const updated={...p,source_file_url:result.url,source_file_name:result.filename,source_file_type:result.type,rows};
      onSave(updated);
    }
  };
  const prevDone=useRef(pct({...p,rows:p.rows}));
  const{isDesktop}=useBreakpoint();
  const done=pct({...p,rows}),currentRowIdx=rows.findIndex(r=>!r.done&&!r.isHeader);
  const toggle=id=>{const r=rows.find(x=>x.id===id);if(r?.isHeader)return;const next=rows.map(r=>r.id===id?{...r,done:!r.done}:r);setRows(next);onSave({...p,rows:next});const newDone=pct({...p,rows:next}),prev=prevDone.current;for(const m of [25,50,75,100]){if(prev<m&&newDone>=m){setMilestone(m);break;}}prevDone.current=newDone;};
  const addRow=()=>{if(!newRow.trim())return;const next=[...rows,{id:Date.now(),text:newRow.trim(),done:false,note:""}];setRows(next);onSave({...p,rows:next});setNewRow("");};
  const save=()=>{onSave({...draft,rows});setEditing(false);};
  const updateNote=(id,note)=>{const next=rows.map(r=>r.id===id?{...r,note}:r);setRows(next);onSave({...p,rows:next});setNoteSaved(true);setTimeout(()=>setNoteSaved(false),2000);};
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
          <div style={{marginTop:20,background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"14px 16px",border:`1px solid ${T.border}`}}>
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
          {/* Pattern notes section */}
          {(p.notes||p.pattern_notes)&&<div style={{marginBottom:12}}>
            <button onClick={()=>setNoteEdit(noteEdit==="pnotes"?null:"pnotes")} style={{width:"100%",background:T.linen,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,color:T.ink2,fontWeight:500}}>📋 Pattern Notes — tap to expand</span>
              <span style={{fontSize:12,color:T.ink3}}>{noteEdit==="pnotes"?"▼":"▶"}</span>
            </button>
            {noteEdit==="pnotes"&&<div style={{background:T.linen,border:`1px solid ${T.border}`,borderTop:"none",borderRadius:"0 0 10px 10px",padding:"12px 14px",fontSize:13,color:T.ink2,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{p.notes||p.pattern_notes}</div>}
          </div>}
          {rows.length===0?(
            <div style={{textAlign:"center",padding:"48px 20px"}}>
              <div style={{fontSize:40,marginBottom:14}}>🧶</div>
              <div style={{fontFamily:T.serif,fontSize:18,fontWeight:600,color:T.ink2,marginBottom:8}}>No rows added yet</div>
              <div style={{fontSize:13,color:T.ink3,lineHeight:1.6,marginBottom:20}}>Add rows to start building this pattern step by step.</div>
              <button onClick={()=>{if(!editing)setEditing(true);}} style={{background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)"}}>Add Rows</button>
            </div>
          ):(()=>{
            // Group rows into sections by header rows
            const sections=[];let current={header:null,rows:[]};
            rows.forEach(r=>{if(r.isHeader){if(current.header||current.rows.length)sections.push(current);current={header:r,rows:[]};}else current.rows.push(r);});
            if(current.header||current.rows.length)sections.push(current);
            // Find first incomplete section
            const firstIncomplete=sections.findIndex(s=>s.rows.some(r=>!r.done));
            const seenAbbr=new Set();
            return sections.map((sec,si)=>{
              const secKey=sec.header?.id||"sec-"+si;
              const secDone=sec.rows.filter(r=>r.done).length;
              const secTotal=sec.rows.length;
              const secComplete=secTotal>0&&secDone===secTotal;
              const defaultOpen=si===firstIncomplete||(!sec.header);
              const open=expandedSections[secKey]!==undefined?expandedSections[secKey]:defaultOpen;
              const toggleSec=()=>setExpandedSections(prev=>({...prev,[secKey]:!open}));
              return (<div key={secKey} style={{marginBottom:8}}>
                {sec.header&&<button onClick={toggleSec} style={{width:"100%",background:secComplete?T.sageLt:T.linen,border:`1px solid ${secComplete?"rgba(92,122,94,.3)":T.border}`,borderRadius:open?"10px 10px 0 0":10,padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                  <span style={{fontSize:12,color:T.ink3}}>{open?"▼":"▶"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:secComplete?T.sage:T.terra}}>{sec.header.text.replace(/──/g,"").trim()}{secComplete?" ✓":""}</div>
                    <div style={{fontSize:11,color:T.ink3,marginTop:2}}>{secDone} of {secTotal} complete</div>
                  </div>
                  {sec.header.makeCount>1&&<div style={{background:T.gold,color:"#fff",borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:700}}>×{sec.header.makeCount}</div>}
                  <div style={{width:60}}><Bar val={secTotal?secDone/secTotal*100:0} color={secComplete?T.sage:T.terra} h={3}/></div>
                </button>}
                {(open||!sec.header)&&<div style={{border:sec.header?`1px solid ${T.border}`:"none",borderTop:"none",borderRadius:sec.header?"0 0 10px 10px":0,overflow:"hidden"}}>
                  {sec.rows.map((r,i)=>{const globalIdx=rows.indexOf(r);const isCurrent=globalIdx===currentRowIdx;const newAbbr=r.done?[]:findNewAbbr(r.text,seenAbbr);return(
            <div key={r.id} style={{borderBottom:`1px solid ${T.border}`,background:r.isAction?"rgba(184,144,44,.06)":"transparent"}}>
              <div onClick={()=>toggle(r.id)} style={{display:"flex",gap:13,alignItems:"flex-start",cursor:"pointer",background:isCurrent?"rgba(184,90,60,.04)":"transparent",padding:"14px 8px",margin:"0 -8px"}}>
                <div style={{width:26,height:26,borderRadius:7,flexShrink:0,marginTop:1,background:r.done?T.terra:T.surface,border:"1.5px solid "+(r.done?T.terra:isCurrent?T.terra:T.border),display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",boxShadow:r.done?"0 2px 8px rgba(184,90,60,.3)":isCurrent?"0 0 0 3px rgba(184,90,60,.15)":"none"}}>
                  {r.done&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}{!r.done&&isCurrent&&<div style={{width:8,height:8,borderRadius:99,background:T.terra}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  {isCurrent&&<div style={{fontSize:10,color:T.terra,fontWeight:600,letterSpacing:".06em",marginBottom:2}}>CURRENT ROW</div>}
                  {!isCurrent&&r.isAction&&<div style={{fontSize:10,color:T.gold,fontWeight:600,letterSpacing:".06em",marginBottom:2}}>ACTION</div>}
                  {!isCurrent&&!r.isAction&&<div style={{fontSize:10,color:T.ink3,letterSpacing:".06em",marginBottom:2}}>ROW {globalIdx+1}</div>}
                  <div style={{fontSize:14,lineHeight:1.6,color:r.done?T.ink3:T.ink,textDecoration:r.done?"line-through":"none"}}>{r.text}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();setNoteEdit(noteEdit===r.id?null:r.id);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:"4px",flexShrink:0,position:"relative"}}><span style={{color:r.note?T.terra:T.ink3,opacity:r.note?1:.5}}>📝</span></button>
              </div>
              {r.note&&noteEdit!==r.id&&<div onClick={e=>{e.stopPropagation();setNoteEdit(r.id);}} style={{padding:"0 8px 10px 47px",fontSize:12,color:T.ink3,fontStyle:"italic",cursor:"pointer"}}>📝 {r.note}</div>}
              {newAbbr.length>0&&<div style={{padding:"0 8px 10px 47px",display:"flex",flexWrap:"wrap",gap:6}} onClick={e=>e.stopPropagation()}>{newAbbr.map(a=><button key={a.raw} onClick={e=>{e.stopPropagation();window.open(a.url,"_blank","noopener,noreferrer");}} style={{display:"flex",alignItems:"center",gap:5,background:"#FF0000",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer",boxShadow:"0 2px 8px rgba(255,0,0,.3)"}}><span style={{fontSize:10}}>▶</span><span>{a.raw}</span><span style={{opacity:.8,fontWeight:400}}>— {a.full}</span></button>)}</div>}
              {noteEdit===r.id&&<div style={{padding:"0 8px 12px 47px",display:"flex",alignItems:"center",gap:8}}><input value={r.note} onChange={e=>updateNote(r.id,e.target.value)} placeholder="Add a note for this row…" style={{flex:1,padding:"9px 12px",background:T.linen,border:`1.5px solid ${T.terra}`,borderRadius:9,fontSize:13,color:T.ink,outline:"none"}}/>{noteSaved&&<span style={{fontSize:11,color:T.sage,fontWeight:600,flexShrink:0}}>Note saved</span>}</div>}
            </div>
          );})}
                </div>}
              </div>);
            });
          })()}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <input value={newRow} onChange={e=>setNewRow(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRow()} placeholder="Add a row or step…" style={{flex:1,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"10px 14px",fontSize:13,color:T.ink,background:T.linen,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
            <button onClick={addRow} style={{background:T.terra,color:"#fff",border:"none",borderRadius:11,padding:"10px 18px",fontSize:22,cursor:"pointer",lineHeight:1,boxShadow:"0 4px 12px rgba(184,90,60,.35)"}}>+</button>
          </div>
        </>)}
        {/* Source file attach + viewer */}
        {tab==="rows"&&p.source_file_url&&p.source_file_url.length>0&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:100}}>
          <button onClick={()=>setShowSourceFile(true)} style={{background:T.card,color:T.terra,border:`1.5px solid ${T.border}`,borderRadius:99,padding:"10px 20px",fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(139,90,60,.15)",display:"flex",alignItems:"center",gap:6}}>📄 View Source Pattern</button>
        </div>}
        {showSourceFile&&p.source_file_url&&<SourceFileViewer url={p.source_file_url} name={p.source_file_name||"Source"} type={p.source_file_type||""} onClose={()=>setShowSourceFile(false)}/>}
        {tab==="materials"&&(
          <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            <input ref={attachRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleAttachFile} style={{display:"none"}}/>
            {p.source_file_url?(
              <div style={{display:"flex",alignItems:"center",gap:8,background:T.linen,borderRadius:10,padding:"10px 14px",border:`1px solid ${T.border}`}}>
                <span style={{color:T.sage,fontSize:14}}>📄</span>
                <span style={{flex:1,fontSize:12,color:T.ink2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.source_file_name||"Attached file"}</span>
                <button onClick={()=>attachRef.current?.click()} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:11,fontWeight:600}}>Replace</button>
              </div>
            ):(
              <button onClick={()=>attachRef.current?.click()} disabled={attachUploading} style={{width:"100%",background:T.linen,border:`1.5px dashed ${T.border}`,borderRadius:10,padding:"12px",cursor:"pointer",fontSize:13,color:T.ink2,fontWeight:500,opacity:attachUploading?.6:1}}>{attachUploading?"Uploading…":"📎 Attach Pattern File"}</button>
            )}
          </div>
        )}
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
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {[["gauge","Gauge"],["yardage","Yardage"],["resize","Resize"]].map(([key,label])=>(
          <button key={key} onClick={()=>setActive(key)} style={{flex:1,padding:"10px",border:"1.5px solid "+(active===key?T.terra:T.border),background:active===key?T.terraLt:T.card,color:active===key?T.terra:T.ink3,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:active===key?600:400}}>{label}</button>
        ))}
      </div>
      <div style={{fontSize:12,color:T.ink3,marginBottom:20,lineHeight:1.5}}>{active==="gauge"?"Use when your swatch doesn't match the pattern. Tells you how to adjust your stitch count.":active==="yardage"?"Estimate how much yarn you need before starting a project.":"Scale any pattern up or down to your target size."}</div>
      {active==="gauge"&&<><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Gauge Swatch</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{[["Stitches",stitches,setStitches],["Rows",rows,setRows],["Swatch (in)",swatchSize,setSwatchSize]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Target Dimensions</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",targetW,setTargetW],["Height (in)",targetH,setTargetH]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Results</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Cast on (sts)",castOn],["Total rows",totalRows],["Stitches/inch",stPerInch.toFixed(1)],["Rows/inch",roPerInch.toFixed(1)]].map(([label,val])=><div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:32,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>)}</div></div></>}
      {active==="yardage"&&<><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Project Size</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",projW,setProjW],["Height (in)",projH,setProjH],["Sts per 4in",stPer4,setStPer4],["Yds per stitch",ydsPerSt,setYdsPerSt]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Estimated Yardage</div><div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontFamily:T.serif,fontSize:48,fontWeight:700,color:T.terra}}>{yardage.toLocaleString()}</div><div style={{fontSize:14,color:T.ink3,marginTop:4}}>yards needed</div><div style={{fontSize:13,color:T.ink2,marginTop:8}}>approx. {Math.ceil(yardage/200)} skeins at 200 yds each</div></div></div></>}
      {active==="resize"&&<><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Original Size</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",origW,setOrigW],["Height (in)",origH,setOrigH]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:16}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>New Size</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width (in)",newW,setNewW],["Height (in)",newH,setNewH]].map(([label,val,set])=><div key={label}><div style={{fontSize:10,color:T.ink3,marginBottom:4}}>{label}</div><input value={val} onChange={e=>set(e.target.value)} type="number" style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}/></div>)}</div></div><div style={{background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}><div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Scale Factors</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["Width scale","x"+scaleW.toFixed(2)],["Height scale","x"+scaleH.toFixed(2)],["Stitch mult.",(scaleW*100).toFixed(0)+"%"],["Yardage mult.",(scaleW*scaleH*100).toFixed(0)+"%"]].map(([label,val])=><div key={label} style={{background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}><div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div><div style={{fontSize:32,fontWeight:700,fontFamily:T.serif,color:T.terra}}>{val}</div></div>)}</div></div></>}
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

const ReadyToBuildPrompt = ({pattern,onStartBuilding,onViewDetails,onDismiss}) => (
  <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:T.sans}}>
    <div onClick={onDismiss} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.35)"}}/>
    <div className="fu" style={{position:"relative",zIndex:1,width:"100%",maxWidth:360,background:T.modal,borderRadius:20,padding:"32px 28px",textAlign:"center",boxShadow:"0 16px 48px rgba(139,90,60,.18)"}}>
      <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:T.ink,marginBottom:6}}>Ready to start building?</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:20,lineHeight:1.5}}>{pattern?.title}</div>
      <button onClick={onStartBuilding} style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",marginBottom:8}}>Start Building</button>
      <button onClick={onViewDetails} style={{width:"100%",background:T.linen,color:T.ink2,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",fontSize:13,fontWeight:500,cursor:"pointer"}}>View Details</button>
    </div>
  </div>
);

const PatternCreatedOverlay = ({pattern,onStartBuilding,onGoToHive}) => {
  useEffect(()=>{const t=setTimeout(onGoToHive,8000);return()=>clearTimeout(t);},[]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:T.sans}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)"}}/>
      <div className="fu" style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,background:T.modal,borderRadius:24,padding:"48px 40px",textAlign:"center",boxShadow:"0 20px 60px rgba(139,90,60,.2)"}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:T.sageLt,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28}}>✓</div>
        <div style={{fontFamily:T.serif,fontSize:24,fontWeight:700,color:T.ink,marginBottom:8}}>Your pattern is ready to build</div>
        <div style={{fontFamily:T.serif,fontSize:18,color:T.terra,marginBottom:28}}>{pattern?.title||"Untitled Pattern"}</div>
        <button onClick={onStartBuilding} style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",marginBottom:10}}>Start Building</button>
        <button onClick={onGoToHive} style={{width:"100%",background:T.linen,color:T.ink2,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px",fontSize:14,fontWeight:500,cursor:"pointer"}}>Go to Your Hive</button>
      </div>
    </div>
  );
};

const CAROUSEL_CARDS = [
  {id:"welcome",type:"image",src:"https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,w_400,h_200,g_center/v1774116735/yarnhive_bg_v2.jpg",title:"Welcome to The Hive",sub:"Your crafting journey starts here"},
  {id:"community",type:"solid",bg:"#2C5F4A",title:"847 makers active",sub:"this week"},
  {id:"tip",type:"solid",bg:"#8B6914",title:"Pro tip 💡",sub:"Block finished pieces for a pro look"},
  {id:"seasonal",type:"image",src:"https://res.cloudinary.com/dmaupzhcx/image/upload/c_fill,w_400,h_200,g_center/v1774123693/yarnhive_sidebar_bee.jpg",title:"Spring patterns 🌸",sub:"Browse trending now"},
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
      {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:900,background:T.ink,color:"#fff",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,.3)"}}>Coming soon — stay tuned! 🐝</div>}
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
        {!isMobile&&<><button onClick={()=>setIdx(i=>(i-1+total)%total)} style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.9)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:T.ink,boxShadow:"0 2px 8px rgba(139,90,60,.15)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>‹</button>
        <button onClick={()=>setIdx(i=>(i+1)%total)} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.9)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:T.ink,boxShadow:"0 2px 8px rgba(139,90,60,.15)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>›</button></>}
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
  <div onClick={onClick} style={{background:"linear-gradient(135deg,#F0EBE3 0%,#E8DFD3 100%)",borderRadius:16,border:"2px dashed #C4B5A0",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:220,transition:"border-color .2s, background .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#B85A3C";e.currentTarget.style.background="linear-gradient(135deg,#F5F0EA 0%,#EDE5D8 100%)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#C4B5A0";e.currentTarget.style.background="linear-gradient(135deg,#F0EBE3 0%,#E8DFD3 100%)";}}>
    <div style={{width:48,height:48,marginBottom:10}} dangerouslySetInnerHTML={{__html:SLOT_SVGS[slotIndex%SLOT_SVGS.length]}}/>
    <div style={{fontSize:13,color:"#A89070"}}>Add a pattern</div>
  </div>
);

const CollectionView = ({userPatterns,starterPatterns,cat,setCat,search,setSearch,openDetail,onAddPattern,isPro,tier,setView,onPark,onUnpark,onDelete}) => {
  const{isDesktop}=useBreakpoint();
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
        <div style={{background:T.linen,borderBottom:`1px solid ${T.border}`,padding:"16px 0 18px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 "+(isDesktop?"0":"18px"),marginBottom:12}}>
            <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".09em",fontWeight:600}}>Continue Working</div>
          </div>
          <HScrollRow itemCount={inProgress.length}>{inProgress.map(p=><ShelfCard key={p.id} p={p} onClick={()=>openDetail(p)}/>)}</HScrollRow>
        </div>
      )}
      <div style={{padding:isDesktop?"16px 0 10px":"16px 18px 10px"}}>
        <div style={{display:"flex",alignItems:"center",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",gap:9}}>
          <span style={{color:T.ink3,fontSize:15}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your hive…" style={{border:"none",background:"transparent",flex:1,fontSize:14,color:T.ink,outline:"none"}} onFocus={e=>e.currentTarget.parentNode.style.borderColor=T.terra} onBlur={e=>e.currentTarget.parentNode.style.borderColor=T.border}/>
        </div>
      </div>
      <div style={{display:"flex",gap:7,overflowX:"auto",padding:isDesktop?"0 0 16px":"0 18px 16px",WebkitOverflowScrolling:"touch"}}>
        {CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?T.terra:T.card,color:cat===c?"#fff":T.ink2,border:"1.5px solid "+(cat===c?T.terra:T.border),borderRadius:99,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",flexShrink:0,boxShadow:cat===c?"0 2px 10px rgba(184,90,60,.28)":"none"}}>{c}</button>)}
      </div>
      {/* Counter + view toggle */}
      <div style={{padding:pad,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          {!isPro&&<div style={{fontSize:11,color:T.ink2,fontWeight:500}}>{tier.userCount} of {TIER_CONFIG.free.patternCap} free slots used{tier.userCount===0?" · add your first":tier.atCap?" · upgrade for unlimited":""}</div>}
        </div>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setViewMode("grid")} style={{background:viewMode==="grid"?T.linen:"transparent",border:`1px solid ${viewMode==="grid"?T.border:"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:T.ink3,lineHeight:1}}>▦</button>
          <button onClick={()=>setViewMode("list")} style={{background:viewMode==="list"?T.linen:"transparent",border:`1px solid ${viewMode==="list"?T.border:"transparent"}`,borderRadius:6,padding:"4px 6px",cursor:"pointer",fontSize:12,color:T.ink3,lineHeight:1}}>☰</button>
        </div>
      </div>
      {/* Unified grid */}
      {viewMode==="grid"?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,padding:isDesktop?"0 0 80px":"0 18px 120px"}}>
          {filteredAll.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.04} onClick={()=>openDetail(p)} onPark={onPark} onUnpark={onUnpark} onDelete={onDelete}/>)}
          {!isPro&&cat==="All"&&!search&&Array.from({length:emptySlots}).map((_,i)=><EmptySlotCard key={"slot_"+i} slotIndex={i} onClick={onAddPattern}/>)}
        </div>
      ):(
        <div style={{padding:isDesktop?"0 0 80px":"0 18px 120px",display:"flex",flexDirection:"column",gap:8}}>
          {filteredAll.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:T.ink3,fontSize:13}}>No patterns yet. Add your first!</div>}
          {filteredAll.map((p,i)=>(
            <div key={p.id} className="fu" onClick={()=>openDetail(p)} style={{display:"flex",gap:12,background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:10,cursor:"pointer",animationDelay:i*.04+"s",boxShadow:T.shadow}}>
              <div style={{width:56,height:56,borderRadius:10,overflow:"hidden",flexShrink:0,background:T.linen}}><Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:T.serif,fontSize:14,fontWeight:500,color:T.ink,lineHeight:1.3}}>{p.title}</div>
                <div style={{fontSize:11,color:T.ink3,marginTop:2}}>{p.cat}{pct(p)>0?" · "+pct(p)+"%":""}{p.isStarter?" · Free Starter":""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
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
    <span style={{fontSize:13,color:"#fff",fontWeight:500,lineHeight:1.4}}>Welcome to YarnHive! 🐝 Your starter patterns are ready — start exploring.</span>
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
              <div style={{fontSize:13,color:T.ink2,fontWeight:500}}>Text me updates from YarnHive</div>
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

export default function YarnHive() {
  const [authed,setAuthed]=useState(false),[isPro,setIsPro]=useState(false);
  const [authChecked,setAuthChecked]=useState(false);
  const [userPatterns,setUserPatterns]=useState([]);
  const [starterPatterns,setStarterPatterns]=useState(()=>makeStarterPatterns());
  const [view,setView]=useState("collection"),[selected,setSelected]=useState(null),[navOpen,setNavOpen]=useState(false),[addOpen,setAddOpen]=useState(false),[showPaywall,setShowPaywall]=useState(false),[cat,setCat]=useState("All"),[search,setSearch]=useState("");
  const [showEmailBanner,setShowEmailBanner]=useState(false);
  const [showWelcomeBanner,setShowWelcomeBanner]=useState(false);
  const [showWelcomeToast,setShowWelcomeToast]=useState(false);
  const [showProModal,setShowProModal]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [justCompletedOnboarding,setJustCompletedOnboarding]=useState(false);
  const [createdPattern,setCreatedPattern]=useState(null);
  const [readyPromptPattern,setReadyPromptPattern]=useState(null);
  const [deleteTarget,setDeleteTarget]=useState(null);
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

  const handleSignOut = async () => { await supabaseAuth.signOut(); setAuthed(false); setIsPro(false); setUserPatterns([]); };

  // FIX 1 — Browser back/forward navigation
  const setViewWithHistory = (v) => {
    if (v !== view) {
      history.pushState({view:v},"","");
      setView(v);
    }
  };
  useEffect(()=>{
    const handlePop = (e) => {
      if (e.state?.view) setView(e.state.view);
      else setView("collection");
    };
    window.addEventListener("popstate",handlePop);
    return ()=>window.removeEventListener("popstate",handlePop);
  },[]);

  // Starter patterns are hardcoded in DEFAULT_STARTERS — no DB fetch needed

  // Fetch user's saved patterns from Supabase on login
  useEffect(()=>{
    console.log("[YarnHive] Pattern fetch triggered, authed:", authed, "authChecked:", authChecked);
    if(!authed||!authChecked) return;
    const user=supabaseAuth.getUser();
    const session=getSession();
    console.log("[YarnHive] Pattern fetch user id:", user?.id);
    if(!user||!session) return;
    (async()=>{
      try{
        const res=await fetch(`${SUPABASE_URL}/rest/v1/patterns?user_id=eq.${user.id}&order=created_at.desc`,{
          headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`},
        });
        if(res.ok){
          const data=await res.json();
          console.log("[YarnHive] Pattern fetch raw response:", JSON.stringify(data));
          console.log("[YarnHive] Pattern fetch count:", data.length);
          if(data.length>0){
            const patterns=data.map(r=>({
              id:r.id,_supabaseId:r.id,title:r.title||"",cat:r.cat||"",source:r.source||"",source_url:r.source_url||"",
              notes:r.notes||"",photo:r.photo||r.image_url||"",hook:r.hook||r.hook_size||"",weight:r.weight||r.yarn_weight||"",
              yardage:r.yardage||0,materials:r.materials||[],rows:(r.rows||[]).map(row=>({...row,done:!!row.done})),
              rating:r.rating||0,skeins:r.skeins||0,skeinYards:r.skein_yards||200,
              gauge:r.gauge||{stitches:12,rows:16,size:4},dimensions:r.dimensions||{},
              isStarter:!!r.is_starter,is_ai_generated:!!r.is_ai_generated,difficulty:r.difficulty||"",tags:r.tags||[],started:r.status==="in_progress",
              source_file_url:r.source_file_url||"",source_file_name:r.source_file_name||"",source_file_type:r.source_file_type||"",
            }));
            setUserPatterns(prev=>{
              // Keep local-only patterns (starters, unsaved) that aren't in Supabase
              const supaIds=new Set(patterns.map(p=>p.id));
              const localOnly=prev.filter(p=>!supaIds.has(p.id)&&!supaIds.has(p._supabaseId));
              console.log("[YarnHive] Merge: Supabase patterns:", patterns.length, "local-only kept:", localOnly.length, localOnly.map(p=>p.title));
              return [...patterns,...localOnly];
            });
          }else{
            console.log("[YarnHive] No patterns in Supabase for this user, keeping local state as-is");
          }
        }else{
          const errText=await res.text();
          console.error("[YarnHive] Patterns fetch failed:", res.status, errText);
        }
      }catch(e){console.error("[YarnHive] Fetch patterns error:",e);}
    })();
  },[authed,authChecked]);

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
    setView("collection");
    setShowOnboarding(true);
    setShowWelcomeBanner(true);
    setTimeout(()=>{
      setShowWelcomeBanner(false);
      showEmailBannerIfNeeded();
    },4000);
  };

  const handleSignIn = () => {
    setAuthed(true);
    setView("collection");
    setShowWelcomeToast(true);
    setTimeout(()=>setShowWelcomeToast(false),3000);
    showEmailBannerIfNeeded();
  };

  // Show nothing until session is validated against Supabase
  if(!authChecked) return <><CSS/><div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spinner" style={{width:28,height:28,border:`3px solid ${T.border}`,borderTopColor:T.terra,borderRadius:"50%"}}/></div></>;
  if(!authed) return <><CSS/><WaitlistPopup/><Auth onEnter={handleSignIn} onEnterAsNew={handleNewSignup}/></>;
  const detailOnSave=u=>{
    setUserPatterns(prev=>prev.map(p=>p.id===u.id?u:p));setStarterPatterns(prev=>prev.map(p=>p.id===u.id?u:p));setSelected(u);
    const user=supabaseAuth.getUser();const session=getSession();
    const pid=u._supabaseId||u.id;
    if(user&&session&&typeof pid==="string"&&!pid.startsWith("local_")&&!pid.startsWith("onboard_")&&!pid.startsWith("starter_")){
      fetch(`${SUPABASE_URL}/rest/v1/patterns?id=eq.${pid}&user_id=eq.${user.id}`,{
        method:"PATCH",
        headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${session.access_token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
        body:JSON.stringify({rows:u.rows||[],row_count:(u.rows||[]).length,updated_at:new Date().toISOString(),source_file_url:u.source_file_url||null,source_file_name:u.source_file_name||null,source_file_type:u.source_file_type||null}),
      }).then(r=>{console.log("[YarnHive] Row progress PATCH status:",r.status,"for pattern:",pid);if(!r.ok)r.text().then(t=>console.error("[YarnHive] Row PATCH error body:",t));}).catch(e=>console.error("[YarnHive] Row progress save error:",e));
    }
  };
  const detailOnBack=()=>{if(history.state?.view)history.back();else setView("collection");};
  if(view==="detail"&&selected&&!isDesktop) return <><CSS/><Detail p={selected} onBack={detailOnBack} onSave={detailOnSave}/></>;

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
      }).catch(e=>console.error("[YarnHive] Start pattern error:",e));
    }
    setViewWithHistory("detail");
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
      setViewWithHistory("detail");
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
          body:JSON.stringify({user_id:user.id,title:p.title||"",cat:p.cat||"",source:p.source||"",source_url:p.source_url||"",notes:p.notes||"",difficulty:p.difficulty||"",yarn_weight:p.weight||"",hook_size:p.hook||"",gauge:p.gauge||{},tags:p.tags||[],is_ai_generated:!!p.is_ai_generated,is_starter:!!p.isStarter,image_url:p.image_url||"",photo:p.photo||"",row_count:(p.rows||[]).length,materials:p.materials||[],rows:p.rows||[],rating:p.rating||0,yardage:p.yardage||0,skeins:p.skeins||0,skein_yards:p.skeinYards||200,dimensions:p.dimensions||{},weight:p.weight||"",hook:p.hook||"",source_file_url:p.source_file_url||null,source_file_name:p.source_file_name||null,source_file_type:p.source_file_type||null,extracted_by_ai:!!p.extracted_by_ai,components:p.components||null}),
        });
        console.log("[YarnHive] INSERT response status:", res.status);
        if(res.ok){
          const rows=await res.json();
          console.log("[YarnHive] INSERT response body:", JSON.stringify(rows));
          if(rows[0]?.id){
            console.log("[YarnHive] Pattern saved with Supabase ID:", rows[0].id);
            // Update local state with Supabase ID
            setUserPatterns(prev=>prev.map(pat=>pat.id===localId?{...pat,id:rows[0].id,_supabaseId:rows[0].id}:pat));
            setCreatedPattern(prev=>prev&&prev.id===localId?{...prev,id:rows[0].id,_supabaseId:rows[0].id}:prev);
          }
        }else{const errText=await res.text();console.error("[YarnHive] Pattern save failed:",res.status,errText);}
      }catch(e){console.error("[YarnHive] Pattern save error:",e);}
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
      }).catch(e=>console.error("[YarnHive] Status update error:",e));
    }
  };
  const handleParkPattern=(p)=>updatePatternStatus(p,"parked");
  const handleUnparkPattern=(p)=>updatePatternStatus(p,"active");
  const handleDeletePattern=(p)=>setDeleteTarget(p);
  const confirmDelete=()=>{if(deleteTarget){updatePatternStatus(deleteTarget,"deleted");setDeleteTarget(null);}};
  const parkInsteadOfDelete=()=>{if(deleteTarget){updatePatternStatus(deleteTarget,"parked");setDeleteTarget(null);}};
  const inProgress=allPatterns.filter(p=>{const v=pct(p);return !p.isStarter&&p.status!=="deleted"&&p.status!=="parked"&&((p.status==="in_progress"&&v<100)||(p.started&&v<100)||(v>0&&v<100));});
  const TITLE_MAP={collection:"Your Hive",wip:"Builds in Progress",browse:"Browse Sites",stash:"Yarn Stash",calculator:"Calculators",shopping:"Shopping List",profile:"Profile & Settings"};

  if(isDesktop) return (
    <div style={{display:"flex",minHeight:"100vh",width:"100%",background:T.bg,fontFamily:T.sans,position:"relative"}}>
      <CSS/>
      {showOnboarding&&<OnboardingScreen onComplete={()=>{setShowOnboarding(false);setJustCompletedOnboarding(true);localStorage.removeItem("yh_welcome_dismissed");setView("profile");}} onBackToAuth={async()=>{setShowOnboarding(false);await supabaseAuth.signOut();setAuthed(false);setIsPro(false);setUserPatterns([]);}}/>}
      {showPaywall&&<PaywallGate patternCount={userPatterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {showProModal&&<ProInfoModal onClose={()=>setShowProModal(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={userPatterns.length}/>}
      {createdPattern&&<PatternCreatedOverlay pattern={createdPattern} onStartBuilding={()=>{const p=createdPattern;setCreatedPattern(null);startAndOpenPattern(p);}} onGoToHive={()=>{setCreatedPattern(null);setViewWithHistory("collection");}}/>}
      {readyPromptPattern&&<ReadyToBuildPrompt pattern={readyPromptPattern} onStartBuilding={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);startAndOpenPattern(p);}} onViewDetails={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);setSelected(p);setViewWithHistory("detail");}} onDismiss={()=>setReadyPromptPattern(null)}/>}
      {deleteTarget&&<DeleteConfirmModal pattern={deleteTarget} isPro={isPro} onCancel={()=>setDeleteTarget(null)} onDelete={confirmDelete} onPark={parkInsteadOfDelete} onGoPro={()=>{setDeleteTarget(null);setShowProModal(true);}}/>}
      <WelcomeToast visible={showWelcomeToast}/>
      <SidebarNav view={view} setView={setViewWithHistory} count={userPatterns.length} isPro={isPro} onAddPattern={openAddModal} onSignOut={handleSignOut} onUpgrade={()=>setShowProModal(true)} userPatterns={userPatterns} allPatterns={allPatterns}/>
      <div style={{flex:1,minWidth:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <WelcomeBanner visible={showWelcomeBanner}/>
        {showEmailBanner&&!showWelcomeBanner&&<EmailConfirmBanner onDismiss={handleDismissEmailBanner} onResend={handleResendEmail}/>}
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 40px",height:64,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
          <div style={{fontFamily:T.serif,fontSize:24,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"YarnHive"}</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isPro&&<div style={{background:T.sage,borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>✨ Pro</div>}
            <button onClick={openAddModal} style={{background:T.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>+</span> Add Pattern</button>
          </div>
        </div>
        <div style={{flex:1,padding:"0 40px"}}>
          {view==="collection"&&<CollectionView userPatterns={userPatterns} starterPatterns={starterPatterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier} setView={setViewWithHistory} onPark={handleParkPattern} onUnpark={handleUnparkPattern} onDelete={handleDeletePattern}/>}
          {view==="wip"&&<div style={{padding:"24px 0 80px"}}><button onClick={()=>setViewWithHistory("collection")} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:13,fontWeight:600,padding:0,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>← Back</button>{inProgress.length===0?<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:20,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:14,color:T.ink3}}>Open a pattern and start checking off rows.</div></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>{inProgress.map((p,i)=>{const v=pct(p),done=p.rows.filter(r=>r.done).length;return(<div key={p.id} className="card fu" onClick={()=>openDetail(p)} style={{background:T.card,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`,cursor:"pointer",animationDelay:i*.06+"s"}}><div style={{position:"relative",height:140,overflow:"hidden",background:T.linen}}><Photo src={p.photo} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(28,23,20,.5) 0%,transparent 55%)"}}/><div style={{position:"absolute",bottom:0,left:0,right:0}}><Bar val={v} color="rgba(255,255,255,.85)" h={4} bg="rgba(0,0,0,.2)"/></div>{p.isStarter&&<div style={{position:"absolute",top:8,left:8,background:"rgba(184,144,44,.9)",color:"#fff",fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:99}}>Free Starter</div>}</div><div style={{padding:"12px 14px 14px"}}><div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:3}}>{p.cat}</div><div style={{fontFamily:T.serif,fontSize:14,fontWeight:500,color:T.ink,lineHeight:1.3,marginBottom:6}}>{p.title}</div><div style={{fontSize:11,color:T.ink3,marginBottom:8}}>{done} of {p.rows.length} rows complete</div><button style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Continue →</button></div></div>);})}</div>}</div>}
          {view==="detail"&&selected&&<div style={{margin:"0 -40px"}}><Detail p={selected} onBack={detailOnBack} onSave={detailOnSave}/></div>}
          {view==="browse"&&<BrowseSitesView onSavePattern={handleAddPattern}/>}
          {view==="stash"&&<div style={{paddingTop:24}}><YarnStash/></div>}
          {view==="calculator"&&<div style={{paddingTop:24}}><Calculators/></div>}
          {view==="shopping"&&<div style={{paddingTop:24}}><ShoppingList/></div>}
          {view==="profile"&&<ProfileSettingsView isPro={isPro} onOpenProModal={()=>setShowProModal(true)} onGoHome={()=>setView("collection")} onEmailConfirmed={()=>setShowEmailBanner(false)}/>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:T.sans,background:T.bg,minHeight:"100vh",maxWidth:isTablet?680:430,margin:"0 auto",display:"flex",flexDirection:"column",position:"relative"}}>
      <CSS/>
      {showOnboarding&&<OnboardingScreen onComplete={()=>{setShowOnboarding(false);setJustCompletedOnboarding(true);localStorage.removeItem("yh_welcome_dismissed");setView("profile");}} onBackToAuth={async()=>{setShowOnboarding(false);await supabaseAuth.signOut();setAuthed(false);setIsPro(false);setUserPatterns([]);}}/>}
      <WelcomeToast visible={showWelcomeToast}/>
      <NavPanel open={navOpen} onClose={()=>setNavOpen(false)} view={view} setView={setViewWithHistory} count={userPatterns.length} isPro={isPro} onSignOut={handleSignOut} onUpgrade={()=>setShowProModal(true)}/>
      {showPaywall&&<PaywallGate patternCount={userPatterns.length} onClose={()=>setShowPaywall(false)} onUpgrade={()=>setShowPaywall(false)}/>}
      {showProModal&&<ProInfoModal onClose={()=>setShowProModal(false)}/>}
      {addOpen&&<AddPatternModal onClose={()=>setAddOpen(false)} onSave={handleAddPattern} isPro={isPro} patternCount={userPatterns.length}/>}
      {createdPattern&&<PatternCreatedOverlay pattern={createdPattern} onStartBuilding={()=>{const p=createdPattern;setCreatedPattern(null);startAndOpenPattern(p);}} onGoToHive={()=>{setCreatedPattern(null);setViewWithHistory("collection");}}/>}
      {readyPromptPattern&&<ReadyToBuildPrompt pattern={readyPromptPattern} onStartBuilding={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);startAndOpenPattern(p);}} onViewDetails={()=>{const p=readyPromptPattern;setReadyPromptPattern(null);setSelected(p);setViewWithHistory("detail");}} onDismiss={()=>setReadyPromptPattern(null)}/>}
      {deleteTarget&&<DeleteConfirmModal pattern={deleteTarget} isPro={isPro} onCancel={()=>setDeleteTarget(null)} onDelete={confirmDelete} onPark={parkInsteadOfDelete} onGoPro={()=>{setDeleteTarget(null);setShowProModal(true);}}/>}
      {showEmailBanner&&<EmailConfirmBanner onDismiss={handleDismissEmailBanner} onResend={handleResendEmail}/>}
      {showWelcomeBanner&&<WelcomeBanner onDismiss={()=>setShowWelcomeBanner(false)}/>}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 18px",height:56,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20,flexShrink:0}}>
        <button onClick={()=>setNavOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 8px 8px 0",display:"flex",flexDirection:"column",gap:5}}><div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/><div style={{width:15,height:1.5,background:T.ink,borderRadius:99}}/><div style={{width:22,height:1.5,background:T.ink,borderRadius:99}}/></button>
        <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>{TITLE_MAP[view]||"YarnHive"}</div>
        <button onClick={openAddModal} style={{background:T.terra,border:"none",borderRadius:9,width:34,height:34,cursor:"pointer",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(184,90,60,.4)"}}>+</button>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingBottom:100}}>
        {view==="collection"&&<CollectionView userPatterns={userPatterns} starterPatterns={starterPatterns} cat={cat} setCat={setCat} search={search} setSearch={setSearch} openDetail={openDetail} onAddPattern={openAddModal} isPro={isPro} tier={tier} setView={setViewWithHistory} onPark={handleParkPattern} onUnpark={handleUnparkPattern} onDelete={handleDeletePattern}/>}
        {view==="wip"&&<div style={{padding:"16px 18px 80px"}}>{inProgress.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:48,marginBottom:14}}>🪡</div><div style={{fontFamily:T.serif,fontSize:18,color:T.ink2,marginBottom:8}}>Nothing in progress</div><div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>Open a pattern and start checking off rows.</div></div>:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{inProgress.map((p,i)=><PatternCard key={p.id} p={p} delay={i*.06} onClick={()=>openDetail(p)}/>)}</div>}</div>}
        {view==="browse"&&<BrowseSitesView onSavePattern={handleAddPattern}/>}
        {view==="stash"&&<div style={{paddingTop:18}}><YarnStash/></div>}
        {view==="calculator"&&<div style={{paddingTop:18}}><Calculators/></div>}
        {view==="shopping"&&<div style={{paddingTop:18}}><ShoppingList/></div>}
        {view==="profile"&&<ProfileSettingsView isPro={isPro} onOpenProModal={()=>setShowProModal(true)} onGoHome={()=>setView("collection")} onEmailConfirmed={()=>setShowEmailBanner(false)}/>}
      </div>
      <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:30,pointerEvents:"none"}}>
        <button onClick={openAddModal} style={{background:`linear-gradient(135deg,${T.terra},#8B3A22)`,color:"#fff",border:"none",borderRadius:99,padding:"13px 26px",fontSize:14,fontWeight:700,cursor:"pointer",pointerEvents:"auto",boxShadow:"0 8px 28px rgba(184,90,60,.55)",display:"flex",alignItems:"center",gap:8,animation:"fabPulse 3s ease infinite"}}><span style={{fontSize:17}}>+</span> Add Pattern</button>
      </div>
    </div>
  );
}
