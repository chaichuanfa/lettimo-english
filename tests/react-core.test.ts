import test from "node:test";
import assert from "node:assert/strict";
import { parseRoute } from "../src/router.ts";

test("path routes retain lesson links and query targets, malformed encoding does not crash", () => {
  assert.equal(
    parseRoute(
      "/phonics-learning/lesson/1-1?w=cat%3F%3D",
      "/phonics-learning/",
    ).params.get("w"),
    "cat?=",
  );
  assert.equal(
    parseRoute("/phonics-learning/grammar/", "/phonics-learning/").name,
    "grammar",
  );
  assert.equal(
    parseRoute("/other/lesson/1-1", "/phonics-learning/").name,
    "not-found",
  );
  assert.equal(parseRoute("/practice").name, "review");
  assert.equal(parseRoute("/lesson/1-1?w=cake").params.get("w"), "cake");
  assert.equal(parseRoute("/words/study?only=review").arg, "study");
  assert.equal(parseRoute("/dict/Cake").arg, "cake");
  assert.equal(parseRoute("/dict/%E0%A4%A").name, "dict");
  assert.equal(parseRoute("/unknown").name, "not-found");
  assert.equal(parseRoute("/phonics/extra").name, "not-found");
});

test("existing progress and settings survive React store initialization and updates", async () => {
  const values = new Map([
    [
      "phonics-path.progress",
      JSON.stringify({
        lessons: { "1-1": { done: true, stars: 3 } },
        last: "1-1",
        grammar: { "g1-1": { done: true } },
      }),
    ],
    [
      "phonics-path.settings",
      JSON.stringify({ rate: 0.7, zh: false, tts: true }),
    ],
    ["phonics-path.wrong", JSON.stringify(["cat|猫"])],
  ]);
  globalThis.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
  };
  const { App, saveAll } = await import("../src/state.ts");
  assert.equal(App.progress.lessons["1-1"].stars, 3);
  assert.equal(App.settings.rate, 0.75);
  assert.equal(App.settings.zh, false);
  App.progress.grammar["g2-1"] = { done: true, stars: 2 };
  saveAll();
  assert.equal(
    JSON.parse(values.get("phonics-path.progress") ?? "null").grammar["g2-1"]
      .stars,
    2,
  );
  assert.deepEqual(JSON.parse(values.get("phonics-path.wrong") ?? "null"), [
    "cat|猫",
  ]);
  globalThis.localStorage = {
    ...globalThis.localStorage,
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  };
  assert.doesNotThrow(saveAll);
});
