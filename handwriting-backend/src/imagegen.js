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
  return `You are given a photo of someone's ${langName} handwriting.

Generate a NEW image: a clean handwriting "specimen sheet" on a plain WHITE background with BLACK ink. Write EACH of the following characters EXACTLY ONCE, copying the SAME handwriting style, slant, proportions and stroke thickness as the sample as closely as you possibly can.

Characters (in this order):
${list}

Strict layout rules:
- Lay the characters out in neat rows, left to right, in the given order.
- Leave LARGE, clear gaps between every character and between rows — each character must be fully separated, never touching its neighbours.
- Write each character in isolation (do NOT join letters cursively).
- Big and clear (each character large in its space).
- Plain white background, solid black ink. No ruled lines, no grid, no boxes, no labels, no extra words — ONLY the characters.`;
}

// gpt-image-1 image edit, using the sample as the reference image.
async function generateWithOpenAI(image, { language, chars }) {
  const { mediaType, data } = parseDataUrl(image);
  const buffer = Buffer.from(data, "base64");
  const form = new FormData();
  form.append("model", config.openai.imageModel);
  form.append("image", new Blob([buffer], { type: mediaType }), "sample.png");
  form.append("prompt", buildPrompt(language, chars));
  form.append("size", "1024x1024");
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
