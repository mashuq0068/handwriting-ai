import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer, Rect, Group, Text, Line } from "react-konva";
import Konva from "konva";
import { parseQuarters, dateToCanvasX, canvasXToDate, MIN_DATE_WIDTH } from "@/lib/timeline";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "planned" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  owner: string;
  startDate: string;
  endDate: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoadmapCanvasProps {
  items: RoadmapItem[];
  selectedItemIds: Set<string>;
  onSelectItem: (id: string | null, additive?: boolean) => void;
  onItemDragEnd: (id: string, x: number, y: number, startDate?: string, endDate?: string) => void;
  onInlineEdit?: (id: string, title: string) => void;
  stagePos?: { x: number; y: number };
  onStagePosChange?: (pos: { x: number; y: number }) => void;
}

const QUARTER_WIDTH = 300;
const HEADER_HEIGHT = 36;
const PADDING = 16;
const ITEM_HEIGHT = 64;
const ITEM_RADIUS = 10;
const ITEM_TOP_OFFSET = 12;

const COLORS = {
  bg: "#F9F9F6",
  headerBg: "#FFFFFF",
  grid: "#E8E8E0",
  inkBlack: "#171717",
  white: "#FFFFFF",
  planned: "#9CA3AF",
  progress: "#D97706",
  complete: "#16A34A",
  selection: "#BBBBAA",
  headerText: "#8A8A78",
  dragShadow: "rgba(0,0,0,0.12)",
};

const QUARTER_LABELS = [
  "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025",
  "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026",
  "Q1 2027", "Q2 2027", "Q3 2027", "Q4 2027",
  "Q1 2028", "Q2 2028",
];

function getStatusColor(status: RoadmapItem["status"]) {
  switch (status) {
    case "planned": return COLORS.planned;
    case "in_progress": return COLORS.progress;
    case "completed": return COLORS.complete;
  }
}

export function RoadmapCanvas({ items, selectedItemIds, onSelectItem, onItemDragEnd, onInlineEdit, stagePos: externalStagePos, onStagePosChange }: RoadmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [internalStagePos, setInternalStagePos] = useState({ x: 0, y: 0 });
  const stagePos = externalStagePos ?? internalStagePos;
  const setStagePosWrapped = useCallback((pos: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    if (typeof pos === "function") {
      const newPos = pos(stagePos);
      if (onStagePosChange) onStagePosChange(newPos);
      else setInternalStagePos(newPos);
    } else {
      if (onStagePosChange) onStagePosChange(pos);
      else setInternalStagePos(pos);
    }
  }, [stagePos, onStagePosChange]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; x: number; y: number; width: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  const quarters = useMemo(() => parseQuarters(QUARTER_LABELS), []);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const canvasWidth = QUARTER_LABELS.length * QUARTER_WIDTH;
  const canvasHeight = Math.max(600, dimensions.height);
  const ROW_HEIGHT = 80;

  const positionedItems = useMemo(() => {
    return items.map((item) => {
      let x = item.x;
      let width = item.width;

      if (item.startDate) {
        const startX = dateToCanvasX(item.startDate, quarters, QUARTER_WIDTH);
        if (startX !== null) {
          x = startX;
          if (item.endDate) {
            const endX = dateToCanvasX(item.endDate, quarters, QUARTER_WIDTH);
            if (endX !== null) {
              width = Math.max(endX - startX, MIN_DATE_WIDTH);
            }
          }
        }
      }

      return { ...item, x, width };
    });
  }, [items, quarters]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    setStagePosWrapped((prev) => ({
      x: Math.min(0, Math.max(prev.x - e.evt.deltaX, -(canvasWidth - dimensions.width))),
      y: Math.min(0, Math.max(prev.y - e.evt.deltaY, -(canvasHeight - dimensions.height))),
    }));
  }, [canvasWidth, canvasHeight, dimensions, setStagePosWrapped]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectItem(null);
      setEditingItem(null);
    }
  }, [onSelectItem]);

  const handleStageTap = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelectItem(null);
      setEditingItem(null);
    }
  }, [onSelectItem]);

  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>, itemId: string) => {
    setDraggingId(itemId);
    const node = e.target;
    node.setAttrs({ shadowBlur: 16, shadowColor: COLORS.dragShadow, shadowOffsetY: 6 });
    node.moveToTop();
    node.getLayer()?.batchDraw();
  }, []);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, item: RoadmapItem & { width: number }) => {
    setDraggingId(null);
    const node = e.target;
    node.setAttrs({ shadowBlur: 10, shadowColor: "rgba(0,0,0,0.06)", shadowOffsetY: 2 });
    node.getLayer()?.batchDraw();

    const newX = node.x();
    const newY = node.y() - HEADER_HEIGHT - ITEM_TOP_OFFSET;
    let startDate: string | undefined;
    let endDate: string | undefined;
    if (item.startDate) {
      startDate = canvasXToDate(newX, quarters, QUARTER_WIDTH);
      if (item.endDate) {
        endDate = canvasXToDate(newX + item.width, quarters, QUARTER_WIDTH);
      }
    }
    onItemDragEnd(item.id, newX, newY, startDate, endDate);
  }, [onItemDragEnd, quarters]);

  const handleDblClick = useCallback((item: RoadmapItem & { x: number; width: number }) => {
    if (!onInlineEdit) return;
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container().getBoundingClientRect();
    setEditingItem({
      id: item.id,
      x: item.x + stagePos.x + container.left + PADDING,
      y: item.y + HEADER_HEIGHT + ITEM_TOP_OFFSET + stagePos.y + container.top + 8,
      width: item.width - PADDING * 2,
    });
    setEditValue(item.title);
  }, [onInlineEdit, stagePos]);

  const commitInlineEdit = useCallback(() => {
    if (editingItem && onInlineEdit && editValue.trim()) {
      onInlineEdit(editingItem.id, editValue.trim());
    }
    setEditingItem(null);
  }, [editingItem, editValue, onInlineEdit]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-canvas-bg relative" style={{ cursor: draggingId ? "grabbing" : "default" }}>
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onDragEnd={(e) => {
          const stage = e.target as Konva.Stage;
          const newX = Math.min(0, Math.max(stage.x(), -(canvasWidth - dimensions.width)));
          const newY = Math.min(0, Math.max(stage.y(), -(canvasHeight - dimensions.height)));
          stage.position({ x: newX, y: newY });
          setStagePosWrapped({ x: newX, y: newY });
        }}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageTap}
      >
        <Layer>
          <Rect x={-stagePos.x} y={-stagePos.y} width={dimensions.width} height={dimensions.height} fill={COLORS.bg} />

          {/* Vertical quarter dividers only - no horizontal grid */}
          {QUARTER_LABELS.map((q, i) => (
            <Group key={q}>
              <Line points={[i * QUARTER_WIDTH, HEADER_HEIGHT, i * QUARTER_WIDTH, canvasHeight]} stroke={COLORS.grid} strokeWidth={1} dash={[]} />
            </Group>
          ))}

          <Line points={[0, HEADER_HEIGHT, canvasWidth, HEADER_HEIGHT]} stroke={COLORS.grid} strokeWidth={1} />
        </Layer>

        <Layer>
          {positionedItems.map((item) => {
            const isSelected = selectedItemIds.has(item.id);
            const isDragging = draggingId === item.id;
            const otherDragging = draggingId !== null && !isDragging;

            return (
              <Group
                key={item.id}
                x={item.x}
                y={item.y + HEADER_HEIGHT + ITEM_TOP_OFFSET}
                draggable
                opacity={otherDragging ? 0.5 : 1}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={(e) => handleDragEnd(e, item)}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onSelectItem(item.id, e.evt.shiftKey);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onSelectItem(item.id);
                }}
                onDblClick={() => handleDblClick(item)}
                onDblTap={() => handleDblClick(item)}
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = "grab";
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage && !draggingId) stage.container().style.cursor = "default";
                }}
              >
                {isSelected && (
                  <Rect x={-3} y={-3} width={item.width + 6} height={ITEM_HEIGHT + 6} cornerRadius={ITEM_RADIUS + 2} stroke={COLORS.selection} strokeWidth={2} />
                )}

                <Rect width={item.width} height={ITEM_HEIGHT} cornerRadius={ITEM_RADIUS} fill={COLORS.white} shadowColor="rgba(0,0,0,0.06)" shadowBlur={10} shadowOffsetY={2} />

                {/* Left status accent line */}
                <Rect x={0} y={0} width={3} height={ITEM_HEIGHT} cornerRadius={[ITEM_RADIUS, 0, 0, ITEM_RADIUS]} fill={getStatusColor(item.status)} />

                <Text x={PADDING} y={20} text={item.title} fontSize={13} fontFamily="Figtree" fontStyle="500" fill={COLORS.inkBlack} width={item.width - PADDING * 2} ellipsis wrap="none" />

                {/* Status dot + label */}
                <Rect x={PADDING} y={40} width={6} height={6} cornerRadius={3} fill={getStatusColor(item.status)} />
                <Text x={PADDING + 10} y={38} text={item.status === "in_progress" ? "In progress" : item.status === "completed" ? "Completed" : "Planned"} fontSize={10} fontFamily="Figtree" fill={COLORS.headerText} />
              </Group>
            );
          })}
        </Layer>

        <Layer listening={false}>
          <Rect x={-stagePos.x} y={-stagePos.y} width={dimensions.width} height={HEADER_HEIGHT} fill={COLORS.headerBg} />
          {QUARTER_LABELS.map((q, i) => (
            <Text key={`hdr-${q}`} x={i * QUARTER_WIDTH + 16} y={-stagePos.y + (HEADER_HEIGHT - 11) / 2} text={q} fontSize={11} fontFamily="Figtree" fontStyle="600" fill={COLORS.headerText} letterSpacing={1.5} />
          ))}
          <Line points={[-stagePos.x, -stagePos.y + HEADER_HEIGHT, -stagePos.x + dimensions.width, -stagePos.y + HEADER_HEIGHT]} stroke={COLORS.grid} strokeWidth={1} />
        </Layer>
      </Stage>

      {editingItem && (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitInlineEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitInlineEdit();
            if (e.key === "Escape") setEditingItem(null);
          }}
          className="absolute z-50 border border-border rounded px-1 py-0.5 font-body text-sm bg-background text-foreground outline-none shadow-sm"
          style={{
            left: editingItem.x,
            top: editingItem.y,
            width: editingItem.width,
          }}
        />
      )}
    </div>
  );
}
