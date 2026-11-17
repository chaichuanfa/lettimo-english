export type GrammarGrade = "小学" | "初中" | "高中";

export interface GrammarChoiceQuestion {
  c: string;
  o: string[];
  why: string;
  s?: never;
  zh?: never;
}

export interface GrammarOrderQuestion {
  s: string;
  zh: string;
  c?: never;
  o?: never;
  why?: never;
}

export type GrammarQuestion = GrammarChoiceQuestion | GrammarOrderQuestion;

export interface GrammarLessonData {
  id: string;
  grade: GrammarGrade;
  title: string;
  en: string;
  intro: string;
  rule: string;
  examples: string[];
  traps: string[];
  quiz: GrammarQuestion[];
  forms?: { label: string; parts: string[] }[];
  signals?: string[];
  table?: { head: string[]; rows: string[][] };
}

export interface GrammarStage {
  id: number | string;
  title: string;
  en: string;
  level: string;
  icon: string;
  desc: string;
  lessons: GrammarLessonData[];
}

export interface IndexedGrammarLesson extends GrammarLessonData {
  stage: IndexedGrammarStage;
  no: string;
}

export interface IndexedGrammarStage extends GrammarStage {
  no: number;
  lessons: IndexedGrammarLesson[];
}
