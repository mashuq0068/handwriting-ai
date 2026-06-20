import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Stage,
  Layer,
  Line as KLine,
  Rect as KRect,
  Ellipse as KEllipse,
  Arrow as KArrow,
  Text as KText,
} from "react-konva";
import type Konva from "konva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PenLine,
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Upload,
  Loader2,
  Trash2,
  Save,
  MousePointer2,
  Pen,
  Highlighter,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Type as TypeIcon,
  Eraser,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Table,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { hashString, mulberry32 } from "@/lib/handwriting";
import { fontsApi, documentsApi, type FontRecord } from "@/lib/api";
import { registerFont } from "@/lib/fontBuilder";
import { extractText, ACCEPT_IMPORT } from "@/lib/importDoc";

/* ------------------------------------------------------------------ config */
type Lang = {
  code: string;
  label: string;
  rtl?: boolean;
  sample: string;
  fonts: { name: string; family: string }[];
};

const LANGUAGES: Lang[] = [
  {
    code: "latin",
    label: "English / Latin",
    sample: "The quick brown fox jumps over the lazy dog.",
    fonts: [
      { name: "Draft", family: "'Coming Soon', cursive" },
      { name: "Playful", family: "'Indie Flower', cursive" },
      { name: "Vintage", family: "'Homemade Apple', cursive" },

      { name: "Casual", family: "'Caveat', cursive" },
      { name: "Sketchy", family: "'Shadows Into Light', cursive" },
      { name: "Elegant", family: "'Dancing Script', cursive" },
      { name: "Architect", family: "'Architects Daughter', cursive" },
      { name: "Print", family: "'Patrick Hand', cursive" },
      { name: "Schoolkid", family: "'Gloria Hallelujah', cursive" },
      { name: "Marker", family: "'Permanent Marker', cursive" },
      { name: "Signature", family: "'Satisfy', cursive" },
      { name: "Round", family: "'Gochi Hand', cursive" },
      { name: "Scrawl", family: "'Reenie Beanie', cursive" },
      { name: "Gentle", family: "'Covered By Your Grace', cursive" },
      { name: "Quick", family: "'Just Another Hand', cursive" },
      { name: "Notes", family: "'Nothing You Could Do', cursive" },
      { name: "Chalk", family: "'Rock Salt', cursive" },
      { name: "Classroom", family: "'Schoolbell', cursive" },
      { name: "Neat", family: "'Kalam', cursive" },
    ],
  },
  {
    code: "hindi",
    label: "Hindi (हिन्दी)",
    sample: "यह मेरी अपनी लिखावट का एक नमूना है।",
    fonts: [
      { name: "Kalam", family: "'Kalam', cursive" },
      { name: "Tillana", family: "'Tillana', cursive" },
      { name: "Baloo", family: "'Baloo 2', cursive" },
      { name: "Yatra", family: "'Yatra One', cursive" },
      { name: "Modak", family: "'Modak', cursive" },
    ],
  },
  {
    code: "bengali",
    label: "Bengali (বাংলা)",
    sample: "এটি আমার নিজের হাতের লেখার একটি নমুনা।",
    fonts: [
      { name: "হাতের লেখা", family: "'BenSen Handwriting', cursive" },
      { name: "চারু", family: "'Charu Chandan', cursive" },
      { name: "Atma", family: "'Atma', cursive" },
      { name: "Galada", family: "'Galada', cursive" },
      { name: "Baloo Da", family: "'Baloo Da 2', cursive" },
    ],
  },
  {
    code: "arabic",
    label: "Arabic (العربية)",
    rtl: true,
    sample: "هذه عينة من خط اليد.",
    fonts: [
      { name: "رقعة", family: "'Aref Ruqaa', serif" },
      { name: "نستعليق", family: "'Gulzar', serif" },
      { name: "لطيف", family: "'Lateef', cursive" },
      { name: "هرمتان", family: "'Harmattan', sans-serif" },
      { name: "مرحى", family: "'Marhey', cursive" },
    ],
  },
  {
    code: "chinese",
    label: "Chinese (中文)",
    sample: "这是手写体的一个示例。",
    fonts: [
      { name: "行书", family: "'Zhi Mang Xing', cursive" },
      { name: "草书", family: "'Liu Jian Mao Cao', cursive" },
      { name: "毛笔", family: "'Ma Shan Zheng', cursive" },
      { name: "龙仓", family: "'Long Cang', cursive" },
      { name: "快乐", family: "'ZCOOL KuaiLe', cursive" },
    ],
  },
  {
    code: "japanese",
    label: "Japanese (日本語)",
    sample: "これは手書きの見本です。",
    fonts: [
      { name: "手書き", family: "'Klee One', cursive" },
      { name: "よもぎ", family: "'Yomogi', cursive" },
      { name: "筆", family: "'Yuji Mai', serif" },
      { name: "紅道", family: "'Zen Kurenaido', sans-serif" },
      { name: "丸文字", family: "'Hachi Maru Pop', cursive" },
    ],
  },
  {
    code: "korean",
    label: "Korean (한국어)",
    sample: "이것은 손글씨 예시입니다.",
    fonts: [
      { name: "펜", family: "'Nanum Pen Script', cursive" },
      { name: "붓", family: "'Nanum Brush Script', cursive" },
      { name: "개구", family: "'Gaegu', cursive" },
      { name: "멜로디", family: "'Hi Melody', cursive" },
      { name: "감자꽃", family: "'Gamja Flower', cursive" },
    ],
  },
  {
    code: "cyrillic",
    label: "Russian (Русский)",
    sample: "Это образец моего почерка.",
    fonts: [
      { name: "Marck", family: "'Marck Script', cursive" },
      { name: "Bad Script", family: "'Bad Script', cursive" },
      { name: "Neucha", family: "'Neucha', cursive" },
      { name: "Caveat", family: "'Caveat', cursive" },
      { name: "Pangolin", family: "'Pangolin', cursive" },
    ],
  },
];

const PAGE_SIZES = {
  a4: { label: "A4", w: 794, h: 1123, js: "a4" as const },
  letter: { label: "Letter", w: 816, h: 1056, js: "letter" as const },
  legal: { label: "Legal", w: 816, h: 1344, js: "legal" as const },
  a5: { label: "A5", w: 559, h: 794, js: "a5" as const },
};
type PageSizeId = keyof typeof PAGE_SIZES;

const PAPERS = [
  { id: "plain", label: "Plain", cls: "" },
  { id: "ruled", label: "Ruled", cls: "hw-lined" },
  { id: "grid", label: "Grid", cls: "hw-gridded" },
  { id: "dot", label: "Dots", cls: "hw-dotted" },
] as const;
type PaperId = (typeof PAPERS)[number]["id"];

const INK_PRESETS = [
  "#111111",
  "#1a2a5e",
  "#283593",
  "#4a2c12",
  "#7a1f1f",
  "#1f5f2a",
];
const ANNO_COLORS = [
  "#e23b3b",
  "#1c2b4a",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#111111",
];

/* ------------------------------------------------------------------ realism */
// Every effect is independently controllable. The "Realism" toggle just loads a
// good preset of all of them at once; turning it off zeroes everything.
type Realism = {
  intensity: number;
  drift: number;
  rotate: number;
  slant: number;
  scale: number;
  spacing: number;
  inkFlow: boolean;
  specks: boolean;
  slips: number;
  dots: number;
  grain: boolean;
};
const RZ_ZERO: Realism = {
  intensity: 1,
  drift: 0,
  rotate: 0,
  slant: 0,
  scale: 0,
  spacing: 0,
  inkFlow: false,
  specks: false,
  slips: 0,
  dots: 0,
  grain: false,
};
const RZ_PRESET: Realism = {
  intensity: 0.6,
  drift: 0.05,
  rotate: 1.8,
  slant: 1.2,
  scale: 0.05,
  spacing: 0.015,
  inkFlow: true,
  specks: true,
  slips: 0.4,
  dots: 0.4,
  grain: true,
};

/* -------------------------------------------------------------- annotations */
type Tool =
  | "text"
  | "select"
  | "pen"
  | "marker"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "note"
  | "eraser";
type Shape =
  | {
      id: string;
      type: "path";
      points: number[];
      color: string;
      width: number;
      opacity: number;
    }
  | {
      id: string;
      type: "rect" | "ellipse";
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      width: number;
    }
  | {
      id: string;
      type: "line" | "arrow";
      points: number[];
      color: string;
      width: number;
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
    };

const uid = () => Math.random().toString(36).slice(2, 9);
const PAGE_MARGIN = 64; // px top/bottom/side margin on every page

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Wrap each line in a block <div> so pagination can push whole blocks across pages.
const toBlocks = (value: string) =>
  value
    .split("\n")
    .map((l) => `<div>${escapeHtml(l) || "<br>"}</div>`)
    .join("");
// Strip the page-push margins we add so saved/preview HTML stays clean.
const stripPush = (html: string) =>
  html.replace(/\s*margin-top:\s*[-\d.]+px;?/gi, "");

/* ------------------------------------------------------------------- editor */
export default function Editor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get("id");

  // document content. `editorRef` = the page container (captured/measured);
  // `editableRef` = the contenteditable inside it. `text` mirrors plain text for
  // counts, `htmlContent` mirrors rich HTML (bold/tables) for save + realism.
  const editorRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // Fit-to-width zoom: the sheet (e.g. A4 = 794px) is scaled DOWN so it always
  // fits the editor area. Without this, on a narrow window the sheet overflows
  // to the right and gets clipped — making the right of every line look "cut off".
  const [fit, setFit] = useState(1);
  const [text, setText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [title, setTitle] = useState("Untitled document");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // realism — per-line wobble + slips + ink dots + grain, all live & editable.
  const [realismOn, setRealismOn] = useState(false);
  const [rz, setRz] = useState<Realism>(RZ_ZERO);
  const toggleRealism = (on: boolean) => {
    setRealismOn(on);
    setRz(on ? RZ_PRESET : RZ_ZERO);
  };

  const [langCode, setLangCode] = useState<string>("latin");
  const lang = LANGUAGES.find((l) => l.code === langCode)!;
  const [font, setFont] = useState(lang.fonts[0]);

  // handwriting style
  const [pageColor, setPageColor] = useState("#ffffff");
  const [ink, setInk] = useState("#111111");
  const [paper, setPaper] = useState<PaperId>("plain");
  const [pageSizeId, setPageSizeId] = useState<PageSizeId>("a4");
  const [fontSize, setFontSize] = useState([21]);
  const [slant, setSlant] = useState([0]);
  const [spacing, setSpacing] = useState([1.7]);
  const [paged, setPaged] = useState(true); // Google-Docs-style page view
  const [userFonts, setUserFonts] = useState<FontRecord[]>([]);
  const [relayoutTick, setRelayoutTick] = useState(0); // bumped when a web font finishes loading

  const size = PAGE_SIZES[pageSizeId];
  const paperCls = PAPERS.find((p) => p.id === paper)!.cls;

  // annotation studio
  const [tool, setTool] = useState<Tool>("text");
  const [color, setColor] = useState(ANNO_COLORS[0]);
  const [penWidth, setPenWidth] = useState([3]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const histRef = useRef<{ past: Shape[][]; future: Shape[][] }>({
    past: [],
    future: [],
  });

  const [docHeight, setDocHeight] = useState(size.h);
  const stageRef = useRef<Konva.Stage>(null);
  const drawing = useRef(false);

  const pages = Math.max(1, Math.ceil(docHeight / size.h));

  /* ---- history helpers ---- */
  const commit = useCallback(
    (next: Shape[]) => {
      histRef.current.past.push(shapes);
      histRef.current.future = [];
      setShapes(next);
    },
    [shapes],
  );
  const undo = () => {
    const h = histRef.current;
    if (!h.past.length) return;
    h.future.unshift(shapes);
    setShapes(h.past.pop()!);
  };
  const redo = () => {
    const h = histRef.current;
    if (!h.future.length) return;
    h.past.push(shapes);
    setShapes(h.future.shift()!);
  };

  /* ---- load user fonts ---- */
  useEffect(() => {
    let cancelled = false;
    fontsApi
      .list()
      .then(async (fonts) => {
        if (cancelled) return;
        setUserFonts(fonts);
        for (const f of fonts) {
          try {
            await registerFont(f.family, await fontsApi.fetchFontBuffer(f.id));
          } catch {
            /* skip */
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- set editor content (upload / load / language) ---- */
  const setEditorText = useCallback((value: string) => {
    setText(value);
    if (editableRef.current) {
      editableRef.current.innerHTML = toBlocks(value);
      setHtmlContent(editableRef.current.innerHTML);
    }
  }, []);
  // (Page starts empty so the placeholder shows immediately.)

  /* ---- load saved doc ---- */
  useEffect(() => {
    if (!docId) return;
    documentsApi
      .get(docId)
      .then((doc) => {
        setTitle(doc.title);
        if (editableRef.current) {
          editableRef.current.innerHTML = doc.content || "";
          setHtmlContent(doc.content || "");
          setText(editableRef.current.innerText);
        }
        setLangCode(doc.language || "latin");
        const s = (doc.settings || {}) as Record<string, unknown>;
        const fam = s.fontFamily as string | undefined;
        const ld =
          LANGUAGES.find((l) => l.code === (doc.language || "latin")) ??
          LANGUAGES[0];
        setFont(fam ? { name: doc.fontName, family: fam } : ld.fonts[0]);
        if (s.pageColor) setPageColor(s.pageColor as string);
        if (s.ink) setInk(s.ink as string);
        if (s.paper) setPaper(s.paper as PaperId);
        if (s.pageSizeId) setPageSizeId(s.pageSizeId as PageSizeId);
        if (typeof s.fontSize === "number") setFontSize([s.fontSize as number]);
        if (typeof s.slant === "number") setSlant([s.slant as number]);
        if (typeof s.spacing === "number") setSpacing([s.spacing as number]);
        if (Array.isArray(s.annotations)) setShapes(s.annotations as Shape[]);
      })
      .catch(() => toast.error("Couldn't load that document"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  /* ---- measure doc height for the Konva overlay + page count ---- */
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const measure = () => setDocHeight(Math.max(size.h, el.scrollHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.h, fontSize, spacing, text, paged, font.family]);

  /* ---- fit the sheet to the available width (so it never overflows / clips) ---- */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const avail = host.clientWidth - 64; // print-host p-8 padding (32px each side)
      setFit(Math.min(1, Math.max(0.35, avail / size.w)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [size.w]);

  /* ---- re-run layout once a web font actually finishes loading (font metrics
         change after the swap, so pagination/measurement must redo) ---- */
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready?.then(() => { if (!cancelled) setRelayoutTick((t) => t + 1); });
    return () => { cancelled = true; };
  }, [font.family, fontSize, spacing, size.h]);

  /* ---- keyboard undo/redo (native for text, custom for annotations) ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const inText =
        !!editableRef.current &&
        editableRef.current.contains(document.activeElement);
      if (inText) return; // let the browser handle text undo/redo
      e.preventDefault();
      if (k === "y" || (k === "z" && e.shiftKey)) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  /* ---- realism (per-line wobble — stays editable) + pagination (push whole
         blocks past page boundaries so EVERY page keeps a top + bottom margin) ---- */
  useEffect(() => {
    const ed = editableRef.current;
    if (!ed) return;
    const pageH = size.h,
      M = PAGE_MARGIN;
    const id = requestAnimationFrame(() => {
      const blocks = Array.from(ed.children) as HTMLElement[];
      blocks.forEach((b) => {
        b.style.marginTop = "";
        b.style.transform = "";
        b.style.opacity = "";
        b.style.letterSpacing = "";
        b.classList.remove("hw-speck");
      });
      // realism: per-line transforms driven by the individual rz values (so each
      // effect works on its own, with or without the master "Realism" preset).
      // Transforms don't change layout/offsetTop, so pagination stays accurate and
      // the text stays fully editable.
      {
        const rand = mulberry32(hashString(text) || 1);
        const I = rz.intensity;
        blocks.forEach((b) => {
          if (!b.textContent?.trim()) return;
          const r = (rand() * 2 - 1) * rz.rotate * I;
          let y = (rand() * 2 - 1) * rz.drift * I;
          // "writing slips" — an occasional line drops/lifts clearly more, like a
          // real hand slipping. Magnitude up to ~0.7em so it's visible.
          if (rz.slips && rand() < rz.slips * 0.5)
            y += (rand() < 0.5 ? 1 : -1) * (0.25 + rand() * 0.45) * rz.slips;
          const sk = (rand() * 2 - 1) * rz.slant * I;
          // Size + spacing wobble vary both ways (bigger/smaller, looser/tighter)
          // like a real hand. The sheet is fit-to-width so this never clips text.
          const sc = 1 + (rand() * 2 - 1) * rz.scale * I;
          const ls = (rand() * 2 - 1) * rz.spacing * I;
          b.style.transformOrigin = "left center";
          if (r || y || sk || sc !== 1)
            b.style.transform = `translateY(${y.toFixed(3)}em) rotate(${r.toFixed(2)}deg) skewX(${sk.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
          if (ls) b.style.letterSpacing = `${ls.toFixed(3)}em`;
          if (rz.inkFlow) b.style.opacity = (0.84 + rand() * 0.16).toFixed(2);
          if (rz.specks && rand() > 0.82) b.classList.add("hw-speck");
        });
      }
      // pagination via offsetTop (layout coord, unaffected by realism transforms)
      if (paged) {
        for (const b of blocks) {
          const top = b.offsetTop;
          const p = Math.floor(top / pageH);
          const contentBottom = (p + 1) * pageH - M;
          if (top > p * pageH + M && top + b.offsetHeight > contentBottom) {
            b.style.marginTop = `${(p + 1) * pageH + M - top}px`;
          }
        }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [htmlContent, text, fontSize, spacing, size.h, paged, rz, font.family, relayoutTick]);

  // Scattered ink dots / "noise" overlaid on the page (seeded, captured in export).
  const inkDots = useMemo(() => {
    if (!rz.dots) return [] as { x: number; y: number; r: number; o: number }[];
    const rand = mulberry32((hashString(text) || 1) ^ 0x9e3779b9);
    const count = Math.min(
      180,
      Math.round((rz.dots * size.w * docHeight) / 14000),
    );
    return Array.from({ length: count }, () => ({
      x: rand() * size.w,
      y: rand() * docHeight,
      r: 0.4 + rand() * 1.6,
      o: 0.12 + rand() * 0.3,
    }));
  }, [rz.dots, size.w, docHeight, text]);

  const changeLanguage = (code: string) => {
    setLangCode(code);
    const next = LANGUAGES.find((l) => l.code === code)!;
    setFont(next.fonts[0]);
  };

  /* ---- import ---- */
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const extracted = await extractText(file);
      if (!extracted.trim()) {
        toast.warning(
          "No text found (a scanned image-only PDF has no text layer).",
        );
        return;
      }
      setEditorText(extracted);
      toast.success(`Imported ${file.name}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't read that file",
      );
    } finally {
      setImporting(false);
    }
  };

  const syncContent = () => {
    if (!editableRef.current) return;
    setText(editableRef.current.innerText);
    setHtmlContent(stripPush(editableRef.current.innerHTML));
  };
  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const t = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, t);
    syncContent();
  };
  // execCommand formatting on the current selection (keeps selection via preventDefault on the button).
  const fmt = (cmd: string, value?: string) => {
    editableRef.current?.focus();
    document.execCommand(cmd, false, value);
    syncContent();
  };
  const insertTable = () => {
    editableRef.current?.focus();
    const cell =
      '<td style="border:1px solid currentColor;padding:6px 12px;min-width:64px">&nbsp;</td>';
    const row = `<tr>${cell.repeat(3)}</tr>`;
    document.execCommand(
      "insertHTML",
      false,
      `<table style="border-collapse:collapse;margin:10px 0">${row.repeat(3)}</table><p><br></p>`,
    );
    syncContent();
  };

  const removeUserFont = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fontsApi.remove(id);
      setUserFonts((p) => p.filter((f) => f.id !== id));
      toast.success("Font deleted");
    } catch {
      toast.error("Couldn't delete that font");
    }
  };

  /* ---- drawing on the Konva overlay ---- */
  const ptr = () => stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 };
  const onStageDown = () => {
    if (tool === "text" || tool === "select" || tool === "eraser") return;
    const p = ptr();
    drawing.current = true;
    if (tool === "note") {
      const value = window.prompt("Note text:");
      drawing.current = false;
      if (value && value.trim())
        commit([
          ...shapes,
          {
            id: uid(),
            type: "text",
            x: p.x,
            y: p.y,
            text: value,
            color,
            fontSize: 22,
          },
        ]);
      return;
    }
    if (tool === "pen" || tool === "marker") {
      setDraft({
        id: uid(),
        type: "path",
        points: [p.x, p.y],
        color,
        width: tool === "marker" ? penWidth[0] * 5 : penWidth[0],
        opacity: tool === "marker" ? 0.35 : 1,
      });
    } else if (tool === "rect" || tool === "ellipse") {
      setDraft({
        id: uid(),
        type: tool,
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        color,
        width: penWidth[0],
      });
    } else if (tool === "line" || tool === "arrow") {
      setDraft({
        id: uid(),
        type: tool,
        points: [p.x, p.y, p.x, p.y],
        color,
        width: penWidth[0],
      });
    }
  };
  const onStageMove = () => {
    if (!drawing.current || !draft) return;
    const p = ptr();
    if (draft.type === "path")
      setDraft({ ...draft, points: [...draft.points, p.x, p.y] });
    else if (draft.type === "rect" || draft.type === "ellipse")
      setDraft({ ...draft, w: p.x - draft.x, h: p.y - draft.y });
    else if (draft.type === "line" || draft.type === "arrow")
      setDraft({
        ...draft,
        points: [draft.points[0], draft.points[1], p.x, p.y],
      });
  };
  const onStageUp = () => {
    if (drawing.current && draft) commit([...shapes, draft]);
    drawing.current = false;
    setDraft(null);
  };
  const eraseShape = (id: string) => {
    if (tool === "eraser") commit(shapes.filter((s) => s.id !== id));
  };
  const dragShape = (id: string, x: number, y: number) => {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (s.type === "rect" || s.type === "ellipse" || s.type === "text")
          return { ...s, x, y };
        return s;
      }),
    );
  };

  /* ---- export ---- */
  const buildComposite = async (): Promise<HTMLCanvasElement> => {
    const { default: html2canvas } = await import("html2canvas");
    await document.fonts.ready;
    const el = editorRef.current!;
    const SCALE = 2;
    const textCanvas = await html2canvas(el, {
      scale: SCALE,
      backgroundColor: pageColor,
      useCORS: true,
    });
    const out = document.createElement("canvas");
    out.width = textCanvas.width;
    out.height = textCanvas.height;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(textCanvas, 0, 0);
    if (shapes.length && stageRef.current) {
      const anno = stageRef.current.toCanvas({ pixelRatio: SCALE });
      ctx.drawImage(anno, 0, 0, out.width, out.height);
    }
    return out;
  };
  const exportPNG = async () => {
    try {
      const canvas = await buildComposite();
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${title || "handwritten"}.png`;
      a.click();
    } catch {
      toast.error("Export failed");
    }
  };
  const exportPDF = async () => {
    try {
      const canvas = await buildComposite();
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: size.js,
      });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      let left = imgH,
        pos = 0;
      const data = canvas.toDataURL("image/png");
      pdf.addImage(data, "PNG", 0, pos, pw, imgH);
      left -= ph;
      while (left > 0) {
        pos -= ph;
        pdf.addPage();
        pdf.addImage(data, "PNG", 0, pos, pw, imgH);
        left -= ph;
      }
      pdf.save(`${title || "handwritten"}.pdf`);
    } catch {
      toast.error("Export failed");
    }
  };

  /* ---- save ---- */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title,
        content: htmlContent || text,
        language: langCode,
        fontName: font.name,
        pageCount: pages,
        settings: {
          pageColor,
          ink,
          paper,
          pageSizeId,
          fontSize: fontSize[0],
          slant: slant[0],
          spacing: spacing[0],
          fontFamily: font.family,
          annotations: shapes,
          realism: rz,
        },
      };
      if (docId) await documentsApi.update(docId, payload);
      else {
        const c = await documentsApi.create(payload);
        setSearchParams({ id: c.id }, { replace: true });
      }
      toast.success("Saved");
    } catch {
      toast.error("Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "text", icon: <TypeIcon className="h-4 w-4" />, label: "Edit text" },
    {
      id: "select",
      icon: <MousePointer2 className="h-4 w-4" />,
      label: "Select / move",
    },
    { id: "pen", icon: <Pen className="h-4 w-4" />, label: "Pen" },
    {
      id: "marker",
      icon: <Highlighter className="h-4 w-4" />,
      label: "Highlighter",
    },
    { id: "rect", icon: <Square className="h-4 w-4" />, label: "Rectangle" },
    { id: "ellipse", icon: <Circle className="h-4 w-4" />, label: "Ellipse" },
    { id: "line", icon: <Minus className="h-4 w-4" />, label: "Line" },
    { id: "arrow", icon: <MoveUpRight className="h-4 w-4" />, label: "Arrow" },
    { id: "note", icon: <PenLine className="h-4 w-4" />, label: "Text note" },
    { id: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
  ];

  const textMode = tool === "text";

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* header */}
      <header className="h-14 shrink-0 border-b border-border bg-card flex items-center gap-3 px-4 no-print">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 w-56 text-sm font-medium"
        />
        <label className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-border px-2.5 py-1.5 cursor-pointer hover:bg-secondary/50">
          {importing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {importing ? "Reading…" : "Import TXT/PDF/Word"}
          <input
            type="file"
            accept={ACCEPT_IMPORT}
            className="hidden"
            disabled={importing}
            onChange={onUpload}
          />
        </label>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={undo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={redo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={exportPNG}>
          <ImageIcon className="h-4 w-4 mr-1" /> PNG
        </Button>
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <Download className="h-4 w-4 mr-1" /> PDF
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
        </Button>
      </header>

      {/* tool bar */}
      <div className="h-12 shrink-0 border-b border-border bg-card flex items-center gap-1 px-3 no-print">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => setTool(t.id)}
            className={`h-8 w-8 grid place-items-center rounded-md transition ${tool === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {t.icon}
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-2" />
        <div className="flex items-center gap-1">
          {ANNO_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent ml-1"
          />
        </div>
        <div className="w-px h-6 bg-border mx-2" />
        <span className="text-xs text-muted-foreground">Size</span>
        <div className="w-24">
          <Slider
            value={penWidth}
            onValueChange={setPenWidth}
            min={1}
            max={12}
            step={1}
          />
        </div>

        <div className="w-px h-6 bg-border mx-2" />
        {/* text formatting (acts on the selection while editing) */}
        {[
          { cmd: "bold", icon: <Bold className="h-4 w-4" />, t: "Bold" },
          { cmd: "italic", icon: <Italic className="h-4 w-4" />, t: "Italic" },
          {
            cmd: "underline",
            icon: <Underline className="h-4 w-4" />,
            t: "Underline",
          },
        ].map((b) => (
          <button
            key={b.cmd}
            title={b.t}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fmt(b.cmd)}
            className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            {b.icon}
          </button>
        ))}
        {ANNO_COLORS.slice(0, 4).map((c) => (
          <button
            key={c}
            title="Text color"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fmt("foreColor", c)}
            className="h-5 w-5 rounded-full border border-border"
            style={{ background: c }}
          />
        ))}
        <button
          title="Insert table"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertTable}
          className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <Table className="h-4 w-4" />
        </button>

        <div className="flex-1" />
        <button
          title="One-click realistic handwriting"
          onClick={() => toggleRealism(!realismOn)}
          className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1.5 transition ${realismOn ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground hover:bg-secondary"}`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Realism{" "}
          {realismOn ? "on" : "off"}
        </button>
        <span className="text-xs text-muted-foreground ml-2">
          {pages} page{pages > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* canvas */}
        <div ref={hostRef} className="flex-1 overflow-auto p-8 print-host">
          {/* spacer reserves the SCALED footprint so the sheet is centered and
              never overflows horizontally (the inner sheet is scaled to fit) */}
          <div
            className="mx-auto relative"
            style={{ width: size.w * fit, height: docHeight * fit }}
          >
            <div
              className="absolute left-0 top-0"
              style={{ transform: `scale(${fit})`, transformOrigin: "top left" }}
            >
              <div className="relative" style={{ width: size.w }}>
            {/* editable handwriting document (or read-only realism preview) */}
            <div
              id="print-area"
              ref={editorRef}
              dir={lang.rtl ? "rtl" : "ltr"}
              className={`hw-sheet ${paperCls} ${rz.grain ? "grain" : ""} relative`}
              style={{
                width: size.w,
                minHeight: size.h,
                padding: 64,
                boxSizing: "border-box",
                backgroundColor: pageColor,
                color: ink,
                fontFamily: font.family,
                fontSize: fontSize[0],
                lineHeight: spacing[0],
                transform: `skewX(${-slant[0]}deg)`,
                ["--rule" as string]: `${Math.round(fontSize[0] * spacing[0])}px`,
              }}
            >
              <div
                ref={editableRef}
                contentEditable={textMode}
                suppressContentEditableWarning
                onInput={syncContent}
                onPaste={onPaste}
                onBlur={syncContent}
                spellCheck={false}
                className="outline-none"
                style={{
                  // whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  wordBreak: "normal",
                  minHeight: size.h - 128,
                  cursor: textMode ? "text" : "default",
                }}
              />
              {/* scattered ink dots / noise (inside the page so it's captured in export) */}
              {inkDots.length > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ transform: "none" }}
                >
                  {inkDots.map((d, i) => (
                    <span
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        left: d.x,
                        top: d.y,
                        width: d.r * 2,
                        height: d.r * 2,
                        background: ink,
                        opacity: d.o,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* empty-state placeholder (contenteditable has no native placeholder) */}
            {!text.trim() && (
              <div
                className="pointer-events-none absolute select-none"
                dir={lang.rtl ? "rtl" : "ltr"}
                style={{
                  top: 64,
                  [lang.rtl ? "right" : "left"]: 64,
                  right: lang.rtl ? 64 : undefined,
                  color: "#9ca3af",
                  fontFamily:
                    "system-ui, -apple-system, 'Segoe UI', sans-serif",
                  fontSize: 18,
                }}
              >
                Paste your text here — or use “Import TXT / PDF / Word” above…
              </div>
            )}
            {/* page-break guides (Google-Docs-style paged view) */}
            {paged && pages > 1 && (
              <div className="pointer-events-none absolute inset-0 no-print">
                {Array.from({ length: pages - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 flex items-center"
                    style={{ top: (i + 1) * size.h }}
                  >
                    <div className="h-3 w-full bg-muted/60 border-y border-dashed border-border" />
                    <span className="absolute right-1 -top-4 text-[10px] text-muted-foreground bg-card px-1 rounded">
                      p.{i + 2}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* annotation overlay */}
            <div
              className="absolute inset-0"
              style={{ pointerEvents: textMode ? "none" : "auto" }}
            >
              <Stage
                ref={stageRef}
                width={size.w}
                height={docHeight}
                onMouseDown={onStageDown}
                onMouseMove={onStageMove}
                onMouseUp={onStageUp}
                onMouseLeave={onStageUp}
              >
                <Layer>
                  {[...shapes, ...(draft ? [draft] : [])].map((s) => {
                    const common = {
                      key: s.id,
                      draggable: tool === "select",
                      onClick: () => eraseShape(s.id),
                      onTap: () => eraseShape(s.id),
                      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
                        dragShape(s.id, e.target.x(), e.target.y()),
                    };
                    if (s.type === "path")
                      return (
                        <KLine
                          {...common}
                          points={s.points}
                          stroke={s.color}
                          strokeWidth={s.width}
                          opacity={s.opacity}
                          lineCap="round"
                          lineJoin="round"
                          tension={0.4}
                        />
                      );
                    if (s.type === "rect")
                      return (
                        <KRect
                          {...common}
                          x={s.x}
                          y={s.y}
                          width={s.w}
                          height={s.h}
                          stroke={s.color}
                          strokeWidth={s.width}
                        />
                      );
                    if (s.type === "ellipse")
                      return (
                        <KEllipse
                          {...common}
                          x={s.x + s.w / 2}
                          y={s.y + s.h / 2}
                          radiusX={Math.abs(s.w / 2)}
                          radiusY={Math.abs(s.h / 2)}
                          stroke={s.color}
                          strokeWidth={s.width}
                        />
                      );
                    if (s.type === "line")
                      return (
                        <KLine
                          {...common}
                          points={s.points}
                          stroke={s.color}
                          strokeWidth={s.width}
                          lineCap="round"
                        />
                      );
                    if (s.type === "arrow")
                      return (
                        <KArrow
                          {...common}
                          points={s.points}
                          stroke={s.color}
                          fill={s.color}
                          strokeWidth={s.width}
                          pointerLength={10}
                          pointerWidth={10}
                        />
                      );
                    if (s.type === "text")
                      return (
                        <KText
                          {...common}
                          x={s.x}
                          y={s.y}
                          text={s.text}
                          fill={s.color}
                          fontSize={s.fontSize}
                          fontStyle="bold"
                        />
                      );
                    return null;
                  })}
                </Layer>
              </Stage>
            </div>
              </div>
            </div>
          </div>
        </div>

        {/* controls */}
        <aside className="w-72 shrink-0 border-l border-border bg-card overflow-auto p-4 space-y-5 no-print">
          {userFonts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">My Hands</Label>
              <div className="grid grid-cols-2 gap-2">
                {userFonts.map((f) => {
                  const family = `'${f.family}', cursive`;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setFont({ name: f.name, family })}
                      className={`group relative p-2.5 rounded-lg border text-left cursor-pointer transition ${font.family === family ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    >
                      <button
                        title="Delete"
                        onClick={(e) => removeUserFont(f.id, e)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 rounded p-1 bg-background/80 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <span
                        className="block text-xl leading-none"
                        style={{ fontFamily: family }}
                      >
                        Abcde
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1 block truncate">
                        {f.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link
                to="/handwriting/manual"
                className="text-xs text-primary hover:underline"
              >
                + Add a handwriting
              </Link>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Language</Label>
            <Select value={langCode} onValueChange={changeLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
              {lang.fonts.map((f) => (
                <button
                  key={f.family}
                  onClick={() => setFont(f)}
                  className={`p-2.5 rounded-lg border text-left transition ${font.family === f.family ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <span
                    className="block text-lg leading-none"
                    style={{ fontFamily: f.family }}
                  >
                    {lang.sample.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Page</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setPageSizeId(id)}
                  className={`py-1.5 rounded-md text-xs border ${pageSizeId === id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  {PAGE_SIZES[id].label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs">Paged view (like Docs)</Label>
              <Switch checked={paged} onCheckedChange={setPaged} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Ink</Label>
            <div className="flex flex-wrap gap-1.5">
              {INK_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setInk(c)}
                  className={`h-7 w-7 rounded-full border-2 ${ink === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={ink}
                onChange={(e) => setInk(e.target.value)}
                className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <Label className="text-sm font-semibold">Handwriting & paper</Label>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <Label>Text size</Label>
                <span className="text-muted-foreground">{fontSize[0]}px</span>
              </div>
              <Slider
                value={fontSize}
                onValueChange={setFontSize}
                min={16}
                max={56}
                step={1}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <Label>Line spacing</Label>
                <span className="text-muted-foreground">
                  {spacing[0].toFixed(1)}
                </span>
              </div>
              <Slider
                value={spacing}
                onValueChange={setSpacing}
                min={1.2}
                max={3}
                step={0.1}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <Label>Slant</Label>
                <span className="text-muted-foreground">{slant[0]}°</span>
              </div>
              <Slider
                value={slant}
                onValueChange={setSlant}
                min={-12}
                max={12}
                step={1}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Paper</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {PAPERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPaper(p.id)}
                    className={`py-1.5 rounded-md text-xs border ${paper === p.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Page color</Label>
              <input
                type="color"
                value={pageColor}
                onChange={(e) => setPageColor(e.target.value)}
                className="h-7 w-7 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>

          {/* Realism — one toggle sets a good level of everything; each effect is
              also independently controllable (works with or without the preset). */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Realism
              </Label>
              <Switch checked={realismOn} onCheckedChange={toggleRealism} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              One toggle = a natural, human-written look. Or tune any effect on
              its own — all apply live and in PNG/PDF export.
            </p>
            {(
              [
                {
                  k: "intensity",
                  label: "Overall amount",
                  min: 0,
                  max: 2,
                  step: 0.1,
                  suffix: "×",
                },
                {
                  k: "drift",
                  label: "Up/down drift",
                  min: 0,
                  max: 0.12,
                  step: 0.005,
                },
                {
                  k: "rotate",
                  label: "Word tilt",
                  min: 0,
                  max: 4,
                  step: 0.1,
                  suffix: "°",
                },
                {
                  k: "slant",
                  label: "Slant variation",
                  min: 0,
                  max: 4,
                  step: 0.1,
                  suffix: "°",
                },
                {
                  k: "scale",
                  label: "Size wobble",
                  min: 0,
                  max: 0.12,
                  step: 0.005,
                },
                {
                  k: "spacing",
                  label: "Spacing wobble",
                  min: 0,
                  max: 0.04,
                  step: 0.002,
                },
                {
                  k: "slips",
                  label: "Writing slips",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  suffix: "",
                },
                {
                  k: "dots",
                  label: "Ink dots / noise",
                  min: 0,
                  max: 1,
                  step: 0.05,
                  suffix: "",
                },
              ] as const
            ).map((c) => (
              <div key={c.k}>
                <div className="flex justify-between text-xs mb-1">
                  <Label>{c.label}</Label>
                  <span className="text-muted-foreground">
                    {(rz[c.k] as number).toFixed(
                      c.step < 0.01 ? 3 : c.step < 0.1 ? 2 : 1,
                    )}
                    {c.suffix ?? ""}
                  </span>
                </div>
                <Slider
                  value={[rz[c.k] as number]}
                  onValueChange={([v]) => setRz((r) => ({ ...r, [c.k]: v }))}
                  min={c.min}
                  max={c.max}
                  step={c.step}
                />
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Ink flow (light/heavy words)</Label>
              <Switch
                checked={rz.inkFlow}
                onCheckedChange={(v) => setRz((r) => ({ ...r, inkFlow: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Ink specks</Label>
              <Switch
                checked={rz.specks}
                onCheckedChange={(v) => setRz((r) => ({ ...r, specks: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Paper grain / aged</Label>
              <Switch
                checked={rz.grain}
                onCheckedChange={(v) => setRz((r) => ({ ...r, grain: v }))}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-4">
            Tip: <strong>Edit text</strong> lets you type/paste/format directly
            on the page (Bold, Italic, color, Tables in the toolbar). Pick a
            drawing tool to annotate; <strong>Select</strong> moves shapes,{" "}
            <strong>Eraser</strong> click-deletes them.
          </p>
        </aside>
      </div>
    </div>
  );
}
