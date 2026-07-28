/*
 * GW WebOps visual-preview Worker
 *
 * Required Cloudflare secrets:
 *   OPENAI_API_KEY
 *   GITHUB_TOKEN
 *
 * This version intentionally does NOT publish to GitHub. It creates a
 * temporary visual preview only. Copy the complete file into Cloudflare
 * Workers > gw-webops-control > Edit code > worker.js, then Deploy.
 */

const REPO = "doremusheller/CMSTech";
const BRANCH = "main";
const ADMIN_EMAIL = "doremusheller@gmail.com";
const STATIC_ORIGIN = "https://cmstech.ai/gw-webops/";
const TARGETS = {
  shag: {
    file: "gw-webops/bandsite/shag.html",
    identity:
      "Shag Fantastiq: a charismatic mahogany-furred Wookie bassist, wearing a purple/violet hat and matching ornate vest, sunglasses, and gold jewelry. Preserve this same unmistakable character and wardrobe unless the instruction explicitly changes them.",
  },
  bo: {
    file: "gw-webops/bandsite/bo.html",
    identity:
      "Bodacious Scraggleton XIII: preserve the specific character identity, costume, proportions, and visual style shown in the supplied hero image unless the instruction explicitly changes them.",
  },
  luna: {
    file: "gw-webops/bandsite/luna.html",
    identity:
      "Luna Voce: preserve the specific character identity, costume, proportions, and visual style shown in the supplied hero image unless the instruction explicitly changes them.",
  },
  djastro: {
    file: "gw-webops/bandsite/djastro.html",
    identity:
      "DJ Astrognome: preserve the specific character identity, costume, proportions, and visual style shown in the supplied hero image unless the instruction explicitly changes them.",
  },
  gary: {
    file: "gw-webops/bandsite/gary.html",
    identity:
      "Gary: preserve the specific character identity, costume, proportions, and visual style shown in the supplied hero image unless the instruction explicitly changes them.",
  },
};

function jsonHeaders() {
  // The protected editor and API share the same Worker origin. Deliberately do
  // not enable cross-origin credentialed requests to this secrets-backed API.
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
}

function pageHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
}

function decodeBase64(value) {
  const raw = atob(String(value).replace(/\n/g, ""));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function getGitHubFile(path, token) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "GW-WebOps-Visual-Preview",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub file read failed (${response.status}).`);
  }
  const data = await response.json();
  return { content: new TextDecoder().decode(decodeBase64(data.content)), sha: data.sha };
}

function heroAssetFromHtml(html) {
  const match = html.match(/<img[^>]*class=["'][^"']*hero-image[^"']*["'][^>]*src=["']([^"']+)["']/i);
  if (!match) throw new Error("The selected page does not contain a supported hero image.");
  const source = match[1];
  if (!source.startsWith("assets/")) throw new Error("The selected hero image is not a local editable asset.");
  return source;
}

function imageFromSvg(svg) {
  const match = svg.match(/href=["']data:(image\/(?:jpeg|png|webp));base64,([^"']+)["']/i);
  if (!match) throw new Error("The hero asset did not contain an editable source image.");
  return { type: match[1], bytes: decodeBase64(match[2]) };
}

function swapHero(html, dataUrl) {
  const withImage = html.replace(
    /(<img[^>]*class=["'][^"']*hero-image[^"']*["'][^>]*src=["'])[^"']+(["'])/i,
    `$1${dataUrl}$2`,
  );
  if (withImage === html) throw new Error("The visual preview could not replace the hero image.");

  // A blob/srcdoc preview needs public absolute resources. The original page
  // still owns all layout, typography, panels, and copy.
  return withImage
    .replace(/href=["']\.\.\/webops\.css["']/i, `href="${STATIC_ORIGIN}webops.css"`)
    .replace(/<head([^>]*)>/i, `<head$1><base href="${STATIC_ORIGIN}bandsite/">`);
}

function outputText(data) {
  if (data.output_text) return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("");
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

  if (css && /@import|url\(|expression\(|javascript:/i.test(css)) {
    throw new Error("The requested style preview contains an unsupported external resource.");
  }
  if (appendHtml && /<\/?(?:script|style|iframe|object|embed)|\son\w+\s*=|javascript:/i.test(appendHtml)) {
    throw new Error("The requested content block contains unsupported markup.");
  }
  if (replacements.length > 18) throw new Error("The requested change is too broad for a safe preview.");

  for (const change of replacements) {
    if (!change || typeof change.find !== "string" || typeof change.replace !== "string") {
      throw new Error("The AI returned an invalid text change.");
    }
    if (!change.find || change.find.includes("<") || change.replace.includes("<")) {
      throw new Error("The AI proposed an unsupported markup replacement.");
    }
    if (!source.includes(change.find)) {
      throw new Error(`The requested text target was not found: ${change.find}`);
    }
  }

  return {
    summary: String(plan.summary || "Preview changes generated."),
    imageEdit: Boolean(plan.image_edit),
    imageInstruction: String(plan.image_instruction || "").trim(),
    replacements,
    css,
    appendHtml,
  };
}

function injectPreviewChanges(html, plan) {
  let output = html;
  for (const change of plan.replacements) output = output.replace(change.find, change.replace);
  if (plan.css) {
    output = output.replace(/<\/head>/i, `<style data-webops-preview="true">${plan.css}</style></head>`);
  }
  if (plan.appendHtml) {
    const footer = output.lastIndexOf("<footer");
    if (footer === -1) throw new Error("The selected page has no supported content insertion point.");
    output = `${output.slice(0, footer)}${plan.appendHtml}${output.slice(footer)}`;
  }
  return output;
}

async function buildChangePlan({ html, instruction, apiKey }) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "image_edit", "image_instruction", "replacements", "css", "append_html"],
    properties: {
      summary: { type: "string" },
      image_edit: { type: "boolean" },
      image_instruction: { type: "string" },
      replacements: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["find", "replace"],
          properties: { find: { type: "string" }, replace: { type: "string" } },
        },
      },
      css: { type: "string" },
      append_html: { type: "string" },
    },
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: [
        {
          role: "developer",
          content: [{
            type: "input_text",
            text: [
              "You are the controlled change planner for a website preview.",
              "Return a minimal plan, never a rewritten page.",
              "Use replacements only for exact existing plain-text or URL substrings from the supplied source. Do not include HTML in replacements.",
              "Use css only for requested visual/style/layout changes. It will be injected as a temporary override, so do not recreate the page.",
              "Use append_html only when the user explicitly asks to add a content section. It may contain only ordinary harmless page markup; never scripts, styles, iframes, forms, external embeds, or event handlers.",
              "Set image_edit true only if the request requires changing the actual hero image. Describe the intended image edit in image_instruction. Otherwise false and empty string.",
              "Preserve every unrequested part of the page exactly. Pronouns refer to the selected page subject.",
            ].join("\n"),
          }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: `User request:\n${instruction}\n\nSelected page source:\n${html}` }],
        },
      ],
      text: { format: { type: "json_schema", name: "webops_change_plan", strict: true, schema } },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `AI planning failed (${response.status}).`);
  return parsePlan(data);
}

async function generateHeroPreview({ svg, instruction, identity, apiKey }) {
  const image = imageFromSvg(svg);
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("image", new Blob([image.bytes], { type: image.type }), "current-hero.jpg");
  form.append(
    "prompt",
    [
      "Edit the supplied image for a website hero preview.",
      identity,
      `Requested visual change: ${instruction}`,
      "Preserve the character's recognizable face, species, wardrobe, proportions, pose energy, lighting quality, and overall illustrated photographic realism unless the requested change directly conflicts with one of those details.",
      "Do not add words, captions, logos, frames, watermarks, or UI. Produce a polished wide hero image suitable for the same bandsite design.",
    ].join("\n"),
  );
  form.append("size", "1536x1024");
  form.append("quality", "medium");
  // PNG avoids a browser decode failure if an image endpoint ignores an
  // alternate output format and returns its default PNG payload.
  form.append("output_format", "png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || `Image edit failed (${response.status}).`;
    throw new Error(detail);
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image service did not return preview image data.");
  return `data:image/png;base64,${b64}`;
}

async function serveAuthorConsole(request, pathname) {
  const relative = pathname === "/editor" || pathname === "/editor/"
    ? "index.html"
    : pathname.replace(/^\/editor\//, "");
  const allowed = new Set([
    "index.html",
    "webops.js",
    "webops.css",
    "bandsite/index.html",
    "bandsite/shag.html",
    "bandsite/bo.html",
    "bandsite/luna.html",
    "bandsite/djastro.html",
    "bandsite/gary.html",
    "bandsite/assets/shag-hero.svg",
    "bandsite/assets/bo-hero.svg",
    "bandsite/assets/luna-hero.svg",
    "bandsite/assets/djastro-hero.svg",
    "bandsite/assets/gary-hero.svg",
  ]);
  if (!allowed.has(relative)) return new Response("Not found", { status: 404 });

  const upstream = await fetch(new URL(relative, STATIC_ORIGIN), {
    headers: { "user-agent": "GW-WebOps-Visual-Preview" },
  });
  if (!upstream.ok) return new Response("WebOps source is unavailable.", { status: 502 });
  const type = upstream.headers.get("content-type") || "text/html; charset=utf-8";
  return new Response(upstream.body, { headers: pageHeaders(type) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const actor = request.headers.get("cf-access-authenticated-user-email") || "";

    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    if (url.pathname === "/editor" || url.pathname.startsWith("/editor/")) {
      return serveAuthorConsole(request, url.pathname);
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "GW WebOps Visual Preview", authenticated_as: actor || null, preview_only: true });
    }

    if (request.method === "POST" && url.pathname === "/proposal") {
      if (!env.GITHUB_TOKEN || !env.OPENAI_API_KEY) {
        return json({ error: "Worker secrets are missing. Configure GITHUB_TOKEN and OPENAI_API_KEY." }, 500);
      }
      if (!actor) {
        return json({ error: "Cloudflare Access authentication is required for visual previews." }, 403);
      }
      try {
        const body = await request.json();
        const target = TARGETS[String(body.target || "")];
        const instruction = String(body.instruction || "").trim();
        if (!target || !instruction) {
          return json({ error: "A supported page and visual change instruction are required." }, 400);
        }

        const source = await getGitHubFile(target.file, env.GITHUB_TOKEN);
        const plan = safePlan(
          await buildChangePlan({ html: source.content, instruction, apiKey: env.OPENAI_API_KEY }),
          source.content,
        );
        let content = injectPreviewChanges(source.content, plan);
        if (plan.imageEdit) {
          const asset = heroAssetFromHtml(source.content);
          const assetPath = target.file.replace(/[^/]+$/, asset);
          const heroSvg = await getGitHubFile(assetPath, env.GITHUB_TOKEN);
          const editedImage = await generateHeroPreview({
            svg: heroSvg.content,
            instruction: plan.imageInstruction || instruction,
            identity: target.identity,
            apiKey: env.OPENAI_API_KEY,
          });
          content = swapHero(content, editedImage);
        }
        return json({
          ok: true,
          mode: "controlled-preview-only",
          target: body.target,
          summary: plan.summary,
          content,
          sha: source.sha,
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Visual preview failed." }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/publish") {
      return json({ error: "Publishing is intentionally disabled during the visual-preview prototype." }, 403);
    }

    return json({ error: "Not found" }, 404);
  },
};
