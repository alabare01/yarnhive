// ─── SUPABASE AUTH (no package needed) ───────────────────────────────────────
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const APP_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://wovely.app";

export const saveSession = (s) => { try { if(s) localStorage.setItem("yh_session",JSON.stringify(s)); else localStorage.removeItem("yh_session"); } catch{} };
export const getSession = () => { try { const r=localStorage.getItem("yh_session"); return r?JSON.parse(r):null; } catch{return null;} };

export const supabaseAuth = {
  signUp: async (email, password) => {
    console.log("[Wovely] Signup request:", {supabaseUrl:SUPABASE_URL, redirectTo:APP_ORIGIN});
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:"POST", headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email, password, options:{emailRedirectTo:APP_ORIGIN}}),
    });
    const data = await res.json();
    console.log("[Wovely] Signup response:", {status:res.status, hasSession:!!data.session, confirmationSentAt:data.confirmation_sent_at||"none"});
    if(!res.ok) return {error: data};
    if(data.session) saveSession(data.session);
    return {data};
  },
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email, password}),
    });
    const data = await res.json();
    if(!res.ok) return {error: data};
    if(data.access_token) saveSession(data);
    return {data};
  },
  signOut: async () => {
    const s = getSession();
    if(s?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method:"POST", headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${s.access_token}`},
      });
    }
    saveSession(null);
  },
  getUser: () => {
    const s = getSession(); if(!s?.access_token) return null;
    try {
      const p = JSON.parse(atob(s.access_token.split(".")[1]));
      if(p.exp*1000 < Date.now()) { saveSession(null); return null; }
      return {id:p.sub, email:p.email};
    } catch { return null; }
  },
};
