import test from "node:test";
import assert from "node:assert/strict";
import {
  recommendStudy,
  pickChallenge,
  type Challenge,
} from "../src/features/dashboard.ts";
import type { Progress } from "../src/types/app.ts";
const lessons = [
  { id: "1-1", title: "字母入门" },
  { id: "1-2", title: "短元音" },
];
const grammar = [{ id: "g1-1", title: "名词" }];
const empty = (): Progress => ({ lessons: {}, grammar: {}, last: null });

test("recommendation prioritizes due words and mistakes over a new lesson", () => {
  assert.equal(
    recommendStudy(empty(), lessons, grammar, 3, 2, true).href,
    "./words/study?only=review",
  );
  assert.equal(
    recommendStudy(empty(), lessons, grammar, 0, 2, false).href,
    "./review",
  );
});
test("recommendation resumes an unfinished lesson and skips completed courses", () => {
  const p = empty();
  assert.equal(
    recommendStudy(p, lessons, grammar, 0, 0, false).href,
    "./lesson/1-1",
  );
  p.last = "1-2";
  assert.equal(
    recommendStudy(p, lessons, grammar, 0, 0, false).href,
    "./lesson/1-2",
  );
  p.lessons = {
    "1-1": { done: true, stars: 3 },
    "1-2": { done: true, stars: 3 },
  };
  assert.equal(
    recommendStudy(p, lessons, grammar, 0, 0, false).href,
    "./grammar/g1-1",
  );
  p.grammar["g1-1"] = { done: true, stars: 3 };
  assert.equal(
    recommendStudy(p, lessons, grammar, 0, 0, false).href,
    "./words",
  );
  assert.equal(
    recommendStudy(p, lessons, grammar, 0, 0, true).href,
    "./words/study",
  );
});
const pool: Challenge[] = ["grammar", "phonics", "words"].map((kind) => ({
  id: kind,
  kind: kind as Challenge["kind"],
  prompt: "Example",
  answer: "yes",
  options: ["yes", "no", "maybe"],
  explanation: "Because",
  href: "./phonics",
  lesson: "示例",
}));
test("daily challenge stays stable on reload, rotates categories, and preserves answer choices", () => {
  const days = ["2026-11-17", "2026-11-18", "2026-11-19"];
  const selected = days.map((day) => pickChallenge(pool, day)!);
  assert.equal(new Set(selected.map((q) => q.kind)).size, 3);
  for (let i = 0; i < days.length; i++) {
    assert.deepEqual(pickChallenge(pool, days[i]), selected[i]);
    assert.deepEqual([...selected[i].options].sort(), ["maybe", "no", "yes"]);
    assert.equal(selected[i].answer, "yes");
  }
  assert.deepEqual(pool[0].options, ["yes", "no", "maybe"]);
  assert.equal(pickChallenge([], days[0]), null);
});
