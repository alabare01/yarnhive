import React, { useState, useEffect } from "react";

export const T = {
  bg:"#FFFFFF", surface:"#F0EBE3", linen:"#EDE8E0", ink:"#1C1714", ink2:"#5C4F44", ink3:"#9E8E82",
  border:"#E2D8CC", terra:"#9B7EC8", terraLt:"#EDE4F7", sage:"#5C7A5E", sageLt:"#D8EAD8", gold:"#B8902C",
  navy:"#2D3A7C", modal:"#FAF7F2", card:"#FFFFFF",
  serif:'"Playfair Display", Georgia, serif', sans:'"DM Sans", -apple-system, sans-serif',
  shadow:"0 2px 12px rgba(155,126,200,.07)",
  shadowLg:"0 8px 30px rgba(155,126,200,.10)",
};

export const useBreakpoint = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1100, isDesktop: w >= 1100, width: w };
};

export const Field = ({label,value,onChange,type="text",placeholder,rows:r}) => (
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:10,fontVariant:"small-caps",color:T.ink3,textTransform:"lowercase",letterSpacing:".14em",marginBottom:6,fontWeight:500}}>{label}</div>}
    {r?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={r} style={{width:"100%",padding:"13px 16px",background:"transparent",border:"none",borderBottom:`1.5px solid ${T.border}`,borderRadius:0,color:T.ink,fontSize:14,resize:"vertical",lineHeight:1.6,outline:"none",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderBottomColor=T.terra} onBlur={e=>e.target.style.borderBottomColor=T.border}/>
      :<input value={value} onChange={onChange} type={type} placeholder={placeholder} style={{width:"100%",padding:"13px 16px",background:"transparent",border:"none",borderBottom:`1.5px solid ${T.border}`,borderRadius:0,color:T.ink,fontSize:15,outline:"none",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderBottomColor=T.terra} onBlur={e=>e.target.style.borderBottomColor=T.border}/>}
  </div>
);
