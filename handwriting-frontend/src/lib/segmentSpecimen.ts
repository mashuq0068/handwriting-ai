/**
 * Deterministic, known-order extraction of an AI-generated alphabet specimen.
 *
 * For English/Latin the glyph sequence is fixed and fully known, so we don't
 * need a vision model to label boxes. We binarize the generated sheet, find the
 * ink blobs (connected components), merge i/j dots into their stems, order the
 * blobs in reading order (rows top→bottom, left→right within a row), and map
 * blob k → expected character k. No API key, no guessing.
 *
 * If the blob count doesn't match the expected character count we DON'T force a
 * (mis-aligned) positional map — the caller falls back to vision labeling.
 */
import { cropToCell, grayOtsuInk, type GlyphInput } from "./fontBuilder";
import type { ScriptCell } from "./scripts";

interface Comp {
  minX: number; maxX: number; minY: number; maxY: number;
  area: number;
  cx: number; cy: number;
  consumed?: boolean;
}

function imageToCanvas(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  if (img instanceof HTMLCanvasElement) return img;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return c;
}

// All connected components (8-connectivity) of the ink grid.
function components(ink: Uint8Array, w: number, h: number): Comp[] {
  const labels = new Int32Array(w * h);
  const comps: Comp[] = [];
  const stack: number[] = [];
  let id = 0;
  for (let i = 0; i < w * h; i++) {
    if (!ink[i] || labels[i]) continue;
    id++;
    let area = 0, minX = w, maxX = 0, minY = h, maxY = 0, sx = 0, sy = 0;
    stack.push(i);
    labels[i] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      area++; sx += x; sy += y;
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
    comps.push({ minX, maxX, minY, maxY, area, cx: sx / area, cy: sy / area });
  }
  return comps;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Merge small "dot" components (i/j tittles, accent marks) into the stem below.
function mergeDiacritics(comps: Comp[], medH: number): Comp[] {
  for (const dot of comps) {
    if (dot.consumed) continue;
    const dh = dot.maxY - dot.minY + 1;
    if (dh > 0.45 * medH) continue; // not a small mark
    // find a larger component directly below whose x-range overlaps the dot
    let best: Comp | null = null;
    let bestGap = Infinity;
    for (const stem of comps) {
      if (stem === dot || stem.consumed) continue;
      const sh = stem.maxY - stem.minY + 1;
      if (sh < dh) continue;
      const overlap = Math.min(dot.maxX, stem.maxX) - Math.max(dot.minX, stem.minX);
      if (overlap <= 0) continue;
      const gap = stem.minY - dot.maxY;
      if (gap < -0.2 * medH || gap > 0.6 * medH) continue; // must sit just above
      if (gap < bestGap) { bestGap = gap; best = stem; }
    }
    if (best) {
      best.minX = Math.min(best.minX, dot.minX);
      best.maxX = Math.max(best.maxX, dot.maxX);
      best.minY = Math.min(best.minY, dot.minY);
      best.maxY = Math.max(best.maxY, dot.maxY);
      best.area += dot.area;
      dot.consumed = true;
    }
  }
  return comps.filter((c) => !c.consumed);
}

// Order components in reading order: cluster into rows by vertical center,
// then sort each row left→right.
function readingOrder(comps: Comp[], medH: number): Comp[] {
  const byY = [...comps].sort((a, b) => a.cy - b.cy);
  const rows: Comp[][] = [];
  for (const c of byY) {
    const row = rows[rows.length - 1];
    if (!row || c.cy - row[0].cy > 0.6 * medH) rows.push([c]);
    else row.push(c);
  }
  const out: Comp[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.minX - b.minX);
    out.push(...row);
  }
  return out;
}

function cellFor(ch: string): ScriptCell {
  return { id: ch, chars: ch, display: ch, kind: "glyph", unicode: ch.codePointAt(0) };
}

export interface SegmentResult {
  inputs: GlyphInput[]; // one per matched character (in expected order)
  missing: string[];    // expected chars whose cell came out blank
}

// Quick blank check on a built cell canvas.
function isBlank(cell: HTMLCanvasElement): boolean {
  const { ink, w, h } = grayOtsuInk(cell);
  let dark = 0;
  for (let i = 0; i < ink.length; i++) dark += ink[i];
  return dark / (w * h) < 0.004;
}

/**
 * Segment a generated specimen into ordered glyph cells for the given expected
 * character sequence. Returns null when the detected blob count doesn't match
 * the expected count (caller should fall back to vision labeling).
 */
export function segmentSpecimen(
  img: HTMLImageElement | HTMLCanvasElement,
  expected: string[]
): SegmentResult | null {
  const canvas = imageToCanvas(img);
  const { ink, w, h } = grayOtsuInk(canvas);

  let comps = components(ink, w, h);
  if (comps.length < expected.length) return null;

  const medH = median(comps.map((c) => c.maxY - c.minY + 1));
  const medArea = median(comps.map((c) => c.area));

  comps = mergeDiacritics(comps, medH);
  // Drop specks left over after merging (stray pixels, JPEG noise).
  comps = comps.filter((c) => c.area >= Math.max(8, 0.04 * medArea));

  // Deterministic positional mapping only when counts line up exactly.
  if (comps.length !== expected.length) return null;

  const ordered = readingOrder(comps, medH);
  const inputs: GlyphInput[] = [];
  const missing: string[] = [];
  const pad = Math.round(0.08 * medH); // a little breathing room around the blob

  ordered.forEach((c, i) => {
    const box = {
      x: (c.minX - pad) / w,
      y: (c.minY - pad) / h,
      w: (c.maxX - c.minX + 1 + 2 * pad) / w,
      h: (c.maxY - c.minY + 1 + 2 * pad) / h,
    };
    const cellCanvas = cropToCell(canvas, box);
    const ch = expected[i];
    if (isBlank(cellCanvas)) { missing.push(ch); return; }
    inputs.push({ cell: cellFor(ch), canvas: cellCanvas });
  });

  return { inputs, missing };
}

/**
 * Fill specific missing characters from a small follow-up specimen that contains
 * ONLY those characters (in `chars` order). Returns the glyph inputs recovered.
 */
export function segmentGapFill(
  img: HTMLImageElement | HTMLCanvasElement,
  chars: string[]
): GlyphInput[] {
  const res = segmentSpecimen(img, chars);
  return res ? res.inputs : [];
}

// The fixed Latin glyph sequence we ask the model to draw (and map against).
export const LATIN_SEQUENCE =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
