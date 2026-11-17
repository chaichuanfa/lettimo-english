export type SoundKind = "short" | "long" | "other" | "r" | "consonant";
export type Sound = {
  ipa: string;
  zh: string;
  seq?: string[];
} & (
  | { type: SoundKind; tip: string; spell: string[]; kw: string }
  | { type: "combo" }
);
export interface Level {
  key: string;
  en: string;
  color: string;
}
export interface SoundCard {
  g: string;
  s: string | string[];
  kw?: string;
  tip?: string;
  blend?: boolean;
  noMap?: boolean;
}
export interface Lesson {
  id: string;
  title: string;
  en: string;
  rule: string;
  words: string[];
  sentences: string[];
  cards?: SoundCard[];
  table?: { head: string[]; rows: string[][] };
  pairs?: string[];
  sight?: string[];
  stage: Stage;
}
export interface Stage {
  id: number;
  title: string;
  en: string;
  icon: string;
  level: string;
  weeks: number;
  goal: string;
  intro: string;
  lessons: Lesson[];
}
export interface Syllable {
  t: string;
  stress: boolean;
}
export interface ParsedWord {
  raw: string;
  text: string;
  zh: string;
  emoji: string;
  override: Record<string, string>;
  syllables: Syllable[] | null;
  manual: string[] | null;
}
export interface Segment {
  t: string;
  start: number;
  sid: string | null;
  silent: boolean;
  display?: string;
  hl?: boolean;
  seq?: string[];
  ph?: number[];
  cost?: number;
  magic?: boolean;
  magicE?: number;
}
export interface Analysis extends ParsedWord {
  segs: Segment[] | null;
  ipaMap?: number[][] | null;
  tokens?: string[];
  irregular?: boolean;
  syl?: number[] | null;
}
/** Shared visual contract for course words and dictionary-derived analyses. */
export type DisplayAnalysis = Pick<Analysis, "text" | "segs"> &
  Partial<Omit<Analysis, "text" | "segs">>;
export interface LessonInfo {
  priority: string[];
  soundMap: Record<string, string>;
  focus: string[];
  silentFocus: string[];
  ySounds: string[];
}
export interface PhonicsAPI {
  parseWord(raw: string): ParsedWord;
  analyze(raw: string | ParsedWord, lesson?: Pick<Lesson, "cards">): Analysis;
  lessonInfo(lesson: Pick<Lesson, "cards">): LessonInfo;
  alignIPA(
    analysis: DisplayAnalysis,
    tokens?: string[] | null,
  ): number[][] | null;
}
export interface G2PSegment extends Segment {
  ph: number[];
  cost: number;
  seq: string[];
}
export interface G2PAlignment {
  segs: G2PSegment[];
  cost: number;
  irregular: boolean;
}
export interface G2PAPI {
  align(word: string, tokens?: string[] | null): G2PAlignment | null;
  syllables(
    word: string,
    tokens: string[],
    segs?: G2PSegment[] | null,
    isWord?: (word: string) => boolean,
  ): number[];
  PH2SID: Record<string, string>;
}
