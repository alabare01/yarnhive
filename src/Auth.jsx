import { useState, useRef, useEffect, useCallback } from "react";
import { T, useBreakpoint } from "./theme.jsx";
import { supabaseAuth, getSession, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";
import { APP_VERSION } from "./constants.js";

/* ── Typewriter hook ── */
const BEV_LINES = [
  "Row 12 looks tight \u2014 loosen your tension before you continue.",
  "You\u2019ve got 3 patterns on the go. Want to pick up where you left off?",
  "That\u2019s a Moss Stitch \u2014 I\u2019ve got a tutorial if you need a refresher.",
  "Your Floral Burst is 47% done. You\u2019ve got this!",
  "BevCheck found a yarn change note on row 24 \u2014 heads up!",
];
const useTypewriter = (lines, typeSpeed = 38, deleteSpeed = 18, pauseEnd = 2200, pauseBetween = 400) => {
  const [text, setText] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const line = lines[lineIdx];
    if (!deleting && charIdx <= line.length) {
      if (charIdx === line.length) {
        const t = setTimeout(() => setDeleting(true), pauseEnd);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => { setText(line.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, typeSpeed);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx >= 0) {
      if (charIdx === 0) {
        const t = setTimeout(() => { setDeleting(false); setLineIdx(i => (i + 1) % lines.length); }, pauseBetween);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => { setText(line.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, deleteSpeed);
      return () => clearTimeout(t);
    }
  }, [charIdx, deleting, lineIdx, lines, typeSpeed, deleteSpeed, pauseEnd, pauseBetween]);
  return text;
};

/* ── Shared Styles ── */
const GLASS = {
  background: "rgba(255,255,255,0.84)",
  border: "1px solid rgba(155,126,200,0.18)",
  borderRadius: 13,
  padding: "16px 18px",
  marginBottom: 4,
};
const TAG = (bg, color) => ({
  display: "inline-block", background: bg, color, borderRadius: 99,
  padding: "3px 9px", fontSize: 9.5, fontWeight: 600, lineHeight: 1,
});
const INPUT_STYLE = {
  width: "100%", height: 41, padding: "0 14px", background: "#F8F6FF",
  border: "1px solid #EDE4F7", borderRadius: 10, fontSize: 13,
  color: "#2D2D4E", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};

/* ── Skeleton card (loading state) ── */
const SkeletonCard = () => (
  <div style={{ ...GLASS, overflow: "hidden" }}>
    <style>{`@keyframes skPulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
    <div style={{ display: "flex", alignItems: "center", gap: 11, animation: "skPulse 1.5s ease-in-out infinite" }}>
      <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(155,126,200,0.08)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: "70%", height: 12, borderRadius: 4, background: "rgba(155,126,200,0.08)", marginBottom: 8 }} />
        <div style={{ width: "50%", height: 10, borderRadius: 4, background: "rgba(155,126,200,0.08)", marginBottom: 6 }} />
        <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(155,126,200,0.08)" }} />
      </div>
    </div>
  </div>
);

/* ── Pattern thumbnail ── */
const Thumb = ({ src }) => {
  const isBase64 = src && src.startsWith("data:");
  const url = src && !isBase64 ? src : null;
  return url
    ? <img src={url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: 48, height: 48, borderRadius: 10, background: "linear-gradient(135deg,#C4ADE6,#9B7EC8)", flexShrink: 0 }} />;
};

/* ── BevCheck score circle ── */
const ScoreCircle = ({ score }) => {
  const R = 28, C = 2 * Math.PI * R;
  const pct = Math.min(Math.max(score || 0, 0), 100);
  const offset = C - (C * pct / 100);
  const color = pct >= 80 ? "#5B9B6B" : pct >= 60 ? "#C9A84C" : "#C0544A";
  return (
    <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
      <style>{`@keyframes scFill{from{stroke-dashoffset:${C}}to{stroke-dashoffset:${offset}}}`}</style>
      <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="34" cy="34" r={R} fill="none" stroke="#EDE4F7" strokeWidth="4" />
        <circle cx="34" cy="34" r={R} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} style={{ animation: "scFill 0.8s ease-out forwards" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#2D2D4E", fontFamily: T.serif }}>{pct}%</span>
      </div>
    </div>
  );
};

/* ── Fetch showcase patterns ── */
const useShowcasePatterns = () => {
  const [patterns, setPatterns] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/patterns?is_showcase=eq.true&limit=3&select=id,title,photo,cover_image_url,row_count,validation_report,rows,source_file_url`,
          { headers: { "apikey": SUPABASE_ANON_KEY } }
        );
        if (res.ok) { const d = await res.json(); if (d.length > 0) setPatterns(d); }
      } catch { /* fall back to static */ }
    })();
  }, []);
  return patterns;
};

/* ── Static fallback data ── */
const FALLBACK = [
  { id: 1, title: "Floral Burst Square", row_count: 30, rows: new Array(14), source_file_url: "x", photo: null, validation_report: null },
  { id: 2, title: "Nordic Star Blanket", row_count: 40, rows: new Array(35), source_file_url: "x", photo: null, validation_report: { score: 88, summary: "Pattern reviewed with minor notes.", flags: [{},{},{}] } },
];

/* ── Left Column: Product Preview ── */
const ProductPreview = () => {
  const bevText = useTypewriter(BEV_LINES);
  const livePatterns = useShowcasePatterns();
  const patterns = livePatterns || FALLBACK;
  const loading = livePatterns === null;

  // Find the pattern with the highest BevCheck score
  const bevCheckPattern = [...patterns].sort((a, b) => {
    const sa = a.validation_report?.score ?? -1;
    const sb = b.validation_report?.score ?? -1;
    return sb - sa;
  }).find(p => p.validation_report?.score != null);

  // Remaining patterns for the "Your patterns" section
  const displayPatterns = patterns.filter(p => p !== bevCheckPattern).slice(0, 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "48px 40px", justifyContent: "center", minHeight: "100vh", boxSizing: "border-box" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/bev_neutral.png" alt="Wovely" style={{ width: 36, height: 36, objectFit: "contain" }} />
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: "#2D2D4E" }}>Wovely</div>
      </div>

      {/* Headline */}
      <div>
        <div style={{ fontFamily: T.serif, fontSize: 25, fontWeight: 700, color: "#2D2D4E", lineHeight: 1.2 }}>
          Save, build and track every pattern you love.
        </div>
        <div style={{ fontSize: 13, color: "#6B6B8A", lineHeight: 1.6, marginTop: 6 }}>
          Import any PDF, follow every row, and let Bev keep you on track.
        </div>
      </div>

      {/* Pattern cards — live data */}
      {loading && !livePatterns ? (
        <>{[0,1].map(i => <SkeletonCard key={i} />)}</>
      ) : displayPatterns.map(p => {
        const rowsDone = Array.isArray(p.rows) ? p.rows.filter(r => r && r.done).length : (Array.isArray(p.rows) ? p.rows.length : 0);
        const total = p.row_count || 0;
        const pct = total > 0 ? Math.round((rowsDone / total) * 100) : 0;
        const title = (p.title || "Untitled").slice(0, 32) + ((p.title || "").length > 32 ? "\u2026" : "");
        const img = p.cover_image_url || p.photo;
        return (
          <div key={p.id} style={GLASS}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9B7EC8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Your patterns</div>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
              <Thumb src={img} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2D4E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                <div style={{ fontSize: 11, color: "#6B6B8A" }}>
                  {total > 0 ? `Row ${rowsDone} of ${total} \u00b7 In progress` : "Rows extracted"}
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "#EDE4F7", marginTop: 5 }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: "#9B7EC8", transition: "width .6s ease" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {p.source_file_url && <span style={TAG("rgba(92,158,122,0.12)", "#5B9B6B")}>PDF imported</span>}
              {total > 0 && <span style={TAG("rgba(155,126,200,0.12)", "#9B7EC8")}>Rows tracked</span>}
              {p.validation_report?.score != null && <span style={TAG("rgba(91,155,107,0.12)", "#5B9B6B")}>{p.validation_report.score}% clean</span>}
            </div>
          </div>
        );
      })}

      {/* BevCheck card — real score */}
      {loading && !livePatterns ? <SkeletonCard /> : bevCheckPattern ? (() => {
        const vr = bevCheckPattern.validation_report;
        const score = vr?.score ?? 0;
        const flags = vr?.flags || vr?.checks || [];
        const flagCount = Array.isArray(flags) ? flags.length : 0;
        const summary = (vr?.summary || "").slice(0, 80) + ((vr?.summary || "").length > 80 ? "\u2026" : "");
        const title = (bevCheckPattern.title || "Untitled").slice(0, 32) + ((bevCheckPattern.title || "").length > 32 ? "\u2026" : "");
        return (
          <div style={GLASS}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9B7EC8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>BevCheck</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2D4E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                <div style={{ fontSize: 11, color: "#6B6B8A", marginTop: 2 }}>
                  {flagCount > 0 ? `Pattern reviewed \u00b7 ${flagCount} notes found` : "Pattern reviewed \u00b7 Clean pattern"}
                </div>
                {summary && (
                  <div style={{ fontSize: 11, color: "#6B6B8A", lineHeight: 1.5, marginTop: 6, position: "relative", overflow: "hidden", maxHeight: 34 }}>
                    {summary}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 16, background: "linear-gradient(transparent, rgba(255,255,255,0.84))" }} />
                  </div>
                )}
              </div>
              <ScoreCircle score={score} />
            </div>
          </div>
        );
      })() : null}

      {/* Stitch-O-Vision — static */}
      <div style={GLASS}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "#9B7EC8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Stitch-O-Vision</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2D4E" }}>Moss Stitch</div>
            <div style={{ fontSize: 11, color: "#6B6B8A" }}>Tap any photo to identify your stitch</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#5B9B6B" }}>94% match</div>
            <div style={{ width: 60, height: 4, borderRadius: 2, background: "#EDE4F7", marginTop: 4 }}>
              <div style={{ width: "94%", height: "100%", borderRadius: 2, background: "#5B9B6B" }} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <a href="/stitch-vision" style={{ fontSize: 11, color: "#9B7EC8", fontWeight: 600, textDecoration: "none" }}>Try it free &rarr;</a>
        </div>
      </div>

      {/* Bev typing card — solid lavender */}
      <div style={{ background: "#9B7EC8", borderRadius: 13, padding: "16px 18px", marginBottom: 4, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <style>{`@keyframes bevPulseW{0%{box-shadow:0 0 0 0 rgba(255,255,255,0.3)}70%{box-shadow:0 0 0 8px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", flexShrink: 0, overflow: "hidden", animation: "bevPulseW 2s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/bev_neutral.png" alt="Bev" style={{ width: 30, height: 30, objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Bev</div>
          <div style={{ fontSize: 12, color: "#fff", lineHeight: 1.5, minHeight: 18 }}>
            {bevText}<span style={{ display: "inline-block", width: 1.5, height: 14, background: "#fff", marginLeft: 1, verticalAlign: "text-bottom", animation: "cursorBlink 1s step-end infinite" }} />
          </div>
        </div>
      </div>

      {/* App Store / Google Play badges */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: "#fff", border: "1px solid #EDE4F7", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="24" height="28" viewBox="0 0 384 512" fill="#000"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
          <div><div style={{ fontSize: 9, color: "#6B6B8A" }}>Download on the</div><div style={{ fontSize: 13, fontWeight: 700, color: "#2D2D4E" }}>App Store</div></div>
        </div>
        <div style={{ flex: 1, background: "#fff", border: "1px solid #EDE4F7", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="24" viewBox="0 0 512 512"><path d="M93.6 28.3l187.2 107.5L93.6 483.7c-5.1-4.4-8.2-10.8-8.2-18V46.3c0-7.2 3.1-13.6 8.2-18z" fill="#4285F4"/><path d="M116.3 11.3L330 135.8 282.4 256 116.3 11.3z" fill="#34A853"/><path d="M116.3 500.7L282.4 256l47.6 120.2-213.7 124.5z" fill="#EA4335"/><path d="M345.6 256l80.8-46.4c14.3-8.2 14.3-28.9 0-37.2L345.6 126l-52.8 130 52.8 130z" fill="#FBBC05"/></svg>
          <div><div style={{ fontSize: 9, color: "#6B6B8A" }}>Get it on</div><div style={{ fontSize: 13, fontWeight: 700, color: "#2D2D4E" }}>Google Play</div></div>
        </div>
      </div>
    </div>
  );
};

/* ── Right Column: Signup Form ── */
const SignupForm = ({ onEnter, onEnterAsNew }) => {
  const [mode, setMode] = useState("form"); // "form" | "signin" | "magic"
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  const handleSignup = async () => {
    setAuthError(null);
    if (!email.trim() || !pass) { setAuthError("Please fill in all fields."); return; }
    if (pass !== confirmPass) { setAuthError("Passwords don\u2019t match."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.signUp(email.trim(), pass);
      if (error) { setAuthError(error.msg || error.error_description || error.message || "Sign-up failed."); setLoading(false); return; }
      if (data && !data.session) {
        const { error: signInErr } = await supabaseAuth.signIn(email.trim(), pass);
        if (signInErr) { setAuthError(signInErr.error_description || signInErr.msg || signInErr.message || "Sign-up succeeded but sign-in failed."); setLoading(false); return; }
      }
      onEnterAsNew();
    } catch { setAuthError("Network error \u2014 please try again."); }
    setLoading(false);
  };

  const handleSignin = async () => {
    setAuthError(null);
    if (!email.trim() || !pass) { setAuthError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const { error } = await supabaseAuth.signIn(email.trim(), pass);
      if (error) { setAuthError(error.error_description || error.msg || error.message || "Invalid email or password."); setLoading(false); return; }
      onEnter();
    } catch { setAuthError("Network error \u2014 please try again."); }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    setAuthError(null);
    if (!email.trim() || !email.includes("@")) { setAuthError("Please enter a valid email."); return; }
    setLoading(true);
    try {
      const { error } = await supabaseAuth.signInWithOtp(email.trim());
      if (error) { setAuthError(error.msg || error.message || "Could not send magic link."); setLoading(false); return; }
      setMagicSent(true);
    } catch { setAuthError("Network error \u2014 please try again."); }
    setLoading(false);
  };

  const onKey = e => { if (e.key === "Enter" && !loading) { if (mode === "magic") handleMagicLink(); else if (mode === "signin") handleSignin(); else handleSignup(); } };

  const inputFocus = e => { e.target.style.borderColor = "#9B7EC8"; };
  const inputBlur = e => { e.target.style.borderColor = "#EDE4F7"; };

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 40px", maxWidth: 400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {/* Heading */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: T.serif, fontSize: 21, fontWeight: 700, color: "#2D2D4E", marginBottom: 4 }}>
          {mode === "signin" ? "Welcome back." : "Start crafting smarter today."}
        </div>
        <div style={{ fontSize: 12.5, color: "#6B6B8A" }}>
          {mode === "signin" ? "Your Wovely is waiting." : "Free to start. No credit card needed."}
        </div>
      </div>

      {/* Magic link sent */}
      {mode === "magic" && magicSent ? (
        <div style={{ background: "rgba(92,158,122,0.08)", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#9993;</div>
          <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 700, color: "#5C9E7A", marginBottom: 4 }}>Check your inbox</div>
          <div style={{ fontSize: 12, color: "#6B6B8A", lineHeight: 1.6 }}>We sent a magic link to <strong>{email}</strong>. Click it to sign in.</div>
          <button onClick={() => { setMode("form"); setMagicSent(false); setAuthError(null); }} style={{ background: "none", border: "none", color: "#9B7EC8", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>&larr; Back</button>
        </div>
      ) : mode === "magic" ? (
        /* Magic link form */
        <div onKeyDown={onKey}>
          <div style={{ marginBottom: 12 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" style={INPUT_STYLE} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          {authError && <div style={{ background: "#EDE4F7", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#9B7EC8", marginBottom: 10 }}>{authError}</div>}
          <button onClick={handleMagicLink} disabled={loading} style={{ width: "100%", height: 43, background: "#9B7EC8", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Sending\u2026" : "Send magic link \u2192"}
          </button>
          <button onClick={() => { setMode("form"); setAuthError(null); }} style={{ width: "100%", background: "none", border: "none", color: "#6B6B8A", fontSize: 12, cursor: "pointer", marginTop: 10 }}>&larr; Back to email &amp; password</button>
        </div>
      ) : (
        /* Email + password form */
        <div onKeyDown={onKey}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" style={INPUT_STYLE} onFocus={inputFocus} onBlur={inputBlur} />
            <input value={pass} onChange={e => setPass(e.target.value)} placeholder={mode === "signin" ? "Password" : "Create a password"} type="password" style={INPUT_STYLE} onFocus={inputFocus} onBlur={inputBlur} />
            {mode !== "signin" && (
              <input value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm password" type="password" style={INPUT_STYLE} onFocus={inputFocus} onBlur={inputBlur} />
            )}
          </div>
          {authError && <div style={{ background: "#EDE4F7", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#9B7EC8", marginBottom: 10 }}>{authError}</div>}
          <button onClick={mode === "signin" ? handleSignin : handleSignup} disabled={loading} style={{ width: "100%", height: 43, background: "#9B7EC8", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Please wait\u2026" : mode === "signin" ? "Sign in \u2192" : "Create my free account \u2192"}
          </button>

          {/* Magic link toggle */}
          <button onClick={() => { setMode("magic"); setAuthError(null); }} style={{ width: "100%", height: 38, background: "transparent", border: "1px solid #EDE4F7", borderRadius: 10, fontSize: 12.5, color: "#6B6B8A", cursor: "pointer", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>&#9993;</span> Send me a magic link instead
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#EDE4F7" }} />
            <div style={{ fontSize: 11, color: "#6B6B8A", whiteSpace: "nowrap" }}>or continue with</div>
            <div style={{ flex: 1, height: 1, background: "#EDE4F7" }} />
          </div>

          {/* Social sign-in */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => supabaseAuth.signInWithOAuth("google")} style={{ width: "100%", height: 42, background: "#fff", border: "1px solid #EDE4F7", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#2D2D4E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.53l7.97-5.94z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.94C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>
            {/* TODO: Apple sign-in requires Apple Developer account + Supabase Auth provider config (Auth > Providers > Apple) */}
            <button onClick={() => supabaseAuth.signInWithOAuth("apple")} style={{ width: "100%", height: 42, background: "#000", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="14" height="17" viewBox="0 0 384 512" fill="#fff"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              Continue with Apple
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 20, textAlign: "center" }}>
        {mode === "signin" ? (
          <div style={{ fontSize: 11.5 }}>
            <span style={{ color: "#6B6B8A" }}>Don&apos;t have an account? </span>
            <span onClick={() => { setMode("form"); setAuthError(null); }} style={{ color: "#9B7EC8", cursor: "pointer", fontWeight: 600 }}>Sign up &rarr;</span>
          </div>
        ) : (
          <div style={{ fontSize: 11.5 }}>
            <span style={{ color: "#6B6B8A" }}>Already have an account? </span>
            <span onClick={() => { setMode("signin"); setAuthError(null); }} style={{ color: "#9B7EC8", cursor: "pointer", fontWeight: 600 }}>Sign in &rarr;</span>
          </div>
        )}
        <div style={{ fontSize: 11, color: "#9B9BAA", marginTop: 10 }}>Join makers already organizing their patterns with Wovely</div>
      </div>
    </div>
  );
};

/* ── Main Auth Component ── */
const Auth = ({ onEnter, onEnterAsNew }) => {
  const { isDesktop, isMobile } = useBreakpoint();

  return (
    <div style={{ minHeight: "100vh", fontFamily: T.sans, display: "flex", flexDirection: isMobile ? "column" : "row" }}>
      {/* Left — Product Preview */}
      <div style={{
        flex: isMobile ? "none" : 1.15,
        background: "rgba(243,238,255,0.45)",
        overflow: "auto",
        ...(isMobile ? {} : { minHeight: "100vh" }),
      }}>
        <ProductPreview />
      </div>

      {/* Right — Signup Form */}
      <div style={{
        flex: isMobile ? "none" : 0.85,
        background: "rgba(255,255,255,0.96)",
        borderLeft: isMobile ? "none" : "1px solid #EDE4F7",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        ...(isMobile ? { minHeight: "auto" } : { minHeight: "100vh" }),
      }}>
        <SignupForm onEnter={onEnter} onEnterAsNew={onEnterAsNew} />
      </div>
    </div>
  );
};

export default Auth;
