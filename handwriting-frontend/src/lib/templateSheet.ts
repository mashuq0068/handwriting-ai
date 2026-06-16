/**
 * Printable handwriting template. Drawn onto a high-res canvas (so every script
 * renders via system fonts) and wrapped into a PDF. The cell layout is shared
 * with the extractor so a photo of the filled sheet maps back exactly.
 */
import type { ScriptConfig } from "./scripts";
import { capturableCells } from "./scripts";

// A4 @ ~150dpi.
export const SHEET = { w: 1240, h: 1754 };
// Fiducial squares mark the printable grid corners; the extractor finds them.
const MARGIN = 90; // px from sheet edge to fiducial center
const FID = 46; // fiducial square size
const HEADER = 150; // top space for the title row

export interface CellRect { id: string; display: string; form?: string; x: number; y: number; w: number; h: number }
export interface SheetLayout {
  cols: number;
  rows: number;
  // grid area bounded by fiducial centers
  gx: number; gy: number; gw: number; gh: number;
  cells: CellRect[];
  fiducials: { x: number; y: number }[]; // TL, TR, BR, BL (centers)
}

// Compute the normalized grid layout in sheet pixels (shared by PDF + extractor).
export function sheetLayout(script: ScriptConfig): SheetLayout {
  const fids = [
    { x: MARGIN, y: MARGIN },
    { x: SHEET.w - MARGIN, y: MARGIN },
    { x: SHEET.w - MARGIN, y: SHEET.h - MARGIN },
    { x: MARGIN, y: SHEET.h - MARGIN },
  ];
  const gx = MARGIN;
  const gy = MARGIN + HEADER;
  const gw = SHEET.w - 2 * MARGIN;
  const gh = SHEET.h - MARGIN - gy;

  const source = capturableCells(script);
  const n = source.length;
  const cols = 7;
  const rows = Math.ceil(n / cols);
  const cw = gw / cols;
  const ch = Math.min(gh / rows, 210);

  const cells: CellRect[] = source.map((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { id: c.id, display: c.display, form: c.form, x: gx + col * cw, y: gy + row * ch, w: cw, h: ch };
  });
  return { cols, rows, gx, gy, gw, gh, cells, fiducials: fids };
}

// Draw the whole template onto a canvas.
export function drawTemplate(script: ScriptConfig, name: string): HTMLCanvasElement {
  const layout = sheetLayout(script);
  const canvas = document.createElement("canvas");
  canvas.width = SHEET.w;
  canvas.height = SHEET.h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SHEET.w, SHEET.h);

  // fiducials (solid black squares)
  ctx.fillStyle = "#000000";
  for (const f of layout.fiducials) ctx.fillRect(f.x - FID / 2, f.y - FID / 2, FID, FID);

  // header
  ctx.fillStyle = "#111111";
  ctx.font = "bold 40px sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`Quillify handwriting — ${name}`, MARGIN, MARGIN + 60);
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "#666666";
  const tip = script.ligatures?.length
    ? `${script.label} · write each letter on the line; write the 2–3 letter cells JOINED (cursive) for connection`
    : `${script.label} · write each character on the line, fill the box`;
  ctx.fillText(tip, MARGIN, MARGIN + 100);

  for (const cell of layout.cells) {
    // cell border
    ctx.strokeStyle = "#dddddd";
    ctx.lineWidth = 1;
    ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);

    // guide line: headline near top for indic, baseline lower otherwise
    const guideY = script.guide === "headline" ? cell.y + cell.h * 0.22 : cell.y + cell.h * 0.78;
    if (script.guide !== "box") {
      ctx.strokeStyle = "#9bb7e0";
      ctx.setLineDash(script.guide === "headline" ? [] : [6, 5]);
      ctx.beginPath();
      ctx.moveTo(cell.x + 8, guideY);
      ctx.lineTo(cell.x + cell.w - 8, guideY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // faint guide glyph (system font renders any script)
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.font = `${Math.round(cell.h * 0.5)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cell.display, cell.x + cell.w / 2, cell.y + cell.h * 0.5);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // small label (id + form)
    ctx.fillStyle = "#999999";
    ctx.font = "16px sans-serif";
    ctx.fillText(cell.form ? `${cell.display} ${cell.form}` : cell.display, cell.x + 6, cell.y + 22);
  }
  return canvas;
}

// Build + download a PDF of the template.
export async function downloadTemplatePdf(script: ScriptConfig, name: string): Promise<void> {
  const canvas = drawTemplate(script, name);
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageW, pageH);
  pdf.save(`quillify-template-${script.code}.pdf`);
}

// Download the template as a PNG image (for tablets / on-screen tracing).
export function downloadTemplatePng(script: ScriptConfig, name: string): void {
  const canvas = drawTemplate(script, name);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `quillify-template-${script.code}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
