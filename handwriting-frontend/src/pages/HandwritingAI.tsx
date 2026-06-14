import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Wand2, Info, AlertTriangle, SlidersHorizontal, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { SCRIPT_LIST, getScript } from "@/lib/scripts";
import { buildFont, registerFont, cropToCell, type BuiltFont, type GlyphInput } from "@/lib/fontBuilder";
import { fontsApi, ApiError, type LabeledGlyph } from "@/lib/api";
import { FontResult } from "@/components/handwriting/FontResult";
import type { ScriptCell } from "@/lib/scripts";

const shortId = () => Math.random().toString(36).slice(2, 8);

function toCell(label: LabeledGlyph, scriptCode: string): ScriptCell {
  const char = label.char;
  if (scriptCode === "arabic" && label.form && label.form !== "isol") {
    return { id: `${char}-${label.form}`, chars: char, display: char, kind: "glyph", form: label.form };
  }
  return { id: char, chars: char, display: char, kind: "glyph", unicode: char.codePointAt(0) };
}

export default function HandwritingAI() {
  const [scriptCode, setScriptCode] = useState("latin");
  const script = getScript(scriptCode);
  const [name, setName] = useState("My handwriting");
  const [details, setDetails] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);

  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [inputs, setInputs] = useState<GlyphInput[]>([]);
  const [built, setBuilt] = useState<BuiltFont | null>(null);

  // Check whether the AI extractor is configured on the server.
  useEffect(() => {
    fontsApi.aiStatus().then(setAiEnabled).catch(() => setAiEnabled(false));
  }, []);

  const toDataUrl = (img: HTMLImageElement): string => {
    const c = document.createElement("canvas");
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  };

  const analyze = async (img: HTMLImageElement) => {
    setAnalyzing(true);
    try {
      const glyphs = await fontsApi.label({ image: toDataUrl(img), language: scriptCode, details });
      if (!glyphs.length) {
        toast.warning("No characters detected. Add detail under Options, or try a clearer image.");
        return;
      }
      const seen = new Set<string>();
      const out: GlyphInput[] = [];
      for (const g of glyphs) {
        const cell = toCell(g, scriptCode);
        if (seen.has(cell.id)) continue;
        seen.add(cell.id);
        out.push({ cell, canvas: cropToCell(img, g) });
      }
      setInputs(out);
      toast.success(`Detected ${out.length} characters.`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 501) {
        setAiEnabled(false);
        toast.warning("AI mode isn't configured on the server. Use Handwriting (Manual) — it's fully free/offline.");
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't analyze the image");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Upload-first: choosing an image immediately analyzes it.
  const onPhoto = (file: File) => {
    const img = new Image();
    img.onload = () => {
      setPhoto(img);
      setInputs([]);
      setBuilt(null);
      analyze(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleBuild = async () => {
    if (inputs.length < 2) {
      toast.warning("Upload a handwriting image first.");
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
      toast.error("Couldn't build the font.");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <PageShell>
      <section className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Handwriting — AI <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20">beta</span>
            </span>
            <h1 className="font-display text-4xl font-bold mt-3">Upload your handwriting — get a font</h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Drop in one photo of your handwriting. The AI reads your letters and builds a reusable font you can use anywhere.
            </p>
          </div>

          {aiEnabled === false && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-100 flex gap-2 mb-5">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                AI extraction needs an API key on the server (set <code>ANTHROPIC_API_KEY</code> in the backend <code>.env</code>).
                Until then, use <Link to="/handwriting/manual" className="font-semibold underline">Handwriting (Manual)</Link> — fully free and offline.
              </span>
            </div>
          )}

          {/* dropzone — the primary action */}
          <label className="block rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center cursor-pointer hover:border-primary/50 transition">
            <ImageUp className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">{photo ? "Choose a different image" : "Upload a handwriting photo"}</p>
            <p className="text-xs text-muted-foreground mt-1">PNG or JPG · we read it automatically</p>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          </label>

          {/* options (collapsed) */}
          <div className="mt-4">
            <button onClick={() => setShowOptions((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <SlidersHorizontal className="h-4 w-4" /> {showOptions ? "Hide" : "Options"} (language, name, details)
            </button>
            {showOptions && (
              <div className="mt-3 grid sm:grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Language</Label>
                  <Select value={scriptCode} onValueChange={(v) => { setScriptCode(v); setInputs([]); setBuilt(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCRIPT_LIST.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Name this hand</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Details for the AI (optional, improves accuracy)</Label>
                  <Textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="e.g. 'My neat print, black pen on lined paper. Capture lowercase letters and digits.'"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* analysis result + build */}
          {photo && (
            <div className="mt-5 grid sm:grid-cols-2 gap-4 items-start">
              <img src={photo.src} alt="sample" className="rounded-lg border border-border max-h-72 object-contain bg-white" />
              <div className="space-y-3">
                {analyzing ? (
                  <p className="text-sm text-muted-foreground">Reading your handwriting…</p>
                ) : inputs.length > 0 ? (
                  <>
                    <p className="text-sm font-semibold">Detected {inputs.length} characters</p>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-auto" dir={script.rtl ? "rtl" : "ltr"}>
                      {inputs.map((g) => (
                        <span key={g.cell.id} className="h-7 min-w-7 px-1 grid place-items-center rounded bg-secondary text-sm">{g.cell.display}</span>
                      ))}
                    </div>
                    <Button onClick={handleBuild} disabled={building}>
                      <Wand2 className="h-4 w-4 mr-1.5" /> {building ? "Building…" : "Build font"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No characters yet. Try a clearer photo, or add detail under Options and re-upload.</p>
                )}
              </div>
            </div>
          )}

          {built && <FontResult built={built} name={name} script={script} source="photo" />}
        </div>
      </section>
    </PageShell>
  );
}
