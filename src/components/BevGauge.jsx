import { T } from "../theme.jsx";

const NEEDLE_DEG = { pass: -130, warning: -90, issues: -50 };
const STATE_LABEL = { pass: "Looks Good", warning: "Heads Up", issues: "Issues Found" };
const LAVENDER = "#9B7EC8";

/**
 * Derive a state string from any BevCheck result shape.
 * New API returns result.state directly.
 * Old API returns result.overall ("valid"|"review"|"issues") + result.score.
 */
export const deriveState = (result) => {
  if (!result) return "warning";
  if (result.state === "pass" || result.state === "warning" || result.state === "issues") return result.state;
  // Compat: old format
  if (result.overall === "valid") return "pass";
  if (result.overall === "issues") return "issues";
  if (result.overall === "review") return "warning";
  // Fallback from score
  if (typeof result.score === "number") {
    if (result.score >= 80) return "pass";
    if (result.score >= 60) return "warning";
    return "issues";
  }
  return "warning";
};

const BevGauge = ({ state = "warning" }) => {
  const deg = NEEDLE_DEG[state] ?? -90;
  const label = STATE_LABEL[state] ?? "Heads Up";

  return (
    <div style={{ textAlign: "center" }}>
      <svg viewBox="0 0 200 110" style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>
        <defs>
          <linearGradient id="bevGaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F8F6FF" />
            <stop offset="50%" stopColor="#C9B8E8" />
            <stop offset="100%" stopColor="#9B7EC8" />
          </linearGradient>
          <clipPath id="bevGaugeClip"><circle cx="100" cy="82" r="22" /></clipPath>
        </defs>
        {/* Background arc */}
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="#EDE4F7" strokeWidth="14" strokeLinecap="round" />
        {/* Colored arc */}
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="url(#bevGaugeGrad)" strokeWidth="14" strokeLinecap="round" />
        {/* Bev image */}
        <image href="/bev_neutral.png" x="78" y="60" width="44" height="44" clipPath="url(#bevGaugeClip)" />
        {/* Needle */}
        <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: "100px 100px", transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <line x1="100" y1="100" x2="100" y2="28" stroke={LAVENDER} strokeWidth="2.5" strokeLinecap="round" />
        </g>
        {/* Pivot dot */}
        <circle cx="100" cy="100" r="6" fill={LAVENDER} />
        {/* Zone labels */}
        <text x="22" y="105" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif" fill={LAVENDER} opacity="0.5">Looks Good</text>
        <text x="75" y="18" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif" fill={LAVENDER} opacity="0.75">Heads Up</text>
        <text x="138" y="105" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif" fill={LAVENDER} opacity="1">Issues Found</text>
      </svg>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: LAVENDER, marginTop: 4 }}>{label}</div>
    </div>
  );
};

export default BevGauge;
