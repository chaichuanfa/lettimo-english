import { LESSONS, Phonics, G2P } from "../data";
import type {
  DictionaryEntry,
  DictionaryRow,
  DictionaryShard,
} from "../types/app";
import type { G2PSegment, Lesson, Segment } from "../types/phonics";
interface DictionaryCache {
  shards: Partial<Record<string, DictionaryShard>>;
  loading: Partial<Record<string, Promise<DictionaryShard>>>;
  words: string[] | null;
  set: Set<string> | null;
}
export interface DictionaryAnalysis {
  text: string;
  tokens: string[];
  segs: (G2PSegment & { display: string; hl: boolean })[] | null;
  ipaMap: number[][] | null;
  irregular: boolean;
  syl: number[] | null;
}
interface CurriculumIndex {
  words: Map<string, { l: Lesson; emoji: string }>;
  cards: Map<string, Lesson>;
}
let indexLoading: Promise<string[]> | null = null;
export const DICT: DictionaryCache = {
  shards: {},
  loading: {},
  words: null,
  set: null,
};
window.DICT_SHARD = (k, o) => {
  DICT.shards[k] = o;
};
export const FORM_NAMES: Readonly<Record<string, string | undefined>> = {
  s: "复数",
  p: "过去式",
  d: "过去分词",
  i: "现在分词",
  3: "第三人称单数",
  r: "比较级",
  t: "最高级",
};
export const TAG_NAMES: Readonly<Record<string, string | undefined>> = {
  zk: "中考",
  gk: "高考",
  cet4: "四级",
  cet6: "六级",
  ky: "考研",
  toefl: "托福",
  ielts: "雅思",
  gre: "GRE",
};
export const DICT_TRY = [
  "night",
  "knight",
  "beautiful",
  "enough",
  "phone",
  "treasure",
  "station",
  "laugh",
  "island",
  "cake",
  "rabbit",
  "chocolate",
];
export const normWord = (s: unknown) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

export function loadScript(src: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => {
      s.remove();
      resolve(false);
    };
    document.head.append(s);
  });
}
export function dictIndex(): Promise<string[]> {
  if (DICT.words) return Promise.resolve(DICT.words);
  return (indexLoading ||= loadScript("js/dict/index.js").then((ok) => {
    if (!ok) {
      indexLoading = null;
      return [];
    }
    DICT.words = (window.DICT_INDEX || "").split(" ").filter(Boolean);
    DICT.set = new Set(DICT.words);
    return DICT.words;
  }));
}
export function dictShard(key: string): Promise<DictionaryShard> {
  if (DICT.shards[key]) return Promise.resolve(DICT.shards[key]);
  return (DICT.loading[key] ||= loadScript(`js/dict/${key}.js`).then(() => {
    delete DICT.loading[key];
    return DICT.shards[key] || {};
  }));
}
export async function dictLookup(w: string): Promise<DictionaryEntry | null> {
  if (!w || (DICT.set && !DICT.set.has(w))) return null;
  const row = (await dictShard(w.slice(0, 2)))[w];
  if (!row) return null;
  const [ipa = "", zh = "", lemma = "", exch = "", tags = "", ex = []] = row;
  const e: DictionaryEntry = {
    word: w,
    ipa: ipa.split("|"),
    zh,
    tags,
    ex,
    forms: [],
    lemma: null,
  };
  if (lemma) {
    const [lw, type] = lemma.split(":");
    e.lemma = { word: lw, type };
  }
  exch
    .split("/")
    .filter(Boolean)
    .forEach((p) => {
      const [k, v] = p.split(":");
      if (FORM_NAMES[k] && v) e.forms.push([k, v]);
    });
  return e;
}
const isDictWord = (x: string) =>
  !!(DICT.shards[x.slice(0, 2)]?.[x] || DICT.set?.has(x));
const firstSense = (zh: string) =>
  (zh.split("\n")[0] || "")
    .replace(/^[a-z]+\.\s*/, "")
    .split("；")
    .slice(0, 2)
    .join("；");
export const formGloss = (row: DictionaryRow | null | undefined) => {
  if (!row) return "";
  if (row[1]) return firstSense(row[1]);
  if (row[2]) {
    const [lw, t] = row[2].split(":");
    return `${lw} 的${FORM_NAMES[t] || "变形"}`;
  }
  return "";
};

// 课程索引：单词 → 所在课；字母组合（+读音）→ 讲它的课
let CUR: CurriculumIndex | null = null;
export function curIndex(): CurriculumIndex {
  if (CUR) return CUR;
  const index: CurriculumIndex = { words: new Map(), cards: new Map() };
  CUR = index;
  LESSONS.forEach((l) => {
    l.words.forEach((raw) => {
      const p = Phonics.parseWord(raw);
      const k = p.text.toLowerCase();
      if (!index.words.has(k)) index.words.set(k, { l, emoji: p.emoji });
    });
    (l.cards || []).forEach((c) => {
      if (typeof c.s !== "string") return;
      const k = `${c.g}|${c.s}`;
      if (!index.cards.has(k)) index.cards.set(k, l);
      if (c.s !== "silent" && !index.cards.has(c.g)) index.cards.set(c.g, l);
    });
  });
  return CUR;
}
export function lessonForSeg(sg: Segment): Lesson | null | undefined {
  const C = curIndex().cards;
  if (sg.magicE !== undefined)
    return C.get(`${sg.t}_e|${sg.sid}`) || C.get(`${sg.t}_e`);
  if (sg.magic) return null;
  return (
    C.get(`${sg.t}|${sg.sid}`) ||
    (sg.t.length > 1 && !sg.silent ? C.get(sg.t) : null)
  );
}

// 用词典读音给单词做拼读拆解
export function dictAnalyze(e: DictionaryEntry): DictionaryAnalysis {
  const tokens = e.ipa[0].split(" ");
  const r = window.G2P && G2P.align(e.word, tokens);
  const a: DictionaryAnalysis = {
    text: e.word,
    tokens,
    segs: null,
    ipaMap: null,
    irregular: false,
    syl: null,
  };
  // 缩写（etc、hiv）或读法完全对不上的词不做拆解
  if (r && /[aeiouy]/.test(e.word) && !r.segs.some((s) => s.cost >= 4)) {
    a.segs = r.segs.map((s) => ({
      ...s,
      display: s.t,
      hl: s.magic || s.magicE !== undefined,
    })); // 高亮魔法 e 和它影响的元音
    a.ipaMap = a.segs.map((s) => s.ph);
    a.irregular = r.irregular;
    a.syl = G2P.syllables(e.word, tokens, r.segs, isDictWord);
  }
  return a;
}
