import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { InspectorPanel } from "@/components/layout/InspectorPanel";
import type { RoadmapItemRow } from "@/hooks/useRoadmap";
import type { TablesUpdate } from "@/integrations/supabase/types";

interface MobileInspectorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: RoadmapItemRow[];
  onClose: () => void;
  onUpdate: (updates: TablesUpdate<"roadmap_items"> & { id: string }) => void;
  onDelete: (id: string) => void;
  onBatchUpdate?: (ids: string[], updates: TablesUpdate<"roadmap_items">) => void;
}

export function MobileInspectorDrawer({
  open,
  onOpenChange,
  selectedItems,
  onClose,
  onUpdate,
  onDelete,
  onBatchUpdate,
}: MobileInspectorDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Item Details</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto pb-6">
          <InspectorPanel
            selectedItems={selectedItems}
            onClose={() => {
              onClose();
              onOpenChange(false);
            }}
            onUpdate={onUpdate}
            onDelete={(id) => {
              onDelete(id);
              onOpenChange(false);
            }}
            onBatchUpdate={onBatchUpdate}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
