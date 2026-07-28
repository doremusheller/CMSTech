/*
 * GW WebOps public sandbox Worker
 *
 * Required Cloudflare secret:
 *   OPENAI_API_KEY
 *
 * Do NOT add GITHUB_TOKEN to this public Worker.
 * This Worker reads only the five public GW demo pages from cmstech.ai,
 * generates temporary previews, and cannot publish or write GitHub.
 */

const STATIC_ORIGIN = "https://cmstech.ai/gw-webops/";
const ALLOWED_ORIGIN = "https://cmstech.ai";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 4;
const buckets = new Map();

const TARGETS = {
  shag: { file: "bandsite/shag.html", identity: "Shag Fantastiq: a charismatic mahogany-furred Wookie bassist, wearing a purple/violet hat and matching ornate vest, sunglasses, and gold jewelry. Preserve this unmistakable character and wardrobe unless the instruction explicitly changes them." },
  bo: { file: "bandsite/bo.html", identity: "Bodacious Scraggleton XIII: preserve the specific character identity, costume, proportions, and visual style shown in the supplied hero image unless the instruction explicitly changes them." },
  luna: { file: "bandsite/luna.html", identity: "Luna Voce: preserve the specific character identity, costume, proportions, and visual style shown in the supplied hero image unless the instruction explicitly changes them." },
  djastro: { file: "bandsite/djastro.html", identity: "DJ Astrognome: a gnome turntablist with headphones and a microphone, shown in the supplied purple cosmic hero art. Preserve this unmistakable character and visual style unless the instruction explicitly changes them." },
  drummakaan: { file: "bandsite/drummakaan.html", identity: "Drumma Kaan: Ghetto Wookie’s chimp drummer, shown wielding drumsticks in the supplied hero image. Preserve this unmistakable character and visual style unless the instruction explicitly changes them." },
  gary: { file: "bandsite/gary.html", identity: "Gary: preserve the specific character identity, costume, proportions, and visual style shown in the supplied hero image unless the instruction explicitly changes them." },
};

function cors() {
  // Public, preview-only endpoint: do not use cookies or credentials.
  // Wildcard CORS permits both cmstech.ai and www.cmstech.ai.
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

function json(body, status = 200, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cors(request) },
  });
}

function clientAllowed(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) bucket = { count: 0, resetAt: now + WINDOW_MS };
  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    buckets.set(ip, bucket);
    return false;
  }
  bucket.count += 1;
  buckets.set(ip, bucket);
  return true;
}

async function getPublicText(path) {
  const response = await fetch(new URL(path, STATIC_ORIGIN), {
    headers: { "user-agent": "GW-WebOps-Public-Sandbox" },
  });
  if (!response.ok) throw new Error("The selected public sandbox page could not be read.");
  return response.text();
}

function decodeBase64(value) {
  const raw = atob(String(value).replace(/\n/g, ""));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

function heroSourceFromHtml(html) {
  const match = html.match(/<img[^>]*class=["'][^"']*hero-image[^"']*["'][^>]*src=["']([^"']+)["']/i);
  if (!match) throw new Error("The selected page does not contain a supported hero image.");
  return match[1];
}

function imageFromSvg(svg) {
  const match = svg.match(/href=["']data:(image\/(?:jpeg|png|webp));base64,([^"']+)["']/i);
  if (!match) throw new Error("The hero asset did not contain an editable source image.");
  return { type: match[1], bytes: decodeBase64(match[2]) };
}

function imageFromDataUrl(value) {
  const match = String(value).match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
  if (!match) throw new Error("The current preview does not contain an editable hero image.");
  return { type: match[1], bytes: decodeBase64(match[2]) };
}

async function heroInputFromHtml(html, target) {
  const source = heroSourceFromHtml(html);
  if (source.startsWith("data:image/")) return imageFromDataUrl(source);
  if (!source.startsWith("assets/")) throw new Error("The selected hero image is not a supported editable asset.");
  const assetPath = target.file.replace(/[^/]+$/, source);
  return imageFromSvg(await getPublicText(assetPath));
}

function validateDraft(value) {
  const draft = String(value || "");
  if (!draft) return null;
  if (draft.length > 8_000_000) throw new Error("The working preview is too large to iterate safely.");
  if (/<\/?(?:script|iframe|object|embed)|\son\w+\s*=|javascript:/i.test(draft)) {
    throw new Error("The working preview contains unsupported active markup.");
  }
  return draft;
}

function planningSource(html) {
  return html.replace(/data:image\/(?:jpeg|png|webp);base64,[^"']+/gi, "[CURRENT HERO IMAGE]");
}

function outputText(data) {
  if (data.output_text) return data.output_text;
  return (data.output || []).flatMap(item => item.content || []).filter(item => item.type === "output_text").map(item => item.text || "").join("");
}

function parsePlan(data) {
  const match = outputText(data).match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The AI did not return a usable change plan.");
  return JSON.parse(match[0]);
}

function safePlan(plan, source) {
  const replacements = Array.isArray(plan.replacements) ? plan.replacements : [];
  const css = String(plan.css || "").trim();
  const appendHtml = String(plan.append_html || "").trim();
  if (css && /@import|url\(|expression\(|javascript:/i.test(css)) throw new Error("The requested style preview contains an unsupported external resource.");
  if (appendHtml && /<\/?(?:script|style|iframe|object|embed)|\son\w+\s*=|javascript:/i.test(appendHtml)) throw new Error("The requested content block contains unsupported markup.");
  if (replacements.length > 18) throw new Error("The requested change is too broad for a safe preview.");
  for (const change of replacements) {
    if (!change || typeof change.find !== "string" || typeof change.replace !== "string" || !change.find || change.find.includes("<") || change.replace.includes("<") || !source.includes(change.find)) {
      throw new Error("The AI proposed an unsupported text change.");
    }
  }
  return { summary: String(plan.summary || "Preview changes generated."), imageEdit: Boolean(plan.image_edit), imageInstruction: String(plan.image_instruction || "").trim(), replacements, css, appendHtml };
}

function injectPreviewChanges(html, plan) {
  let output = html;
  for (const change of plan.replacements) output = output.replace(change.find, change.replace);
  if (plan.css) output = output.replace(/<\/head>/i, `<style data-webops-preview="true">${plan.css}</style></head>`);
  if (plan.appendHtml) {
    const footer = output.lastIndexOf("<footer");
    if (footer === -1) throw new Error("The selected page has no supported content insertion point.");
    output = output.slice(0, footer) + plan.appendHtml + output.slice(footer);
  }
  return output;
}

async function buildChangePlan({ html, instruction, apiKey }) {
  const schema = {
    type: "object", additionalProperties: false,
    required: ["summary", "image_edit", "image_instruction", "replacements", "css", "append_html"],
    properties: {
      summary: { type: "string" }, image_edit: { type: "boolean" }, image_instruction: { type: "string" },
      replacements: { type: "array", items: { type: "object", additionalProperties: false, required: ["find", "replace"], properties: { find: { type: "string" }, replace: { type: "string" } } } },
      css: { type: "string" }, append_html: { type: "string" },
    },
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: [
        { role: "developer", content: [{ type: "input_text", text: "You are the controlled change planner for a public website preview. Return a minimal plan, never a rewritten page. Use replacements only for exact existing plain-text or URL substrings from the supplied source. Do not include HTML in replacements. Use css only for requested visual/style/layout changes. Use append_html only when the user explicitly asks to add an ordinary harmless page content section. Never use scripts, styles, iframes, forms, external embeds, event handlers, or external URLs. Set image_edit true only when the actual hero image must change. Preserve every unrequested part of the page exactly. Pronouns refer to the selected page subject." }] },
        { role: "user", content: [{ type: "input_text", text: `User request:\n${instruction}\n\nSelected page source:\n${html}` }] },
      ],
      text: { format: { type: "json_schema", name: "webops_change_plan", strict: true, schema } },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `AI planning failed (${response.status}).`);
  return parsePlan(data);
}

async function generateHeroPreview({ image, instruction, identity, apiKey }) {
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("image", new Blob([image.bytes], { type: image.type }), "current-hero.jpg");
  form.append("prompt", ["Edit the supplied image for a website hero preview.", identity, `Requested visual change: ${instruction}`, "Preserve the character's recognizable face, species, wardrobe, proportions, pose energy, lighting quality, and overall illustrated photographic realism unless the requested change directly conflicts with one of those details.", "Do not add words, captions, logos, frames, watermarks, or UI. Produce a polished wide hero image suitable for the same bandsite design."].join("\n"));
  form.append("size", "1536x1024");
  form.append("quality", "medium");
  form.append("output_format", "png");
  const response = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Image edit failed (${response.status}).`);
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image service did not return preview image data.");
  return `data:image/png;base64,${b64}`;
}

function swapHero(html, dataUrl) {
  const withImage = html.replace(/(<img[^>]*class=["'][^"']*hero-image[^"']*["'][^>]*src=["'])[^"']+(["'])/i, `$1${dataUrl}$2`);
  if (withImage === html) throw new Error("The visual preview could not replace the hero image.");
  return withImage.replace(/href=["']\.\.\/webops\.css["']/i, `href="${STATIC_ORIGIN}webops.css"`).replace(/<head([^>]*)>/i, `<head$1><base href="${STATIC_ORIGIN}bandsite/">`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
    if (request.method === "GET" && url.pathname === "/") return json({ ok: true, service: "GW WebOps public sandbox", preview_only: true, request_limit: `${MAX_REQUESTS_PER_WINDOW} proposals per 10 minutes per visitor` }, 200, request);
    if (request.method !== "POST" || url.pathname !== "/proposal") return json({ error: "Not found" }, 404, request);
    if (!env.OPENAI_API_KEY) return json({ error: "Worker secret OPENAI_API_KEY is missing." }, 500, request);
    if (!clientAllowed(request)) return json({ error: "Sandbox limit reached. Please try again in a few minutes." }, 429, request);
    try {
      const body = await request.json();
      const target = TARGETS[String(body.target || "")];
      const instruction = String(body.instruction || "").trim();
      if (!target || !instruction || instruction.length > 1600) return json({ error: "A supported page and a concise change instruction are required." }, 400, request);
      const draft = validateDraft(body.draft);
      const source = draft || await getPublicText(target.file);
      const plan = safePlan(await buildChangePlan({ html: planningSource(source), instruction, apiKey: env.OPENAI_API_KEY }), source);
      let content = injectPreviewChanges(source, plan);
      if (plan.imageEdit) {
        const image = await heroInputFromHtml(source, target);
        content = swapHero(content, await generateHeroPreview({ image, instruction: plan.imageInstruction || instruction, identity: target.identity, apiKey: env.OPENAI_API_KEY }));
      }
      return json({ ok: true, mode: "public-preview-only", target: body.target, summary: plan.summary, content }, 200, request);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Visual preview failed." }, 500, request);
    }
  },
};