export interface Settings {
  rate: number;
  tts: boolean;
  zh: boolean;
  gGrade?: string;
}
export interface LessonProgress {
  done: boolean;
  stars: number;
  at?: number;
}
export interface Progress {
  lessons: Record<string, LessonProgress>;
  last: string | null;
  grammar: Record<string, LessonProgress>;
}
export interface AppState {
  settings: Settings;
  progress: Progress;
  wrong: string[];
  gwrong: string[];
}
export type SpeechStep =
  { type: "p" | "t"; v: string } | { type: "wait"; v: number } | (() => void);
export interface SpeechAPI {
  stop(): void;
  sleep(ms: number): Promise<void>;
  readonly token: number;
  say(text: string): Promise<boolean>;
  clip(url: string, text: string): Promise<boolean>;
  phoneme(sid: string): Promise<boolean>;
  sequence(items: SpeechStep[]): Promise<boolean>;
  hasPhoneme(sid: string): boolean;
}
export interface Quote {
  date: string;
  english: string;
  chinese: string;
  audio: string;
  source: string;
  sourceUrl: string;
}
export interface QuoteAPI {
  day(date?: Date): string;
  normalize(value: unknown): Quote | null;
  load(options?: {
    storage?: Storage | null;
    fetcher?: typeof fetch;
    today?: string;
  }): Promise<Quote | null>;
}
export type DictionaryRow = [
  ipa: string,
  zh?: string,
  lemma?: string,
  forms?: string,
  tags?: string,
  examples?: [string, string][],
];
export type DictionaryShard = Record<string, DictionaryRow>;
export interface DictionaryEntry {
  word: string;
  ipa: string[];
  zh: string;
  tags: string;
  ex: [string, string][];
  forms: [string, string][];
  lemma: { word: string; type: string } | null;
}
