import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CommentsSection } from "@/components/layout/CommentsSection";
import { celebrateStatusCompleted } from "@/lib/celebrations";
import type { RoadmapItemRow } from "@/hooks/useRoadmap";
import type { TablesUpdate } from "@/integrations/supabase/types";

interface InspectorPanelProps {
  selectedItems: RoadmapItemRow[];
  onClose: () => void;
  onUpdate: (updates: TablesUpdate<"roadmap_items"> & { id: string }) => void;
  onDelete: (id: string) => void;
  onBatchUpdate?: (ids: string[], updates: TablesUpdate<"roadmap_items">) => void;
}

export function InspectorPanel({ selectedItems, onClose, onUpdate, onDelete, onBatchUpdate }: InspectorPanelProps) {
  if (selectedItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <p className="font-display text-sm text-muted-foreground text-balance">
          Select an item on the canvas to inspect and edit its properties.
        </p>
      </div>
    );
  }

  // Multi-select mode
  if (selectedItems.length > 1) {
    return (
      <div className="h-full flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-display text-sm font-semibold text-foreground">
            {selectedItems.length} items selected
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-1.5">
            <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Batch Status</Label>
            <Select
              onValueChange={(v) => {
                onBatchUpdate?.(selectedItems.map((i) => i.id), { status: v as any });
                if (v === "completed") celebrateStatusCompleted();
              }}
            >
              <SelectTrigger className="font-body text-sm">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#9CA3AF] shrink-0" />Planned</span>
                </SelectItem>
                <SelectItem value="in_progress">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#D97706] shrink-0" />In Progress</span>
                </SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#16A34A] shrink-0" />Completed</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Batch Priority</Label>
            <Select
              onValueChange={(v) => {
                onBatchUpdate?.(selectedItems.map((i) => i.id), { priority: v as any });
              }}
            >
              <SelectTrigger className="font-body text-sm">
                <SelectValue placeholder="Change priority..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // Single item
  const selectedItem = selectedItems[0];

  const handleChange = (field: string, value: string) => {
    onUpdate({ id: selectedItem.id, [field]: value });
    if (field === "status" && value === "completed") {
      celebrateStatusCompleted();
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-display text-sm font-semibold text-foreground">Inspector</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-1.5">
          <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
          <Input
            defaultValue={selectedItem.title}
            onBlur={(e) => handleChange("title", e.target.value)}
            key={`title-${selectedItem.id}`}
            className="font-body text-sm border-border bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
          <Textarea
            defaultValue={selectedItem.description ?? ""}
            onBlur={(e) => handleChange("description", e.target.value)}
            key={`desc-${selectedItem.id}`}
            className="font-body text-sm border-border bg-background min-h-[80px] resize-none"
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
            <Select
              defaultValue={selectedItem.status}
              onValueChange={(v) => handleChange("status", v)}
              key={`status-${selectedItem.id}`}
            >
              <SelectTrigger className="font-body text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#9CA3AF] shrink-0" />Planned</span>
                </SelectItem>
                <SelectItem value="in_progress">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#D97706] shrink-0" />In Progress</span>
                </SelectItem>
                <SelectItem value="completed">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#16A34A] shrink-0" />Completed</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Priority</Label>
            <Select
              defaultValue={selectedItem.priority}
              onValueChange={(v) => handleChange("priority", v)}
              key={`priority-${selectedItem.id}`}
            >
              <SelectTrigger className="font-body text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Owner</Label>
          <Input
            defaultValue={selectedItem.owner ?? ""}
            onBlur={(e) => handleChange("owner", e.target.value)}
            key={`owner-${selectedItem.id}`}
            className="font-body text-sm border-border bg-background"
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">Start Date</Label>
            <Input
              type="date"
              defaultValue={selectedItem.start_date ?? ""}
              onBlur={(e) => handleChange("start_date", e.target.value)}
              key={`start-${selectedItem.id}`}
              className="font-body text-sm border-border bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-display text-xs text-muted-foreground uppercase tracking-wider">End Date</Label>
            <Input
              type="date"
              defaultValue={selectedItem.end_date ?? ""}
              onBlur={(e) => handleChange("end_date", e.target.value)}
              key={`end-${selectedItem.id}`}
              className="font-body text-sm border-border bg-background"
            />
          </div>
        </div>

        <Separator />

        <CommentsSection itemId={selectedItem.id} />

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="w-full font-display text-xs gap-1.5 text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive"
          onClick={() => onDelete(selectedItem.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Item
        </Button>
      </div>
    </div>
  );
}
