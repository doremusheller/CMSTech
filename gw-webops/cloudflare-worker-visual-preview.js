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
  form.append("output_format", "jpeg");
  form.append("output_compression", "82");

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
  return `data:image/jpeg;base64,${b64}`;
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

    if (request.method === "POST" && url.pathname === "/visual-proposal") {
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
        const asset = heroAssetFromHtml(source.content);
        const assetPath = target.file.replace(/[^/]+$/, asset);
        const heroSvg = await getGitHubFile(assetPath, env.GITHUB_TOKEN);
        const editedImage = await generateHeroPreview({
          svg: heroSvg.content,
          instruction,
          identity: target.identity,
          apiKey: env.OPENAI_API_KEY,
        });
        const content = swapHero(source.content, editedImage);
        return json({
          ok: true,
          mode: "visual-preview-only",
          target: body.target,
          summary: "Visual hero revision generated. The original page layout, style, and content are unchanged.",
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
