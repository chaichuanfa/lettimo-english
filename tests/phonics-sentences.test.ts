import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import type { Stage } from "../src/types/phonics";

test("each phonics lesson provides ten distinct bilingual examples", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    await readFile(new URL("../js/data.js", import.meta.url), "utf8"),
    context,
  );
  const stages = vm.runInContext("window.STAGES", context) as Stage[];
  const lessons = stages.flatMap((stage) => stage.lessons);
  assert.equal(lessons.length, 63);
  for (const lesson of lessons) {
    assert.equal(
      lesson.sentences.length,
      10,
      `${lesson.id}: expected ten examples`,
    );
    const english = new Set<string>();
    for (const sentence of lesson.sentences) {
      const parts = sentence.split("|");
      assert.equal(
        parts.length,
        2,
        `${lesson.id}: invalid bilingual separator`,
      );
      const [en, zh] = parts;
      assert.match(en, /[A-Za-z]/, `${lesson.id}: missing English`);
      assert.match(
        en,
        /[.!?]["']?$/,
        `${lesson.id}: missing English punctuation`,
      );
      assert.doesNotMatch(
        en,
        /[\u3400-\u9fff]/,
        `${lesson.id}: Chinese in English text`,
      );
      assert.match(
        zh,
        /[\u3400-\u9fff]/,
        `${lesson.id}: missing Chinese translation`,
      );
      assert.ok(
        !english.has(en.toLowerCase()),
        `${lesson.id}: repeated English sentence`,
      );
      english.add(en.toLowerCase());
    }
  }
});
