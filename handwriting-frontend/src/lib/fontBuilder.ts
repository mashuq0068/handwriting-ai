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

// Side bearing (font units, em=1000) per connection strategy. Print-style Latin
// needs a clear gap between letters (Calligraphr-like); too small and glyphs
// visually collide. Connected scripts (headline/arabic) stay tight.
function sideBearing(strategy: ConnectionStrategy): number {
  switch (strategy) {
    case "cursive": return 22;
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

interface InkInfo { ink: Uint8Array; w: number; h: number; hasInk: boolean; minX: number; maxX: number; minY: number; maxY: number }

// Grayscale + Otsu → binary ink grid (1 = darker than threshold). Alpha → white.
export function grayOtsuInk(src: HTMLCanvasElement): { ink: Uint8Array; w: number; h: number } {
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const { width, height } = src;
  const d = ctx.getImageData(0, 0, width, height).data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const a = d[i + 3] / 255;
    gray[j] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * a + 255 * (1 - a);
  }
  const t = otsuThreshold(gray);
  const ink = new Uint8Array(width * height);
  // `<= t` (not `< t`): on a perfectly bimodal image (e.g. an already-binarized
  // black/white cell) Otsu returns t=0, and `< 0` would match no pixels at all.
  for (let j = 0; j < gray.length; j++) ink[j] = gray[j] <= t ? 1 : 0;
  return { ink, w: width, h: height };
}

export function bboxOf(ink: Uint8Array, w: number, h: number) {
  let minX = w, maxX = -1, minY = h, maxY = -1, hasInk = false;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (ink[y * w + x]) {
        hasInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return { minX, maxX, minY, maxY, hasInk };
}

// Connected-component cleanup: drop tiny specks and full-width/height ruled or
// margin lines (lined paper bleeds through), keep the actual glyph strokes.
export function cleanupMask(ink: Uint8Array, w: number, h: number): Uint8Array {
  const labels = new Int32Array(w * h);
  const comps: { id: number; area: number; minX: number; maxX: number; minY: number; maxY: number }[] = [];
  const stack: number[] = [];
  let id = 0;
  for (let i = 0; i < w * h; i++) {
    if (!ink[i] || labels[i]) continue;
    id++;
    let area = 0, minX = w, maxX = 0, minY = h, maxY = 0;
    stack.push(i);
    labels[i] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const np = ny * w + nx;
          if (ink[np] && !labels[np]) { labels[np] = id; stack.push(np); }
        }
    }
    comps.push({ id, area, minX, maxX, minY, maxY });
  }
  if (!comps.length) return ink;

  // The main glyph is the largest component that ISN'T a full-width horizontal
  // guide/rule line. In a sparsely-written cell the printed baseline can be the
  // biggest dark thing, so we must not treat it as the glyph. We only match
  // HORIZONTAL full-width lines — never vertical — so thin tall letters (l, I, 1,
  // i-stem) are always safe.
  const ruleH = Math.max(3, Math.round(0.05 * h));
  const isHRule = (c: (typeof comps)[number]) =>
    c.maxX - c.minX + 1 >= 0.82 * w && c.maxY - c.minY + 1 <= ruleH;
  const candidates = comps.filter((c) => !isHRule(c));
  if (!candidates.length) return new Uint8Array(w * h); // only a guide line ⇒ no glyph
  const main = candidates.reduce((a, b) => (a.area > b.area ? a : b));
  const minArea = Math.max(6, main.area * 0.02);
  // A secondary piece is part of the glyph only if it sits over the letter's
  // horizontal span (i/j dots, accents). Pieces off to the side are bleed from a
  // neighbouring cell or noise — dropping them keeps the advance width tight
  // (otherwise a stray mark inflates spacing and gaps words apart).
  const overlapsX = (c: (typeof comps)[number]) => c.minX <= main.maxX && c.maxX >= main.minX;
  const kept = comps.filter((c) => {
    if (c.id === main.id) return true; // the letter — keep no matter the shape
    if (isHRule(c)) return false;      // printed baseline / ruled line
    if (c.area < minArea) return false; // speck relative to the glyph
    if (!overlapsX(c)) return false;    // off to the side ⇒ bleed / noise
    return true;
  });
  const keep = new Set(kept.map((c) => c.id));
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (keep.has(labels[i])) out[i] = 1;
  return out;
}

// A near-solid mass filling much of the cell is a bad threshold (a blank/low-
// contrast cell where Otsu latched onto a lighting gradient), not a letter. Real
// letters are strokes — sparse within their bounding box. Reject the blob.
function isBlobMask(ink: Uint8Array, w: number, h: number, bb: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  const bw = bb.maxX - bb.minX + 1, bh = bb.maxY - bb.minY + 1;
  if (bw <= 0 || bh <= 0) return false;
  let count = 0;
  for (let i = 0; i < ink.length; i++) count += ink[i];
  const density = count / (bw * bh);
  const bboxFrac = (bw * bh) / (w * h);
  return bboxFrac > 0.32 && density > 0.62;
}

// One-pixel morphological erosion (4-connectivity): drop boundary pixels so
// strokes get thinner — the binarize+trace tends to render heavier than the pen.
function erode4(ink: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!ink[i]) continue;
      const up = y > 0 ? ink[i - w] : 0;
      const dn = y < h - 1 ? ink[i + w] : 0;
      const lt = x > 0 ? ink[i - 1] : 0;
      const rt = x < w - 1 ? ink[i + 1] : 0;
      if (up && dn && lt && rt) out[i] = 1; // keep only interior pixels
    }
  return out;
}

// Otsu-threshold + cleanup a cell into a binary ink grid.
function thresholdCell(src: HTMLCanvasElement): InkInfo {
  const { ink, w, h } = grayOtsuInk(src);
  let cleaned = cleanupMask(ink, w, h);
  // Thin the strokes ~1px to match pen weight — but only if it KEEPS most of the
  // ink, so already-thin letters (l, i, 1) aren't erased away.
  const eroded = erode4(cleaned, w, h);
  let c0 = 0, c1 = 0;
  for (let i = 0; i < cleaned.length; i++) { c0 += cleaned[i]; c1 += eroded[i]; }
  if (c1 > c0 * 0.5) cleaned = eroded;
  const bb = bboxOf(cleaned, w, h);
  const hasInk = bb.hasInk && !isBlobMask(cleaned, w, h, bb);
  return { ink: cleaned, w, h, hasInk, minX: bb.minX, maxX: bb.maxX, minY: bb.minY, maxY: bb.maxY };
}

// Where a glyph's ink anchors vertically, so EVERY letter lands on a common
// baseline regardless of where it was drawn in its cell — this is what makes a
// font look even (vs letters/commas floating). Categories cover Latin; other
// scripts fall through to bottom-on-baseline.
const DESCENDERS = new Set(["g", "j", "p", "q", "y"]);
const TOP_PUNCT = new Set(["'", '"', "`", "”", "“", "’", "‘"]);
const MID_PUNCT = new Set(["-", "–", "—", "~", "=", "+", "*", "^"]);
const LOW_PUNCT = new Set([",", ";"]); // baseline with a small tail below
function glyphAnchor(char: string, fullwidth: boolean): { anchor: "bottom" | "top" | "mid"; units: number } {
  if (fullwidth) return { anchor: "mid", units: Math.round(UNITS_PER_EM * 0.32) };
  // ligature cluster ("th", "ing", …): baseline, dropped if it has a descender.
  if (char.length > 1) return { anchor: "bottom", units: [...char].some((c) => DESCENDERS.has(c)) ? -190 : 0 };
  if (DESCENDERS.has(char)) return { anchor: "bottom", units: -190 };
  if (TOP_PUNCT.has(char)) return { anchor: "top", units: 690 };
  if (MID_PUNCT.has(char)) return { anchor: "mid", units: 250 };
  if (LOW_PUNCT.has(char)) return { anchor: "bottom", units: -70 };
  return { anchor: "bottom", units: 0 };
}

// Measure the ink's vertical extent (CELL coords) for a cell — used to size all
// glyphs consistently so the font fills the line instead of rendering tiny.
function measureInk(src: HTMLCanvasElement): { hasInk: boolean; minY: number; maxY: number } {
  const { ink, w, h } = grayOtsuInk(src);
  const cleaned = cleanupMask(ink, w, h);
  const bb = bboxOf(cleaned, w, h);
  return { hasInk: bb.hasInk && !isBlobMask(cleaned, w, h, bb), minY: bb.minY, maxY: bb.maxY };
}

// Build the opentype Path + advance for one inked cell (marching-squares trace).
// `vScale` enlarges every glyph by a single shared factor (computed once from the
// whole set) so letters fill the em while keeping their relative sizes.
function buildPath(
  canvas: HTMLCanvasElement,
  strategy: ConnectionStrategy,
  advance: "proportional" | "fullwidth",
  char: string,
  vScale = 1
): { path: opentype.Path; advanceWidth: number } {
  const { ink, w, h, hasInk, minX, maxX, minY, maxY } = thresholdCell(canvas);
  const scale = (UNITS_PER_EM / CELL.h) * vScale;
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
  // Vertical placement: anchor the ink by category so every glyph lands on a
  // common baseline (letters bottom→baseline, descenders below, apostrophes up).
  const { anchor, units } = glyphAnchor(char, advance === "fullwidth");
  const refY = anchor === "bottom" ? maxY : anchor === "top" ? minY : (minY + maxY) / 2;
  // pixel (y-down) → font units (y-up). The y-flip reverses winding for every
  // loop together, so outer/holes stay opposite → nonzero fill stays correct.
  const map = (x: number, y: number): [number, number] => [
    Math.round((x - minX) * scale + xOffset),
    Math.round(units + (refY - y) * scale),
  ];

  const path = new opentype.Path();
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const raw of traceBitmap(ink, w, h)) {
    const loop = simplifyClosed(raw, 1.2);
    if (loop.length < 3) continue;
    const fp = loop.map((p) => map(p[0], p[1]));
    const n = fp.length;
    if (n < 4) {
      fp.forEach((p, idx) => (idx === 0 ? path.moveTo(p[0], p[1]) : path.lineTo(p[0], p[1])));
      path.close();
      continue;
    }
    // Smooth: pass through edge midpoints with vertices as quad control points —
    // rounds the staircase from marching squares into natural strokes.
    const m0 = mid(fp[0], fp[1]);
    path.moveTo(m0[0], m0[1]);
    for (let i = 1; i <= n; i++) {
      const cur = fp[i % n];
      const next = fp[(i + 1) % n];
      const m = mid(cur, next);
      path.quadTo(cur[0], cur[1], m[0], m[1]);
    }
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
  const ligs: { from: string[]; index: number }[] = [];
  const coverage: string[] = [];

  // Size normalization with ONE shared factor (keeps relative sizes). Prefer to
  // size by the x-height letters → ~0.52 em, so lowercase text (most of a page)
  // reads at a proper size; fall back to a high percentile of all heights.
  let vScale = 1;
  if (cfg.advance !== "fullwidth") {
    const baseScale = UNITS_PER_EM / CELL.h;
    const xCells = new Set("acemnorsuvwxz".split(""));
    const xh: number[] = [];
    const all: number[] = [];
    for (const input of inputs) {
      const m = measureInk(input.canvas);
      if (!m.hasInk) continue;
      const hgt = m.maxY - m.minY;
      all.push(hgt);
      if (xCells.has(input.cell.chars)) xh.push(hgt);
    }
    let ref = 0, target = 0;
    if (xh.length >= 4) { xh.sort((a, b) => a - b); ref = xh[Math.floor(xh.length / 2)]; target = 520; }
    else if (all.length) { all.sort((a, b) => a - b); ref = all[Math.floor(all.length * 0.85)]; target = 720; }
    if (ref) vScale = Math.max(0.6, Math.min(3.5, target / (ref * baseScale)));
  }

  let skipped = 0;
  for (const input of inputs) {
    const { cell } = input;
    const { path, advanceWidth } = await buildPath(input.canvas, cfg.strategy, cfg.advance, cell.chars, vScale);
    // A cell that thresholded to no ink yields an empty path. Adding it would put
    // a BLANK glyph in the cmap (renders as nothing, no system fallback). Skip it
    // so that character falls back to a visible font instead of a silent hole.
    if (path.commands.length === 0) { skipped++; continue; }
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
      // chars holds the joined sequence ("th", "the", …)
      ligs.push({ from: [...cell.chars], index });
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
      // Longest sequences first so "the" is preferred over "th" + e.
      const ordered = [...ligs].sort((a, b) => b.from.length - a.from.length);
      for (const l of ordered) {
        const sub = l.from.map((ch) => baseIndexByChar.get(ch));
        if (sub.every((i) => i != null)) {
          (font.substitution as unknown as {
            add: (feature: string, sub: { sub: number[]; by: number }, script?: string) => void;
          }).add("liga", { sub: sub as number[], by: l.index }, scriptTag);
        }
      }
    }
  } catch (e) {
    // If GSUB writing fails for any reason, the font still works as isolated glyphs.
    console.warn("[fontBuilder] connection features skipped:", e);
  }

  if (skipped) console.warn(`[fontBuilder] skipped ${skipped} empty/blank cell(s) — no ink detected.`);

  return {
    arrayBuffer: font.toArrayBuffer(),
    family,
    glyphCount: coverage.length,
    metrics: { unitsPerEm: UNITS_PER_EM, strategy: cfg.strategy, script: scriptCode, coverage, skipped },
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

// Trigger a browser download of the built font as a .ttf file (opentype.js
// emits TrueType outlines, so .ttf is the correct, universally-supported format).
export function downloadFont(buffer: ArrayBuffer, filename: string): void {
  const safe = filename.replace(/[^a-z0-9_\- ]/gi, "").trim() || "my-handwriting";
  const blob = new Blob([buffer], { type: "font/ttf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.ttf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

// Crop a normalized box from a source image, binarize it LOCALLY (so the cell's
// white padding never skews Otsu), strip ruled lines / specks, and place the
// glyph on the baseline as crisp black-on-white.
export function cropToCell(
  img: HTMLImageElement | HTMLCanvasElement,
  box: { x: number; y: number; w: number; h: number }
): HTMLCanvasElement {
  const iw = "naturalWidth" in img ? img.naturalWidth : img.width;
  const ih = "naturalHeight" in img ? img.naturalHeight : img.height;
  const sx = Math.max(0, Math.round(box.x * iw));
  const sy = Math.max(0, Math.round(box.y * ih));
  const sw = Math.max(1, Math.round(box.w * iw));
  const sh = Math.max(1, Math.round(box.h * ih));

  // Crop at (capped) native resolution — no upscaling that amplifies noise.
  const cap = 320;
  const s = Math.min(1, cap / Math.max(sw, sh));
  const cw = Math.max(1, Math.round(sw * s));
  const ch = Math.max(1, Math.round(sh * s));
  const crop = document.createElement("canvas");
  crop.width = cw;
  crop.height = ch;
  crop.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

  // Binarize the crop region ONLY (paper vs ink — a clean bimodal split), clean it.
  const { ink } = grayOtsuInk(crop);
  const cleaned = cleanupMask(ink, cw, ch);
  const bb = bboxOf(cleaned, cw, ch);

  const cell = makeCellCanvas();
  if (!bb.hasInk) return cell;
  const bw = bb.maxX - bb.minX + 1, bh = bb.maxY - bb.minY + 1;

  // Tight binary mask (black ink on white).
  const mask = document.createElement("canvas");
  mask.width = bw;
  mask.height = bh;
  const mctx = mask.getContext("2d")!;
  const mimg = mctx.createImageData(bw, bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const v = cleaned[(y + bb.minY) * cw + (x + bb.minX)] ? 0 : 255;
      const o = (y * bw + x) * 4;
      mimg.data[o] = mimg.data[o + 1] = mimg.data[o + 2] = v;
      mimg.data[o + 3] = 255;
    }
  mctx.putImageData(mimg, 0, 0);

  // Place on the baseline, centered; keep edges crisp (no smoothing).
  const ctx = cell.getContext("2d")!;
  const baseline = CELL.h * CELL.baselineRatio;
  const scale = Math.min((CELL.w - 40) / bw, (baseline - 20) / bh, 4);
  const dw = bw * scale, dh = bh * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mask, 0, 0, bw, bh, (CELL.w - dw) / 2, baseline - dh, dw, dh);
  return cell;
}
