import { useSyncExternalStore } from "react";
import type { VocabData } from "./types/vocab";

const KEY = "phonics-path.vocab";
const C = window.VocabCore;
let data: VocabData;
try {
  data = C.normalize(JSON.parse(localStorage.getItem(KEY) ?? "null"));
} catch {
  data = C.emptyData();
}
let revision = 0;
const listeners = new Set<() => void>();
const notify = () => {
  revision++;
  listeners.forEach((fn) => fn());
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const today = () => C.dayIndex(Date.now());
export const getVocab = () => data;
export function useVocab() {
  useSyncExternalStore(subscribe, () => revision);
  return data;
}
export function saveVocab() {
  let ok = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    ok = false;
  }
  notify();
  return ok;
}
export function updateVocab(fn: (data: VocabData) => void) {
  fn(data);
  return saveVocab();
}
export function vocabCounts() {
  let due = 0,
    learned = 0;
  for (const r of Object.values(data.words)) {
    if (r.s >= 1) learned++;
    if (r.s >= 1 && r.s < C.MASTERED && r.d !== null && r.d <= today()) due++;
  }
  return { due, learned, started: !!data.settings.book };
}
export const hasCustomWord = (word: string) => data.custom.includes(word);
export function removeCustomWord(word: string) {
  updateVocab((d) => {
    d.custom = d.custom.filter((w) => w !== word);
    if (!d.custom.length && d.settings.book === "custom")
      d.settings.book = null;
  });
}
// The dictionary button toggles membership, matching the existing saved-word control.
export function addCustomWord(word: string) {
  if (hasCustomWord(word)) {
    removeCustomWord(word);
    return false;
  }
  updateVocab((d) => {
    d.custom.push(word);
  });
  return true;
}
export function recordWrongWords(words: readonly unknown[]) {
  if (!data.settings.book) return;
  let changed = false;
  for (const raw of words) {
    const word = String(raw || "").toLowerCase();
    if (!/^[a-z]{2,}$/.test(word)) continue;
    data.words[word] = C.wrongAnswer(
      data.words[word],
      today(),
      Math.floor(Date.now() / 1000),
    );
    changed = true;
  }
  if (changed) saveVocab();
}
export function resetVocab() {
  data = C.emptyData();
  saveVocab();
}
window.addEventListener("storage", (event) => {
  if (event.key !== KEY && event.key !== null) return;
  try {
    data = C.normalize(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    data = C.emptyData();
  }
  notify();
});
