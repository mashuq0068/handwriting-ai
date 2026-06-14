/**
 * Browser-side handwriting → font pipeline, multi-script and connection-aware.
 *
 * threshold (Otsu) → vectorize (marching squares, see ./trace) → assemble (.ttf
 * via opentype.js). Connection is added per script:
 *   - cursive (latin/cyrillic): tight side-bearings + optional `liga` pairs
 *   - arabic-forms: per-position glyphs + GSUB init/medi/fina single-substitutions
 *   - headline (hindi/bengali): glyphs touch along the headline (zero side-bearing)
 *   - isolated (cjk): centered, full-width advance
 *
 * Output registers via FontFace and renders/export in the editor unchanged.
 */

import * as opentype from "opentype.js";
import { getScript, type ScriptCell, type ConnectionStrategy } from "./scripts";
import { traceBitmap, simplifyClosed } from "./trace";

const UNITS_PER_EM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;

// Side bearing (font units) per connection strategy.
function sideBearing(strategy: ConnectionStrategy): number {
  switch (strategy) {
    case "cursive": return 10;
    case "arabic-forms": return 6;
    case "headline": return 2;
    default: return 60;
  }
}

// Cell geometry shared with the draw pad and the extractor.
export const CELL = { w: 220, h: 280, baselineRatio: 0.78 };

export interface GlyphInput {
  cell: ScriptCell;
  canvas: HTMLCanvasElement; // CELL.w x CELL.h
}

// --- thresholding ----------------------------------------------------------
function otsuThreshold(gray: Uint8ClampedArray): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, max = 0, threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; threshold = t; }
  }
  return threshold;
}

interface InkInfo { ink: Uint8Array; w: number; h: number; hasInk: boolean; minX: number; maxX: number }

// Otsu-threshold a cell into a binary ink grid (1 = ink).
function thresholdCell(src: HTMLCanvasElement): InkInfo {
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const { width, height } = src;
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const a = d[i + 3] / 255;
    gray[j] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * a + 255 * (1 - a);
  }
  const t = otsuThreshold(gray);
  const ink = new Uint8Array(width * height);
  let minX = width, maxX = -1, hasInk = false;
  for (let j = 0; j < gray.length; j++) {
    if (gray[j] < t) {
      ink[j] = 1;
      hasInk = true;
      const x = j % width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  return { ink, w: width, h: height, hasInk, minX, maxX };
}

// Build the opentype Path + advance for one inked cell (marching-squares trace).
function buildPath(
  canvas: HTMLCanvasElement,
  strategy: ConnectionStrategy,
  advance: "proportional" | "fullwidth"
): { path: opentype.Path; advanceWidth: number } {
  const { ink, w, h, hasInk, minX, maxX } = thresholdCell(canvas);
  const scale = UNITS_PER_EM / CELL.h;
  const baselineRow = CELL.h * CELL.baselineRatio;
  if (!hasInk) return { path: new opentype.Path(), advanceWidth: Math.round(UNITS_PER_EM * 0.3) };

  const inkWidth = Math.max(1, maxX - minX);
  const sb = sideBearing(strategy);
  let xOffset: number;
  let advanceWidth: number;
  if (advance === "fullwidth") {
    advanceWidth = UNITS_PER_EM;
    xOffset = Math.round((UNITS_PER_EM - inkWidth * scale) / 2);
  } else {
    xOffset = sb;
    advanceWidth = Math.round(inkWidth * scale + 2 * sb);
  }
  // pixel (y-down) → font units (y-up). The y-flip reverses winding for every
  // loop together, so outer/holes stay opposite → nonzero fill stays correct.
  const map = (x: number, y: number): [number, number] => [
    Math.round((x - minX) * scale + xOffset),
    Math.round((baselineRow - y) * scale),
  ];

  const path = new opentype.Path();
  for (const raw of traceBitmap(ink, w, h)) {
    const loop = simplifyClosed(raw, 1.2);
    if (loop.length < 3) continue;
    loop.forEach((pt, idx) => {
      const [fx, fy] = map(pt[0], pt[1]);
      if (idx === 0) path.moveTo(fx, fy);
      else path.lineTo(fx, fy);
    });
    path.close();
  }
  return { path, advanceWidth };
}

export interface BuiltFont {
  arrayBuffer: ArrayBuffer;
  family: string;
  glyphCount: number;
  metrics: Record<string, unknown>;
}

const gsubScriptTag = (code: string): string => (code === "cyrillic" ? "cyrl" : "latn");

// Build a connection-aware .ttf from captured glyph cells.
export async function buildFont(
  name: string,
  shortId: string,
  scriptCode: string,
  inputs: GlyphInput[]
): Promise<BuiltFont> {
  const cfg = getScript(scriptCode);
  const family = `QuillifyHand-${shortId}`;

  const notdef = new opentype.Glyph({ name: ".notdef", unicode: 0, advanceWidth: 300, path: new opentype.Path() });
  const space = new opentype.Glyph({ name: "space", unicode: 32, advanceWidth: 300, path: new opentype.Path() });
  const glyphs: opentype.Glyph[] = [notdef, space];

  const baseIndexByChar = new Map<string, number>(); // isolated/base glyph index per char
  const forms: { char: string; form: string; index: number }[] = [];
  const ligs: { from: [string, string]; index: number }[] = [];
  const coverage: string[] = [];

  for (const input of inputs) {
    const { cell } = input;
    const { path, advanceWidth } = await buildPath(input.canvas, cfg.strategy, cfg.advance);
    const glyphName = cell.id;
    const glyph = new opentype.Glyph({
      name: glyphName,
      unicode: cell.unicode, // undefined for forms/ligatures
      advanceWidth,
      path,
    });
    const index = glyphs.length;
    glyphs.push(glyph);
    coverage.push(cell.display);

    if (cell.kind === "ligature") {
      // chars holds the 2-letter sequence
      ligs.push({ from: [cell.chars[0], cell.chars[1]], index });
    } else if (cell.form && cell.form !== "isol") {
      forms.push({ char: cell.chars, form: cell.form, index });
    } else {
      baseIndexByChar.set(cell.chars, index);
    }
  }

  const font = new opentype.Font({
    familyName: family,
    styleName: "Regular",
    unitsPerEm: UNITS_PER_EM,
    ascender: ASCENDER,
    descender: DESCENDER,
    glyphs,
  });

  // --- connection: GSUB ---
  try {
    if (cfg.strategy === "arabic-forms") {
      // opentype.js requires features to be registered in alphabetical order:
      // fina < init < medi. Sort before adding.
      const ordered = [...forms].sort((a, b) => a.form.localeCompare(b.form));
      for (const f of ordered) {
        const base = baseIndexByChar.get(f.char);
        if (base != null) {
          (font.substitution as unknown as {
            addSingle: (feature: string, sub: { sub: number; by: number }, script?: string) => void;
          }).addSingle(f.form, { sub: base, by: f.index }, "arab");
        }
      }
    }
    if (cfg.strategy === "cursive" && ligs.length) {
      const scriptTag = gsubScriptTag(scriptCode);
      for (const l of ligs) {
        const a = baseIndexByChar.get(l.from[0]);
        const b = baseIndexByChar.get(l.from[1]);
        if (a != null && b != null) {
          (font.substitution as unknown as {
            add: (feature: string, sub: { sub: number[]; by: number }, script?: string) => void;
          }).add("liga", { sub: [a, b], by: l.index }, scriptTag);
        }
      }
    }
  } catch (e) {
    // If GSUB writing fails for any reason, the font still works as isolated glyphs.
    console.warn("[fontBuilder] connection features skipped:", e);
  }

  return {
    arrayBuffer: font.toArrayBuffer(),
    family,
    glyphCount: coverage.length,
    metrics: { unitsPerEm: UNITS_PER_EM, strategy: cfg.strategy, script: scriptCode, coverage },
  };
}

// --- FontFace registration (shared with the editor) ------------------------
const registered = new Set<string>();
export async function registerFont(family: string, source: ArrayBuffer): Promise<void> {
  const key = family;
  if (registered.has(key)) return;
  const face = new FontFace(family, source);
  await face.load();
  (document as Document & { fonts: FontFaceSet }).fonts.add(face);
  registered.add(key);
}

// --- helpers ---------------------------------------------------------------
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[]);
  }
  return btoa(binary);
}

export function makeCellCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = CELL.w;
  c.height = CELL.h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CELL.w, CELL.h);
  return c;
}

// Crop a normalized box from a source image into a cell sitting on the baseline.
export function cropToCell(
  img: HTMLImageElement | HTMLCanvasElement,
  box: { x: number; y: number; w: number; h: number }
): HTMLCanvasElement {
  const iw = "naturalWidth" in img ? img.naturalWidth : img.width;
  const ih = "naturalHeight" in img ? img.naturalHeight : img.height;
  const sx = box.x * iw, sy = box.y * ih, sw = box.w * iw, sh = box.h * ih;
  const cell = makeCellCanvas();
  const ctx = cell.getContext("2d")!;
  const baseline = CELL.h * CELL.baselineRatio;
  const maxH = baseline - 20;
  const maxW = CELL.w - 40;
  const scale = Math.min(maxW / sw, maxH / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(img, sx, sy, sw, sh, (CELL.w - dw) / 2, baseline - dh, dw, dh);
  return cell;
}
