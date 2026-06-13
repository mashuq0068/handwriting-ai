import { Route, Sparkles, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyCanvasStateProps {
  onAddItem: () => void;
  onAddTemplate: () => void;
}

export function EmptyCanvasState({ onAddItem, onAddTemplate }: EmptyCanvasStateProps) {
  return (
    <div className="h-full flex items-center justify-center bg-background animate-fade-in">
      <div className="flex flex-col items-center text-center max-w-md px-6 space-y-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-scale-in">
          <Route className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Start building your roadmap
          </h2>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Plan milestones, set timelines, and track progress — all in one place.
            Drag items to reposition them on your timeline.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={onAddItem}
            className="font-display text-sm gap-2"
            size="lg"
          >
            <Sparkles className="h-4 w-4" />
            Add your first milestone
          </Button>
          <Button
            variant="outline"
            onClick={onAddTemplate}
            className="font-display text-sm gap-2"
            size="lg"
          >
            Start from template
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-display">
          <MousePointerClick className="h-3.5 w-3.5" />
          <span>Tip: Drag &amp; drop items to arrange your timeline</span>
        </div>
      </div>
    </div>
  );
}
