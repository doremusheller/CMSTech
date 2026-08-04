(() => {
  const endpoint = document.querySelector('meta[name="cms-analytics-api"]')?.content?.trim();
  const host = document.querySelector(".foot");
  if (!host) return;

  const style = document.createElement("style");
  style.textContent = `
    .google-intelligence{grid-column:1/-1;display:grid;gap:14px;border-color:rgba(97,169,255,.38);background:linear-gradient(135deg,rgba(22,45,82,.28),rgba(23,10,6,.88))}
    .google-intelligence .head{margin:0}.google-intelligence-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
    .google-stat{min-height:78px;padding:12px 14px;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:rgba(0,0,0,.2)}
    .google-stat span{display:block;color:#a99180;font-size:8px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.google-stat strong{display:block;margin-top:7px;color:#8ab9ff;font:500 25px Georgia,serif}.google-stat small{color:#947b6a;font-size:9px}
    .google-detail-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.google-subpanel{padding:13px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(0,0,0,.16)}
    .google-subpanel h3{margin:0 0 10px;color:#fff0dc;font:500 16px Georgia,serif}.google-trend{height:120px;width:100%;overflow:visible}.google-trend-grid{stroke:rgba(255,255,255,.1);stroke-width:1}.google-trend-line{fill:none;stroke:#61a9ff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.google-trend-area{fill:rgba(97,169,255,.09)}
    .google-list{display:grid}.google-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:8px 0;border-top:1px solid rgba(255,255,255,.07);color:#c9b7a9;font-size:10px}.google-row b{color:#ffc247}.google-status{margin:0;color:#8f7a6d;font-size:10px}.google-status.error{color:#ff9b6b}.google-status.live{color:#75dcca}
    @media(max-width:900px){.google-intelligence-grid{grid-template-columns:repeat(2,1fr)}.google-detail-grid{grid-template-columns:1fr}}
    @media(max-width:560px){.google-intelligence-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.className = "block google-intelligence";
  panel.id = "googleIntelligence";
  panel.innerHTML = `
    <div class="head"><div><p class="kicker">Google · Public intelligence</p><h2 class="title">Website &amp; Search Visibility</h2></div><span class="tag" id="googleDataFreshness">Bridge pending</span></div>
    <div class="google-intelligence-grid">
      <div class="google-stat"><span>Active now</span><strong id="googleActiveNow">—</strong><small>Realtime visitors</small></div>
      <div class="google-stat"><span>30-day visitors</span><strong id="googleVisitors">—</strong><small>Active users</small></div>
      <div class="google-stat"><span>Page views</span><strong id="googleViews">—</strong><small>Last 30 days</small></div>
      <div class="google-stat"><span>Search visibility</span><strong id="googleImpressions">—</strong><small>Google impressions</small></div>
    </div>
    <div class="google-detail-grid">
      <div class="google-subpanel"><h3>Audience trend</h3><svg class="google-trend" id="googleTrend" viewBox="0 0 600 120" preserveAspectRatio="none" aria-label="Website audience trend"></svg></div>
      <div class="google-subpanel"><h3>Top pages</h3><div class="google-list" id="googleTopPages"><div class="google-row"><span>Waiting for secure bridge</span><b>—</b></div></div></div>
      <div class="google-subpanel"><h3>Traffic sources</h3><div class="google-list" id="googleSources"><div class="google-row"><span>Waiting for secure bridge</span><b>—</b></div></div></div>
      <div class="google-subpanel"><h3>Search queries</h3><div class="google-list" id="googleQueries"><div class="google-row"><span>New property—data will accumulate</span><b>—</b></div></div></div>
    </div>
    <p class="google-status" id="googleStatus">Analytics panel is ready. Secure bridge deployment is the remaining connection step.</p>
  `;
  host.before(panel);

  const $ = id => document.getElementById(id);
  const format = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0));
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));

  function list(id, rows, label, value, empty) {
    $(id).innerHTML = rows?.length ? rows.slice(0, 6).map(row => `<div class="google-row"><span>${escapeHtml(label(row))}</span><b>${escapeHtml(value(row))}</b></div>`).join("") : `<div class="google-row"><span>${escapeHtml(empty)}</span><b>—</b></div>`;
  }

  function trend(rows) {
    const svg = $("googleTrend");
    const values = (rows || []).map(row => Number(row.activeUsers || 0));
    if (!values.length) { svg.innerHTML = ""; return; }
    const peak = Math.max(1, ...values);
    const points = values.map((value, index) => ({ x: values.length === 1 ? 300 : index * 600 / (values.length - 1), y: 108 - value / peak * 94 }));
    const path = points.map(point => `${point.x},${point.y}`).join(" ");
    const area = `M${points[0].x},108 L${path.replaceAll(" ", " L")} L${points.at(-1).x},108 Z`;
    svg.innerHTML = `<path class="google-trend-grid" d="M0 14H600M0 61H600M0 108H600"/><path class="google-trend-area" d="${area}"/><polyline class="google-trend-line" points="${path}"/>`;
  }

  function render(data) {
    $("googleActiveNow").textContent = format(data.analytics?.activeNow);
    $("googleVisitors").textContent = format(data.analytics?.activeUsers30d);
    $("googleViews").textContent = format(data.analytics?.views30d);
    $("googleImpressions").textContent = format(data.search?.impressions);
    trend(data.analytics?.trend);
    list("googleTopPages", data.analytics?.pages, row => row.title || row.path, row => `${format(row.views)} views`, "No page data yet");
    list("googleSources", data.analytics?.sources, row => row.channel, row => `${format(row.sessions)} sessions`, "No traffic-source data yet");
    list("googleQueries", data.search?.queries, row => row.query, row => `${format(row.impressions)} impressions`, "No search-query data yet");
    const updated = new Date(data.generatedAt);
    $("googleDataFreshness").textContent = Number.isNaN(updated.getTime()) ? "Connected" : updated.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
    $("googleStatus").textContent = `Live Google Analytics and Search Console data${data.cached ? " · cached for performance" : ""}.`;
    $("googleStatus").className = "google-status live";
  }

  async function load() {
    if (!endpoint) return;
    const status = $("googleStatus");
    status.textContent = "Loading Google intelligence…";
    try {
      const token = await window.cmsAnalyticsTokenProvider?.();
      if (!token) throw new Error("Sign in with Microsoft to load analytics");
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) throw new Error(`Analytics bridge returned ${response.status}`);
      render(await response.json());
    } catch (error) {
      status.textContent = error.message || "Analytics data is temporarily unavailable";
      status.className = "google-status error";
    }
  }

  window.addEventListener("cms:authenticated", load);
  if (endpoint && window.cmsAnalyticsTokenProvider) load();
})();
