import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { arrayBufferToBase64, type BuiltFont } from "@/lib/fontBuilder";
import { fontsApi } from "@/lib/api";
import type { ScriptConfig } from "@/lib/scripts";

// Live preview of a freshly built font + a Save action.
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
  const family = `'${built.family}', cursive`;

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
    <div className="mt-6 rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Preview — {name}</h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save to my fonts"}
        </Button>
      </div>
      <div className="paper-ruled rounded-xl p-6" dir={script.rtl ? "rtl" : "ltr"}>
        <p className="text-3xl leading-relaxed" style={{ fontFamily: family }}>{script.sample}</p>
        <p className="text-base mt-3 text-muted-foreground" style={{ fontFamily: "inherit" }}>
          {built.glyphCount} glyphs • {String(built.metrics.strategy)} connection
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Saved fonts appear under “My Hands” in the editor and work in PDF/PNG exports.
        {script.rtl ? " Arabic letters join via the browser's text shaper." : ""}
      </p>
    </div>
  );
}
