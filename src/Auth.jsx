import { useState, useRef, useEffect } from "react";
import { T, useBreakpoint, Field } from "./theme.jsx";
import { supabaseAuth, getSession, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";
import { PHOTOS, APP_VERSION } from "./constants.js";

const BeeAnimator = ({visible, isDesktop}) => {
  const size = isDesktop ? 52 : 42;
  const W = isDesktop ? 440 : 370;
  const H = isDesktop ? 200 : 170;
  const canvasRef=useRef(null);
  const beeRef=useRef(null);
  const pathRef=useRef(null);

  useEffect(()=>{
    if(!visible)return;
    // Generate random bezier control points
    const rnd=(min,max)=>Math.round(min+Math.random()*(max-min));
    const pts=[
      {x:W+size, y:rnd(H*.2,H*.8)},
      {x:rnd(W*.6,W*.9), y:rnd(0,H*.3)},
      {x:rnd(W*.3,W*.6), y:rnd(0,H*.25)},
      {x:rnd(W*.1,W*.4), y:rnd(H*.15,H*.5)},
      {x:rnd(W*.05,W*.2), y:rnd(H*.6,H*.85)},
      {x:rnd(W*.02,W*.15), y:rnd(H*.8,H*.95)},
    ];
    pathRef.current=pts;
    const bezier=(pts,t)=>{let p=[...pts];while(p.length>1){const next=[];for(let i=0;i<p.length-1;i++)next.push({x:p[i].x+(p[i+1].x-p[i].x)*t,y:p[i].y+(p[i+1].y-p[i].y)*t});p=next;}return p[0];};
    const trail=[];
    let start=null;const dur=4500;
    const animate=(ts)=>{
      if(!start)start=ts;
      const elapsed=ts-start;
      const t=Math.min(elapsed/dur,1);
      const eased=t<.5?2*t*t:(1-Math.pow(-2*t+2,2)/2);
      const pos=bezier(pts,eased);
      if(beeRef.current){
        beeRef.current.style.transform=`translate(${pos.x}px,${pos.y}px)`;
        beeRef.current.style.opacity=t<.03?"0":"1";
      }
      // Leave trail dots
      if(canvasRef.current&&t>0.03){
        const dot=document.createElement("div");
        dot.style.cssText=`position:absolute;left:${pos.x+size/2}px;top:${pos.y+size/2}px;width:3px;height:3px;border-radius:50%;background:#9B7EC8;opacity:0.6;pointer-events:none;transition:opacity 1.5s ease;`;
        canvasRef.current.appendChild(dot);
        trail.push(dot);
        requestAnimationFrame(()=>{dot.style.opacity="0";});
        setTimeout(()=>{if(dot.parentNode)dot.parentNode.removeChild(dot);},1600);
      }
      if(t<1)requestAnimationFrame(animate);
    };
    const delay=setTimeout(()=>requestAnimationFrame(animate),850);
    return ()=>{clearTimeout(delay);trail.forEach(d=>{if(d.parentNode)d.parentNode.removeChild(d);});};
  },[visible,W,H,size]);

  return (
    <div style={{width:W,height:H,marginBottom:-(H-26),position:"relative",zIndex:2,pointerEvents:"none",flexShrink:0,opacity:visible?1:0,transition:"opacity .3s ease"}}>
      <div ref={canvasRef} style={{position:"absolute",inset:0}}/>
      <div ref={beeRef} style={{position:"absolute",top:0,left:0,fontSize:size,lineHeight:1,userSelect:"none",opacity:0,willChange:"transform"}}>🧶</div>
    </div>
  );
};

const FormCard = ({cardStyle,isSignup,email,setEmail,pass,setPass,confirmPass,setConfirmPass,authError,handleAuth,loading,onBack}) => {
  const mismatch = isSignup && confirmPass.length > 0 && pass !== confirmPass;
  const signupDisabled = isSignup && (pass !== confirmPass || !confirmPass);
  const onKey = e => { if(e.key==="Enter"&&!loading&&!(isSignup&&signupDisabled)) handleAuth(); };
  return (
  <div style={cardStyle}>
    <button onClick={onBack} style={{background:"none",border:"none",color:T.terra,cursor:"pointer",fontSize:13,fontWeight:600,padding:0,marginBottom:24,display:"flex",alignItems:"center",gap:6}}>← Back</button>
    <div style={{textAlign:"center",marginBottom:8}}>
      {isSignup&&<div style={{fontSize:11,color:T.ink3,fontWeight:500,letterSpacing:".06em",marginBottom:6}}>Step 1 of 2</div>}
      <div style={{fontFamily:T.serif,fontSize:26,color:T.ink,letterSpacing:"-.02em",fontWeight:700}}>{isSignup?"Create account":"Welcome back"}</div>
      <p style={{fontSize:13,color:T.ink3,marginTop:4,fontWeight:300}}>{isSignup?"Start your pattern collection":"Your Wovely is waiting"}</p>
    </div>
    <div style={{marginTop:20}} onKeyDown={onKey}>
      <Field label="Email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
      <div style={isSignup?{opacity:1}:undefined}><Field label="Password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} type="password"/></div>
      {isSignup&&<>
        <Field label="Confirm password" placeholder="••••••••" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} type="password"/>
        {mismatch&&<div style={{fontSize:12,color:T.terra,marginTop:-8,marginBottom:10}}>Passwords don't match</div>}
      </>}
      {!isSignup&&<div style={{textAlign:"right",marginBottom:16}}><span style={{fontSize:12,color:T.terra,cursor:"pointer",fontWeight:500}}>Forgot password?</span></div>}
      {authError&&<div style={{background:T.terraLt,border:"1px solid rgba(155,126,200,.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:T.terra,lineHeight:1.5,marginBottom:8}}>{authError}</div>}
      <button onClick={handleAuth} disabled={loading||(isSignup&&signupDisabled)} style={{width:"100%",background:`linear-gradient(135deg,${T.terra},#6B52A3)`,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 24px rgba(155,126,200,.45)",marginTop:8,opacity:(loading||(isSignup&&signupDisabled))?.5:1}}>{loading?"Please wait…":isSignup?"Create my Wovely":"Sign in"}</button>
    </div>
  </div>
  );
};

export const WaitlistPopup = () => {
  const [show,setShow]=useState(false),[wlEmail,setWlEmail]=useState(""),[wlPhone,setWlPhone]=useState(""),[submitted,setSubmitted]=useState(false),[saving,setSaving]=useState(false);
  useEffect(()=>{
    if(getSession()) return;
    if(document.cookie.includes("wovely_authed=1")) return;
    if(localStorage.getItem("yh_popup_dismissed")==="1") return;
    const last=parseInt(localStorage.getItem("yh_popup_last_shown")||"0",10);
    if(Date.now()-last<86400000) return;
    const t=setTimeout(()=>{setShow(true);localStorage.setItem("yh_popup_last_shown",String(Date.now()));},3000);
    return ()=>clearTimeout(t);
  },[]);
  const handleSubmit=async()=>{
    if(!wlEmail.trim())return;
    setSaving(true);
    try{await fetch(`${SUPABASE_URL}/rest/v1/waitlist`,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({email:wlEmail.trim(),phone:wlPhone.trim()||null,platform:"web_popup"})});}catch{}
    setSaving(false);setSubmitted(true);
    setTimeout(()=>setShow(false),2000);
  };
  const dismiss=()=>{setShow(false);localStorage.setItem("yh_popup_dismissed","1");};
  if(!show)return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={dismiss} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)"}}/>
      <div className="fu" style={{position:"relative",zIndex:1,background:T.modal,borderRadius:20,padding:40,maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(155,126,200,.2)"}}>
        <button onClick={dismiss} style={{position:"absolute",top:14,right:16,background:"none",border:"none",color:T.ink3,fontSize:20,cursor:"pointer"}}>×</button>
        {submitted?<div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:40,marginBottom:12}}>🧶</div><div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink}}>You're on the list!</div><div style={{fontSize:14,color:T.ink3,marginTop:8}}>We'll be in touch.</div></div>:(
          <>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontFamily:T.serif,fontSize:26,fontWeight:700,color:T.ink,lineHeight:1.2}}>Your next favorite pattern is waiting.</div>
              <div style={{fontSize:14,color:T.ink3,marginTop:8,lineHeight:1.6}}>Get your first month of Pro free when we launch. No credit card needed.</div>
            </div>
            <div style={{marginBottom:12}}><input value={wlEmail} onChange={e=>setWlEmail(e.target.value)} placeholder="your@email.com" type="email" style={{width:"100%",padding:"13px 16px",background:"transparent",border:"none",borderBottom:"2px solid transparent",borderRadius:0,color:T.ink,fontSize:15,outline:"none",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderBottomColor=T.terra} onBlur={e=>e.target.style.borderBottomColor="transparent"}/></div>
            <div style={{marginBottom:16}}><input value={wlPhone} onChange={e=>setWlPhone(e.target.value)} placeholder="(555) 123-4567" type="tel" style={{width:"100%",padding:"13px 16px",background:"transparent",border:"none",borderBottom:"2px solid transparent",borderRadius:0,color:T.ink,fontSize:15,outline:"none",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderBottomColor=T.terra} onBlur={e=>e.target.style.borderBottomColor="transparent"}/></div>
            <button onClick={handleSubmit} disabled={saving} style={{width:"100%",background:T.terra,color:"#fff",border:"none",borderRadius:9999,padding:"15px",fontSize:14,fontWeight:600,cursor:"pointer",opacity:saving?.6:1}}>{saving?"Joining…":"Claim my free month →"}</button>
          </>
        )}
      </div>
    </div>
  );
};

const Auth = ({onEnter,onEnterAsNew}) => {
  const [screen,setScreen]=useState("welcome"),[email,setEmail]=useState(""),[pass,setPass]=useState(""),[confirmPass,setConfirmPass]=useState("");
  const [loading,setLoading]=useState(false),[authError,setAuthError]=useState(null);
  const{isDesktop}=useBreakpoint();

  const handleAuth = async () => {
    setAuthError(null);
    if (!email.trim() || !pass) { setAuthError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      if (screen === "signup") {
        const {data, error} = await supabaseAuth.signUp(email.trim(), pass);
        if (error) { setAuthError(error.msg || error.error_description || error.message || "Sign-up failed."); setLoading(false); return; }
        // If email confirmation required, sign in immediately anyway
        if (data && !data.session) {
          const {error: signInErr} = await supabaseAuth.signIn(email.trim(), pass);
          if (signInErr) { setAuthError(signInErr.error_description || signInErr.msg || signInErr.message || "Sign-up succeeded but sign-in failed."); setLoading(false); return; }
        }
        onEnterAsNew();
      } else {
        const {data, error} = await supabaseAuth.signIn(email.trim(), pass);
        if (error) { setAuthError(error.error_description || error.msg || error.message || "Invalid email or password."); setLoading(false); return; }
        onEnter();
      }
    } catch (e) {
      setAuthError("Network error — please try again.");
    }
    setLoading(false);
  };

  const isSignup=screen==="signup";
  const showForm=screen==="signup"||screen==="signin";
  const BG = "/wovely_landing_bg_v1.png";

  const CARD_STYLE = {
    background: isDesktop ? "rgba(250,247,243,0.88)" : "rgba(250,247,243,0.78)",
    backdropFilter:"blur(36px) saturate(1.6) brightness(1.05)",
    WebkitBackdropFilter:"blur(36px) saturate(1.6) brightness(1.05)",
    borderRadius:28,
    boxShadow:"0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.45) inset, 0 2px 0 rgba(255,255,255,0.7) inset",
    border:"1px solid rgba(255,255,255,0.38)",
    padding: isDesktop ? "44px 48px 40px" : "28px 24px 32px",
    width:"100%",
    maxWidth: isDesktop ? 420 : 360,
    position:"relative",
  };

  const Badges = ({onBadgeClick}) => (
    <div style={{marginTop:18}}>
      <div style={{fontSize:9,color:T.ink3,textTransform:"uppercase",letterSpacing:".12em",marginBottom:8,fontWeight:600,textAlign:"center"}}>Coming to mobile</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div onClick={()=>onBadgeClick('ios')} style={{background:"#000",borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity='.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:7,color:"rgba(255,255,255,.45)",letterSpacing:".07em",lineHeight:1}}>DOWNLOAD ON THE</div>
            <div style={{fontSize:13,fontWeight:600,color:"#fff",lineHeight:1.25}}>App Store</div>
          </div>
          <div style={{fontSize:8,color:"rgba(255,255,255,.35)",border:"1px solid rgba(255,255,255,.15)",borderRadius:5,padding:"2px 6px"}}>Soon</div>
        </div>
        <div onClick={()=>onBadgeClick('android')} style={{background:"#000",borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 12px rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity='.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4.5 21.5L13.5 12L4.5 2.5C4 2.8 3.5 3.4 3.5 4.2v15.6c0 .8.5 1.4 1 1.7z" fill="#4285F4"/>
            <path d="M17 15.5L14 13.8 13.5 12 14 10.2 17 8.5 20.5 10.5c1 .6 1 1.4 0 2L17 15.5z" fill="#FBBC05"/>
            <path d="M4.5 21.5L13.5 12 17 15.5 6.5 21.2c-.8.4-1.6.3-2-.3z" fill="#EA4335"/>
            <path d="M4.5 2.5L13.5 12 17 8.5 6.5 2.8c-.8-.4-1.6-.3-2 .3-.1.1-.1.2 0 .4z" fill="#34A853"/>
          </svg>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:7,color:"rgba(255,255,255,.45)",letterSpacing:".07em",lineHeight:1}}>GET IT ON</div>
            <div style={{fontSize:13,fontWeight:600,color:"#fff",lineHeight:1.25}}>Google Play</div>
          </div>
          <div style={{fontSize:8,color:"rgba(255,255,255,.35)",border:"1px solid rgba(255,255,255,.15)",borderRadius:5,padding:"2px 6px"}}>Soon</div>
        </div>
      </div>
    </div>
  );

  /* ── Tier / App Store info modals ── */
  const ICON = {
    yarn: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 6.5 17.5M2.5 8.5A10 10 0 0 1 19 19M2 12h4M18 12h4M12 2v4M12 18v4"/></svg>,
    sparkle: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
    apple: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>,
    googleplay: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4.5 21.5L13.5 12L4.5 2.5C4 2.8 3.5 3.4 3.5 4.2v15.6c0 .8.5 1.4 1 1.7z" fill="#4285F4"/><path d="M17 15.5L14 13.8 13.5 12 14 10.2 17 8.5 20.5 10.5c1 .6 1 1.4 0 2L17 15.5z" fill="#FBBC05"/><path d="M4.5 21.5L13.5 12 17 15.5 6.5 21.2c-.8.4-1.6.3-2-.3z" fill="#EA4335"/><path d="M4.5 2.5L13.5 12 17 8.5 6.5 2.8c-.8-.4-1.6-.3-2 .3-.1.1-.1.2 0 .4z" fill="#34A853"/></svg>,
  };

  const MODALS = {
    free: {
      icon: ICON.yarn,
      iconBg: T.terraLt,
      iconColor: T.terra,
      title:"Start for Free",
      subtitle:"Everything you need to get started — no credit card required.",
      gradient: null,
      features:[
        {label:"5 pattern slots",sub:"Save your favorite patterns and track progress"},
        {label:"Snap & Stitch scans",sub:"3 free photo-to-pattern scans per month"},
        {label:"Full calculator suite",sub:"Gauge, yardage, resize — all unlocked"},
        {label:"Yarn stash tracker",sub:"Know exactly what you have before you buy"},
        {label:"All import methods",sub:"URL, PDF, manual entry — use them all"},
      ],
      cta:"Create free account",
      ctaAction: "signup",
      footnote:"Upgrade to Pro anytime — your patterns come with you.",
    },
    pro: {
      icon: ICON.sparkle,
      iconBg: `linear-gradient(145deg,${T.terra},#5A3F8F)`,
      iconColor: "#fff",
      title:"Wovely Pro",
      subtitle:"Unlimited everything. Built for makers who are serious about their craft.",
      gradient: `linear-gradient(145deg,${T.terra},#5A3F8F)`,
      features:[
        {label:"Unlimited patterns",sub:"No cap. Save every pattern you'll ever make"},
        {label:"Unlimited Snap & Stitch",sub:"Scan as many finished objects as you want"},
        {label:"Cloud sync",sub:"Access your Wovely on every device, always in sync"},
        {label:"Ask Bev",sub:"Get AI-powered help for any row you're stuck on"},
        {label:"Advanced analytics",sub:"Track your making history and stash usage"},
        {label:"Early access",sub:"First to get every new feature we ship"},
      ],
      cta:"Get Pro — $9.99/mo",
      ctaAlt:"$74.99/yr — save 37%",
      ctaAction: "signup",
      footnote:"Cancel anytime. No questions asked.",
    },
    ios: {
      icon: ICON.apple,
      iconBg: "#000",
      iconColor: "#fff",
      title:"Wovely for iPhone",
      subtitle:"The full Wovely experience in your pocket — coming to the App Store.",
      gradient: null,
      features:[
        {label:"Camera-first Snap & Stitch",sub:"Point, tap, get a pattern — right from your camera"},
        {label:"Row reminders",sub:"Never lose your place with smart row notifications"},
        {label:"Offline mode",sub:"Access your patterns anywhere, no signal needed"},
        {label:"Seamless sync",sub:"Start on web, continue on mobile — everything syncs"},
      ],
      cta:"Notify me when it's live",
      ctaAction: "notify",
      badge:"Coming Soon",
      footnote:"Be first in line — we'll email you the day it launches.",
    },
    android: {
      icon: ICON.googleplay,
      iconBg: "#fff",
      iconColor: "#000",
      title:"Wovely for Android",
      subtitle:"Everything iPhone gets, built natively for Android — coming to Google Play.",
      gradient: null,
      features:[
        {label:"Native camera scanner",sub:"Snap & Stitch built right into the Android experience"},
        {label:"Row reminders",sub:"Smart notifications keep you on track"},
        {label:"Offline mode",sub:"Your patterns are always available, signal or not"},
        {label:"Cross-device sync",sub:"Web, iOS, Android — one Wovely everywhere"},
      ],
      cta:"Notify me when it's live",
      ctaAction: "notify",
      badge:"Coming Soon",
      footnote:"We'll let you know the moment it hits Google Play.",
    },
  };

  const [activeModal, setActiveModal] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const modal = activeModal ? MODALS[activeModal] : null;

  // Swipe-to-close state
  const swipeStartY = useRef(null);
  const sheetRef = useRef(null);

  const closeModal = () => { setActiveModal(null); setNotifyEmail(''); setNotifySubmitted(false); setNotifyLoading(false); };

  const handleSwipeStart = e => { swipeStartY.current = e.touches?.[0]?.clientY ?? null; };
  const handleSwipeMove = e => {
    if (swipeStartY.current === null || !sheetRef.current) return;
    const dy = (e.touches?.[0]?.clientY ?? 0) - swipeStartY.current;
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const handleSwipeEnd = e => {
    if (swipeStartY.current === null || !sheetRef.current) return;
    const dy = (e.changedTouches?.[0]?.clientY ?? 0) - swipeStartY.current;
    if (dy > 80) { closeModal(); }
    else { sheetRef.current.style.transform = 'translateY(0)'; sheetRef.current.style.transition = 'transform .25s ease'; setTimeout(()=>{ if(sheetRef.current) sheetRef.current.style.transition = ''; }, 250); }
    swipeStartY.current = null;
  };

  const handleNotifySubmit = async () => {
    if (!notifyEmail.trim() || !notifyEmail.includes('@')) return;
    setNotifyLoading(true);
    try {
      await fetch('https://vbtsdyxvqqwxjzpuseaf.supabase.co/functions/v1/waitlist', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({email: notifyEmail.trim().toLowerCase(), platform: activeModal}),
      });
    } catch(e) { console.error('Waitlist:', e); }
    setNotifyLoading(false);
    setNotifySubmitted(true);
  };

  const handleModalCTA = () => {
    if (modal.ctaAction === 'signup') { closeModal(); setScreen('signup'); }
  };

  const WelcomeCard = () => (
    <div style={CARD_STYLE}>

      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:9,background:"rgba(155,126,200,.09)",borderRadius:14,padding:"7px 16px",border:"1px solid rgba(155,126,200,.18)"}}>
          <img src="/bev_neutral.png" alt="Bev" style={{width:40,height:40,objectFit:"contain"}}/>
          <div style={{fontFamily:T.serif,fontSize:20,fontWeight:700,color:T.ink,letterSpacing:"-.02em",lineHeight:1}}>Wovely</div>
        </div>
      </div>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontFamily:T.serif,fontSize:isDesktop?34:28,fontWeight:700,color:T.ink,lineHeight:1.05,letterSpacing:"-.025em",marginBottom:8}}>
          The pattern<br/>
          <span style={{fontStyle:"italic",fontWeight:400,color:T.terra}}>you've been</span><br/>
          looking for.
        </div>
        <p style={{fontSize:13,color:T.ink3,lineHeight:1.65,fontWeight:300,margin:0}}>Save every pattern. Track every row.<br/>Scan anything with Snap & Stitch.</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
        <button onClick={()=>setScreen("signup")} style={{width:"100%",background:`linear-gradient(135deg,${T.terra} 0%,#6B52A3 100%)`,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 28px rgba(155,126,200,.5), 0 1px 0 rgba(255,255,255,.2) inset",letterSpacing:".01em",transition:"transform .15s,box-shadow .15s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 14px 36px rgba(155,126,200,.6), 0 1px 0 rgba(255,255,255,.2) inset";}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 8px 28px rgba(155,126,200,.5), 0 1px 0 rgba(255,255,255,.2) inset";}}>Create free account</button>
        <button onClick={()=>setScreen("signin")} style={{width:"100%",background:"rgba(255,255,255,0.55)",color:T.ink,border:"1px solid rgba(255,255,255,0.7)",borderRadius:14,padding:"14px",fontSize:14,fontWeight:500,cursor:"pointer",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",boxShadow:"0 2px 8px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,.6) inset",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.82)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.55)";}}>Sign in</button>
        <button onClick={onEnter} style={{background:"none",border:"none",color:"rgba(92,79,68,0.6)",fontSize:12,cursor:"pointer",padding:"2px 0"}}>Continue without account →</button>
      </div>
      <div style={{height:"1px",background:"rgba(28,23,20,.07)",margin:"2px 0 14px"}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:2}}>
        <div onClick={()=>setActiveModal('free')} style={{background:"rgba(244,237,227,0.75)",backdropFilter:"blur(8px)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.6)",textAlign:"center",cursor:"pointer",transition:"transform .15s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
          <div style={{fontFamily:T.serif,fontSize:20,color:T.terra,fontWeight:700,lineHeight:1}}>Free</div>
          <div style={{fontSize:10,color:T.ink3,marginTop:4,lineHeight:1.4}}>5 patterns<br/>All core features</div>
          <div style={{fontSize:9,color:T.terra,marginTop:6,fontWeight:600,letterSpacing:".05em"}}>SEE WHAT'S INCLUDED →</div>
        </div>
        <div onClick={()=>setActiveModal('pro')} style={{background:`linear-gradient(145deg,${T.terra},#5A3F8F)`,borderRadius:14,padding:"12px 14px",textAlign:"center",boxShadow:"0 6px 20px rgba(155,126,200,.5)",position:"relative",overflow:"hidden",cursor:"pointer",transition:"transform .15s"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"linear-gradient(135deg,rgba(255,255,255,0) 30%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0) 70%)",pointerEvents:"none"}}/>
          <div style={{position:"absolute",top:10,right:-20,background:"rgba(255,255,255,0.18)",padding:"3px 28px",transform:"rotate(35deg)",fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.9)",letterSpacing:".06em",whiteSpace:"nowrap"}}>SNAP & STITCH</div>
          <div style={{fontFamily:T.serif,fontSize:20,color:"#fff",fontWeight:700,lineHeight:1,position:"relative"}}>Pro</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:4,lineHeight:1.4,position:"relative"}}>$9.99/mo<br/>Unlimited everything</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,.75)",marginTop:6,fontWeight:600,letterSpacing:".05em",position:"relative"}}>SEE WHAT'S INCLUDED →</div>
        </div>
      </div>
      <Badges onBadgeClick={setActiveModal}/>
      <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid rgba(28,23,20,.06)"}}>
        <span style={{fontSize:9,color:T.ink3,opacity:.4,letterSpacing:".06em"}}>{APP_VERSION}</span>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",fontFamily:T.sans,position:"relative",overflow:"hidden",background:"#0A0804"}}>
      <style>{`
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes modalPop { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes worldPan { from{transform:scale(1.06) translateY(-8px)} to{transform:scale(1) translateY(0)} }
        @keyframes cardRise { from{opacity:0;transform:translateY(28px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        .world-bg  { animation: worldPan 1.6s cubic-bezier(.22,.68,0,1.05) both; }
        .card-rise { animation: cardRise .6s cubic-bezier(.22,.68,0,1.05) .2s both; }
      `}</style>
      <div className="world-bg" style={{position:"fixed",inset:"-5%",zIndex:0}}>
        <img src={BG} alt="Wovely world" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",filter:"saturate(1.25) brightness(0.92) contrast(1.05)"}}/>
        <div style={{position:"absolute",inset:0,background:"rgba(250,247,242,0.75)"}}/>
      </div>
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
        {/* BeeAnimator removed — Bev character coming soon */}
        <div className="card-rise" style={{width:"100%",maxWidth:isDesktop?420:360}}>
          {showForm ? <FormCard cardStyle={CARD_STYLE} isSignup={isSignup} email={email} setEmail={setEmail} pass={pass} setPass={setPass} confirmPass={confirmPass} setConfirmPass={setConfirmPass} authError={authError} handleAuth={handleAuth} loading={loading} onBack={()=>setScreen("welcome")}/> : <WelcomeCard/>}
        </div>
      </div>
      {/* Modal — true viewport fixed, outside all card stacking contexts */}
      {modal && (
        <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:isDesktop?"center":"flex-end",justifyContent:"center"}} onClick={closeModal}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(10px)"}}/>
          <div
            ref={sheetRef}
            onClick={e=>e.stopPropagation()}
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            style={{
              position:"relative",
              background:"#FDFAF7",
              borderRadius: isDesktop ? 20 : "22px 22px 0 0",
              width: isDesktop ? "min(480px, 90vw)" : "100%",
              maxHeight: isDesktop ? "min(640px, 85vh)" : "88vh",
              display:"flex",
              flexDirection:"column",
              zIndex:1,
              boxShadow: isDesktop ? "0 24px 80px rgba(0,0,0,0.4)" : "0 -12px 48px rgba(0,0,0,0.28)",
              overflow:"hidden",
              animation: isDesktop ? "modalPop .25s cubic-bezier(.22,.68,0,1.05) both" : "sheetUp .3s cubic-bezier(.22,.68,0,1.05) both",
            }}
          >
            {/* Handle row */}
            <div style={{flexShrink:0,height:44,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",borderBottom:`1px solid rgba(28,23,20,0.06)`}}>
              <div style={{width:36,height:4,background:"rgba(28,23,20,0.15)",borderRadius:99}}/>
              <button onClick={closeModal} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",width:30,height:30,borderRadius:"50%",background:"rgba(28,23,20,0.07)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"rgba(28,23,20,0.45)",lineHeight:1}}>×</button>
            </div>
            {/* Content */}
            <div style={{flex:1,overflowY:"auto",padding:"20px 20px 48px"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:22}}>
                <div style={{
                  width:56,height:56,borderRadius:16,flexShrink:0,
                  background:modal.iconBg||"rgba(155,126,200,0.12)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:modal.iconColor||"#9B7EC8",
                  border: modal.iconBg==="#fff" ? "1px solid rgba(28,23,20,0.1)" : "none",
                  boxShadow: (modal.iconBg==="#000") ? "0 6px 20px rgba(0,0,0,0.4)" : "0 6px 20px rgba(155,126,200,0.25)",
                  overflow:"hidden",
                }}>
                  {typeof modal.icon === 'string'
                    ? <span style={{fontSize:28}}>{modal.icon}</span>
                    : <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>{modal.icon}</span>
                  }
                </div>
                <div style={{flex:1,minWidth:0,paddingTop:2}}>
                  {modal.badge&&(
                    <div style={{display:"inline-flex",alignItems:"center",background:"rgba(155,126,200,0.1)",borderRadius:6,padding:"3px 8px",fontSize:9,fontWeight:700,color:"#9B7EC8",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>
                      {modal.badge}
                    </div>
                  )}
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#1A1A2E",lineHeight:1.15,marginBottom:4}}>{modal.title}</div>
                  <div style={{fontSize:13,color:"rgba(28,23,20,0.5)",lineHeight:1.55,fontWeight:300}}>{modal.subtitle}</div>
                </div>
              </div>
              {/* Features — clean iOS grouped list style */}
              <div style={{background:"rgba(244,237,227,0.6)",borderRadius:14,overflow:"hidden",border:"1px solid rgba(28,23,20,0.07)",marginBottom:20}}>
                {modal.features.map((f,i)=>(
                  <div key={i} style={{padding:"12px 16px",borderBottom: i<modal.features.length-1 ? "1px solid rgba(28,23,20,0.07)" : "none"}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#1A1A2E",lineHeight:1.2,marginBottom:2}}>{f.label}</div>
                    <div style={{fontSize:12,color:"rgba(28,23,20,0.48)",lineHeight:1.5}}>{f.sub}</div>
                  </div>
                ))}
              </div>
              {/* CTA */}
              {modal.ctaAction === 'notify' ? (
                notifySubmitted ? (
                  <div style={{background:"rgba(92,122,94,0.1)",borderRadius:14,padding:"20px 16px",textAlign:"center"}}>
                    <div style={{fontSize:28,marginBottom:8}}>🎉</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:"#5C7A5E",marginBottom:4}}>You're on the list!</div>
                    <div style={{fontSize:12,color:"rgba(28,23,20,0.5)",lineHeight:1.6}}>We'll email you the day it launches. Thanks for your support.</div>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"#1A1A2E",marginBottom:10}}>Get notified when we launch</div>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <input
                        value={notifyEmail}
                        onChange={e=>setNotifyEmail(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&handleNotifySubmit()}
                        placeholder="your@email.com"
                        type="email"
                        style={{flex:1,padding:"13px 14px",background:"transparent",border:"none",borderBottom:"2px solid transparent",borderRadius:0,fontSize:14,color:"#1A1A2E",outline:"none",fontFamily:"inherit",transition:"border-color .2s"}}
                        onFocus={e=>e.target.style.borderBottomColor="#9B7EC8"}
                        onBlur={e=>e.target.style.borderBottomColor="transparent"}
                      />
                      <button
                        onClick={handleNotifySubmit}
                        disabled={notifyLoading||!notifyEmail.includes('@')}
                        style={{background:"#9B7EC8",color:"#fff",border:"none",borderRadius:9999,padding:"0 18px",fontSize:14,fontWeight:600,cursor:notifyEmail.includes('@')?"pointer":"not-allowed",opacity:notifyEmail.includes('@')?1:0.45,transition:"opacity .15s",whiteSpace:"nowrap",height:48}}
                      >
                        {notifyLoading ? '...' : 'Notify me'}
                      </button>
                    </div>
                    {modal.footnote&&<div style={{fontSize:11,color:"rgba(28,23,20,0.4)",lineHeight:1.5}}>{modal.footnote}</div>}
                  </div>
                )
              ) : (
                <>
                  <button onClick={handleModalCTA} style={{width:"100%",background:"linear-gradient(135deg,#9B7EC8,#6B52A3)",color:"#fff",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 8px 24px rgba(155,126,200,0.35)",marginBottom:modal.ctaAlt?8:0}}>{modal.cta}</button>
                  {modal.ctaAlt&&<button onClick={()=>{closeModal();setScreen('signup');}} style={{width:"100%",background:"rgba(244,237,227,0.8)",border:"1.5px solid rgba(28,23,20,0.1)",borderRadius:14,padding:"13px",fontSize:13,fontWeight:500,color:"rgba(28,23,20,0.7)",cursor:"pointer"}}>{modal.ctaAlt}</button>}
                  {modal.footnote&&<div style={{textAlign:"center",marginTop:10,fontSize:11,color:"rgba(28,23,20,0.4)"}}>{modal.footnote}</div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
