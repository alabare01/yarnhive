import { T } from "../theme.jsx";

// Pre-calculated needle endpoints from pivot (100,100), length 58px
// pass: 218deg → (100 + 58*cos(218°*π/180), 100 + 58*sin(218°*π/180)) ≈ (54, 64)
// warning: 270deg → (100, 42)
// issues: 322deg → (100 + 58*cos(322°*π/180), 100 + 58*sin(322°*π/180)) ≈ (146, 64)
export const NEEDLE_END = { pass: "54 64", warning: "100 42", issues: "146 64" };
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
  const needleEnd = NEEDLE_END[state] || NEEDLE_END.warning;
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
        {/* Needle */}
        <path d={`M 100 100 L ${needleEnd}`} stroke={LAVENDER} strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Pivot white backing */}
        <circle cx="100" cy="100" r="8" fill="#fff" />
        {/* Bev image */}
        <image href="/bev_neutral.png" x="82" y="60" width="36" height="36" clipPath="url(#bevGaugeClip)" />
        {/* Pivot dot */}
        <circle cx="100" cy="100" r="6" fill={LAVENDER} />
        {/* Heads Up label inside arc */}
        <text x="100" y="52" textAnchor="middle" fontSize="9" fontWeight="600" fill={LAVENDER} opacity={state === "warning" ? 1 : 0.5} fontFamily="Inter, sans-serif">Heads Up</text>
      </svg>
      {/* Zone labels row */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 280, margin: "4px auto 0" }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: state === "pass" ? 700 : 600, color: LAVENDER, opacity: state === "pass" ? 1 : 0.5 }}>Looks Good</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: state === "issues" ? 700 : 600, color: LAVENDER, opacity: state === "issues" ? 1 : 0.5 }}>Issues Found</span>
      </div>
      {/* State label */}
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#2D3A7C", marginTop: 4 }}>{label}</div>
    </div>
  );
};

export default BevGauge;
