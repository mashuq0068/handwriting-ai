/**
 * Deterministic extraction of a filled template photo (NO AI).
 * Detect the 4 corner fiducials → solve a homography → warp the photo back to
 * the known sheet layout → crop each cell by arithmetic → keep inked cells.
 */
import { SHEET, sheetLayout } from "./templateSheet";
import { CELL, type GlyphInput } from "./fontBuilder";
import type { ScriptConfig } from "./scripts";

export interface Pt { x: number; y: number }

// --- image helpers ---------------------------------------------------------
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return c;
}

// Auto-detect the 4 fiducial squares: in each corner region, centroid of dark px.
export function detectFiducials(img: HTMLImageElement): Pt[] {
  const src = imageToCanvas(img);
  const w = src.width, h = src.height;
  const { data } = src.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h);
  // global mean brightness → threshold
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  const mean = sum / (w * h);
  const thr = mean * 0.5; // dark = fiducial ink

  const region = 0.33; // search the inner third of each corner
  const corners: [number, number, number, number][] = [
    [0, 0, region, region], // TL
    [1 - region, 0, 1, region], // TR
    [1 - region, 1 - region, 1, 1], // BR
    [0, 1 - region, region, 1], // BL
  ];
  return corners.map(([x0, y0, x1, y1]) => {
    let cx = 0, cy = 0, count = 0;
    const ax0 = Math.floor(x0 * w), ay0 = Math.floor(y0 * h), ax1 = Math.floor(x1 * w), ay1 = Math.floor(y1 * h);
    for (let y = ay0; y < ay1; y++) {
      for (let x = ax0; x < ax1; x++) {
        const i = (y * w + x) * 4;
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum < thr) { cx += x; cy += y; count++; }
      }
    }
    if (count < 20) {
      // fallback: the geometric corner
      return { x: (ax0 + ax1) / 2, y: (ay0 + ay1) / 2 };
    }
    return { x: cx / count, y: cy / count };
  });
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

// Quick ink check: fraction of dark pixels in a cell canvas.
function inkFraction(canvas: HTMLCanvasElement): number {
  const { data } = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
  let dark = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 120) dark++;
  }
  return dark / n;
}

// Extract inked cells from a warped sheet → GlyphInput[].
export function extractGlyphs(warped: HTMLCanvasElement, script: ScriptConfig): GlyphInput[] {
  const layout = sheetLayout(script);
  const out: GlyphInput[] = [];
  const byId = new Map(script.cells.map((c) => [c.id, c]));
  for (const rect of layout.cells) {
    const cellCanvas = document.createElement("canvas");
    cellCanvas.width = CELL.w;
    cellCanvas.height = CELL.h;
    const ctx = cellCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CELL.w, CELL.h);
    // inset a few px to avoid the printed cell border + label
    const pad = 14;
    ctx.drawImage(warped, rect.x + pad, rect.y + pad, rect.w - 2 * pad, rect.h - 2 * pad, 6, 6, CELL.w - 12, CELL.h - 12);
    if (inkFraction(cellCanvas) > 0.012) {
      const cell = byId.get(rect.id);
      if (cell) out.push({ cell, canvas: cellCanvas });
    }
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
