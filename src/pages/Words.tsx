import { Mascot, PageIntro } from "../components/Mascot";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Icon,
  SayButton,
  WordTiles,
  IPASpans,
  Sentence,
  BlendScope,
  BlendButton,
} from "../components/UI";
import { Speech } from "../data";
import {
  dictLookup,
  dictAnalyze,
  loadScript,
  FORM_NAMES,
} from "../services/dictionary";
import {
  getVocab,
  useVocab,
  updateVocab,
  saveVocab,
  importVocab,
  removeCustomWord,
  today,
} from "../vocab-store";

import type { DictionaryEntry } from "../types/app";
import type { DisplayAnalysis } from "../types/phonics";
import type {
  VocabBook,
  VocabData,
  VocabProgress,
  VocabResult,
  VocabSettings,
  VocabStatus,
  VocabTask,
  VocabWord,
} from "../types/vocab";

type BookChoice = Pick<VocabBook, "id" | "name" | "desc" | "count">;
interface WordCore {
  books: VocabBook[];
  list: (VocabWord & { bits: number })[];
  map: Map<string, VocabWord>;
}
interface CoreDataProps {
  core: WordCore;
  data: VocabData;
}
interface StudyProps {
  core: WordCore;
  book: BookChoice;
  params: URLSearchParams;
}
type StudyView =
  | { loading: boolean; task: null; x: null; serial: number }
  | { loading: boolean; task: VocabTask; x: VocabWord; serial: number };

const C = window.VocabCore;
const formNames: Readonly<Record<string, string | undefined>> = FORM_NAMES;
const CUSTOM = {
  id: "custom",
  name: "生词本",
  desc: "在词典里点“加入生词本”收藏的词",
};
const FILTERS = [
  ["all", "全部"],
  ["unseen", "未学"],
  ["learning", "学习中"],
  ["familiar", "熟悉"],
  ["mastered", "已掌握"],
  ["leech", "顽固词"],
];
const KIND = {
  review: "复习",
  probe: "新词 · 先考一下",
  verify: "新词 · 再确认一次",
  learn: "新词 · 学习",
  drill: "新词 · 巩固",
};
const PROMPT = {
  meaning: "这个单词是什么意思？",
  audio: "听发音，选出它的意思",
  listen: "听发音，选出正确的单词",
  spell: "听发音，拼出这个单词",
  recall: "先回忆它的意思，再看答案",
};
let corePromise: Promise<WordCore | null> | null = null;
const extras = new Map<string, VocabWord | null>();
function loadCore(): Promise<WordCore | null> {
  if (!corePromise)
    corePromise = loadScript("js/vocab/core.js")
      .then(() => {
        if (!window.VOCAB_CORE) {
          corePromise = null;
          return null;
        }
        const v = window.VOCAB_CORE;
        const list = v.words.map(([w, ipa, g, bits], i) => ({
          w,
          ipa,
          g,
          bits,
          i,
        }));
        return {
          books: v.books,
          list,
          map: new Map(list.map((x) => [x.w, x])),
        };
      })
      .catch(() => {
        corePromise = null;
        return null;
      });
  return corePromise;
}
const allBooks = (core: WordCore, data: VocabData): BookChoice[] => [
  ...core.books,
  ...(data.custom.length ? [{ ...CUSTOM, count: data.custom.length }] : []),
];
function bookOrder(core: WordCore, data: VocabData, id: string) {
  if (id === "custom") return data.custom;
  const book = core.books.find((b) => b.id === id);
  return book
    ? core.list
        .filter((x) => x.bits & book.bit && !(x.bits & book.not))
        .map((x) => x.w)
    : [];
}
async function wordInfo(core: WordCore, w: string): Promise<VocabWord | null> {
  if (core.map.has(w)) return core.map.get(w) ?? null;
  if (extras.has(w)) return extras.get(w) ?? null;
  const e: DictionaryEntry | null = await dictLookup(w);
  if (!e) return null;
  const zh = e.zh || (e.lemma ? (await dictLookup(e.lemma.word))?.zh : "");
  const g = C.shortGloss(zh);
  if (!g) return null;
  const x = { w, ipa: (e.ipa?.[0] || "").replace(/ /g, ""), g, i: -1 };
  extras.set(w, x);
  return x;
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
function statusOf(data: VocabData, w: string): [VocabStatus, string] {
  const r = data.words[w];
  return !r
    ? ["unseen", "未学"]
    : r.s >= C.MASTERED || r.k
      ? ["mastered", "已掌握"]
      : r.s >= 5
        ? ["familiar", "熟悉"]
        : ["learning", "学习中"];
}
function fmtDate(day: number) {
  const d = C.dayToDate(day),
    y = d.getUTCFullYear();
  return `${y === C.dayToDate(today()).getUTCFullYear() ? "" : `${y} 年 `}${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
}

export default function WordsPage({
  sub,
  params = new URLSearchParams(),
}: {
  sub?: string;
  params?: URLSearchParams;
}) {
  const data = useVocab();
  const [core, setCore] = useState<WordCore | null>(null);
  const [failed, setFailed] = useState(false);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    let active = true;
    loadCore().then((v) => {
      if (active) {
        setCore(v);
        setFailed(!v);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setSettings(false);
  }, [sub]);
  const book =
    core && allBooks(core, data).find((b) => b.id === data.settings.book);
  return (
    <div id="words-root" style={{ "--lv": "#CE82FF" } as React.CSSProperties}>
      {!core ? (
        <section className="page-head">
          <p className="eyebrow">Words</p>
          <h1>单词</h1>
          <p className="lead">
            {failed
              ? "词书数据加载失败，请检查网络后刷新页面。"
              : "正在加载词书…"}
          </p>
        </section>
      ) : sub === "study" && book ? (
        <Study
          key={`${book.id}:${params.toString()}`}
          core={core}
          book={book}
          params={params}
        />
      ) : sub === "list" && book ? (
        <WordList core={core} book={book} data={data} params={params} />
      ) : (
        <Home
          core={core}
          data={data}
          book={book}
          onSettings={() => setSettings(true)}
        />
      )}
      {settings && core && (
        <Settings core={core} data={data} onClose={() => setSettings(false)} />
      )}
    </div>
  );
}
function BookPicker({ core, data }: CoreDataProps) {
  return (
    <section className="block">
      <h2 className="block-title">选一本词书</h2>
      <p className="hint">
        进度按单词记录：在一本书里学过的词，换到别的书里也算已学。以后可以随时换书。
      </p>
      <div className="modes ws-books">
        {allBooks(core, data).map((b) => {
          const st = C.bookStats(data, bookOrder(core, data, b.id)),
            learned = st.total - st.unseen;
          return (
            <button
              key={b.id}
              className={`mode${b.id === data.settings.book ? " on" : ""}`}
              onClick={() =>
                updateVocab((d) => {
                  d.settings.book = b.id;
                })
              }
            >
              <b>
                {b.name} <small>{st.total} 词</small>
              </b>
              <span>{b.desc}</span>
              {learned > 0 && (
                <span className="ws-book-prog">
                  <span className="bar">
                    <i style={{ width: `${pct(learned, st.total)}%` }} />
                  </span>
                  已学 {learned}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
function Home({
  core,
  data,
  book,
  onSettings,
}: CoreDataProps & { book?: BookChoice | null; onSettings: () => void }) {
  const head = (
    <section className="page-head">
      <PageIntro pose="reading" className="words-intro">
        <div className="ws-headrow">
          <div>
            <p className="eyebrow">Words</p>
            <h1>单词</h1>
          </div>
          <button
            className="btn small ghost ws-set-btn"
            aria-haspopup="dialog"
            onClick={onSettings}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M4 7h8M18 7h2M4 17h2M12 17h8" />
              <circle cx="15" cy="7" r="2.6" />
              <circle cx="9" cy="17" r="2.6" />
            </svg>
            <span>设置</span>
          </button>
        </div>
        <p className="lead">
          {book ? (
            <>
              正在学：<b>{book.name}</b>。每天先复习到期的词，再学新词。
            </>
          ) : (
            "每天学一点新词，学过的词按 1、2、4、7、15、30、60 天的间隔安排复习。先选一本词书。"
          )}
        </p>
      </PageIntro>
    </section>
  );
  if (!book)
    return (
      <>
        {head}
        <BookPicker core={core} data={data} />
      </>
    );
  const order = bookOrder(core, data, book.id),
    t = today();
  const plan = C.planToday(data, order, t),
    st = C.bookStats(data, order),
    log = data.days[t] || {},
    S = data.settings;
  const todo = plan.dueWords.length + plan.learning.length + plan.newQuota,
    started = (log.n || 0) + (log.k || 0) + (log.r || 0) > 0;
  const lee = C.leeches(data).length,
    days = Math.ceil(st.unseen / S.newPerDay);
  return (
    <>
      {head}
      <section className="block ws-today">
        <h2 className="block-title">今日任务</h2>
        <div className="ws-nums">
          <Stat value={plan.dueWords.length} label="待复习" />
          <Stat value={plan.newQuota} label="新词" />
          {plan.learning.length > 0 && (
            <Stat value={plan.learning.length} label="没巩固完" />
          )}
        </div>
        {plan.due > plan.dueWords.length && (
          <p className="hint">
            到期的词共 {plan.due} 个，今天先复习最久没复习的{" "}
            {plan.dueWords.length} 个。
          </p>
        )}
        {plan.backlog === "half" && (
          <p className="hint">
            待复习的词超过了每日上限，今天的新词减半，先把复习补上。
          </p>
        )}
        {plan.backlog === "stop" && (
          <p className="hint">
            待复习的词太多了，今天不安排新词，先把复习补上。
          </p>
        )}
        <div className="dc-cta">
          {todo ? (
            <a className="btn primary" href="./words/study">
              {started ? "继续学习" : "开始今天的学习"} <Icon name="arrow" />
            </a>
          ) : (
            <>
              <p className="ws-done">今天的任务完成了 🎉</p>
              {st.unseen > 0 && (
                <a className="btn ghost" href="./words/study?more=5">
                  再学 5 个新词
                </a>
              )}
            </>
          )}
        </div>
      </section>
      <section className="block">
        <h2 className="block-title">学习记录</h2>
        <div className="ws-stats">
          <Stat value={log.n || 0} label="今日新学" />
          <Stat value={log.r || 0} label="今日复习" />
          <Stat
            value={log.r ? `${pct(log.ok || 0, log.r)}%` : "—"}
            label="复习正确率"
          />
          <Stat value={C.streak(data, t)} label="连续学习天数" />
        </div>
      </section>
      <section className="block">
        <h2 className="block-title">
          {book.name} <small>{st.total} 词</small>
          <a className="link-btn" href="./words/list">
            单词列表
          </a>
        </h2>
        <div
          className="ws-bar"
          role="img"
          aria-label={`已掌握 ${st.mastered}，熟悉 ${st.familiar}，学习中 ${st.learning}，未学 ${st.unseen}`}
        >
          {(["mastered", "familiar", "learning"] as const).map(
            (key) =>
              st[key] > 0 && (
                <i
                  key={key}
                  className={key}
                  style={{ width: `${(st[key] / st.total) * 100}%` }}
                />
              ),
          )}
        </div>
        <ul className="ws-legend">
          {(
            [
              ["mastered", "已掌握"],
              ["familiar", "熟悉"],
              ["learning", "学习中"],
              ["unseen", "未学"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <i className={key} />
              {label} <b>{st[key]}</b>
            </li>
          ))}
        </ul>
        <p className="hint">
          {st.unseen
            ? `按每天 ${S.newPerDay} 个新词，最晚 ${fmtDate(t + days)}学完（还要 ${days} 天）。新词会先考一下，认识的直接跳过，实际会更快。`
            : "这本书的词都学过了，继续按时复习就好。"}
        </p>
        {lee > 0 && (
          <p className="hint">
            <a href="./words/list?f=leech">顽固词 {lee} 个</a>：累计答错{" "}
            {C.LEECH_LAPSES} 次以上的词，建议到词典里看看拼读拆解。
          </p>
        )}
      </section>
    </>
  );
}
function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
function Settings({
  core,
  data,
  onClose,
}: CoreDataProps & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    const close = () => onClose();
    window.addEventListener("phonics:navigate", close);
    return () => window.removeEventListener("phonics:navigate", close);
  }, [onClose]);
  const change = <K extends keyof VocabSettings>(
    key: K,
    value: VocabSettings[K],
  ) =>
    updateVocab((d) => {
      d.settings[key] = value;
    });
  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      const before = Object.keys(getVocab().words).length;
      const ok = importVocab(JSON.parse(await f.text()));
      setMessage(
        ok
          ? `已导入：合并后共 ${Object.keys(getVocab().words).length} 个词的进度（原来 ${before} 个）。两边都有的词保留较新的记录。`
          : "导入失败：浏览器存储空间不足。",
      );
    } catch {
      setMessage("导入失败：这不是本站导出的单词进度文件。");
    }
    if (file.current) file.current.value = "";
  }
  function exportFile() {
    const d = new Date(),
      name = `english-path-words-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(getVocab())], { type: "application/json" }),
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: name,
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      `已导出 ${Object.keys(getVocab().words).length} 个词的进度到文件 ${name}。`,
    );
  }
  const S = data.settings;
  return (
    <dialog
      id="ws-settings"
      className="ws-dialog"
      ref={dialog}
      aria-labelledby="ws-set-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ws-dlg">
        <div className="ws-dlg-head">
          <h2 id="ws-set-title">单词设置</h2>
          <button className="sd-close" onClick={onClose} aria-label="关闭设置">
            Esc
          </button>
        </div>
        <div className="ws-dlg-body">
          <div className="field">
            <label htmlFor="ws-book">词书</label>
            <select
              id="ws-book"
              value={S.book || ""}
              onChange={(e) => change("book", e.target.value)}
            >
              {!S.book && (
                <option value="" disabled>
                  还没有选词书
                </option>
              )}
              {allBooks(core, data).map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}（{b.count} 词）
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ws-per">每天新词</label>
            <select
              id="ws-per"
              value={S.newPerDay}
              onChange={(e) => change("newPerDay", +e.target.value)}
            >
              {[5, 10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n} 个
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ws-spell">熟悉之后的复习方式</label>
            <select
              id="ws-spell"
              value={S.spelling ? "1" : "0"}
              onChange={(e) => change("spelling", e.target.value === "1")}
            >
              <option value="1">听发音拼写单词</option>
              <option value="0">回忆意思后自己判断</option>
            </select>
          </div>
          <p className="hint">
            修改后立即生效。每天最多复习 {S.reviewCap} 个词。
          </p>
          <div className="ws-dlg-data">
            <h3>学习进度</h3>
            <p className="hint">
              进度保存在这台设备的浏览器里。换设备时先导出成文件，再到另一台设备导入。
            </p>
            <div className="dc-cta">
              <button className="btn small ghost" onClick={exportFile}>
                导出进度
              </button>
              <button
                className="btn small ghost"
                onClick={() => file.current?.click()}
              >
                导入进度
              </button>
              <input
                ref={file}
                id="ws-file"
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => importFile(e.target.files?.[0])}
              />
            </div>
            <p className="hint" id="ws-msg" role="status">
              {message}
            </p>
          </div>
        </div>
        <div className="ws-dlg-foot">
          <button className="btn primary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </dialog>
  );
}

function WordList({
  core,
  book,
  data,
  params,
}: CoreDataProps & { book: BookChoice; params: URLSearchParams }) {
  const [search, setSearch] = useState("");
  const [, refresh] = useState(0);
  const filter = FILTERS.some(([k]) => k === params.get("f"))
    ? (params.get("f") ?? "all")
    : "all";
  const order = bookOrder(core, data, book.id);
  const filtered =
    filter === "leech"
      ? C.leeches(data)
      : filter === "all"
        ? order
        : order.filter((w) => statusOf(data, w)[0] === filter);
  const query = search.trim().toLowerCase();
  const words = query
    ? filtered.filter(
        (w) =>
          w.toLowerCase().includes(query) ||
          (core.map.get(w)?.g || extras.get(w)?.g || "").includes(query),
      )
    : filtered;
  const pages = Math.max(1, Math.ceil(words.length / 100));
  const p = Math.min(pages, Math.max(1, Number(params.get("p")) || 1));
  const slice = words.slice((p - 1) * 100, p * 100),
    t = today();
  const link = (f: string, n: number) =>
    `./words/list?f=${f}${n > 1 ? `&p=${n}` : ""}`;
  const missingKey = slice
    .filter((w) => !core.map.has(w) && !extras.has(w))
    .join("|");
  useEffect(() => {
    if (!missingKey) return;
    let active = true;
    Promise.all(
      missingKey.split("|").map((w) =>
        wordInfo(core, w)
          .then((x) => {
            extras.set(w, x);
          })
          .catch(() => {}),
      ),
    ).then(() => {
      if (active) refresh((n) => n + 1);
    });
    return () => {
      active = false;
    };
  }, [core, missingKey]);
  return (
    <>
      <section className="page-head">
        <a className="crumb" href="./words">
          <Icon name="back" /> 单词
        </a>
        <p className="eyebrow">Word List</p>
        <h1>{book.name}</h1>
        <p className="lead">
          {filter === "leech"
            ? `累计答错 ${C.LEECH_LAPSES} 次以上、还没掌握的词（不限词书）。`
            : "按词频从高到低排列，学习时也按这个顺序。点单词可以查词典。"}
        </p>
      </section>
      <section className="block">
        <div className="chip-row wl-filters">
          {FILTERS.map(([key, label]) => (
            <a
              key={key}
              className={`chip-btn${key === filter ? " accent" : ""}`}
              href={link(key, 1)}
              aria-current={key === filter ? "true" : undefined}
            >
              {label}
            </a>
          ))}
        </div>
        <div className="field">
          <label htmlFor="ws-search">搜索单词</label>
          <input
            id="ws-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="输入单词或释义"
          />
        </div>
        <p className="hint">共 {words.length} 个词</p>
        {slice.length ? (
          <ul className="wl">
            {slice.map((w) => {
              const x = core.map.get(w) || extras.get(w),
                [key, label] = statusOf(data, w),
                r = data.words[w];
              const due =
                r && r.s >= 1 && r.s < C.MASTERED && !r.k
                  ? Number(r.d) <= t
                    ? "今天复习"
                    : `${Number(r.d) - t} 天后复习`
                  : "";
              return (
                <li key={w}>
                  <SayButton
                    text={w}
                    className="icon-btn"
                    title="朗读"
                    aria-label={`朗读 ${w}`}
                  >
                    <Icon name="speaker" />
                  </SayButton>
                  <div className="wl-main">
                    <a
                      className="wl-word"
                      href={`./dict/${encodeURIComponent(w)}`}
                    >
                      {w}
                    </a>
                    {x && <span className="wc-ipa">/{x.ipa}/</span>}
                    <p>{x?.g || ""}</p>
                  </div>
                  <div className="wl-side">
                    <span className={`wl-tag ${key}`}>{label}</span>
                    {due && <small>{due}</small>}
                    {r?.l > 0 && <small>错 {r.l} 次</small>}
                    {book.id === "custom" && filter !== "leech" && (
                      <button
                        className="link-btn"
                        onClick={() => removeCustomWord(w)}
                      >
                        移出生词本
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty">这里还没有单词。</p>
        )}
        {pages > 1 && (
          <nav className="wl-pager" aria-label="分页">
            {p > 1 && (
              <a className="btn small ghost" href={link(filter, p - 1)}>
                上一页
              </a>
            )}
            <span>
              第 {p} / {pages} 页
            </span>
            {p < pages && (
              <a className="btn small ghost" href={link(filter, p + 1)}>
                下一页
              </a>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
function Study({ core, book, params }: StudyProps) {
  const [round, setRound] = useState({ id: 0, more: false });
  return (
    <StudyRound
      key={round.id}
      core={core}
      book={book}
      params={round.more ? new URLSearchParams("more=5") : params}
      onMore={() => setRound((r) => ({ id: r.id + 1, more: true }))}
      onRestart={() => setRound((r) => ({ ...r, id: r.id + 1 }))}
    />
  );
}
function StudyRound({
  core,
  book,
  params,
  onMore,
  onRestart,
}: StudyProps & { onMore: () => void; onRestart: () => void }) {
  // VocabCore captures both data and data.words. A storage event replaces that
  // snapshot: never allow its detached session to submit or save afterwards.
  const [sessionData] = useState(getVocab);
  const invalidated = sessionData !== getVocab();
  const [session] = useState(() =>
    C.createSession({
      data: sessionData,
      order: bookOrder(core, sessionData, book.id),
      today: today(),
      extra: Math.max(0, Number(params.get("more")) || 0),
      reviewOnly: params.get("only") === "review",
    }),
  );
  const [view, setView] = useState<StudyView>({
    loading: true,
    task: null,
    x: null,
    serial: 0,
  });
  const [paused, setPaused] = useState(false);
  const alive = useRef(false),
    busy = useRef(true),
    seq = useRef(0);
  const reviewOnly = params.get("only") === "review";
  const pending = reviewOnly ? 0 : session.plan.learning.length;
  async function advance() {
    if (sessionData !== getVocab()) return;
    busy.current = true;
    const generation = ++seq.current;
    setView((v) => ({ ...v, loading: true }));
    let task: VocabTask | null;
    while ((task = session.current())) {
      saveVocab();
      let x;
      try {
        x = await wordInfo(core, task.w);
      } catch {
        x = null;
      }
      if (
        !alive.current ||
        generation !== seq.current ||
        sessionData !== getVocab()
      )
        return;
      if (!x) {
        session.skip();
        continue;
      }
      busy.current = false;
      setView({ loading: false, task, x, serial: generation });
      return;
    }
    saveVocab();
    if (alive.current && generation === seq.current)
      setView({ loading: false, task: null, x: null, serial: generation });
  }
  useEffect(() => {
    alive.current = true;
    advance();
    return () => {
      alive.current = false;
      seq.current++;
      Speech.stop?.();
    };
  }, [session]);
  useEffect(() => {
    if (invalidated) Speech.stop?.();
  }, [invalidated]);
  function submit(result: VocabResult) {
    if (busy.current || paused || sessionData !== getVocab()) return;
    busy.current = true;
    session.submit(result);
    saveVocab();
    advance();
  }
  if (invalidated)
    return (
      <section className="block ws">
        <a className="crumb" href="./words">
          <Icon name="back" /> 退出
        </a>
        <div className="result" role="status">
          <p>另一个页面更新了单词进度。请从最新保存的进度重新开始本次学习。</p>
          <button className="btn primary" onClick={onRestart}>
            从最新进度继续
          </button>
        </div>
      </section>
    );
  const progress = session.progress(),
    goal = session.reviewTotal + pending + session.quota;
  return (
    <section className="block ws" id="ws">
      <div className="ws-head">
        <a className="crumb" href="./words">
          <Icon name="back" /> 退出
        </a>
        <span className="ws-kind">
          {view.task
            ? KIND[view.task.kind] + (view.task.retry ? " · 再来一次" : "")
            : ""}
        </span>
        {view.task && (
          <button
            className="link-btn"
            onClick={() => {
              setPaused((p) => !p);
              Speech.stop?.();
            }}
          >
            {paused ? "继续学习" : "暂停"}
          </button>
        )}
      </div>
      <div className="q-head">
        <span className="ws-count">
          {session.reviewTotal
            ? `复习 ${progress.reviewDone}/${session.reviewTotal}`
            : ""}
        </span>
        <div className="bar">
          <i
            style={{
              width: `${goal ? Math.min(100, ((progress.reviewDone + progress.graduated) / goal) * 100) : 100}%`,
            }}
          />
        </div>
        <span className="ws-new">
          {session.quota || pending
            ? `新词 ${progress.graduated}/${session.quota + pending}`
            : ""}
        </span>
      </div>
      <div id="ws-task" aria-live="polite">
        {paused ? (
          <div className="result">
            <p>学习已暂停，进度已保存。</p>
            <button className="btn primary" onClick={() => setPaused(false)}>
              继续学习
            </button>
          </div>
        ) : view.loading ? (
          <p className="hint ws-center">正在加载…</p>
        ) : view.task ? (
          <Task
            key={view.serial}
            task={view.task}
            x={view.x}
            core={core}
            onSubmit={submit}
          />
        ) : (
          <Finish
            progress={progress}
            core={core}
            book={book}
            reviewOnly={reviewOnly}
            onMore={onMore}
          />
        )}
      </div>
    </section>
  );
}
function Task({
  task,
  x,
  core,
  onSubmit,
}: {
  task: VocabTask;
  x: VocabWord;
  core: WordCore;
  onSubmit: (result: VocabResult) => void;
}) {
  const [feedback, setFeedback] = useState<{
      ok: boolean;
      selected?: number;
    } | null>(null),
    [input, setInput] = useState(""),
    [revealed, setRevealed] = useState(false),
    [showCard, setShowCard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null),
    nextRef = useRef<HTMLButtonElement>(null),
    box = useRef<HTMLDivElement>(null),
    answered = useRef(false);
  const qtype =
    task.kind === "probe" || task.kind === "verify"
      ? "meaning"
      : (task.qtype ?? "meaning");
  const choice = useMemo(() => {
    const mid = x.i >= 0 ? x.i : Math.floor(Math.random() * core.list.length),
      from = Math.max(0, Math.min(mid - 150, core.list.length - 300));
    const pool = core.list.slice(from, from + 300);
    return qtype === "listen"
      ? C.wordOptions(x, pool, Math.random)
      : C.meaningOptions(x, pool, Math.random);
  }, [core, x, qtype]);
  useEffect(() => {
    const timer = setTimeout(() => {
      Speech.say(x.w);
      inputRef.current?.focus({ preventScroll: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [x.w]);
  useEffect(() => {
    if (!feedback?.ok) {
      if (feedback) nextRef.current?.focus({ preventScroll: true });
      return;
    }
    const timer = setTimeout(() => onSubmit({ ok: true }), 1200);
    return () => clearTimeout(timer);
  }, [feedback, onSubmit]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (e.target instanceof Element &&
          e.target.matches("input, textarea, select"))
      )
        return;
      const n = +e.key;
      const target =
        n >= 1 && n <= 4
          ? box.current?.querySelectorAll<HTMLButtonElement>(
              ".opt:not(:disabled), [data-answer]",
            )[n - 1]
          : e.key === "Enter"
            ? box.current?.querySelector<HTMLButtonElement>(
                "[data-next], [data-reveal]",
              )
            : null;
      if (target && !target.disabled) {
        e.preventDefault();
        target.click();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  function answer(ok: boolean, selected?: number) {
    if (answered.current) return;
    answered.current = true;
    setFeedback({ ok, selected });
  }
  const wordHead = (
    <>
      <div className="q-word ws-word">{x.w}</div>
      <span className="wc-ipa big">/{x.ipa}/</span>
      <SayButton text={x.w} className="link-btn">
        <Icon name="speaker" /> 听发音
      </SayButton>
    </>
  );
  const play = (
    <SayButton text={x.w} className="big-play">
      <Icon name="speaker" />
      <span>再听一遍</span>
    </SayButton>
  );
  const fresh = task.kind === "probe" || task.kind === "verify";
  return (
    <div ref={box}>
      {task.kind === "learn" ? (
        <>
          <StudyCard x={x} />
          <div className="fc-judge ws-judge">
            <button
              className="btn primary"
              data-next
              onClick={() => onSubmit({})}
            >
              记住了，继续 <Icon name="arrow" />
            </button>
          </div>
        </>
      ) : (
        <div className="quiz">
          <p className="q-prompt">{PROMPT[qtype]}</p>
          <div className="q-body">
            {qtype === "meaning" || qtype === "recall" ? wordHead : play}
            {qtype === "spell" && <p className="ws-gloss">{x.g}</p>}
          </div>
          {qtype === "spell" ? (
            <form
              className="spell-form"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) answer(input.trim().toLowerCase() === x.w);
              }}
            >
              <input
                ref={inputRef}
                id="ws-in"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-label="输入单词"
                placeholder="在这里输入…"
                value={input}
                disabled={!!feedback}
                className={feedback ? (feedback.ok ? "right" : "wrong") : ""}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                className="btn primary"
                disabled={!!feedback}
                type="submit"
              >
                检查
              </button>
            </form>
          ) : qtype === "recall" ? (
            <div className="fc-judge ws-judge">
              {!revealed ? (
                <button
                  className="btn primary"
                  data-reveal
                  onClick={() => setRevealed(true)}
                >
                  显示答案
                </button>
              ) : (
                <>
                  <p className="ws-gloss">{x.g}</p>
                  <button
                    className="btn no"
                    data-answer
                    onClick={() => onSubmit({ ok: false })}
                  >
                    忘了
                  </button>
                  <button
                    className="btn primary"
                    data-answer
                    onClick={() => onSubmit({ ok: true })}
                  >
                    记得
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div
                className={`q-opts ${qtype === "listen" ? "" : "zh ws-one"}`}
              >
                {choice.options.map((option, i) => (
                  <button
                    key={option}
                    className={`opt${feedback && option === choice.answer ? " right" : ""}${feedback && !feedback.ok && feedback.selected === i ? " wrong" : ""}`}
                    disabled={!!feedback}
                    onClick={() => {
                      answer(option === choice.answer, i);
                      if (qtype !== "meaning") Speech.say(x.w);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {task.kind === "probe" && !feedback && (
                <p className="hint ws-center ws-probe-tip">
                  新词先考一下：连着答对两次算认识，直接跳过；答错就开始学。
                  <button
                    className="link-btn"
                    onClick={() => onSubmit({ ok: false })}
                  >
                    不认识，直接学
                  </button>
                </p>
              )}
            </>
          )}
          <div className="q-feedback ws-fb" aria-live="polite">
            {feedback && (
              <>
                <b className={feedback.ok ? "ok" : "no"}>
                  {feedback.ok
                    ? task.kind === "verify"
                      ? "✓ 两次都答对，这个词算认识，跳过"
                      : "✓ 正确"
                    : fresh
                      ? "这个词还不熟，接下来学它"
                      : "✗ 答错了，过一会儿再考一次"}
                </b>
                <div className="ws-ans">
                  <b>{x.w}</b>
                  <span className="wc-ipa">/{x.ipa}/</span>
                  <SayButton
                    text={x.w}
                    className="icon-btn"
                    aria-label={`朗读 ${x.w}`}
                  >
                    <Icon name="speaker" />
                  </SayButton>
                  <span>{x.g}</span>
                </div>
                <div className="ws-fb-btns">
                  {!feedback.ok && !fresh && !showCard && (
                    <button
                      className="btn small ghost"
                      onClick={() => setShowCard(true)}
                    >
                      看单词卡片
                    </button>
                  )}
                  <button
                    ref={nextRef}
                    className="btn small primary"
                    data-next
                    onClick={() => onSubmit({ ok: feedback.ok })}
                  >
                    继续 <Icon name="arrow" />
                  </button>
                </div>
                {showCard && (
                  <div className="ws-inline-card">
                    <StudyCard x={x} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Finish({
  progress: p,
  core,
  book,
  reviewOnly,
  onMore,
}: {
  progress: VocabProgress;
  core: WordCore;
  book: BookChoice;
  reviewOnly: boolean;
  onMore: () => void;
}) {
  const data = getVocab(),
    order = bookOrder(core, data, book.id),
    st = C.bookStats(data, order),
    plan = C.planToday(data, order, today());
  const nothing = !p.reviewDone && !p.graduated && !p.known;
  return (
    <div className="result pass">
      <Mascot pose={nothing ? "reading" : "cheer"} className="result-mascot" />
      <p>
        {nothing
          ? reviewOnly
            ? "现在没有到期要复习的词。"
            : "现在没有要学的词了。"
          : reviewOnly
            ? "复习完成了！"
            : "这次学习完成了！"}
      </p>
      {!nothing && (
        <div className="ws-stats">
          <Stat value={p.graduated} label="新学会" />
          <Stat value={p.known} label="认识并跳过" />
          <Stat value={p.reviewDone} label="复习" />
          <Stat
            value={p.reviewDone ? `${pct(p.reviewRight, p.reviewDone)}%` : "—"}
            label="复习正确率"
          />
        </div>
      )}
      <p className="hint">
        {!reviewOnly && "新学的词明天开始复习。"}
        {plan.due > 0 && "还有到期的词没复习完，可以再来一轮。"}
      </p>
      <div className="r-btns">
        {reviewOnly ? (
          <>
            <a className="btn ghost" href="./review">
              返回复习
            </a>
            {plan.newQuota > 0 && (
              <a className="btn primary" href="./words/study">
                接着学今天的新词 <Icon name="arrow" />
              </a>
            )}
          </>
        ) : (
          <>
            <a className="btn ghost" href="./words">
              返回单词首页
            </a>
            {st.unseen > 0 && (
              <button className="btn primary" onClick={onMore}>
                再学 5 个新词
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StudyCard({ x }: { x: VocabWord }) {
  const [entry, setEntry] = useState<DictionaryEntry | null>(null),
    [base, setBase] = useState<DictionaryEntry | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const card = cardRef.current,
      word = card?.querySelector<HTMLElement>(".wc-word");
    if (!card || !word) return;
    const fit = () => {
      word.style.fontSize = "";
      let n = parseFloat(getComputedStyle(word).fontSize);
      while (word.scrollWidth > card.clientWidth - 20 && n > 12)
        word.style.fontSize = `${--n}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    return () => observer.disconnect();
  }, [entry]);
  useEffect(() => {
    let active = true;
    (async () => {
      const e: DictionaryEntry | null = await dictLookup(x.w),
        b = e?.lemma && !e.zh ? await dictLookup(e.lemma.word) : null;
      if (active) {
        setEntry(e);
        setBase(b);
      }
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, [x.w]);
  if (!entry)
    return (
      <article className="ws-card">
        <div className="de-head">
          <h2 className="de-word">
            <span className="de-plain">{x.w}</span>
          </h2>
          <div className="de-ipa">
            <span className="wc-ipa">/{x.ipa}/</span>
          </div>
          <SayButton text={x.w} className="btn small primary">
            <Icon name="speaker" /> 发音
          </SayButton>
        </div>
        <p className="ws-gloss">{x.g}</p>
      </article>
    );
  const a: DisplayAnalysis = dictAnalyze(entry);
  const forms = new Map<string, (string | undefined)[]>();
  (entry.forms || []).forEach(([key, v]) =>
    v.split(",").forEach((word) => {
      if (word && word !== entry.word)
        forms.set(word, [...(forms.get(word) || []), formNames[key]]);
    }),
  );
  const defs = (entry.zh || base?.zh || "")
      .split("\n")
      .filter(Boolean)
      .slice(0, 5),
    examples = (entry.ex?.length ? entry.ex : base?.ex || []).slice(0, 2);
  const syllableStarts = a.syl;
  const syllables =
    syllableStarts && syllableStarts.length > 1
      ? syllableStarts
          .map((start, i) => entry.word.slice(start, syllableStarts[i + 1]))
          .join("·")
      : "";
  return (
    <BlendScope>
      <article className="ws-card" ref={cardRef}>
        <div className="de-head">
          <h2 className="de-word">
            <SayButton
              text={entry.word}
              className="wc-word"
              aria-label={`朗读 ${entry.word}`}
            >
              {a.segs ? (
                <WordTiles analysis={a} />
              ) : (
                <span className="de-plain">{entry.word}</span>
              )}
            </SayButton>
          </h2>
          <div className="de-ipa">
            <IPASpans tokens={a.tokens} className="wc-ipa" text={a.text} />
            {syllables && (
              <span className="de-syl">
                音节 <b>{syllables}</b>
              </span>
            )}
          </div>
          <div className="de-actions">
            <SayButton text={entry.word} className="btn small primary">
              <Icon name="speaker" /> 发音
            </SayButton>
            {a.segs && <BlendButton analysis={a} className="btn small ghost" />}
          </div>
        </div>
        {defs.length > 0 && (
          <ul className="de-defs">
            {defs.map((line, i) => {
              const m = line.match(/^([a-z]+\.)\s*(.*)$/);
              return (
                <li key={i}>
                  {m ? (
                    <>
                      <span className="pos">{m[1]}</span>
                      <span>{m[2]}</span>
                    </>
                  ) : (
                    <span>{line}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {examples.length > 0 && (
          <ol className="sentences">
            {examples.map(([en, zh], i) => (
              <li key={i}>
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
                    <Sentence text={en} words={[entry.word, ...forms.keys()]} />
                  </p>
                  {zh && <p className="zh">{zh}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        {forms.size > 0 && (
          <div className="de-forms">
            {[...forms].map(([word, names]) => (
              <span key={word} className="de-form">
                <em>{[...new Set(names)].join(" / ")}</em>
                <b>{word}</b>
              </span>
            ))}
          </div>
        )}
        <p className="hint">
          <a
            href={`./dict/${encodeURIComponent(entry.word)}`}
            target="_blank"
            rel="noopener"
          >
            在词典里看完整的拼读拆解 ↗
          </a>
        </p>
      </article>
    </BlendScope>
  );
}
