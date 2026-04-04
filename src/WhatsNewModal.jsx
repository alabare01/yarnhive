import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBreakpoint } from "./theme.jsx";
import { supabaseAuth } from "./supabase.js";
import { CHANGELOG } from "./changelog.js";

const LS_KEY = "wv_whats_new_last_seen";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default function WhatsNewModal() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const user = supabaseAuth.getUser();
    if (!user) return;

    const last = localStorage.getItem(LS_KEY);
    if (last && Date.now() - new Date(last).getTime() < COOLDOWN_MS) return;

    setVisible(true);
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setEntered(false);
    setTimeout(() => {
      localStorage.setItem(LS_KEY, new Date().toISOString());
      setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentEntries = CHANGELOG.filter(entry => new Date(entry.date) >= sevenDaysAgo);
  const entries = recentEntries.length > 0 ? recentEntries : CHANGELOG.slice(0, 1);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const modal = (
    <>
      <style>{`
        @keyframes wnBackdropIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          zIndex: 300, animation: "wnBackdropIn .25s ease",
        }}
      />

      {/* Sheet / Card */}
      <div style={isMobile ? {
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301,
        background: "#fff", borderRadius: "24px 24px 0 0",
        maxHeight: "70vh", overflowY: "auto",
        transform: entered ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease-out",
      } : {
        position: "fixed", top: "50%", left: "50%", zIndex: 301,
        background: "#fff", borderRadius: 16,
        maxWidth: 480, width: "calc(100% - 48px)", maxHeight: "80vh", overflowY: "auto",
        transform: entered ? "translate(-50%, -50%)" : "translate(-50%, -50%)",
        opacity: entered ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #9B7EC8, #7B5EA8)",
          padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          borderRadius: isMobile ? "24px 24px 0 0" : "16px 16px 0 0",
        }}>
          <img src="/bev_neutral.png" alt="Bev" style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid white", objectFit: "cover" }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#fff", textAlign: "center" }}>What's New in Wovely 🎉</div>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center" }}>Here's what we've been building for you</div>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {entries.map((entry, i) => (
            <div key={entry.version}>
              {i > 0 && <div style={{ height: 1, background: "#EDE4F7", margin: "16px 0" }} />}
              <div style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 600, color: "#9B7EC8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                {formatDate(entry.date)}
              </div>
              {entry.updates.map((u, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, background: "#F8F6FF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{u.emoji}</div>
                  <div style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#2D2D4E", lineHeight: 1.4 }}>{u.text}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "0 20px 24px" }}>
          <button onClick={dismiss} style={{
            background: "#9B7EC8", color: "#fff", border: "none", borderRadius: 12,
            padding: 14, fontSize: 15, fontWeight: 600, width: "100%", cursor: "pointer",
            fontFamily: "Inter,sans-serif",
          }}>Got it, let's go! →</button>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
