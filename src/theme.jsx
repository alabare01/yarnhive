import React, { useState, useEffect } from "react";

export const T = {
  bg:"#FFFFFF", surface:"#F8F6FF", linen:"#F8F6FF", ink:"#2D2D4E", ink2:"#6B6B8A", ink3:"#6B6B8A",
  border:"#EDE4F7", terra:"#9B7EC8", terraLt:"#EDE4F7", sage:"#5C9E7A", sageLt:"#D8EAD8", gold:"#C9853A",
  navy:"#2D3A7C", modal:"#FFFFFF", card:"#FFFFFF",
  serif:'"Playfair Display", Georgia, serif', sans:'"Inter", -apple-system, sans-serif',
  shadow:"0 1px 4px rgba(0,0,0,0.06)",
  shadowLg:"0 4px 16px rgba(155,126,200,0.12)",
  disabled:"#B0AEC4",
  success:"#5C9E7A", warning:"#C9853A", error:"#C05A5A",
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
    {label&&<div style={{fontSize:11,fontWeight:600,color:T.ink2,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{label}</div>}
    {r?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={r} style={{width:"100%",padding:"13px 16px",background:"transparent",border:"none",borderBottom:`2px solid transparent`,borderRadius:0,color:T.ink,fontSize:14,resize:"vertical",lineHeight:1.6,outline:"none",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderBottomColor=T.terra} onBlur={e=>e.target.style.borderBottomColor="transparent"}/>
      :<input value={value} onChange={onChange} type={type} placeholder={placeholder} style={{width:"100%",padding:"13px 16px",background:"transparent",border:"none",borderBottom:`2px solid transparent`,borderRadius:0,color:T.ink,fontSize:15,outline:"none",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderBottomColor=T.terra} onBlur={e=>e.target.style.borderBottomColor="transparent"}/>}
  </div>
);
