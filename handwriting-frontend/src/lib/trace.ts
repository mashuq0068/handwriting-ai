/**
 * Deterministic raster → vector contour tracing (marching squares).
 * Replaces the flaky potrace WASM. Operates on a binary ink grid and returns
 * simplified closed polygons; nested contours come out with opposite winding,
 * so nonzero-fill renders holes correctly (o, a, e, 8, …).
 */

export type Pt = [number, number];

// Trace all contours of a binary grid (ink[y*w+x] = 1 for ink).
export function traceBitmap(ink: Uint8Array, w: number, h: number): Pt[][] {
  const at = (x: number, y: number) => (x >= 0 && x < w && y >= 0 && y < h ? ink[y * w + x] : 0);
  const segs: [Pt, Pt][] = [];

  for (let cy = -1; cy < h; cy++) {
    for (let cx = -1; cx < w; cx++) {
      const tl = at(cx, cy), tr = at(cx + 1, cy), br = at(cx + 1, cy + 1), bl = at(cx, cy + 1);
      const code = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (code === 0 || code === 15) continue;
      const T: Pt = [cx + 0.5, cy], R: Pt = [cx + 1, cy + 0.5], B: Pt = [cx + 0.5, cy + 1], L: Pt = [cx, cy + 0.5];
      const add = (a: Pt, b: Pt) => segs.push([a, b]);
      switch (code) {
        case 1: add(B, L); break;
        case 2: add(R, B); break;
        case 3: add(R, L); break;
        case 4: add(T, R); break;
        case 5: add(T, R); add(B, L); break; // saddle
        case 6: add(T, B); break;
        case 7: add(T, L); break;
        case 8: add(L, T); break;
        case 9: add(B, T); break;
        case 10: add(L, T); add(R, B); break; // saddle
        case 11: add(R, T); break;
        case 12: add(L, R); break;
        case 13: add(B, R); break;
        case 14: add(L, B); break;
      }
    }
  }

  // Stitch directed segments into closed loops by matching endpoints.
  const key = (p: Pt) => `${Math.round(p[0] * 2)},${Math.round(p[1] * 2)}`;
  const startMap = new Map<string, number[]>();
  segs.forEach((s, i) => {
    const k = key(s[0]);
    if (!startMap.has(k)) startMap.set(k, []);
    startMap.get(k)!.push(i);
  });
  const used = new Array(segs.length).fill(false);
  const loops: Pt[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    const loop: Pt[] = [];
    let cur: number | null = i;
    while (cur != null && !used[cur]) {
      used[cur] = true;
      loop.push(segs[cur][0]);
      const cand = startMap.get(key(segs[cur][1]));
      let next: number | null = null;
      if (cand) for (const j of cand) if (!used[j]) { next = j; break; }
      cur = next;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

// --- Douglas–Peucker simplification (closed) -------------------------------
function perpDist2(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1e-9;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + t * dx, py = a[1] + t * dy;
  return (p[0] - px) ** 2 + (p[1] - py) ** 2;
}
function dp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  let idx = -1, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist2(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max > eps * eps) {
    return dp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(dp(pts.slice(idx), eps));
  }
  return [pts[0], pts[pts.length - 1]];
}
export function simplifyClosed(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 5) return pts;
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = (pts[0][0] - pts[i][0]) ** 2 + (pts[0][1] - pts[i][1]) ** 2;
    if (d > fd) { fd = d; far = i; }
  }
  const ra = dp(pts.slice(0, far + 1), eps);
  const rb = dp(pts.slice(far).concat([pts[0]]), eps);
  return ra.slice(0, -1).concat(rb.slice(0, -1));
}
