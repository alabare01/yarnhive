import { useState, useRef, useCallback } from "react";
import { T, useBreakpoint } from "./theme.jsx";
import { PILL } from "./constants.js";
import { buildRowsFromComponents } from "./AddPatternModal.jsx";
import { CHECK_ICON } from "./StitchCheck.jsx";
import BevGauge, { deriveState, sentenceCase, checkTier, NEEDLE_END } from "./components/BevGauge.jsx";


const MAX_DIM = 1200;
const JPEG_QUALITY = 0.75;

const compressImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    let w = img.width, h = img.height;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
      else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
    }
    const cvs = document.createElement("canvas");
    cvs.width = w; cvs.height = h;
    cvs.getContext("2d").drawImage(img, 0, 0, w, h);
    const dataUrl = cvs.toDataURL("image/jpeg", JPEG_QUALITY);
    const raw = dataUrl.split(",")[1];
    const compressedKB = Math.round(raw.length * 3 / 4 / 1024);
    console.log(`[ImageImport] ${file.name}: ${Math.round(file.size / 1024)}KB -> ~${compressedKB}KB (${w}x${h})`);
    resolve({ base64: raw, thumb: dataUrl });
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image: " + file.name)); };
  img.src = url;
});

const LOADING_MSGS = [
  "Reading your images...",
  "Identifying pattern structure...",
  "Extracting rounds and materials...",
  "Almost there...",
];

const ImageImportModal = ({ onClose, onPatternSaved, userId, isPro, minimized, onMinimize, onExpand }) => {
  const [items, setItems] = useState([]); // [{file, thumb, base64}]
  const [stage, setStage] = useState("pick");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesigner, setEditDesigner] = useState("");
  const [editHook, setEditHook] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [closing, setClosing] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationReport, setValidationReport] = useState(null);
  const [bevCheckFailed, setBevCheckFailed] = useState(false);
  const bevCheckTextRef = useRef(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [proUpgradeBanner, setProUpgradeBanner] = useState(false);
  const [coverUrl, setCoverUrl] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const coverFileRef = useRef(null);
  const { isDesktop } = useBreakpoint();

  const dismiss = () => { setClosing(true); setTimeout(() => { setClosing(false); onClose(); }, 220); };
  const backdropDismiss = () => { if (!validationReport && !bevCheckFailed) dismiss(); };

  const handleFiles = async (fileList) => {
    const arr = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    const results = await Promise.all(arr.map(async (f) => {
      const { base64, thumb } = await compressImage(f);
      return { file: f, thumb, base64 };
    }));
    setItems(prev => [...prev, ...results]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.style.borderColor = T.border;
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) dropRef.current.style.borderColor = "#9B7EC8";
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (dropRef.current) dropRef.current.style.borderColor = T.border;
  };

  // Reorder drag handlers for thumbnails
  const onThumbDragStart = useCallback((e, i) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = "move";
  }, []);
  const onThumbDragOver = useCallback((e, i) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx === null || dragIdx === i) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragIdx(i);
  }, [dragIdx]);
  const onThumbDragEnd = useCallback(() => { setDragIdx(null); }, []);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setStage("loading");
    setLoadingMsg(LOADING_MSGS[0]);

    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIdx]);
    }, 3000);

    try {
      const res = await fetch("/api/extract-pattern-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: items.map(it => it.base64),
          pageCount: items.length,
          fileName: items[0].file.name,
        }),
      });

      clearInterval(msgInterval);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Server extraction failed: " + res.status);
      }

      const result = await res.json();
      setExtracted(result);
      setEditTitle(result.title || "");
      setEditDesigner(result.designer || "");
      setEditHook(result.hook_size || "");
      setEditWeight(result.yarn_weight || "");
      setStage("review");
      // Run BevCheck in background (non-blocking)
      {
        setValidating(true);
        const valText = JSON.stringify(result, null, 2);
        const trimmed = valText.length > 20000 ? valText.slice(0, valText.lastIndexOf("\n", 20000) || 20000) : valText;
        bevCheckTextRef.current = trimmed;
        (async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 90000);
            const vr = await fetch("/api/extract-pattern", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "bevcheck", patternText: trimmed }), signal: controller.signal });
            clearTimeout(timeout);
            const data = await vr.json();
            if (vr.ok && !data.error) { setValidationReport(data); } else { console.warn("[ImageImport] BevCheck API error:", vr.status, data.message); setBevCheckFailed(true); }
          } catch (e) { console.warn("[ImageImport] BevCheck background validation failed:", e); setBevCheckFailed(true); }
          setValidating(false);
        })();
      }
    } catch (err) {
      clearInterval(msgInterval);
      console.error("[ImageImport] Extraction failed:", err);
      setErrorMsg(err.message || "We couldn't read this pattern from the photos.");
      setStage("error");
    }
  };

  const handleSave = () => {
    const rows = buildRowsFromComponents(extracted.components);
    const mats = (extracted.materials || []).map((m, i) => ({ id: i + 1, name: m.name || "", amount: m.amount || "", yardage: 0, notes: m.notes || "" }));
    onPatternSaved({
      id: Date.now(),
      title: editTitle || "Imported Pattern",
      source: editDesigner || "Photo Import",
      cat: "Uncategorized",
      hook: editHook || "",
      weight: editWeight || "",
      notes: extracted.pattern_notes || "",
      yardage: 0, rating: 0, skeins: 0, skeinYards: 200,
      gauge: { stitches: 12, rows: 16, size: 4 },
      dimensions: { width: 50, height: 60 },
      materials: mats,
      rows,
      photo: coverUrl || items[0]?.thumb || PILL[Math.floor(Math.random() * PILL.length)],
      cover_image_url: coverUrl || null,
      source_file_url: "",
      source_file_name: items[0]?.file.name || "",
      source_file_type: items[0]?.file.type || "",
      extracted_by_ai: true,
      components: extracted.components || [],
      assembly_notes: extracted.assembly_notes || "",
      difficulty: extracted.difficulty || "",
      abbreviations_map: extracted.abbreviations_map || {},
      suggested_resources: extracted.suggested_resources || [],
      validation_report: isPro && validationReport ? validationReport : null,
    });
    dismiss();
  };

  // ── PICK SCREEN ──
  const pickContent = (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: "#2D3A7C", marginBottom: 6 }}>Import from photos</div>
      <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7, marginBottom: 18 }}>
        Select one or more photos of your pattern — screenshots, scans, or photos all work
      </div>

      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${T.border}`, borderRadius: 16, padding: "36px 20px", textAlign: "center",
          background: T.linen, transition: "border-color .2s", cursor: "pointer",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
        <div style={{ fontFamily: T.serif, fontSize: 17, color: T.ink, marginBottom: 6 }}>Drop photos here</div>
        <div style={{ fontSize: 13, color: T.ink3, marginBottom: 14 }}>or tap below to choose</div>
        <div style={{
          background: "#9B7EC8", color: "#fff", borderRadius: 10, padding: "10px 20px",
          fontSize: 13, fontWeight: 600, display: "inline-block",
        }}>Choose photos</div>
      </div>
      <input
        ref={fileRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp" multiple
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
        style={{ display: "none" }}
      />

      {items.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink2 }}>
              {items.length} photo{items.length > 1 ? "s" : ""} selected
            </div>
            {items.length > 1 && (
              <div style={{ fontSize: 10, color: T.ink3 }}>Drag to set page order</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {items.map((it, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => onThumbDragStart(e, i)}
                onDragOver={(e) => onThumbDragOver(e, i)}
                onDragEnd={onThumbDragEnd}
                style={{
                  position: "relative", width: 72, cursor: "grab",
                  opacity: dragIdx === i ? 0.5 : 1, transition: "opacity .15s",
                }}
              >
                <img src={it.thumb} alt={`Page ${i + 1}`} style={{
                  width: 72, height: 72, borderRadius: 10, objectFit: "cover",
                  border: dragIdx === i ? `2px solid #9B7EC8` : `1px solid ${T.border}`,
                }} />
                <div style={{
                  position: "absolute", top: -6, left: -6, width: 20, height: 20, borderRadius: 99,
                  background: "#9B7EC8", color: "#fff", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                }}>{i + 1}</div>
                <div style={{
                  position: "absolute", top: 4, right: 4, fontSize: 12, color: "rgba(255,255,255,.9)",
                  textShadow: "0 1px 3px rgba(0,0,0,.5)", cursor: "grab", userSelect: "none",
                }}>⠿</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={items.length === 0}
        style={{
          width: "100%", marginTop: 18,
          background: items.length > 0 ? "#9B7EC8" : T.disabled,
          color: "#fff", border: "none", borderRadius: 99, padding: "14px",
          fontSize: 15, fontWeight: 600, cursor: items.length > 0 ? "pointer" : "not-allowed",
          boxShadow: items.length > 0 ? "0 4px 16px rgba(155,126,200,.3)" : "none",
          transition: "background .2s",
        }}
      >Extract pattern</button>

      <div style={{ fontSize: 11, color: T.ink3, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
        Works great with Apple Notes exports, screenshots, and scanned patterns
      </div>
    </div>
  );

  // ── LOADING SCREEN ──
  const loadingContent = (
    <div style={{ padding: "48px 20px 36px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative" }}>
      {onMinimize&&<button onClick={onMinimize} style={{position:"absolute",top:12,right:4,background:T.linen,border:"none",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>&times;</button>}
      <style>{`@keyframes spinLoaderVision{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes fadeInMsgV{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{position:"relative",width:60,height:60,marginBottom:24}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"4px solid transparent",borderTopColor:"#9B7EC8",animation:"spinLoaderVision 1s linear infinite"}}/>
        <img src="/bev_neutral.png" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:40,height:40,objectFit:"contain"}} alt="Bev"/>
      </div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 600, color: "#2D2D4E", marginBottom: 8, lineHeight: 1.4 }}>
        Extracting your pattern
      </div>
      <div key={loadingMsg} style={{
        fontSize: 13, fontFamily: "Inter,sans-serif", fontWeight: 400, color: "#9B7EC8",
        marginTop: 8, animation: "fadeInMsgV .4s ease both",
      }}>
        {loadingMsg}
      </div>
    </div>
  );

  // ── ERROR SCREEN ──
  const errorContent = (
    <div style={{ padding: "24px 0" }}>
      <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>📸</div>
      <div style={{ fontFamily: T.serif, fontSize: 17, color: T.ink, textAlign: "center", marginBottom: 6 }}>Couldn't read these photos</div>
      <div style={{ fontSize: 13, color: T.ink2, textAlign: "center", lineHeight: 1.7, marginBottom: 20 }}>
        {errorMsg || "We had trouble reading this pattern. Try clearer photos or fewer images."}
      </div>
      <button onClick={() => { setStage("pick"); setItems([]); setErrorMsg(""); }} style={{
        width: "100%", background: "#9B7EC8", color: "#fff", border: "none", borderRadius: 99,
        padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer",
      }}>Try again</button>
    </div>
  );

  // ── REVIEW SCREEN ──
  const totalRows = (extracted?.components || []).reduce((s, c) => (s + (c.rows || []).length), 0);
  const matList = extracted?.materials || [];
  const matSummary = matList.length > 3
    ? matList.slice(0, 2).map(m => m.name).join(", ") + " +" + (matList.length - 2) + " more"
    : matList.map(m => m.name).join(", ");

  const heroImg = coverUrl || (items[0]?.thumb) || null;
  const reviewContent = extracted ? (
    <div style={{paddingBottom:8,background:"#FFFFFF",margin:"-0px -22px -40px",padding:"0 22px 40px"}}>
      <input ref={coverFileRef} type="file" accept="image/*" onChange={async(e)=>{
        const f=e.target.files?.[0];if(!f)return;setCoverUploading(true);
        const fd=new FormData();fd.append("file",f);fd.append("upload_preset","yarnhive_patterns");fd.append("transformation","c_fill,g_auto,ar_16:9");
        try{const res=await fetch("https://api.cloudinary.com/v1_1/dmaupzhcx/image/upload",{method:"POST",body:fd});if(res.ok){const d=await res.json();setCoverUrl(d.secure_url);}}catch{}
        setCoverUploading(false);
      }} style={{display:"none"}}/>
      {/* ── HERO ZONE ── */}
      <div style={{position:"relative",height:200,margin:"0 -22px",overflow:"hidden",background:"#2D2D4E"}}>
        {heroImg&&<><img src={heroImg} alt="" style={{position:"absolute",width:"100%",height:"100%",objectFit:"cover",filter:"blur(20px) saturate(1.2) brightness(0.6)",transform:"scale(1.1)",pointerEvents:"none"}}/>
        <img src={heroImg} alt={editTitle} style={{position:"absolute",left:"50%",transform:"translateX(-50%)",height:"100%",width:"auto",objectFit:"contain",zIndex:1}}/></>}
        {!heroImg&&<div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${T.terra},#6B2A10)`}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(20,14,10,.85) 0%,rgba(20,14,10,.15) 60%)",zIndex:2}}/>
        <div style={{position:"absolute",bottom:16,left:22,right:80,zIndex:3}}>
          <div style={{fontFamily:T.serif,fontSize:22,fontWeight:700,color:"#fff",lineHeight:1.15,textShadow:"0 2px 8px rgba(0,0,0,.4)",marginBottom:4}}>{editTitle||"Untitled Pattern"}</div>
          {editDesigner&&<div style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>{editDesigner}</div>}
        </div>
        <button onClick={handleSave} style={{position:"absolute",top:14,right:22,zIndex:3,background:"rgba(255,255,255,.2)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.25)",borderRadius:99,padding:"7px 16px",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>Looks good ✓</button>
        <button onClick={()=>coverFileRef.current?.click()} style={{position:"absolute",top:14,left:22,zIndex:3,background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:99,padding:"5px 12px",color:"rgba(255,255,255,.8)",fontSize:11,cursor:"pointer"}}>📷 Change Cover</button>
      </div>
      {/* ── CONTENT ZONE: two columns ── */}
      <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
        {/* LEFT 58% — pattern details */}
        <div style={{ flex: "0 0 58%", minWidth: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: T.ink3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Pattern Title</div>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Pattern name" style={{
              width: "100%", padding: "6px 0", border: "none", borderBottom: "1px solid transparent",
              background: "transparent", fontSize: 16, fontWeight: 600, fontFamily: T.serif, color: T.ink, outline: "none",
            }} onFocus={e => e.target.style.borderBottomColor = T.terra} onBlur={e => e.target.style.borderBottomColor = "transparent"} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: T.ink3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Designer</div>
            <input value={editDesigner} onChange={e => setEditDesigner(e.target.value)} placeholder="Designer name" style={{
              width: "100%", padding: "6px 0", border: "none", borderBottom: "1px solid transparent",
              background: "transparent", fontSize: 13, color: T.ink2, outline: "none",
            }} onFocus={e => e.target.style.borderBottomColor = T.terra} onBlur={e => e.target.style.borderBottomColor = "transparent"} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {editHook && <span style={{ background: T.terraLt, color: T.terra, borderRadius: 99, padding: "4px 10px", fontSize: 10, fontWeight: 600 }}>Hook {editHook}</span>}
            {editWeight && <span style={{ background: T.sageLt, color: T.sage, borderRadius: 99, padding: "4px 10px", fontSize: 10, fontWeight: 600 }}>{editWeight}</span>}
            {totalRows > 0 && <span style={{ background: T.linen, color: T.ink2, borderRadius: 99, padding: "4px 10px", fontSize: 10, fontWeight: 500 }}>{totalRows} rows</span>}
          </div>
          {matList.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: T.ink3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>Materials</div>
              <span style={{ fontSize: 12, color: T.ink2 }}>{matSummary}</span>
            </div>
          )}
          {(extracted?.components || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: T.ink3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
                Components ({extracted.components.length})
              </div>
              {extracted.components.map((c, i) => (
                <div key={i} style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: "10px 14px", marginBottom: 6,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                    {c.name}{c.make_count > 1 ? " \u00d7 " + c.make_count : ""}
                    <span style={{ fontSize: 11, color: T.ink3, marginLeft: 8 }}>{(c.rows || []).length} rows</span>
                  </div>
                  {(c.rows || []).slice(0, 3).map((r, j) => (
                    <div key={j} style={{ fontSize: 11, color: T.ink2, lineHeight: 1.5, padding: "2px 0" }}>
                      {r.label}: {r.text?.substring(0, 60)}{r.text?.length > 60 ? "\u2026" : ""}
                    </div>
                  ))}
                  {(c.rows || []).length > 3 && <div style={{ fontSize: 10, color: T.ink3, marginTop: 4 }}>+{(c.rows || []).length - 3} more</div>}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* RIGHT 42% — BevCheck */}
        <div style={{flex:"0 0 42%",minWidth:0}}>
          {validating?(
            <div style={{background:T.card,borderRadius:16,padding:"36px 20px",boxShadow:T.shadowLg,display:"flex",flexDirection:"column",alignItems:"center",gap:16,animation:"scCardPulse 2s ease-in-out infinite"}}>
              <style>{`@keyframes scCardPulse{0%,100%{opacity:1}50%{opacity:.85}}@keyframes scRingSpin{0%{stroke-dashoffset:${Math.round(2*Math.PI*36)}}50%{stroke-dashoffset:0}100%{stroke-dashoffset:${Math.round(2*Math.PI*36)}}}`}</style>
              <div style={{position:"relative",width:80,height:80}}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{transform:"rotate(-90deg)"}}>
                  <circle cx="40" cy="40" r="36" fill="none" stroke={T.linen} strokeWidth="4"/>
                  <circle cx="40" cy="40" r="36" fill="none" stroke={T.terra} strokeWidth="4" strokeLinecap="round" strokeDasharray={Math.round(2*Math.PI*36)} style={{animation:"scRingSpin 2.5s ease-in-out infinite"}}/>
                </svg>
              </div>
              <div style={{fontSize:15,fontWeight:600,color:T.ink}}>Analyzing your pattern</div>
              <div style={{fontSize:12,color:T.sage,textAlign:"center",maxWidth:200,lineHeight:1.5}}>Checking stitch counts, round sequence and math errors before you start crocheting.</div>
            </div>
          ):bevCheckFailed?(
            <div style={{background:T.surface,borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(155,126,200,.08)",border:`1px solid ${T.border}`,textAlign:"center"}}>
              <div style={{fontSize:11,color:"#6B6B8A",marginBottom:10}}>Bev couldn't check this one — try again</div>
              <button onClick={()=>{setBevCheckFailed(false);setValidating(true);const valText=bevCheckTextRef.current;if(!valText){setBevCheckFailed(true);setValidating(false);return;}(async()=>{try{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),90000);const vr=await fetch("/api/extract-pattern",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"bevcheck",patternText:valText}),signal:controller.signal});clearTimeout(timeout);const data=await vr.json();if(vr.ok&&!data.error){setValidationReport(data);}else{setBevCheckFailed(true);}}catch(e){console.warn("[ImageImport] BevCheck retry failed:",e);setBevCheckFailed(true);}setValidating(false);})();}} style={{background:T.terra,color:"#fff",border:"none",borderRadius:99,padding:"6px 16px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Retry BevCheck</button>
            </div>
          ):validationReport?(()=>{console.log("[Wovely] BevCheck compact card validationReport:",JSON.stringify(validationReport).substring(0,500));const scState=deriveState(validationReport);const scLabel=scState==="pass"?"Looks good":scState==="issues"?"Issues found":"Heads up";const scNeedle=NEEDLE_END[scState]||NEEDLE_END.warning;const allChecks=Array.isArray(validationReport.checks)?validationReport.checks:[];const scFailed=allChecks.filter(c=>c&&c.status&&c.status!=="pass").slice(0,3);console.log("[Wovely] BevCheck compact checks:",allChecks.length,"total,",scFailed.length,"failed, statuses:",allChecks.map(c=>c?.status));return isPro?(
            <div style={{background:T.surface,borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(155,126,200,.08)",border:`1px solid ${T.border}`,textAlign:"center"}}>
              <svg viewBox="0 0 200 120" style={{width:120,height:70,display:"block",margin:"0 auto"}}>
                <defs><linearGradient id="miniGaugeGradI" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#EDE4F7"/><stop offset="100%" stopColor="#9B7EC8"/></linearGradient></defs>
                <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="#EDE4F7" strokeWidth="18" strokeLinecap="round"/>
                <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="url(#miniGaugeGradI)" strokeWidth="18" strokeLinecap="round"/>
                <path d={`M 100 100 L ${scNeedle}`} stroke="#9B7EC8" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <circle cx="100" cy="100" r="5" fill="#fff"/><circle cx="100" cy="100" r="3" fill="#9B7EC8"/>
              </svg>
              <div style={{display:"flex",justifyContent:"space-between",width:"100%",margin:"2px auto 0"}}><span style={{fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:scState==="pass"?700:600,color:"#9B7EC8",opacity:scState==="pass"?1:0.5}}>Looks Good</span><span style={{fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:scState==="warning"?700:600,color:"#9B7EC8",opacity:scState==="warning"?1:0.5}}>Heads Up</span><span style={{fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:scState==="issues"?700:600,color:"#9B7EC8",opacity:scState==="issues"?1:0.5}}>Issues Found</span></div>
              <div style={{fontSize:11,fontWeight:700,color:"#2D3A7C",fontFamily:"'Inter',sans-serif",marginTop:4}}>{scLabel}</div>
              {scFailed.length>0&&<div style={{textAlign:"left",marginTop:8}}>{scFailed.map((c,i)=>(<div key={c.id||i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}><span style={{fontSize:11,color:c.status==="fail"?"#C0544A":"#C9A84C",flexShrink:0}}>{c.status==="fail"?"✕":"⚠"}</span><span style={{fontSize:11,color:"#6B6B8A"}}>{sentenceCase(c.label||"Check")}</span></div>))}</div>}
              <button onClick={()=>setShowFullReport(true)} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:11,fontWeight:600,padding:0,marginTop:6,textDecoration:"underline"}}>Full Report →</button>
            </div>
          ):(
            <div style={{background:T.surface,borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(155,126,200,.08)",border:`1px solid ${T.border}`,textAlign:"center"}}>
              <div style={{filter:"blur(6px)",WebkitFilter:"blur(6px)",userSelect:"none",pointerEvents:"none"}}>
                <svg viewBox="0 0 200 120" style={{width:120,height:70,display:"block",margin:"0 auto"}}>
                  <defs><linearGradient id="miniGaugeGradIb" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#EDE4F7"/><stop offset="100%" stopColor="#9B7EC8"/></linearGradient></defs>
                  <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="#EDE4F7" strokeWidth="18" strokeLinecap="round"/>
                  <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="url(#miniGaugeGradIb)" strokeWidth="18" strokeLinecap="round"/>
                  <path d={`M 100 100 L ${scNeedle}`} stroke="#9B7EC8" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <circle cx="100" cy="100" r="5" fill="#fff"/><circle cx="100" cy="100" r="3" fill="#9B7EC8"/>
                </svg>
                <div style={{display:"flex",justifyContent:"space-between",width:"100%",margin:"2px auto 0"}}><span style={{fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:600,color:"#9B7EC8",opacity:0.5}}>Looks Good</span><span style={{fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:600,color:"#9B7EC8",opacity:0.5}}>Heads Up</span><span style={{fontFamily:"'Inter',sans-serif",fontSize:9,fontWeight:600,color:"#9B7EC8",opacity:0.5}}>Issues Found</span></div>
                <div style={{fontSize:11,fontWeight:700,color:"#2D3A7C",fontFamily:"'Inter',sans-serif",marginTop:4}}>{scLabel}</div>
              </div>
              <div style={{borderTop:`1px solid ${T.border}`,marginTop:8,paddingTop:8}}>
                <div style={{fontSize:10,color:T.ink3,marginBottom:6}}>🔒 Unlock full report</div>
                <button onClick={()=>setProUpgradeBanner(true)} style={{background:T.terra,color:"#fff",border:"none",borderRadius:99,padding:"6px 16px",fontSize:10,fontWeight:600,cursor:"pointer"}}>Upgrade to Pro</button>
              </div>
            </div>
          );})():(
            <div style={{background:T.surface,borderRadius:16,padding:20,boxShadow:"0 4px 20px rgba(155,126,200,.08)",border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",minHeight:120,fontSize:11,color:T.ink3}}>BevCheck unavailable</div>
          )}
        </div>
      </div>
      {proUpgradeBanner&&(
        <div style={{background:T.terraLt,border:`1px solid ${T.terra}33`,borderRadius:12,padding:"12px 14px",marginTop:10,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:T.terra,marginBottom:2}}>Upgrade to Pro to unlock BevCheck</div><div style={{fontSize:11,color:T.ink2,lineHeight:1.5}}>Your pattern is still importing — finish saving first, then upgrade anytime from Settings.</div></div>
          <button onClick={()=>setProUpgradeBanner(false)} style={{background:"none",border:"none",fontSize:16,color:T.ink3,cursor:"pointer",padding:4,flexShrink:0}}>×</button>
        </div>
      )}
      {/* Full report overlay */}
      {showFullReport&&validationReport&&(
        <div style={{position:"fixed",inset:0,zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={()=>setShowFullReport(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"relative",zIndex:1,background:"#FFFFFF",borderRadius:20,width:"100%",maxWidth:480,maxHeight:"85vh",overflow:"auto",padding:"24px 22px 32px"}}>
            <button onClick={()=>setShowFullReport(false)} style={{position:"absolute",top:14,right:16,background:T.linen,border:"none",borderRadius:99,width:30,height:30,cursor:"pointer",fontSize:16,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:16}}>BevCheck Report</div>
            <div style={{marginBottom:14}}><BevGauge state={deriveState(validationReport)} /></div>
            {(()=>{const allChecks=validationReport.checks||[];const coreC=allChecks.filter(c=>checkTier(c)==="core");const advC=allChecks.filter(c=>checkTier(c)==="advisory");const renderC=(c,op)=>(<div key={c.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",marginBottom:6,display:"flex",gap:8,alignItems:"flex-start",opacity:op||1}}><span style={{fontSize:14,flexShrink:0}}>{CHECK_ICON[c.status]||"\u2753"}</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:c.status==="fail"?"#C0544A":(c.status==="warning"||c.status==="warn")?"#C9A84C":T.ink,marginBottom:2}}>{sentenceCase(c.label)}</div><div style={{fontSize:11,color:T.ink2,lineHeight:1.5}}>{c.detail}</div></div></div>);return <>{coreC.map(c=>renderC(c))}{advC.length>0&&<><div style={{borderTop:"0.5px solid #EDE4F7",margin:"10px 0"}}/><div style={{fontSize:10,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"#9B7EC8",fontFamily:"'Inter',sans-serif",marginBottom:8}}>Advisory</div>{advC.map(c=>renderC(c,0.85))}</>}</>;})()}
            {validationReport.summary&&<div style={{background:T.linen,borderRadius:12,padding:"12px 14px",marginTop:10,border:`1px solid ${T.border}`}}><div style={{fontSize:11,fontWeight:700,color:T.terra,marginBottom:4}}>Bev says:</div><div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>{validationReport.summary}</div></div>}
            <button onClick={()=>setShowFullReport(false)} style={{marginTop:14,width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:99,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 16px rgba(155,126,200,.3)"}}>Import Anyway →</button>
          </div>
        </div>
      )}
      <div style={{height:20}}/>
      <button onClick={handleSave} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#7B5FB5)`,color:"#fff",border:"none",borderRadius:99,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 28px rgba(155,126,200,.5)",marginBottom:8}}>Looks good — save pattern</button>
      <button onClick={()=>{setStage("pick");setItems([]);setExtracted(null);}} style={{width:"100%",background:"transparent",color:T.ink3,border:"none",borderRadius:99,padding:"10px",fontSize:13,cursor:"pointer"}}>Try different photos</button>
    </div>
  ) : null;

  const content = stage === "pick" ? pickContent
    : stage === "loading" ? loadingContent
    : stage === "error" ? errorContent
    : reviewContent;

  // ── MINIMIZED FLOATING CARD ──
  if (minimized) {
    return (
      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,width:380,maxHeight:560,overflowY:"auto",borderRadius:20,boxShadow:"0 8px 48px rgba(0,0,0,0.22)",background:"#fff",display:"flex",flexDirection:"column"}}>
        <div style={{flexShrink:0,padding:"14px 18px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={onExpand} style={{background:T.terraLt,border:"none",borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:600,color:T.terra,cursor:"pointer"}}>⤢ Expand</button>
          <button onClick={dismiss} style={{background:T.linen,border:"none",borderRadius:99,width:28,height:28,cursor:"pointer",fontSize:14,color:T.ink3,display:"flex",alignItems:"center",justifyContent:"center"}}>&times;</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 18px 18px"}}>
          {content}
        </div>
      </div>
    );
  }

  // ── MODAL SHELL ──
  if (isDesktop) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className={closing ? "dim-out" : "dim-in"} onClick={backdropDismiss} style={{ position: "absolute", inset: 0, background: "rgba(28,23,20,.6)", backdropFilter: "blur(4px)" }} />
      <div className={closing ? "" : "fu"} style={{
        position: "relative", background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 520,
        maxHeight: "85vh", display: "flex", flexDirection: "column", zIndex: 1,
        boxShadow: "0 24px 64px rgba(28,23,20,.3)",
      }}>
        <div style={{ flexShrink: 0, padding: "24px 28px 0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={dismiss} style={{
            background: T.linen, border: "none", borderRadius: 99, width: 32, height: 32,
            cursor: "pointer", fontSize: 18, color: T.ink3, display: "flex", alignItems: "center", justifyContent: "center",
          }}>&times;</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 32px" }}>
          {content}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "flex-end" }}>
      <div className={closing ? "dim-out" : "dim-in"} onClick={backdropDismiss} style={{ position: "absolute", inset: 0, background: "rgba(28,23,20,.6)", backdropFilter: "blur(4px)" }} />
      <div className={closing ? "" : "su"} style={{
        position: "relative", background: "#FFFFFF", borderRadius: "24px 24px 0 0", width: "100%",
        maxHeight: "92vh", display: "flex", flexDirection: "column", zIndex: 1,
      }}>
        <div style={{ flexShrink: 0, padding: "16px 22px 0" }}>
          <div style={{ width: 36, height: 3, background: T.border, borderRadius: 99, margin: "0 auto 18px" }} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={dismiss} style={{
              background: T.linen, border: "none", borderRadius: 99, width: 30, height: 30,
              cursor: "pointer", fontSize: 16, color: T.ink3, display: "flex", alignItems: "center", justifyContent: "center",
            }}>&times;</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 40px" }}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default ImageImportModal;
