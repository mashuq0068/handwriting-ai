import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { documentsApi } from "@/lib/api";
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
  Printer,
  Bold,
  Italic,
  Heading,
  List,
  Wand2,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { applyHandwritingJitter, hashString } from "@/lib/handwriting";

/* ------------------------------------------------------------------ config */

// Languages → script-appropriate handwriting fonts (all loaded from Google Fonts).
type Lang = { code: string; label: string; rtl?: boolean; sample: string; fonts: { name: string; family: string }[] };

const LANGUAGES: Lang[] = [
  {
    code: "latin",
    label: "English / Latin",
    sample: "The quick brown fox jumps over the lazy dog.",
    fonts: [
      { name: "Casual", family: "'Caveat', cursive" },
      { name: "Neat", family: "'Kalam', cursive" },
      { name: "Vintage", family: "'Homemade Apple', cursive" },
      { name: "Sketchy", family: "'Shadows Into Light', cursive" },
      { name: "Playful", family: "'Indie Flower', cursive" },
      { name: "Elegant", family: "'Dancing Script', cursive" },
      { name: "Architect", family: "'Architects Daughter', cursive" },
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

// Page sizes in CSS px @96dpi, with matching jsPDF format keys.
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

const INK_PRESETS = ["#111111", "#1a2a5e", "#283593", "#4a2c12", "#7a1f1f", "#1f5f2a"];

// Per-language starter documents (Markdown). Kept secular — no greetings/religious words.
// Switching language loads the matching example *only* if the user hasn't edited yet.
const EXAMPLES: Record<string, string> = {
  latin: `Dear friend,

Thank you so much for the **book** you sent last week — I finished it in two evenings and loved every page.

The story stayed with me long after I put it down. A few things I especially enjoyed:

- The quiet opening chapter
- The letters between the two sisters
- That unexpected, *beautiful* ending

I'm passing it on to my brother next, though I've already told him he has to give it back.

Let's catch up properly soon — coffee is on me.

Warmly,
*Alex*`,
  hindi: `प्रिय मित्र,

पिछले हफ्ते तुमने जो **किताब** भेजी थी, उसके लिए बहुत-बहुत धन्यवाद — मैंने उसे दो ही शामों में पढ़ लिया।

कहानी देर तक मन में बसी रही। कुछ बातें जो मुझे खास पसंद आईं:

- शुरुआत का शांत अध्याय
- दो बहनों के बीच लिखे गए पत्र
- वह अनोखा, *सुंदर* अंत

अब मैं इसे अपने भाई को दूँगा, पर कह दिया है कि लौटानी पड़ेगी।

जल्द ठीक से मिलते हैं — कॉफ़ी मेरी तरफ़ से।

स्नेह सहित,
*आरव*`,
  bengali: `প্রিয় বন্ধু,

গত সপ্তাহে তুমি যে **বই**টি পাঠিয়েছিলে, তার জন্য অসংখ্য ধন্যবাদ — আমি দুই সন্ধ্যাতেই সেটি শেষ করেছি।

গল্পটা অনেকক্ষণ মনে গেঁথে ছিল। কয়েকটি জিনিস বিশেষভাবে ভালো লেগেছে:

- শুরুর শান্ত অধ্যায়টি
- দুই বোনের মধ্যে লেখা চিঠিগুলো
- সেই অপ্রত্যাশিত, *সুন্দর* সমাপ্তি

এবার এটি আমার ভাইকে দেব, তবে বলে দিয়েছি ফেরত দিতে হবে।

শীঘ্রই ভালোভাবে দেখা হবে — কফি আমার তরফ থেকে।

শুভেচ্ছা সহ,
*আরভ*`,
  arabic: `صديقي العزيز،

**شكرًا** جزيلًا على الكتاب الذي أرسلته الأسبوع الماضي — أنهيته في ليلتين وأحببت كل صفحة فيه.

بقيت القصة في ذهني وقتًا طويلًا. أكثر ما أعجبني:

- الفصل الأول الهادئ
- الرسائل بين الأختين
- تلك النهاية *الجميلة* غير المتوقعة

سأعطيه لأخي الآن، لكنني أخبرته أنه يجب أن يعيده.

لنلتقِ قريبًا كما ينبغي — القهوة عليّ.

مع المودة،
*آرف*`,
  chinese: `亲爱的朋友：

非常**谢谢**你上周寄来的书 —— 我两个晚上就读完了，每一页都很喜欢。

这个故事让我久久难忘。我特别喜欢这几处：

- 安静的开头一章
- 两姐妹之间的书信
- 那个意外又*美好*的结局

接下来我要把它借给弟弟，不过已经说好他得还回来。

我们很快好好聚一聚吧 —— 咖啡我请。

致以问候，
*小明*`,
  japanese: `親愛なる友へ

先週送ってくれた**本**を本当にありがとう —— 二晩で読み終え、どのページも気に入りました。

物語はずっと心に残っています。特に好きだったところは:

- 静かな冒頭の章
- 姉妹のあいだの手紙
- あの思いがけず*美しい*結末

次は弟に貸すつもりですが、必ず返してねと言ってあります。

近いうちにぜひゆっくり会いましょう —— コーヒーはおごります。

心をこめて、
*あおい*`,
  korean: `친애하는 친구에게,

지난주에 보내준 **책** 정말 고마워 —— 이틀 저녁 만에 다 읽었고 모든 페이지가 좋았어.

이야기가 오랫동안 마음에 남았어. 특히 좋았던 부분은:

- 조용한 첫 장
- 두 자매가 주고받은 편지
- 그 뜻밖의 *아름다운* 결말

이제 동생에게 빌려줄 건데, 꼭 돌려달라고 말해 뒀어.

곧 제대로 한번 만나자 —— 커피는 내가 살게.

마음을 담아,
*민준*`,
  cyrillic: `Дорогой друг,

Огромное **спасибо** за книгу, которую ты прислал на прошлой неделе — я прочитал её за два вечера и наслаждался каждой страницей.

История ещё долго не отпускала меня. Особенно понравилось:

- Тихая первая глава
- Письма между двумя сёстрами
- Та неожиданная, *прекрасная* концовка

Теперь передам её брату, но уже предупредил, что он должен вернуть.

Давай скоро встретимся как следует — кофе с меня.

С теплом,
*Иван*`,
};

const DEFAULT_TEXT = EXAMPLES.latin;
// Set of all starter docs, so we can tell whether the user has customised the text.
const EXAMPLE_SET = new Set(Object.values(EXAMPLES));

/* ------------------------------------------------------------------ editor */

export default function Editor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get("id");

  const [text, setText] = useState(DEFAULT_TEXT);
  const [title, setTitle] = useState("Untitled document");
  const [saving, setSaving] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [langCode, setLangCode] = useState<string>("latin");
  const lang = LANGUAGES.find((l) => l.code === langCode)!;
  const [font, setFont] = useState(lang.fonts[0]);

  // Defaults per spec: pure white A4, black ink, no lines.
  const [pageColor, setPageColor] = useState("#ffffff");
  const [ink, setInk] = useState("#111111");
  const [paper, setPaper] = useState<PaperId>("plain");
  const [pageSizeId, setPageSizeId] = useState<PageSizeId>("a4");
  const [fontSize, setFontSize] = useState([22]);
  const [slant, setSlant] = useState([0]);
  const [spacing, setSpacing] = useState([1.6]);
  const [realism, setRealism] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);

  const size = PAGE_SIZES[pageSizeId];
  const paperCls = PAPERS.find((p) => p.id === paper)!.cls;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Switch language: pick its first hand, and load its example doc unless the
  // user has already written their own (so we never destroy real content).
  const changeLanguage = (code: string) => {
    const next = LANGUAGES.find((l) => l.code === code);
    if (!next) return;
    setLangCode(code);
    setFont(next.fonts[0]);
    setText((prev) => (EXAMPLE_SET.has(prev) ? EXAMPLES[code] ?? prev : prev));
  };

  // Markdown → HTML, with optional per-word handwriting jitter.
  const html = useMemo(() => {
    const parsed = marked.parse(text, { gfm: true, breaks: true }) as string;
    return realism ? applyHandwritingJitter(parsed, hashString(text), 1) : parsed;
  }, [text, realism]);

  // Scale the fixed-size sheet down to fit the preview column.
  const [scale, setScale] = useState(1);
  const [sheetH, setSheetH] = useState(size.h);
  useEffect(() => {
    const fit = () => {
      const cw = scrollRef.current?.clientWidth ?? size.w;
      setScale(Math.min(1, (cw - 48) / size.w));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [size.w]);
  useEffect(() => {
    const measure = () => setSheetH(sheetRef.current?.offsetHeight ?? size.h);
    measure();
    const ro = new ResizeObserver(measure);
    if (sheetRef.current) ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, [html, fontSize, spacing, size.h, font.family, pageSizeId]);

  const pageCount = Math.max(1, Math.ceil(sheetH / size.h));

  /* ---- load existing document when ?id= is present ---- */
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setLoadingDoc(true);
    documentsApi
      .get(docId)
      .then((doc) => {
        if (cancelled) return;
        const s = (doc.settings || {}) as Record<string, unknown>;
        setTitle(doc.title);
        setText(doc.content);
        const code = doc.language || "latin";
        setLangCode(code);
        const langDef = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
        const matchedFont =
          langDef.fonts.find((f) => f.name === doc.fontName) ?? langDef.fonts[0];
        setFont(matchedFont);
        if (typeof s.pageColor === "string") setPageColor(s.pageColor);
        if (typeof s.ink === "string") setInk(s.ink);
        if (typeof s.paper === "string") setPaper(s.paper as PaperId);
        if (typeof s.pageSizeId === "string") setPageSizeId(s.pageSizeId as PageSizeId);
        if (typeof s.fontSize === "number") setFontSize([s.fontSize]);
        if (typeof s.slant === "number") setSlant([s.slant]);
        if (typeof s.spacing === "number") setSpacing([s.spacing]);
        if (typeof s.realism === "boolean") setRealism(s.realism);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load that document");
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  /* ---- save (create or update) ---- */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || "Untitled document",
        content: text,
        language: langCode,
        fontName: font.name,
        pageCount,
        settings: {
          pageColor,
          ink,
          paper,
          pageSizeId,
          fontSize: fontSize[0],
          slant: slant[0],
          spacing: spacing[0],
          realism,
        },
      };
      if (docId) {
        await documentsApi.update(docId, payload);
        toast.success("Saved");
      } else {
        const created = await documentsApi.create(payload);
        setSearchParams({ id: created.id }, { replace: true });
        toast.success("Document saved");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  /* ---- markdown toolbar ---- */
  const wrapSelection = (before: string, after = before, placeholder = "text") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = text.slice(start, end) || placeholder;
    const next = text.slice(0, start) + before + sel + after + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };
  const prefixLine = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    setText(text.slice(0, lineStart) + prefix + text.slice(lineStart));
    requestAnimationFrame(() => ta.focus());
  };

  /* ---- exports ---- */
  const captureSheet = async () => {
    const el = sheetRef.current!;
    const { default: html2canvas } = await import("html2canvas");
    await document.fonts.ready;
    // Capture at the sheet's true (unscaled) size, not the fit-to-column preview.
    const prevTransform = el.style.transform;
    el.style.transform = "none";
    try {
      return await html2canvas(el, { scale: 2, backgroundColor: pageColor, useCORS: true });
    } finally {
      el.style.transform = prevTransform;
    }
  };

  const exportPDF = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const canvas = await captureSheet();
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: size.js });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width; // total height in mm
      const imgData = canvas.toDataURL("image/png");
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }
      pdf.save("handwritten.pdf");
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't export PDF");
    } finally {
      setBusy(false);
    }
  };

  const exportPNG = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      const canvas = await captureSheet();
      const link = document.createElement("a");
      link.download = "handwritten.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Image downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't export image");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => window.print();

  /* ------------------------------------------------------------------ ui */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 no-print">
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
                <PenLine className="h-4 w-4" />
              </span>
              <span className="font-display font-bold hidden sm:inline">Quillify</span>
            </Link>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="h-8 w-40 sm:w-56 border-0 bg-transparent font-display font-semibold focus-visible:ring-1"
              aria-label="Document title"
            />
            {loadingDoc && <span className="text-xs text-muted-foreground">Loading…</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || loadingDoc}>
              <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={busy}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={exportPNG} disabled={busy}>
              <ImageIcon className="h-4 w-4 mr-1.5" /> PNG
            </Button>
            <Button size="sm" onClick={exportPDF} disabled={busy}>
              <Download className="h-4 w-4 mr-1.5" /> {busy ? "Working…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[minmax(340px,420px)_1fr_300px] min-h-0">
        {/* ----------------------------------------------------- markdown editor */}
        <aside className="border-r border-border bg-card flex flex-col min-h-0 no-print">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <Label className="text-sm font-semibold">Markdown</Label>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Heading" onClick={() => prefixLine("# ")}>
                <Heading className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Bold" onClick={() => wrapSelection("**")}>
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Italic" onClick={() => wrapSelection("*")}>
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="List item" onClick={() => prefixLine("- ")}>
                <List className="h-3.5 w-3.5" />
              </Button>
              <Link to="/assistant" title="Write with AI">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            dir={lang.rtl ? "rtl" : "ltr"}
            className="flex-1 resize-none rounded-none border-0 focus-visible:ring-0 font-mono text-sm leading-relaxed p-4 min-h-[40vh]"
            placeholder="Write in Markdown — # headings, **bold**, *italic*, - lists…"
          />
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between">
            <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words · {text.length} chars</span>
            <span>{pageCount} {pageCount === 1 ? "page" : "pages"}</span>
          </div>
        </aside>

        {/* ----------------------------------------------------- live preview */}
        <div ref={scrollRef} className="bg-muted/40 overflow-auto p-6 print-host">
          <div style={{ width: size.w * scale, height: sheetH * scale, margin: "0 auto" }}>
            <div
              ref={sheetRef}
              id="print-area"
              dir={lang.rtl ? "rtl" : "ltr"}
              className={`hw-sheet shadow-2xl ${paperCls} ${realism ? "hw-realism" : ""}`}
              style={{
                width: size.w,
                minHeight: size.h,
                padding: 64,
                backgroundColor: pageColor,
                color: ink,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                ["--rule" as string]: `${Math.round(fontSize[0] * spacing[0])}px`,
              }}
            >
              <div
                className="hw-body"
                style={{
                  fontFamily: font.family,
                  fontSize: fontSize[0],
                  lineHeight: spacing[0],
                  transform: `skewX(${-slant[0]}deg)`,
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------- controls */}
        <aside className="border-l border-border bg-card p-5 space-y-6 overflow-y-auto no-print">
          {/* Language + font generation */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Language</Label>
            <Select value={langCode} onValueChange={changeLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {lang.fonts.map((f) => (
                <button
                  key={f.family}
                  onClick={() => setFont(f)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    font.family === f.family ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="block text-xl leading-none text-foreground" style={{ fontFamily: f.family }}>
                    {lang.sample.slice(0, 6)}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{f.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Page size */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Page size</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setPageSizeId(id)}
                  className={`py-2 rounded-lg border text-xs ${
                    pageSizeId === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  {PAGE_SIZES[id].label}
                </button>
              ))}
            </div>
          </div>

          {/* Ink */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Ink color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {INK_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setInk(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${ink === c ? "border-foreground scale-110" : "border-border"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`ink ${c}`}
                />
              ))}
              <label className="h-8 w-8 rounded-full border-2 border-border grid place-items-center cursor-pointer overflow-hidden" title="Custom ink">
                <input type="color" value={ink} onChange={(e) => setInk(e.target.value)} className="h-10 w-10 cursor-pointer" />
              </label>
            </div>
          </div>

          {/* Realism toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm font-semibold">Handwritten realism</Label>
              <p className="text-[11px] text-muted-foreground">Natural slant & jitter per word</p>
            </div>
            <Switch checked={realism} onCheckedChange={setRealism} />
          </div>

          {/* Advanced */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" /> {showAdvanced ? "Hide" : "More"} page options
          </button>

          {showAdvanced && (
            <div className="space-y-5 pt-1">
              {/* Paper */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Paper</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PAPERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaper(p.id)}
                      className={`py-2 rounded-lg border text-[11px] ${
                        paper === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page color */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Page color</Label>
                <div className="flex items-center gap-2">
                  {["#ffffff", "#fbf7ec", "#fdf6e3", "#eef3f8"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setPageColor(c)}
                      className={`h-8 w-8 rounded-lg border-2 transition ${pageColor === c ? "border-foreground scale-110" : "border-border"}`}
                      style={{ backgroundColor: c }}
                      aria-label={`page ${c}`}
                    />
                  ))}
                  <label className="h-8 w-8 rounded-lg border-2 border-border grid place-items-center cursor-pointer overflow-hidden" title="Custom page color">
                    <input type="color" value={pageColor} onChange={(e) => setPageColor(e.target.value)} className="h-10 w-10 cursor-pointer" />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5"><Label>Text size</Label><span className="text-muted-foreground">{fontSize[0]}px</span></div>
                  <Slider value={fontSize} onValueChange={setFontSize} min={18} max={48} step={1} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5"><Label>Slant</Label><span className="text-muted-foreground">{slant[0]}°</span></div>
                  <Slider value={slant} onValueChange={setSlant} min={-12} max={12} step={1} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5"><Label>Line spacing</Label><span className="text-muted-foreground">{spacing[0]}</span></div>
                  <Slider value={spacing} onValueChange={setSpacing} min={1.2} max={2.6} step={0.1} />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border space-y-2">
            <Button className="w-full" onClick={exportPDF} disabled={busy}>
              <Download className="h-4 w-4 mr-1.5" /> Download PDF
            </Button>
            <Button variant="outline" className="w-full" onClick={exportPNG} disabled={busy}>
              <ImageIcon className="h-4 w-4 mr-1.5" /> Download PNG
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
