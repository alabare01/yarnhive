import { useState, useEffect } from "react";
import { BADGE, badgeForScore, CHECK_ICON, displayScore } from "./StitchCheck.jsx";

const stageLabel = (job) => {
  if (job.status === "error") return "Something went wrong \u2014 try again";
  if (job.status === "done" || job.pct === 100) return "Pattern saved! \u2728";
  if (job.status === "review") return null;
  const p = job.pct || 0;
  if (p <= 10) return "Reading your file\u2026";
  if (p <= 30) return "Pulling it apart\u2026";
  if (p <= 60) return "Working on it\u2026";
  if (p <= 85) return "Building your workspace\u2026";
  if (p <= 99) return "Almost there\u2026";
  return "Almost there\u2026";
};

const BEV_CDN = "https://res.cloudinary.com/dmaupzhcx/image/upload/bev_neutral.png";
const T_terra = "#9B7EC8";
const T_navy = "#2D3A7C";
const T_linen = "#F8F6FF";
const T_border = "#EDE4F7";
const T_ink = "#2D2D4E";
const T_ink2 = "#6B6B8A";
const T_serif = "'Playfair Display',Georgia,serif";

const ImportProgressBanner = ({ job, onDismiss, onBannerSave, onBannerDiscard }) => {
  const [bevSrc, setBevSrc] = useState(BEV_CDN);
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    if (job.status === "done") {
      const t = setTimeout(onDismiss, 3000);
      return () => clearTimeout(t);
    }
  }, [job.status]);

  // ── REVIEW PHASE ──
  if (job.status === "review") {
    const vr = job.validationReport;
    const isPro = job.isPro;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: T_navy, padding: "12px 16px",
        fontFamily: "Inter,-apple-system,sans-serif", boxShadow: "0 4px 16px rgba(45,58,124,.3)",
      }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0, alignItems: isMobile ? "stretch" : "center" }}>
          {/* LEFT — Bev + title + buttons */}
          <div style={{ width: isMobile ? "auto" : 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)" }} />
                <img src={bevSrc} onError={() => { if (bevSrc !== "/bev_neutral.png") setBevSrc("/bev_neutral.png"); }} alt="" style={{ position: "absolute", inset: 3, borderRadius: "50%", width: "calc(100% - 6px)", height: "calc(100% - 6px)", objectFit: "cover" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T_serif, fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{job.patternTitle || "Untitled Pattern"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Looks good?</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={onBannerSave} style={{ background: T_terra, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✓ Save it</button>
              <button onClick={onBannerDiscard} style={{ background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ Discard</button>
            </div>
          </div>

          {/* CENTER DIVIDER */}
          {!isMobile && <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.15)", margin: "0 16px" }} />}

          {/* RIGHT — Stitch Check */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* STATE A — still running */}
            {!vr && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
                <style>{`@keyframes scBannerSpin{to{transform:rotate(360deg)}}`}</style>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "scBannerSpin 1s linear infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>Checking pattern\u2026</span>
              </div>
            )}
            {/* STATE B — Pro with report */}
            {vr && isPro && (() => {
              const scScore = displayScore(vr);
              const scBadge = badgeForScore(scScore);
              return (
                <div>
                  <div style={{ background: scBadge.bg, color: scBadge.color, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "2px 10px", display: "inline-block", marginBottom: 4 }}>{scScore}% {scBadge.label}</div>
                  {(vr.checks || []).slice(0, 3).map(c => (
                    <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 11 }}>{CHECK_ICON[c.status] || "\u2753"}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{c.label}</span>
                    </div>
                  ))}
                  <button onClick={() => setShowFullReport(true)} style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600, textDecoration: "underline", cursor: "pointer", marginTop: 6, background: "none", border: "none", padding: 0 }}>Full Report →</button>
                </div>
              );
            })()}
            {/* STATE C — Free user */}
            {vr && !isPro && (() => {
              const scScore = displayScore(vr);
              const scBadge = badgeForScore(scScore);
              return (
                <div>
                  <div style={{ background: scBadge.bg, color: scBadge.color, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "2px 10px", display: "inline-block", marginBottom: 4, filter: "blur(4px)", userSelect: "none" }}>{scScore}% {scBadge.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontStyle: "italic", marginTop: 4 }}>Upgrade to Pro to view full report</div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* FULL REPORT OVERLAY */}
        {showFullReport && vr && (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={() => setShowFullReport(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", zIndex: 1, background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "85vh", overflow: "auto", padding: "24px 22px 32px" }}>
              <button onClick={() => setShowFullReport(false)} style={{ position: "absolute", top: 14, right: 16, background: T_linen, border: "none", borderRadius: 99, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: T_ink2, display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
              <div style={{ fontFamily: T_serif, fontSize: 18, color: T_ink, marginBottom: 16 }}>Stitch Check Report</div>
              {(() => {
                const frScore = displayScore(vr);
                const frBadge = badgeForScore(frScore);
                return (
                  <div style={{ background: frBadge.bg, border: `2px solid ${frBadge.color}`, borderRadius: 14, padding: "16px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{frBadge.emoji}</div>
                    <div style={{ fontFamily: T_serif, fontSize: 18, fontWeight: 700, color: frBadge.color }}>{frBadge.label}</div>
                    <div style={{ fontFamily: T_serif, fontSize: 36, fontWeight: 700, color: frBadge.color, lineHeight: 1 }}>{frScore}%</div>
                  </div>
                );
              })()}
              {(vr.checks || []).map(c => (
                <div key={c.id} style={{ background: T_linen, border: `1px solid ${T_border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{CHECK_ICON[c.status] || "\u2753"}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: T_ink, marginBottom: 2 }}>{c.label}</div><div style={{ fontSize: 11, color: T_ink2, lineHeight: 1.5 }}>{c.detail}</div></div>
                </div>
              ))}
              {vr.summary && <div style={{ background: T_linen, borderRadius: 12, padding: "12px 14px", marginTop: 10, border: `1px solid ${T_border}` }}><div style={{ fontSize: 11, fontWeight: 700, color: T_terra, marginBottom: 4 }}>Bev says:</div><div style={{ fontSize: 12, color: T_ink2, lineHeight: 1.6 }}>{vr.summary}</div></div>}
              <button onClick={() => { setShowFullReport(false); onBannerSave?.(); }} style={{ marginTop: 14, width: "100%", background: T_terra, color: "#fff", border: "none", borderRadius: 99, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(155,126,200,.3)" }}>Save it →</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PROCESSING / DONE / ERROR PHASE ──
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, height: 64,
      background: "#9B7EC8", display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
      fontFamily: "Inter,-apple-system,sans-serif", boxShadow: "0 4px 16px rgba(155,126,200,.3)",
    }}>
      <style>{`@keyframes bevSpin{to{transform:rotate(360deg)}}`}</style>

      {/* Bev spinner */}
      <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2.5px solid rgba(255,255,255,0.25)", borderTopColor: "#fff",
          animation: "bevSpin 1s linear infinite",
        }} />
        <img src={bevSrc} onError={() => { if (bevSrc !== "/bev_neutral.png") setBevSrc("/bev_neutral.png"); }} alt="" style={{ position: "absolute", inset: 4, borderRadius: "50%", width: "calc(100% - 8px)", height: "calc(100% - 8px)", objectFit: "cover" }} />
      </div>

      {/* Center: label + progress bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {stageLabel(job)}
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.2)", height: 3, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ background: "#fff", height: "100%", borderRadius: 2, width: `${job.pct || 0}%`, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Right: status indicator or dismiss */}
      {job.status === "running" && (
        <button onClick={onDismiss} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 20,
          cursor: "pointer", padding: "4px 8px", flexShrink: 0, lineHeight: 1,
        }}>&times;</button>
      )}
      {job.status === "done" && (
        <div style={{
          background: "rgba(92,158,122,0.3)", borderRadius: 99, padding: "4px 12px",
          fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0, maxWidth: 180,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          ✓ Saved!{job.patternTitle ? ` — ${job.patternTitle}` : ""}
        </div>
      )}
      {job.status === "error" && (
        <button onClick={onDismiss} style={{
          background: "rgba(192,90,90,0.3)", borderRadius: 99, padding: "4px 12px",
          fontSize: 12, fontWeight: 600, color: "#fff", border: "none", cursor: "pointer", flexShrink: 0,
        }}>Import failed</button>
      )}
    </div>
  );
};

export default ImportProgressBanner;
