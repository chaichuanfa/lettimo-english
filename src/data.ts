import type {
  IndexedGrammarStage,
  IndexedGrammarLesson,
} from "./types/grammar";
export const { SOUNDS, STAGES, LEVELS, Phonics, Speech, G2P } = window;
export const LESSONS = STAGES.flatMap((stage) =>
  stage.lessons.map((l) => Object.assign(l, { stage })),
);
// Trusted repository content receives its runtime navigation indices once at startup.
export const GRAMMAR = window.GRAMMAR as IndexedGrammarStage[];
export const G_LESSONS: IndexedGrammarLesson[] = GRAMMAR.flatMap((stage, i) => {
  stage.no = i + 1;
  return stage.lessons.map((l, j) =>
    Object.assign(l, { stage, no: `${i + 1}-${j + 1}` }),
  );
});
export const lessonById = (id: string | number) =>
  LESSONS.find((l) => l.id === String(id));
export const levelOf = (stage: { level: string }) =>
  LEVELS.find((l) => l.key === stage.level) || LEVELS[0];
export function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const sample = <T>(list: readonly T[], n: number) =>
  shuffle(list).slice(0, n);
export const stars = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
export const passMark = (n: number) => Math.ceil((n * 2) / 3);
export const quizStars = (score: number, total: number) =>
  score >= total ? 3 : score >= total - 2 ? 2 : 1;
function announce<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
) {
  return (...args: Args): Result => {
    window.dispatchEvent(new Event("phonics:audio-start"));
    return fn(...args);
  };
}
Speech.say = announce(Speech.say.bind(Speech));
Speech.clip = announce(Speech.clip.bind(Speech));
Speech.phoneme = announce(Speech.phoneme.bind(Speech));
Speech.sequence = announce(Speech.sequence.bind(Speech));
Speech.stop = announce(Speech.stop.bind(Speech));
