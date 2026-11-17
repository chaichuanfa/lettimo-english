import { test, expect, type Page } from "@playwright/test";

interface StoredGrammarProgress {
  grammar: Record<string, { done: boolean; stars: number; at: number }>;
}
interface StoredValues {
  progress: StoredGrammarProgress;
  gwrong: string[];
}
const storage = <Key extends keyof StoredValues>(
  page: Page,
  key: Key,
): Promise<StoredValues[Key]> =>
  page.evaluate(
    (k) =>
      JSON.parse(
        localStorage.getItem(`phonics-path.${k}`) ?? "null",
      ) as StoredValues[Key],
    key,
  );
const firstLessonAnswers = [
  "birds",
  "boxes",
  "children",
  "water",
  ["I", "have", "three", "red", "apples"],
  ["The", "babies", "are", "very", "cute"],
  "animals",
  "sheep",
  "butterflies",
  "teeth",
  "knives",
  "rice",
  ["Those", "men", "are", "my", "uncles"],
  ["There", "are", "some", "boxes", "under", "the", "bed"],
  ["Two", "mice", "are", "eating", "cheese"],
];

async function answer(page: Page, value: string | string[]) {
  if (Array.isArray(value)) {
    for (const word of value)
      await page
        .locator(".g-bank")
        .getByRole("button", { name: word, exact: true })
        .first()
        .click();
    await page.getByRole("button", { name: "检查", exact: true }).click();
  } else {
    await page
      .locator(".g-opts")
      .getByRole("button", { name: value, exact: true })
      .click();
  }
  await expect(page.locator(".q-feedback .ok")).toBeVisible();
  await page.getByRole("button", { name: /下一题|查看结果/ }).click();
}

test("grammar grade filtering persists and hides courses from other grades", async ({
  page,
}) => {
  await page.goto("./grammar");
  await page.getByRole("button", { name: /^高中/ }).click();
  await expect(page.locator(".g-filter-btn.senior")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".lesson-row")).not.toHaveCount(0);
  await expect(
    page.locator(".lesson-row .g-grade.primary, .lesson-row .g-grade.junior"),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".g-filter-btn.senior")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /^全部/ }).click();
  await expect(
    page.locator('.lesson-row[href="./grammar/g1-1"]'),
  ).toBeVisible();
});

test("lesson translation toggle and manual completion survive refresh", async ({
  page,
}) => {
  await page.goto("./grammar/g1-1");
  await page.getByRole("button", { name: "隐藏中文", exact: true }).click();
  await expect(page.locator(".g-sentences")).toHaveClass(/nozh/);
  await page.getByRole("button", { name: "我已掌握，直接标记完成" }).click();
  await expect(page.locator(".done-badge")).toContainText("已完成");
  await page.reload();
  await expect(page.locator(".done-badge")).toContainText("已完成");
  await expect(page.locator(".g-sentences")).toHaveClass(/nozh/);
  expect((await storage(page, "progress")).grammar["g1-1"]).toMatchObject({
    done: true,
    stars: 1,
  });
  await page.locator('.pager a[href="./grammar/gp-4"]').click();
  await expect(page.locator("h1")).toContainText("专有名词与名词所有格");
});

test("choice and ordering quiz awards three stars and restores completed progress", async ({
  page,
}) => {
  await page.goto("./grammar/g1-1");
  await page.getByRole("button", { name: /开始测验/ }).click();
  for (const value of firstLessonAnswers) await answer(page, value);
  await expect(page.locator(".result.pass")).toContainText("满分");
  await expect(page.locator(".r-score")).toHaveText("15/15");
  expect((await storage(page, "progress")).grammar["g1-1"]).toMatchObject({
    done: true,
    stars: 3,
  });
  await page.reload();
  await expect(page.locator(".done-badge")).toBeVisible();
  await page.goto("./grammar");
  await expect(page.locator('.lesson-row[href="./grammar/g1-1"]')).toHaveClass(
    /done/,
  );
});

test("wrong choice persists and a correct review removes its stable question key", async ({
  page,
}) => {
  await page.goto("./grammar/g1-1");
  await page.getByRole("button", { name: /开始测验/ }).click();
  await page
    .locator(".g-opts")
    .getByRole("button", { name: "bird", exact: true })
    .click();
  await expect(page.locator(".q-feedback")).toContainText("正确答案：birds");
  await expect(page.locator(".g-q")).toHaveText(
    "I can see five birds in the tree.",
  );
  expect(await storage(page, "gwrong")).toEqual([
    "g1-1|I can see five ___ in the tree.",
  ]);
  await page.goto("./review");
  await page.getByRole("button", { name: /重做错题/ }).click();
  await page
    .locator(".g-opts")
    .getByRole("button", { name: "birds", exact: true })
    .click();
  await expect(page.locator(".g-from")).toContainText("名词与单复数");
  await page.getByRole("button", { name: /查看结果/ }).click();
  await expect(page.locator("#gredo .result")).toContainText("还剩 0 道");
  expect(await storage(page, "gwrong")).toEqual([]);
});

test("ordering can undo and reset tiles, retains mistakes, then clears them on retry", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "phonics-path.gwrong",
      JSON.stringify(["g1-1|I have three red apples."]),
    ),
  );
  await page.goto("./review");
  await page.getByRole("button", { name: /重做错题/ }).click();
  const check = page.getByRole("button", { name: "检查", exact: true });
  await expect(check).toBeDisabled();
  await page
    .locator(".g-bank")
    .getByRole("button", { name: "I", exact: true })
    .click();
  await page
    .locator(".g-answer")
    .getByRole("button", { name: "I", exact: true })
    .click();
  await expect(page.locator(".g-answer .g-word")).toHaveCount(0);
  await page
    .locator(".g-bank")
    .getByRole("button", { name: "have", exact: true })
    .click();
  await page.getByRole("button", { name: "重新排", exact: true }).click();
  await expect(page.locator(".g-answer .g-word")).toHaveCount(0);
  for (const word of ["apples", "red", "three", "have", "I"])
    await page
      .locator(".g-bank")
      .getByRole("button", { name: word, exact: true })
      .click();
  await check.click();
  await expect(page.locator(".q-feedback")).toContainText(
    "正确的句子：I have three red apples.",
  );
  await expect(check).toBeDisabled();
  await page.getByRole("button", { name: /查看结果/ }).click();
  await expect(page.locator("#gredo .result")).toContainText("还剩 1 道");
  await page.getByRole("button", { name: /再做一轮/ }).click();
  await answer(page, ["I", "have", "three", "red", "apples"]);
  await expect(page.locator("#gredo .result")).toContainText("还剩 0 道");
  expect(await storage(page, "gwrong")).toEqual([]);
});

test("failed lesson keeps progress unfinished and retains every wrong choice for review", async ({
  page,
}) => {
  await page.goto("./grammar/g1-1");
  await page.getByRole("button", { name: /开始测验/ }).click();
  for (const value of firstLessonAnswers) {
    if (Array.isArray(value)) await answer(page, value);
    else {
      await page
        .locator(".g-opts button")
        .filter({ hasNotText: new RegExp(`^${value}$`) })
        .first()
        .click();
      await expect(page.locator(".q-feedback .no")).toBeVisible();
      await page.getByRole("button", { name: /下一题|查看结果/ }).click();
    }
  }
  await expect(page.locator(".result")).toContainText("还差一点");
  await expect(page.locator(".r-score")).toHaveText("5/15");
  await expect(page.locator(".done-badge")).toHaveCount(0);
  expect((await storage(page, "progress"))?.grammar?.["g1-1"]?.done).not.toBe(
    true,
  );
  expect(await storage(page, "gwrong")).toHaveLength(10);
  await expect(
    page.getByRole("button", { name: "再测一次", exact: true }),
  ).toBeVisible();
});

test("a lower passing score preserves the best stars from a previous completion", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "phonics-path.progress",
      JSON.stringify({
        lessons: {},
        last: null,
        grammar: { "g1-1": { done: true, stars: 3, at: 1 } },
      }),
    ),
  );
  await page.goto("./grammar/g1-1");
  await page.getByRole("button", { name: /开始测验/ }).click();
  for (const [index, value] of firstLessonAnswers.entries()) {
    if ([0, 1, 2, 3, 6].includes(index)) {
      await page
        .locator(".g-opts button")
        .filter({ hasNotText: new RegExp(`^${value}$`) })
        .first()
        .click();
      await page.getByRole("button", { name: /下一题|查看结果/ }).click();
    } else await answer(page, value);
  }
  await expect(page.locator(".result.pass")).toContainText("本课已完成");
  await expect(page.locator(".r-score")).toHaveText("10/15");
  expect((await storage(page, "progress")).grammar["g1-1"]).toMatchObject({
    done: true,
    stars: 3,
  });
});

test("ordering treats repeated words as separate movable tiles", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "phonics-path.gwrong",
      JSON.stringify(["gp-10|I like winter because I can skate."]),
    ),
  );
  await page.goto("./review");
  await page.getByRole("button", { name: /重做错题/ }).click();
  await expect(
    page.locator(".g-bank").getByRole("button", { name: "I", exact: true }),
  ).toHaveCount(2);
  await answer(page, ["I", "like", "winter", "because", "I", "can", "skate"]);
  await expect(page.locator("#gredo .result")).toContainText("还剩 0 道");
  expect(await storage(page, "gwrong")).toEqual([]);
});

test("wrong question review limits a round to ten and offers the remaining question", async ({
  page,
}) => {
  const prompts = [
    "I can see five ___ in the tree.",
    "There are two ___ on the table.",
    "The ___ are playing in the park.",
    "Please give me some ___.",
    "I have three red apples.",
    "The babies are very cute.",
    "There are many ___ in the zoo.",
    "The farmer has ten ___.",
    "Look at those ___! They are flying.",
    "He brushes his ___ every morning.",
    "There are three ___ in the kitchen.",
  ];
  await page.addInitScript(
    (questions) =>
      localStorage.setItem(
        "phonics-path.gwrong",
        JSON.stringify(questions.map((prompt) => `g1-1|${prompt}`)),
      ),
    prompts,
  );
  await page.goto("./review");
  await page.getByRole("button", { name: /重做错题/ }).click();
  await expect(page.locator(".q-head")).toContainText("第 1 / 10 题");
  for (const value of firstLessonAnswers.slice(0, 10))
    await answer(page, value);
  await expect(page.locator("#gredo .result")).toContainText("还剩 1 道");
  await page.getByRole("button", { name: /再做一轮/ }).click();
  await expect(page.locator(".q-head")).toContainText("第 1 / 1 题");
  await answer(page, "knives");
  await expect(page.locator("#gredo .result")).toContainText("还剩 0 道");
});
