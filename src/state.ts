import { useSyncExternalStore } from "react";
import type { AppState, LessonProgress } from "./types/app";
export function load<T>(key: string, fallback: T): T {
  try {
    return (
      (JSON.parse(
        localStorage.getItem("phonics-path." + key) ?? "null",
      ) as T | null) ?? fallback
    );
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem("phonics-path." + key, JSON.stringify(value));
  } catch {}
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const settings = object(load("settings", {})),
  progress = object(load("progress", {}));
export const App: AppState = {
  settings: {
    rate: typeof settings.rate === "number" ? settings.rate : 1,
    tts: typeof settings.tts === "boolean" ? settings.tts : false,
    zh: typeof settings.zh === "boolean" ? settings.zh : true,
    ...(typeof settings.gGrade === "string" ? { gGrade: settings.gGrade } : {}),
  },
  progress: {
    lessons: object(progress.lessons) as Record<string, LessonProgress>,
    last: typeof progress.last === "string" ? progress.last : null,
    grammar: object(progress.grammar) as Record<string, LessonProgress>,
  },
  wrong: load<string[]>("wrong", []),
  gwrong: load<string[]>("gwrong", []),
};
if (!Array.isArray(App.wrong)) App.wrong = [];
if (!Array.isArray(App.gwrong)) App.gwrong = [];
export const RATES = [1, 0.75, 0.5];
App.settings.rate = RATES.reduce((a, b) =>
  Math.abs(b - App.settings.rate) < Math.abs(a - App.settings.rate) ? b : a,
);
if (typeof window !== "undefined") window.App = App;
let revision = 0;
const listeners = new Set<() => void>();
export function saveAll() {
  for (const key of ["settings", "progress", "wrong", "gwrong"] as const)
    save(key, App[key]);
  revision++;
  listeners.forEach((fn) => fn());
}
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export function useApp() {
  useSyncExternalStore(subscribe, () => revision);
  return App;
}
export function resetProgress() {
  App.progress = { lessons: {}, last: null, grammar: {} };
  App.wrong = [];
  App.gwrong = [];
  saveAll();
}
