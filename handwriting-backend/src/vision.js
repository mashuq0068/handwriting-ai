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

// --- provider: Claude (Anthropic) ------------------------------------------
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

// --- provider: GPT (OpenAI chat completions, gpt-4o vision) -----------------
async function labelWithOpenAI(image, { language, details }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.visionModel,
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
    throw new Error(`OpenAI vision ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content || "";
  if (!text) return [];
  return normalizeGlyphs(parseJsonLoose(text));
}

export function visionEnabled(provider) {
  if (provider === "gpt") return Boolean(config.openai.apiKey);
  if (provider === "claude") return Boolean(config.anthropic.apiKey);
  return Boolean(config.anthropic.apiKey || config.openai.apiKey);
}

// Locate/label letters in a handwriting image with the chosen provider.
export async function labelHandwriting(image, { language = "latin", details = "", provider = "claude" } = {}) {
  const opts = { language, details };
  if (provider === "gpt") {
    if (!config.openai.apiKey) {
      const err = new Error("GPT is selected but OPENAI_API_KEY is not set in the backend .env.");
      err.status = 501;
      throw err;
    }
    return labelWithOpenAI(image, opts);
  }
  // default: Claude
  if (!config.anthropic.apiKey) {
    const err = new Error("Claude is selected but ANTHROPIC_API_KEY is not set in the backend .env.");
    err.status = 501;
    throw err;
  }
  return labelWithAnthropic(image, opts);
}
