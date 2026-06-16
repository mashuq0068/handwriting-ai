/**
 * Handwriting realism helpers.
 *
 * Real handwriting is never perfectly aligned. We add small, *stable* per-word
 * rotation and vertical offset so a rendered page reads as written-by-hand
 * rather than typed — without re-randomising on every render (which would make
 * the preview jump). A seeded RNG keeps it deterministic for a given document.
 */

/** Deterministic PRNG (mulberry32) — same seed ⇒ same sequence. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap stable string→int hash so a document's text seeds its own jitter. */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// CJK ideographs / kana — these scripts read as handwritten only when each
// *character* varies, so we wrap them per-glyph. Cursive scripts (Latin, Arabic,
// Devanagari, Cyrillic) must stay connected, so we wrap those per-word.
const CJK = /[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]/;

/** Split a text run into units to jitter: single CJK glyphs, words, and whitespace. */
function tokenize(text: string): string[] {
  return text.match(/[぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]|\s+|[^\s぀-ヿ㐀-鿿豈-﫿ｦ-ﾟ]+/g) ?? [];
}

/**
 * Wrap each word/glyph of an HTML fragment in a jittered span so the page looks
 * written by hand. Walks the DOM (so tags like <strong>/<h1> are preserved) and
 * only transforms text nodes. Adds subtle ink-flow variation: lighter/heavier
 * words, spacing wobble, occasional pressed strokes and ink specks.
 *
 * @param html       parsed-markdown HTML
 * @param seed       stable seed (e.g. hashString(text))
 * @param intensity  0 = none, 1 = subtle, 2 = strong
 */
export function applyHandwritingJitter(html: string, seed: number, intensity = 1): string {
  if (intensity <= 0 || typeof document === "undefined") return html;

  const rand = mulberry32(seed);
  // Subtle irregularity that SCALES WITH FONT SIZE (em units, not px) so it reads
  // the same at 18px or 48px and never bounces words off the line.
  const maxRot = 1.1 * intensity; // degrees: each word tilts
  const maxYEm = 0.045 * intensity; // em: words drift up/down (relative to size)
  const maxSkew = 1.3 * intensity; // degrees: slight slant variation
  const maxScale = 0.04 * intensity; // ±size variation per word

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild as HTMLElement;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (!text.trim()) continue;
        const frag = doc.createDocumentFragment();
        for (const token of tokenize(text)) {
          if (/^\s+$/.test(token)) {
            frag.appendChild(doc.createTextNode(token));
            continue;
          }
          const span = doc.createElement("span");
          const classes = ["hw-word"];
          const r = (rand() * 2 - 1) * maxRot;
          const y = (rand() * 2 - 1) * maxYEm;
          const sk = (rand() * 2 - 1) * maxSkew;
          const sc = (1 + (rand() * 2 - 1) * maxScale).toFixed(3); // size wobble
          const o = (0.88 + rand() * 0.12).toFixed(2); // ink flow: 0.88–1.0 (subtle)
          const ls = (rand() * 2 - 1) * 0.012; // spacing wobble (em)
          const styles = [
            `--r:${r.toFixed(2)}deg`,
            `--y:${y.toFixed(3)}em`,
            `--sk:${sk.toFixed(2)}deg`,
            `--sc:${sc}`,
            `--o:${o}`,
            `--ls:${ls.toFixed(3)}em`,
          ];

          // Occasional, subtle ink speck (skip CJK so glyphs stay clean). Kept
          // rare — frequent specks read as dirt, not handwriting.
          if (!CJK.test(token)) {
            const roll = rand();
            if (roll > 0.95) classes.push("hw-speck");
            if (roll > 0.99) classes.push("hw-drip");
          }

          span.className = classes.join(" ");
          span.setAttribute("style", styles.join(";"));
          span.textContent = token;
          frag.appendChild(span);
        }
        child.parentNode?.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };

  walk(root);
  return root.innerHTML;
}
