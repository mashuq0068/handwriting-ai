import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Check, Camera, Sparkles, Loader2, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SCRIPT_LIST, getScript } from "@/lib/scripts";
import {
  buildFont,
  registerFont,
  cropToCell,
  arrayBufferToBase64,
  type BuiltFont,
  type GlyphInput,
} from "@/lib/fontBuilder";
import { fontsApi, ApiError, type LabeledGlyph } from "@/lib/api";
import { segmentSpecimen, LATIN_SEQUENCE } from "@/lib/segmentSpecimen";
import type { ScriptCell } from "@/lib/scripts";

type Provider = "claude" | "gpt";

const shortId = () => Math.random().toString(36).slice(2, 8);

function toCell(label: LabeledGlyph, scriptCode: string): ScriptCell {
  const char = label.char;
  if (scriptCode === "arabic" && label.form && label.form !== "isol") {
    return { id: `${char}-${label.form}`, chars: char, display: char, kind: "glyph", form: label.form };
  }
  return { id: char, chars: char, display: char, kind: "glyph", unicode: char.codePointAt(0) };
}

export default function HandwritingAI() {
  const navigate = useNavigate();
  const [scriptCode, setScriptCode] = useState("");
  const [name, setName] = useState("My handwriting");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"form" | "training" | "done">("form");
  const [built, setBuilt] = useState<BuiltFont | null>(null);
  const [saving, setSaving] = useState(false);
  const [ai, setAi] = useState<{ claude: boolean; gpt: boolean; imagegen: boolean } | null>(null);
  const [provider, setProvider] = useState<Provider>("claude");
  const [specimenUrl, setSpecimenUrl] = useState<string | null>(null);
  const [tiles, setTiles] = useState<GlyphInput[]>([]); // extracted cells, for debugging
  const [attempted, setAttempted] = useState(false); // a Train run was started
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fontsApi
      .aiStatus()
      .then((s) => {
        setAi(s);
        setProvider(s.gpt ? "gpt" : "claude"); // prefer GPT (can clone the full alphabet)
      })
      .catch(() => setAi({ claude: false, gpt: false, imagegen: false }));
  }, []);

  const step = status === "done" ? 2 : 1;
  const canTrain = Boolean(scriptCode) && name.trim().length > 0 && photo;

  const onPhoto = (file: File) => {
    const img = new Image();
    img.onload = () => setPhoto(img);
    img.src = URL.createObjectURL(file);
  };

  const toDataUrl = (img: HTMLImageElement): string => {
    const c = document.createElement("canvas");
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  };

  const loadImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

  // Draw Claude's labeled boxes onto the sample so the user can SEE its reading.
  const drawLabelOverlay = (img: HTMLImageElement, glyphs: LabeledGlyph[]): string => {
    const c = document.createElement("canvas");
    const max = 1100;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.lineWidth = 2;
    ctx.font = "bold 14px sans-serif";
    for (const g of glyphs) {
      const x = g.x * c.width, y = g.y * c.height, w = g.w * c.width, h = g.h * c.height;
      ctx.strokeStyle = "rgba(220,40,40,0.9)";
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(220,40,40,0.95)";
      ctx.fillText(g.char, x, Math.max(12, y - 3));
    }
    return c.toDataURL("image/png");
  };

  // Character list for this script (base glyphs only) — sent to the image model.
  const charsetFor = (code: string) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of getScript(code).cells) {
      if (c.kind !== "glyph") continue;
      if (c.form && c.form !== "isol") continue;
      if (seen.has(c.display)) continue;
      seen.add(c.display);
      out.push(c.display);
    }
    return out.join(" ");
  };

  // Labeled glyph boxes → font inputs (crop each box into a clean cell).
  const glyphsToInputs = (glyphs: LabeledGlyph[], source: HTMLImageElement): GlyphInput[] => {
    const seen = new Set<string>();
    const out: GlyphInput[] = [];
    for (const g of glyphs) {
      const cell = toCell(g, scriptCode);
      if (seen.has(cell.id)) continue;
      seen.add(cell.id);
      out.push({ cell, canvas: cropToCell(source, g) });
    }
    return out;
  };

  const train = async () => {
    if (!canTrain || !photo) {
      toast.warning("Pick a language, name your hand, and upload a photo.");
      return;
    }
    setStatus("training");
    setSpecimenUrl(null);
    setTiles([]);
    setAttempted(true);
    setErrorMsg(null);
    try {
      const isLatin = scriptCode === "latin";
      const sampleUrl = toDataUrl(photo);
      let inputs: GlyphInput[] | null = null;

      if (provider === "gpt") {
        // GPT: generate a clean cloned alphabet specimen, then extract THAT
        // (clean, separated, full coverage). For English, request EXACTLY the
        // deterministic sequence so segmentSpecimen can map blobs 1:1.
        const sheet = await fontsApi.specimen({
          image: sampleUrl,
          language: scriptCode,
          chars: isLatin ? LATIN_SEQUENCE.join(" ") : charsetFor(scriptCode),
        });
        setSpecimenUrl(sheet);
        const source = await loadImage(sheet);
        if (isLatin) {
          const seg = segmentSpecimen(source, LATIN_SEQUENCE);
          if (seg) inputs = seg.inputs;
        }
        if (!inputs) {
          // non-Latin or segmentation mismatch → label the generated sheet (GPT vision)
          const glyphs = await fontsApi.label({ image: toDataUrl(source), language: scriptCode, provider: "gpt" });
          inputs = glyphsToInputs(glyphs, source);
        }
      } else {
        // Claude: vision-only — read the uploaded sample directly and pull out the
        // letters it can isolate (works for letters present in your page).
        const glyphs = await fontsApi.label({ image: sampleUrl, language: scriptCode, provider: "claude" });
        if (glyphs.length) setSpecimenUrl(drawLabelOverlay(photo, glyphs)); // show Claude's reading
        inputs = glyphsToInputs(glyphs, photo);
      }

      setTiles(inputs ?? []); // surface what we extracted, even if the build fails next

      if (!inputs || !inputs.length) {
        toast.warning(
          provider === "claude"
            ? "Claude couldn't isolate letters. Upload a page where letters are written clearly and separated — or switch to GPT to clone the full alphabet."
            : "Couldn't read the generated alphabet. Try a clearer sample."
        );
        setStatus("form");
        return;
      }

      const font = await buildFont(name, shortId(), scriptCode, inputs);
      await registerFont(font.family, font.arrayBuffer.slice(0));
      setBuilt(font);
      setStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't train the model";
      setErrorMsg(msg);
      if (e instanceof ApiError && e.status === 501) toast.warning(msg);
      else toast.error(msg);
      setStatus("form");
    }
  };

  const save = async () => {
    if (!built) return;
    setSaving(true);
    try {
      await fontsApi.create({
        name: name.trim() || "My handwriting",
        family: built.family,
        language: scriptCode,
        glyphCount: built.glyphCount,
        source: "photo",
        metrics: built.metrics,
        dataBase64: arrayBufferToBase64(built.arrayBuffer),
      });
      toast.success("Saved to your library");
      navigate("/editor");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const script = scriptCode ? getScript(scriptCode) : null;
  const family = built ? `'${built.family}', cursive` : undefined;

  return (
    <PageShell>
      <section className="flex-1 py-16">
        <div className="mx-auto max-w-4xl px-5">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Handwriting — AI</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold mt-3">Turn your handwriting into a font.</h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Upload one sample. The AI re-draws your whole alphabet cleanly in your style, then builds a reusable font. For the most exact result, use <Link to="/handwriting/manual" className="underline font-semibold">Manual</Link>.</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-3 mb-10">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </span>
                {s < 2 && <span className={`h-0.5 w-12 ${step > s ? "bg-primary" : "bg-secondary"}`} />}
              </div>
            ))}
          </div>

          {ai && !ai.claude && !ai.gpt && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-100 flex gap-2 mb-5">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>No AI provider is configured on the server. Set <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code> in the backend, or use <Link to="/handwriting/manual" className="font-semibold underline">Handwriting (Manual)</Link> — fully free and offline.</span>
            </div>
          )}

          {/* Provider toggle: Claude (vision) vs GPT (generate clone). */}
          {ai && (ai.claude || ai.gpt) && status !== "done" && (
            <div className="rounded-2xl border border-border bg-card p-4 mb-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-semibold">AI engine</span>
                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setProvider("claude")}
                    disabled={!ai.claude}
                    className={`px-4 py-1.5 text-sm font-medium ${provider === "claude" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary/50"} ${!ai.claude ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    Claude
                  </button>
                  <button
                    onClick={() => setProvider("gpt")}
                    disabled={!ai.gpt}
                    className={`px-4 py-1.5 text-sm font-medium border-l border-border ${provider === "gpt" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary/50"} ${!ai.gpt ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    GPT
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {provider === "gpt"
                  ? "GPT clones your whole alphabet into a clean sheet (image generation), then builds the font — best coverage."
                  : "Claude reads your uploaded page and pulls out the letters it finds. It can't invent missing letters, so upload a page with letters written clearly and separated."}
                {!ai.gpt && " · GPT needs an OPENAI_API_KEY on the server (Claude can't generate images)."}
              </p>
            </div>
          )}

          {/* STEP 1 — setup */}
          {status !== "done" && (
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Upload your handwriting</h2>
                <p className="text-muted-foreground">Pick the language, name your hand, then upload one clear photo.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Language <span className="text-destructive">*</span></Label>
                  <Select value={scriptCode} onValueChange={setScriptCode}>
                    <SelectTrigger><SelectValue placeholder="Select a language" /></SelectTrigger>
                    <SelectContent>
                      {SCRIPT_LIST.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Name this hand <span className="text-destructive">*</span></Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My handwriting" />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                <strong>Tips for best results:</strong> use a dark pen on plain white paper, write large and clearly with space between letters, and take a flat, well-lit photo.
              </p>
              <p className="text-xs text-muted-foreground">
                {provider === "gpt"
                  ? "GPT will redraw your full alphabet cleanly, then build the font from it."
                  : "Claude will read this page and extract the letters it can isolate."}
              </p>

              <label className="block rounded-xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-primary/50 transition">
                {photo ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={photo.src} alt="sample" className="max-h-44 object-contain rounded" />
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-accent" /> Photo selected — click to change</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Camera className="h-7 w-7" />
                    <span className="text-sm font-semibold">Upload a handwriting photo</span>
                    <span className="text-xs">PNG or JPG</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
              </label>

              <div className="flex justify-end">
                <Button onClick={train} disabled={!canTrain || status === "training"}>
                  {status === "training" ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Training model…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Train model</>}
                </Button>
              </div>

              {status === "training" && (
                <div className="text-center text-sm text-muted-foreground flex flex-col items-center gap-2 pt-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  Reading your handwriting and building your font…
                </div>
              )}
            </div>
          )}

          {/* DEBUG — what the AI returned + what we extracted (persists on failure) */}
          {attempted && (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-5 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">Debug — provider: <span className="uppercase">{provider}</span></p>

              {errorMsg && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-100">
                  <strong>The run failed before producing an image:</strong> {errorMsg}
                  {/billing|limit/i.test(errorMsg) && (
                    <span> — your OpenAI account hit its spending limit. Add credit at platform.openai.com → Billing, then restart the backend.</span>
                  )}
                </div>
              )}

              {!specimenUrl && !tiles.length && photo && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Your uploaded sample (no AI output was produced):</p>
                  <img src={photo.src} alt="sample" className="rounded-lg border border-border max-h-56 object-contain bg-white" />
                </div>
              )}

              {specimenUrl ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {provider === "gpt"
                      ? "Image GPT generated (the cloned alphabet we extract from):"
                      : "Claude's reading — red boxes show where it located each letter on your sample:"}
                  </p>
                  <img src={specimenUrl} alt="AI output" className="rounded-lg border border-border max-h-80 object-contain bg-white mx-auto" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {provider === "gpt"
                      ? "It should be separated black letters on white. If they touch / aren't a clean grid, extraction will struggle and I'll tune the prompt."
                      : "If boxes are misplaced, overlapping, or grab parts of neighbours, that's why some tiles look off — Claude's boxes aren't pixel-tight."}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No AI output image yet — see the extracted tiles below.</p>
              )}
              {tiles.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Extracted {tiles.length} glyph{tiles.length > 1 ? "s" : ""} (the actual ink used to build the font):</p>
                  <div className="flex flex-wrap gap-2 max-h-72 overflow-auto">
                    {tiles.map((t) => (
                      <div key={t.cell.id} className="flex flex-col items-center">
                        <img src={t.canvas.toDataURL()} alt={t.cell.display} className="h-12 w-9 object-contain rounded border border-border bg-white" />
                        <span className="text-[10px] text-muted-foreground mt-0.5">{t.cell.display}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — result */}
          {status === "done" && built && (
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6 text-center">
              <Sparkles className="h-10 w-10 text-accent mx-auto" />
              <div>
                <h2 className="font-display text-2xl font-bold mb-2">Your hand is ready!</h2>
                <p className="text-muted-foreground">Here's your typed text written in your handwriting:</p>
              </div>
              <div className="paper-ruled p-6 rounded-xl text-left" dir={script?.rtl ? "rtl" : "ltr"}>
                <p className="text-2xl leading-snug" style={{ fontFamily: family }}>
                  Hi! This is what your handwriting looks like in Quillify.
                  You can now write anything in your own hand — letters, notes, applications.
                  Pretty close, right?
                </p>
                {script && <p className="text-xl mt-3 text-muted-foreground" style={{ fontFamily: family }}>{script.sample}</p>}
              </div>
              {specimenUrl && (
                <div className="text-left">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">AI-drawn alphabet (your font was built from this):</p>
                  <img src={specimenUrl} alt="generated alphabet" className="rounded-lg border border-border max-h-56 object-contain bg-white mx-auto" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">{built.glyphCount} letters captured · saved fonts appear under “My Hands” in the editor.</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => { setStatus("form"); setBuilt(null); }}>Retrain</Button>
                <Button onClick={save} disabled={saving}>
                  <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save & finish"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
