import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { App, useApp, saveAll } from "../state";
import {
  SOUNDS,
  STAGES,
  LESSONS,
  Phonics,
  Speech,
  lessonById,
  levelOf,
  shuffle,
  sample,
  stars,
  passMark,
  quizStars,
} from "../data";
import {
  Icon,
  SayButton,
  SoundButton,
  BlendScope,
  BlendButton,
  WordCard,
  WordTiles,
  IPASpans,
  Sentence,
  RichText,
  NotFound,
} from "../components/UI";
import { recordWrongWords } from "../vocab-store";

import type {
  Analysis,
  Lesson,
  ParsedWord,
  Segment,
  Sound,
  SoundKind,
  SoundCard as SoundCardData,
  Stage,
} from "../types/phonics";

type QuizFinish = (score: number, total: number, missed: string[]) => void;
interface QuestionBase {
  a: Analysis;
  prompt: string;
  options: string[];
  answer: string;
}
type Question = QuestionBase &
  (
    | { type: "listen" | "meaning" | "syll" }
    | { type: "gap"; seg: Segment }
    | { type: "sound"; sid: string }
  );
interface QuizResult {
  score: number;
  total: number;
  missed: string[];
}
interface LessonResult extends QuizResult {
  passed: boolean;
  rating: number;
}
type PracticeMode = "listen" | "spell" | "flash" | "sound";
interface PracticeGame {
  mode: PracticeMode;
  list: Analysis[];
  questions: Question[];
}
interface PracticeEntry {
  raw: string;
  lesson?: Lesson;
}
const QUIZ_N = 15;
const GRAPH_POOL = [
  "a",
  "e",
  "i",
  "o",
  "u",
  "sh",
  "ch",
  "th",
  "ck",
  "ng",
  "ee",
  "ea",
  "ai",
  "ay",
  "oa",
  "ow",
  "ou",
  "oi",
  "oy",
  "oo",
  "ar",
  "or",
  "er",
  "ir",
  "ur",
  "aw",
  "au",
  "igh",
  "ie",
  "ue",
  "ew",
  "bl",
  "st",
  "tr",
  "kn",
  "wr",
];
const gDisplay = (g: string) => g.replace("_", "‿");
const ipa = (sid: string) => (SOUNDS[sid] ? `/${SOUNDS[sid].ipa}/` : "");
const ipaTokens = (text: string) =>
  window.IPA?.[text.toLowerCase()]?.split(" ") || [];
const isDone = (id: string) => !!App.progress.lessons[id]?.done;
const stageDone = (stage: Stage) =>
  stage.lessons.filter((l) => isDone(l.id)).length;
function IPA({
  text,
  className = "ipa",
}: {
  text: string;
  className?: string;
}) {
  const tokens = ipaTokens(text);
  return tokens.length ? (
    <IPASpans tokens={tokens} className={className} />
  ) : null;
}
function recordWrong(raws: string[]) {
  const words = raws.filter(Boolean);
  App.wrong = [...new Set([...App.wrong, ...words])].slice(-200);
  saveAll();
  recordWrongWords(words.map((raw) => Phonics.parseWord(raw).text));
}

function curve(points: number[][]) {
  if (!points.length) return "";
  const pair = (p: number[]) => p.map((v) => v.toFixed(1)).join(",");
  let d = `M${pair(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i],
      p1 = points[i],
      p2 = points[i + 1],
      p3 = points[i + 2] || p2;
    d += ` C${pair(p1.map((v, k) => v + (p2[k] - p0[k]) / 6))} ${pair(p2.map((v, k) => v - (p3[k] - p1[k]) / 6))} ${pair(p2)}`;
  }
  return d;
}
function UnitPath({
  stage,
  current,
  offset,
  done,
}: {
  stage: Stage;
  current: Lesson;
  offset: number;
  done: number;
}) {
  const root = useRef<HTMLOListElement>(null);
  const [geometry, setGeometry] = useState<{
    width: number;
    height: number;
    points: number[][];
  } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      if (!root.current) return;
      const box = root.current.getBoundingClientRect();
      const points = [...root.current.querySelectorAll(".lp-node")].map(
        (node) => {
          const r = node.getBoundingClientRect();
          return [
            r.left + r.width / 2 - box.left,
            r.top + r.height / 2 - box.top,
          ];
        },
      );
      setGeometry({ width: box.width, height: box.height, points });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [current, done]);
  let reach = -1;
  stage.lessons.forEach((l, i) => {
    if (isDone(l.id) || l === current) reach = i;
  });
  return (
    <ol className="unit-path" ref={root}>
      {geometry && (
        <svg
          className="lp-line"
          aria-hidden="true"
          width={geometry.width}
          height={geometry.height}
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        >
          <path className="lp-line-base" d={curve(geometry.points)} />
          {reach > 0 && (
            <path
              className="lp-line-done"
              d={curve(geometry.points.slice(0, reach + 1))}
            />
          )}
        </svg>
      )}
      {stage.lessons.map((l, k) => {
        const pr = App.progress.lessons[l.id],
          cur = l === current && done < LESSONS.length;
        const x =
          Math.round(Math.sin(((offset + k) * Math.PI) / 4) * 2300) / 1000;
        return (
          <li
            key={l.id}
            className={`lp-item${x > 0.05 ? " flip" : ""}`}
            style={{ "--x": x }}
          >
            <div className="lp-wrap">
              {cur && (
                <span className="lp-bubble" aria-hidden="true">
                  {done ? "继续" : "开始"}
                </span>
              )}
              <a
                className={`lp-node ${pr?.done ? "done" : cur ? "current" : "todo"}`}
                href={`./lesson/${l.id}`}
                aria-label={`第 ${l.id} 课 ${l.title}${pr?.done ? "（已完成）" : cur ? "（当前）" : ""}`}
              >
                {pr?.done ? (
                  <Icon name="check" />
                ) : cur ? (
                  <Icon name="play" />
                ) : (
                  <b>{k + 1}</b>
                )}
              </a>
              <a
                className="lp-label"
                href={`./lesson/${l.id}`}
                tabIndex={-1}
                aria-hidden="true"
              >
                <b>{l.title}</b>
                <small>{pr?.stars ? stars(pr.stars) : l.en}</small>
              </a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
export function PhonicsPage() {
  useApp();
  const done = LESSONS.filter((l) => isDone(l.id)).length;
  const current = LESSONS.find((l) => !isDone(l.id)) || LESSONS.at(-1);
  if (!current) return <NotFound />;
  const pct = Math.round((done / LESSONS.length) * 100);
  const demo = Phonics.analyze("ship|船|🚢", lessonById("4-1"));
  let offset = 0;
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">自然拼读 · Phonics</p>
          <h1>
            看到单词就会读，
            <br />
            听到发音就会拼。
          </h1>
          <p className="lead">
            10 个阶段、{LESSONS.length} 节课，从 26
            个字母的发音开始，一步步走到多音节长单词。每节课都有发音示范、拼读演示、例句和小测验。
          </p>
          <div className="hero-cta">
            <a className="btn primary" href={`./lesson/${current.id}`}>
              {done ? "继续学习" : "从第一课开始"}：{current.title}{" "}
              <Icon name="arrow" />
            </a>
            <a className="btn ghost" href="./guide">
              怎么学？
            </a>
            <a className="btn ghost" href="./sounds">
              音标总表
            </a>
          </div>
          <button
            className="hero-search"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("phonics:search"))
            }
          >
            <Icon name="search" />
            <span>搜单词、字母组合、音标或中文…</span>
            <kbd>/</kbd>
          </button>
        </div>
        <div className="hero-card">
          <BlendScope>
            <div className="demo-word" data-word={demo.text}>
              <SayButton className="wc-word big" text="ship">
                <WordTiles analysis={demo} />
              </SayButton>
              <IPA text="ship" className="wc-ipa big" />
              <BlendButton analysis={demo} className="chip-btn">
                <Icon name="blend" />
                <span>点我拼读 s‿h → /ʃ/</span>
              </BlendButton>
            </div>
          </BlendScope>
          <div className="progress-block">
            <div className="pb-row">
              <span>总进度</span>
              <b>{pct}%</b>
            </div>
            <div className="bar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="pb-row small">
              <span>
                已完成 {done} / {LESSONS.length} 课
              </span>
              <span>
                建议周期约 {STAGES.reduce((sum, st) => sum + st.weeks, 0)} 周
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="path">
        <h2 className="section-title">
          学习路径 <small>入门 → 基础 → 进阶 → 高级 → 精通</small>
        </h2>
        <div className="units">
          {STAGES.map((stage) => {
            const d = stageDone(stage),
              n = stage.lessons.length,
              start = offset;
            offset += n;
            return (
              <section
                className={`unit${d === n ? " complete" : ""}`}
                key={stage.id}
                style={{ "--lv": levelOf(stage).color }}
              >
                <a
                  className="unit-banner"
                  href={`./stage/${stage.id}`}
                  style={{ "--p": d / n }}
                >
                  <span className="ub-icon" aria-hidden="true">
                    {stage.icon}
                  </span>
                  <span className="ub-text">
                    <span className="ub-kicker">
                      {stage.level} · 第 {stage.id} 阶段 · 约 {stage.weeks} 周
                    </span>
                    <span className="ub-title">{stage.title}</span>
                    <span className="ub-en">{stage.en}</span>
                  </span>
                  <span
                    className="ub-ring"
                    aria-label={`已完成 ${d} / ${n} 课`}
                  >
                    <span>{d === n ? <Icon name="check" /> : `${d}/${n}`}</span>
                  </span>
                </a>
                <UnitPath
                  stage={stage}
                  current={current}
                  offset={start}
                  done={done}
                />
              </section>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function StagePage({ id }: { id: string }) {
  useApp();
  const stage = STAGES.find((s) => s.id === +id);
  if (!stage) return <NotFound />;
  const lv = levelOf(stage),
    prev = STAGES.find((s) => s.id === stage.id - 1),
    next = STAGES.find((s) => s.id === stage.id + 1);
  return (
    <>
      <section className="stage-head" style={{ "--lv": lv.color }}>
        <a className="crumb" href="./phonics">
          <Icon name="back" /> 拼读 · 学习路径
        </a>
        <div className="sh-row">
          <div className="sh-icon">{stage.icon}</div>
          <div>
            <p className="eyebrow">
              第 {stage.id} 阶段 · {stage.level} {lv.en} · 建议 {stage.weeks} 周
            </p>
            <h1>
              {stage.title} <small>{stage.en}</small>
            </h1>
          </div>
        </div>
        <p className="goal">
          <b>阶段目标：</b>
          {stage.goal}
        </p>
        <p className="intro">{stage.intro}</p>
      </section>
      <section className="lesson-list">
        {stage.lessons.map((l, i) => {
          const pr = App.progress.lessons[l.id];
          return (
            <a
              className={`lesson-row ${pr?.done ? "done" : ""}`}
              href={`./lesson/${l.id}`}
              key={l.id}
              style={{ "--lv": lv.color }}
            >
              <span className="lr-num">
                {pr?.done ? <Icon name="check" /> : i + 1}
              </span>
              <span className="lr-body">
                <span className="lr-title">{l.title}</span>
                <span className="lr-en">{l.en}</span>
              </span>
              <span className="lr-cards">
                {(l.cards || []).slice(0, 6).map((c, k) => (
                  <span className="mini-g" key={k}>
                    {gDisplay(c.g)}
                  </span>
                ))}
              </span>
              <span className="lr-stars">
                {pr?.stars ? stars(pr.stars) : ""}
              </span>
            </a>
          );
        })}
      </section>
      <nav className="pager">
        {prev ? (
          <a className="btn ghost" href={`./stage/${prev.id}`}>
            <Icon name="back" /> 第 {prev.id} 阶段
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="btn ghost" href={`./stage/${next.id}`}>
            第 {next.id} 阶段 <Icon name="arrow" />
          </a>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}

function SoundCard({ card: c }: { card: SoundCardData }) {
  const soundIds = c.s;
  const seq = Array.isArray(soundIds),
    silent = soundIds === "silent",
    sound = !seq ? SOUNDS[soundIds] : undefined;
  const tip =
    c.tip ||
    (sound && sound.type !== "combo" ? sound.tip : "") ||
    (silent
      ? `在这些单词里，${c.g} 写出来但不发音。`
      : seq
        ? `连缀：${soundIds.map(ipa).join(" + ")}，每个音都要发出来，快速连读。`
        : "");
  return (
    <div className="sound-card">
      <div className="sc-top">
        <span className="sc-g">{gDisplay(c.g)}</span>
        <span className="sc-ipa">
          {silent
            ? "不发音"
            : seq
              ? `/${soundIds.map((s) => SOUNDS[s].ipa).join("")}/`
              : ipa(soundIds)}
        </span>
      </div>
      <div className="sc-btns">
        {!silent &&
          (seq ? (
            <button
              className="btn small primary"
              onClick={() =>
                Speech.sequence(
                  soundIds.flatMap((s) => [
                    { type: "p" as const, v: s },
                    { type: "wait" as const, v: 80 },
                  ]),
                )
              }
            >
              <Icon name="play" /> 发音
            </button>
          ) : (
            <SoundButton className="btn small primary" sid={soundIds}>
              <Icon name="play" /> 发音
            </SoundButton>
          ))}
        {c.kw && (
          <SayButton className="btn small ghost" text={c.kw}>
            <Icon name="speaker" /> {c.kw}
          </SayButton>
        )}
      </div>
      <p className="sc-tip">{tip}</p>
    </div>
  );
}
export function LessonPage({
  id,
  params,
}: {
  id: string;
  params?: URLSearchParams;
}) {
  useApp();
  useEffect(() => {
    if (lessonById(id)) {
      App.progress.last = id;
      saveAll();
    }
  }, [id]);
  const lesson = lessonById(id);
  if (!lesson) return <NotFound />;
  return (
    <LessonContent
      key={id}
      lesson={lesson}
      wordTarget={params?.get("w") || ""}
      sentenceTarget={params?.get("s") ?? null}
    />
  );
}
function LessonContent({
  lesson: l,
  wordTarget,
  sentenceTarget,
}: {
  lesson: Lesson;
  wordTarget: string;
  sentenceTarget: string | null;
}) {
  const wordsRoot = useRef<HTMLDivElement>(null),
    sentencesRoot = useRef<HTMLOListElement>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setHighlight(null);
    const frame = requestAnimationFrame(() => {
      let target: HTMLElement | undefined,
        focus: HTMLElement | null | undefined,
        marker: string | null = null;
      if (wordTarget) {
        target = [
          ...(wordsRoot.current?.querySelectorAll<HTMLElement>(".word-card") ||
            []),
        ].find(
          (card) =>
            card.dataset.word?.toLowerCase() === wordTarget.toLowerCase(),
        );
        focus = target?.querySelector<HTMLElement>(".wc-word");
        marker = target ? `word:${target.dataset.word}` : null;
      } else if (sentenceTarget !== null && /^\d+$/.test(sentenceTarget)) {
        target = [
          ...(sentencesRoot.current?.querySelectorAll<HTMLElement>("li") || []),
        ].find((sentence) => sentence.dataset.s === sentenceTarget);
        focus = target?.querySelector<HTMLElement>(".play");
        marker = target ? `sentence:${sentenceTarget}` : null;
      }
      if (!target) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        block: "center",
        behavior: reduce ? "auto" : "smooth",
      });
      focus?.focus({ preventScroll: true });
      setHighlight(marker);
      timer = setTimeout(() => setHighlight(null), 2400);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [l.id, wordTarget, sentenceTarget]);
  const stage = l.stage,
    lv = levelOf(stage),
    index = LESSONS.indexOf(l),
    prev = LESSONS[index - 1],
    next = LESSONS[index + 1],
    pr = App.progress.lessons[l.id];
  const lessonWords = l.words.map((raw) => Phonics.parseWord(raw).text);
  let n = 1;
  return (
    <>
      <section className="lesson-head" style={{ "--lv": lv.color }}>
        <a className="crumb" href={`./stage/${stage.id}`}>
          <Icon name="back" /> 第 {stage.id} 阶段 · {stage.title}
        </a>
        <p className="eyebrow">
          第 {l.id} 课 · {stage.level}
        </p>
        <h1>
          {l.title} <small>{l.en}</small>
        </h1>
        {pr?.done && (
          <span className="done-badge">
            <Icon name="check" /> 已完成 {stars(pr.stars || 1)}
          </span>
        )}
      </section>
      {!!l.cards?.length && (
        <section className="block">
          <h2 className="block-title">
            <span className="num">{n++}</span>发音卡片
          </h2>
          <div className="cards">
            {l.cards.map((c, i) => (
              <SoundCard card={c} key={i} />
            ))}
          </div>
        </section>
      )}
      <section className="block">
        <h2 className="block-title">
          <span className="num">{n++}</span>规则讲解
        </h2>
        <div className="rule">
          <RichText html={l.rule} />
        </div>
        {l.table && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {l.table.head.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {l.table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((c, k) => (
                      <td key={k}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {l.pairs && (
        <section className="block">
          <h2 className="block-title">
            <span className="num">对比</span>短音 → 长音 / 最小对立词
          </h2>
          <div className="pairs">
            {l.pairs.map((pair) => {
              const [a, b] = pair.split(">");
              return (
                <button
                  className="pair"
                  key={pair}
                  onClick={() =>
                    Speech.sequence([
                      { type: "t", v: a },
                      { type: "wait", v: 450 },
                      { type: "t", v: b },
                    ])
                  }
                >
                  <span className="pw">
                    {a}
                    <IPA text={a} />
                  </span>
                  <Icon name="arrow" />
                  <span className="pw b">
                    {b}
                    <IPA text={b} />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="hint">点击一组，先后听两个单词，体会元音的变化。</p>
        </section>
      )}
      <section className="block">
        <h2 className="block-title">
          <span className="num">{n++}</span>示例单词{" "}
          <small>点单词听发音，点“拼读”看逐音演示</small>
        </h2>
        <div className="words" ref={wordsRoot}>
          {l.words.map((raw, i) => (
            <WordCard
              raw={raw}
              lesson={l}
              key={i}
              className={
                highlight === `word:${Phonics.parseWord(raw).text}`
                  ? "flash"
                  : ""
              }
            />
          ))}
        </div>
        <div className="legend">
          <span className="tile hl">ab</span> 本课重点{" "}
          <span className="tile silent">e</span> 不发音{" "}
          {l.words.some((raw) => raw.includes("·")) && (
            <>
              <span className="tile stress">ab</span> 重读音节
            </>
          )}
        </div>
      </section>
      {l.sight && (
        <section className="block">
          <h2 className="block-title">
            <span className="num">高频词</span>Sight Words — 整体认读
          </h2>
          <div className="sight">
            {l.sight.map((word) => (
              <SayButton key={word} text={word} className="sight-w">
                {word}
                <IPA text={word} />
              </SayButton>
            ))}
          </div>
        </section>
      )}
      <section className="block">
        <h2 className="block-title">
          <span className="num">{n++}</span>例句{" "}
          <small>点句子任意单词可单独听</small>
          <button
            className="link-btn"
            onClick={() => {
              App.settings.zh = !App.settings.zh;
              saveAll();
            }}
          >
            {App.settings.zh ? "隐藏中文" : "显示中文"}
          </button>
        </h2>
        <ol
          className={`sentences ${App.settings.zh ? "" : "nozh"}`}
          ref={sentencesRoot}
        >
          {l.sentences.map((sentence, i) => {
            const [en, zh] = sentence.split("|");
            return (
              <li
                key={i}
                data-s={i}
                className={highlight === `sentence:${i}` ? "flash" : undefined}
              >
                <SayButton
                  text={en}
                  toggle
                  className="icon-btn play"
                  title="朗读整句"
                  aria-label="朗读整句"
                >
                  <Icon name="play" />
                </SayButton>
                <div>
                  <p className="en">
                    <Sentence text={en} words={lessonWords} />
                  </p>
                  <p className="zh">{zh}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="block quiz-block">
        <h2 className="block-title">
          <span className="num">{n++}</span>小测验
        </h2>
        <div id="quiz" data-lesson={l.id}>
          <LessonQuiz lesson={l} />
        </div>
      </section>
      <nav className="pager">
        {prev ? (
          <a className="btn ghost" href={`./lesson/${prev.id}`}>
            <Icon name="back" /> {prev.title}
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="btn ghost" href={`./lesson/${next.id}`}>
            {next.title} <Icon name="arrow" />
          </a>
        ) : (
          <a className="btn ghost" href="./review">
            去复习
          </a>
        )}
      </nav>
    </>
  );
}

function buildQuestions(
  pool: (string | Analysis)[],
  count: number,
  lesson: Lesson,
): Question[] {
  const analyses: Analysis[] = pool.map((w) =>
    typeof w === "string" ? Phonics.analyze(w, lesson) : w,
  );
  const texts = new Set(analyses.map((a) => a.text));
  const extra = LESSONS.flatMap((l) => l.words.map(Phonics.parseWord)).filter(
    (a) => !texts.has(a.text),
  );
  const distract = (a: ParsedWord, key: "text" | "zh") =>
    [
      ...new Set(
        [
          ...shuffle(analyses.filter((b) => b.text !== a.text)),
          ...shuffle(extra),
        ]
          .map((b) => b[key])
          .filter((value) => value !== a[key]),
      ),
    ].slice(0, 3);
  const qs: Question[] = [],
    picks = shuffle(analyses),
    types = ["listen", "meaning", "gap"] as const;
  for (let k = 0; qs.length < count && k < picks.length * 3; k++) {
    const a: Analysis = picks[k % picks.length];
    let type: Question["type"] = types[qs.length % types.length];
    if (type === "gap" && !a.segs?.some((s) => s.hl && !s.silent))
      type = a.syllables ? "syll" : "listen";
    if (qs.some((q) => q.a.text === a.text && q.type === type)) continue;
    if (type === "listen")
      qs.push({
        type,
        a,
        prompt: "听发音，选出正确的单词",
        options: shuffle([a.text, ...distract(a, "text")]),
        answer: a.text,
      });
    else if (type === "meaning")
      qs.push({
        type,
        a,
        prompt: "这个单词是什么意思？",
        options: shuffle([a.zh, ...distract(a, "zh")]),
        answer: a.zh,
      });
    else if (type === "syll")
      qs.push({
        type,
        a,
        prompt: "这个单词有几个音节？",
        options: ["1", "2", "3", "4"],
        answer: String(a.syllables?.length || 0),
      });
    else {
      const seg = a.segs?.find((s) => s.hl && !s.silent);
      if (!seg) continue;
      const options = [
        seg.t,
        ...shuffle([
          ...(lesson?.cards || [])
            .map((c) => c.g)
            .filter((g) => !g.includes("_")),
          ...GRAPH_POOL,
        ]).filter((g) => g.length <= 3 && g !== seg.t),
      ];
      qs.push({
        type,
        a,
        seg,
        prompt: "听发音，补全缺少的字母",
        options: shuffle([...new Set(options)].slice(0, 4)),
        answer: seg.t,
      });
    }
  }
  return qs;
}
function QuestionProgress({
  index,
  count,
  score,
  flash = false,
}: {
  index: number;
  count: number;
  score: number;
  flash?: boolean;
}) {
  return (
    <div className="q-head">
      <span>
        第 {index + 1} / {count} {flash ? "张" : "题"}
      </span>
      <div className="bar">
        <i style={{ width: `${(index / count) * 100}%` }} />
      </div>
      <span>
        {flash ? "会读" : "得分"} {score}
      </span>
    </div>
  );
}
function ChoiceQuiz({
  questions,
  onFinish,
}: {
  questions: Question[];
  onFinish: QuizFinish;
}) {
  const [index, setIndex] = useState(0),
    [score, setScore] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [missed, setMissed] = useState<string[]>([]);
  const q = questions[index],
    a = q.a;
  useEffect(() => {
    if (!["listen", "gap", "sound"].includes(q.type)) return;
    const timer = setTimeout(
      () => (q.type === "sound" ? Speech.phoneme(q.sid) : Speech.say(a.text)),
      250,
    );
    return () => clearTimeout(timer);
  }, [q, a.text]);
  const answer = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    if (option === q.answer) setScore(score + 1);
    else if (a.raw) setMissed([...missed, a.raw]);
    Speech.say(a.text);
  };
  const next = () => {
    if (index + 1 === questions.length)
      onFinish(score, questions.length, missed);
    else {
      setIndex(index + 1);
      setSelected(null);
    }
  };
  return (
    <div className="quiz">
      <QuestionProgress index={index} count={questions.length} score={score} />
      <p className="q-prompt">{q.prompt}</p>
      <div className="q-body">
        {q.type === "listen" ? (
          <SayButton text={a.text} className="big-play">
            <Icon name="speaker" />
            <span>再听一遍</span>
          </SayButton>
        ) : q.type === "sound" ? (
          <SoundButton sid={q.sid} className="big-play">
            <Icon name="speaker" />
            <span>再听一遍</span>
          </SoundButton>
        ) : (
          <>
            <div className="q-word">
              {q.type === "meaning" ? (
                <WordTiles analysis={a} />
              ) : q.type === "syll" ? (
                a.text
              ) : (
                a.segs?.map((s, i) =>
                  q.type === "gap" && s === q.seg ? (
                    <span className="gap" key={i}>
                      ?
                    </span>
                  ) : (
                    <span className={s.silent ? "silent" : ""} key={i}>
                      {s.display}
                    </span>
                  ),
                )
              )}
            </div>
            {q.type === "meaning" && <IPA text={a.text} className="wc-ipa" />}
            <SayButton text={a.text} className="link-btn">
              <Icon name="speaker" />{" "}
              {q.type === "syll" ? "听发音（可以拍手数一数）" : "听发音"}
            </SayButton>
          </>
        )}
      </div>
      <div className={`q-opts ${q.type === "meaning" ? "zh" : ""}`}>
        {q.options.map((option) => (
          <button
            key={option}
            className={`opt${q.type === "sound" ? " mono" : ""}${selected !== null && option === q.answer ? " right" : ""}${selected === option && option !== q.answer ? " wrong" : ""}`}
            disabled={selected !== null}
            onClick={() => answer(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="q-feedback" aria-live="polite">
        {selected !== null && (
          <>
            {selected === q.answer ? (
              <b className="ok">✓ 正确！</b>
            ) : (
              <b className="no">✗ 正确答案：{q.answer}</b>
            )}{" "}
            <span>
              {q.type === "sound" ? (
                `${a.zh}，如 ${a.text}`
              ) : (
                <>
                  {a.text} <IPA text={a.text} /> · {a.zh}
                </>
              )}
            </span>{" "}
            <button className="btn small primary" onClick={next}>
              {index + 1 < questions.length ? "下一题" : "查看结果"}{" "}
              <Icon name="arrow" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function LessonQuiz({ lesson: l }: { lesson: Lesson }) {
  const [questions, setQuestions] = useState<Question[] | null>(null),
    [result, setResult] = useState<LessonResult | null>(null),
    [attempt, setAttempt] = useState(0);
  const pr = App.progress.lessons[l.id],
    next = LESSONS[LESSONS.indexOf(l) + 1];
  const start = () => {
    let pool = l.words;
    if (pool.length < QUIZ_N)
      pool = [
        ...pool,
        ...l.stage.lessons
          .flatMap((x) => x.words)
          .filter((w) => !pool.includes(w)),
      ];
    setQuestions(buildQuestions(pool, QUIZ_N, l));
    setResult(null);
    setAttempt(attempt + 1);
  };
  const finish: QuizFinish = (score, total, missed) => {
    const passed = score >= passMark(total),
      rating = quizStars(score, total);
    recordWrong(missed);
    if (passed) {
      App.progress.lessons[l.id] = {
        done: true,
        stars: Math.max(rating, App.progress.lessons[l.id]?.stars || 0),
        at: Date.now(),
      };
      saveAll();
    }
    setResult({ score, total, missed, passed, rating });
  };
  if (result)
    return (
      <div className={`result ${result.passed ? "pass" : ""}`}>
        <div className="r-score">
          {result.score}
          <small>/{result.total}</small>
        </div>
        <div className="r-stars">
          {result.passed ? stars(result.rating) : ""}
        </div>
        <p>
          {result.passed
            ? result.score === result.total
              ? "满分！太棒了 🎉"
              : "通过！本课已完成 👍"
            : "还差一点，再复习一下单词和例句，然后重试吧 💪"}
        </p>
        {!!result.missed.length && (
          <p className="hint">答错的单词已加入“复习”里的错词本。</p>
        )}
        <div className="r-btns">
          <button className="btn ghost" onClick={start}>
            再测一次
          </button>
          {result.passed && next && (
            <a className="btn primary" href={`./lesson/${next.id}`}>
              下一课：{next.title} <Icon name="arrow" />
            </a>
          )}
        </div>
      </div>
    );
  if (questions)
    return <ChoiceQuiz key={attempt} questions={questions} onFinish={finish} />;
  return (
    <>
      <p>
        共 {QUIZ_N} 题，答对 {passMark(QUIZ_N)} 题即可完成本课。
        {pr?.done ? `你的最好成绩：${stars(pr.stars || 1)}` : ""}
      </p>
      <button className="btn primary" onClick={start}>
        开始测验 <Icon name="arrow" />
      </button>
      {!pr?.done && (
        <button
          className="link-btn"
          onClick={() => {
            App.progress.lessons[l.id] = {
              done: true,
              stars: pr?.stars || 1,
              at: Date.now(),
            };
            saveAll();
          }}
        >
          我已掌握，直接标记完成
        </button>
      )}
    </>
  );
}

const LETTER_SOUND: Record<string, string> = {
  a: "a_s",
  b: "b",
  c: "k",
  d: "d",
  e: "e_s",
  f: "f",
  g: "g",
  h: "h",
  i: "i_s",
  j: "j",
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o_s",
  p: "p",
  q: "qu",
  r: "r",
  s: "s",
  t: "t",
  u: "u_s",
  v: "v",
  w: "w",
  x: "x",
  y: "y",
  z: "z",
};
const LETTER_KW: Record<string, string> = {
  a: "apple",
  b: "bed",
  c: "cat",
  d: "dog",
  e: "egg",
  f: "fan",
  g: "gum",
  h: "hat",
  i: "in",
  j: "jam",
  k: "kid",
  l: "leg",
  m: "map",
  n: "net",
  o: "octopus",
  p: "pig",
  q: "queen",
  r: "red",
  s: "sun",
  t: "top",
  u: "up",
  v: "van",
  w: "web",
  x: "box",
  y: "yes",
  z: "zip",
};
const SOUND_GROUPS = [
  [
    "short",
    "短元音",
    "Short Vowels",
    "元音字母在闭音节中的基本读音，最先学习。",
  ],
  ["long", "长元音", "Long Vowels", "多数长元音就是读字母本身的名字。"],
  [
    "other",
    "其他元音与双元音",
    "Other Vowels",
    "包括短 oo、双元音和最常见的弱读音 /ə/。",
  ],
  ["r", "R 控制元音", "R-Controlled", "元音后跟 r，美式发音需要卷舌。"],
  [
    "consonant",
    "辅音",
    "Consonants",
    "清辅音声带不振动，浊辅音声带振动，可以把手放在喉咙上感受。",
  ],
];
export function SoundsPage() {
  return (
    <>
      <section className="page-head">
        <a className="crumb" href="./phonics">
          <Icon name="back" /> 拼读
        </a>
        <p className="eyebrow">Sound Chart</p>
        <h1>音标总表</h1>
        <p className="lead">
          英语约有 44
          个音素。点击任意格子：先听这个音，再听关键词。悬停可查看发音要领。
        </p>
      </section>
      {SOUND_GROUPS.map(([type, zh, en, desc]) => (
        <section className="block" key={type}>
          <h2 className="block-title">
            {zh} <small>{en}</small>
          </h2>
          <p className="hint">{desc}</p>
          <div className="ipa-grid">
            {Object.entries(SOUNDS)
              .filter(
                (
                  entry,
                ): entry is [string, Extract<Sound, { type: SoundKind }>] =>
                  entry[1].type !== "combo" && entry[1].type === type,
              )
              .map(([sid, sound]) => (
                <SoundButton
                  key={sid}
                  sid={sid}
                  keyword={sound.kw}
                  className="ipa-cell"
                  title={sound.tip || ""}
                >
                  <span className="ic-ipa">/{sound.ipa}/</span>
                  <span className="ic-spell">{sound.spell.join(" · ")}</span>
                  <span className="ic-kw">{sound.kw}</span>
                </SoundButton>
              ))}
          </div>
        </section>
      ))}
      <section className="block">
        <h2 className="block-title">
          26 个字母：名字与声音 <small>Letter Names &amp; Sounds</small>
        </h2>
        <p className="hint">
          左边按钮读字母的<b>名字</b>（背字母表时用），右边按钮读字母的
          <b>声音</b>（拼读时用）。
        </p>
        <div className="alpha">
          {Object.keys(LETTER_SOUND).map((c) => (
            <div className="alpha-cell" key={c}>
              <span className="al-letter">
                {c.toUpperCase()}
                <i>{c}</i>
              </span>
              <span className="al-btns">
                {c === "a" ? (
                  <SoundButton className="chip-btn" sid="a_l">
                    名字
                  </SoundButton>
                ) : (
                  <SayButton className="chip-btn" text={c}>
                    名字
                  </SayButton>
                )}
                <SoundButton
                  className="chip-btn accent"
                  sid={LETTER_SOUND[c]}
                  keyword={LETTER_KW[c]}
                >
                  声音 {ipa(LETTER_SOUND[c])}
                </SoundButton>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function practicePool(range: string): PracticeEntry[] {
  if (range === "wrong")
    return App.wrong.map((raw: string) => ({
      raw,
      lesson: LESSONS.find((l) => l.words.includes(raw)),
    }));
  let lessons =
    range === "learned"
      ? LESSONS.filter((l) => isDone(l.id))
      : range === "all"
        ? LESSONS
        : STAGES.find((s) => `s${s.id}` === range)?.lessons || [];
  if (!lessons.length) lessons = LESSONS.slice(0, 6);
  return lessons.flatMap((lesson) =>
    lesson.words.map((raw) => ({ raw, lesson })),
  );
}
function SpellQuiz({
  list,
  onFinish,
}: {
  list: Analysis[];
  onFinish: QuizFinish;
}) {
  const [index, setIndex] = useState(0),
    [score, setScore] = useState(0),
    [missed, setMissed] = useState<string[]>([]),
    [value, setValue] = useState(""),
    [checked, setChecked] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    nextButton = useRef<HTMLButtonElement>(null),
    a = list[index];
  useEffect(() => {
    const timer = setTimeout(() => {
      Speech.say(a.text);
      input.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, [a]);
  useEffect(() => {
    if (checked) nextButton.current?.focus();
  }, [checked]);
  const correct = value.trim().toLowerCase() === a.text.toLowerCase();
  const check = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checked) return;
    setChecked(true);
    if (correct) setScore(score + 1);
    else setMissed([...missed, a.raw]);
  };
  const next = () => {
    if (index + 1 === list.length) onFinish(score, list.length, missed);
    else {
      setIndex(index + 1);
      setValue("");
      setChecked(false);
    }
  };
  return (
    <div className="quiz">
      <QuestionProgress index={index} count={list.length} score={score} />
      <p className="q-prompt">
        听发音，拼出这个单词 <span className="hint">提示：{a.zh}</span>
      </p>
      <div className="q-body">
        <SayButton text={a.text} className="big-play">
          <Icon name="speaker" />
          <span>再听一遍</span>
        </SayButton>
      </div>
      <form className="spell-form" autoComplete="off" onSubmit={check}>
        <input
          ref={input}
          id="spell-in"
          type="text"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="输入单词"
          placeholder="在这里输入…"
          value={value}
          disabled={checked}
          onChange={(event) => setValue(event.target.value)}
        />
        <button className="btn primary" type="submit" disabled={checked}>
          检查
        </button>
      </form>
      <div className="q-feedback" aria-live="polite">
        {checked && (
          <>
            {correct ? (
              <b className="ok">✓ 拼对了！</b>
            ) : (
              <b className="no">✗ 正确拼写：</b>
            )}{" "}
            <span className="q-word inline">
              <WordTiles analysis={a} />
            </span>{" "}
            <IPA text={a.text} />{" "}
            <button
              ref={nextButton}
              className="btn small primary"
              onClick={next}
            >
              {index + 1 < list.length ? "下一题" : "查看结果"}{" "}
              <Icon name="arrow" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function FlashQuiz({
  list,
  onFinish,
}: {
  list: Analysis[];
  onFinish: QuizFinish;
}) {
  const [index, setIndex] = useState(0),
    [known, setKnown] = useState(0),
    [missed, setMissed] = useState<string[]>([]),
    [revealed, setRevealed] = useState(false);
  const a = list[index];
  const judge = (yes: boolean) => {
    const score = known + (yes ? 1 : 0),
      wrong = yes ? missed : [...missed, a.raw];
    if (index + 1 === list.length) onFinish(score, list.length, wrong);
    else {
      Speech.stop?.();
      setKnown(score);
      setMissed(wrong);
      setIndex(index + 1);
      setRevealed(false);
    }
  };
  return (
    <div className="flash">
      <QuestionProgress index={index} count={list.length} score={known} flash />
      <BlendScope key={index}>
        <div className="flash-card" data-word={a.text}>
          <div className="fc-word">
            <WordTiles analysis={a} />
          </div>
          <p className="hint">先自己读一读，再点下面的按钮核对</p>
          <div className="fc-reveal" hidden={!revealed}>
            <IPA text={a.text} className="fc-ipa" />
            <span className="fc-emoji">{a.emoji || ""}</span> {a.zh}
          </div>
          <div className="fc-btns">
            <button
              className="btn ghost"
              onClick={() => {
                setRevealed(true);
                Speech.say(a.text);
              }}
            >
              <Icon name="speaker" /> 听发音
            </button>
            <BlendButton
              analysis={a}
              className="btn ghost"
              onClick={() => setRevealed(true)}
            >
              <Icon name="blend" /> 拼读演示
            </BlendButton>
          </div>
        </div>
      </BlendScope>
      <div className="fc-judge">
        <button className="btn no" onClick={() => judge(false)}>
          还不会
        </button>
        <button className="btn primary" onClick={() => judge(true)}>
          我读对了 ✓
        </button>
      </div>
    </div>
  );
}
const MODES: [PracticeMode, string, string][] = [
  ["listen", "👂 听音选词", "听发音，从四个单词中选出正确的一个"],
  ["spell", "✍️ 听写拼词", "听发音，用键盘拼出单词"],
  ["flash", "🃏 闪卡认读", "看单词先自己读，再听标准发音核对"],
  ["sound", "🔤 听音辨字母", "听一个音，选出它对应的字母组合"],
];
export function PhonicsPractice() {
  useApp();
  const learned = LESSONS.filter((l) => isDone(l.id));
  const [range, setRange] = useState(learned.length ? "learned" : "all"),
    [game, setGame] = useState<PracticeGame | null>(null),
    [error, setError] = useState<string | null>(null),
    [result, setResult] = useState<QuizResult | null>(null),
    [round, setRound] = useState(0);
  const gameRoot = useRef<HTMLElement>(null);
  const start = (mode: PracticeMode) => {
    Speech.stop?.();
    const pool = practicePool(range);
    setResult(null);
    setError(null);
    setRound(round + 1);
    if (pool.length < 4 && mode !== "sound") {
      setGame(null);
      setError("这个范围里的单词太少了，换一个范围试试。");
      return;
    }
    const list = sample(pool, Math.min(10, pool.length)).map((p) =>
      Phonics.analyze(p.raw, p.lesson),
    );
    let questions: Question[] = [];
    if (mode === "listen")
      questions = list.map((a) => {
        const others = [
          ...new Set(
            shuffle(
              pool.filter((p) => Phonics.parseWord(p.raw).text !== a.text),
            ).map((p) => Phonics.parseWord(p.raw).text),
          ),
        ].slice(0, 3);
        return {
          type: "listen",
          a,
          prompt: "听发音，选出正确的单词",
          options: shuffle([a.text, ...others]),
          answer: a.text,
        };
      });
    if (mode === "sound") {
      const sounds = [
        ...new Set(
          pool.flatMap((p) =>
            (p.lesson?.cards || [])
              .filter(
                (c) =>
                  typeof c.s === "string" &&
                  SOUNDS[c.s] &&
                  SOUNDS[c.s].type !== "combo",
              )
              .map((c) => `${c.g}|${c.s}`),
          ),
        ),
      ];
      if (sounds.length < 2) {
        setGame(null);
        setError("这个范围里的发音卡片太少，换一个范围试试。");
        return;
      }
      const allG = [
        ...new Set(LESSONS.flatMap((l) => (l.cards || []).map((c) => c.g))),
      ];
      questions = sample(sounds, Math.min(8, sounds.length)).map((gs) => {
        const [g, sid] = gs.split("|"),
          sameSound = sounds
            .filter((x) => x.endsWith(`|${sid}`))
            .map((x) => x.split("|")[0]);
        const options = [
          g,
          ...shuffle(allG)
            .filter((x) => !sameSound.includes(x))
            .slice(0, 3),
        ];
        return {
          type: "sound",
          a: {
            ...Phonics.analyze("kw" in SOUNDS[sid] ? SOUNDS[sid].kw : ""),
            zh: ipa(sid),
            raw: "",
          },
          sid,
          prompt: "听这个音，它对应哪个字母组合？",
          options: shuffle(options).map(gDisplay),
          answer: gDisplay(g),
        };
      });
    }
    setGame({ mode, list, questions });
  };
  useEffect(() => {
    if (game)
      gameRoot.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [round]);
  const finish: QuizFinish = (score, total, missed) => {
    recordWrong(missed);
    setResult({ score, total, missed });
  };
  return (
    <>
      <section className="block practice-setup">
        <h2 className="block-title">
          <span aria-hidden="true">🔤</span> 拼读{" "}
          <small>练习玩法和错词本</small>
        </h2>
        <div className="field">
          <label htmlFor="p-range">练习范围</label>
          <select
            id="p-range"
            name="range"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="learned">已完成的课程（{learned.length} 课）</option>
            <option value="wrong">错词本（{App.wrong.length} 个）</option>
            <option value="all">全部课程</option>
            {STAGES.map((s) => (
              <option key={s.id} value={`s${s.id}`}>
                第 {s.id} 阶段：{s.title}
              </option>
            ))}
          </select>
        </div>
        <div className="modes">
          {MODES.map(([mode, title, desc]) => (
            <button className="mode" key={mode} onClick={() => start(mode)}>
              <b>{title}</b>
              <span>{desc}</span>
            </button>
          ))}
        </div>
        {!!App.wrong.length && (
          <button
            className="link-btn"
            onClick={() => {
              Speech.stop?.();
              App.wrong = [];
              saveAll();
              setGame(null);
              setResult(null);
              setError(null);
            }}
          >
            清空错词本
          </button>
        )}
      </section>
      <section className="block" id="game" ref={gameRoot}>
        {result && game ? (
          <div className="result pass">
            <div className="r-score">
              {result.score}
              <small>/{result.total}</small>
            </div>
            <p>
              {game.mode === "flash"
                ? `会读 ${result.score} 个单词${result.missed.length ? "，没掌握的已加入错词本" : "，全部掌握！🎉"}`
                : result.score === result.total
                  ? "全对！🎉"
                  : "继续加油！"}
            </p>
            {game.mode !== "flash" && !!result.missed.length && (
              <p className="hint">答错的单词已加入错词本。</p>
            )}
            <div className="r-btns">
              <button className="btn primary" onClick={() => start(game.mode)}>
                再来一轮
              </button>
            </div>
          </div>
        ) : error ? (
          <p className="empty">{error}</p>
        ) : (
          game &&
          (game.mode === "spell" ? (
            <SpellQuiz key={round} list={game.list} onFinish={finish} />
          ) : game.mode === "flash" ? (
            <FlashQuiz key={round} list={game.list} onFinish={finish} />
          ) : (
            <ChoiceQuiz
              key={round}
              questions={game.questions}
              onFinish={finish}
            />
          ))
        )}
      </section>
    </>
  );
}
