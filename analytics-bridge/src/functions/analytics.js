import { app } from "@azure/functions";
import { fetchCmsAnalytics } from "../lib/google-data.js";

let cache = { expires: 0, data: null };

function corsHeaders(request) {
  const allowed = process.env.ALLOWED_ORIGIN || "https://cmstech.ai";
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

app.http("analytics", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "analytics",
  handler: async (request, context) => {
    const headers = corsHeaders(request);
    if (request.method === "OPTIONS") return { status: 204, headers };

    const requireEntra = String(process.env.REQUIRE_ENTRA_AUTH || "true").toLowerCase() !== "false";
    if (requireEntra && !request.headers.get("x-ms-client-principal")) {
      return { status: 401, headers, jsonBody: { error: "Microsoft Entra authentication required" } };
    }

    try {
      if (cache.data && Date.now() < cache.expires) {
        return { status: 200, headers: { ...headers, "Cache-Control": "private, max-age=60" }, jsonBody: { ...cache.data, cached: true } };
      }
      const data = await fetchCmsAnalytics();
      cache = { data, expires: Date.now() + 15 * 60 * 1000 };
      return { status: 200, headers: { ...headers, "Cache-Control": "private, max-age=60" }, jsonBody: { ...data, cached: false } };
    } catch (error) {
      context.error("Analytics bridge failed", error);
      return { status: 502, headers, jsonBody: { error: "Analytics data is temporarily unavailable" } };
    }
  }
});
