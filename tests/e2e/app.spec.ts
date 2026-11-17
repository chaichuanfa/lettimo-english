import { test, expect } from "@playwright/test";
import type { Settings } from "../../src/types/app";
test("every route renders, old addresses work, navigation stops audio", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const routes = [
    ["", "今天学点什么"],
    ["phonics", "看到单词"],
    ["stage/1", "字母"],
    ["lesson/1-1", ""],
    ["grammar", "语法"],
    ["words", "单词"],
    ["review", "复习"],
    ["practice", "复习"],
    ["sounds", "音标总表"],
    ["guide", "学习指南"],
    ["dict", "词典"],
    ["no-such-page", "页面不存在"],
  ];
  for (const [route, title] of routes) {
    await page.goto(`./${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    if (title) await expect(page.locator("main h1")).toContainText(title);
  }
  expect(errors).toEqual([]);
});
test("search keyboard navigation, settings and existing progress survive refresh", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "phonics-path.progress",
      JSON.stringify({
        lessons: { "1-1": { done: true, stars: 3 } },
        last: "1-1",
        grammar: {},
      }),
    );
  });
  await page.goto("./");
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("combobox").fill("cake");
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveURL(/lesson/);
  await page
    .getByRole("button", { name: "更多：词典、音标总表、学习指南和设置" })
    .click();
  await page.getByRole("button", { name: /朗读速度/ }).click();
  expect(
    await page.evaluate(
      () =>
        (
          JSON.parse(
            localStorage.getItem("phonics-path.settings") || "{}",
          ) as Settings
        ).rate,
    ),
  ).toBe(0.75);
  await page.getByRole("button", { name: "切换到深色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("dictionary suggestions, details, custom words and missing word recovery", async ({
  page,
}) => {
  await page.goto("./dict");
  const input = page.getByRole("combobox", { name: "输入要查的英文单词" });
  await input.fill("night");
  await expect(
    page.getByRole("option").filter({ hasText: "night" }).first(),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "拼读拆解" })).toBeVisible();
  await expect(page.locator(".de-defs")).toContainText("夜");
  await page.getByRole("button", { name: "加入生词本", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已加入生词本", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "已加入生词本", exact: true }),
  ).toBeVisible();
  await input.fill("zzzzzzzzzz");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.locator(".dict-miss")).toBeVisible();
  await input.fill("cake");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.locator(".de-word")).toContainText("cake");
});
test("daily quote renders bilingual cache, survives failed refresh and updates at Beijing midnight", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-17T15:59:30Z") });
  await page.route("**/data/daily-quote.json", (r) =>
    r.fulfill({
      json: {
        date: "2026-11-17",
        english: "Learn something today.",
        chinese: "今天学点东西。",
        audio: "",
      },
    }),
  );
  await page.goto("./");
  await expect(page.locator(".dq-english")).toHaveText(
    "Learn something today.",
  );
  await expect(page.locator(".dq-chinese")).toHaveText("今天学点东西。");
  await page.route("**/data/daily-quote.json", (r) =>
    r.fulfill({
      json: {
        date: "2026-11-18",
        english: "A new day.",
        chinese: "新的一天。",
        audio: "",
      },
    }),
  );
  await page.clock.fastForward(61000);
  await expect(page.locator(".dq-english")).toHaveText("A new day.");
  await page.route("**/data/daily-quote.json", (r) =>
    r.fulfill({ status: 503 }),
  );
  await page.clock.fastForward(86400000);
  await expect(page.locator(".dq-english")).toHaveText("A new day.");
});
test("mobile layouts fit viewport on all major screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of [
    "",
    "phonics",
    "stage/1",
    "lesson/1-1",
    "grammar",
    "words",
    "review",
    "sounds",
    "guide",
    "dict/beautiful",
  ]) {
    await page.goto(`./${hash}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBeTruthy();
  }
});

test("path navigation stays in the document and supports back, forward and refresh", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(
    () => (document.documentElement.dataset.navigationMarker = "kept"),
  );
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: "拼读", exact: true })
    .click();
  await expect(page).toHaveURL(/\/phonics$/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-navigation-marker",
    "kept",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "语法", exact: true })
    .click();
  await page.goBack();
  await expect(page).toHaveURL(/\/phonics$/);
  await expect(page.locator("main h1")).toContainText("看到单词");
  await page.goForward();
  await expect(page).toHaveURL(/\/grammar$/);
  await expect(page.locator("main h1")).toContainText("语法");
  await page.reload();
  await expect(page.locator("main h1")).toContainText("语法");
  expect(new URL(page.url()).hash).toBe("");
});

test("GitHub Pages fallback serves nested routes with assets and query targets intact", async ({
  page,
}) => {
  const { readFile } = await import("node:fs/promises");
  const shell = await readFile("dist/404.html", "utf8");
  await page.route("**/lesson/1-2?w=cat", (route) =>
    route.fulfill({ status: 404, contentType: "text/html", body: shell }),
  );
  const response = await page.goto("./lesson/1-2?w=cat");
  expect(response?.status()).toBe(404);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(
    page.locator('.word-card[data-word="cat"] .wc-word'),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        new URL(document.querySelector<HTMLImageElement>(".brand-mark")!.src)
          .pathname,
    ),
  ).toBe("/assets/phonics-logo.webp");
  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
});
