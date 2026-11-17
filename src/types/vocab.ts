/** Persistent vocabulary format shared with the unchanged VocabCore runtime. */
export interface VocabRecord {
  s: number;
  d: number | null;
  r: number;
  l: number;
  t: number;
  k?: 1;
}
export interface VocabSettings {
  book: string | null;
  newPerDay: number;
  reviewCap: number;
  spelling: boolean;
}
export interface VocabDay {
  n: number;
  k: number;
  r: number;
  ok: number;
}
export interface VocabData {
  v: 1;
  settings: VocabSettings;
  words: Record<string, VocabRecord>;
  days: Record<number, VocabDay>;
  custom: string[];
}
/** The runtime format guard checks only the version and an object-valued words field. */
export interface VocabImportEnvelope {
  v: 1;
  words: object;
}
export interface VocabImportData {
  v: 1;
  words: Record<string, VocabRecord>;
  settings?: Partial<VocabSettings>;
  days?: Record<number, VocabDay>;
  custom?: string[];
}
export interface VocabBook {
  id: string;
  name: string;
  desc: string;
  bit: number;
  not: number;
  count: number;
}
export interface VocabWord {
  w: string;
  ipa: string;
  g: string;
  i: number;
}
export interface VocabDataset {
  v: 1;
  books: VocabBook[];
  words: [word: string, ipa: string, gloss: string, bits: number][];
}
export type VocabStatus = "unseen" | "learning" | "familiar" | "mastered";
export interface VocabBookStats {
  total: number;
  unseen: number;
  learning: number;
  familiar: number;
  mastered: number;
}
export interface VocabPlan {
  due: number;
  dueWords: string[];
  learning: string[];
  backlog: "stop" | "half" | "none";
  introducedToday: number;
  unseen: number;
  newQuota: number;
}
export type VocabQuestionType =
  "meaning" | "audio" | "listen" | "spell" | "recall";
export type VocabTask = { w: string; retry?: boolean } & (
  | { kind: "learn" | "probe" | "verify"; qtype?: undefined }
  | { kind: "review" | "drill"; qtype: VocabQuestionType }
);
export interface VocabResult {
  ok?: boolean;
}
export interface VocabProgress {
  introduced: number;
  known: number;
  graduated: number;
  reviewDone: number;
  reviewRight: number;
  quota: number;
  reviewTotal: number;
  left: number;
}
export interface VocabSession {
  plan: VocabPlan;
  quota: number;
  reviewTotal: number;
  current(): VocabTask | null;
  submit(result: VocabResult): void;
  skip(): void;
  progress(): VocabProgress;
}
export interface VocabSessionOptions {
  data: VocabData;
  order: string[];
  today: number;
  now?: () => number;
  rng?: () => number;
  groupSize?: number;
  extra?: number;
  reviewOnly?: boolean;
}
export interface VocabOptions {
  options: string[];
  answer: string;
}
export interface VocabCoreAPI {
  INTERVALS: number[];
  MASTERED: number;
  LEECH_LAPSES: number;
  dayIndex(ms: number, tzOffsetMin?: number): number;
  dayToDate(day: number): Date;
  introduce(today: number, timestamp: number): VocabRecord;
  markKnown(today: number, timestamp: number): VocabRecord;
  graduate(record: VocabRecord, today: number, timestamp: number): VocabRecord;
  review(
    record: VocabRecord,
    ok: boolean,
    today: number,
    timestamp: number,
  ): VocabRecord;
  wrongAnswer(
    record: VocabRecord | undefined,
    today: number,
    timestamp: number,
  ): VocabRecord;
  questionType(
    stage: number,
    settings?: Partial<Pick<VocabSettings, "spelling">>,
  ): VocabQuestionType;
  emptyData(): VocabData;
  normalize(raw: unknown): VocabData;
  isValid(raw: unknown): raw is VocabImportEnvelope;
  mergeData(local: unknown, other: unknown): VocabData;
  planToday(data: VocabData, order: string[], today: number): VocabPlan;
  bookStats(data: VocabData, order: string[]): VocabBookStats;
  streak(data: VocabData, today: number): number;
  leeches(data: VocabData): string[];
  shortGloss(zh: unknown): string;
  glossPos(gloss: unknown): string;
  meaningOptions(
    target: Pick<VocabWord, "w" | "g">,
    pool: Pick<VocabWord, "w" | "g">[],
    rng: () => number,
  ): VocabOptions;
  wordOptions(
    target: Pick<VocabWord, "w"> & Partial<Pick<VocabWord, "ipa">>,
    pool: (Pick<VocabWord, "w"> & Partial<Pick<VocabWord, "ipa">>)[],
    rng: () => number,
  ): VocabOptions;
  shuffle<T>(items: T[], rng: () => number): T[];
  createSession(options: VocabSessionOptions): VocabSession;
}
