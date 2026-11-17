import { navigate } from "../router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DICT,
  DICT_TRY,
  FORM_NAMES,
  TAG_NAMES,
  normWord,
  dictIndex,
  dictLookup,
  dictShard,
  dictAnalyze,
  curIndex,
  lessonForSeg,
  formGloss,
} from "../services/dictionary";
import { SOUNDS, Speech } from "../data";
import { load, save, useApp, saveAll } from "../state";
import { useVocab, hasCustomWord, addCustomWord } from "../vocab-store";
import {
  Icon,
  IPASpans,
  WordTiles,
  BlendScope,
  BlendButton,
  SayButton,
  Sentence,
} from "../components/UI";
import type { DictionaryEntry, SpeechStep } from "../types/app";
import type { G2PSegment } from "../types/phonics";
interface LookupResult {
  entry: DictionaryEntry;
  base: DictionaryEntry | null;
}
interface Suggestion {
  word: string;
  gloss: string;
}
const link = (w: string) => "./dict/" + encodeURIComponent(w);
const Chips = ({ words }: { words: string[] }) => (
  <div className="chip-row">
    {words.map((w) => (
      <a key={w} className="chip-btn" href={link(w)}>
        {w}
      </a>
    ))}
  </div>
);
function withinOne(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++diff > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return diff + a.length - i + b.length - j <= 1;
}
function Missing({ word }: { word: string }) {
  const near = (DICT.words || [])
    .filter((w) => withinOne(w, word) || w.startsWith(word))
    .slice(0, 8);
  return (
    <section className="block dict-miss">
      <h2 className="block-title">没有找到“{word}”</h2>
      {!!near.length && (
        <>
          <p>你是不是要找：</p>
          <Chips words={near} />
        </>
      )}
      <p className="hint">
        词典收录约 4
        万个常用词，暂不支持词组和专有名词。请检查拼写，或换成单词原形再查。
      </p>
    </section>
  );
}
function Entry({ entry: e, base }: LookupResult) {
  const app = useApp();
  useVocab();
  const a = dictAnalyze(e),
    cur = curIndex().words.get(e.word);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const head = ref.current;
    const button = head?.querySelector<HTMLElement>(".wc-word");
    if (!head || !button) return;
    const fit = () => {
      button.style.fontSize = "";
      let n = parseFloat(getComputedStyle(button).fontSize);
      while (button.scrollWidth > head.clientWidth - 8 && n > 16)
        button.style.fontSize = (n -= 2) + "px";
    };
    fit();
    const ob = new ResizeObserver(fit);
    ob.observe(head);
    return () => ob.disconnect();
  }, [e.word]);
  const byWord = new Map<string, (string | undefined)[]>();
  [...e.forms]
    .sort((x, y) => "spdi3rt".indexOf(x[0]) - "spdi3rt".indexOf(y[0]))
    .forEach(([k, v]) =>
      v.split(",").forEach((f) => {
        if (f && f !== e.word)
          byWord.set(f, [...(byWord.get(f) || []), FORM_NAMES[k]]);
      }),
    );
  const defs = (e.zh || base?.zh || "").split("\n").filter(Boolean),
    saved = base && !e.zh ? base.word : e.word;
  const syllableStarts = a.syl;
  const syllables =
    syllableStarts && syllableStarts.length > 1
      ? syllableStarts
          .map((start, i) => e.word.slice(start, syllableStarts[i + 1]))
          .join("·")
      : "";
  const ex = e.ex.length ? e.ex : base?.ex || [];
  const words = [e.word, ...(base ? [base.word] : []), ...byWord.keys()];
  const segIPA = (s: G2PSegment) =>
    s.silent
      ? ""
      : "/" + s.ph.map((k) => a.tokens[k].replace(/[ˈˌ]/g, "")).join("") + "/";
  return (
    <>
      <BlendScope>
        <article className="block de-card" data-word={e.word}>
          <div className="de-head" ref={ref}>
            {cur?.emoji && (
              <div className="de-emoji" aria-hidden="true">
                {cur.emoji}
              </div>
            )}
            <h2 className="de-word">
              <SayButton
                className="wc-word"
                text={e.word}
                aria-label={`朗读 ${e.word}`}
              >
                {a.segs ? (
                  <WordTiles analysis={a} />
                ) : (
                  <span className="de-plain">{e.word}</span>
                )}
              </SayButton>
            </h2>
            <div className="de-ipa">
              <IPASpans tokens={a.tokens} className="wc-ipa" text={e.word} />
              {e.ipa.length > 1 && (
                <span className="de-alt">
                  也读{" "}
                  {e.ipa
                    .slice(1)
                    .map((x) => "/" + x.replaceAll(" ", "") + "/")
                    .join("　")}
                </span>
              )}
            </div>
            <div className="de-actions">
              <SayButton className="btn primary" text={e.word}>
                <Icon name="speaker" /> 发音
              </SayButton>
              {a.segs && (
                <BlendButton analysis={a} className="btn ghost">
                  <Icon name="blend" /> 拼读
                </BlendButton>
              )}
              <button
                className={`btn ghost${hasCustomWord(saved) ? " on" : ""}`}
                aria-pressed={hasCustomWord(saved)}
                onClick={() => addCustomWord(saved)}
              >
                {hasCustomWord(saved) ? "已加入生词本" : "加入生词本"}
              </button>
            </div>
            <div className="de-meta">
              {syllables && (
                <span className="de-syl">
                  音节 <b>{syllables}</b>
                </span>
              )}
              {(e.tags || base?.tags || "")
                .split(" ")
                .filter((t) => TAG_NAMES[t])
                .map((t) => (
                  <span className="de-tag" key={t}>
                    {TAG_NAMES[t]}
                  </span>
                ))}
              {cur && (
                <a
                  className="de-lesson"
                  href={`./lesson/${cur.l.id}?w=${encodeURIComponent(e.word)}`}
                >
                  课程单词 · 第 {cur.l.id} 课 {cur.l.title}
                </a>
              )}
            </div>
          </div>
          {e.lemma && (
            <p className="de-lemma">
              {e.word} 是 <a href={link(e.lemma.word)}>{e.lemma.word}</a> 的
              {FORM_NAMES[e.lemma.type] || "变形"}
              {base && !e.zh ? "，下面是原形的释义" : ""}
            </p>
          )}
          {!!defs.length && (
            <>
              <h3 className="de-sub">释义</h3>
              <ul className="de-defs">
                {defs.map((d, i) => {
                  const m = d.match(/^([a-z]+\.)\s*(.*)$/);
                  return (
                    <li key={i}>
                      {m ? (
                        <>
                          <span className="pos">{m[1]}</span>
                          <span>{m[2]}</span>
                        </>
                      ) : (
                        <span>{d}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {!!byWord.size && (
            <>
              <h3 className="de-sub">词形变化</h3>
              <div className="de-forms">
                {[...byWord].map(([w, names]) => (
                  <span className="de-form" key={w}>
                    <em>{[...new Set(names)].join(" / ")}</em>
                    <a href={link(w)}>{w}</a>
                  </span>
                ))}
              </div>
            </>
          )}
        </article>
      </BlendScope>
      <section className="block">
        <h2 className="block-title">
          拼读拆解 <small>点任意一块听它的发音</small>
        </h2>
        {a.segs ? (
          <>
            {a.irregular && (
              <p className="de-warn">
                这个词的读法不完全符合常规拼读规则（常见于外来词和高频词），建议结合发音整体记忆。
              </p>
            )}
            <div className="ph-grid">
              {a.segs.map((s, i) => {
                const lesson = lessonForSeg(s),
                  odd = !s.silent && s.cost >= 0.6;
                return (
                  <div
                    className={`ph-seg${s.silent ? " silent" : ""}${odd ? " odd" : ""}`}
                    key={i}
                  >
                    <button
                      className="ph-btn"
                      disabled={s.silent}
                      aria-label={`${s.t} ${s.silent ? "不发音" : "读 " + segIPA(s)}`}
                      onClick={() =>
                        s.sid && SOUNDS[s.sid]
                          ? Speech.phoneme(s.sid)
                          : Speech.sequence(
                              (s.seq || []).flatMap<SpeechStep>((v) => [
                                { type: "p", v },
                                { type: "wait", v: 80 },
                              ]),
                            )
                      }
                    >
                      <span
                        className={`tile${s.silent ? " silent" : ""}${s.t.length > 1 ? " multi" : ""}`}
                      >
                        {s.t}
                      </span>
                      <span className="ph-ipa">
                        {s.silent ? "—" : segIPA(s)}
                      </span>
                    </button>
                    <span className="ph-name">
                      {s.silent
                        ? s.magic
                          ? "魔法 e · 不发音"
                          : "不发音"
                        : (s.sid ? SOUNDS[s.sid]?.zh : undefined) ||
                          (s.seq || [])
                            .map((id) => SOUNDS[id]?.zh || "")
                            .join(" + ")}
                      {odd && (
                        <i title="这个字母组合在这里的读法不常见">特殊</i>
                      )}
                    </span>
                    {lesson && (
                      <a className="ph-lesson" href={`./lesson/${lesson.id}`}>
                        第 {lesson.id} 课
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="hint ph-notes">
              {e.word} 拆成 {a.segs.length} 块，读出 {a.tokens.length} 个音：
              {a.segs
                .filter((s) => !s.silent)
                .map(segIPA)
                .join(" + ")}
              。
              {a.segs
                .filter((s) => s.magicE !== undefined)
                .map((s, i) => (
                  <React.Fragment key={i}>
                    <br />
                    {s.t}…e 是<b>魔法 e</b>：结尾的 e 不发音，让前面的 {s.t}{" "}
                    读长音 {segIPA(s)}。
                  </React.Fragment>
                ))}
              {a.segs.some((s) => s.silent && !s.magic) && (
                <>
                  <br />
                  不发音的字母：
                  {a.segs
                    .filter((s) => s.silent && !s.magic)
                    .map((s) => s.t)
                    .join("、")}
                  。
                </>
              )}
            </p>
          </>
        ) : (
          <p className="hint">
            这个词是缩写或读法特殊，没有拼读拆解，请直接听发音。
          </p>
        )}
      </section>
      {!!ex.length && (
        <section className="block">
          <h2 className="block-title">
            例句 <small>点句中单词可单独听</small>
            {ex.some(([, zh]) => zh) && (
              <button
                className="link-btn"
                onClick={() => {
                  app.settings.zh = !app.settings.zh;
                  saveAll();
                }}
              >
                {app.settings.zh ? "隐藏中文" : "显示中文"}
              </button>
            )}
          </h2>
          <ol className={`sentences${app.settings.zh ? "" : " nozh"}`}>
            {ex.map(([en, zh], i) => (
              <li key={i}>
                <SayButton className="icon-btn play" text={en} toggle />
                <div>
                  <p className="en">
                    <Sentence text={en} words={words} />
                  </p>
                  {zh && <p className="zh">{zh}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
export default function Dictionary({ word = "" }: { word?: string }) {
  const [value, setValue] = useState(word),
    [suggestions, setSuggestions] = useState<Suggestion[]>([]),
    [active, setActive] = useState(-1),
    [open, setOpen] = useState(false),
    [result, setResult] = useState<LookupResult | null>(null),
    [busy, setBusy] = useState(!!word),
    [recent, setRecent] = useState(() => load<string[]>("dictRecent", []));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    if (!word) {
      dictIndex();
      input.current?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    (async () => {
      const [entry] = await Promise.all([dictLookup(word), dictIndex()]);
      const base = entry?.lemma ? await dictLookup(entry.lemma.word) : null;
      if (!alive) return;
      setResult(entry ? { entry, base } : null);
      setBusy(false);
      if (entry)
        save(
          "dictRecent",
          [
            word,
            ...load<string[]>("dictRecent", []).filter((x) => x !== word),
          ].slice(0, 12),
        );
    })();
    return () => {
      alive = false;
    };
  }, [word]);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      const q = normWord(value);
      if (!q) {
        setSuggestions([]);
        return;
      }
      const words = await dictIndex();
      let matches = words.filter((w) => w.startsWith(q)).slice(0, 8);
      if (DICT.set?.has(q))
        matches = [q, ...matches.filter((w) => w !== q)].slice(0, 8);
      const shard = q.length >= 2 ? await dictShard(q.slice(0, 2)) : null;
      if (alive) {
        setSuggestions(
          matches.map((w) => ({ word: w, gloss: formGloss(shard?.[w]) })),
        );
        setActive(-1);
      }
    }, 60);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [value]);
  const go = (w: string) => {
    w = normWord(w);
    if (!w) return;
    setOpen(false);
    navigate(link(w));
  };
  return (
    <>
      <section className="page-head dict-head">
        <p className="eyebrow">Dictionary</p>
        <h1>词典</h1>
        <p className="lead">
          输入英文单词，查看音标、中文释义和例句，听发音，并按自然拼读规则一块一块拼出来。
        </p>
        <form
          className="dict-form"
          id="dict-form"
          role="search"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            go(active >= 0 && open ? suggestions[active].word : value);
          }}
        >
          <div className="dict-box">
            <Icon name="search" />
            <input
              id="dict-input"
              ref={input}
              type="search"
              role="combobox"
              aria-expanded={open && !!suggestions.length}
              aria-controls="dict-suggest"
              aria-autocomplete="list"
              aria-activedescendant={
                open && active >= 0 ? `ds-${active}` : undefined
              }
              aria-label="输入要查的英文单词"
              placeholder="输入英文单词，如 night"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onBlur={() => setOpen(false)}
              onKeyDown={(e) => {
                if (!suggestions.length || !open) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((active + 1) % suggestions.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive(
                    (active - 1 + suggestions.length) % suggestions.length,
                  );
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
            />
            <button className="btn primary" type="submit">
              查询
            </button>
          </div>
          <div
            id="dict-suggest"
            className="dict-suggest"
            role="listbox"
            aria-label="联想词"
            hidden={!open || !suggestions.length}
          >
            {suggestions.map((s, i) => (
              <div
                key={s.word}
                id={`ds-${i}`}
                role="option"
                aria-selected={active === i}
                className="ds-item"
                onPointerDown={(e) => e.preventDefault()}
                onPointerMove={() => setActive(i)}
                onClick={() => go(s.word)}
              >
                <b>{s.word}</b>
                <span>{s.gloss}</span>
              </div>
            ))}
          </div>
        </form>
      </section>
      <div id="dict-main" aria-live="polite">
        {!word ? (
          <>
            {recent.length > 0 && (
              <section className="block">
                <h2 className="block-title">
                  最近查过{" "}
                  <button
                    className="link-btn"
                    onClick={() => {
                      save("dictRecent", []);
                      setRecent([]);
                    }}
                  >
                    清空
                  </button>
                </h2>
                <Chips words={recent} />
              </section>
            )}
            <section className="block">
              <h2 className="block-title">试试这些</h2>
              <Chips words={DICT_TRY} />
              <p className="hint">
                每个单词都会按自然拼读规则拆成字母组合。点“拼读”逐个听每块的发音，对应的音标会同步高亮。
              </p>
            </section>
          </>
        ) : busy ? (
          <p className="hint dict-loading">正在查询…</p>
        ) : result ? (
          <Entry {...result} />
        ) : (
          <Missing word={word} />
        )}
      </div>
      <p className="hint dict-credit">
        收录约 4 万个常用词（含常见变形）。释义来自 ECDICT，例句来自 Tatoeba（CC
        BY 2.0 FR），音标来自 CMU
        发音词典（美式）。课程里学过的单词和例句播放预录音频，其他内容由浏览器朗读。
      </p>
    </>
  );
}
