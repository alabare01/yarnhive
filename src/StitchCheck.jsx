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

SCORING RULES — do NOT penalize for any of the following:
• PDF formatting artifacts (OCR typos in tip/intro sections, formatting inconsistencies, page headers/footers)
• Print-Friendly page duplications — if the pattern appears duplicated at the end under a "Print-Friendly" or similar heading, ignore the duplicate section entirely. This is a common PDF feature, not a pattern error.
• Non-US decimal conventions (comma instead of period for decimals)
• Minor grammatical issues that do not affect the crochet instructions
These may be noted as informational "pass" items at most, never scored as warnings or failures.

Be specific in detail fields. Name exact round numbers where issues occur. If everything looks clean, say so clearly. Aim for scores 80-100 for patterns with no structural issues.`;

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

const BADGE = { valid: { color: T.sage, bg: T.sageLt, emoji: "\u2705", label: "Pattern Looks Good" }, review: { color: T.gold, bg: "#FFF8EC", emoji: "\u26A0\uFE0F", label: "Review Suggested" }, issues: { color: "#C0392B", bg: "#FFF0EE", emoji: "\u274C", label: "Issues Found" } };
const badgeForScore = (score) => score >= 80 ? BADGE.valid : score >= 60 ? BADGE.review : BADGE.issues;
const CHECK_ICON = { pass: "\u2705", warn: "\u26A0\uFE0F", fail: "\u274C" };

const CARD = {background:T.card,borderRadius:16,padding:24,boxShadow:T.shadowLg};
const LABEL = {fontSize:10,fontVariant:"small-caps",color:T.ink3,textTransform:"lowercase",letterSpacing:".14em",marginBottom:6,fontWeight:500};

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
    setLoading(true); setError(null); setReport(null); setProgress(10); setPhase("Preparing pattern text\u2026");
    const intv = setInterval(() => setProgress(p => Math.min(p + 2, 85)), 200);
    try {
      setPhase("Running Stitch Check\u2026");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: VALIDATION_PROMPT + "\n\nPATTERN TEXT:\n" + patternText }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 65536 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      clearInterval(intv); setProgress(90); setPhase("Reading results\u2026");
      const rawText = await res.text();
      console.log("[Wovely] Stitch Check response status:", res.status, "body preview:", rawText.substring(0, 500));
      if (!res.ok) throw new Error("Gemini API error: " + res.status + " \u2014 " + rawText.substring(0, 200));
      let data; try { data = JSON.parse(rawText); } catch (e) { throw new Error("Invalid JSON wrapper: " + rawText.substring(0, 200)); }
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log("[Wovely] Stitch Check extracted text:", raw.substring(0, 300));
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
    setMode("pdf"); setLoading(true); setProgress(5); setPhase("Extracting text from PDF\u2026");
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
    const badge = badgeForScore(report.score);
    return (
      <div style={{ padding: isDesktop ? "0 0 80px" : "0 18px 80px" }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink, marginBottom: 4, fontWeight: 700 }}>Stitch Check Report</div>
        <div style={{ fontSize: 13, color: T.ink3, marginBottom: 24 }}>Pattern validation results</div>

        {/* Overall badge */}
        <div style={{ ...CARD, textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{badge.emoji}</div>
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: badge.color, marginBottom: 4 }}>{badge.label}</div>
          <div style={{ fontFamily: T.serif, fontSize: 48, fontWeight: 700, color: badge.color, lineHeight: 1 }}>{report.score}%</div>
          <div style={{ marginTop: 16, background: T.linen, borderRadius: 99, height: 6, overflow: "hidden" }}>
            <div style={{ width: report.score + "%", height: "100%", background: badge.color, borderRadius: 99, transition: "width .4s ease" }} />
          </div>
        </div>

        {/* Individual checks */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...LABEL, marginBottom: 12 }}>checks</div>
          {(report.checks || []).map(c => (
            <div key={c.id} style={{ ...CARD, padding: "16px 20px", marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{CHECK_ICON[c.status] || "\u2753"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.7 }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {report.summary && (
          <div style={{ ...CARD, marginBottom: 20 }}>
            <div style={{ ...LABEL, color: T.terra, marginBottom: 8 }}>bev says</div>
            <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7 }}>{report.summary}</div>
          </div>
        )}

        <div style={{ padding: "0 8px", textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: T.sage, lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>A lower score doesn't mean your pattern won't work \u2014 think of it like adding a handwritten recipe card to your recipe box. Mom's notes, doodles, and shorthand are part of the charm. Wovely can import any pattern regardless of its Stitch Check score.</p>
        </div>
        <button onClick={reset} style={{ width: "100%", background: T.card, color: T.ink2, border: "none", borderRadius: 99, padding: "14px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: T.shadow }}>Check another pattern</button>
      </div>
    );
  }

  return (
    <div style={{ padding: isDesktop ? "0 0 80px" : "0 18px 80px" }}>
      <div style={{ fontFamily: T.serif, fontSize: 22, color: T.ink, marginBottom: 4, fontWeight: 700 }}>Stitch Check</div>
      <div style={{ fontSize: 13, color: T.ink3, marginBottom: 24, lineHeight: 1.6 }}>Before you pick up your hook \u2014 let Wovely check the math.</div>

      {error && (
        <div style={{ ...CARD, background: "#FFF0EE", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#C0392B", fontWeight: 600, marginBottom: 4 }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6 }}>{error}</div>
        </div>
      )}

      {loading && (
        <div style={{ ...CARD, textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>{"\uD83D\uDEE1\uFE0F"}</div>
          <div style={{ fontFamily: T.serif, fontSize: 18, color: T.ink, marginBottom: 12 }}>{phase}</div>
          <div style={{ height: 6, background: T.linen, borderRadius: 99, overflow: "hidden", margin: "0 auto", maxWidth: 300 }}>
            <div className="progress-bar-fill" style={{ height: "100%", width: progress + "%", borderRadius: 99, transition: "width .3s ease" }} />
          </div>
        </div>
      )}

      {!loading && !mode && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div onClick={() => fileRef.current?.click()} style={{ ...CARD, cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadowLg; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = T.shadow; }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83D\uDCC4"}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Upload PDF</div>
            <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>We'll extract and validate</div>
          </div>
          <div onClick={() => setMode("text")} style={{ ...CARD, cursor: "pointer", textAlign: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadowLg; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = T.shadow; }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u270F\uFE0F"}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Paste Text</div>
            <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>Paste your pattern directly</div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handlePDF} style={{ display: "none" }} />
        </div>
      )}

      {!loading && mode === "text" && (
        <div style={CARD}>
          <div style={LABEL}>paste your pattern</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste your pattern text here \u2014 rounds, rows, instructions, everything\u2026" rows={12} style={{ width: "100%", padding: "16px 0", background: "transparent", border: "none", borderBottom: `1.5px solid ${T.border}`, color: T.ink, fontSize: 14, resize: "vertical", lineHeight: 1.7, outline: "none", fontFamily: T.sans, transition: "border-color .2s" }} onFocus={e => e.target.style.borderBottomColor = T.terra} onBlur={e => e.target.style.borderBottomColor = T.border} />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={handleTextSubmit} disabled={!text.trim()} style={{ flex: 1, background: T.terra, color: "#fff", border: "none", borderRadius: 99, padding: "14px", fontSize: 15, fontWeight: 600, cursor: text.trim() ? "pointer" : "not-allowed", opacity: text.trim() ? 1 : .5, boxShadow: "0 4px 16px rgba(155,126,200,.3)" }}>Run Stitch Check</button>
            <button onClick={reset} style={{ background: T.card, color: T.ink2, border: "none", borderRadius: 99, padding: "14px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: T.shadow }}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
};

export { VALIDATION_PROMPT, BADGE, badgeForScore, CHECK_ICON };
export default StitchCheck;
