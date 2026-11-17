import { test, expect } from "@playwright/test";
import type { Progress, Settings } from "../../src/types/app";
import type { VocabData } from "../../src/types/vocab";

declare global {
  interface Window {
    __played: string[];
    __paused: number;
  }
}
test("all grammar lessons render authored content without runtime or React warnings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource"))
      errors.push(m.text());
  });
  await page.goto("./grammar");
  const lessons = await page.evaluate(() =>
    GRAMMAR.flatMap((s) =>
      s.lessons.map((l) => ({ id: l.id, title: l.title })),
    ),
  );
  expect(lessons.length).toBeGreaterThanOrEqual(77);
  for (const lesson of lessons) {
    await page.goto(`./grammar/${lesson.id}`);
    await expect(page.locator("h1")).toContainText(lesson.title);
    await expect(page.locator("#gquiz")).toBeVisible();
    await expect(page.locator(".sentences li")).not.toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
test("real local MP3 loads through the production subpath and can be stopped", async ({
  page,
}) => {
  await page.goto("./lesson/1-1");
  const response = page.waitForResponse(
    (r) => r.url().includes("/audio/") && r.url().endsWith(".mp3"),
  );
  await page.locator(".sentences .play").first().click();
  const r = await response;
  expect([200, 206]).toContain(r.status());
  expect(r.headers()["content-type"]).toMatch(/audio/);
  const stop = page.getByRole("button", { name: "停止朗读" });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(page.getByRole("button", { name: "停止朗读" })).toHaveCount(0);
});
test("React playback state follows blend interruption, sentence toggle and navigation cancellation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__played = [];
    window.__paused = 0;
    const timers = new WeakMap<HTMLMediaElement, number>();
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__played.push(this.src);
      timers.set(
        this,
        window.setTimeout(() => this.dispatchEvent(new Event("ended")), 500),
      );
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      window.__paused++;
      window.clearTimeout(timers.get(this));
      timers.delete(this);
    };
  });
  await page.goto("./dict/cat");
  await expect(page.locator(".de-word")).toBeVisible();
  await page
    .locator(".de-actions")
    .getByRole("button", { name: "拼读", exact: true })
    .click();
  await expect(page.locator(".de-word .tile.active")).toHaveCount(1);
  await expect(page.locator(".de-ipa .ip.active")).toHaveCount(1);
  await page
    .locator(".de-actions")
    .getByRole("button", { name: "发音", exact: true })
    .click();
  await expect(page.locator(".de-word .tile.active")).toHaveCount(0);
  await page.goto("./lesson/1-1");
  await page.locator(".sentences .play").first().click();
  await expect(page.locator(".sentences .play").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator(".wc-actions .icon-btn").first().click();
  await expect(page.locator(".sentences .play").first()).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator(".sentences .play").first().click();
  const paused = await page.evaluate(() => window.__paused);
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "首页" })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.__paused))
    .toBeGreaterThan(paused);
  await expect(page.locator(".playing")).toHaveCount(0);
});
test("private storage failure still allows lessons, dictionary and quote fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.locator("h1")).toContainText("今天学点");
  await page.goto("./lesson/1-1");
  await page.getByRole("button", { name: "我已掌握，直接标记完成" }).click();
  await expect(page.locator(".done-badge")).toBeVisible();
  await page.goto("./dict/cake");
  await expect(page.locator(".de-defs")).toBeVisible();
  expect(errors).toEqual([]);
});
test("unknown nested addresses and invalid lesson ids render the React not-found page", async ({
  page,
}) => {
  for (const route of [
    "lesson/not-real",
    "grammar/not-real",
    "stage/999",
    "words/nope",
    "phonics/extra",
  ]) {
    await page.goto("./" + route);
    await expect(
      page.getByRole("heading", { name: "页面不存在" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "返回首页", exact: true }).click();
    await expect(page.locator("h1")).toContainText("今天学点");
  }
});
test("clearing grammar wrongbook also discards the running redo question", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    const l = GRAMMAR[0].lessons[0],
      q = l.quiz[0];
    localStorage.setItem(
      "phonics-path.gwrong",
      JSON.stringify([`${l.id}|${q.c ?? q.s}`]),
    );
  });
  await page.reload();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "复习" })
    .click();
  await page.getByRole("button", { name: /重做错题/ }).click();
  await expect(page.locator("#gredo .quiz")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "清空错题本", exact: true }).click();
  await expect(page.locator("#gredo .quiz")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("phonics-path.gwrong") || "[]",
        ) as string[],
    ),
  ).toEqual([]);
});

test("guide reset requires confirmation and clears every learning store while retaining settings", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    localStorage.setItem(
      "phonics-path.progress",
      JSON.stringify({
        lessons: { "1-1": { done: true, stars: 3 } },
        last: "1-1",
        grammar: { "g1-1": { done: true, stars: 2 } },
      }),
    );
    localStorage.setItem("phonics-path.wrong", JSON.stringify(["cat|猫"]));
    localStorage.setItem(
      "phonics-path.gwrong",
      JSON.stringify(["g1-1|old question"]),
    );
    const data = VocabCore.emptyData();
    data.settings.book = "custom";
    data.custom = ["cat"];
    data.words.cat = { s: 1, d: 0, r: 1, l: 0, t: 1 };
    localStorage.setItem("phonics-path.vocab", JSON.stringify(data));
    localStorage.setItem(
      "phonics-path.settings",
      JSON.stringify({ rate: 0.75, tts: false, zh: true }),
    );
  });
  await page.reload();
  await page.goto("./guide");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "重置全部学习进度" }).click();
  expect(
    await page.evaluate(
      () =>
        (
          JSON.parse(
            localStorage.getItem("phonics-path.progress") || "{}",
          ) as Progress
        ).lessons["1-1"].done,
    ),
  ).toBe(true);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "重置全部学习进度" }).click();
  await page.reload();
  const state = await page.evaluate(() => {
    const read = (key: string): unknown =>
      JSON.parse(localStorage.getItem("phonics-path." + key) || "null");
    return {
      progress: read("progress") as Progress,
      wrong: read("wrong") as string[],
      gwrong: read("gwrong") as string[],
      vocab: read("vocab") as VocabData,
      settings: read("settings") as Settings,
    };
  });
  expect(state.progress).toEqual({ lessons: {}, last: null, grammar: {} });
  expect(state.wrong).toEqual([]);
  expect(state.gwrong).toEqual([]);
  expect(state.vocab.words).toEqual({});
  expect(state.vocab.custom).toEqual([]);
  expect(state.settings.rate).toBe(0.75);
});
