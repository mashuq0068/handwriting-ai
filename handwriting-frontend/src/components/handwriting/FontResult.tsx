import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { arrayBufferToBase64, downloadFont, type BuiltFont } from "@/lib/fontBuilder";
import { fontsApi } from "@/lib/api";
import type { ScriptConfig } from "@/lib/scripts";

// Live preview of a freshly built font + Save / Download actions.
export function FontResult({
  built,
  name,
  script,
  source,
}: {
  built: BuiltFont;
  name: string;
  script: ScriptConfig;
  source: "manual" | "photo" | "draw";
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [previewText, setPreviewText] = useState(script.sample);
  // Render pure (no fallback) so you judge YOUR glyphs; missing ones show as
  // the browser's notdef box rather than a different font sneaking in.
  const family = `'${built.family}'`;

  // Every base glyph in this script, so you can eyeball each captured letter.
  const alphabet = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of script.cells) {
      if (c.kind !== "glyph") continue;
      if (c.form && c.form !== "isol") continue;
      if (seen.has(c.display)) continue;
      seen.add(c.display);
      out.push(c.display);
    }
    return out.join(" ");
  }, [script.cells]);

  const skipped = Number(built.metrics.skipped ?? 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fontsApi.create({
        name: name.trim() || "My handwriting",
        family: built.family,
        language: script.code,
        glyphCount: built.glyphCount,
        source,
        metrics: built.metrics,
        dataBase64: arrayBufferToBase64(built.arrayBuffer),
      });
      toast.success("Saved to your handwriting library.");
      navigate("/editor");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the font");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Preview — {name}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadFont(built.arrayBuffer, name || "my-handwriting")}>
            <Download className="h-4 w-4 mr-1.5" /> Download .ttf
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save to my fonts"}
          </Button>
        </div>
      </div>

      {/* Editable preview — type anything and see it in your hand */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Type to preview</label>
        <Input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Type anything…"
          dir={script.rtl ? "rtl" : "ltr"}
        />
      </div>
      <div className="paper-ruled rounded-xl p-6 min-h-[120px]" dir={script.rtl ? "rtl" : "ltr"}>
        <p className="text-3xl leading-relaxed break-words" style={{ fontFamily: family, fontFeatureSettings: '"liga" 0, "clig" 0, "calt" 0' }}>
          {previewText || " "}
        </p>
      </div>

      {/* Full alphabet — inspect every captured glyph */}
      <div>
        <p className="text-sm font-semibold mb-1.5">Every letter ({built.glyphCount} captured)</p>
        <div className="paper-grid rounded-xl p-5" dir={script.rtl ? "rtl" : "ltr"}>
          <p className="text-2xl leading-loose tracking-wide break-words" style={{ fontFamily: family, fontFeatureSettings: '"liga" 0, "clig" 0, "calt" 0' }}>
            {alphabet}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {built.glyphCount} glyphs • {String(built.metrics.strategy)} connection.
          {skipped > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              {" "}
              {skipped} cell{skipped > 1 ? "s" : ""} read blank and were skipped — any letter that appears in a plain (non-handwritten) font above wasn’t captured.
            </span>
          )}
        </p>
      </div>

      {skipped > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-100 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Some letters didn’t read. Re-take the photo flatter/brighter (or fill those boxes darker) and read the sheet again for a complete font.</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Saved fonts appear under “My Hands” in the editor and work in PDF/PNG exports. The downloaded .ttf installs on Windows/Mac and works in Word, Canva, etc.
        {script.rtl ? " Arabic letters join via the browser's text shaper." : ""}
      </p>
    </div>
  );
}
