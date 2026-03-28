import { useState, useRef } from "react";
import { T, useBreakpoint } from "./theme.jsx";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const VALIDATION_PROMPT = `You are a crochet pattern validator. Analyze this pattern and return ONLY a JSON object with this exact structure — no markdown, no backticks, no explanation:
{
  "overall": "valid" or "review" or "issues",
  "score": number 0-100,
  "checks": [
    { "id": "string", "label": "string", "status": "pass" or "warn" or "fail", "detail": "string" }
  ],
  "summary": "string"
}

Check for:
1. Sequential rounds/rows — are all numbers present with no gaps or duplicates? (id: "sequence")
2. Stitch count math — do totals in parentheses match the instructions mathematically? (id: "stitch_math")
3. Duplicate round numbers — same number appearing twice with different instructions? (id: "duplicates")
4. Cross-references — does the pattern reference rounds that don't exist? (id: "cross_refs")
5. Translation artifacts — does phrasing suggest a translated pattern that may have errors? (id: "translation")
6. Component structure — are section headers clear and consistent? (id: "structure")

Be specific in detail fields. Name exact round numbers where issues occur. If everything looks clean, say so clearly.`;

// Load pdf.js dynamically (same approach as AddPatternModal)
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
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += "\n" + content.items.map(item => item.str).join(" ");
        }
        resolve(fullText);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

const BADGE = { valid: { color: T.sage, bg: T.sageLt, emoji: "✅", label: "Valid Pattern" }, review: { color: T.gold, bg: "#FFF8EC", emoji: "⚠️", label: "Review Suggested" }, issues: { color: "#C0392B", bg: "#FFF0EE", emoji: "❌", label: "Issues Found" } };
const CHECK_ICON = { pass: "✅", warn: "⚠️", fail: "❌" };

const StitchCheck = () => {
  const [mode, setMode] = useState(null); // null | "pdf" | "text"
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const { isDesktop } = useBreakpoint();

  const runCheck = async (patternText) => {
    if (!patternText.trim()) return;
    setLoading(true); setError(null); setReport(null); setProgress(10); setPhase("Preparing pattern text…");
    const intv = setInterval(() => setProgress(p => Math.min(p + 2, 85)), 200);
    try {
      setPhase("Running Stitch Check…");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: VALIDATION_PROMPT + "\n\nPATTERN TEXT:\n" + patternText }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      });
      clearInterval(intv); setProgress(90); setPhase("Reading results…");
      if (!res.ok) throw new Error("Gemini API error: " + res.status);
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setProgress(100); setPhase("Done");
      await new Promise(r => setTimeout(r, 300));
      setReport(parsed);
    } catch (e) {
      clearInterval(intv);
      console.error("[Wovely] Stitch Check error:", e);
      setError("Couldn't analyze this pattern. Try again or paste the text directly.");
    }
    setLoading(false);
  };

  const handlePDF = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setMode("pdf"); setLoading(true); setProgress(5); setPhase("Extracting text from PDF…");
    try {
      const extracted = await extractTextFromPDF(file);
      await runCheck(extracted);
    } catch {
      setError("Couldn't read this PDF. Try pasting the pattern text instead.");
      setLoading(false);
    }
  };

  const handleTextSubmit = () => runCheck(text);

  const reset = () => { setMode(null); setText(""); setReport(null); setError(null); setLoading(false); setProgress(0); };

  // Report card view
  if (report) {
    const badge = BADGE[report.overall] || BADGE.review;
    return (
      <div style={{ padding: isDesktop ? "0 0 80px" : "0 18px 80px" }}>
        <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 4 }}>Stitch Check Report</div>
        <div style={{ fontSize: 13, color: T.ink3, marginBottom: 20 }}>Pattern validation results</div>

        {/* Overall badge */}
        <div style={{ background: badge.bg, border: `2px solid ${badge.color}`, borderRadius: 16, padding: "20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{badge.emoji}</div>
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: badge.color, marginBottom: 4 }}>{badge.label}</div>
          <div style={{ fontFamily: T.serif, fontSize: 44, fontWeight: 700, color: badge.color, lineHeight: 1 }}>{report.score}</div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>out of 100</div>
          <div style={{ marginTop: 12, background: T.border, borderRadius: 99, height: 6, overflow: "hidden" }}>
            <div style={{ width: report.score + "%", height: "100%", background: badge.color, borderRadius: 99, transition: "width .4s ease" }} />
          </div>
        </div>

        {/* Individual checks */}
        <div style={{ marginBottom: 16 }}>
          {(report.checks || []).map(c => (
            <div key={c.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{CHECK_ICON[c.status] || "❓"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 3 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6 }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {report.summary && (
          <div style={{ background: T.linen, borderRadius: 14, padding: "16px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.terra, marginBottom: 6 }}>Bev says:</div>
            <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7 }}>{report.summary}</div>
          </div>
        )}

        <button onClick={reset} style={{ marginTop: 20, width: "100%", background: T.linen, color: T.ink2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Check another pattern</button>
      </div>
    );
  }

  return (
    <div style={{ padding: isDesktop ? "0 0 80px" : "0 18px 80px" }}>
      <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 4 }}>Stitch Check</div>
      <div style={{ fontSize: 13, color: T.ink3, marginBottom: 20, lineHeight: 1.6 }}>Before you pick up your hook — let Wovely check the math.</div>

      {error && (
        <div style={{ background: "#FFF0EE", borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: "1px solid #F5C6BB" }}>
          <div style={{ fontSize: 13, color: "#C0392B", fontWeight: 600, marginBottom: 4 }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6 }}>{error}</div>
        </div>
      )}

      {loading && (
        <div style={{ padding: "40px 0 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🛡️</div>
          <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 8 }}>{phase}</div>
          <div style={{ height: 6, background: T.linen, borderRadius: 99, overflow: "hidden", margin: "0 auto", maxWidth: 300 }}>
            <div className="progress-bar-fill" style={{ height: "100%", width: progress + "%", borderRadius: 99, transition: "width .3s ease" }} />
          </div>
        </div>
      )}

      {!loading && !mode && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div onClick={() => fileRef.current?.click()} style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: 24, cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(139,90,60,.12)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Upload PDF</div>
            <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>We'll extract and validate</div>
          </div>
          <div onClick={() => setMode("text")} style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: 24, cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(139,90,60,.12)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✏️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Paste Text</div>
            <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>Paste your pattern directly</div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handlePDF} style={{ display: "none" }} />
        </div>
      )}

      {!loading && mode === "text" && (
        <div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste your pattern text here — rounds, rows, instructions, everything…" rows={12} style={{ width: "100%", padding: "14px 16px", background: T.linen, border: `1.5px solid ${T.border}`, borderRadius: 12, color: T.ink, fontSize: 14, resize: "vertical", lineHeight: 1.7, outline: "none", fontFamily: T.sans }} onFocus={e => e.target.style.borderColor = T.terra} onBlur={e => e.target.style.borderColor = T.border} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={handleTextSubmit} disabled={!text.trim()} style={{ flex: 1, background: T.terra, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : .5, boxShadow: "0 4px 16px rgba(184,90,60,.3)" }}>Run Stitch Check</button>
            <button onClick={reset} style={{ background: T.linen, color: T.ink2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 20px", fontSize: 14, cursor: "pointer" }}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StitchCheck;
