import { T } from "../theme.jsx";

const NEEDLE_DEG = { pass: -142, warning: -90, issues: -38 };
const STATE_LABEL = { pass: "Looks Good", warning: "Heads Up", issues: "Issues Found" };
const LAVENDER = "#9B7EC8";
const ADVISORY_IDS = new Set(["translation", "structure"]);

/**
 * Derive a state string from any BevCheck result shape.
 * New API returns result.state directly.
 * Old API returns result.overall ("valid"|"review"|"issues") + result.score.
 */
export const deriveState = (result) => {
  if (!result) return "warning";
  if (result.state === "pass" || result.state === "warning" || result.state === "issues") return result.state;
  if (result.overall === "valid") return "pass";
  if (result.overall === "issues") return "issues";
  if (result.overall === "review") return "warning";
  if (typeof result.score === "number") {
    if (result.score >= 80) return "pass";
    if (result.score >= 60) return "warning";
    return "issues";
  }
  return "warning";
};

/** Sentence-case a label: uppercase first char, lowercase the rest */
export const sentenceCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

/** Determine tier with fallback to id-based lookup */
export const checkTier = (c) => c.tier || (ADVISORY_IDS.has(c.id) ? "advisory" : "core");

const BevGauge = ({ state = "warning" }) => {
  const deg = NEEDLE_DEG[state] ?? -90;
  const label = STATE_LABEL[state] ?? "Heads Up";

  return (
    <div style={{ textAlign: "center", background: "#F8F6FF", borderRadius: 12, padding: 20 }}>
      <svg viewBox="0 0 200 110" style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>
        <defs>
          <linearGradient id="bevGaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EDE4F7" />
            <stop offset="50%" stopColor="#C9B8E8" />
            <stop offset="100%" stopColor="#9B7EC8" />
          </linearGradient>
          <clipPath id="bevGaugeClip"><circle cx="100" cy="78" r="18" /></clipPath>
        </defs>
        {/* White edge arc */}
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round" />
        {/* Background arc */}
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="#EDE4F7" strokeWidth="18" strokeLinecap="round" />
        {/* Colored arc */}
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="url(#bevGaugeGrad)" strokeWidth="18" strokeLinecap="round" />
        {/* Bev image */}
        <image href="/bev_neutral.png" x="82" y="60" width="36" height="36" clipPath="url(#bevGaugeClip)" />
        {/* Needle */}
        <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: "100px 100px", transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <line x1="100" y1="100" x2="100" y2="42" stroke={LAVENDER} strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* Pivot white backing */}
        <circle cx="100" cy="100" r="8" fill="#fff" />
        {/* Pivot dot */}
        <circle cx="100" cy="100" r="6" fill={LAVENDER} />
      </svg>
      {/* Zone labels row */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 280, margin: "4px auto 0" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: state === "pass" ? 700 : 600, letterSpacing: 0.5, color: LAVENDER, opacity: state === "pass" ? 1 : 0.5 }}>Looks Good</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: state === "warning" ? 700 : 600, letterSpacing: 0.5, color: LAVENDER, opacity: state === "warning" ? 1 : 0.5 }}>Heads Up</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: state === "issues" ? 700 : 600, letterSpacing: 0.5, color: LAVENDER, opacity: state === "issues" ? 1 : 0.5 }}>Issues Found</span>
      </div>
      {/* State label */}
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#2D3A7C", marginTop: 4 }}>{label}</div>
    </div>
  );
};

export default BevGauge;
