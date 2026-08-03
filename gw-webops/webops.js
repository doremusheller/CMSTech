(()=>{
  const W="https://gw-webops-control.doremusheller.workers.dev";
  const P=[["shag","shag.html","Shag Fantastiq","Velvet Titan of Bass","shag-hero.svg"],["bo","bo.html","Bodacious Scraggleton XIII","Fallen royal groove sovereign","bo-hero.svg"],["luna","luna.html","Luna Voce","Amethyst Siren of Trion-6","luna-hero.svg"],["djastro","djastro.html","DJ Astrognome","Temporal turntablist","djastro-hero.svg"],["drummakaan","drummakaan.html","Drumma Kaan","Primal thunder drummer","drummakaan-hero.svg"],["gary","gary.html","Gary","Earth-born road manager","gary-hero.svg"]];
  const $=x=>document.getElementById(x);
  const E=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let s=P[0],p=null,rec,blob,proposalSequence=0;
  const log=()=>{try{return JSON.parse(localStorage.gwWebOpsLog||"[]")}catch{return[]}};
  const save=x=>localStorage.gwWebOpsLog=JSON.stringify(x);
  const msg=x=>$("voiceStatus").textContent=x;

  const busyLines=[
    ["Shag’s web team is shaping the preview.","Reading the current page and preserving everything you did not ask to change."],
    ["Threading in your direction.","Building the proposed revision without touching the published site."],
    ["Polishing the visual treatment.","Image and layout work may take a moment. The preview is still in progress."],
  ];
  let busyTimer=null,busyStep=0;
  function busy(on, visual=false){
    const overlay=$("busyOverlay");
    if(!on){clearInterval(busyTimer);busyTimer=null;overlay.hidden=true;return}
    busyStep=0;
    const write=()=>{const line=busyLines[busyStep++%busyLines.length];$("busyTitle").textContent=line[0];$("busyDetail").textContent=visual&&busyStep===1?"Preparing a visual revision. This can take a little longer, but your original page remains safe.":line[1]};
    write();overlay.hidden=false;busyTimer=setInterval(write,4200);
  }

  function audit(){
    const a=log();
    $("auditRows").innerHTML=a.length?a.map(x=>"<div class=ops-audit-row><b>"+E(x.page)+" · "+E(x.state)+"</b><small>"+E(x.time)+" · "+E(x.instruction)+"</small></div>").join(""):"<div class=ops-audit-row><b>No preview history yet</b><small>Generated visual previews will appear here.</small></div>";
  }

  function discard(){
    proposalSequence++;
    if(blob)URL.revokeObjectURL(blob);
    blob=null;p=null;
    $("proposal").hidden=true;
    $("proposedButton").disabled=true;
  }

  function previewDocument(content){
    // The Worker returns the actual page unchanged except for the new hero.
    // Keep every supporting asset public and absolute inside the isolated preview.
    return content
      .replace(/href=["']\.\.\/webops\.css["']/i,'href="https://cmstech.ai/gw-webops/webops.css"')
      .replace(/<head([^>]*)>/i,'<head$1><base href="https://cmstech.ai/gw-webops/bandsite/">');
  }

  function mode(m){
    const q=m==="proposed"&&p&&p.target===s[0];
    $("baselineButton").classList.toggle("active",!q);
    $("proposedButton").classList.toggle("active",!!q);
    $("proposalOverlay").hidden=!q;
    $("previewNote").textContent=q?"Generated visual preview · not published.":"Current published sandbox page.";
    if(q){
      if(blob)URL.revokeObjectURL(blob);
      blob=null;
      // Render the generated document directly in the viewer. This avoids blob-frame
      // restrictions that can leave the proposed preview blank in hosted environments.
      $("pagePreview").removeAttribute("src");
      $("pagePreview").srcdoc=previewDocument(p.content);
      // Give the full-page link its own immutable Blob URL so it always opens this exact revision.
      const fullPageBlob=URL.createObjectURL(new Blob([previewDocument(p.content)],{type:"text/html"}));
      $("openPage").href=fullPageBlob;
      $("openPage").onclick=()=>setTimeout(()=>URL.revokeObjectURL(fullPageBlob),60000);
      $("openPage").textContent="Visit proposed page ↗";
      $("overlaySummary").textContent="Visual proposal loaded — original page styling retained.";
    }else {
      $("pagePreview").removeAttribute("srcdoc");
      $("pagePreview").src="bandsite/"+s[1]+"?v="+Date.now();
      $("openPage").href="bandsite/"+s[1];
      $("openPage").onclick=null;
      $("openPage").textContent="Open page ↗";
    }
  }

  function select(id){
    s=P.find(x=>x[0]===id)||P[0];
    discard();
    $("workspaceTitle").textContent=s[2]+" · "+s[1];
    $("sourcePath").textContent="/gw-webops/bandsite/"+s[1];
    $("openPage").href="bandsite/"+s[1];
    $("pageCards").querySelectorAll(".ops-page").forEach(x=>x.classList.toggle("active",x.dataset.id===s[0]));
    mode("current");
  }

  async function api(route,data){
    let r;
    try{
      r=await fetch(W+route,{method:"POST",credentials:"omit",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
    }catch{
      throw Error("The public preview service is unavailable right now. Please try again shortly.");
    }
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(j.error||"Secure author request failed.");
    return j;
  }

  async function propose(){
    
    const i=$("instruction").value.trim();
    if(!i)return $("instruction").focus();
    const targetAtStart=s;
    const requestId=++proposalSequence;
    $("proposeButton").disabled=true;
    const iterative=Boolean(p&&p.target===targetAtStart[0]);
    const started=Date.now();
    busy(true,/\b(image|photo|hero|picture|visual|illustration)\b/i.test(i));
    msg(iterative?"Refining the current preview…":"Generating a faithful page preview from the current source…");
    // Force the loading panel to paint before the Worker request begins.
    await new Promise(requestAnimationFrame);
    try{
      const result=await api("/proposal",{target:targetAtStart[0],instruction:i,draft:iterative?p.content:null});
      // Ignore a response that belongs to a page the visitor has since left.
      if(requestId!==proposalSequence||s[0]!==targetAtStart[0]) return;
      p={...result,target:targetAtStart[0]};
      $("proposalTitle").textContent=targetAtStart[2]+" · proposed revision";
      $("proposalSummary").textContent=p.summary;
      $("proposalDiff").innerHTML="<ins>Controlled text, style, section, and/or image changes applied in a temporary preview. Nothing has been published.</ins>";
      $("proposal").hidden=false;
      $("proposedButton").disabled=false;
      mode("proposed");
      const a=log();
      a.unshift({page:targetAtStart[1],state:"Controlled preview generated",instruction:i,time:new Date().toLocaleString()});
      save(a.slice(0,12));audit();
      msg(iterative?"Refined preview ready. Nothing has been published.":"Preview ready. Nothing has been published.");
    }catch(e){msg(e.message)}finally{
      const remaining=800-(Date.now()-started);
      if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
      busy(false);
      $("proposeButton").disabled=false;
    }
  }

  function voice(){
    const R=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!R)return msg("Voice transcription is not available in this browser.");
    if(rec)return rec.stop();
    rec=new R();rec.interimResults=true;
    rec.onstart=()=>{msg("Listening…");$("voiceButton").textContent="◉ Listening"};
    rec.onresult=e=>$("instruction").value=[...e.results].map(x=>x[0].transcript).join("");
    rec.onend=()=>{rec=null;$("voiceButton").textContent="◉ Dictate"};
    rec.start();
  }

  function init(){
    $("pageCards").innerHTML=P.map(x=>'<button class=ops-page data-id="'+x[0]+'"><img src="bandsite/assets/'+x[4]+'" alt=""><span><b>'+x[2]+'</b><small>'+x[1]+' · '+x[3]+"</small></span></button>").join("");
    $("pageCards").onclick=e=>{const x=e.target.closest("[data-id]");if(x)select(x.dataset.id)};
    busy(false);
    select("shag");audit();
    $("voiceButton").onclick=voice;
    $("proposeButton").onclick=propose;
    $("approveButton").textContent="Keep exploring";
    $("approveButton").onclick=()=>{mode("current");msg("Preview retained in your control log. Publishing is disabled in this prototype.")};
    $("discardButton").onclick=()=>{discard();mode("current");msg("Visual preview discarded.")};
    $("baselineButton").onclick=()=>mode("current");
    $("proposedButton").onclick=()=>mode("proposed");
    $("clearAudit").onclick=()=>{delete localStorage.gwWebOpsLog;audit()};
  }
  init();
})();
