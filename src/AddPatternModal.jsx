import { useState, useRef, useEffect } from "react";
import { T, useBreakpoint, Field } from "./theme.jsx";
import { PILL } from "./constants.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseAuth, getSession } from "./supabase.js";
import { VALIDATION_PROMPT, BADGE, badgeForScore, CHECK_ICON } from "./StitchCheck.jsx";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// ─── CATEGORY IMAGES (for cover picker in PDF review) ─────────────────────
const CAT_IMG = {
  "Amigurumi":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405272/duiwkpuwzctq42zjox9x.png",
  "Blankets":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405430/u1evbmu4nccpiyg8fc7a.png",
  "Wearables":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405433/yrcitmgukrik0owg1typ.png",
  "Accessories":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405436/uq692cchkcsjowpgu2le.png",
  "Home Décor":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405438/moqrjnlupspgoxt9v4wb.png",
  "Uncategorized":"https://res.cloudinary.com/dmaupzhcx/image/upload/v1774405441/ggzvsrbeeetyiabs55sn.png",
};
const ALL_CAT_ENTRIES = Object.entries(CAT_IMG);

const uploadPatternFile = async (file, onProgress) => {
  const isPdf=file.type==="application/pdf"||file.name?.toLowerCase().endsWith(".pdf");
  if(onProgress) onProgress("uploading");
  try {
    if(isPdf){
      // PDFs → Supabase Storage (public bucket, no ACL issues)
      const session=getSession();
      const user=supabaseAuth.getUser();
      if(!session?.access_token||!user) throw new Error("Not authenticated");
      const filePath=`${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const res=await fetch(`${SUPABASE_URL}/storage/v1/object/pattern-files/${filePath}`,{
        method:"POST",
        headers:{"Authorization":`Bearer ${session.access_token}`,"Content-Type":file.type},
        body:file,
      });
      if(!res.ok) throw new Error("Supabase upload failed: "+res.status);
      const publicUrl=`${SUPABASE_URL}/storage/v1/object/public/pattern-files/${filePath}`;
      if(onProgress) onProgress("done");
      return { url: publicUrl, filename: file.name, type: file.type };
    } else {
      // Images → Cloudinary (transformations, CDN)
      const formData=new FormData();
      formData.append("file",file);
      formData.append("upload_preset","yarnhive_patterns");
      const res=await fetch("https://api.cloudinary.com/v1_1/dmaupzhcx/auto/upload",{method:"POST",body:formData});
      if(!res.ok) throw new Error("Upload failed: "+res.status);
      const data=await res.json();
      if(onProgress) onProgress("done");
      return { url: data.secure_url, filename: data.original_filename+"."+(data.format||"jpg"), type: file.type };
    }
  } catch (e) {
    if(onProgress) onProgress("error");
    console.error("[Wovely] File upload error:", e);
    return null;
  }
};

// Extract pattern data from PDF/image using Gemini
// Convert File to base64 (used for images only, not PDFs)
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Extract text from PDF using pdf.js — no image payload, works on any PDF size
const extractTextFromPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = res; script.onerror = rej;
            document.head.appendChild(script);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
        console.log("[Wovely] PDF loaded, pages:", pdf.numPages);
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(" ");
          fullText += `\n--- PAGE ${i} ---\n${pageText}`;
        }
        console.log("[Wovely] PDF text extracted, chars:", fullText.length);
        resolve(fullText);
      } catch (err) {
        console.error("[Wovely] pdf.js text extraction failed:", err);
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Render page 1 of PDF to canvas — local cover image, no Cloudinary plan required
const renderPDFCoverImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = res; script.onerror = rej;
            document.head.appendChild(script);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await window.pdfjsLib.getDocument({ data: typedArray }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        console.log("[Wovely] PDF page 1 rendered for cover, size:", dataUrl.length);
        resolve(dataUrl);
      } catch (err) {
        console.warn("[Wovely] PDF cover render failed:", err);
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
};

const extractPatternFromPDF = async (textOrBase64, filename, mimeType, isTextMode) => {
  console.log("[Wovely] Gemini extraction starting, mode:", isTextMode ? "text" : "base64", "mime:", mimeType);
  if (!GEMINI_API_KEY) { console.error("[Wovely] No Gemini API key"); throw new Error("Gemini API key not configured"); }

  const prompt = `You are a crochet pattern extraction specialist. You will analyze this pattern using a strict 4-step process. Return ONLY valid JSON with no markdown, no backticks, no explanation.

═══ STEP 1 — STRUCTURE ANALYSIS ═══
Before extracting anything, silently determine:
• Is this pattern round-based (worked in the round) or row-based (worked flat)? Or mixed per component?
• Does it contain an abbreviations table, legend, or definition section?
• Are there cross-references like "Repeat R32", "work same as Round 5", or "work into ch3 on R9"?
• Are there branching instructions by size, color variation, or optional sections?
• How many distinct components exist (e.g. body, head, arms, border)?
Use these answers to guide the remaining steps. Do not output this analysis — it is internal context only.

═══ STEP 2 — ABBREVIATIONS FIRST ═══
Extract the COMPLETE abbreviations map from any table, legend, glossary, or definition section BEFORE touching pattern instructions.
• Populate abbreviations_map as a flat key-value object: {"mr":"magic ring","sc":"single crochet","inc":"increase","dec":"invisible decrease","fpdc":"front post double crochet"}
• Include EVERY abbreviation defined in the pattern, even uncommon ones
• If the pattern defines no abbreviations, use standard crochet abbreviations found in the instructions: sc, dc, hdc, tr, sl st, ch, inc, dec, mr, fo, blo, flo, yo, pm, sm, sc2tog
• This map is your reference for all subsequent extraction — use it to interpret shorthand in round/row instructions

═══ STEP 3 — ROUND/ROW EXTRACTION ═══
Extract every round or row as its own entry. Apply these rules strictly:

LABEL PREFIX: Use 'RND' for rounds (worked in the round) or 'ROW' for rows (worked flat). Detect from context which applies per component.

EXPAND RANGES: For any instruction covering multiple rounds like 'RND 10-23: sc in each st (40)' or 'Rows 5-12: repeat Row 4', expand into individual entries: RND 10, RND 11, RND 12... each with the same instruction text. Never leave a range as a single row. Every round the user needs to complete must be its own checkable row.

EXPAND CROSS-REFERENCES INLINE: If a round says "Repeat R32" or "Work same as Round 5", look up what Round 5 / R32 actually says and output the FULL instruction text for that round. Never output "Repeat R32" as a row — always resolve the reference to the actual stitch instructions.

PRESERVE BRACKET NOTATION: Keep bracket/parenthetical repeats exactly as written in the pattern. Examples: "(sc, inc) x 6", "[dc5, (ch1, skip 1) x 3] x 10", "*(2 sc, inc)* repeat 6 times". Do not simplify or expand these — the app tracks them as sub-counters.

EXTRACT repeat_brackets: For each row/round, extract bracket repeat patterns into repeat_brackets array. Example: "Round 16: (6 sc, inc) x 2 -- 16 sts" produces repeat_brackets: [{"sequence":"6 sc, inc","count":2}]. Match patterns like (sequence) x N, [sequence] x N, *sequence* repeat N times. If no bracket repeats, set repeat_brackets: [].

OPEN-ENDED REPEATS: For instructions like "repeat rounds X-Y until desired length" or "work even for as many rounds as you want", extract the repeating block ONCE as individual rounds, then add a note in pattern_notes explaining the open-ended nature. Do not generate infinite rounds.

SIZE/COLOR BRANCHING: If the pattern offers multiple sizes or color variations, extract the primary/default version as the main rows. Note all variations (stitch count differences, alternate colors) in pattern_notes.

ACTION ITEMS: For mid-pattern instructions that are not stitch rows (examples: 'Place the eyes now', 'Begin stuffing', 'Change to Color B', 'See page 7 for details') — include these as rows with label 'NOTE' and set action_item: true.

NEVER SKIP ROUNDS: Even if consecutive rounds have identical instructions, each must be its own entry. A round that says "sc in each st around (40)" repeated 8 times means 8 separate row entries.

═══ STEP 4 — CONFIDENCE ═══
After extraction, assess quality:
• If fewer than 3 rounds/rows were extracted OR title is missing, set "confidence": "low"
• If all major sections were found and 10+ rounds extracted, set "confidence": "high"
• Otherwise set "confidence": "medium"

═══ OUTPUT FORMAT ═══
Return this exact JSON structure:
{"title":"string","designer":"string","source_url":null,"finished_size":"string","difficulty":"Beginner or Intermediate or Advanced","yarn_weight":"string","hook_size":"string","gauge":"string or null","confidence":"low or medium or high","materials":[{"name":"string","amount":"string","notes":"string"}],"abbreviations":[{"abbr":"string","meaning":"string"}],"abbreviations_map":{"mr":"magic ring","sc":"single crochet"},"suggested_resources":[{"label":"string","url":"string"}],"pattern_notes":"string","components":[{"name":"string","make_count":1,"independent":false,"rows":[{"id":"rnd-1","label":"RND 1","text":"full instruction text with all references resolved","stitch_count":null,"action_item":false,"repeat_brackets":[{"sequence":"string","count":2}]}]}],"assembly_notes":"string","image_description":"string"}

COMPONENT RULES:
• For components like 'FLIPPER (MAKE 2)', set make_count: 2. Default 1 if not specified.
• Set independent: true ONLY when the pattern explicitly says a component can be made separately — e.g. "make 2 separately", "work independently". Default false.
• After all construction components, extract assembly/finishing as a final component named 'ASSEMBLY & FINISHING' with label: 'STEP' and action_item: true for all rows.

PATTERN NOTES: Extract as a single string containing all special technique notes, tension guidance, construction tips, size variations, and open-ended repeat instructions.

SUGGESTED RESOURCES: Extract {label, url} objects from any "Tutorials", "Resources", or hyperlink sections. Default to [] if none found.

Be thorough — extract every component, every round, every material. Ensure the JSON is complete and valid. Do not truncate.`;

  // Text mode: send extracted text directly (PDFs) — tiny payload, fast, reliable
  // Base64 mode: send raw file data (images like jpg/png)
  const parts = isTextMode
    ? [{ text: prompt + "\n\nPATTERN TEXT:\n" + textOrBase64 }]
    : [{ text: prompt }, { inline_data: { mime_type: mimeType || "image/jpeg", data: textOrBase64 } }];

  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
  };

  console.log("[Wovely] Sending Gemini request, parts:", body.contents[0].parts.length, "model: gemini-2.5-flash");
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
    console.error("[Wovely] Gemini first attempt failed:", e.name === "AbortError" ? "timeout (90s)" : e.message);
    console.log("[Wovely] Retrying Gemini extraction...");
    await new Promise(r => setTimeout(r, 2000));
    try {
      res = await geminiCall("gemini-2.5-flash");
    } catch (e2) {
      console.error("[Wovely] Gemini retry also failed:", e2.message);
      console.log("[Wovely] Falling back to gemini-2.0-flash-lite...");
      res = await geminiCall("gemini-2.0-flash-lite");
    }
  }

  console.log("[Wovely] Gemini raw response status:", res.status);
  const rawText = await res.text();
  console.log("[Wovely] Gemini raw response body:", rawText.substring(0, 500));

  if (!res.ok) {
    console.error("[Wovely] Gemini API error:", res.status, rawText);
    // If 2.5 flash failed, try 1.5 flash
    if (res.status === 404 || res.status === 400) {
      console.log("[Wovely] Retrying with gemini-2.0-flash-lite...");
      const res2 = await geminiCall("gemini-2.0-flash-lite");
      console.log("[Wovely] Fallback response status:", res2.status);
      if (!res2.ok) {
        const err2 = await res2.text();
        console.error("[Wovely] Fallback also failed:", err2.substring(0, 300));
        throw new Error("Gemini extraction failed: " + res2.status);
      }
      const data2 = await res2.json();
      const text2 = data2.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned2 = text2.replace(/```json/g, "").replace(/```/g, "").trim();
      console.log("[Wovely] Fallback extracted text:", cleaned2.substring(0, 200));
      return JSON.parse(cleaned2);
    }
    throw new Error("Gemini extraction failed: " + res.status);
  }

  let data;
  try { data = JSON.parse(rawText); } catch (e) {
    console.error("[Wovely] Response is not valid JSON wrapper:", e);
    throw new Error("Invalid Gemini response format");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("[Wovely] Gemini extracted text length:", text.length);
  console.log("[Wovely] Gemini extracted text preview:", text.substring(0, 300));

  // Strip markdown fences thoroughly
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    console.log("[Wovely] Extraction successful:", parsed.title, "—", (parsed.components||[]).length, "components");
    return parsed;
  } catch (e) {
    console.error("[Wovely] JSON parse failed. Cleaned text:", cleaned.substring(0, 300));
    console.error("[Wovely] Parse error:", e.message);
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
    rows.push({ id: "header-" + (comp.name || rowId).toLowerCase().replace(/\s+/g, "-"), text: "── " + label.toUpperCase() + " ──", isHeader: true, done: false, note: "", componentName: comp.name, makeCount, independent: !!comp.independent });
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

const HiveVisionForm = ({onSave,Btn,Bar,WireframeViewer}) => {
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

const ManualEntryForm = ({onSave,Btn}) => {
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

const URLImportForm = ({onSave,Btn,Photo}) => {
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

const PDFUploadForm = ({onSave,Btn,isPro,onUpgrade}) => {
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
  const [coverTab,setCoverTab]=useState("photo");
  const [coverUrl,setCoverUrl]=useState(null);
  const [coverFailed,setCoverFailed]=useState(false);
  const [coverUploading,setCoverUploading]=useState(false);
  const [complexity,setComplexity]=useState(null); // null | "simple" | "detailed" | "complex"
  const [complexityStats,setComplexityStats]=useState(null); // {pages, textLen}
  const [validationFlags,setValidationFlags]=useState([]);
  const [flagsDismissed,setFlagsDismissed]=useState(false);
  const [validationReport,setValidationReport]=useState(null); // Stitch Check result
  const [validating,setValidating]=useState(false);
  const [showFullReport,setShowFullReport]=useState(false);
  const coverFileRef=useRef(null);
  const handleFile=async(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    // Size check before anything
    if(f.size>10*1024*1024){setStage("error");setErrorMsg("Pattern file is too large for automatic reading (max 10MB). Try a smaller file.");return;}
    try{
      const fileMime=f.type||"application/pdf";
      const isPDF=fileMime==="application/pdf"||f.name.toLowerCase().endsWith(".pdf");
      console.log("[Wovely] File:", f.name, f.type, (f.size/1024).toFixed(0)+"KB", "isPDF:", isPDF);
      // Stage 1: Upload to Cloudinary + render cover (parallel)
      setStage("uploading");setStageText("Uploading your pattern...");setProgress(10);
      const intv1=setInterval(()=>setProgress(p=>Math.min(p+3,30)),200);
      // Run upload and cover render in parallel
      const [uploaded, pdfCoverDataUrl] = await Promise.all([
        uploadPatternFile(f),
        isPDF ? renderPDFCoverImage(f) : Promise.resolve(null)
      ]);
      clearInterval(intv1);
      if(!uploaded){setStage("error");setErrorMsg("Upload failed — check your connection and try again.");return;}
      // Upload PDF cover image to Cloudinary using yarnhive_patterns preset
      let coverCloudinaryUrl=null;
      if(pdfCoverDataUrl){
        console.log("[Wovely] PDF cover dataUrl length:", pdfCoverDataUrl.length, "starts:", pdfCoverDataUrl.substring(0,40));
        try{
          const coverFd=new FormData();
          coverFd.append("file", pdfCoverDataUrl);
          coverFd.append("upload_preset","yarnhive_patterns");
          coverFd.append("folder","covers");
          const coverRes=await fetch("https://api.cloudinary.com/v1_1/dmaupzhcx/image/upload",{method:"POST",body:coverFd});
          if(coverRes.ok){const cd=await coverRes.json();coverCloudinaryUrl=cd.secure_url;console.log("[Wovely] PDF cover uploaded:",coverCloudinaryUrl);}
          else{const errBody=await coverRes.text().catch(()=>"");console.warn("[Wovely] Cover upload failed:",coverRes.status,errBody);}
        }catch(e){console.warn("[Wovely] Cover upload failed:",e);}
      } else {
        console.warn("[Wovely] renderPDFCoverImage returned null — canvas render likely failed");
      }
      setFileInfo({url:uploaded.url,name:uploaded.filename,type:uploaded.type,coverUrl:coverCloudinaryUrl});setProgress(33);
      // Stage 2: Extract — text mode for PDFs (fast), base64 for images
      setStage("extracting");setStageText("Reading your pattern...");
      const intv2=setInterval(()=>setProgress(p=>Math.min(p+1,62)),300);
      let result;let extractedText=null;
      try{
        if(isPDF){
          console.log("[Wovely] Using pdf.js text extraction for PDF...");
          const pdfText=await extractTextFromPDF(f);extractedText=pdfText;
          // Detect complexity from page count + text density
          const pageMatches=(pdfText.match(/--- PAGE \d+ ---/g)||[]).length;
          const textLen=pdfText.replace(/--- PAGE \d+ ---/g,"").replace(/\s+/g," ").trim().length;
          const avgTextPerPage=pageMatches>0?textLen/pageMatches:textLen;
          let lvl="simple";
          if(pageMatches>=20||avgTextPerPage<200) lvl="complex";
          else if(pageMatches>=8||avgTextPerPage<500) lvl="detailed";
          console.log("[Wovely] Complexity:",lvl,"pages:",pageMatches,"avgText/page:",Math.round(avgTextPerPage));
          setComplexity(lvl);setComplexityStats({pages:pageMatches,textLen});
          result=await extractPatternFromPDF(pdfText,f.name,fileMime,true);
        } else {
          console.log("[Wovely] Using base64 extraction for image...");
          const base64Data=await fileToBase64(f);
          result=await extractPatternFromPDF(base64Data,f.name,fileMime,false);
        }
      }
      catch(ex){clearInterval(intv2);console.error("[Wovely] Extraction failed:",ex);setStage("error");setErrorMsg("We couldn't read this pattern automatically.");setExtracted({title:f.name.replace(/\.(pdf|jpg|png|jpeg)$/i,"").replace(/[-_]/g," "),components:[],materials:[],pattern_notes:"",hook_size:"",yarn_weight:"",designer:"",difficulty:"",assembly_notes:""});return;}
      clearInterval(intv2);setProgress(66);
      setStage("building");setStageText("Building your workspace...");
      await new Promise(r=>setTimeout(r,600));setProgress(100);
      setExtracted(result);setEditTitle(result.title||"");setEditDesigner(result.designer||"");setEditHook(result.hook_size||"");setEditWeight(result.yarn_weight||"");
      // Import failsafe: lightweight validation flags
      const allRows=(result.components||[]).flatMap(c=>(c.rows||[]));
      const flags=[];
      if(allRows.length<3) flags.push("Fewer than 3 rows extracted");
      const rndNums=allRows.map(r=>{const m=(r.label||"").match(/\d+/);return m?parseInt(m[0]):null;}).filter(Boolean);
      for(let i=1;i<rndNums.length;i++){if(rndNums[i]-rndNums[i-1]>2) flags.push("Gap detected between round "+rndNums[i-1]+" and "+rndNums[i]);}
      if(complexityStats&&complexityStats.pages>=5&&allRows.length<10) flags.push("Only "+allRows.length+" rows from a "+complexityStats.pages+"-page pattern");
      setValidationFlags(flags);
      // Pro users: run Stitch Check in background (non-blocking)
      if(isPro&&extractedText){
        setValidating(true);
        (async()=>{
          try{
            const controller=new AbortController();
            const timeout=setTimeout(()=>controller.abort(),90000);
            const vr=await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,{
              method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({contents:[{parts:[{text:VALIDATION_PROMPT+"\n\nPATTERN TEXT:\n"+extractedText}]}],generationConfig:{temperature:0.1,maxOutputTokens:65536}}),
              signal:controller.signal,
            });
            clearTimeout(timeout);
            const rawText=await vr.text();
            if(vr.ok){const d=JSON.parse(rawText);const raw=d.candidates?.[0]?.content?.parts?.[0]?.text||"";const parsed=JSON.parse(raw.replace(/```json/g,"").replace(/```/g,"").trim());setValidationReport(parsed);}
          }catch(e){console.warn("[Wovely] Stitch Check background validation failed:",e);}
          setValidating(false);
        })();
      }
      await new Promise(r=>setTimeout(r,400));setStage("review");
    }catch(ex){console.error("[Wovely] PDF import error:",ex);setStage("error");setErrorMsg("Something went wrong. Try again or use manual entry.");}
  };
  const handleSave=()=>{
    const rows=buildRowsFromComponents(extracted.components);
    const mats=(extracted.materials||[]).map((m,i)=>({id:i+1,name:m.name||"",amount:m.amount||"",yardage:0,notes:m.notes||""}));
    const finalCover=coverUrl||fileInfo?.coverUrl||null;
    onSave({id:Date.now(),title:editTitle||"Imported Pattern",source:editDesigner||"PDF Import",cat:"Uncategorized",hook:editHook||"",weight:editWeight||"",notes:extracted.pattern_notes||"",yardage:0,rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials:mats,rows,photo:finalCover||PILL[Math.floor(Math.random()*PILL.length)],cover_image_url:finalCover,source_file_url:fileInfo?.url||"",source_file_name:fileInfo?.name||"",source_file_type:fileInfo?.type||"",extracted_by_ai:true,components:extracted.components||[],assembly_notes:extracted.assembly_notes||"",difficulty:extracted.difficulty||"",abbreviations_map:extracted.abbreviations_map||{},suggested_resources:extracted.suggested_resources||[],validation_flags:validationFlags.length>0?validationFlags:null,validation_report:validationReport||null});
  };
  const handleFallbackSave=()=>{onSave({id:Date.now(),title:extracted?.title||"Imported Pattern",source:"PDF Import",cat:"Uncategorized",hook:"",weight:"",notes:"",yardage:0,rating:0,skeins:0,skeinYards:200,gauge:{stitches:12,rows:16,size:4},dimensions:{width:50,height:60},materials:[],rows:[],photo:fileInfo?.coverUrl||PILL[Math.floor(Math.random()*PILL.length)],cover_image_url:fileInfo?.coverUrl||null,source_file_url:fileInfo?.url||"",source_file_name:fileInfo?.name||"",source_file_type:fileInfo?.type||""});};
  if(stage==="pick") return (
    <div style={{paddingBottom:8}}>
      <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:14}}>Upload your pattern — PDF or photo. We'll read it and set up your workspace.</div>
      <label style={{display:"block",cursor:"pointer"}}><div style={{border:`2px dashed ${T.border}`,borderRadius:16,padding:"36px 20px",textAlign:"center",background:T.linen,transition:"border-color .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.terra} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}><div style={{fontSize:40,marginBottom:10}}>📄</div><div style={{fontFamily:T.serif,fontSize:17,color:T.ink,marginBottom:6}}>Upload your pattern</div><div style={{fontSize:13,color:T.ink3,marginBottom:14}}>PDF or photo — we'll read it and set up your workspace</div><div style={{background:T.terra,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,display:"inline-block"}}>Choose File</div></div><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{display:"none"}}/></label>
    </div>
  );
  // Complexity-aware loading messages
  const complexityMsg = complexity==="complex"
    ? {emoji:"🐝🐝🐝", headline:"Big pattern. Our bees are going all in.", sub:`${complexityStats?.pages||"Many"} pages of pure craft. Every round, every stitch, every note. Grab your hook — this might take a minute.`, barSpeed:80}
    : complexity==="detailed"
    ? {emoji:"🐝🐝", headline:"This one's detailed.", sub:`Reading carefully through ${complexityStats?.pages||"all"} pages. Hang tight — about 30–60 seconds.`, barSpeed:200}
    : {emoji:"🔎", headline:stageText, sub:null, barSpeed:300};
  const loadingInfo = (stage==="extracting"&&complexity) ? complexityMsg : {emoji:stage==="building"?"✓":"🔎", headline:stageText, sub:null, barSpeed:300};
  if(stage==="uploading"||stage==="extracting"||stage==="building") return (
    <div style={{padding:"40px 0 32px",textAlign:"center"}}>
      <div style={{fontSize:stage==="extracting"&&complexity==="complex"?44:36,marginBottom:14,transition:"font-size .3s"}}>{loadingInfo.emoji}</div>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:8,lineHeight:1.4}}>{loadingInfo.headline}</div>
      {loadingInfo.sub&&(
        <div style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:20,maxWidth:280,margin:"0 auto 20px",padding:"0 8px"}}>
          {loadingInfo.sub}
        </div>
      )}
      {!loadingInfo.sub&&stage==="extracting"&&<div style={{fontSize:12,color:T.ink3,marginBottom:16}}>Reading your pattern...</div>}
      <div style={{height:8,background:T.linen,borderRadius:99,overflow:"hidden",margin:"0 auto",maxWidth:300}}><div className={stage==="extracting"?"progress-bar-fill":""} style={{height:"100%",width:progress+"%",background:stage==="building"?T.sage:T.terra,borderRadius:99,transition:`width ${stage==="extracting"&&complexity==="complex"?"1.2s":"0.4s"} ease`}}/></div>
      {stage==="extracting"&&complexity==="complex"&&(
        <div style={{marginTop:16,fontSize:11,color:T.ink3,letterSpacing:".05em"}}>WORKING HARD 🍯</div>
      )}
    </div>
  );
  if(stage==="error") return (
    <div style={{padding:"24px 0"}}>
      <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>🐝</div>
      <div style={{fontFamily:T.serif,fontSize:17,color:T.ink,textAlign:"center",marginBottom:6}}>This one stumped us</div>
      <div style={{fontSize:13,color:T.ink2,textAlign:"center",lineHeight:1.7,marginBottom:20}}>
        {fileInfo ? "We saved your file. Tap below to start building — your PDF will be right there as you go." : "We had trouble reading this pattern. Try another file or enter your rows manually."}
      </div>
      {fileInfo&&(
        <div style={{background:T.sageLt,borderRadius:14,padding:"16px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>📎</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:T.sage,marginBottom:2}}>Pattern saved with file attached</div>
            <div style={{fontSize:12,color:T.ink2}}>You can view it anytime while building your rows</div>
          </div>
        </div>
      )}
      {fileInfo&&<Btn onClick={handleFallbackSave}>Start building — view PDF as I go</Btn>}
      <div style={{marginTop:8}}><Btn variant="ghost" onClick={()=>{setStage("pick");setProgress(0);setErrorMsg("");setComplexity(null);setComplexityStats(null);}}>Try a different file</Btn></div>
    </div>
  );
  const totalRows=(extracted?.components||[]).reduce((s,c)=>(s+(c.rows||[]).length),0);
  return (
    <div style={{paddingBottom:8}}>
      <div style={{background:T.sageLt,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>✓</span><span style={{fontSize:13,color:T.sage,fontWeight:600}}>We read your pattern — does this look right?</span></div>
      {/* Two-column: Cover image (left) + Stitch Check (right) */}
      <div style={{display:"flex",gap:14,marginBottom:16,alignItems:"stretch"}}>
        {/* Left: cover image + buttons */}
        <div style={{width:130,flexShrink:0}}>
          <div style={{fontSize:11,color:T.ink2,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Cover</div>
          {coverUrl&&<div style={{marginBottom:8,borderRadius:10,overflow:"hidden",border:`2px solid ${T.terra}`,width:120,height:120}}><img src={coverUrl} alt="Cover" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/></div>}
          {!coverUrl&&fileInfo?.coverUrl&&!coverFailed&&<div style={{marginBottom:8,borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`,width:120,height:120}}><img src={fileInfo.coverUrl} alt="PDF cover" onError={()=>setCoverFailed(true)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/></div>}
          {!coverUrl&&coverFailed&&<div style={{marginBottom:8,width:120,height:120,borderRadius:10,background:T.linen,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:11,color:T.ink3,textAlign:"center",padding:8}}>No preview</span></div>}
          <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap"}}>
            {["photo","library"].map(t=>(
              <button key={t} onClick={()=>setCoverTab(t)} style={{background:coverTab===t?T.terra:"transparent",color:coverTab===t?"#fff":T.ink3,border:`1px solid ${coverTab===t?T.terra:T.border}`,borderRadius:6,padding:"4px 8px",fontSize:10,fontWeight:coverTab===t?600:400,cursor:"pointer"}}>{t==="photo"?"📷 Photo":"🖼️ Library"}</button>
            ))}
          </div>
          {coverTab==="photo"&&<>
            <input ref={coverFileRef} type="file" accept="image/*" capture="environment" onChange={async(e)=>{
              const f=e.target.files?.[0];if(!f)return;
              setCoverUploading(true);
              const fd=new FormData();fd.append("file",f);fd.append("upload_preset","yarnhive_patterns");fd.append("transformation","c_fill,g_auto,ar_16:9");
              try{const res=await fetch("https://api.cloudinary.com/v1_1/dmaupzhcx/image/upload",{method:"POST",body:fd});if(res.ok){const d=await res.json();setCoverUrl(d.secure_url);}}catch{}
              setCoverUploading(false);
            }} style={{display:"none"}}/>
            <button onClick={()=>coverFileRef.current?.click()} disabled={coverUploading} style={{background:T.linen,border:`1px dashed ${T.terra}`,borderRadius:6,padding:"6px 8px",cursor:"pointer",width:"100%",fontSize:10,color:T.terra,fontWeight:500}}>{coverUploading?"Uploading...":"Choose Photo"}</button>
          </>}
          {coverTab==="library"&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {ALL_CAT_ENTRIES.map(([cat,url])=>(
              <div key={cat} onClick={()=>setCoverUrl(url)} style={{width:36,height:36,borderRadius:6,overflow:"hidden",cursor:"pointer",border:coverUrl===url?`2px solid ${T.terra}`:`1px solid ${T.border}`,flexShrink:0}}>
                <img src={url} alt={cat} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              </div>
            ))}
          </div>}
        </div>
        {/* Right: Stitch Check banner */}
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {isPro?(
            validating?(
              <div style={{flex:1,background:T.linen,borderRadius:12,padding:"16px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:28,animation:"pulse 1.5s ease infinite"}}>🧶</div>
                <div style={{fontSize:13,fontWeight:600,color:T.ink,textAlign:"center"}}>Analyzing pattern structure...</div>
                <div style={{fontSize:11,color:T.ink3,textAlign:"center",lineHeight:1.5}}>Checking stitch counts, round sequence, and cross-references</div>
                <div style={{width:"80%",height:4,background:T.border,borderRadius:99,overflow:"hidden",marginTop:4}}>
                  <div className="progress-bar-fill" style={{height:"100%",width:"60%",borderRadius:99}}/>
                </div>
              </div>
            ):validationReport?(
              <div style={{flex:1,background:badgeForScore(validationReport.score).bg,border:`1.5px solid ${badgeForScore(validationReport.score).color}`,borderRadius:12,padding:"16px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:20}}>{badgeForScore(validationReport.score).emoji}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:badgeForScore(validationReport.score).color}}>{badgeForScore(validationReport.score).label}</div>
                    <div style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:badgeForScore(validationReport.score).color,lineHeight:1}}>{validationReport.score}%</div>
                  </div>
                </div>
                {validationReport.checks?.find(c=>c.status!=="pass")&&<div style={{fontSize:11,color:T.ink2,lineHeight:1.5,marginBottom:8}}>{validationReport.checks.find(c=>c.status!=="pass")?.detail}</div>}
                <button onClick={()=>setShowFullReport(true)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:12,fontWeight:600,padding:0,textDecoration:"underline",textAlign:"left"}}>View Full Report →</button>
              </div>
            ):(
              <div style={{flex:1,background:T.linen,borderRadius:12,padding:"16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.ink3,border:`1px solid ${T.border}`}}>Stitch Check unavailable</div>
            )
          ):(
            <div style={{flex:1,background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:12,padding:"16px",border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:14}}>🔒</span><span style={{fontSize:13,fontWeight:600,color:T.ink}}>Stitch Check</span></div>
              <div style={{fontSize:11,color:T.ink2,lineHeight:1.5,marginBottom:10}}>Analyze for math errors and inconsistencies before you start crocheting.</div>
              <button onClick={onUpgrade} style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:11,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 12px rgba(184,90,60,.3)"}}>Upgrade to Pro</button>
            </div>
          )}
        </div>
      </div>
      {/* Full Stitch Check report overlay */}
      {showFullReport&&validationReport&&(
        <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={()=>setShowFullReport(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"relative",zIndex:1,background:T.surface,borderRadius:20,width:"100%",maxWidth:480,maxHeight:"85vh",overflow:"auto",padding:"24px 22px 32px"}}>
            <button onClick={()=>setShowFullReport(false)} style={{position:"absolute",top:14,right:16,background:T.linen,border:"none",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:16}}>Stitch Check Report</div>
            <div style={{background:badgeForScore(validationReport.score).bg,border:`2px solid ${badgeForScore(validationReport.score).color}`,borderRadius:14,padding:"16px",marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:4}}>{badgeForScore(validationReport.score).emoji}</div>
              <div style={{fontFamily:T.serif,fontSize:18,fontWeight:700,color:badgeForScore(validationReport.score).color}}>{badgeForScore(validationReport.score).label}</div>
              <div style={{fontFamily:T.serif,fontSize:36,fontWeight:700,color:badgeForScore(validationReport.score).color,lineHeight:1}}>{validationReport.score}%</div>
            </div>
            {(validationReport.checks||[]).map(c=>(
              <div key={c.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",marginBottom:6,display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{fontSize:14,flexShrink:0}}>{CHECK_ICON[c.status]||"❓"}</span>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:T.ink,marginBottom:2}}>{c.label}</div><div style={{fontSize:11,color:T.ink2,lineHeight:1.5}}>{c.detail}</div></div>
              </div>
            ))}
            {validationReport.summary&&<div style={{background:T.linen,borderRadius:12,padding:"12px 14px",marginTop:10,border:`1px solid ${T.border}`}}><div style={{fontSize:11,fontWeight:700,color:T.terra,marginBottom:4}}>Bev says:</div><div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>{validationReport.summary}</div></div>}
            <button onClick={()=>setShowFullReport(false)} style={{marginTop:14,width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(184,90,60,.3)"}}>Import Anyway →</button>
          </div>
        </div>
      )}
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

const BrowserImport = ({onSave,Btn,Photo}) => {
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

const AddPatternModal = ({onClose,onSave,isPro,patternCount,Btn,Photo,Bar,WireframeViewer,onUpgrade}) => {
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
          {method==="manual"&&<ManualEntryForm onSave={handleSave} Btn={Btn}/>}
          {method==="url"&&<URLImportForm onSave={handleSave} Btn={Btn} Photo={Photo}/>}
          {method==="pdf"&&<PDFUploadForm onSave={handleSave} Btn={Btn} isPro={isPro} onUpgrade={()=>{if(onUpgrade){dismiss();onUpgrade();}}}/>}
          {method==="browser"&&<BrowserImport onSave={handleSave} Btn={Btn} Photo={Photo}/>}
          {method==="snap"&&<HiveVisionForm onSave={handleSave} Btn={Btn} Bar={Bar} WireframeViewer={WireframeViewer}/>}
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
          {method==="manual"&&<ManualEntryForm onSave={handleSave} Btn={Btn}/>}
          {method==="url"&&<URLImportForm onSave={handleSave} Btn={Btn} Photo={Photo}/>}
          {method==="pdf"&&<PDFUploadForm onSave={handleSave} Btn={Btn} isPro={isPro} onUpgrade={()=>{if(onUpgrade){dismiss();onUpgrade();}}}/>}
          {method==="browser"&&<BrowserImport onSave={handleSave} Btn={Btn} Photo={Photo}/>}
          {method==="snap"&&<HiveVisionForm onSave={handleSave} Btn={Btn} Bar={Bar} WireframeViewer={WireframeViewer}/>}
        </div>
      </div>
    </div>
  );
};

export { uploadPatternFile, buildRowsFromComponents };
export default AddPatternModal;
