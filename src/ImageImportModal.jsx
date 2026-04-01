import { useState, useRef, useCallback } from "react";
import { T, useBreakpoint } from "./theme.jsx";
import { PILL } from "./constants.js";
import { buildRowsFromComponents } from "./AddPatternModal.jsx";

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

const ImageImportModal = ({ onClose, onPatternSaved, userId, isPro }) => {
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
  const fileRef = useRef(null);
  const dropRef = useRef(null);
  const { isDesktop } = useBreakpoint();

  const dismiss = () => { setClosing(true); setTimeout(() => { setClosing(false); onClose(); }, 220); };

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
      photo: items[0]?.thumb || PILL[Math.floor(Math.random() * PILL.length)],
      cover_image_url: null,
      source_file_url: "",
      source_file_name: items[0]?.file.name || "",
      source_file_type: items[0]?.file.type || "",
      extracted_by_ai: true,
      components: extracted.components || [],
      assembly_notes: extracted.assembly_notes || "",
      difficulty: extracted.difficulty || "",
      abbreviations_map: extracted.abbreviations_map || {},
      suggested_resources: extracted.suggested_resources || [],
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
        ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple
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
    <div style={{ padding: "48px 20px 36px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <style>{`@keyframes spinLoaderVision{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes fadeInMsgV{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        width: 60, height: 60, borderRadius: "50%", border: "4px solid transparent",
        borderTopColor: "#9B7EC8", animation: "spinLoaderVision 1s linear infinite", marginBottom: 24,
      }} />
      <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 600, color: "#2D2D4E", marginBottom: 8, lineHeight: 1.4 }}>
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

  const reviewContent = extracted ? (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: T.ink3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Pattern Title</div>
        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Pattern name" style={{
          width: "100%", padding: "6px 0", border: "none", borderBottom: "1px solid transparent",
          background: "transparent", fontSize: 16, fontWeight: 600, fontFamily: T.serif, color: T.ink, outline: "none",
        }} onFocus={e => e.target.style.borderBottomColor = "#9B7EC8"} onBlur={e => e.target.style.borderBottomColor = "transparent"} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: T.ink3, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Designer</div>
        <input value={editDesigner} onChange={e => setEditDesigner(e.target.value)} placeholder="Designer name" style={{
          width: "100%", padding: "6px 0", border: "none", borderBottom: "1px solid transparent",
          background: "transparent", fontSize: 13, color: T.ink2, outline: "none",
        }} onFocus={e => e.target.style.borderBottomColor = "#9B7EC8"} onBlur={e => e.target.style.borderBottomColor = "transparent"} />
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
      <button onClick={handleSave} style={{
        width: "100%", background: "linear-gradient(135deg,#9B7EC8,#7B5FB5)", color: "#fff",
        border: "none", borderRadius: 99, padding: "15px", fontSize: 15, fontWeight: 600,
        cursor: "pointer", boxShadow: "0 8px 28px rgba(155,126,200,.5)", marginBottom: 8,
      }}>Looks good — save pattern</button>
      <button onClick={() => { setStage("pick"); setItems([]); setExtracted(null); }} style={{
        width: "100%", background: "transparent", color: T.ink3, border: "none",
        borderRadius: 99, padding: "10px", fontSize: 13, cursor: "pointer",
      }}>Try different photos</button>
    </div>
  ) : null;

  const content = stage === "pick" ? pickContent
    : stage === "loading" ? loadingContent
    : stage === "error" ? errorContent
    : reviewContent;

  // ── MODAL SHELL ──
  if (isDesktop) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className={closing ? "dim-out" : "dim-in"} onClick={dismiss} style={{ position: "absolute", inset: 0, background: "rgba(28,23,20,.6)", backdropFilter: "blur(4px)" }} />
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
      <div className={closing ? "dim-out" : "dim-in"} onClick={dismiss} style={{ position: "absolute", inset: 0, background: "rgba(28,23,20,.6)", backdropFilter: "blur(4px)" }} />
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
