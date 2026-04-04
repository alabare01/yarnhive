import { useState, useEffect, useRef } from "react";
import { T, useBreakpoint } from "./theme.jsx";

const COLORS = {
  lavender: "#9B7EC8",
  navy: "#2D3A7C",
  border: "#EDE4F7",
  text: "#2D2D4E",
  lightBg: "#F8F6FF",
};

const CATEGORIES = [
  { label: "Bug 🐛", value: "Bug" },
  { label: "Idea 💡", value: "Idea" },
  { label: "Love it ❤️", value: "Love it" },
];

export default function FeedbackWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { isMobile } = useBreakpoint();
  const backdropRef = useRef(null);

  // Auto-close after success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setCategory("");
      setMessage("");
    }, 3000);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async () => {
    if (!category || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/send-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || null,
          email: user?.email || null,
          category,
          message: message.trim(),
          page: window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSuccess(true);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (success) return;
    setOpen(false);
    setError("");
  };

  const canSubmit = category && message.trim() && !sending;

  // Heart button
  const heartBtn = (
    <button
      onClick={() => { setOpen(true); setSuccess(false); setError(""); }}
      aria-label="Send feedback"
      style={{
        position: "fixed",
        top: 14,
        right: 20,
        zIndex: 9999,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        animation: "heartPulse 3s ease-in-out infinite",
      }}
    >
      <svg width="26" height="24" viewBox="0 0 26 24" fill={COLORS.lavender} xmlns="http://www.w3.org/2000/svg">
        <path d="M13 24C12.7 24 12.4 23.9 12.2 23.7C11.5 23.1 10.8 22.5 10.2 22L10.1 21.9C7.1 19.2 4.6 16.9 2.8 14.7C0.8 12.2 0 9.9 0 7.4C0 5 0.8 2.8 2.3 1.2C3.8 -0.4 5.8 -0.4 7.3 0.3C8.4 0.8 9.4 1.5 10.2 2.4C10.8 3.1 11.3 3.8 11.7 4.6C11.9 5 12.1 5.4 12.3 5.8C12.5 6.2 12.7 6.2 13 6.2C13.3 6.2 13.5 6.2 13.7 5.8C13.9 5.4 14.1 5 14.3 4.6C14.7 3.8 15.2 3.1 15.8 2.4C16.6 1.5 17.6 0.8 18.7 0.3C20.2 -0.4 22.2 -0.4 23.7 1.2C25.2 2.8 26 5 26 7.4C26 9.9 25.2 12.2 23.2 14.7C21.4 16.9 18.9 19.2 15.9 21.9L15.8 22C15.2 22.5 14.5 23.1 13.8 23.7C13.6 23.9 13.3 24 13 24Z"/>
      </svg>
    </button>
  );

  // Form contents
  const formContent = success ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", gap: 16 }}>
      <img src="/bev_neutral.png" alt="Bev" style={{ width: 120, height: "auto" }} />
      <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: COLORS.text, textAlign: "center" }}>
        Thanks for helping us grow!
      </div>
      <div style={{ fontSize: 14, color: "#6B6B8A", textAlign: "center" }}>
        We read every single one.
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 24px 24px" }}>
      {/* Header */}
      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: COLORS.text, textAlign: "center", paddingTop: 20 }}>
        Share your thoughts 🐍
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {CATEGORIES.map(c => {
          const sel = category === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              style={{
                background: sel ? COLORS.lavender : "#fff",
                color: sel ? "#fff" : COLORS.lavender,
                border: `1.5px solid ${sel ? COLORS.lavender : COLORS.border}`,
                borderRadius: 99,
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.sans,
                transition: "all .15s ease",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Textarea */}
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Tell us what's on your mind..."
        rows={4}
        style={{
          width: "100%",
          resize: "vertical",
          border: `1.5px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: "12px 14px",
          fontSize: 14,
          fontFamily: T.sans,
          color: COLORS.text,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color .15s ease",
        }}
        onFocus={e => e.target.style.borderColor = COLORS.lavender}
        onBlur={e => e.target.style.borderColor = COLORS.border}
      />

      {/* Error */}
      {error && (
        <div style={{ color: "#C05A5A", fontSize: 13, textAlign: "center" }}>{error}</div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: "100%",
          background: canSubmit ? COLORS.lavender : "#B0AEC4",
          color: "#fff",
          border: "none",
          borderRadius: 99,
          padding: "14px 0",
          fontSize: 15,
          fontWeight: 600,
          cursor: canSubmit ? "pointer" : "default",
          fontFamily: T.sans,
          opacity: sending ? 0.7 : 1,
          transition: "all .15s ease",
        }}
      >
        {sending ? "Sending..." : "Send Feedback"}
      </button>
    </div>
  );

  // Backdrop + modal
  const overlay = open ? (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(28, 23, 20, 0.45)",
          zIndex: 201,
          animation: "fadeIn .2s ease",
        }}
      />

      {isMobile ? (
        /* Mobile bottom sheet */
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 202,
            background: "#fff",
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -8px 32px rgba(45,45,78,.15)",
            animation: "slideUp .3s ease",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 36, height: 4, background: COLORS.border, borderRadius: 99 }} />
          </div>
          {formContent}
        </div>
      ) : (
        /* Desktop centered card */
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 202,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 12px 48px rgba(45,45,78,.18)",
            width: "100%",
            maxWidth: 420,
            animation: "modalPop .25s ease",
            overflowY: "auto",
            maxHeight: "85vh",
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: 12,
              right: 14,
              background: "none",
              border: "none",
              fontSize: 20,
              color: "#6B6B8A",
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
          {formContent}
        </div>
      )}
    </>
  ) : null;

  // Inject keyframes
  const style = (
    <style>{`
      @keyframes heartPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `}</style>
  );

  return (
    <>
      {style}
      {heartBtn}
      {overlay}
    </>
  );
}
