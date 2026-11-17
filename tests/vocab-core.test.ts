// 背单词核心逻辑的测试：node --test tests/
// 这些用例也是规格——移动端重写排期逻辑时应通过同样的用例。
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type {
  VocabCoreAPI,
  VocabSettings,
  VocabSession,
  VocabTask,
  VocabResult,
  VocabDay,
} from "../src/types/vocab.ts";
const C: VocabCoreAPI = createRequire(import.meta.url)("../js/vocab-core.js");

const rngOf = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const fresh = (over: Partial<VocabSettings> = {}) => {
  const d = C.emptyData();
  Object.assign(d.settings, { book: "x", newPerDay: 20, reviewCap: 100 }, over);
  return d;
};
const words = (n: number, p = "w") =>
  Array.from({ length: n }, (_, i) => p + String(i).padStart(3, "0"));
// 跑完一次学习。policy(task) 返回提交的结果
function run(
  s: VocabSession,
  policy: (task: VocabTask) => VocabResult,
  limit = 5000,
) {
  const seen: VocabTask[] = [];
  for (let i = 0; i < limit; i++) {
    const t = s.current();
    if (!t) return seen;
    seen.push({ ...t });
    s.submit(policy(t));
  }
  throw new Error("学习没有结束");
}
// 新词全是生词（摸底题答错），其余全答对
const allRight = (t: VocabTask) =>
  t.kind === "probe" ? { ok: false } : { ok: true };

test("天数：凌晨 4 点换日，不受时区影响", () => {
  const at = (h: number, m = 0) => Date.UTC(2026, 10, 16, h, m);
  assert.equal(C.dayIndex(at(3, 59), 0), C.dayIndex(at(0), 0));
  assert.equal(C.dayIndex(at(4), 0), C.dayIndex(at(3, 59), 0) + 1);
  // 北京时间（UTC+8，偏移 -480 分钟）11 月 17 日 03:00 仍算 16 日
  assert.equal(
    C.dayIndex(Date.UTC(2026, 10, 16, 19), -480),
    C.dayIndex(Date.UTC(2026, 10, 16, 2), -480),
  );
});

test("排期：答对升一级并按间隔表到期，过了 60 天那一关算掌握", () => {
  let r = C.graduate(C.introduce(100, 1), 100, 2);
  assert.deepEqual([r.s, r.d], [1, 101]);
  const dues = [];
  assert.notEqual(r.d, null);
  let day = r.d ?? 100;
  while (r.s < C.MASTERED) {
    r = C.review(r, true, day, 3);
    dues.push(r.d === null ? null : r.d - day);
    day = r.d ?? day;
  }
  assert.deepEqual(dues, [2, 4, 7, 15, 30, 60, null]);
  assert.equal(r.s, 8);
});

test("排期：答错降两级，最低第 1 阶段，并累计错误次数", () => {
  const r = C.review({ s: 5, d: 10, r: 4, l: 0, t: 1 }, false, 10, 2);
  assert.deepEqual([r.s, r.d, r.l], [3, 14, 1]);
  assert.equal(C.review({ s: 2, d: 10, r: 1, l: 0, t: 1 }, false, 10, 2).s, 1);
});

test("题型随阶段变难；关闭拼写后改为自评", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 7].map((s) => C.questionType(s, { spelling: true })),
    ["meaning", "meaning", "audio", "audio", "spell", "spell"],
  );
  assert.equal(C.questionType(6, { spelling: false }), "recall");
});

test("新词：5 个一组，先摸底（直接考），答错的看卡片，然后两种题各过一遍才算学会", () => {
  const data = fresh({ newPerDay: 5 });
  const s = C.createSession({
    data,
    order: words(30),
    today: 100,
    rng: rngOf(1),
    now: () => 5000,
  });
  const seen = run(s, allRight);
  assert.deepEqual(
    seen.map((t) => t.kind),
    [
      ...Array(5).fill("probe"),
      ...Array(5).fill("learn"),
      ...Array(10).fill("drill"),
    ],
  );
  assert.deepEqual(
    seen.filter((t) => t.kind === "drill").map((t) => t.qtype),
    [...Array(5).fill("meaning"), ...Array(5).fill("listen")],
  );
  assert.equal(Object.keys(data.words).length, 5);
  for (const w of words(5))
    assert.deepEqual([data.words[w].s, data.words[w].d], [1, 101]);
  assert.deepEqual(data.days[100], { n: 5, k: 0, r: 0, ok: 0 });
});

test("摸底：不问认不认识，直接考。连对两次才算认识并跳过；蒙对一次、复核答错的照样学；认识的词不占每日新词量", () => {
  const data = fresh({ newPerDay: 3 });
  const order = words(40);
  const s = C.createSession({ data, order, today: 100, rng: rngOf(2) });
  // w000 两次都答对；w001 第一次答对、复核答错；其余第一次就答错
  const seen = run(s, (t) => {
    if (t.kind === "probe") return { ok: t.w === "w000" || t.w === "w001" };
    if (t.kind === "verify") return { ok: t.w === "w000" };
    return { ok: true };
  });
  assert.equal(seen.map((t): string => t.kind).includes("screen"), false);
  assert.deepEqual(
    seen
      .filter((t) => t.kind === "verify")
      .map((t) => t.w)
      .sort(),
    ["w000", "w001"],
  );
  assert.deepEqual(
    [data.words.w000.s, data.words.w000.d, data.words.w000.k],
    [7, 160, 1],
  );
  assert.equal(data.words.w001.s, 1);
  assert.deepEqual(data.days[100], { n: 3, k: 1, r: 0, ok: 0 });
  assert.deepEqual(
    Object.keys(data.words)
      .filter((w) => !data.words[w].k)
      .sort(),
    ["w001", "w002", "w003"],
  ); // 真正新学的正好 3 个
  assert.equal(data.words.w004, undefined); // 名额用完，这个词留到下次
  assert.equal(C.planToday(data, order, 100).newQuota, 0); // 今天的量已学完
  // 学习卡片和巩固题要等这一组摸底、复核都结束之后
  const kinds = seen.map((t) => t.kind);
  assert.ok(
    kinds.lastIndexOf("probe") < kinds.indexOf("learn") &&
      kinds.lastIndexOf("verify") < kinds.indexOf("learn"),
  );
});

test("摸底：全都认识时一直往下测，不会超出每天的新词量", () => {
  const data = fresh({ newPerDay: 2 });
  const order = words(12);
  // 前 8 个词都认识，后面的都是生词
  run(C.createSession({ data, order, today: 100, rng: rngOf(11) }), (t) =>
    t.kind === "probe" ? { ok: +t.w.slice(1) < 8 } : { ok: true },
  );
  assert.deepEqual(data.days[100], { n: 2, k: 8, r: 0, ok: 0 });
  assert.deepEqual(
    order.filter((w) => data.words[w] && !data.words[w].k),
    ["w008", "w009"],
  );
});

test("巩固：答错的题隔几题重新出现，直到答对", () => {
  const data = fresh({ newPerDay: 5 });
  const s = C.createSession({
    data,
    order: words(5),
    today: 100,
    rng: rngOf(3),
  });
  let failed = false;
  const seen = run(s, (t) => {
    if (t.kind === "probe") return { ok: false };
    if (
      t.kind === "drill" &&
      t.w === "w002" &&
      t.qtype === "meaning" &&
      !failed
    ) {
      failed = true;
      return { ok: false };
    }
    return { ok: true };
  });
  const tries = seen.filter(
    (t) => t.kind === "drill" && t.w === "w002" && t.qtype === "meaning",
  );
  assert.equal(tries.length, 2);
  assert.equal(tries[1].retry, true);
  assert.equal(data.words.w002.s, 1);
});

test("中断后继续：没巩固完的词（阶段 0）下次直接进入巩固，不重复计入新词", () => {
  const data = fresh({ newPerDay: 5 });
  const order = words(20);
  const s1 = C.createSession({ data, order, today: 100, rng: rngOf(4) });
  for (let i = 0; i < 5; i++) {
    s1.current();
    s1.submit({ ok: false });
  } // 只做完摸底就离开
  assert.equal(Object.values(data.words).filter((r) => r.s === 0).length, 5);
  const s2 = C.createSession({ data, order, today: 100, rng: rngOf(5) });
  const seen = run(s2, allRight);
  assert.equal(
    seen.some((t) => t.kind === "probe"),
    false,
  );
  assert.equal(data.days[100].n, 5);
  assert.equal(
    Object.values(data.words).every((r) => r.s === 1),
    true,
  );
});

test("复习：到期的词先复习，拖得最久的排最前；答错当次重考但只扣一次", () => {
  const data = fresh({ newPerDay: 0 });
  data.words = {
    old: { s: 3, d: 90, r: 3, l: 0, t: 1 },
    mid: { s: 5, d: 99, r: 5, l: 0, t: 1 },
    later: { s: 2, d: 101, r: 2, l: 0, t: 1 },
    done: { s: 8, d: null, r: 9, l: 0, t: 1 },
  };
  const s = C.createSession({ data, order: [], today: 100, rng: rngOf(6) });
  let n = 0;
  const seen = run(s, (t) => ({ ok: !(t.w === "mid" && n++ < 2) }));
  assert.deepEqual(
    seen.map((t) => [t.w, t.qtype, !!t.retry]),
    [
      ["old", "audio", false],
      ["mid", "spell", false],
      ["mid", "spell", true],
      ["mid", "spell", true],
    ],
  );
  assert.deepEqual([data.words.old.s, data.words.old.d], [4, 107]);
  assert.deepEqual(
    [data.words.mid.s, data.words.mid.d, data.words.mid.l],
    [3, 104, 1],
  );
  assert.equal(data.words.later.d, 101);
  assert.deepEqual(data.days[100], { n: 0, k: 0, r: 2, ok: 1 });
});

test("欠账：待复习超过上限时新词减半，超过两倍时停学新词；每天复习不超过上限", () => {
  const mk = (n: number) => {
    const d = fresh({ newPerDay: 20, reviewCap: 10 });
    words(n, "r").forEach((w) => {
      d.words[w] = { s: 2, d: 50, r: 2, l: 0, t: 1 };
    });
    return d;
  };
  const order = words(100);
  assert.deepEqual(
    [
      C.planToday(mk(10), order, 100).backlog,
      C.planToday(mk(10), order, 100).newQuota,
    ],
    ["none", 20],
  );
  assert.deepEqual(
    [
      C.planToday(mk(11), order, 100).backlog,
      C.planToday(mk(11), order, 100).newQuota,
    ],
    ["half", 10],
  );
  const p = C.planToday(mk(21), order, 100);
  assert.deepEqual(
    [p.backlog, p.newQuota, p.due, p.dueWords.length],
    ["stop", 0, 21, 10],
  );
});

test("再学一组：今天的量学完后可以额外学", () => {
  const data = fresh({ newPerDay: 5 });
  const order = words(30);
  run(C.createSession({ data, order, today: 100, rng: rngOf(7) }), allRight);
  assert.equal(C.createSession({ data, order, today: 100 }).current(), null);
  run(
    C.createSession({ data, order, today: 100, rng: rngOf(8), extra: 5 }),
    allRight,
  );
  assert.equal(data.days[100].n, 10);
});

test("跳过：查不到释义的词这次不出题，进度记录不动", () => {
  const data = fresh({ newPerDay: 0 });
  data.words = {
    a: { s: 2, d: 90, r: 2, l: 0, t: 1 },
    b: { s: 2, d: 95, r: 2, l: 0, t: 1 },
  };
  const s = C.createSession({ data, order: [], today: 100, rng: rngOf(9) });
  assert.equal(s.current()?.w, "a");
  s.skip();
  assert.equal(s.current()?.w, "b");
  s.submit({ ok: true });
  assert.equal(s.current(), null);
  assert.deepEqual(data.words.a, { s: 2, d: 90, r: 2, l: 0, t: 1 });
});

test('只复习：从"复习"页进来时不学新词，也不碰没巩固完的词', () => {
  const data = fresh({ newPerDay: 20 });
  data.words = {
    due: { s: 1, d: 100, r: 1, l: 0, t: 1 },
    half: { s: 0, d: 100, r: 0, l: 0, t: 1 },
  };
  const s = C.createSession({
    data,
    order: words(30),
    today: 100,
    rng: rngOf(10),
    reviewOnly: true,
  });
  const seen = run(s, allRight);
  assert.deepEqual(
    seen.map((t) => [t.kind, t.w]),
    [["review", "due"]],
  );
  assert.equal(data.words.half.s, 0);
  assert.equal(Object.keys(data.words).length, 2);
});

test("进度按单词记：在一本书里学过的词，在另一本书里算已学", () => {
  const data = fresh();
  data.words = {
    apple: { s: 8, d: null, r: 7, l: 0, t: 1 },
    pear: { s: 3, d: 200, r: 3, l: 0, t: 1 },
    fig: { s: 6, d: 200, r: 6, l: 0, t: 1 },
    kiwi: { s: 7, d: 200, r: 1, l: 0, t: 1, k: 1 },
  };
  assert.deepEqual(
    C.bookStats(data, ["apple", "pear", "fig", "kiwi", "plum"]),
    { total: 5, unseen: 1, learning: 1, familiar: 1, mastered: 2 },
  );
});

test("课程测验答错的词进入复习", () => {
  assert.deepEqual(C.wrongAnswer(undefined, 100, 9), {
    s: 1,
    d: 100,
    r: 0,
    l: 1,
    t: 9,
  });
  const r = C.wrongAnswer({ s: 6, d: 130, r: 6, l: 0, t: 1 }, 100, 9);
  assert.deepEqual([r.s, r.d, r.l], [4, 100, 1]);
  assert.equal(C.wrongAnswer({ s: 8, d: null, r: 9, l: 0, t: 1 }, 100, 9).s, 5);
});

test("连续天数和顽固词", () => {
  const data = fresh();
  const day = (counts: Partial<VocabDay>): VocabDay => ({
    n: 0,
    k: 0,
    r: 0,
    ok: 0,
    ...counts,
  });
  data.days = {
    97: day({ n: 1 }),
    98: day({ r: 3 }),
    99: day({ k: 2 }),
    95: day({ n: 9 }),
  };
  assert.equal(C.streak(data, 100), 3); // 今天还没学，从昨天往前数
  data.days[100] = day({ n: 1 });
  assert.equal(C.streak(data, 100), 4);
  data.words = {
    a: { s: 2, d: 1, r: 9, l: 3, t: 1 },
    b: { s: 8, d: null, r: 9, l: 5, t: 1 },
    c: { s: 2, d: 1, r: 2, l: 2, t: 1 },
  };
  assert.deepEqual(C.leeches(data), ["a"]);
});

test("合并进度：每个词取较新的一条，生词本取并集", () => {
  const a = fresh();
  const b = fresh({ book: "cet6" });
  a.words = {
    x: { s: 2, d: 5, r: 2, l: 0, t: 10 },
    y: { s: 1, d: 5, r: 1, l: 0, t: 30 },
  };
  b.words = {
    x: { s: 4, d: 9, r: 4, l: 0, t: 20 },
    y: { s: 5, d: 9, r: 5, l: 0, t: 5 },
    z: { s: 1, d: 3, r: 1, l: 0, t: 1 },
  };
  a.days = { 100: { n: 5, k: 1, r: 0, ok: 0 } };
  b.days = {
    100: { n: 2, k: 3, r: 7, ok: 6 },
    99: { n: 1, k: 0, r: 0, ok: 0 },
  };
  a.custom = ["p", "q"];
  b.custom = ["q", "r"];
  const m = C.mergeData(a, b);
  assert.deepEqual([m.words.x.s, m.words.y.s, m.words.z.s], [4, 1, 1]);
  assert.deepEqual(m.days[100], { n: 5, k: 3, r: 7, ok: 6 });
  assert.deepEqual(m.custom, ["p", "q", "r"]);
  assert.equal(m.settings.book, "x"); // 本机的设置优先
  assert.equal(C.isValid({ v: 2, words: {} }), false);
  assert.equal(C.normalize("garbage").settings.newPerDay, 10);
});

test("短释义：合并 vt./vi.，最多两个词性、每个两个义项，去掉括号说明", () => {
  assert.equal(
    C.shortGloss("vt. 放弃；抛弃；遗弃；使屈从\nn. 放任；无拘束；狂热"),
    "v. 放弃；抛弃　n. 放任；无拘束",
  );
  assert.equal(
    C.shortGloss("vi. 去；走\nvt. 忍受\nn. 尝试"),
    "v. 去；走　n. 尝试",
  );
  assert.equal(C.shortGloss("n. <美>消防队员"), "n. 消防队员");
  assert.equal(
    C.shortGloss("n. 炸土豆条；（作赌注用的）圆形筹码"),
    "n. 炸土豆条；圆形筹码",
  );
  assert.equal(C.shortGloss("毫米"), "毫米");
});

test("选项：四个不重复，含正确答案；意思重合的词和同根词不当干扰项", () => {
  const target = { w: "abandon", g: "v. 放弃；抛弃", ipa: "a" };
  const pool = [
    { w: "quit", g: "v. 离开；放弃", ipa: "b" },
    { w: "abandoned", g: "adj. 被抛弃的", ipa: "c" },
    { w: "gather", g: "v. 聚集；收集", ipa: "d" },
    { w: "borrow", g: "v. 借；借用", ipa: "e" },
    { w: "collect", g: "v. 收集；募捐", ipa: "f" },
    { w: "window", g: "n. 窗户", ipa: "g" },
    { w: "yellow", g: "adj. 黄色的", ipa: "h" },
    { w: "abound", g: "v. 富于；充满", ipa: "i" },
  ];
  for (let seed = 1; seed < 40; seed++) {
    const m = C.meaningOptions(target, pool, rngOf(seed));
    assert.equal(m.options.length, 4);
    assert.equal(new Set(m.options).size, 4);
    assert.ok(m.options.includes(m.answer));
    assert.ok(
      !m.options.includes("v. 离开；放弃") &&
        !m.options.includes("adj. 被抛弃的"),
    );
    assert.ok(
      !(
        m.options.includes("v. 聚集；收集") &&
        m.options.includes("v. 收集；募捐")
      ),
    ); // 两个干扰项之间也不能意思重合
    const w = C.wordOptions(target, pool, rngOf(seed));
    assert.equal(new Set(w.options).size, 4);
    assert.ok(
      w.options.includes("abandon") && !w.options.includes("abandoned"),
    );
    assert.ok(w.options.includes("abound")); // 拼写相近的优先
  }
});

test('选项：介词这类意思相近的虚词，不拿"在…之间""在…之上"去干扰"在；向"', () => {
  const target = { w: "at", g: "prep. 在；向" };
  const pool = [
    { w: "between", g: "prep. 在…之间" },
    { w: "on", g: "prep. 在…之上　adv. …上去" },
    { w: "in", g: "prep. 在…期间；在…之内　adv. 进入；朝里" },
    { w: "toward", g: "prep. 向；朝" },
    { w: "with", g: "prep. 用；随着" },
    { w: "of", g: "prep. 的；属于" },
    { w: "from", g: "prep. 来自；从" },
    { w: "collection", g: "n. 收集物；募捐" },
    { w: "gather", g: "v. 收集；聚集" },
  ];
  for (let seed = 1; seed < 30; seed++) {
    const m = C.meaningOptions(target, pool, rngOf(seed));
    assert.equal(m.options.length, 4);
    for (const bad of [
      "prep. 在…之间",
      "prep. 在…之上　adv. …上去",
      "prep. 在…期间；在…之内　adv. 进入；朝里",
      "prep. 向；朝",
    ])
      assert.ok(!m.options.includes(bad), bad);
    assert.ok(
      !(
        m.options.includes("n. 收集物；募捐") &&
        m.options.includes("v. 收集；聚集")
      ),
    );
  }
});
