import React, { useState, useEffect } from "react";

export const T = {
  bg:"#F7F3EE", surface:"#F0EBE3", linen:"#EDE8E0", ink:"#1C1714", ink2:"#5C4F44", ink3:"#9E8E82",
  border:"#E2D8CC", terra:"#B85A3C", terraLt:"#F5E2DA", sage:"#5C7A5E", sageLt:"#D8EAD8", gold:"#B8902C",
  modal:"#FAF7F3", card:"#F0EBE3",
  serif:'"Playfair Display", Georgia, serif', sans:'"DM Sans", -apple-system, sans-serif',
  shadow:"0 2px 10px rgba(139,90,60,.08)",
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
    {label&&<div style={{fontSize:11,color:T.ink3,textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>{label}</div>}
    {r?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={r} style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:14,resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
      :<input value={value} onChange={onChange} type={type} placeholder={placeholder} style={{width:"100%",padding:"13px 16px",background:T.linen,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:15}} onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>}
  </div>
);
