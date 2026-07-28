(()=>{
  const $=x=>document.getElementById(x);
  const K="gw-demo-console-v14";
  const RECEIPTS={
    "gw-exp-001":"https://cmstech.ai/assets/gw-demo-receipts/laser-llama-rentals-receipt.svg?v=receipt-repair-1",
    "gw-exp-002":"https://cmstech.ai/assets/gw-demo-receipts/the-thang-instrument-works-receipt.svg?v=receipt-repair-1",
    "gw-exp-003":"https://cmstech.ai/assets/gw-demo-receipts/cosmic-sound-rentals-receipt.svg?v=receipt-repair-1",
    "gw-exp-004":"https://cmstech.ai/assets/gw-demo-receipts/moonbeam-transit-receipt.svg?v=receipt-repair-1",
    "gw-exp-008":"https://cmstech.ai/assets/gw-demo-receipts/red-rocks-relay-napkin-receipt.svg?v=receipt-repair-1",
    "gw-exp-021":"https://cmstech.ai/assets/gw-demo-receipts/orbital-snack-authority-receipt.svg?v=receipt-repair-1"
  };
  const money=x=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(x||0);
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let S;

  function save(){ localStorage.setItem(K,JSON.stringify(S)); }
  function normalize(state){ state.records.forEach(x=>x.receiptUrl=RECEIPTS[x.id]||""); return state; }
  function isOpen(x){ return !String(x.reviewStatus||"").trim(); }
  function isAlert(x){ return Number(x.certainty)<95; }

  async function init(){
    const cached=localStorage.getItem(K);
    S=normalize(cached?JSON.parse(cached):await fetch("assets/gwdemo-data.json").then(r=>r.json()));
    $("rows").onclick=e=>{ const row=e.target.closest("[data-id]"); if(row) open(row.dataset.id); };
    $("close").onclick=()=>$("modal").hidden=true;
    $("modal").onclick=e=>{ if(e.target===$("modal")) $("modal").hidden=true; };
    $("approve").onclick=()=>resolve("Approved");
    $("reject").onclick=()=>resolve("Rejected");
    render();
  }

  function openRecords(){ return S.records.filter(isOpen).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)); }

  function render(){
    const records=openRecords(), alerts=records.filter(isAlert);
    $("review").textContent=records.length;
    $("alerts").textContent=alerts.length;
    $("spend").textContent=money(records.reduce((sum,x)=>sum+Number(x.amount||0),0));
    $("receiptCount").textContent=records.filter(x=>x.receiptUrl).length;
    $("queueNote").textContent=records.length
      ? records.length+" unresolved expenses · "+alerts.length+" marked ALERT · select a transaction to review."
      : "No open expenses or alerts. The working queue is clear.";
    $("rows").innerHTML=records.map(x=>{
      const state=isAlert(x)?"ALERT · "+x.certainty+"%":"Needs review · "+x.certainty+"%";
      return '<div class="row" data-id="'+x.id+'"><span>'+esc(x.date)+'</span><b>'+esc(x.vendor)+'</b><span>'+esc(x.category)+'</span><span>'+esc(x.client)+'</span><span class="state '+(isAlert(x)?"alert":"")+'">'+state+'</span><span class="amount">'+money(x.amount)+'</span></div>';
    }).join("")||'<p class="note">Nothing is awaiting review. Visit the full audit trail for the complete fictional history.</p>';
    charts(records);
  }

  function charts(records){
    const chrono=[...records].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
    const svg=$("velocityChart"),n=chrono.length;
    if(!n){
      svg.innerHTML="";
      $("velocityStart").textContent="Queue clear"; $("velocityEnd").textContent="";
      $("categoryBars").innerHTML='<p class="note">No unresolved-category totals.</p>';
      return;
    }
    const values=chrono.map(x=>Number(x.amount)||0),max=Math.max(...values,1);
    const points=chrono.map((x,i)=>({x,px:n===1?380:20+i*720/(n-1),py:220-(Number(x.amount)||0)/max*175}));
    const line=points.map(p=>p.px+","+p.py).join(" ");
    svg.innerHTML='<polygon points="20,235 '+line+' 740,235" fill="url(#velocityFill)" opacity=".26"></polygon><defs><linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b46bff"></stop><stop offset="1" stop-color="#b46bff" stop-opacity="0"></stop></linearGradient></defs><polyline points="'+line+'" fill="none" stroke="#c978ff" stroke-width="4"></polyline>'+points.map(p=>'<circle class="velocity-point" data-id="'+p.x.id+'" tabindex="0" cx="'+p.px+'" cy="'+p.py+'" r="7"><title>'+esc(p.x.date)+" · "+esc(p.x.vendor)+" · "+money(p.x.amount)+'</title></circle>').join("");
    svg.onclick=e=>{ const point=e.target.closest("[data-id]"); if(point) open(point.dataset.id); };
    $("velocityStart").textContent=chrono[0].date;
    $("velocityEnd").textContent=chrono.at(-1).date;
    const groups={};
    records.forEach(x=>groups[x.category]=(groups[x.category]||0)+Number(x.amount||0));
    const rows=Object.entries(groups).sort((a,b)=>b[1]-a[1]),top=Math.max(...rows.map(x=>x[1]),1);
    const colors=["#ff7a84","#ffd34e","#b46bff","#3edbd5","#6ea8ff"];
    $("categoryBars").innerHTML=rows.map(([name,total],i)=>'<div class="category-row"><span>'+esc(name)+'</span><i class="category-track"><em class="category-fill" style="width:'+Math.max(4,total/top*100)+'%;background:'+colors[i%colors.length]+'"></em></i><b>'+money(total)+'</b></div>').join("");
  }

  function open(id){
    const x=S.records.find(y=>y.id===id);
    if(!x) return;
    $("modal").dataset.id=id;
    $("recordKicker").textContent=isAlert(x)?"ALERT · receipt review":"Open expense · receipt review";
    $("title").textContent=x.vendor;
    $("facts").innerHTML=[
      ["Amount",money(x.amount)],["Tax",money(x.tax)],["Category",x.category],
      ["Client",x.client],["Date",x.date],["AI certainty",x.certainty+"%"],
      ["Receipt",x.receiptUrl?"Linked image available":"No image linked"]
    ].map(([label,value])=>'<div class="fact"><label>'+esc(label)+'</label><b>'+esc(value)+'</b></div>').join("");
    $("receipt").href=x.receiptUrl||"#";
    $("receipt").hidden=!x.receiptUrl;
    $("actions").hidden=!isOpen(x);
    $("actionNote").textContent=isAlert(x)
      ?"Alert: low-confidence receipt. Confirm or reject this entry."
      :"This expense remains open pending an operator decision.";
    $("modal").hidden=false;
  }

  function resolve(status){
    const id=$("modal").dataset.id, x=S.records.find(y=>y.id===id);
    if(!x) return;
    x.reviewStatus=status;
    save();
    $("modal").hidden=true;
    render();
  }

  init().catch(error=>{
    console.error(error);
    $("queueNote").textContent="The fictional review queue could not be loaded.";
  });
})();