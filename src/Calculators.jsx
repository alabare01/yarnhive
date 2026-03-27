import { useState } from "react";
import { T, useBreakpoint } from "./theme.jsx";

const Calculators = () => {
  const [active,setActive]=useState("gauge");
  // Gauge calc state
  const [stitches,setStitches]=useState("20"),[rows,setRows]=useState("24"),[swatchSize,setSwatchSize]=useState("4");
  const [targetW,setTargetW]=useState("50"),[targetH,setTargetH]=useState("60");
  // Yardage calc state
  const [projW,setProjW]=useState("50"),[projH,setProjH]=useState("60"),[stPer4,setStPer4]=useState("12"),[ydsPerSt,setYdsPerSt]=useState("0.5");
  // Resize calc state
  const [patSt,setPatSt]=useState("18"),[patRows,setPatRows]=useState("20"),[patSwatchIn,setPatSwatchIn]=useState("4");
  const [mySt,setMySt]=useState("14"),[myRows,setMyRows]=useState("16"),[mySwatchIn,setMySwatchIn]=useState("4");
  const [origCount,setOrigCount]=useState("24"),[origDesc,setOrigDesc]=useState("(4 sc, inc) x 4");
  const [showRepeat,setShowRepeat]=useState(false);

  // Gauge calculator
  const stPerInch=parseFloat(stitches)/parseFloat(swatchSize)||0;
  const roPerInch=parseFloat(rows)/parseFloat(swatchSize)||0;
  const castOn=Math.round(stPerInch*parseFloat(targetW)||0);
  const totalRowsCalc=Math.round(roPerInch*parseFloat(targetH)||0);
  // Yardage calculator
  const totalSt=Math.round((parseFloat(stPer4)/4)*(parseFloat(projW)||0)*(parseFloat(projH)||0)*(roPerInch||4));
  const yardage=Math.round(totalSt*(parseFloat(ydsPerSt)||0.5));

  // ── SCALING ENGINE ──────────────────────────────────────────────
  // Scale factor = pattern gauge / my gauge (per axis)
  const patStPerIn = parseFloat(patSt)/parseFloat(patSwatchIn)||0;
  const myStPerIn  = parseFloat(mySt)/parseFloat(mySwatchIn)||0;
  const patRowPerIn= parseFloat(patRows)/parseFloat(patSwatchIn)||0;
  const myRowPerIn = parseFloat(myRows)/parseFloat(mySwatchIn)||0;
  // If my gauge is looser (fewer stitches per inch), pieces come out bigger → scale DOWN stitch counts
  // Scale factor for stitches: how many of MY stitches = 1 pattern stitch → myStPerIn/patStPerIn
  const stScale = (patStPerIn>0&&myStPerIn>0) ? patStPerIn/myStPerIn : 1;
  const rowScale= (patRowPerIn>0&&myRowPerIn>0) ? patRowPerIn/myRowPerIn : 1;
  const sizeChangeW = stScale>0 ? (1/stScale) : 1; // actual size change factor
  const sizeChangeH = rowScale>0 ? (1/rowScale) : 1;

  // Scale a single stitch count
  const scaleCount = (n,axis="st") => {
    const factor = axis==="row" ? stScale : stScale;
    const scaled = Math.round(n * factor);
    const error = Math.abs(scaled - n*factor) / (n*factor||1);
    return { scaled, error, flagged: error > 0.05 };
  };

  // Parse and scale a stitch count from the input
  const rawCount = parseInt(origCount)||0;
  const scaledResult = scaleCount(rawCount);

  // Scale a repeat pattern like "(4 sc, inc) x 4 — 24 sts"
  // Rule: scale the repeat COUNT, keep the sequence (stitch types don't change)
  // Then recalculate total stitch count from the scaled repeat
  const scaleRepeat = (desc, totalSts) => {
    // Try to extract repeat count from patterns like "x 4", "x4", "* 8 times"
    const repeatMatch = desc.match(/[xX×*]\s*(\d+)/);
    const seqMatch = desc.match(/\(([^)]+)\)/);
    if (!repeatMatch || !seqMatch) return null;
    const origRepeat = parseInt(repeatMatch[1]);
    const scaledRepeat = Math.round(origRepeat * stScale);
    // Count stitches in the sequence to get new total
    const seqText = seqMatch[1];
    const seqStCount = (seqText.match(/\b(sc|hdc|dc|tr|inc|dec|sl st|ch)\b/gi)||[]).length || 1;
    const newTotal = scaledRepeat * seqStCount;
    const newDesc = desc.replace(repeatMatch[0], `x ${scaledRepeat}`);
    return { newDesc, scaledRepeat, newTotal, origRepeat };
  };
  const repeatResult = showRepeat ? scaleRepeat(origDesc, rawCount) : null;
  const {isDesktop:isDk}=useBreakpoint();

  const Input = ({label,val,set,step="1"}) => (
    <div>
      <div style={{fontSize:10,color:T.ink3,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>
      <input value={val} onChange={e=>set(e.target.value)} type="number" step={step}
        style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:15,fontWeight:600,color:T.ink,textAlign:"center",outline:"none"}}
        onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
    </div>
  );
  const ResultCard = ({label,val,flag}) => (
    <div style={{background:flag?"rgba(255,220,200,.5)":"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px",border:flag?`1px solid ${T.terra}`:"none"}}>
      <div style={{fontSize:10,color:T.ink3,marginBottom:2}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,fontFamily:T.serif,color:flag?T.terra:T.ink}}>{val}</div>
      {flag&&<div style={{fontSize:10,color:T.terra,marginTop:2}}>⚠ rounding error &gt;5%</div>}
    </div>
  );

  return (
    <div style={{padding:isDk?"0 0 100px":"0 18px 100px"}}>
      <div style={{fontFamily:T.serif,fontSize:18,color:T.ink,marginBottom:4}}>Crochet Calculators</div>
      <div style={{fontSize:13,color:T.ink3,marginBottom:16}}>Essential tools for planning your projects.</div>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {[["gauge","Gauge"],["yardage","Yardage"],["resize","Scale"]].map(([key,label])=>(
          <button key={key} onClick={()=>setActive(key)} style={{flex:1,padding:"10px",border:"1.5px solid "+(active===key?T.terra:T.border),background:active===key?T.terraLt:T.card,color:active===key?T.terra:T.ink3,borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:active===key?600:400}}>{label}</button>
        ))}
      </div>

      {/* ── GAUGE ── */}
      {active==="gauge"&&<>
        <div style={{fontSize:12,color:T.ink3,marginBottom:16,lineHeight:1.5}}>Use when your swatch doesn't match the pattern. Tells you how to adjust your stitch count.</div>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:12}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Your Swatch</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <Input label="Stitches" val={stitches} set={setStitches}/>
            <Input label="Rows" val={rows} set={setRows}/>
            <Input label="Swatch (in)" val={swatchSize} set={setSwatchSize}/>
          </div>
        </div>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:12}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Target Dimensions</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Input label="Width (in)" val={targetW} set={setTargetW}/>
            <Input label="Height (in)" val={targetH} set={setTargetH}/>
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"16px",border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Results</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <ResultCard label="Cast on (sts)" val={castOn}/>
            <ResultCard label="Total rows" val={totalRowsCalc}/>
            <ResultCard label="Sts/inch" val={stPerInch.toFixed(1)}/>
            <ResultCard label="Rows/inch" val={roPerInch.toFixed(1)}/>
          </div>
        </div>
      </>}

      {/* ── YARDAGE ── */}
      {active==="yardage"&&<>
        <div style={{fontSize:12,color:T.ink3,marginBottom:16,lineHeight:1.5}}>Estimate how much yarn you need before starting a project.</div>
        <div style={{background:T.linen,borderRadius:14,padding:"16px",marginBottom:12}}>
          <div style={{fontFamily:T.serif,fontSize:15,color:T.ink,marginBottom:12}}>Project Details</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Input label="Width (in)" val={projW} set={setProjW}/>
            <Input label="Height (in)" val={projH} set={setProjH}/>
            <Input label="Sts per 4in" val={stPer4} set={setStPer4}/>
            <Input label="Yds per stitch" val={ydsPerSt} set={setYdsPerSt} step="0.1"/>
          </div>
        </div>
        <div style={{background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"20px",border:`1px solid ${T.border}`,textAlign:"center"}}>
          <div style={{fontFamily:T.serif,fontSize:48,fontWeight:700,color:T.terra}}>{yardage.toLocaleString()}</div>
          <div style={{fontSize:14,color:T.ink3,marginTop:4}}>yards needed</div>
          <div style={{fontSize:13,color:T.ink2,marginTop:8}}>approx. {Math.ceil(yardage/200)} skeins at 200 yds each</div>
        </div>
      </>}

      {/* ── SCALE ── */}
      {active==="resize"&&<>
        <div style={{fontSize:12,color:T.ink3,marginBottom:16,lineHeight:1.6}}>
          Enter the pattern's gauge and your gauge. We'll calculate exact scaled stitch counts — not just a multiplier.
        </div>

        {/* Gauge inputs side by side */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{background:T.linen,borderRadius:14,padding:"14px"}}>
            <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:10}}>Pattern Gauge</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <Input label="Sts" val={patSt} set={setPatSt}/>
              <Input label="Rows" val={patRows} set={setPatRows}/>
            </div>
            <Input label="Swatch (in)" val={patSwatchIn} set={setPatSwatchIn}/>
          </div>
          <div style={{background:T.linen,borderRadius:14,padding:"14px"}}>
            <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:10}}>My Gauge</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <Input label="Sts" val={mySt} set={setMySt}/>
              <Input label="Rows" val={myRows} set={setMyRows}/>
            </div>
            <Input label="Swatch (in)" val={mySwatchIn} set={setMySwatchIn}/>
          </div>
        </div>

        {/* Scale factor summary */}
        <div style={{background:`linear-gradient(135deg,${T.terraLt},${T.card})`,borderRadius:14,padding:"16px",marginBottom:12,border:`1px solid ${T.border}`}}>
          <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:10}}>Your Scale Factors</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <ResultCard label="Stitch mult." val={`×${stScale.toFixed(2)}`}/>
            <ResultCard label="Width result" val={`${(sizeChangeW*100).toFixed(0)}%`} flag={Math.abs(sizeChangeW-1)>0.3}/>
            <ResultCard label="Yardage mult." val={`${(sizeChangeW*sizeChangeH*100).toFixed(0)}%`}/>
          </div>
          {Math.abs(stScale-1)<0.03&&<div style={{marginTop:10,fontSize:12,color:T.sage,fontWeight:600,textAlign:"center"}}>✓ Gauges match — no scaling needed</div>}
          {stScale!==1&&<div style={{marginTop:10,fontSize:12,color:T.ink2,lineHeight:1.6}}>
            {stScale>1?"Your gauge is tighter — multiply stitch counts to get the same finished size.":"Your gauge is looser — reduce stitch counts to get the same finished size."}
          </div>}
        </div>

        {/* Single stitch count scaler */}
        <div style={{background:T.linen,borderRadius:14,padding:"14px",marginBottom:10}}>
          <div style={{fontFamily:T.serif,fontSize:14,color:T.ink,marginBottom:10}}>Scale a Stitch Count</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
            <Input label="Pattern calls for" val={origCount} set={setOrigCount}/>
            <div>
              <div style={{fontSize:10,color:T.ink3,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>You should work</div>
              <div style={{padding:"10px",background:scaledResult.flagged?"rgba(255,220,200,.6)":"rgba(255,255,255,.9)",border:`1.5px solid ${scaledResult.flagged?T.terra:T.sage}`,borderRadius:8,textAlign:"center"}}>
                <span style={{fontSize:22,fontWeight:700,fontFamily:T.serif,color:scaledResult.flagged?T.terra:T.sage}}>{scaledResult.scaled}</span>
                <span style={{fontSize:11,color:T.ink3,marginLeft:4}}>sts</span>
              </div>
              {scaledResult.flagged&&<div style={{fontSize:10,color:T.terra,marginTop:4}}>⚠ {(scaledResult.error*100).toFixed(1)}% rounding error</div>}
            </div>
          </div>

          {/* Repeat pattern scaler toggle */}
          <button onClick={()=>setShowRepeat(r=>!r)} style={{fontSize:11,color:T.terra,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>
            {showRepeat?"▾ Hide repeat scaler":"▸ Scale a repeat pattern like (sc, inc) x 4"}
          </button>
          {showRepeat&&<>
            <div style={{marginTop:10}}>
              <div style={{fontSize:10,color:T.ink3,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Repeat instruction</div>
              <input value={origDesc} onChange={e=>setOrigDesc(e.target.value)}
                placeholder="e.g. (4 sc, inc) x 4"
                style={{width:"100%",padding:"10px",background:"rgba(250,247,243,0.96)",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,color:T.ink,outline:"none"}}
                onFocus={e=>e.target.style.borderColor=T.terra} onBlur={e=>e.target.style.borderColor=T.border}/>
            </div>
            {repeatResult&&<div style={{marginTop:10,background:"rgba(255,255,255,.8)",borderRadius:9,padding:"10px 12px"}}>
              <div style={{fontSize:11,color:T.ink3,marginBottom:4}}>SCALED INSTRUCTION</div>
              <div style={{fontSize:14,fontWeight:600,color:T.ink,fontFamily:T.serif}}>{repeatResult.newDesc}</div>
              <div style={{fontSize:11,color:T.ink3,marginTop:4}}>{repeatResult.origRepeat} repeats → {repeatResult.scaledRepeat} repeats</div>
            </div>}
            {showRepeat&&!repeatResult&&origDesc.length>3&&<div style={{marginTop:8,fontSize:11,color:T.ink3}}>Couldn't parse that pattern. Try: (4 sc, inc) x 4</div>}
          </>}
        </div>

        {/* Sizing note */}
        <div style={{background:T.sageLt,borderRadius:12,padding:"12px 14px",fontSize:12,color:T.sage,lineHeight:1.6}}>
          <strong>Pro tip:</strong> For amigurumi, scaling via hook size + yarn weight change is often easier than adjusting every stitch count. A 5mm hook with bulky yarn instead of 3.5mm with DK roughly doubles your finished size with zero math.
        </div>
      </>}
    </div>
  );
};

export default Calculators;
