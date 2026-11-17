import { Mascot, PageIntro } from "../components/Mascot";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  GrammarChoiceQuestion,
  GrammarOrderQuestion,
  GrammarQuestion,
  GrammarGrade,
  GrammarStage,
  IndexedGrammarLesson,
} from "../types/grammar";
import { App, saveAll, useApp } from "../state";
import {
  GRAMMAR,
  G_LESSONS,
  LEVELS,
  Speech,
  shuffle,
  stars,
  passMark,
  quizStars,
} from "../data";
import {
  Icon,
  SayButton,
  Sentence,
  RichText,
  NotFound,
} from "../components/UI";

type PreparedChoiceQuestion = GrammarChoiceQuestion & {
  lesson: IndexedGrammarLesson;
  type: "c";
  options: string[];
  answer: string;
};
type PreparedOrderQuestion = GrammarOrderQuestion & {
  lesson: IndexedGrammarLesson;
  type: "o";
  words: string[];
  order: number[];
};
type PreparedQuestion = PreparedChoiceQuestion | PreparedOrderQuestion;
interface QuizSession {
  questions: PreparedQuestion[];
  key: number;
}
interface Feedback {
  correct: boolean;
  selectedOption?: string;
  sayText: string | null;
}
interface GrammarQuizProps {
  questions: PreparedQuestion[];
  onFinish?: (score: number, total: number) => void;
  renderResult: (score: number, total: number) => ReactNode;
  showLesson?: boolean;
}
interface QuestionProps {
  question: PreparedQuestion;
  index: number;
  total: number;
  score: number;
  showLesson: boolean;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}

const GRADES: Record<string, string> = {
  小学: "primary",
  初中: "junior",
  高中: "senior",
};
const ROLES: Record<string, string> = {
  S: "主语",
  V: "谓语",
  O: "宾语",
  C: "表语",
  IO: "间接宾语",
  DO: "直接宾语",
  OC: "宾补",
  A: "状语",
  AT: "定语",
};
const progress = () => (App.progress.grammar ||= {});
const lessonById = (id: string) => G_LESSONS.find((lesson) => lesson.id === id);
const levelOf = (stage: GrammarStage) =>
  LEVELS.find((level) => level.key === stage.level) || LEVELS[0];
const plainSentence = (text: string) =>
  text
    .replace(/\{[A-Z]+:([^}]*)\}/g, "$1")
    .replace(/[[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const questionKey = (lesson: IndexedGrammarLesson, question: GrammarQuestion) =>
  `${lesson.id}|${question.c ?? question.s}`;

function Grade({ grade }: { grade: GrammarGrade }) {
  return GRADES[grade] ? (
    <span className={`g-grade ${GRADES[grade]}`}>{grade}</span>
  ) : null;
}

function GrammarSentence({ text }: { text: string }) {
  return [...text.matchAll(/\{([A-Z]+):([^}]*)\}|\[([^\]]*)\]|([^[{]+)/g)].map(
    (match, index) => {
      const [, role, roleText, highlight, plain] = match;
      if (role)
        return (
          <span key={index} className={`ge ge-${role}`}>
            <span className="ge-t">
              <Sentence text={roleText} words={[]} />
            </span>
            <span className="ge-r" aria-hidden="true">
              {ROLES[role] || role}
            </span>
          </span>
        );
      if (highlight !== undefined)
        return (
          <b key={index} className="g-hl">
            <Sentence text={highlight} words={[]} />
          </b>
        );
      return <Sentence key={index} text={plain} words={[]} />;
    },
  );
}

export function GrammarPage() {
  useApp();
  const all = G_LESSONS.length;
  const done = G_LESSONS.filter((lesson) => progress()[lesson.id]?.done).length;
  const next =
    G_LESSONS.find((lesson) => !progress()[lesson.id]?.done) || G_LESSONS[0];
  const savedGrade = App.settings.gGrade || "";
  const filter = GRADES[savedGrade] ? savedGrade : "";
  return (
    <>
      <section className="page-head">
        <PageIntro pose="teaching">
          <p className="eyebrow">Grammar</p>
          <h1>语法</h1>
          <p className="lead">
            从词类、基本句子、时态，到非谓语动词、复合句和特殊句式，
            {GRAMMAR.length} 个阶段 {all}{" "}
            节课。每课都有规则讲解、句型公式、带发音的例句和小测验，并标明属于小学、初中还是高中内容。
          </p>
        </PageIntro>
        <div className="g-progress">
          <div className="bar">
            <i style={{ width: `${(done / all) * 100}%` }} />
          </div>
          <span>
            已完成 <b>{done}</b> / {all}
          </span>
          <a className="btn primary" href={`./grammar/${next.id}`}>
            {done ? "继续学习" : "从第一课开始"}：{next.title}{" "}
            <Icon name="arrow" />
          </a>
        </div>
        <div className="g-filter" role="group" aria-label="按学段筛选课程">
          {["", ...Object.keys(GRADES)].map((grade) => (
            <button
              key={grade}
              type="button"
              className={`g-filter-btn${grade ? ` ${GRADES[grade]}` : ""}`}
              aria-pressed={filter === grade}
              onClick={() => {
                App.settings.gGrade = grade;
                saveAll();
              }}
            >
              {grade || "全部"}
              <small>
                {grade
                  ? G_LESSONS.filter((lesson) => lesson.grade === grade).length
                  : all}
              </small>
            </button>
          ))}
        </div>
      </section>
      {GRAMMAR.map((stage) => {
        const level = levelOf(stage);
        const shown = stage.lessons.filter(
          (lesson) => !filter || lesson.grade === filter,
        );
        if (!shown.length) return null;
        const completed = shown.filter(
          (lesson) => progress()[lesson.id]?.done,
        ).length;
        return (
          <section
            key={stage.id}
            className="g-stage"
            style={{ "--lv": level.color } as CSSProperties}
          >
            <div className="sh-row">
              <div className="sh-icon">{stage.icon}</div>
              <div>
                <p className="eyebrow" style={{ color: "var(--lv-ink)" }}>
                  第 {stage.no} 阶段 · {stage.level} · {completed}/
                  {shown.length}
                </p>
                <h2 className="g-stage-title">
                  {stage.title} <small>{stage.en}</small>
                </h2>
              </div>
            </div>
            <p className="hint">{stage.desc}</p>
            <div className="lesson-list">
              {shown.map((lesson) => {
                const record = progress()[lesson.id];
                return (
                  <a
                    key={lesson.id}
                    className={`lesson-row ${record?.done ? "done" : ""}`}
                    href={`./grammar/${lesson.id}`}
                    style={{ "--lv": level.color } as CSSProperties}
                  >
                    <span className="lr-num">
                      {record?.done ? (
                        <Icon name="check" />
                      ) : (
                        stage.lessons.indexOf(lesson) + 1
                      )}
                    </span>
                    <span className="lr-body">
                      <span className="lr-title">{lesson.title}</span>
                      <span className="lr-en">{lesson.en}</span>
                    </span>
                    <span className="lr-meta">
                      <span className="lr-stars">
                        {record?.stars ? stars(record.stars) : ""}
                      </span>
                      <Grade grade={lesson.grade} />
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

export function GrammarLesson({ id }: { id: string }) {
  useApp();
  const lesson = lessonById(id);
  if (!lesson) return <NotFound />;
  return <LessonContent key={id} lesson={lesson} />;
}

function LessonContent({ lesson }: { lesson: IndexedGrammarLesson }) {
  const [session, setSession] = useState<QuizSession | null>(null);
  const stage = lesson.stage;
  const level = levelOf(stage);
  const index = G_LESSONS.indexOf(lesson);
  const previous = G_LESSONS[index - 1],
    next = G_LESSONS[index + 1];
  const record = progress()[lesson.id];
  const roles = [
    ...new Set(
      lesson.examples.flatMap((example) =>
        [...example.matchAll(/\{([A-Z]+):/g)].map((match) => match[1]),
      ),
    ),
  ];
  const start = () =>
    setSession({
      questions: lesson.quiz.map((question) => prepare(lesson, question)),
      key: Date.now(),
    });
  const finish = (score: number, total: number) => {
    if (score < passMark(total)) return;
    progress()[lesson.id] = {
      done: true,
      stars: Math.max(
        quizStars(score, total),
        progress()[lesson.id]?.stars || 0,
      ),
      at: Date.now(),
    };
    saveAll();
  };
  return (
    <>
      <section
        className="lesson-head illustrated-lesson"
        style={{ "--lv": level.color } as CSSProperties}
      >
        <Mascot pose="teaching" className="lesson-mascot" />
        <a className="crumb" href="./grammar">
          <Icon name="back" /> 语法 · 第 {stage.no} 阶段 {stage.title}
        </a>
        <p className="eyebrow">
          语法第 {lesson.no} 课 · {stage.level}
          <Grade grade={lesson.grade} />
        </p>
        <h1>
          {lesson.title} <small>{lesson.en}</small>
        </h1>
        {record?.done && (
          <span className="done-badge">
            <Icon name="check" /> 已完成 {stars(record.stars || 1)}
          </span>
        )}
        <p className="goal" style={{ "--lv": level.color } as CSSProperties}>
          {lesson.intro}
        </p>
      </section>
      <section className="block">
        <h2 className="block-title">
          <span className="num">1</span>规则讲解
        </h2>
        <div className="rule">
          <RichText html={lesson.rule} />
        </div>
        {lesson.forms && (
          <div className="g-forms">
            {lesson.forms.map((form, i) => (
              <div className="g-form" key={i}>
                <span className="g-form-label">{form.label}</span>
                <span className="g-form-parts">
                  {form.parts.map((part, j) => (
                    <Fragment key={j}>
                      {j > 0 && <span className="g-plus">+</span>}
                      <span
                        className={`g-part${/[a-z]/.test(part) ? " key" : ""}`}
                      >
                        {part}
                      </span>
                    </Fragment>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
        {lesson.signals && (
          <div className="g-signals">
            <span className="g-sig-label">时间标志词</span>
            {lesson.signals.map((signal, i) => (
              <span key={i} className="mini-g">
                {signal}
              </span>
            ))}
          </div>
        )}
        {lesson.table && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {lesson.table.head.map((heading, i) => (
                    <th key={i}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lesson.table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="block">
        <h2 className="block-title">
          <span className="num">2</span>例句 <small>点句中单词可单独听</small>
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
        {!!roles.length && (
          <div className="g-legend">
            {roles.map((role) => (
              <span key={role} className={`ge ge-${role}`}>
                <span className="ge-t">{ROLES[role]}</span>
              </span>
            ))}
          </div>
        )}
        <ol
          className={`sentences g-sentences ${App.settings.zh ? "" : "nozh"}`}
        >
          {lesson.examples.map((example, i) => {
            const [en, zh] = example.split("|");
            return (
              <li key={i}>
                <SayButton
                  text={plainSentence(en)}
                  toggle
                  className="icon-btn play"
                  title="朗读整句"
                  aria-label="朗读整句"
                >
                  <Icon name="play" />
                </SayButton>
                <div>
                  <p className="en">
                    <GrammarSentence text={en} />
                  </p>
                  <p className="zh">{zh}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      {lesson.traps && (
        <section className="block">
          <h2 className="block-title">
            <span className="num">3</span>易错提醒
          </h2>
          <ul className="g-traps">
            {lesson.traps.map((trap, i) => (
              <li key={i}>
                <RichText html={trap} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="block quiz-block">
        <h2 className="block-title">
          <span className="num">{lesson.traps ? 4 : 3}</span>小测验
        </h2>
        <div id="gquiz" data-glesson={lesson.id}>
          {session ? (
            <GrammarQuiz
              key={session.key}
              questions={session.questions}
              onFinish={finish}
              renderResult={(score, total) => {
                const passed = score >= passMark(total);
                return (
                  <div className={`result ${passed ? "pass" : ""}`}>
                    <Mascot
                      pose={passed ? "cheer" : "reading"}
                      className="result-mascot"
                    />
                    <div className="r-score">
                      {score}
                      <small>/{total}</small>
                    </div>
                    <div className="r-stars">
                      {passed ? stars(quizStars(score, total)) : ""}
                    </div>
                    <p>
                      {passed
                        ? score === total
                          ? "满分！太棒了 🎉"
                          : "通过！本课已完成 👍"
                        : "还差一点，再看看规则和例句，然后重试吧 💪"}
                    </p>
                    {score < total && (
                      <p className="hint">
                        答错的题已加入&quot;复习&quot;里的语法错题本。
                      </p>
                    )}
                    <div className="r-btns">
                      <button className="btn ghost" onClick={start}>
                        再测一次
                      </button>
                      {passed && next && (
                        <a
                          className="btn primary"
                          href={`./grammar/${next.id}`}
                        >
                          下一课：{next.title} <Icon name="arrow" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <>
              <p>
                共 {lesson.quiz.length} 题（选择题和连词成句），答对{" "}
                {passMark(lesson.quiz.length)} 题即可完成本课。
                {record?.done
                  ? `你的最好成绩：${stars(record.stars || 1)}`
                  : ""}
              </p>
              <button className="btn primary" onClick={start}>
                开始测验 <Icon name="arrow" />
              </button>
              {!record?.done && (
                <button
                  className="link-btn"
                  onClick={() => {
                    progress()[lesson.id] = {
                      done: true,
                      stars: progress()[lesson.id]?.stars || 1,
                      at: Date.now(),
                    };
                    saveAll();
                  }}
                >
                  我已掌握，直接标记完成
                </button>
              )}
            </>
          )}
        </div>
      </section>
      <nav className="pager">
        <a
          className="btn ghost"
          href={previous ? `./grammar/${previous.id}` : "./grammar"}
        >
          {previous ? (
            <>
              <Icon name="back" /> {previous.title}
            </>
          ) : (
            "语法目录"
          )}
        </a>
        <a
          className="btn ghost"
          href={next ? `./grammar/${next.id}` : "./grammar"}
        >
          {next ? (
            <>
              {next.title} <Icon name="arrow" />
            </>
          ) : (
            "语法目录"
          )}
        </a>
      </nav>
    </>
  );
}

function prepare(
  lesson: IndexedGrammarLesson,
  question: GrammarQuestion,
): PreparedQuestion {
  if (question.c !== undefined)
    return {
      ...question,
      lesson,
      type: "c",
      options: shuffle(question.o),
      answer: question.o[0],
    };
  const words = question.s.replace(/[.?!]$/, "").split(" ");
  let order = shuffle(words.map((_, index) => index));
  for (
    let count = 0;
    count < 5 && order.every((value, index) => value === index);
    count++
  )
    order = shuffle(order);
  return { ...question, lesson, type: "o", words, order };
}

function filledSentence(question: PreparedChoiceQuestion) {
  if (
    !question.c.includes("___") ||
    (/[一-鿿]/.test(question.answer) && question.answer !== "不填") ||
    /^(Which|In ")/.test(question.c)
  )
    return null;
  const parts =
    question.answer === "不填" ? [""] : question.answer.split(/,\s*/);
  let index = 0;
  return question.c
    .replace(/___/g, () => parts[Math.min(index++, parts.length - 1)])
    .replace(/\s+/g, " ")
    .replace(/\s([.,?!])/g, "$1")
    .trim();
}

function recordAnswer(question: PreparedQuestion, correct: boolean) {
  const key = questionKey(question.lesson, question);
  const exists = App.gwrong.includes(key);
  if (correct && exists) App.gwrong = App.gwrong.filter((item) => item !== key);
  else if (!correct && !exists) App.gwrong = [...App.gwrong, key].slice(-300);
  else return;
  saveAll();
}

export function grammarWrongList(): {
  l: IndexedGrammarLesson;
  q: GrammarQuestion;
}[] {
  const out: { l: IndexedGrammarLesson; q: GrammarQuestion }[] = [];
  for (const key of App.gwrong) {
    const cut = key.indexOf("|");
    const lesson = lessonById(key.slice(0, cut));
    const question = lesson?.quiz.find(
      (item) => (item.c ?? item.s) === key.slice(cut + 1),
    );
    if (lesson && question) out.push({ l: lesson, q: question });
  }
  return out;
}

export function GrammarRedo() {
  useApp();
  const [session, setSession] = useState<QuizSession | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const start = () => {
    const questions = grammarWrongList()
      .slice(0, 10)
      .map(({ l, q }) => prepare(l, q));
    if (questions.length) setSession({ questions, key: Date.now() });
    container.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  return (
    <div id="gredo" ref={container}>
      {session ? (
        <GrammarQuiz
          key={session.key}
          questions={session.questions}
          showLesson
          renderResult={(score, total) => {
            const left = grammarWrongList().length;
            return (
              <div className="result pass">
                <div className="r-score">
                  {score}
                  <small>/{total}</small>
                </div>
                <p>
                  {score === total
                    ? "全对！🎉"
                    : "做错的题还留在错题本里，看看解析再来一次。"}
                </p>
                <p className="hint">
                  做对的 {score} 道已移出错题本，还剩 {left} 道。
                </p>
                <div className="r-btns">
                  {left > 0 && (
                    <button className="btn primary" onClick={start}>
                      再做一轮 <Icon name="arrow" />
                    </button>
                  )}
                </div>
              </div>
            );
          }}
        />
      ) : grammarWrongList().length ? (
        <button className="btn primary" onClick={start}>
          重做错题 <Icon name="arrow" />
        </button>
      ) : (
        <p className="empty">错题本是空的。</p>
      )}
    </div>
  );
}

function GrammarQuiz({
  questions,
  onFinish,
  renderResult,
  showLesson = false,
}: GrammarQuizProps) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  if (finished) return renderResult(score, questions.length);
  return (
    <Question
      key={index}
      question={questions[index]}
      index={index}
      total={questions.length}
      score={score}
      showLesson={showLesson}
      onAnswer={(correct) => {
        if (correct) setScore((value) => value + 1);
      }}
      onNext={() => {
        if (index + 1 < questions.length) setIndex((value) => value + 1);
        else {
          onFinish?.(score, questions.length);
          setFinished(true);
        }
      }}
    />
  );
}

function Question({
  question,
  index,
  total,
  score,
  showLesson,
  onAnswer,
  onNext,
}: QuestionProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [bank, setBank] = useState<number[]>(
    question.type === "o" ? question.order : [],
  );
  const nextButton = useRef<HTMLButtonElement>(null);
  const answered = useRef(false);
  useEffect(() => {
    if (feedback) nextButton.current?.focus({ preventScroll: true });
  }, [feedback]);
  const submit = (correct: boolean, selectedOption?: string) => {
    if (answered.current) return;
    answered.current = true;
    const sayText =
      question.type === "c" ? filledSentence(question) : question.s;
    setFeedback({ correct, selectedOption, sayText });
    recordAnswer(question, correct);
    onAnswer(correct);
    if (sayText) Speech.say(sayText);
  };
  const move = (word: number, fromAnswer: boolean) => {
    if (answered.current) return;
    if (fromAnswer) {
      setSelected((items) => items.filter((item) => item !== word));
      setBank((items) => [...items, word]);
    } else {
      setBank((items) => items.filter((item) => item !== word));
      setSelected((items) => [...items, word]);
    }
  };
  return (
    <div className="quiz">
      <div className="q-head">
        <span>
          第 {index + 1} / {total} 题
        </span>
        <div className="bar">
          <i style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span>得分 {score}</span>
      </div>
      {question.type === "c" ? (
        <>
          <p className="q-prompt">
            {question.c.includes("___") ? "选出正确的答案" : "请选择"}
          </p>
          <div className="g-q">
            {feedback?.sayText ||
              question.c.split("___").map((part, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="gap">　　</span>}
                  {part}
                </Fragment>
              ))}
          </div>
          <div className="q-opts g-opts">
            {question.options.map((option, i) => (
              <button
                key={i}
                className={`opt${feedback && option === question.answer ? " right" : ""}${feedback && !feedback.correct && option === feedback.selectedOption ? " wrong" : ""}`}
                disabled={!!feedback}
                onClick={() => submit(option === question.answer, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="q-prompt">连词成句</p>
          <p className="g-zh">{question.zh}</p>
          <div
            className={`g-answer${feedback ? (feedback.correct ? " right" : " wrong") : ""}`}
            aria-label="你的句子"
          >
            <span className="g-ph" hidden={!!selected.length}>
              依次点击下面的单词
            </span>
            {selected.map((word) => (
              <button
                key={word}
                className="g-word"
                disabled={!!feedback}
                onClick={() => move(word, true)}
              >
                {question.words[word]}
              </button>
            ))}
          </div>
          <div className="g-bank">
            {bank.map((word) => (
              <button
                key={word}
                className="g-word"
                disabled={!!feedback}
                onClick={() => move(word, false)}
              >
                {question.words[word]}
              </button>
            ))}
          </div>
          <div className="g-order-btns">
            <button
              className="btn small ghost"
              disabled={!!feedback}
              onClick={() => {
                setBank((items) => [...items, ...selected]);
                setSelected([]);
              }}
            >
              重新排
            </button>
            <button
              className="btn small primary"
              disabled={!!feedback || !!bank.length}
              onClick={() =>
                submit(
                  selected.map((word) => question.words[word]).join(" ") ===
                    question.words.join(" "),
                )
              }
            >
              检查
            </button>
          </div>
        </>
      )}
      <div className="q-feedback" aria-live="polite">
        {feedback && (
          <>
            {feedback.correct ? (
              <b className="ok">✓ 正确！</b>
            ) : (
              <b className="no">
                ✗{" "}
                {question.type === "c"
                  ? `正确答案：${question.answer}`
                  : `正确的句子：${question.s}`}
              </b>
            )}
            {question.why && <span className="g-why">{question.why}</span>}
            {showLesson && (
              <a className="g-from" href={`./grammar/${question.lesson.id}`}>
                出自语法第 {question.lesson.no} 课：{question.lesson.title}
              </a>
            )}
            {feedback.sayText && (
              <SayButton text={feedback.sayText} className="link-btn">
                <Icon name="speaker" /> 听整句
              </SayButton>
            )}
            <button
              ref={nextButton}
              className="btn small primary"
              onClick={onNext}
            >
              {index + 1 < total ? "下一题" : "查看结果"} <Icon name="arrow" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
