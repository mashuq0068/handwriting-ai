import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";


interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    status: "planned" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";
    start_date?: string;
    end_date?: string;
  }) => void;
}

const STATUS_OPTIONS = [
  { value: "planned" as const, label: "Planned", color: "#9CA3AF" },
  { value: "in_progress" as const, label: "In Progress", color: "#D97706" },
  { value: "completed" as const, label: "Completed", color: "#16A34A" },
];

const PRIORITY_OPTIONS = [
  { value: "low" as const, label: "Low" },
  { value: "medium" as const, label: "Medium" },
  { value: "high" as const, label: "High" },
];

function QuickAddForm({ onSubmit, onClose }: { onSubmit: QuickAddSheetProps["onSubmit"]; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"planned" | "in_progress" | "completed">("planned");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      status,
      priority,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-1">
      <div className="space-y-1.5">
        <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
        <Input
          autoFocus
          placeholder="e.g. Launch MVP, User Research..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="font-body text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display transition-all ${
                status === opt.value
                  ? "bg-secondary text-foreground shadow-sm ring-1 ring-foreground/50"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Priority</Label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-display transition-all ${
                priority === opt.value
                  ? "bg-secondary text-foreground shadow-sm ring-1 ring-foreground/50"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="font-body text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="font-body text-sm"
          />
        </div>
      </div>

      <Button type="submit" className="w-full font-display" size="lg" disabled={!title.trim()}>
        Add to Roadmap
      </Button>
    </form>
  );
}

export function QuickAddSheet({ open, onOpenChange, onSubmit }: QuickAddSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-display">Add Milestone</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <QuickAddForm onSubmit={onSubmit} onClose={() => onOpenChange(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Milestone</DialogTitle>
        </DialogHeader>
        <QuickAddForm onSubmit={onSubmit} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
