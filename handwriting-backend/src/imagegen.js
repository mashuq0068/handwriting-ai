import { config } from "./config.js";

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

const DEFAULT_CHARS =
  "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 . , ! ? ' -";

function buildPrompt(language, chars) {
  const langName = LANGUAGE_NAMES[language] || language;
  const list = chars && chars.trim() ? chars.trim() : DEFAULT_CHARS;
  return `Look ONLY at the HANDWRITING STYLE in the attached ${langName} sample — the slant, letter shapes, roundness and stroke thickness. IGNORE its words, sentences and layout entirely.

Produce a NEW image: a clean alphabet "specimen sheet" on a PURE WHITE background in solid BLACK ink, hand-written in that SAME style. Write EACH of these characters EXACTLY ONCE, in THIS EXACT ORDER, arranged as an evenly spaced GRID of about 8 per row, reading left-to-right then top-to-bottom:

${list}

Hard requirements:
- Every character standalone and clearly SEPARATED — generous, even gaps horizontally AND vertically; characters must NEVER touch.
- Print-style isolated letters (do NOT join them cursively).
- Each character large, crisp and centered in its slot, sitting on a common baseline per row.
- PURE WHITE background, SOLID BLACK ink only. NO grid lines, NO boxes, NO ruled lines, NO labels, NO extra words, NO shading — ONLY these characters.`;
}

// gpt-image-1 image edit, using the sample as the style reference.
async function generateWithOpenAI(image, { language, chars }) {
  const { mediaType, data } = parseDataUrl(image);
  const buffer = Buffer.from(data, "base64");
  const form = new FormData();
  form.append("model", config.openai.imageModel);
  form.append("image", new Blob([buffer], { type: mediaType }), "sample.png");
  form.append("prompt", buildPrompt(language, chars));
  form.append("size", "1024x1024");
  form.append("quality", "high"); // crisp letters → reliable extraction
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openai.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI image ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image");
  return `data:image/png;base64,${b64}`;
}

// Only GPT (OpenAI) can generate images — Claude is vision-only.
export function imagegenEnabled() {
  return Boolean(config.openai.apiKey);
}

// Generate a clean alphabet specimen in the sample's style (GPT / gpt-image-1).
export async function generateSpecimen(image, { language = "latin", chars = "" } = {}) {
  if (!config.openai.apiKey) {
    const err = new Error(
      "Cloning a full alphabet needs image generation, which only GPT provides. Set OPENAI_API_KEY in the backend .env (Claude cannot generate images), or use Manual mode."
    );
    err.status = 501;
    throw err;
  }
  return generateWithOpenAI(image, { language, chars });
}
