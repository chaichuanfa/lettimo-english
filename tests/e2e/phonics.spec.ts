import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    __said: string;
    __sid: string;
  }
}

async function silence(page: Page) {
  await page.evaluate(() => {
    window.__said = "";
    window.Speech.say = async (text) => {
      window.__said = text;
      return true;
    };
    window.Speech.phoneme = async (sid) => {
      window.__sid = sid;
      return true;
    };
    window.Speech.sequence = async () => true;
  });
}

test("phonics path, stage, lesson translations and manual completion persist", async ({
  page,
}) => {
  await page.goto("./phonics");
  await expect(page.locator(".unit")).toHaveCount(10);
  await page.locator(".unit-banner").first().click();
  await expect(page.locator(".lesson-list .lesson-row").first()).toBeVisible();
  await page.locator(".lesson-list .lesson-row").first().click();
  await expect(page.locator(".sound-card").first()).toBeVisible();
  await expect(page.locator(".word-card").first()).toBeVisible();
  await page.getByRole("button", { name: "隐藏中文", exact: true }).click();
  await expect(page.locator(".sentences")).toHaveClass(/nozh/);
  await page.getByRole("button", { name: "我已掌握，直接标记完成" }).click();
  await expect(page.locator(".done-badge")).toContainText("已完成");
  await page.reload();
  await expect(page.locator(".done-badge")).toContainText("已完成");
  await expect(page.locator(".sentences")).toHaveClass(/nozh/);
  await page.goto("./phonics");
  await expect(page.locator(".lp-node.done")).toHaveCount(1);
});

test("lesson quiz scores fifteen answers and persists three stars", async ({
  page,
}) => {
  await page.goto("./lesson/1-1");
  await silence(page);
  await page.getByRole("button", { name: "开始测验" }).click();
  for (let i = 0; i < 15; i++) {
    const prompt = await page.locator(".q-prompt").innerText();
    let answer;
    if (prompt.includes("是什么意思")) {
      const word = (await page.locator(".q-word").innerText()).replace(
        /\s|·/g,
        "",
      );
      answer = await page.evaluate((word) => {
        const raw = window.STAGES.flatMap((s) => s.lessons)
          .flatMap((l) => l.words)
          .find((w) => window.Phonics.parseWord(w).text === word);
        if (!raw) throw new Error(`No lesson word matches ${word}`);
        return window.Phonics.parseWord(raw).zh;
      }, word);
    } else {
      await page.locator(".q-body button").click();
      answer = await page.evaluate((prompt) => {
        const text = window.__said;
        if (!prompt.includes("补全")) return text;
        const lesson = window.STAGES[0].lessons[0];
        const segment = window.Phonics.analyze(text, lesson).segs?.find(
          (s) => s.hl && !s.silent,
        );
        if (!segment) throw new Error(`No highlighted segment for ${text}`);
        return segment.t;
      }, prompt);
    }
    await page
      .locator(".q-opts")
      .getByRole("button", { name: answer, exact: true })
      .click();
    await expect(page.locator(".q-feedback")).toContainText("正确！");
    await page
      .getByRole("button", {
        name: i === 14 ? "查看结果" : "下一题",
        exact: true,
      })
      .click();
  }
  await expect(page.locator("#quiz .r-score")).toHaveText("15/15");
  await expect(page.locator("#quiz .r-stars")).toHaveText("★★★");
  await page.reload();
  await expect(page.locator(".done-badge")).toContainText("★★★");
});

test("review offers all modes and wrong spelling enters both review stores", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("phonics-path.vocab"))
      localStorage.setItem(
        "phonics-path.vocab",
        JSON.stringify({
          v: 1,
          settings: {
            book: "custom",
            newPerDay: 20,
            reviewCap: 100,
            spelling: true,
          },
          words: {},
          days: {},
          custom: [],
        }),
      );
  });
  await page.goto("./review");
  await silence(page);
  await page.getByLabel("练习范围").selectOption("s1");
  await page.getByRole("button", { name: /听写拼词/ }).click();
  for (let i = 0; i < 10; i++) {
    await page
      .getByRole("textbox", { name: "输入单词" })
      .fill("definitelyincorrect");
    await page.getByRole("button", { name: "检查", exact: true }).click();
    await expect(page.locator("#game .q-feedback")).toContainText("正确拼写");
    await page
      .locator("#game")
      .getByRole("button", {
        name: i === 9 ? "查看结果" : "下一题",
        exact: true,
      })
      .click();
  }
  await expect(page.locator("#game .r-score")).toHaveText("0/10");
  const wrong = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("phonics-path.wrong") || "[]",
      ) as string[],
  );
  expect(wrong.length).toBeGreaterThan(0);
  const scheduled = await page.evaluate(() =>
    Object.keys(
      (
        JSON.parse(localStorage.getItem("phonics-path.vocab") || "{}") as {
          words: Record<string, unknown>;
        }
      ).words,
    ),
  );
  expect(scheduled.length).toBeGreaterThan(0);
  await page.reload();
  await silence(page);
  await page.getByLabel("练习范围").selectOption("wrong");
  await expect(page.getByLabel("练习范围")).toContainText(
    `错词本（${wrong.length} 个）`,
  );
  await page.getByRole("button", { name: /闪卡认读/ }).click();
  await expect(page.locator(".fc-reveal")).toBeHidden();
  await page
    .locator(".fc-btns")
    .getByRole("button", { name: "听发音", exact: true })
    .click();
  await expect(page.locator(".fc-reveal")).toBeVisible();
  await page.getByRole("button", { name: "我读对了 ✓", exact: true }).click();
  await expect(page.locator("#game .q-head")).toContainText("第 2 /");
  await page.getByLabel("练习范围").selectOption("s1");
  await page.getByRole("button", { name: /听音辨字母/ }).click();
  await expect(page.locator(".q-prompt")).toContainText("对应哪个字母组合");
  await page.locator("#game .opt").first().click();
  await expect(page.locator("#game .q-feedback")).toContainText("如");
  await page.getByRole("button", { name: /听音选词/ }).click();
  await expect(page.locator("#game .q-opts .opt")).toHaveCount(4);
});

test("sound chart exposes phonemes and all alphabet sounds", async ({
  page,
}) => {
  await page.goto("./sounds");
  await silence(page);
  await expect(page.locator(".ipa-grid")).toHaveCount(5);
  await expect(page.locator(".alpha-cell")).toHaveCount(26);
  await page
    .locator(".alpha-cell")
    .first()
    .getByRole("button", { name: "名字", exact: true })
    .click();
  expect(await page.evaluate(() => window.__sid)).toBe("a_l");
});

test("every phonics lesson renders its content without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./phonics");
  const lessons = await page.evaluate(() =>
    window.STAGES.flatMap((s) => s.lessons).map((l) => ({
      id: l.id,
      title: l.title,
      words: l.words.length,
      cards: l.cards?.length || 0,
      pairs: l.pairs?.length || 0,
      sight: l.sight?.length || 0,
    })),
  );
  for (const lesson of lessons) {
    await page.evaluate((id) => {
      history.pushState(null, "", new URL(`./lesson/${id}`, document.baseURI));
      dispatchEvent(new PopStateEvent("popstate"));
    }, lesson.id);
    await expect(page.locator("main h1")).toContainText(lesson.title);
    await expect(page.locator(".sentences > li")).toHaveCount(10);
    await expect(page.locator(".word-card")).toHaveCount(lesson.words);
    await expect(page.locator(".sound-card")).toHaveCount(lesson.cards);
    await expect(page.locator(".pair")).toHaveCount(lesson.pairs);
    await expect(page.locator(".sight-w")).toHaveCount(lesson.sight);
  }
  expect(errors).toEqual([]);
});

test("empty wrongbook is handled and flash, listening, sound rounds finish", async ({
  page,
}) => {
  await page.goto("./review");
  await silence(page);
  await page.getByLabel("练习范围").selectOption("wrong");
  await page.getByRole("button", { name: /听音选词/ }).click();
  await expect(page.locator("#game .empty")).toContainText("单词太少");
  await page.getByRole("button", { name: /听音辨字母/ }).click();
  await expect(page.locator("#game .empty")).toContainText("发音卡片太少");
  await page.getByLabel("练习范围").selectOption("s1");
  await page.getByRole("button", { name: /闪卡认读/ }).click();
  for (let i = 0; i < 10; i++)
    await page.getByRole("button", { name: "还不会", exact: true }).click();
  await expect(page.locator("#game .r-score")).toHaveText("0/10");
  await expect(page.locator("#game")).toContainText("没掌握的已加入错词本");
  await page.getByRole("button", { name: "清空错词本", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("phonics-path.wrong") || "[]",
        ) as string[],
    ),
  ).toEqual([]);
  for (const [mode, count] of [
    [/听音选词/, 10],
    [/听音辨字母/, 8],
  ] as const) {
    await page.getByRole("button", { name: mode }).click();
    for (let i = 0; i < count; i++) {
      await page.locator("#game .opt").first().click();
      await page
        .locator("#game")
        .getByRole("button", {
          name: i === count - 1 ? "查看结果" : "下一题",
          exact: true,
        })
        .click();
    }
    await expect(page.locator("#game .r-score")).toContainText(`/${count}`);
  }
});

test("lesson deep links reveal and focus word and sentence targets", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./lesson/1-2?w=cat");
  const word = page.locator('.word-card[data-word="cat"]');
  await expect(word).toHaveClass(/flash/);
  await expect(word.locator(".wc-word")).toBeFocused();
  await expect(word).toBeInViewport();
  await page.goto("./lesson/1-2?s=0");
  const sentence = page.locator('.sentences li[data-s="0"]');
  await expect(sentence).toHaveClass(/flash/);
  await expect(sentence.locator(".play")).toBeFocused();
  await expect(sentence).toBeInViewport();
  await expect(sentence).not.toHaveClass(/flash/, { timeout: 4000 });
  await page.goto("./lesson/1-2?w=%22%5D%5Bdata-invalid");
  await expect(page.locator("main h1")).toContainText("c k e h r m d");
  await expect(
    page.locator(".word-card.flash, .sentences li.flash"),
  ).toHaveCount(0);
});

test("expanded examples retain translations and sentence reading", async ({
  page,
}) => {
  await page.addInitScript(() => {
    speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      document.documentElement.dataset.spokenSentence = utterance.text;
      queueMicrotask(() => utterance.dispatchEvent(new Event("end")));
    };
  });
  await page.goto("./lesson/1-1?s=9");
  await expect(page.locator(".sentences > li")).toHaveCount(10);
  const sentence = page.locator(".sentences > li").last();
  await expect(sentence.locator(".play")).toBeFocused();
  const english = await sentence.locator(".en").innerText();
  await expect(sentence.locator(".zh")).toBeVisible();
  await page.evaluate(() => (window.App.settings.tts = true));
  await sentence.getByRole("button", { name: "朗读整句" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-spoken-sentence",
    english,
  );
  await expect(
    sentence.getByRole("button", { name: "朗读整句" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "隐藏中文", exact: true }).click();
  await expect(sentence.locator(".zh")).toBeHidden();
  await page.getByRole("button", { name: "显示中文", exact: true }).click();
  await expect(sentence.locator(".zh")).toBeVisible();
});
