import { useState, useCallback, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { InspectorPanel } from "@/components/layout/InspectorPanel";
import { RoadmapCanvas } from "@/components/canvas/RoadmapCanvas";
import { RoadmapListView } from "@/components/list/RoadmapListView";
import { EmptyCanvasState } from "@/components/canvas/EmptyCanvasState";
import { QuickAddSheet } from "@/components/canvas/QuickAddSheet";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { MobileInspectorDrawer } from "@/components/layout/MobileInspectorDrawer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { celebrateItemCreated, celebrateDuplicated, celebrateDragSaved } from "@/lib/celebrations";
import {
  useWorkspaceSetup,
  useRoadmaps,
  useRoadmapItems,
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  useDeleteRoadmapItem,
  useCreateRoadmap,
  useDeleteRoadmap,
} from "@/hooks/useRoadmap";

const TEMPLATE_ITEMS = [
  { title: "Discovery & Research", status: "completed" as const, priority: "high" as const, sort_order: 0 },
  { title: "Define MVP Scope", status: "in_progress" as const, priority: "high" as const, sort_order: 1 },
  { title: "Design & Prototyping", status: "planned" as const, priority: "medium" as const, sort_order: 2 },
  { title: "Development Sprint 1", status: "planned" as const, priority: "medium" as const, sort_order: 3 },
];

export default function Index() {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showInspector, setShowInspector] = useState(true);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"canvas" | "list">(window.innerWidth < 768 ? "list" : "canvas");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [canvasStagePos, setCanvasStagePos] = useState({ x: 0, y: 0 });

  const isMobile = useIsMobile();

  const { data: setup, isLoading: setupLoading } = useWorkspaceSetup();
  const workspaceId = setup?.workspaceId;
  const defaultRoadmapId = setup?.roadmapId;

  const currentRoadmapId = activeRoadmapId ?? defaultRoadmapId;

  const { data: roadmaps = [] } = useRoadmaps(workspaceId);
  const { data: items = [] } = useRoadmapItems(currentRoadmapId);

  const createItem = useCreateRoadmapItem(currentRoadmapId);
  const updateItem = useUpdateRoadmapItem(currentRoadmapId);
  const deleteItem = useDeleteRoadmapItem(currentRoadmapId);
  const createRoadmap = useCreateRoadmap(workspaceId);
  const deleteRoadmap = useDeleteRoadmap(workspaceId);

  if (!activeRoadmapId && defaultRoadmapId) {
    setActiveRoadmapId(defaultRoadmapId);
  }

  const completedCount = useMemo(() => items.filter((i) => i.status === "completed").length, [items]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedItemIds.has(i.id)),
    [items, selectedItemIds]
  );

  const handleSelectItem = useCallback(
    (id: string | null, additive?: boolean) => {
      if (!id) {
        setSelectedItemIds(new Set());
        return;
      }
      setSelectedItemIds((prev) => {
        if (additive) {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }
        return new Set([id]);
      });
      if (isMobile) {
        setMobileInspectorOpen(true);
      } else if (!showInspector) {
        setShowInspector(true);
      }
    },
    [showInspector, isMobile]
  );

  const handleItemDragEnd = useCallback(
    (id: string, x: number, y: number, startDate?: string, endDate?: string) => {
      const updates: any = { id, position_x: x, position_y: y };
      if (startDate) updates.start_date = startDate;
      if (endDate) updates.end_date = endDate;
      updateItem.mutate(updates, {
        onSuccess: () => celebrateDragSaved(),
      });
    },
    [updateItem]
  );

  const handleQuickAdd = useCallback(
    (data: { title: string; status: "planned" | "in_progress" | "completed"; priority: "low" | "medium" | "high"; start_date?: string; end_date?: string }) => {
      if (!currentRoadmapId) return;
      const row = Math.floor(items.length / 3);
      const col = items.length % 3;
      createItem.mutate(
        {
          title: data.title,
          status: data.status,
          priority: data.priority,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          position_x: 50 + col * 220,
          position_y: 70 + row * 90,
          width: 200,
          height: 56,
          sort_order: items.length,
        },
        {
          onSuccess: (newItem) => {
            setSelectedItemIds(new Set([newItem.id]));
            if (!isMobile && !showInspector) setShowInspector(true);
            celebrateItemCreated(items.length + 1);
          },
        }
      );
    },
    [currentRoadmapId, createItem, items.length, showInspector, isMobile]
  );

  const handleAddItem = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

  const handleAddTemplate = useCallback(() => {
    if (!currentRoadmapId) return;
    TEMPLATE_ITEMS.forEach((tmpl, i) => {
      createItem.mutate({
        ...tmpl,
        position_x: 50 + (i % 2) * 240,
        position_y: 70 + Math.floor(i / 2) * 90,
        width: 220,
        height: 56,
        sort_order: items.length + i,
      });
    });
    toast.success("🎨 Template loaded — customize it to make it yours!");
  }, [currentRoadmapId, createItem, items.length]);

  const handleInlineEdit = useCallback(
    (id: string, title: string) => {
      updateItem.mutate({ id, title });
    },
    [updateItem]
  );

  const handleCreateRoadmap = useCallback(() => {
    createRoadmap.mutate("Untitled Roadmap", {
      onSuccess: (data) => {
        setActiveRoadmapId(data.id);
        toast.success("Roadmap created");
      },
    });
  }, [createRoadmap]);

  const handleDeleteRoadmap = useCallback(
    (id: string) => {
      deleteRoadmap.mutate(id, {
        onSuccess: () => {
          if (activeRoadmapId === id) {
            const remaining = roadmaps.filter((r) => r.id !== id);
            setActiveRoadmapId(remaining.length > 0 ? remaining[0].id : null);
          }
          toast.success("Roadmap deleted");
        },
      });
    },
    [deleteRoadmap, activeRoadmapId, roadmaps]
  );

  const handleBatchUpdate = useCallback(
    (ids: string[], updates: any) => {
      ids.forEach((id) => updateItem.mutate({ id, ...updates }));
    },
    [updateItem]
  );

  const handleDeleteItems = useCallback(
    (ids: string[]) => {
      ids.forEach((id) =>
        deleteItem.mutate(id, {
          onSuccess: () => {
            setSelectedItemIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          },
        })
      );
      toast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`);
    },
    [deleteItem]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || !currentRoadmapId) return;
      createItem.mutate(
        {
          title: `${item.title} (copy)`,
          description: item.description,
          position_x: item.position_x + 20,
          position_y: item.position_y + 20,
          width: item.width,
          height: item.height,
          status: item.status,
          priority: item.priority,
          owner: item.owner,
          start_date: item.start_date,
          end_date: item.end_date,
          sort_order: items.length,
        },
        {
          onSuccess: (data) => {
            setSelectedItemIds(new Set([data.id]));
            celebrateDuplicated();
          },
        }
      );
    },
    [items, currentRoadmapId, createItem]
  );

  useKeyboardShortcuts({
    selectedItemIds,
    allItemIds: items.map((i) => i.id),
    onDelete: handleDeleteItems,
    onDeselect: () => setSelectedItemIds(new Set()),
    onSelectAll: () => setSelectedItemIds(new Set(items.map((i) => i.id))),
    onDuplicate: handleDuplicate,
  });

  const activeRoadmap = roadmaps.find((r) => r.id === currentRoadmapId);

  if (setupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-display text-sm text-muted-foreground animate-fade-in">Loading workspace...</p>
      </div>
    );
  }

  const canvasItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    status: item.status as "planned" | "in_progress" | "completed",
    priority: item.priority as "low" | "medium" | "high",
    owner: item.owner ?? "",
    startDate: item.start_date ?? "",
    endDate: item.end_date ?? "",
    x: item.position_x,
    y: item.position_y,
    width: item.width,
    height: item.height,
  }));

  const showEmptyState = items.length === 0 && viewMode === "canvas";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          roadmaps={roadmaps}
          activeRoadmapId={currentRoadmapId ?? null}
          onSelectRoadmap={setActiveRoadmapId}
          onCreateRoadmap={handleCreateRoadmap}
          onDeleteRoadmap={handleDeleteRoadmap}
          workspaceId={workspaceId ?? null}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center justify-between border-b bg-card px-3 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-7 w-7" />
              <span className="font-display text-sm font-medium text-foreground truncate">
                {activeRoadmap?.title ?? "Roadmap"}
              </span>
              {items.length > 0 && !isMobile && (
                <ProgressBar total={items.length} completed={completedCount} />
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isMobile && (
                <>
                  <Button
                    variant={viewMode === "canvas" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("canvas")}
                    className="font-display text-xs gap-1.5 h-7"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="font-display text-xs gap-1.5 h-7"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {!isMobile && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddItem}
                  className="font-display text-xs gap-1.5 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              )}
              {isMobile && (
                <div className="flex items-center gap-1">
                  <Button
                    variant={viewMode === "canvas" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("canvas")}
                    className="h-7 w-7"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="h-7 w-7"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </header>

          <div className="flex-1 min-h-0 relative">
            {showEmptyState ? (
              <EmptyCanvasState onAddItem={handleAddItem} onAddTemplate={handleAddTemplate} />
            ) : (
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={showInspector && !isMobile ? 75 : 100} minSize={50}>
                  {viewMode === "canvas" ? (
                    <RoadmapCanvas
                      items={canvasItems}
                      selectedItemIds={selectedItemIds}
                      onSelectItem={handleSelectItem}
                      onItemDragEnd={handleItemDragEnd}
                      onInlineEdit={handleInlineEdit}
                      stagePos={canvasStagePos}
                      onStagePosChange={setCanvasStagePos}
                    />
                  ) : (
                    <RoadmapListView
                      items={canvasItems}
                      selectedItemIds={selectedItemIds}
                      onSelectItem={handleSelectItem}
                    />
                  )}
                </ResizablePanel>

                {showInspector && !isMobile && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={25} minSize={18} maxSize={40}>
                      <div className="h-full bg-card">
                        <InspectorPanel
                          selectedItems={selectedItems}
                          onClose={() => {
                            setSelectedItemIds(new Set());
                            setShowInspector(false);
                          }}
                          onUpdate={(updates) => updateItem.mutate(updates)}
                          onDelete={(id) => {
                            deleteItem.mutate(id, {
                              onSuccess: () => {
                                setSelectedItemIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(id);
                                  return next;
                                });
                                toast.success("Item deleted");
                              },
                            });
                          }}
                          onBatchUpdate={handleBatchUpdate}
                        />
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            )}

            {/* Mobile FAB */}
            {isMobile && (
              <Button
                size="lg"
                className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-40 animate-scale-in"
                onClick={handleAddItem}
              >
                <Plus className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Sheet */}
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSubmit={handleQuickAdd}
      />

      {/* Mobile Inspector Drawer */}
      {isMobile && (
        <MobileInspectorDrawer
          open={mobileInspectorOpen}
          onOpenChange={setMobileInspectorOpen}
          selectedItems={selectedItems}
          onClose={() => setSelectedItemIds(new Set())}
          onUpdate={(updates) => updateItem.mutate(updates)}
          onDelete={(id) => {
            deleteItem.mutate(id, {
              onSuccess: () => {
                setSelectedItemIds((prev) => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                });
                toast.success("Item deleted");
              },
            });
          }}
          onBatchUpdate={handleBatchUpdate}
        />
      )}
    </SidebarProvider>
  );
}
