import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

// Lazily construct the Anthropic client so the app boots fine without a key.
let anthropicClient = null;
function getAnthropic() {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: config.anthropic.apiKey });
  return anthropicClient;
}

// Split a data URL into media type + base64 payload.
function parseDataUrl(image) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(image);
  if (m) return { mediaType: m[1], data: m[2] };
  return { mediaType: "image/png", data: image };
}

const LANGUAGE_NAMES = {
  latin: "English / Latin",
  cyrillic: "Russian / Cyrillic",
  arabic: "Arabic",
  hindi: "Hindi (Devanagari)",
  bengali: "Bengali",
  chinese: "Chinese",
  japanese: "Japanese",
  korean: "Korean",
};

// JSON schema for Anthropic structured output.
const GLYPH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    glyphs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          char: { type: "string", description: "the single character" },
          x: { type: "number", description: "left, 0..1 of image width" },
          y: { type: "number", description: "top, 0..1 of image height" },
          w: { type: "number", description: "width, 0..1 of image width" },
          h: { type: "number", description: "height, 0..1 of image height" },
          form: { type: "string", enum: ["isol", "init", "medi", "fina"], description: "Arabic positional form" },
        },
        required: ["char", "x", "y", "w", "h"],
      },
    },
  },
  required: ["glyphs"],
};

function buildPrompt(language, details, includeJsonShape) {
  const langName = LANGUAGE_NAMES[language] || language;
  const arabicNote =
    language === "arabic"
      ? `\n- This is Arabic. For each letter instance also report its positional FORM ("isol", "init", "medi", "fina") based on where it sits in the word.`
      : "";
  const userNote = details && details.trim() ? `\n\nUser-provided context (use it to read the sample accurately): ${details.trim()}` : "";
  const jsonShape = includeJsonShape
    ? `\n\nReturn ONLY a JSON object of this exact shape (no prose, no markdown):\n{"glyphs":[{"char":"a","x":0.12,"y":0.30,"w":0.04,"h":0.06,"form":"init"}]}\nwhere x,y,w,h are normalized fractions (0..1) of the image, origin top-left, and "form" is included only for Arabic.`
    : "";
  return `You are analyzing a handwriting image to extract individual character shapes for building a personal font in ${langName}.

Work like a meticulous typographer. Identify every legible character instance you can cleanly isolate (a tight bounding box around one character and nothing else). Prefer the cleanest instance of each distinct character.

Rules:
- Read in ${langName}. Include letters, digits, and punctuation that belong to this script.
- Give a TIGHT bounding box per character. Coordinates are normalized fractions of the image (x,y,w,h in 0..1, origin top-left).
- Skip marks you cannot confidently identify or separate.
- One entry per distinct character is enough; a few instances are fine.${arabicNote}${userNote}${jsonShape}`;
}

const FORMS = new Set(["isol", "init", "medi", "fina"]);

// Parse JSON that may be wrapped in markdown fences or surrounded by prose.
function parseJsonLoose(text) {
  const trimmed = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Provider did not return valid JSON");
  }
}

// Clamp + shape the model's glyph list into our canonical form.
function normalizeGlyphs(parsed) {
  const glyphs = Array.isArray(parsed?.glyphs) ? parsed.glyphs : [];
  return glyphs
    .filter((g) => typeof g.char === "string" && g.char.length >= 1)
    .map((g) => ({
      char: [...g.char][0],
      x: Math.max(0, Math.min(1, +g.x || 0)),
      y: Math.max(0, Math.min(1, +g.y || 0)),
      w: Math.max(0, Math.min(1, +g.w || 0)),
      h: Math.max(0, Math.min(1, +g.h || 0)),
      ...(FORMS.has(g.form) ? { form: g.form } : {}),
    }))
    .filter((g) => g.w > 0 && g.h > 0);
}

// --- provider: Anthropic ---------------------------------------------------
async function labelWithAnthropic(image, { language, details }) {
  const c = getAnthropic();
  const { mediaType, data } = parseDataUrl(image);
  const response = await c.messages.create({
    model: config.anthropic.model,
    max_tokens: 8192,
    output_config: { effort: "high", format: { type: "json_schema", schema: GLYPH_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: buildPrompt(language, details, false) },
        ],
      },
    ],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) return [];
  return normalizeGlyphs(JSON.parse(textBlock.text));
}

// --- provider: Gemini (free tier, REST) ------------------------------------
async function labelWithGemini(image, { language, details }) {
  const { mediaType, data } = parseDataUrl(image);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mediaType, data } },
            { text: buildPrompt(language, details, true) },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") || "";
  if (!text) return [];
  return normalizeGlyphs(parseJsonLoose(text));
}

// --- provider: any OpenAI-compatible vision API (Groq / OpenRouter / GitHub Models / …) ---
async function labelWithOpenAICompat(image, { language, details }) {
  const base = config.openaiCompat.baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiCompat.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiCompat.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(language, details, true) },
            { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/png;base64,${image}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI-compatible ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || "";
  if (!text) return [];
  return normalizeGlyphs(parseJsonLoose(text));
}

// Orchestrate a fallback CHAIN: try each configured provider in order; on any
// error, move to the next. Anthropic → Gemini → OpenAI-compatible.
export async function labelHandwriting(image, { language = "latin", details = "" } = {}) {
  const opts = { language, details };
  const providers = [];
  if (config.anthropic.apiKey) providers.push({ name: "Anthropic", run: () => labelWithAnthropic(image, opts) });
  if (config.gemini.apiKey) providers.push({ name: "Gemini", run: () => labelWithGemini(image, opts) });
  if (config.openaiCompat.apiKey && config.openaiCompat.baseUrl && config.openaiCompat.model) {
    providers.push({ name: "OpenAI-compatible", run: () => labelWithOpenAICompat(image, opts) });
  }

  if (!providers.length) {
    const err = new Error(
      "Single-photo mode is not configured. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or an OPENAI_COMPAT_* provider in the backend .env, or use Template mode (fully offline)."
    );
    err.status = 501;
    throw err;
  }

  let lastErr;
  for (const p of providers) {
    try {
      const glyphs = await p.run();
      if (glyphs && glyphs.length) return glyphs;
      lastErr = new Error(`${p.name} returned no characters`);
      console.warn(`[vision] ${p.name} returned 0 glyphs, trying next provider`);
    } catch (e) {
      lastErr = e;
      console.warn(`[vision] ${p.name} failed, trying next provider:`, e.message);
    }
  }
  throw lastErr || new Error("All vision providers failed");
}
