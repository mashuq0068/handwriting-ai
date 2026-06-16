/**
 * Per-script configuration that drives the whole handwriting pipeline:
 * which glyphs to capture, how letters connect, and how the cell guide looks.
 * One source of truth shared by the template generator, the draw grid, and the
 * font builder.
 */

export type ConnectionStrategy = "cursive" | "arabic-forms" | "headline" | "isolated";
export type GuideType = "baseline" | "headline" | "box";
export type ArabicForm = "isol" | "init" | "medi" | "fina";

export interface ScriptCell {
  id: string; // unique within the script
  chars: string; // the character(s) this cell captures
  display: string; // what to show as the faint guide
  kind: "glyph" | "ligature";
  form?: ArabicForm; // arabic positional form (for kind 'glyph')
  unicode?: number; // codepoint for a base glyph (omitted for ligatures / non-isolated forms)
}

export interface LigatureDef {
  from: string[]; // the character sequence that joins (2 or 3 letters)
  display: string;
}

export interface ScriptConfig {
  code: string;
  label: string;
  rtl?: boolean;
  strategy: ConnectionStrategy;
  guide: GuideType;
  advance: "proportional" | "fullwidth";
  sample: string;
  note?: string; // honest coverage caveat shown in the UI
  cells: ScriptCell[];
  ligatures?: LigatureDef[];
}

const PUNCT = ".,'\"!?-:;()&@#".split("");
const cp = (c: string) => c.codePointAt(0)!;

function basicCells(chars: string[]): ScriptCell[] {
  return chars.map((c) => ({ id: c, chars: c, display: c, kind: "glyph", unicode: cp(c) }));
}

// ---- Latin / Cyrillic -----------------------------------------------------
function latinLike(code: string, label: string, letters: string, sample: string): ScriptConfig {
  const chars = [...letters, ..."0123456789", ...PUNCT];
  return {
    code,
    label,
    strategy: "cursive",
    guide: "baseline",
    advance: "proportional",
    sample,
    cells: basicCells(chars),
    ligatures:
      code === "latin"
        ? [
            // Most-frequent English letter pairs + a few key clusters. Written
            // JOINED on the sheet, they render as connected (cursive) runs.
            { from: ["t", "h"], display: "th" },
            { from: ["h", "e"], display: "he" },
            { from: ["i", "n"], display: "in" },
            { from: ["e", "r"], display: "er" },
            { from: ["a", "n"], display: "an" },
            { from: ["r", "e"], display: "re" },
            { from: ["o", "n"], display: "on" },
            { from: ["e", "n"], display: "en" },
            { from: ["e", "d"], display: "ed" },
            { from: ["o", "u"], display: "ou" },
            { from: ["n", "g"], display: "ng" },
            { from: ["s", "t"], display: "st" },
            { from: ["t", "i"], display: "ti" },
            { from: ["l", "l"], display: "ll" },
            { from: ["t", "h", "e"], display: "the" },
            { from: ["a", "n", "d"], display: "and" },
            { from: ["i", "n", "g"], display: "ing" },
            { from: ["i", "o", "n"], display: "ion" },
          ]
        : undefined,
  };
}

// Connected-pair cells (ligatures) presented as capturable cells — used by the
// template sheet, the draw grid and the extractor so joins can be written once
// and reused. Empty for scripts without a ligature list.
export function ligatureCells(script: ScriptConfig): ScriptCell[] {
  return (script.ligatures ?? []).map((l) => ({
    id: `lig:${l.from.join("")}`,
    chars: l.from.join(""),
    display: l.display,
    kind: "ligature" as const,
  }));
}

// All cells we can capture on a sheet: base glyphs + connected pairs.
export function capturableCells(script: ScriptConfig): ScriptCell[] {
  return [...script.cells, ...ligatureCells(script)];
}

// ---- Arabic (with joining forms) ------------------------------------------
// Each base letter + which positional forms apply. Dual-joining → 4 forms,
// right-joining → isolated + final only.
const ARABIC_LETTERS: { c: string; joins: "dual" | "right" }[] = [
  { c: "ا", joins: "right" }, { c: "ب", joins: "dual" }, { c: "ت", joins: "dual" }, { c: "ث", joins: "dual" },
  { c: "ج", joins: "dual" }, { c: "ح", joins: "dual" }, { c: "خ", joins: "dual" }, { c: "د", joins: "right" },
  { c: "ذ", joins: "right" }, { c: "ر", joins: "right" }, { c: "ز", joins: "right" }, { c: "س", joins: "dual" },
  { c: "ش", joins: "dual" }, { c: "ص", joins: "dual" }, { c: "ض", joins: "dual" }, { c: "ط", joins: "dual" },
  { c: "ظ", joins: "dual" }, { c: "ع", joins: "dual" }, { c: "غ", joins: "dual" }, { c: "ف", joins: "dual" },
  { c: "ق", joins: "dual" }, { c: "ك", joins: "dual" }, { c: "ل", joins: "dual" }, { c: "م", joins: "dual" },
  { c: "ن", joins: "dual" }, { c: "ه", joins: "dual" }, { c: "و", joins: "right" }, { c: "ي", joins: "dual" },
];

function arabicCells(): ScriptCell[] {
  const cells: ScriptCell[] = [];
  for (const { c, joins } of ARABIC_LETTERS) {
    // isolated form is the base glyph (carries the unicode)
    cells.push({ id: `${c}-isol`, chars: c, display: c, kind: "glyph", form: "isol", unicode: cp(c) });
    if (joins === "dual") {
      cells.push({ id: `${c}-init`, chars: c, display: c, kind: "glyph", form: "init" });
      cells.push({ id: `${c}-medi`, chars: c, display: c, kind: "glyph", form: "medi" });
    }
    cells.push({ id: `${c}-fina`, chars: c, display: c, kind: "glyph", form: "fina" });
  }
  // Arabic-Indic digits
  for (const d of "٠١٢٣٤٥٦٧٨٩") cells.push({ id: d, chars: d, display: d, kind: "glyph", unicode: cp(d) });
  return cells;
}

// ---- Devanagari (Hindi) / Bengali -----------------------------------------
const HINDI = {
  vowels: "अआइईउऊएऐओऔअंअः".split(""),
  consonants: "कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह".split(""),
  matras: "ा、िीुूेैोौंः्".replace(/、/g, "").split(""),
  digits: "०१२३४५६७८९".split(""),
};
const BENGALI = {
  vowels: "অআইঈউঊএঐওঔ".split(""),
  consonants: "কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ".split(""),
  matras: "ািীুূেৈোৌ্ংঃ".split(""),
  digits: "০১২৩৪৫৬৭৮৯".split(""),
};

function indic(code: string, label: string, set: typeof HINDI, sample: string): ScriptConfig {
  return {
    code,
    label,
    strategy: "headline",
    guide: "headline",
    advance: "proportional",
    sample,
    note: "Conjuncts (joined consonant clusters) aren't hand-shaped yet — letters connect along the headline. Coverage is base letters, vowels, matras and digits.",
    cells: basicCells([...set.vowels, ...set.consonants, ...set.matras, ...set.digits]),
  };
}

// ---- CJK (curated / kana) -------------------------------------------------
const HIRAGANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");
const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン".split("");
const CHINESE_COMMON = "的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生".split("");
const KOREAN_JAMO = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ".split("");

function cjk(code: string, label: string, chars: string[], sample: string, note: string): ScriptConfig {
  return {
    code,
    label,
    strategy: "isolated",
    guide: "box",
    advance: "fullwidth",
    sample,
    note,
    cells: basicCells([...chars, "。", "、", "，"].filter((c, i, a) => a.indexOf(c) === i)),
  };
}

export const SCRIPTS: Record<string, ScriptConfig> = {
  latin: latinLike("latin", "English / Latin", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", "The quick brown fox jumps over the lazy dog. 0123"),
  cyrillic: latinLike("cyrillic", "Russian (Русский)", "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя", "Съешь же ещё этих мягких французских булок. 0123"),
  arabic: {
    code: "arabic",
    label: "Arabic (العربية)",
    rtl: true,
    strategy: "arabic-forms",
    guide: "baseline",
    advance: "proportional",
    sample: "هذه عينة من خط اليد. ٠١٢٣",
    note: "Write each letter in the positional forms shown (isolated / initial / medial / final). Forms you skip fall back to the isolated shape.",
    cells: arabicCells(),
  },
  hindi: indic("hindi", "Hindi (हिन्दी)", HINDI, "यह मेरी अपनी लिखावट का एक नमूना है। ०१२३"),
  bengali: indic("bengali", "Bengali (বাংলা)", BENGALI, "এটি আমার নিজের হাতের লেখার একটি নমুনা। ০১২৩"),
  japanese: cjk("japanese", "Japanese (日本語)", [...HIRAGANA, ...KATAKANA], "これは手書きの見本です。", "Hiragana + katakana are fully covered. Kanji aren't included in v1 (thousands of characters)."),
  chinese: cjk("chinese", "Chinese (中文)", CHINESE_COMMON, "这是手写体的一个示例。", "A curated set of common characters. Chinese has thousands of glyphs — only the listed ones are covered."),
  korean: cjk("korean", "Korean (한국어)", KOREAN_JAMO, "이것은 손글씨 예시입니다.", "Jamo letters are covered; full syllable-block composition isn't hand-shaped in v1."),
};

export const SCRIPT_LIST = Object.values(SCRIPTS);
export const getScript = (code: string): ScriptConfig => SCRIPTS[code] ?? SCRIPTS.latin;
