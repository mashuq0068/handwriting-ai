import { useState } from "react";
import { Settings, X } from "lucide-react";

interface DevPanelProps {
  layoutIndex: number;
  setLayoutIndex: (i: number) => void;
}

const LAYOUT_NAMES = [
  "Cards with icons (stacked)",
  "Numbered horizontal strip",
  "Side-by-side alternating",
  "Minimal list with dividers",
  "Large feature cards (overlap)",
];

export default function DevPanel({
  layoutIndex,
  setLayoutIndex,
}: DevPanelProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 text-xs font-display font-medium shadow-xl hover:opacity-90 transition-opacity"
      >
        <Settings className="h-3.5 w-3.5" />
        Dev Panel
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 rounded-xl bg-foreground text-background shadow-2xl border border-white/10 overflow-hidden max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-foreground">
        <span className="font-display text-sm font-semibold">Dev Panel</span>
        <button onClick={() => setOpen(false)} className="hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Layout selector */}
        <div>
          <p className="text-xs font-display font-medium mb-2 text-white/60 uppercase tracking-wider">
            Value Props Layout
          </p>
          <div className="space-y-1">
            {LAYOUT_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => setLayoutIndex(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-display transition-colors ${
                  layoutIndex === i
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:bg-white/10 hover:text-white/80"
                }`}
              >
                {i + 1}. {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
