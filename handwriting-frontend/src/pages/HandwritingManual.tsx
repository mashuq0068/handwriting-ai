import { useRef, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenLine, FileDown, Camera, Wand2, Upload, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { SCRIPT_LIST, getScript } from "@/lib/scripts";
import { buildFont, type BuiltFont, type GlyphInput } from "@/lib/fontBuilder";
import { registerFont } from "@/lib/fontBuilder";
import { downloadTemplatePdf, downloadTemplatePng } from "@/lib/templateSheet";
import { extractFromPhoto } from "@/lib/extractSheet";
import { DrawGrid, type DrawGridHandle } from "@/components/handwriting/DrawGrid";
import { FontResult } from "@/components/handwriting/FontResult";

const shortId = () => Math.random().toString(36).slice(2, 8);

export default function HandwritingManual() {
  const [scriptCode, setScriptCode] = useState("latin");
  const script = getScript(scriptCode);
  const [method, setMethod] = useState<"template" | "draw">("template");
  const [name, setName] = useState("My handwriting");
  const [coverage, setCoverage] = useState(0);
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<BuiltFont | null>(null);

  const gridRef = useRef<DrawGridHandle>(null);

  // template-photo state
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [extracted, setExtracted] = useState<GlyphInput[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [warpedUrl, setWarpedUrl] = useState<string | null>(null);

  const changeScript = (code: string) => {
    setScriptCode(code);
    setBuilt(null);
    setExtracted([]);
    setWarpedUrl(null);
    setCoverage(0);
  };

  const onPhoto = (file: File) => {
    const img = new Image();
    img.onload = () => {
      setPhoto(img);
      setExtracted([]);
      setWarpedUrl(null);
      setBuilt(null);
    };
    img.src = URL.createObjectURL(file);
  };

  const runExtract = () => {
    if (!photo) return;
    setExtracting(true);
    try {
      const { glyphs, warped } = extractFromPhoto(photo, script);
      setExtracted(glyphs);
      setWarpedUrl(warped.toDataURL());
      setCoverage(glyphs.length);
      const total = script.cells.filter((c) => !c.form || c.form === "isol").length;
      if (!glyphs.length) {
        toast.warning("Couldn't read any cells. Make sure the 4 corner squares are visible and the photo is flat & bright.");
      } else if (glyphs.length < Math.min(10, total * 0.25)) {
        toast.warning(
          `Only ${glyphs.length} cells had ink. Did you upload a photo of the sheet AFTER writing on it with a pen? The faint printed letters are just guides — write your own letters over them, then photograph that.`,
          { duration: 8000 }
        );
      } else {
        toast.success(`Read ${glyphs.length} characters from the sheet.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleBuild = async () => {
    const inputs = method === "draw" ? gridRef.current?.collect() ?? [] : extracted;
    if (inputs.length < 2) {
      toast.warning("Add at least a couple of letters first.");
      return;
    }
    setBuilding(true);
    try {
      const font = await buildFont(name, shortId(), scriptCode, inputs);
      await registerFont(font.family, font.arrayBuffer.slice(0));
      setBuilt(font);
      toast.success("Font built — preview below.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't build the font from those samples.");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <PageShell>
      <section className="flex-1 py-10">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
              <PenLine className="h-3.5 w-3.5" /> Handwriting — Manual
            </span>
            <h1 className="font-display text-4xl font-bold mt-3">Make your handwriting font</h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Download a template, write it with your pen, photograph and upload — or draw each letter here. No AI; the system reads your sheet directly.
            </p>
          </div>

          {/* language + method + name */}
          <div className="flex flex-wrap items-end gap-3 mb-5">
            <div className="space-y-1.5">
              <Label className="text-sm">Language</Label>
              <Select value={scriptCode} onValueChange={changeScript}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCRIPT_LIST.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Name this hand</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
            </div>
            <div className="text-sm text-muted-foreground pb-2">{coverage} ready</div>
            <div className="flex-1" />
            <Button onClick={handleBuild} disabled={building}>
              <Wand2 className="h-4 w-4 mr-1.5" /> {building ? "Building…" : "Build font"}
            </Button>
          </div>

          {/* method toggle */}
          <div className="flex gap-2 mb-5">
            <Button variant={method === "template" ? "default" : "outline"} size="sm" onClick={() => { setMethod("template"); setBuilt(null); }}>
              <FileDown className="h-4 w-4 mr-1.5" /> Template + photo <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">recommended</span>
            </Button>
            <Button variant={method === "draw" ? "default" : "outline"} size="sm" onClick={() => { setMethod("draw"); setBuilt(null); }}>
              <PenLine className="h-4 w-4 mr-1.5" /> Draw here
            </Button>
          </div>

          {script.note && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground flex gap-2 mb-5">
              <Info className="h-4 w-4 mt-0.5 shrink-0" /> <span>{script.note}</span>
            </div>
          )}

          {method === "template" ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-4">
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Download &amp; print the template for <strong>{script.label}</strong>.</li>
                <li>Write each character on its guide line with a dark pen. Keep the 4 black corner squares visible.</li>
                <li>For the <strong>2–3 letter cells</strong> at the end (th, he, the, ing…), write them <strong>joined</strong> like cursive — that's what makes your letters connect.</li>
                <li>Take a flat, bright photo (or scan) and upload it. The system reads each cell automatically.</li>
              </ol>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => downloadTemplatePdf(script, name)}>
                  <FileDown className="h-4 w-4 mr-1.5" /> Download template (PDF)
                </Button>
                <Button variant="outline" onClick={() => downloadTemplatePng(script, name)}>
                  <FileDown className="h-4 w-4 mr-1.5" /> Download template (PNG)
                </Button>
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-secondary/50">
                  <Upload className="h-4 w-4" /> Upload filled photo
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
                </label>
                <Button variant="outline" size="sm" onClick={runExtract} disabled={!photo || extracting}>
                  <Camera className="h-4 w-4 mr-1.5" /> {extracting ? "Reading…" : "Read sheet"}
                </Button>
              </div>
              {warpedUrl && (
                <div>
                  <p className="text-sm font-semibold mb-2">Flattened sheet (what the reader sees after aligning to the corners):</p>
                  <img src={warpedUrl} alt="flattened sheet" className="rounded-lg border border-border max-h-96 object-contain bg-white mx-auto" />
                  <p className="text-xs text-muted-foreground mt-1.5">This should look like a clean, straight grid with your letters sitting inside the boxes. If it's skewed, stretched, or the letters sit between/outside the boxes, the corner squares weren't found correctly.</p>
                </div>
              )}
              {photo && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <img src={photo.src} alt="sheet" className="rounded-lg border border-border max-h-72 object-contain bg-white" />
                  {extracted.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Read {extracted.length} characters — this is the actual ink we extracted:</p>
                      <div className="flex flex-wrap gap-2 max-h-72 overflow-auto">
                        {extracted.map((g) => (
                          <div key={g.cell.id} className="flex flex-col items-center">
                            <img
                              src={g.canvas.toDataURL()}
                              alt={g.cell.display}
                              className="h-12 w-9 object-contain rounded border border-border bg-white"
                            />
                            <span className="text-[10px] text-muted-foreground mt-0.5">{g.cell.display}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Each tile should show YOUR letter (the one printed under it). If tiles are blank or show the wrong letter, the photo wasn't read correctly — retake it flatter/brighter with all 4 corner squares visible.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-3">
                Draw each character on the guide line (stylus, finger, or mouse). Hover a cell to clear it.
              </p>
              <DrawGrid key={scriptCode} ref={gridRef} script={script} onCoverageChange={setCoverage} />
            </div>
          )}

          {built && <FontResult built={built} name={name} script={script} source={method === "draw" ? "draw" : "manual"} />}
        </div>
      </section>
    </PageShell>
  );
}
