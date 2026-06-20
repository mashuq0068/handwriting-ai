/**
 * Document import — extract plain text from a paste OR an uploaded file
 * (TXT, PDF, Word .docx). The text is then rendered as handwriting.
 *
 * PDF  → pdfjs-dist (reconstructs lines via the hasEOL flag).
 * DOCX → mammoth (raw text).
 * TXT / anything text-like → File.text().
 */
import * as pdfjsLib from "pdfjs-dist";
// Load the pdf.js worker via Vite's `?worker` so it is bundled with a hashed,
// version-locked filename. A worker imported by stable `?url` can be served from
// a STALE browser cache after a pdfjs upgrade, and a mismatched worker silently
// corrupts text extraction (it drops the right side of lines) instead of failing
// loudly — which looks exactly like "letters cut off on import". `?worker` (a
// fresh, matching Worker instance per load) makes that impossible.
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export type ImportKind = "txt" | "pdf" | "docx";

function kindFor(file: File): ImportKind | null {
  const name = file.name.toLowerCase();
  const type = file.type;
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return "docx";
  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".text"))
    return "txt";
  return null;
}

// Reconstruct a page's text from glyph POSITIONS instead of the PDF stream's
// `hasEOL` flags. We group text runs onto rows by their Y baseline, order each
// row left→right, and insert spaces from the x-gaps. This is far more robust:
//  - it keeps every character even when a line is split into many runs, and
//  - it fixes column / label reordering that stream-order extraction gets wrong
//    (e.g. a "Frontend Technologies" label drifting away from its ": React, …"
//    value), which is exactly how resume templates lose text on import.
// A positioned text run from pdf.js (`TextItem`). `TextMarkedContent` markers
// have no `str` and are skipped.
interface PdfTextRun {
  str: string;
  transform: number[]; // [a, b, c, d, x, y] — x = [4], y = [5]
  width?: number;
}
function pageItemsToText(items: ReadonlyArray<PdfTextRun | { type: string }>): string {
  type Part = { x: number; str: string; end: number };
  type Row = { y: number; parts: Part[] };
  const rows: Row[] = [];
  for (const it of items) {
    if (!("str" in it) || it.str === "") continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const w = it.width ?? 0;
    let row = rows.find((r) => Math.abs(r.y - y) <= 3);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, str: it.str, end: x + w });
  }
  rows.sort((a, b) => b.y - a.y); // PDF Y decreases down the page → top first
  return rows
    .map((r) => {
      r.parts.sort((a, b) => a.x - b.x);
      let s = "";
      let prevEnd: number | null = null;
      for (const p of r.parts) {
        if (prevEnd !== null && p.x - prevEnd > 1 && !s.endsWith(" ") && !p.str.startsWith(" "))
          s += " ";
        s += p.str;
        prevEnd = p.end;
      }
      return s.replace(/\s+/g, " ").trimEnd();
    })
    .join("\n");
}

async function extractPdf(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pages.push(pageItemsToText(content.items as ReadonlyArray<PdfTextRun | { type: string }>));
  }
  return pages.join("\n\n").trim();
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return (value || "").trim();
}

// Normalize extracted text so handwriting fonts render every letter:
// - NFKC decomposes ligature glyphs (ﬁ→fi, ﬂ→fl, …) that most fonts lack.
// - strip soft hyphens / zero-width chars that show as gaps or missing letters.
function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[­​‌‍﻿]/g, "") // soft hyphen + zero-width chars
    .replace(/ /g, " "); // non-breaking space → normal space
}

/** Extract plain text from an uploaded file. Throws on unsupported types. */
export async function extractText(file: File): Promise<string> {
  const kind = kindFor(file);
  let text: string;
  if (kind === "pdf") text = await extractPdf(file);
  else if (kind === "docx") text = await extractDocx(file);
  else if (kind === "txt") text = await file.text();
  else throw new Error("Unsupported file. Upload a .txt, .pdf, or .docx file (or just paste the text).");
  return normalizeText(text).trim();
}

export const ACCEPT_IMPORT = ".txt,.text,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
