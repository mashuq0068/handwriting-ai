import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { CELL, type GlyphInput } from "@/lib/fontBuilder";
import type { ScriptCell, ScriptConfig } from "@/lib/scripts";

export interface DrawGridHandle {
  collect: () => GlyphInput[];
}

const FORM_LABEL: Record<string, string> = { isol: "isolated", init: "initial", medi: "medial", fina: "final" };

function DrawCell({
  cell,
  guide,
  rtl,
  register,
  onInk,
}: {
  cell: ScriptCell;
  guide: ScriptConfig["guide"];
  rtl?: boolean;
  register: (id: string, canvas: HTMLCanvasElement | null) => void;
  onInk: (id: string, inked: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    register(cell.id, canvas);
    const ctx = canvas.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#16181d";
    ctx.lineWidth = 9;
    return () => register(cell.id, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell.id]);

  const pos = (e: React.PointerEvent) => {
    const canvas = ref.current!;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    if (drawing.current) onInk(cell.id, true);
    drawing.current = false;
    last.current = null;
  };
  const clear = () => {
    ref.current!.getContext("2d")!.clearRect(0, 0, CELL.w, CELL.h);
    onInk(cell.id, false);
  };

  // baseline (0.78) for cursive/arabic, headline (~0.2 from top) for indic, none for box
  const baselineTop = guide === "headline" ? "20%" : `${CELL.baselineRatio * 100}%`;

  return (
    <div className="relative rounded-lg border border-border bg-card overflow-hidden group">
      <div className="absolute inset-0 pointer-events-none select-none" dir={rtl ? "rtl" : "ltr"}>
        <span className="absolute inset-0 grid place-items-center text-5xl text-muted-foreground/15">{cell.display}</span>
        {guide !== "box" && (
          <span
            className={`absolute left-0 right-0 ${guide === "headline" ? "border-t-2 border-primary/30" : "border-b border-dashed border-primary/25"}`}
            style={{ top: baselineTop }}
          />
        )}
        <span className="absolute left-1 top-1 text-[10px] font-mono text-muted-foreground">{cell.display}</span>
        {cell.form && (
          <span className="absolute right-1 top-1 text-[9px] px-1 rounded bg-secondary text-muted-foreground">{FORM_LABEL[cell.form]}</span>
        )}
      </div>
      <canvas
        ref={ref}
        width={CELL.w}
        height={CELL.h}
        className="relative w-full touch-none cursor-crosshair"
        style={{ aspectRatio: `${CELL.w} / ${CELL.h}` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <button
        onClick={clear}
        className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition rounded bg-background/80 p-1 text-muted-foreground hover:text-foreground"
        title="Clear"
      >
        <Eraser className="h-3 w-3" />
      </button>
    </div>
  );
}

export const DrawGrid = forwardRef<DrawGridHandle, { script: ScriptConfig; onCoverageChange?: (n: number) => void }>(
  function DrawGrid({ script, onCoverageChange }, ref) {
    const cells = useRef<Map<string, HTMLCanvasElement>>(new Map());
    const [inked, setInked] = useState<Set<string>>(new Set());

    const register = useCallback((id: string, canvas: HTMLCanvasElement | null) => {
      if (canvas) cells.current.set(id, canvas);
      else cells.current.delete(id);
    }, []);
    const onInk = useCallback((id: string, has: boolean) => {
      setInked((prev) => {
        const next = new Set(prev);
        if (has) next.add(id);
        else next.delete(id);
        onCoverageChange?.(next.size);
        return next;
      });
    }, [onCoverageChange]);

    useImperativeHandle(ref, () => ({
      collect: () => {
        const out: GlyphInput[] = [];
        for (const cell of script.cells) {
          if (inked.has(cell.id)) {
            const canvas = cells.current.get(cell.id);
            if (canvas) out.push({ cell, canvas });
          }
        }
        // include optional ligature cells too (ids prefixed lig:)
        for (const [id, canvas] of cells.current) {
          if (id.startsWith("lig:") && inked.has(id)) {
            const display = id.slice(4);
            out.push({ cell: { id, chars: display, display, kind: "ligature" }, canvas });
          }
        }
        return out;
      },
    }), [inked, script.cells]);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {script.cells.map((cell) => (
            <DrawCell key={cell.id} cell={cell} guide={script.guide} rtl={script.rtl} register={register} onInk={onInk} />
          ))}
        </div>
        {script.ligatures && script.ligatures.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Connectors (optional — write the pair joined, like cursive)</p>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {script.ligatures.map((l) => {
                const cell: ScriptCell = { id: `lig:${l.display}`, chars: `${l.from[0]}${l.from[1]}`, display: l.display, kind: "ligature" };
                return <DrawCell key={cell.id} cell={cell} guide="baseline" register={register} onInk={onInk} />;
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);
