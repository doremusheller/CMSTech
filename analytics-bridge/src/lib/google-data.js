import { GoogleAuth } from "google-auth-library";

const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const SEARCH_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function required(name, env = process.env) {
  const value = env[name];
  if (!value) throw new Error(`Missing required setting: ${name}`);
  return value;
}

function serviceAccount(env = process.env) {
  try {
    return JSON.parse(required("GOOGLE_SERVICE_ACCOUNT_JSON", env));
  } catch (error) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON", { cause: error });
  }
}

async function accessToken(env = process.env) {
  const auth = new GoogleAuth({
    credentials: serviceAccount(env),
    scopes: [ANALYTICS_SCOPE, SEARCH_SCOPE]
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Google did not return an access token");
  return token.token;
}

async function googlePost(url, body, token, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google API returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
}

const metric = (report, name) => {
  const index = report.metricHeaders?.findIndex(header => header.name === name) ?? -1;
  return index < 0 ? 0 : Number(report.rows?.[0]?.metricValues?.[index]?.value || 0);
};

const rows = report => (report.rows || []).map(row => ({
  dimensions: (row.dimensionValues || []).map(value => value.value),
  metrics: (row.metricValues || []).map(value => Number(value.value || 0))
}));

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export async function fetchCmsAnalytics(env = process.env, fetchImpl = fetch) {
  const propertyId = required("GOOGLE_ANALYTICS_PROPERTY_ID", env);
  const siteUrl = required("GOOGLE_SEARCH_CONSOLE_SITE_URL", env);
  const token = await accessToken(env);
  const gaBase = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;

  const reports = await googlePost(`${gaBase}:batchRunReports`, { requests: [
    { dateRanges: [{ startDate: "30daysAgo", endDate: "today" }], metrics: [
      { name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "engagementRate" }
    ]},
    { dateRanges: [{ startDate: "30daysAgo", endDate: "today" }], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }] },
    { dateRanges: [{ startDate: "30daysAgo", endDate: "today" }], dimensions: [{ name: "pagePath" }, { name: "pageTitle" }], metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: "8" },
    { dateRanges: [{ startDate: "30daysAgo", endDate: "today" }], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: "8" }
  ]}, token, fetchImpl);

  const realtime = await googlePost(`${gaBase}:runRealtimeReport`, { metrics: [{ name: "activeUsers" }] }, token, fetchImpl);
  const [summary = {}, trend = {}, pages = {}, sources = {}] = reports.reports || [];

  const searchEnd = new Date();
  searchEnd.setUTCDate(searchEnd.getUTCDate() - 3);
  const searchStart = new Date(searchEnd);
  searchStart.setUTCDate(searchStart.getUTCDate() - 27);
  const searchBase = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const [searchTrend, searchQueries] = await Promise.all([
    googlePost(searchBase, { startDate: isoDate(searchStart), endDate: isoDate(searchEnd), dimensions: ["date"], rowLimit: 1000 }, token, fetchImpl),
    googlePost(searchBase, { startDate: isoDate(searchStart), endDate: isoDate(searchEnd), dimensions: ["query"], rowLimit: 10 }, token, fetchImpl)
  ]);

  const searchRows = searchTrend.rows || [];
  const searchTotals = searchRows.reduce((totals, row) => ({
    clicks: totals.clicks + Number(row.clicks || 0),
    impressions: totals.impressions + Number(row.impressions || 0),
    weightedPosition: totals.weightedPosition + Number(row.position || 0) * Number(row.impressions || 0)
  }), { clicks: 0, impressions: 0, weightedPosition: 0 });

  return {
    generatedAt: new Date().toISOString(),
    analytics: {
      activeNow: metric(realtime, "activeUsers"),
      activeUsers30d: metric(summary, "activeUsers"),
      sessions30d: metric(summary, "sessions"),
      views30d: metric(summary, "screenPageViews"),
      engagementRate30d: metric(summary, "engagementRate"),
      trend: rows(trend).map(row => ({ date: row.dimensions[0], activeUsers: row.metrics[0], sessions: row.metrics[1] })),
      pages: rows(pages).map(row => ({ path: row.dimensions[0], title: row.dimensions[1], views: row.metrics[0], activeUsers: row.metrics[1] })),
      sources: rows(sources).map(row => ({ channel: row.dimensions[0], sessions: row.metrics[0] }))
    },
    search: {
      period: { startDate: isoDate(searchStart), endDate: isoDate(searchEnd) },
      clicks: searchTotals.clicks,
      impressions: searchTotals.impressions,
      ctr: searchTotals.impressions ? searchTotals.clicks / searchTotals.impressions : 0,
      averagePosition: searchTotals.impressions ? searchTotals.weightedPosition / searchTotals.impressions : 0,
      trend: searchRows.map(row => ({ date: row.keys?.[0], clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 })),
      queries: (searchQueries.rows || []).map(row => ({ query: row.keys?.[0], clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 }))
    }
  };
}
