import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { VocabData, VocabSettings } from "../../src/types/vocab";
type SeedData = Partial<Omit<VocabData, "settings">> & {
  settings?: Partial<VocabSettings>;
};

async function seed(page: Page, overrides: SeedData = {}) {
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("words-seeded")) return;
    localStorage.setItem(
      "phonics-path.vocab",
      JSON.stringify({
        v: 1,
        settings: {
          book: "custom",
          newPerDay: 5,
          reviewCap: 100,
          spelling: true,
          ...value.settings,
        },
        words: value.words || {},
        days: {},
        custom: value.custom || ["apple"],
      }),
    );
    sessionStorage.setItem("words-seeded", "1");
  }, overrides);
}
const stored = (page: Page): Promise<VocabData> =>
  page.evaluate(() =>
    window.VocabCore.normalize(
      JSON.parse(localStorage.getItem("phonics-path.vocab") ?? "null"),
    ),
  );

test("selecting a book and changing settings survives reload; list searches and paginates", async ({
  page,
}) => {
  await page.goto("./words");
  await page.getByRole("button", { name: /中考词汇/ }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByLabel("每天新词").selectOption("5");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.reload();
  await expect(page.getByText("正在学：")).toContainText("中考词汇");
  expect((await stored(page)).settings.newPerDay).toBe(5);
  await page.getByRole("link", { name: "单词列表", exact: true }).click();
  await page.getByRole("link", { name: "下一页" }).click();
  await expect(page.getByText("第 2 /")).toBeVisible();
  await page.getByLabel("搜索单词", { exact: true }).fill("apple");
  await expect(page.locator(".wl-word")).toHaveCount(1);
  await expect(page.locator(".wl-word")).toHaveText("apple");
});

test("unknown word learns, consolidates both question types, and persists tomorrow review", async ({
  page,
}) => {
  await seed(page);
  await page.goto("./words/study");
  await page.getByRole("button", { name: "不认识，直接学" }).click();
  await page.getByRole("button", { name: /记住了，继续/ }).click();
  await page.locator(".q-opts button").filter({ hasText: "苹果" }).click();
  await page.getByRole("button", { name: /^继续/ }).click();
  await page.getByRole("button", { name: "apple", exact: true }).click();
  await page.getByRole("button", { name: /^继续/ }).click();
  await expect(page.getByText("这次学习完成了！")).toBeVisible();
  expect((await stored(page)).words.apple.s).toBe(1);
  await page.reload();
  await expect(page.getByText("现在没有要学的词了。")).toBeVisible();
});

test("placement requires two correct answers before recording a known word", async ({
  page,
}) => {
  await seed(page);
  await page.goto("./words/study");
  await page.locator(".q-opts button").filter({ hasText: "苹果" }).click();
  await page.getByRole("button", { name: /^继续/ }).click();
  await expect(page.locator(".ws-kind")).toHaveText("新词 · 再确认一次");
  expect((await stored(page)).words.apple).toBeUndefined();
  await page.locator(".q-opts button").filter({ hasText: "苹果" }).click();
  await page.getByRole("button", { name: /^继续/ }).click();
  await expect(page.getByText("这次学习完成了！")).toBeVisible();
  expect((await stored(page)).words.apple.k).toBe(1);
});

for (const spelling of [true, false])
  test(`due review ${spelling ? "typing" : "self grade"} persists and excludes new words`, async ({
    page,
  }) => {
    await seed(page, {
      settings: { spelling },
      words: { apple: { s: 5, d: 0, r: 4, l: 0, t: 1 } },
      custom: ["apple", "cat"],
    });
    await page.goto("./words/study?only=review");
    if (spelling) {
      await page.getByLabel("输入单词").fill("apple");
      await page.getByRole("button", { name: "检查", exact: true }).click();
      await page.getByRole("button", { name: /^继续/ }).click();
    } else {
      await page.getByRole("button", { name: "显示答案" }).click();
      await page.getByRole("button", { name: "记得", exact: true }).click();
    }
    await expect(page.getByText("复习完成了！", { exact: true })).toBeVisible();
    const data = await stored(page);
    expect(data.words.apple.s).toBe(6);
    expect(data.words.cat).toBeUndefined();
  });

test("import merges newer records, rejects invalid data, exports and removes custom words", async ({
  page,
}) => {
  await seed(page, { words: { apple: { s: 2, d: 30000, r: 1, l: 0, t: 20 } } });
  await page.goto("./words");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const upload = (value: unknown) =>
    page.locator("#ws-file").setInputFiles({
      name: "words.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(value)),
    });
  await upload({
    v: 1,
    words: { apple: { s: 6, d: 30000, r: 8, l: 0, t: 100 } },
    custom: ["cat"],
  });
  await expect(page.getByRole("status")).toContainText("已导入");
  expect((await stored(page)).words.apple.s).toBe(6);
  expect((await stored(page)).custom).toEqual(["apple", "cat"]);
  await upload({ invalid: true });
  await expect(page.getByRole("status")).toContainText("导入失败");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出进度" }).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toMatch(
    /^english-path-words-\d{8}\.json$/,
  );
  const exportedPath = await exported.path();
  if (!exportedPath) throw new Error("Export download has no local path");
  const exportedData = await page.evaluate(
    (raw: unknown) => window.VocabCore.normalize(raw),
    JSON.parse(await readFile(exportedPath, "utf8")),
  );
  expect(exportedData.words.apple.s).toBe(6);
  expect(exportedData.custom).toEqual(["apple", "cat"]);
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("link", { name: "单词列表", exact: true }).click();
  await page
    .locator(".wl li")
    .filter({ hasText: "apple" })
    .getByRole("button", { name: "移出生词本" })
    .click();
  await expect(page.locator(".wl-word")).toHaveText(["cat"]);
  expect((await stored(page)).words.apple.s).toBe(6);
});

test("a five-word group finishes placement before cards, can pause, and resumes unfinished progress after reload", async ({
  page,
}) => {
  await seed(page, { custom: ["apple", "cat", "dog", "book", "water", "pen"] });
  await page.goto("./words/study");
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "不认识，直接学" }).click();
  await expect(page.locator(".ws-kind")).toHaveText("新词 · 学习");
  expect(Object.keys((await stored(page)).words)).toHaveLength(5);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(page.getByText("学习已暂停，进度已保存。")).toBeVisible();
  await page
    .locator("#ws-task")
    .getByRole("button", { name: "继续学习", exact: true })
    .click();
  await page.getByRole("button", { name: /记住了，继续/ }).click();
  await page.reload();
  await expect(page.locator(".ws-kind")).toHaveText("新词 · 学习");
  expect((await stored(page)).words.pen).toBeUndefined();
});

test("wrong due answer retries without counting a second review; keyboard advances", async ({
  page,
}) => {
  await seed(page, { words: { apple: { s: 2, d: 0, r: 1, l: 2, t: 1 } } });
  await page.goto("./words/study?only=review");
  await page
    .locator(".q-opts .opt")
    .filter({ hasNotText: "苹果" })
    .first()
    .click();
  await page.getByRole("button", { name: "看单词卡片" }).click();
  await expect(page.locator(".ws-inline-card .ws-card")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ws-kind")).toContainText("再来一次");
  await page.locator(".q-opts .opt").filter({ hasText: "苹果" }).click();
  await page.keyboard.press("Enter");
  await expect(page.getByText("复习完成了！", { exact: true })).toBeVisible();
  const data = await stored(page);
  expect(data.words.apple.s).toBe(1);
  expect(data.words.apple.l).toBe(3);
  expect(data.words.apple.r).toBe(2);
  expect(Object.values(data.days)[0]).toMatchObject({ r: 1, ok: 0 });
  await page.goto("./words/list?f=leech");
  await expect(page.locator(".wl-word")).toHaveText(["apple"]);
});

test("word book network failure shows actionable error", async ({ page }) => {
  await page.route("**/js/vocab/core.js", (route) => route.abort());
  await page.goto("./words");
  await expect(
    page.getByText("词书数据加载失败，请检查网络后刷新页面。"),
  ).toBeVisible();
});

test("dictionary saved-word toggle updates the vocabulary book and survives reload", async ({
  page,
}) => {
  await seed(page, { custom: ["cat"] });
  await page.goto("./dict/apple");
  await page.getByRole("button", { name: "加入生词本", exact: true }).click();
  expect((await stored(page)).custom).toEqual(["cat", "apple"]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已加入生词本", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("./words/list");
  await expect(page.locator(".wl-word")).toHaveText(["cat", "apple"]);
  await page.goto("./dict/apple");
  await page.getByRole("button", { name: "已加入生词本", exact: true }).click();
  expect((await stored(page)).custom).toEqual(["cat"]);
});

test("mobile word home, settings, list and study fit the viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const fits = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  await page.goto("./words");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await fits();
  await page.screenshot({
    path: testInfo.outputPath("words-mobile-settings.png"),
  });
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("link", { name: "单词列表", exact: true }).click();
  await expect(page.locator(".wl-word")).toHaveText(["apple"]);
  await fits();
  await page.goto("./words/study");
  await page.getByRole("button", { name: "不认识，直接学" }).click();
  await expect(page.locator(".ws-card .de-word")).toContainText("apple");
  await expect(page.locator(".ws-card .de-defs")).toBeVisible();
  await fits();
  await page.screenshot({ path: testInfo.outputPath("words-mobile-card.png") });
});

test("another tab changing saved words safely restarts active review and preserves both changes", async ({
  page,
  context,
}) => {
  await seed(page, {
    custom: ["cat"],
    words: { cat: { s: 1, d: 0, r: 0, l: 0, t: 1 } },
  });
  await page.goto("./words/study?only=review");
  await expect(page.locator(".q-word")).toHaveText("cat");
  const other = await context.newPage();
  await other.goto("./dict/dog");
  await other.getByRole("button", { name: "加入生词本", exact: true }).click();
  await expect(
    page.getByText(
      "另一个页面更新了单词进度。请从最新保存的进度重新开始本次学习。",
    ),
  ).toBeVisible();
  await expect(page.locator(".q-opts")).toHaveCount(0);
  await page.getByRole("button", { name: "从最新进度继续" }).click();
  await expect(page.locator(".q-word")).toHaveText("cat");
  await page.locator(".q-opts button").filter({ hasText: "猫" }).click();
  await page.getByRole("button", { name: /^继续/ }).click();
  await expect(page.getByText("复习完成了！", { exact: true })).toBeVisible();
  const data = await stored(page);
  expect(data.custom).toEqual(["cat", "dog"]);
  expect(data.words.cat).toMatchObject({ s: 2, r: 1 });
  expect(Object.values(data.days)[0]).toMatchObject({ r: 1, ok: 1 });
  await page.reload();
  await expect(page.getByText("现在没有到期要复习的词。")).toBeVisible();
  await other.close();
});
