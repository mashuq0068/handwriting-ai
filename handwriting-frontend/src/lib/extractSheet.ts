/**
 * Deterministic extraction of a filled template photo (NO AI).
 * Detect the 4 corner fiducials → solve a homography → warp the photo back to
 * the known sheet layout → crop each cell by arithmetic → keep inked cells.
 */
import { SHEET, sheetLayout } from "./templateSheet";
import { CELL, grayOtsuInk, cleanupMask, type GlyphInput } from "./fontBuilder";
import type { ScriptConfig } from "./scripts";
import { capturableCells } from "./scripts";

export interface Pt { x: number; y: number }

// --- image helpers ---------------------------------------------------------
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return c;
}

// Auto-detect the 4 fiducial squares. The corner regions also contain the title
// text and handwritten grid letters, so a plain centroid of dark pixels is
// hopelessly biased. Instead we find the SOLID SQUARE blob: among dark connected
// components in each corner, pick the one with a high fill-ratio (solidity) and
// near-square aspect that sits closest to the actual sheet corner. Letters and
// text are thin strokes (low solidity) and get rejected.
export function detectFiducials(img: HTMLImageElement): Pt[] {
  const src = imageToCanvas(img);
  const w = src.width, h = src.height;
  const { data } = src.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h);
  return detectFiducialsFromData(data, w, h);
}

// Pure core (no DOM) so it can be unit-tested. `data` is RGBA.
export function detectFiducialsFromData(data: Uint8ClampedArray, w: number, h: number): Pt[] {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  const mean = sum / (w * h);
  const thr = mean * 0.55;

  const region = 0.3; // search the inner ~third of each corner
  // [x0,y0,x1,y1, cornerX, cornerY] — cornerX/Y is the outer sheet corner the
  // fiducial hugs, used to pick the nearest qualifying square.
  const corners: [number, number, number, number, number, number][] = [
    [0, 0, region, region, 0, 0], // TL
    [1 - region, 0, 1, region, 1, 0], // TR
    [1 - region, 1 - region, 1, 1, 1, 1], // BR
    [0, 1 - region, region, 1, 0, 1], // BL
  ];

  const found = corners.map(([x0, y0, x1, y1, cxn, cyn]) => {
    const ax0 = Math.floor(x0 * w), ay0 = Math.floor(y0 * h);
    const ax1 = Math.floor(x1 * w), ay1 = Math.floor(y1 * h);
    const rw = ax1 - ax0, rh = ay1 - ay0;
    const cornerPx = { x: cxn * w, y: cyn * h };

    // local binary mask of dark pixels in this corner region
    const mask = new Uint8Array(rw * rh);
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        const i = ((ay0 + y) * w + (ax0 + x)) * 4;
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum < thr) mask[y * rw + x] = 1;
      }

    // connected components (8-connectivity)
    const labels = new Int32Array(rw * rh);
    const stack: number[] = [];
    let id = 0;
    let best: { cx: number; cy: number; score: number } | null = null;
    const regionArea = rw * rh;
    for (let s = 0; s < rw * rh; s++) {
      if (!mask[s] || labels[s]) continue;
      id++;
      let area = 0, minX = rw, maxX = 0, minY = rh, maxY = 0, sx = 0, sy = 0;
      stack.push(s); labels[s] = id;
      while (stack.length) {
        const p = stack.pop()!;
        const x = p % rw, y = (p / rw) | 0;
        area++; sx += x; sy += y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= rw || ny < 0 || ny >= rh) continue;
            const np = ny * rw + nx;
            if (mask[np] && !labels[np]) { labels[np] = id; stack.push(np); }
          }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      const solidity = area / (bw * bh);
      const aspect = bw / bh;
      // A fiducial is a solid, near-square blob of plausible size (not a hairline,
      // not a giant text run). Reject thin strokes (low solidity) and slivers.
      if (solidity < 0.6) continue;
      if (aspect < 0.55 || aspect > 1.8) continue;
      if (area < 0.0008 * regionArea || area > 0.2 * regionArea) continue;
      const gx = ax0 + sx / area, gy = ay0 + sy / area;
      const dist = Math.hypot(gx - cornerPx.x, gy - cornerPx.y);
      // prefer high solidity + proximity to the true corner
      const score = solidity * 1000 - dist;
      if (!best || score > best.score) best = { cx: gx, cy: gy, score };
    }

    return best
      ? { pt: { x: best.cx, y: best.cy }, found: true }
      : { pt: { x: (ax0 + ax1) / 2, y: (ay0 + ay1) / 2 }, found: false };
  });

  // Order is [TL, TR, BR, BL]. If a corner square was obscured (shadow/finger),
  // reconstruct it from the other three via the parallelogram rule (opposite
  // corners share a midpoint) — far better than the region-center fallback.
  const [TL, TR, BR, BL] = found;
  const recon = (a: Pt, b: Pt, c: Pt): Pt => ({ x: a.x + b.x - c.x, y: a.y + b.y - c.y });
  const out = found.map((f) => f.pt);
  if (!TL.found && TR.found && BR.found && BL.found) out[0] = recon(TR.pt, BL.pt, BR.pt);
  if (!TR.found && TL.found && BR.found && BL.found) out[1] = recon(TL.pt, BR.pt, BL.pt);
  if (!BR.found && TL.found && TR.found && BL.found) out[2] = recon(TR.pt, BL.pt, TL.pt);
  if (!BL.found && TL.found && TR.found && BR.found) out[3] = recon(TL.pt, BR.pt, TR.pt);
  return out;
}

// --- homography (maps `from` quad → `to` quad), DLT with h33 = 1 -----------
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    [b[col], b[piv]] = [b[piv], b[col]];
    const d = A[col][col] || 1e-9;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / d;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  return b.map((bi, i) => bi / (A[i][i] || 1e-9));
}

function computeHomography(from: Pt[], to: Pt[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i];
    const { x: X, y: Y } = to[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  const h = solveLinear(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function applyH(H: number[], x: number, y: number): Pt {
  const d = H[6] * x + H[7] * y + H[8];
  return { x: (H[0] * x + H[1] * y + H[2]) / d, y: (H[3] * x + H[4] * y + H[5]) / d };
}

// Warp the photo to the canonical sheet using the 4 detected fiducials.
export function warpToSheet(img: HTMLImageElement, srcFiducials: Pt[]): HTMLCanvasElement {
  const layout = sheetLayout({ cells: [] } as unknown as ScriptConfig); // fiducials are script-independent
  const dstFids = layout.fiducials; // sheet coords
  // H maps sheet → source so we can inverse-sample.
  const H = computeHomography(dstFids, srcFiducials);

  const src = imageToCanvas(img);
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  const sImg = sctx.getImageData(0, 0, src.width, src.height);
  const sData = sImg.data;

  const out = document.createElement("canvas");
  out.width = SHEET.w;
  out.height = SHEET.h;
  const octx = out.getContext("2d")!;
  const oImg = octx.createImageData(SHEET.w, SHEET.h);
  const oData = oImg.data;

  for (let y = 0; y < SHEET.h; y++) {
    for (let x = 0; x < SHEET.w; x++) {
      const p = applyH(H, x, y);
      const sx = Math.round(p.x), sy = Math.round(p.y);
      const o = (y * SHEET.w + x) * 4;
      if (sx >= 0 && sx < src.width && sy >= 0 && sy < src.height) {
        const s = (sy * src.width + sx) * 4;
        oData[o] = sData[s];
        oData[o + 1] = sData[s + 1];
        oData[o + 2] = sData[s + 2];
        oData[o + 3] = 255;
      } else {
        oData[o] = oData[o + 1] = oData[o + 2] = 255;
        oData[o + 3] = 255;
      }
    }
  }
  octx.putImageData(oImg, 0, 0);
  return out;
}

// Adaptive ink check: fraction of pixels meaningfully darker than THIS cell's own
// paper background. Adaptive (vs a fixed dark cutoff) so it catches light-gray or
// thin strokes — e.g. AI-filled sheets or light-pen scans — not just heavy ink.
function inkFraction(canvas: HTMLCanvasElement): number {
  const { data } = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
  const n = canvas.width * canvas.height;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    hist[lum]++;
  }
  // background = bright paper level (95th percentile of luminance).
  let acc = 0, bg = 255;
  for (let l = 255; l >= 0; l--) { acc += hist[l]; if (acc >= n * 0.05) { bg = l; break; } }
  const inkThr = Math.max(40, bg - 55); // clearly darker than the paper
  let dark = 0;
  for (let l = 0; l < inkThr; l++) dark += hist[l];
  return dark / n;
}

// Extract inked cells from a warped sheet → GlyphInput[].
export function extractGlyphs(warped: HTMLCanvasElement, script: ScriptConfig): GlyphInput[] {
  const layout = sheetLayout(script);
  const out: GlyphInput[] = [];
  const byId = new Map(capturableCells(script).map((c) => [c.id, c]));
  const pad = 14;
  for (const rect of layout.cells) {
    const srcW = Math.max(1, Math.round(rect.w - 2 * pad));
    const srcH = Math.max(1, Math.round(rect.h - 2 * pad));
    // Crop the warped cell region (inset to avoid the printed border).
    const crop = document.createElement("canvas");
    crop.width = srcW;
    crop.height = srcH;
    crop.getContext("2d")!.drawImage(warped, rect.x + pad, rect.y + pad, rect.w - 2 * pad, rect.h - 2 * pad, 0, 0, srcW, srcH);

    // Skip blank cells (no ink clearly darker than the cell's own paper).
    if (inkFraction(crop) < 0.004) continue;

    // Binarize the CROP locally (paper vs ink is bimodal → reliable; avoids the
    // white-margin/gray-paper trimodal split that turned cells into solid blobs).
    const { ink, w: cw, h: ch } = grayOtsuInk(crop);
    const cleaned = cleanupMask(ink, cw, ch);
    const bin = document.createElement("canvas");
    bin.width = cw;
    bin.height = ch;
    const bctx = bin.getContext("2d")!;
    const bimg = bctx.createImageData(cw, ch);
    for (let i = 0; i < cleaned.length; i++) {
      const v = cleaned[i] ? 0 : 255; // ink → black, paper → white
      const o = i * 4;
      bimg.data[o] = bimg.data[o + 1] = bimg.data[o + 2] = v;
      bimg.data[o + 3] = 255;
    }
    bctx.putImageData(bimg, 0, 0);

    // Place the crisp black-on-white crop into the cell: uniform scale (constant
    // for every cell so letters keep true proportions) + baseline alignment.
    const cellCanvas = document.createElement("canvas");
    cellCanvas.width = CELL.w;
    cellCanvas.height = CELL.h;
    const ctx = cellCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CELL.w, CELL.h);
    const margin = 10;
    const s = (CELL.w - 2 * margin) / srcW;
    const dw = srcW * s, dh = srcH * s;
    let drawTop: number;
    if (script.guide === "box") {
      drawTop = (CELL.h - dh) / 2; // CJK: centered, no baseline
    } else {
      const guideRatio = script.guide === "headline" ? 0.22 : 0.78;
      const destRatio = script.guide === "headline" ? 0.22 : CELL.baselineRatio;
      const srcGuideFromTop = rect.h * guideRatio - pad;
      drawTop = CELL.h * destRatio - srcGuideFromTop * s;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bin, 0, 0, cw, ch, margin, drawTop, dw, dh);

    const cell = byId.get(rect.id);
    if (cell) out.push({ cell, canvas: cellCanvas });
  }
  return out;
}

// Convenience: full pipeline from an image element.
export function extractFromPhoto(img: HTMLImageElement, script: ScriptConfig, fiducials?: Pt[]): {
  warped: HTMLCanvasElement;
  glyphs: GlyphInput[];
  fiducials: Pt[];
} {
  const fids = fiducials ?? detectFiducials(img);
  const warped = warpToSheet(img, fids);
  const glyphs = extractGlyphs(warped, script);
  return { warped, glyphs, fiducials: fids };
}
