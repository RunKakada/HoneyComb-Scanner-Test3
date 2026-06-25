/* AI Honeycomb Inspector v5 Professional — Application Controller */
const App = (() => {
  const state = {
    mode: "ready", running:false, frozen:false, surfaceEnabled:true, overlayMode:0,
    overlayLabels:["Full AR","Outline","Off"], frameCount:0, startTime:null, lastFrameTime:performance.now(),
    fpsBuffer:[], detections:[], concreteData:null, measurement:null, busyDetecting:false, captures:[], currentReport:null
  };
  let animationId = null;

  async function init(){
    bindEvents();
    const d=document.getElementById("f_date"); if(d) d.value=new Date().toISOString().slice(0,10);
    HUD.reset(); Measurement.init();
    try{ await YOLODetector.init(); }catch(err){ console.error(err); }
    setWorkflow(0);
  }

  function bindEvents(){
    byId("startBtn")?.addEventListener("click", start);
    byId("freezeBtn")?.addEventListener("click", toggleFreeze);
    byId("overlayBtn")?.addEventListener("click", cycleOverlay);
    byId("captureBtn")?.addEventListener("click", capturePhoto);
    byId("reportBtn")?.addEventListener("click", openReport);
    byId("resetBtn")?.addEventListener("click", resetSession);
    byId("statsBtn")?.addEventListener("click", openSheet);
    byId("sheetClose")?.addEventListener("click", closeSheet);
    byId("sheetBackdrop")?.addEventListener("click", closeSheet);
    byId("reportClose")?.addEventListener("click", closeReport);
    byId("reportBackdrop")?.addEventListener("click", closeReport);
    byId("generatePreviewBtn")?.addEventListener("click", generateReportPreview);
    byId("exportPngBtn")?.addEventListener("click",()=>Exporter.exportPNG(state.currentReport));
    byId("exportPdfBtn")?.addEventListener("click",()=>Exporter.exportPDF(state.currentReport));
    byId("previewClose")?.addEventListener("click", closePreview);
    byId("previewBackdrop")?.addEventListener("click", closePreview);
    window.addEventListener("resize", prepareCanvasSize);
  }

  function openSheet(){ byId("bottomSheet")?.classList.add("open"); byId("sheetBackdrop")?.classList.add("open"); }
  function closeSheet(){ byId("bottomSheet")?.classList.remove("open"); byId("sheetBackdrop")?.classList.remove("open"); }

  function openReport(){
    state.mode="report-form"; setWorkflow(2);
    const wasRunning = state.running;
    if(wasRunning && !state.frozen) state.frozen = true;
    byId("frozenBadge")?.classList.toggle("hidden", !state.frozen);
    setText("captureCount", state.captures.length);
    renderCaptureThumbs("reportThumbs");
    const note=byId("noCaptureNote"); if(note) note.style.display=state.captures.length?"none":"block";
    byId("reportModal")?.classList.remove("hidden"); byId("reportBackdrop")?.classList.remove("hidden");
  }
  function closeReport(){
    state.mode=state.running?"scanning":"ready"; setWorkflow(state.running?1:0);
    byId("reportModal")?.classList.add("hidden"); byId("reportBackdrop")?.classList.add("hidden");
  }
  async function generateReportPreview(){
    state.mode="report-preview"; setWorkflow(3);
    const btn=byId("generatePreviewBtn"); if(btn){btn.disabled=true;btn.textContent="Generating...";}
    try{
      state.currentReport = Exporter.buildReportData(state);
      const html = Exporter.renderReportHTML(state.currentReport);
      byId("reportPreview").innerHTML = html;
      byId("reportPreviewWrap")?.classList.remove("hidden"); byId("previewBackdrop")?.classList.remove("hidden");
      byId("exportPngBtn").disabled=false; byId("exportPdfBtn").disabled=false;
    }finally{ if(btn){btn.disabled=false;btn.textContent="Generate Report Preview";} }
  }
  function closePreview(){ byId("reportPreviewWrap")?.classList.add("hidden"); byId("previewBackdrop")?.classList.add("hidden"); }

  async function start(){
    try{
      await Camera.start(); state.running=true; state.frozen=false; state.mode="scanning";
      state.frameCount=0; state.detections=[]; state.concreteData=null; state.measurement=Measurement.emptyResult(); state.fpsBuffer=[]; state.startTime=performance.now(); state.lastFrameTime=performance.now();
      setText("scanStatus","SCANNING"); setText("scanStatusStrip","SCANNING"); byId("frozenBadge")?.classList.add("hidden"); setWorkflow(1); loop();
    }catch(err){ alert("Camera cannot start. Please allow camera permission or use HTTPS/local server."); console.error(err); }
  }
  function loop(){
    if(!state.running) return;
    const video=byId("cameraVideo");
    if(video && video.readyState>=2){ prepareCanvasSize(); if(!state.frozen && state.mode!=="report-form") processFrame(video); renderAR(); updateHUD(); }
    animationId=requestAnimationFrame(loop);
  }
  function prepareCanvasSize(){
    const video=byId("cameraVideo"), proc=byId("processCanvas"), ar=byId("arCanvas"); if(!video||!proc||!ar) return;
    const w=video.videoWidth||window.innerWidth, h=video.videoHeight||window.innerHeight;
    if(proc.width!==w||proc.height!==h){proc.width=w;proc.height=h;} if(ar.width!==w||ar.height!==h){ar.width=w;ar.height=h;}
  }
  function processFrame(video){
    if(state.busyDetecting) return;
    const proc=byId("processCanvas"), ctx=proc.getContext("2d",{willReadFrequently:true}); ctx.drawImage(video,0,0,proc.width,proc.height);
    state.frameCount++; state.busyDetecting=true; runDetection(proc).finally(()=>state.busyDetecting=false);
  }
  async function runDetection(canvas){
    try{
      state.concreteData=state.surfaceEnabled?ConcreteSurface.detect(canvas):null;
      const raw=await YOLODetector.detect(canvas,state.concreteData);
      state.measurement=Measurement.analyseDetections(raw); state.detections=state.measurement.detections;
      Measurement.updateHUD(state.measurement);
    }catch(err){console.error("Detection error:",err)}
  }
  function renderAR(){
    const ar=byId("arCanvas"); if(!ar) return; const ctx=ar.getContext("2d"); ctx.clearRect(0,0,ar.width,ar.height);
    const t=performance.now()/1000; AROverlay.drawScanlines(ctx,ar,t); if(state.surfaceEnabled&&state.concreteData) AROverlay.drawConcreteROI(ctx,state.concreteData.roi,t); AROverlay.drawHoneycomb(ctx,state.detections,state.overlayMode,t);
  }
  function updateHUD(){
    const now=performance.now(), dt=now-state.lastFrameTime; state.lastFrameTime=now;
    if(dt>0){state.fpsBuffer.push(1000/dt); if(state.fpsBuffer.length>30) state.fpsBuffer.shift();}
    const avg=state.fpsBuffer.reduce((a,b)=>a+b,0)/Math.max(1,state.fpsBuffer.length); const elapsed=state.startTime?(performance.now()-state.startTime)/1000:0;
    HUD.update({fps:Math.round(avg), frozen:state.frozen, surface:state.surfaceEnabled?"Active":"Off", voids:state.detections.length, elapsed, measurement:state.measurement||Measurement.emptyResult()});
    setText("sideCaptureCount", state.captures.length);
  }
  function toggleFreeze(){
    if(!state.running) return; state.frozen=!state.frozen; byId("frozenBadge")?.classList.toggle("hidden",!state.frozen);
    const lbl=document.querySelector("#freezeBtn .btn-label"), icon=document.querySelector("#freezeBtn span"); if(lbl) lbl.textContent=state.frozen?"Resume":"Freeze"; if(icon) icon.textContent=state.frozen?"▶":"⏸";
  }
  function cycleOverlay(){ state.overlayMode=(state.overlayMode+1)%3; const lbl=document.querySelector("#overlayBtn .btn-label"); if(lbl) lbl.textContent=state.overlayLabels[state.overlayMode]; }
  function capturePhoto(){
    if(!state.running){alert("Start the scan first before capturing.");return;}
    const video=byId("cameraVideo"), arCanvas=byId("arCanvas"); const tmp=document.createElement("canvas"); tmp.width=arCanvas.width; tmp.height=arCanvas.height; const ctx=tmp.getContext("2d"); ctx.drawImage(video,0,0,tmp.width,tmp.height); ctx.drawImage(arCanvas,0,0,tmp.width,tmp.height);
    const m=state.measurement||Measurement.emptyResult(); const dets=(state.detections||[]).map((d,i)=>({...d,id:d.id||`H-${i+1}`}));
    state.captures.push({ dataUrl:tmp.toDataURL("image/jpeg",.9), voids:dets.length, detections:dets, totalAreaCm2:m.totalAreaCm2||0, largestAreaCm2:m.largestAreaCm2||0, avgConfidence:averageConfidence(dets), severity:Exporter.getSeverity(dets.length,m.totalAreaCm2||0).name, ts:new Date().toLocaleTimeString() });
    flashCapture(); updateCaptureCount(); renderCaptureThumbs("captureThumbsRow"); setWorkflow(1);
  }
  function averageConfidence(dets){ if(!dets.length) return 0; return dets.reduce((s,d)=>s+(d.confidence||d.score||0),0)/dets.length; }
  function flashCapture(){ const f=document.createElement("div"); f.style.cssText="position:fixed;inset:0;background:#fff;opacity:.55;pointer-events:none;z-index:999;transition:.3s"; document.body.appendChild(f); requestAnimationFrame(()=>{f.style.opacity=0;setTimeout(()=>f.remove(),320)}); }
  function updateCaptureCount(){
    setText("sideCaptureCount",state.captures.length); const btn=byId("captureBtn"); if(!btn) return; let badge=btn.querySelector(".cap-badge"); if(!badge){badge=document.createElement("i");badge.className="cap-badge";badge.style.cssText="position:absolute;top:4px;right:6px;background:#ff3b30;color:white;border-radius:999px;font-size:10px;font-style:normal;padding:1px 6px";btn.style.position="relative";btn.appendChild(badge);} badge.textContent=state.captures.length; badge.style.display=state.captures.length?"block":"none";
  }
  function renderCaptureThumbs(id){
    const c=byId(id); if(!c) return; if(!state.captures.length){c.innerHTML='<span class="empty-text">No captures yet.</span>'; return;} c.innerHTML="";
    state.captures.forEach((cap,i)=>{const w=document.createElement("div");w.className="thumb-wrap";w.innerHTML=`<img src="${cap.dataUrl}" title="Photo ${i+1} · ${cap.voids} voids"><button class="thumb-del">✕</button>`; w.querySelector("button").onclick=(e)=>{e.stopPropagation();state.captures.splice(i,1);updateCaptureCount();renderCaptureThumbs(id);renderCaptureThumbs(id==="reportThumbs"?"captureThumbsRow":"reportThumbs");setText("captureCount",state.captures.length)}; c.appendChild(w);});
  }
  function resetSession(){ state.frameCount=0; state.detections=[]; state.concreteData=null; state.measurement=Measurement.emptyResult(); state.fpsBuffer=[]; state.captures=[]; state.currentReport=null; updateCaptureCount(); renderCaptureThumbs("captureThumbsRow"); HUD.reset(); Measurement.updateHUD(state.measurement); const ar=byId("arCanvas"); if(ar) ar.getContext("2d").clearRect(0,0,ar.width,ar.height); setWorkflow(0); }
  function setWorkflow(active){ document.querySelectorAll(".workflow-steps .step").forEach((s,i)=>s.classList.toggle("active",i<=active)); }
  function setText(id,v){const el=byId(id); if(el) el.textContent=v;} function byId(id){return document.getElementById(id)}
  document.addEventListener("DOMContentLoaded", init);
  return { getState:()=>state };
})();
