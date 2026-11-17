import { LESSONS, G_LESSONS, Phonics } from "../data";
import type { Lesson } from "../types/phonics";
import type { IndexedGrammarLesson } from "../types/grammar";
type IndexedItem =
  | {
      type: "lesson";
      l: Lesson;
      gs: string[];
      title: string;
      en: string;
      stage: string;
      stageEn: string;
      rule: string;
    }
  | {
      type: "grammar";
      l: IndexedGrammarLesson;
      title: string;
      en: string;
      extra: string;
      stage: string;
      rule: string;
    }
  | {
      type: "word";
      l: Lesson;
      text: string;
      zh: string;
      emoji: string;
      ipa: string;
    }
  | { type: "sent"; l: Lesson; i: number; en: string; zh: string };
export type SearchResult =
  (IndexedItem & { href: string }) | { type: "dict"; w: string; href: string };
export type SearchGroup = { label: string; items: SearchResult[] };
const gDisplay = (g: string) => g.replace("_", "‿");
const ipaOf = (text: string) =>
  window.IPA?.[text.toLowerCase()]
    ? "/" + window.IPA[text.toLowerCase()].replaceAll(" ", "") + "/"
    : "";
const stripIpa = (x: string) => x.replace(/[\/\[\]ˈˌ\s]/g, "");
export function buildSearchIndex() {
  const items: IndexedItem[] = [];
  LESSONS.forEach((l) => {
    const gs = (l.cards || []).map((c) => c.g);
    items.push({
      type: "lesson",
      l,
      gs: [...gs, ...gs.map(gDisplay)].map((g) => g.toLowerCase()),
      title: l.title.toLowerCase(),
      en: l.en.toLowerCase(),
      stage: l.stage.title.toLowerCase(),
      stageEn: l.stage.en.toLowerCase(),
      rule: l.rule.replace(/<[^>]+>/g, "").toLowerCase(),
    });
    l.words.forEach((raw) => {
      const p = Phonics.parseWord(raw);
      items.push({
        type: "word",
        l,
        text: p.text,
        zh: p.zh,
        emoji: p.emoji,
        ipa: ipaOf(p.text),
      });
    });
    l.sentences.forEach((s, i) => {
      const [en, zh] = s.split("|");
      items.push({ type: "sent", l, i, en, zh });
    });
  });
  G_LESSONS.forEach((l) => {
    const extra = [
      ...(l.forms || []).flatMap((f) => f.parts),
      ...(l.signals || []),
    ]
      .join(" ")
      .toLowerCase();
    items.push({
      type: "grammar",
      l,
      title: l.title.toLowerCase(),
      en: l.en.toLowerCase(),
      extra,
      stage: l.stage.title.toLowerCase(),
      rule: (l.intro + l.rule).replace(/<[^>]+>/g, "").toLowerCase(),
    });
  });
  return items;
}

export function scoreItem(
  it: IndexedItem,
  q: string,
  qi: string,
  zhQ: boolean,
  ipaQ: boolean,
) {
  if (it.type === "lesson") {
    // 优先级：课号 / 字母组合 > 课程标题 > 英文副标题（按单词开头）> 阶段名 > 规则正文（仅中文查询）
    if (it.l.id === q) return 100;
    let best = 0;
    const up = (v: number) => {
      if (v > best) best = v;
    };
    for (const g of it.gs) {
      if (g === q) up(100);
      else if (q.length >= 2 && g.startsWith(q)) up(60);
    }
    if (it.title === q) up(100);
    else if (it.title.startsWith(q)) up(75);
    else if (q.length >= 2 && it.title.includes(q)) up(55);
    const wordStart = (txt: string) =>
      txt.split(/[^a-z]+/).some((w) => w.startsWith(q));
    if (ipaQ && it.en.includes(q)) up(50);
    else if (q.length >= 3 && wordStart(it.en)) up(40);
    if (zhQ && it.stage.includes(q)) up(35);
    else if (q.length >= 3 && wordStart(it.stageEn)) up(25);
    if (!best && zhQ && q.length >= 2 && it.rule.includes(q)) up(15);
    return best;
  }
  if (it.type === "grammar") {
    let best = 0;
    const up = (v: number) => {
      if (v > best) best = v;
    };
    if (it.title === q) up(100);
    else if (it.title.includes(q) && (zhQ || q.length >= 2))
      up(it.title.startsWith(q) ? 80 : 65);
    if (
      q.length >= 3 &&
      (it.en.includes(q) || it.en.split(/[^a-z]+/).some((w) => w.startsWith(q)))
    )
      up(45);
    if (q.length >= 2 && it.extra.includes(q)) up(40);
    if (zhQ && it.stage.includes(q)) up(35);
    if (!best && zhQ && q.length >= 2 && it.rule.includes(q)) up(15);
    return best;
  }
  if (it.type === "word") {
    const t = it.text.toLowerCase();
    let sc = 0;
    if (t === q) sc = 95;
    else if (t.startsWith(q)) sc = 70 - Math.min(20, t.length - q.length);
    else if (q.length >= 2 && t.includes(q)) sc = 40;
    if (zhQ && it.zh.includes(q))
      sc = Math.max(sc, it.zh.split(/[；（]/)[0] === q ? 85 : 60);
    if (ipaQ && it.ipa && qi) {
      const ip = stripIpa(it.ipa);
      if (ip === qi) sc = Math.max(sc, 85);
      else if (ip.includes(qi)) sc = Math.max(sc, 45);
    }
    return sc;
  }
  if (q.length >= 3 && it.en.toLowerCase().includes(q)) return 25;
  if (zhQ && q.length >= 2 && it.zh.includes(q)) return 30;
  return 0;
}

let index: IndexedItem[] | undefined;
export function search(raw: string): SearchGroup[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  index ||= buildSearchIndex();
  const scored = index
    .map((it): [number, IndexedItem] => [
      scoreItem(
        it,
        q,
        stripIpa(q),
        /[一-鿿]/.test(q),
        /[æɑɔəɛɪʊʌɝɚθðʃʒŋː\/]/.test(q),
      ),
      it,
    ])
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0]);
  const groupDefinitions: [IndexedItem["type"], string, number][] = [
    ["lesson", "课程", 6],
    ["grammar", "语法", 5],
    ["word", "单词", 24],
    ["sent", "例句", 6],
  ];
  const groups: SearchGroup[] = groupDefinitions
    .map(([type, label, max]) => ({
      label,
      items: scored
        .filter(([, it]) => it.type === type)
        .slice(0, max)
        .map(([, it]) => ({
          ...it,
          href:
            it.type === "grammar"
              ? `./grammar/${it.l.id}`
              : `./lesson/${it.l.id}` +
                (it.type === "word"
                  ? `?w=${encodeURIComponent(it.text)}`
                  : it.type === "sent"
                    ? `?s=${it.i}`
                    : ""),
        })),
    }))
    .filter((g) => g.items.length);
  if (/^[a-z]{1,30}$/.test(q))
    groups.push({
      label: "词典",
      items: [{ type: "dict", w: q, href: `./dict/${q}` }],
    });
  return groups;
}
