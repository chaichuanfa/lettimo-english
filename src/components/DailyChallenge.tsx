import { Mascot } from "./Mascot";
import React, { useEffect, useState } from "react";
import { G_LESSONS, LESSONS, Phonics, SOUNDS } from "../data";
import { load, save } from "../state";
import { pickChallenge, type Challenge } from "../features/dashboard";
import { Icon, SayButton } from "./UI";

const pool: Challenge[] = G_LESSONS.filter((l) => l.grade === "小学").flatMap(
  (lesson) =>
    lesson.quiz.flatMap((q, i): Challenge[] =>
      q.c
        ? [
            {
              id: `grammar:${lesson.id}:${i}`,
              kind: "grammar",
              prompt: q.c,
              options: q.o,
              answer: q.o[0],
              explanation: q.why,
              href: `./grammar/${lesson.id}`,
              lesson: lesson.title,
            },
          ]
        : [],
    ),
);
// Short, introductory words keep the homepage exercise approachable.
const words = LESSONS.filter((l) => l.stage.id === 1)
  .flatMap((lesson) =>
    lesson.words.map((raw) => ({ ...Phonics.parseWord(raw), lesson })),
  )
  .filter((w) => w.zh && /^[a-z]+$/.test(w.text));
for (const word of words) {
  const options = [
    word.zh,
    ...new Set(words.filter((w) => w.zh !== word.zh).map((w) => w.zh)),
  ].slice(0, 4);
  pool.push({
    id: `words:${word.lesson.id}:${word.text}`,
    kind: "words",
    prompt: `${word.text} 是什么意思？`,
    options,
    answer: word.zh,
    explanation: `${word.text}：${word.zh}。听一遍，再跟着读一遍。`,
    audio: word.text,
    href: `./lesson/${word.lesson.id}?w=${encodeURIComponent(word.text)}`,
    lesson: word.lesson.title,
  });
}
for (const lesson of LESSONS.filter((l) => l.stage.id === 1)) {
  for (const card of lesson.cards || []) {
    if (typeof card.s !== "string" || !card.kw) continue;
    const sound = SOUNDS[card.s];
    if (!sound || sound.type === "combo") continue;
    const answer = `/${sound.ipa}/`;
    const options = [
      answer,
      ...new Set(
        Object.values(SOUNDS)
          .filter((s) => s.type !== "combo" && s.ipa !== sound.ipa)
          .map((s) => `/${s.ipa}/`),
      ),
    ].slice(0, 4);
    pool.push({
      id: `phonics:${lesson.id}:${card.g}`,
      kind: "phonics",
      prompt: `${card.kw} 中的 ${card.g} 发哪个音？`,
      options,
      answer,
      explanation: `${card.g} 在 ${card.kw} 中读 ${answer}。${sound.tip}`,
      audio: card.kw,
      href: `./lesson/${lesson.id}`,
      lesson: lesson.title,
    });
  }
}
const labels = { grammar: "语法", phonics: "拼读", words: "单词" };
export default function DailyChallenge() {
  const [day, setDay] = useState(() => window.DailyQuote.day());
  useEffect(() => {
    const refresh = () => setDay(window.DailyQuote.day());
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const question = pickChallenge(pool, day);
  return question ? (
    <ChallengeQuestion key={day + question.id} question={question} day={day} />
  ) : null;
}
function ChallengeQuestion({
  question: q,
  day,
}: {
  question: Challenge;
  day: string;
}) {
  const readAnswer = () => {
    const stored = load<{
      day?: string;
      id?: string;
      selected?: string;
    } | null>("daily-challenge", null);
    return stored?.day === day &&
      stored.id === q.id &&
      stored.selected &&
      q.options.includes(stored.selected)
      ? stored.selected
      : null;
  };
  const [selected, setSelected] = useState(readAnswer);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "phonics-path.daily-challenge" || event.key === null)
        setSelected(readAnswer());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [day, q.id]);
  const correct = selected === q.answer;
  return (
    <section
      className="daily-challenge"
      id="daily-challenge"
      aria-labelledby="challenge-title"
    >
      <div className="challenge-heading">
        <h2 id="challenge-title">每日小挑战</h2>
        <span className="challenge-kind">{labels[q.kind]} · 每天一道</span>
      </div>
      <div className="challenge-body">
        <div className="challenge-question">
          <p
            className="challenge-prompt"
            id="challenge-prompt"
            lang={q.kind === "grammar" ? "en" : "zh-CN"}
          >
            {q.prompt}
          </p>
          {q.audio && (
            <SayButton text={q.audio} className="challenge-audio">
              听听发音
            </SayButton>
          )}
        </div>
        <div
          className="challenge-options"
          role="group"
          aria-labelledby="challenge-prompt"
        >
          {q.options.map((option, i) => (
            <button
              type="button"
              key={option}
              className={`challenge-option${selected && option === q.answer ? " is-correct" : ""}${selected === option && !correct ? " is-wrong" : ""}`}
              aria-disabled={selected !== null}
              aria-pressed={selected === option}
              onClick={() => {
                if (selected !== null) return;
                setSelected(option);
                save("daily-challenge", { day, id: q.id, selected: option });
              }}
            >
              <span className="challenge-letter" aria-hidden="true">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{option}</span>
              {selected && option === q.answer && <Icon name="check" />}
            </button>
          ))}
        </div>
      </div>
      <div className="challenge-feedback" role="status" aria-atomic="true">
        {selected && (
          <div className="challenge-result">
            <Mascot pose="cheer" className="cheering-mascot" />
            <div>
              <strong>
                {correct ? "答对了！" : `正确答案：${q.answer}`} 今日挑战已完成
              </strong>
              <p>{q.explanation}</p>
            </div>
          </div>
        )}
      </div>
      <div className="challenge-footer">
        <span>
          {selected ? "明天再来试一道" : "选一个答案，看看你掌握了吗"}
        </span>
        {selected && (
          <a href={q.href} aria-label={`学习这一课：${q.lesson}`}>
            学习这一课 <Icon name="arrow" />
          </a>
        )}
      </div>
    </section>
  );
}
