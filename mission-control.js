(() => {
  const CLIENT_ID = "4ee3e5d2-4598-4656-8e20-358dc63226da";
  const TENANT_ID = "04bfc180-5650-4f0b-9a97-22fc45c33b9c";
  const WORKBOOK_ITEM_ID = "015GYJNAHEDZFFW2NWT5CZ6D5HMWSBNW7W";
  const SCOPES = ["User.Read", "Files.ReadWrite"];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value || 0);
  const number = value => Number(String(value ?? "").replace(/[$,%]/g,"").replace(/,/g,"")) || 0;
  const toCertainty = value => { const n = number(value); return n <= 1 ? Math.round(n * 100) : Math.round(n); };
  let records = [];
  let graphClient;

  function receiptUrl(formula, value) {
    const match = String(formula || "").match(/HYPERLINK\(\s*"([^"]+)"/i);
    const candidate = match ? match[1].replace(/""/g, '"') : String(value || "").trim();
    return /^https?:\/\//i.test(candidate) ? candidate : "";
  }

  function parse(values, formulas) {
    const [headers, ...rows] = values || [];
    if (!headers) throw new Error("The CMSLedger workbook is empty.");
    const index = label => headers.findIndex(header => String(header ?? "").trim().toLowerCase() === label.toLowerCase());
    const columns = { vendor:index("Vendor"), category:index("Category"), client:index("Client"), amount:index("Amount"), certainty:index("AI Certainty (%)"), receipt:index("Receipt"), date:index("Date") };
    if ([columns.vendor,columns.category,columns.client,columns.amount,columns.certainty].some(value => value < 0)) throw new Error("The workbook does not have the CMSLedger columns Mission Control expects.");
    return rows.filter(row => String(row[columns.amount] ?? "").trim()).map((row, id) => ({
      id, vendor:String(row[columns.vendor] ?? "Unclassified vendor").trim(), category:String(row[columns.category] ?? "Unclassified").trim(),
      client:String(row[columns.client] ?? "CMS Tech").trim(), amount:number(row[columns.amount]), certainty:toCertainty(row[columns.certainty]), receiptUrl:receiptUrl(formulas?.[id + 1]?.[columns.receipt], row[columns.receipt]), date:String(row[columns.date] ?? "").trim()
    }));
  }

  function render() {
    const query = $("expenseSearch").value.trim().toLowerCase();
    const client = $("clientFilter").value;
    const visible = records.filter(record => (!client || record.client === client) && (!query || [record.vendor,record.category,record.client,record.date].join(" ").toLowerCase().includes(query)));
    const total = visible.reduce((sum, record) => sum + record.amount, 0);
    const average = visible.length ? Math.round(visible.reduce((sum,record) => sum + record.certainty,0) / visible.length) : 0;
    $("visibleSpend").textContent = money(total);
    $("deductible").textContent = money(total);
    $("receiptCertainty").textContent = visible.length ? average + "%" : "—";
    $("needsReview").textContent = visible.filter(record => record.certainty < 95).length;
    $("visibleNote").textContent = visible.length + " live ledger record" + (visible.length === 1 ? "" : "s");

    $("ledgerRows").innerHTML = visible.length ? visible.map(record => '<div class="empty-row" data-expense-id="' + record.id + '"><span><b style="color:#efe1d5">' + esc(record.vendor) + '</b> · ' + esc(record.category) + '<br><small style="color:#38dfd0">' + esc(record.client) + '</small></span><strong style="color:#ffc247">' + money(record.amount) + '</strong></div>').join("") : '<div class="empty-row">No matching ledger records.</div>';

    const groups = visible.reduce((all,record) => { all[record.category] = (all[record.category] || 0) + record.amount; return all; }, {});
    const peakCategory = Math.max(1,...Object.values(groups));
    $("categories").innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([category, amount]) => '<div class="category"><span>' + esc(category) + '</span><div class="bar"><span style="width:' + (amount / peakCategory * 100) + '%"></span></div><b>' + money(amount) + '</b></div>').join("") : '<div class="category"><span>No category data</span><div class="bar"><span></span></div><b>—</b></div>';

    const values = []; visible.reduce((sum,record) => { sum += record.amount; values.push(sum); return sum; },0);
    const peak = Math.max(1,...values);
    const curve = $("curve");
    curve.innerHTML = values.map((value,index) => {
      const x = 20 + 960 * (values.length === 1 ? .5 : index / (values.length - 1));
      const y = 230 - 200 * value / peak;
      return {x,y};
    }).map(point => '<circle cx="' + point.x + '" cy="' + point.y + '" r="8" fill="#ffc247" stroke="#7a3b07" stroke-width="5"></circle>').join("");
    const points = values.map((value,index) => (20 + 960 * (values.length === 1 ? .5 : index / (values.length - 1))) + "," + (230 - 200 * value / peak)).join(" ");
    curve.insertAdjacentHTML("afterbegin", points ? '<polyline points="' + points + '" fill="none" stroke="#ffc247" stroke-width="4"></polyline>' : "");
  }

  async function graphRequest(account, path, options = {}) {
    const token = await graphClient.acquireTokenSilent({account,scopes:SCOPES});
    const headers = {Authorization:"Bearer " + token.accessToken, ...(options.headers || {})};
    const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/items/" + WORKBOOK_ITEM_ID + "/workbook/" + path, {...options, headers});
    if (!response.ok) throw new Error("Microsoft Graph returned " + response.status);
    return response.status === 204 ? null : response.json();
  }

  async function ensureDepositsSheet(account) {
    try { await graphRequest(account, "worksheets/Deposits/usedRange"); return; }
    catch (error) {
      if (!String(error.message).includes("404")) throw error;
    }
    await graphRequest(account, "worksheets/add", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Deposits"})});
    await graphRequest(account, "worksheets/Deposits/range(address='A1:D1')", {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({values:[["Date Deposited","Deposit Amount","Source","Client/Project Name"]]})});
  }

  function openDeposit() {
    $("depositForm").reset();
    $("depositDate").value = new Date().toISOString().slice(0,10);
    $("depositStatus").textContent = "";
    $("depositStatus").className = "deposit-status";
    $("depositModal").hidden = false;
    $("depositModal").setAttribute("aria-hidden","false");
    $("depositAmount").focus();
  }

  function closeDeposit() { $("depositModal").hidden = true; $("depositModal").setAttribute("aria-hidden","true"); }

  async function saveDeposit(event) {
    event.preventDefault();
    const account = graphClient.getActiveAccount() || graphClient.getAllAccounts()[0];
    if (!account) return signIn();
    const date = $("depositDate").value;
    const amount = Number($("depositAmount").value);
    const source = $("depositSource").value.trim();
    const client = $("depositClient").value.trim();
    if (!date || !(amount > 0) || !source) return;
    const submit = $("depositSubmit"), status = $("depositStatus");
    submit.disabled = true; submit.textContent = "Saving private deposit…"; status.textContent = "";
    try {
      await ensureDepositsSheet(account);
      const range = await graphRequest(account, "worksheets/Deposits/usedRange");
      const row = (range.rowIndex || 0) + (range.rowCount || 1) + 1;
      await graphRequest(account, "worksheets/Deposits/range(address='A" + row + ":D" + row + "')", {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({values:[[date,amount,source,client]]})});
      status.textContent = "Deposit saved to the private workbook.";
      submit.textContent = "Saved";
      setTimeout(closeDeposit, 800);
    } catch (error) {
      console.error(error); status.className = "deposit-status error"; status.textContent = "Could not save the deposit. Please try again."; submit.textContent = "Save private deposit";
    } finally { submit.disabled = false; }
  }

  function showError(error) {
    console.error(error);
    $("visibleNote").textContent = "Microsoft connection needs attention";
    $("signInButton").disabled = false;
    $("signInButton").textContent = "Reconnect Microsoft 365";
    $("signInButton").onclick = signIn;
  }

  async function fetchLedger(account) {
    const token = await graphClient.acquireTokenSilent({account,scopes:SCOPES});
    const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/items/" + WORKBOOK_ITEM_ID + "/workbook/worksheets/Expenses/usedRange", {headers:{Authorization:"Bearer " + token.accessToken}});
    if (!response.ok) throw new Error("Microsoft Graph returned " + response.status);
    const data = await response.json();
    records = parse(data.values, data.formulas);
    const clients = [...new Set(records.map(record => record.client).filter(Boolean))].sort();
    $("clientFilter").innerHTML = '<option value="">All clients</option>' + clients.map(client => '<option value="' + esc(client) + '">' + esc(client) + '</option>').join("");
    ["clientFilter","expenseSearch","resetButton","depositButton"].forEach(id => $(id).disabled = false);
    document.querySelector(".chart").classList.add("connected");
    $("signInButton").disabled = false;
    $("signInButton").textContent = "Refresh private ledger";
    $("signInButton").onclick = () => fetchLedger(account).catch(showError);
    render();
  }

  function closeExpense() { $("expenseModal").hidden = true; $("expenseModal").setAttribute("aria-hidden","true"); }
  function openExpense(id) {
    const record = records.find(item => item.id === Number(id)); if (!record) return;
    $("expenseTitle").textContent = record.vendor;
    $("expenseFacts").innerHTML = [["Amount",money(record.amount)],["Category",record.category],["Client",record.client],["Date",record.date || "Not recorded"],["AI certainty",record.certainty + "%"]].map(([label,value]) => '<div class="expense-fact"><label>' + esc(label) + '</label><b>' + esc(value) + '</b></div>').join("");
    const receipt = $("viewReceipt"); receipt.href = record.receiptUrl || "#"; receipt.setAttribute("aria-disabled", record.receiptUrl ? "false" : "true"); receipt.textContent = record.receiptUrl ? "View receipt ↗" : "No receipt linked";
    $("expenseModal").hidden = false; $("expenseModal").setAttribute("aria-hidden","false");
  }

  async function signIn() {
    $("signInButton").disabled = true;
    $("signInButton").textContent = "Opening Microsoft sign-in…";
    await graphClient.loginRedirect({scopes:SCOPES});
  }

  async function start() {
    const style = document.createElement("style");
    style.textContent = ".chart.connected:after{display:none}";
    document.head.appendChild(style);
    graphClient = new msal.PublicClientApplication({
      auth:{clientId:CLIENT_ID,authority:"https://login.microsoftonline.com/" + TENANT_ID,redirectUri:"https://cmstech.ai/mission-control.html"},
      cache:{cacheLocation:"sessionStorage"}
    });
    await graphClient.initialize();
    await graphClient.handleRedirectPromise();
    $("signInButton").onclick = signIn;
    $("expenseSearch").addEventListener("input", render);
    $("clientFilter").addEventListener("change", render);
    $("resetButton").addEventListener("click", () => { $("clientFilter").value = ""; $("expenseSearch").value = ""; render(); });
    $("depositButton").addEventListener("click", openDeposit);
    $("depositForm").addEventListener("submit", saveDeposit);
    $("depositClose").addEventListener("click", closeDeposit);
    $("depositModal").addEventListener("click", event => { if (event.target === $("depositModal")) closeDeposit(); });
    $("ledgerRows").addEventListener("click", event => { const row = event.target.closest("[data-expense-id]"); if (row) openExpense(row.dataset.expenseId); });
    $("expenseClose").addEventListener("click", closeExpense);
    $("expenseModal").addEventListener("click", event => { if (event.target === $("expenseModal")) closeExpense(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") { closeExpense(); closeDeposit(); } });
    const account = graphClient.getActiveAccount() || graphClient.getAllAccounts()[0];
    if (account) {
      graphClient.setActiveAccount(account);
      $("signInButton").textContent = "Loading private ledger…";
      try { await fetchLedger(account); } catch (error) { showError(error); }
    }
  }
  start().catch(showError);
})();
