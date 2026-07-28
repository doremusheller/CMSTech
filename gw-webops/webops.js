(()=>{
  const W="https://gw-webops-control.doremusheller.workers.dev";
  const P=[["shag","shag.html","Shag Fantastiq","Velvet Titan of Bass","shag-hero.svg"],["bo","bo.html","Bodacious Scraggleton XIII","Fallen royal groove sovereign","bo-hero.svg"],["luna","luna.html","Luna Voce","Amethyst Siren of Trion-6","luna-hero.svg"],["djastro","djastro.html","DJ Astrognome","Temporal turntablist","djastro-hero.svg"],["gary","gary.html","Gary","Earth-born road manager","gary-hero.svg"]];
  const $=x=>document.getElementById(x);
  const E=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let s=P[0],p=null,rec,blob;
  const log=()=>{try{return JSON.parse(localStorage.gwWebOpsLog||"[]")}catch{return[]}};
  const save=x=>localStorage.gwWebOpsLog=JSON.stringify(x);
  const msg=x=>$("voiceStatus").textContent=x;

  function audit(){
    const a=log();
    $("auditRows").innerHTML=a.length?a.map(x=>"<div class=ops-audit-row><b>"+E(x.page)+" · "+E(x.state)+"</b><small>"+E(x.time)+" · "+E(x.instruction)+"</small></div>").join(""):"<div class=ops-audit-row><b>No preview history yet</b><small>Generated visual previews will appear here.</small></div>";
  }

  function discard(){
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
    const q=m==="proposed"&&p;
    $("baselineButton").classList.toggle("active",!q);
    $("proposedButton").classList.toggle("active",!!q);
    $("proposalOverlay").hidden=!q;
    $("previewNote").textContent=q?"Generated visual preview · not published.":"Current published sandbox page.";
    if(q){
      if(blob)URL.revokeObjectURL(blob);
      blob=URL.createObjectURL(new Blob([previewDocument(p.content)],{type:"text/html"}));
      $("pagePreview").src=blob;
      $("openPage").href=blob;
      $("openPage").textContent="Visit proposed page ↗";
      $("overlaySummary").textContent="Visual proposal loaded — original page styling retained.";
    }else {
      $("pagePreview").src="bandsite/"+s[1]+"?v="+Date.now();
      $("openPage").href="bandsite/"+s[1];
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
      throw Error("Secure author connection unavailable. Open "+W+" in a new tab, complete Cloudflare sign-in, then retry.");
    }
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(j.error||"Secure author request failed.");
    return j;
  }

  async function propose(){
    
    const i=$("instruction").value.trim();
    if(!i)return $("instruction").focus();
    $("proposeButton").disabled=true;
    const iterative=Boolean(p);
    msg(iterative?"Refining the current preview…":"Generating a faithful page preview from the current source…");
    try{
      p=await api("/proposal",{target:s[0],instruction:i,draft:iterative?p.content:null});
      $("proposalTitle").textContent=s[2]+" · proposed revision";
      $("proposalSummary").textContent=p.summary;
      $("proposalDiff").innerHTML="<ins>Controlled text, style, section, and/or image changes applied in a temporary preview. Nothing has been published.</ins>";
      $("proposal").hidden=false;
      $("proposedButton").disabled=false;
      mode("proposed");
      const a=log();
      a.unshift({page:s[1],state:"Controlled preview generated",instruction:i,time:new Date().toLocaleString()});
      save(a.slice(0,12));audit();
      msg(iterative?"Refined preview ready. Nothing has been published.":"Preview ready. Nothing has been published.");
    }catch(e){msg(e.message)}finally{$("proposeButton").disabled=false;}
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
