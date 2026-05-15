import React, { useState, useEffect, useRef } from "react";
import { T, useBreakpoint } from "../theme.jsx";
import { useImportJobPolling } from "../hooks/useImportJobPolling.js";
import { REASSURANCE_LINE, pickPhaseCopy } from "../utils/importPhaseCopy.js";

// Floating import status pill. Mounts at App.jsx so it persists across navigation.
// Reads/writes sessionStorage key 'wovely_active_import_job' (string job id).
//
// Polling now lives in useImportJobPolling (shared with the in-modal flows in
// PDFUploadForm and ImageImportModal). The hook supplies job state, current
// phase, and elapsed-time ticking — the pill renders.
//
// States:
//   idle:        nothing rendered
//   processing:  Bev avatar + spinning ring + phase copy with elapsed/reference range
//   completed:   prominent pulse for 5s, then settle to "Tap to review"
//   failed:      "Bev got tangled — try again" with Try again action
//
// Tap behavior:
//   processing:  expands (inline card on desktop, modal sheet on mobile)
//   completed:   calls onTapReview({ jobId, fileType, extractedData, coverImageUrl, validationReport }) and clears sessionStorage
//   failed:      calls onTapTryAgain({ jobId, fileType }) and clears sessionStorage

const SESSION_KEY = "wovely_active_import_job";
const PROMINENT_DURATION_MS = 5000;

const PROMINENT_STYLE = {
  background: "linear-gradient(135deg, rgba(155,126,200,0.95), rgba(216,234,216,0.95))",
  border: `1px solid ${T.terra}`,
  boxShadow: `0 8px 32px rgba(155,126,200,0.35)`,
};

const SETTLED_STYLE = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.45)",
  boxShadow: "0 4px 24px rgba(45,58,124,0.08)",
};

export const setActiveImportJob = (jobId) => {
  try {
    if (jobId) sessionStorage.setItem(SESSION_KEY, jobId);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
};

export default function ImportPill({ onTapReview, onTapTryAgain }) {
  const { isMobile } = useBreakpoint();
  const [jobId, setJobId] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || null; } catch { return null; }
  });
  const [expanded, setExpanded] = useState(false);
  const [prominentUntil, setProminentUntil] = useState(0);
  const [tick, setTick] = useState(0); // local 1s tick to settle prominent window
  const [phaseCopy, setPhaseCopy] = useState(null);
  const lastPickedPhaseRef = useRef(null);

  // Watch sessionStorage for jobs added by other tabs / by AddPatternModal handoff.
  useEffect(() => {
    const checkInterval = setInterval(() => {
      try {
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored !== jobId) setJobId(stored || null);
      } catch {}
    }, 1000);
    return () => clearInterval(checkInterval);
  }, [jobId]);

  useEffect(() => {
    const intv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(intv);
  }, []);

  const polling = useImportJobPolling(jobId, {
    onMissing: () => { setActiveImportJob(null); setJobId(null); },
  });

  const { job, currentPhase, phaseElapsed, totalElapsed, isComplete, isFailed, isActive, validationReport, extractedData, coverImageUrl, fileType, retryCount, extractionMethod, errorMessage } = polling;

  // Detect the completed transition to set the prominent pulse window.
  useEffect(() => {
    if (isComplete) setProminentUntil(Date.now() + PROMINENT_DURATION_MS);
  }, [isComplete]);

  // Pick a new copy line when the phase changes. Stays stable within a phase
  // so we aren't shuffling text on every 3s poll.
  useEffect(() => {
    if (!currentPhase) return;
    if (currentPhase === lastPickedPhaseRef.current) return;
    const next = pickPhaseCopy(currentPhase);
    if (next) setPhaseCopy(next);
    lastPickedPhaseRef.current = currentPhase;
  }, [currentPhase]);

  const dismiss = () => {
    setActiveImportJob(null);
    setJobId(null);
    setExpanded(false);
  };

  const handleTap = () => {
    if (!job) return;
    if (isComplete) {
      onTapReview?.({ jobId: job.id, fileType, extractedData, coverImageUrl, validationReport });
      dismiss();
      return;
    }
    if (isFailed) {
      onTapTryAgain?.({ jobId: job.id, fileType });
      dismiss();
      return;
    }
    setExpanded(e => !e);
  };

  if (!jobId || !job) return null;
  if (!isActive && !isComplete && !isFailed) return null;

  const now = Date.now();
  const isProminent = isComplete && now < prominentUntil;
  const elapsedLabel = totalElapsed >= 60 ? `${Math.floor(totalElapsed / 60)}m ${totalElapsed % 60}s` : `${totalElapsed}s`;

  // ─── State copy ─────────────────────────────────────────────────────────────
  // Active state pulls from the phase copy pool (phaseCopy state, set on
  // phase transition). Sub is the persistent reassurance line. Elapsed
  // time, ETA, and progress bars are intentionally absent in Stage 1 —
  // Stage 2 reintroduces them once we have measured medians per phase.

  let title, sub, subAllowsWrap = false, ringSpinning = false;
  if (isActive) {
    title = phaseCopy || "Bev's on it...";
    sub = REASSURANCE_LINE;
    subAllowsWrap = true;
    ringSpinning = true;
  } else if (isComplete) {
    title = isProminent ? "Pattern ready!" : "Tap to review";
    sub = isProminent ? "Tap to review" : (fileType === "pdf" ? "PDF imported" : "Photo imported");
  } else if (isFailed) {
    title = "Bev got tangled";
    sub = errorMessage ? truncate(errorMessage, 80) : "Try again";
  }
  // tick is referenced via Date.now() above for prominent-window settle
  void tick;
  // phaseElapsed is no longer rendered in Stage 1 but the hook still returns
  // it; reference here so an unused-warning doesn't fire.
  void phaseElapsed;

  // ─── Layout / sizing ────────────────────────────────────────────────────────

  const baseWidth = isMobile ? 240 : 320;
  const expandedWidth = isMobile ? 280 : 380;
  const desktopRight = 24;
  const desktopBottom = 24;
  const mobileRight = 16;

  const containerStyle = {
    position: "fixed",
    bottom: isMobile ? `calc(16px + env(safe-area-inset-bottom, 0px))` : `${desktopBottom}px`,
    right: isMobile ? `${mobileRight}px` : `${desktopRight}px`,
    width: expanded ? expandedWidth : baseWidth,
    zIndex: 50,
    borderRadius: 16,
    padding: expanded ? 16 : 12,
    transition: "width .25s ease, padding .25s ease, transform .25s ease",
    cursor: "pointer",
    fontFamily: T.sans,
    color: isProminent ? "#FFFFFF" : T.ink,
    ...(isProminent ? PROMINENT_STYLE : SETTLED_STYLE),
    ...(isProminent && { animation: "wovelyPillPulse 1.2s ease-in-out infinite" }),
  };

  // Modal sheet for expanded mobile state — replaces inline expand
  if (isMobile && expanded) {
    return (
      <>
        <PillKeyframes />
        <div onClick={() => setExpanded(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)",
          zIndex: 49,
        }}/>
        <div style={{
          position: "fixed", left: 0, right: 0,
          bottom: `env(safe-area-inset-bottom, 0px)`,
          background: T.modal, borderRadius: "20px 20px 0 0",
          padding: "20px 20px 28px",
          zIndex: 50,
          boxShadow: "0 -8px 32px rgba(45,58,124,0.18)",
          fontFamily: T.sans,
        }}>
          <SheetContents
            job={job}
            fileType={fileType}
            extractionMethod={extractionMethod}
            errorMessage={errorMessage}
            retryCount={retryCount}
            elapsedLabel={elapsedLabel}
            phaseMessage={phaseCopy}
            isActive={isActive}
            isComplete={isComplete}
            isFailed={isFailed}
            onClose={() => setExpanded(false)}
            onTapReview={() => handleTap()}
            onTapTryAgain={() => handleTap()}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PillKeyframes />
      <div role="status" aria-live="polite" onClick={handleTap} style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BevAvatar spinning={ringSpinning} prominent={isProminent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div key={currentPhase || "_"} style={{
              fontSize: 13, fontWeight: 600,
              color: isProminent ? "#FFFFFF" : T.ink,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              animation: isActive ? "wovelyPhaseFade 200ms ease both" : undefined,
            }}>{title}</div>
            <div style={{
              fontSize: 11,
              color: isProminent ? "rgba(255,255,255,0.85)" : T.ink2,
              marginTop: 2,
              lineHeight: 1.35,
              ...(subAllowsWrap
                ? { whiteSpace: "normal", overflow: "visible" }
                : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }),
            }}>{sub}</div>
          </div>
          {isActive && (
            <div style={{
              fontSize: 11, color: T.ink3, fontVariantNumeric: "tabular-nums", flexShrink: 0,
            }}>{elapsedLabel}</div>
          )}
        </div>
        {expanded && !isMobile && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.ink2, lineHeight: 1.6 }}>
            <div><strong>Type:</strong> {fileType === "pdf" ? "PDF" : "Photo"}</div>
            <div><strong>Total elapsed:</strong> {elapsedLabel}</div>
            {currentPhase && <div><strong>Phase:</strong> {currentPhase}</div>}
            {extractionMethod && <div><strong>Method:</strong> {extractionMethod}</div>}
            {retryCount > 0 && <div><strong>Retries:</strong> {retryCount}</div>}
            {isFailed && (
              <button onClick={(e) => { e.stopPropagation(); handleTap(); }} style={{
                marginTop: 12, background: T.terra, color: "#FFF", border: "none", borderRadius: 10,
                padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
              }}>Try again</button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function PillKeyframes() {
  return (
    <style>{`
      @keyframes wovelyPillPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.025)} }
      @keyframes wovelyPillRing { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
      @keyframes wovelyPhaseFade { from{opacity:0;transform:translateY(2px)} to{opacity:1;transform:translateY(0)} }
    `}</style>
  );
}

function BevAvatar({ spinning, prominent }) {
  const size = 36;
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      {spinning && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: "50%",
          border: `2px solid transparent`,
          borderTopColor: prominent ? "rgba(255,255,255,0.9)" : T.terra,
          animation: "wovelyPillRing 1s linear infinite",
        }}/>
      )}
      <img
        src="/bev_neutral.png"
        alt="Bev"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function SheetContents({ job, fileType, extractionMethod, errorMessage, retryCount, elapsedLabel, phaseMessage, isActive, isComplete, isFailed, onClose, onTapReview, onTapTryAgain }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <BevAvatar spinning={isActive} prominent={false} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.ink, fontWeight: 600 }}>
            {isComplete ? "Pattern ready"
              : isFailed ? "Bev got tangled"
              : phaseMessage || "Working on it"}
          </div>
          <div style={{ fontSize: 12, color: T.ink2, marginTop: 2 }}>
            {fileType === "pdf" ? "PDF import" : "Photo import"}
          </div>
        </div>
        <button onClick={onClose} aria-label="close" style={{
          background: T.linen, border: "none", borderRadius: 99, width: 30, height: 30,
          cursor: "pointer", fontSize: 16, color: T.ink3,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      </div>

      <div style={{ background: T.linen, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 12, lineHeight: 1.7 }}>
        <Row label="Status" value={prettyStatus(job.status)} />
        <Row label="Elapsed" value={elapsedLabel} />
        {extractionMethod && <Row label="Method" value={extractionMethod} />}
        {retryCount > 0 && <Row label="Retries" value={String(retryCount)} />}
        {errorMessage && <Row label="Error" value={errorMessage} />}
      </div>

      {isComplete && (
        <button onClick={onTapReview} style={primaryBtn}>Review pattern →</button>
      )}
      {isFailed && (
        <button onClick={onTapTryAgain} style={primaryBtn}>Try again</button>
      )}
      {isActive && (
        <div style={{ fontSize: 11, color: T.ink3, textAlign: "center", paddingTop: 4 }}>
          You can navigate away — Bev will keep working in the background.
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ color: T.ink3, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{label}</span>
      <span style={{ color: T.ink, fontSize: 12, textAlign: "right", maxWidth: "65%", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

const primaryBtn = {
  width: "100%", background: T.terra, color: "#FFF", border: "none", borderRadius: 12,
  padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 4px 14px rgba(155,126,200,0.3)",
};

function truncate(s, n) {
  if (!s || s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function prettyStatus(s) {
  if (s === "pending") return "Queued";
  if (s === "processing") return "Processing";
  if (s === "completed") return "Completed";
  if (s === "failed") return "Failed";
  return s;
}
