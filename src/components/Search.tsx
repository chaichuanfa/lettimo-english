import { navigate } from "../router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { search } from "../services/search";
import { Icon } from "./UI";
const suggestions = [
  "cake",
  "th",
  "ough",
  "/eɪ/",
  "魔法 e",
  "不发音",
  "现在完成时",
  "定语从句",
  "苹果",
];
export function Mark({ text = "", query = "" }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  return i < 0 || !query ? (
    text
  ) : (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}
export default function Search() {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const groups = useMemo(() => search(query), [query]);
  const items = groups.flatMap((g) => g.items);
  useEffect(() => {
    const open = () => {
      if (dialog.current && !dialog.current.open) {
        dialog.current.showModal();
        input.current?.select();
      }
    };
    const key = (e: KeyboardEvent) => {
      const typing = (e.target instanceof Element ? e.target : null)?.closest(
        'input,textarea,select,[contenteditable="true"]',
      );
      if (
        (e.key === "k" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey)
      ) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("phonics:search", open);
    document.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("phonics:search", open);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    dialog.current
      ?.querySelector(`#sr-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const go = (i: number) => {
    const item = items[i];
    if (!item) return;
    dialog.current?.close();
    navigate(item.href);
  };
  const outside = (e: React.PointerEvent<HTMLDialogElement>) => {
    const r = dialog.current!.getBoundingClientRect();
    return (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    );
  };
  const pressed = useRef(false);
  let number = 0;
  return (
    <dialog
      id="search-dialog"
      ref={dialog}
      closedby="any"
      aria-labelledby="search-title"
      onPointerDown={(e) => {
        pressed.current = outside(e);
      }}
      onPointerUp={(e) => {
        if (
          !("closedBy" in HTMLDialogElement.prototype) &&
          pressed.current &&
          outside(e)
        )
          dialog.current?.close();
      }}
    >
      <h2 id="search-title" className="visually-hidden">
        搜索
      </h2>
      <div className="sd-head">
        <Icon name="search" />
        <input
          ref={input}
          id="search-input"
          type="search"
          role="combobox"
          aria-expanded={!!items.length}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={items[active] ? `sr-${active}` : undefined}
          aria-label="搜索单词、字母组合、音标或课程"
          placeholder="搜单词、字母组合、音标、中文…"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) {
              e.preventDefault();
              setActive((active + 1) % items.length);
            } else if (e.key === "ArrowUp" && items.length) {
              e.preventDefault();
              setActive((active - 1 + items.length) % items.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(active);
            }
          }}
        />
        <form method="dialog">
          <button className="sd-close" aria-label="关闭搜索">
            Esc
          </button>
        </form>
      </div>
      <p id="search-status" className="visually-hidden" role="status">
        {query
          ? items.length
            ? `找到 ${items.length} 个结果`
            : "没有结果"
          : ""}
      </p>
      <div id="search-results" role="listbox" aria-label="搜索结果">
        {!query.trim() ? (
          <div className="sr-empty">
            <p>可以搜索单词、中文意思、字母组合、音标或课程名，例如：</p>
            <div className="sr-suggest">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="chip-btn"
                  onClick={() => {
                    setQuery(s);
                    setActive(0);
                    input.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : !items.length ? (
          <div className="sr-empty">
            <p>
              没有找到“{query}”相关的内容。可以试试其他拼写、中文意思或音标。
            </p>
          </div>
        ) : (
          groups.map((group, gi) => (
            <div
              role="group"
              className="sr-group"
              aria-labelledby={`srg-${gi}`}
              key={group.label}
            >
              <h3 id={`srg-${gi}`} className="sr-gh">
                {group.label}
              </h3>
              {group.items.map((it) => {
                const i = number++;
                return (
                  <div
                    role="option"
                    id={`sr-${i}`}
                    className="sr-item"
                    aria-selected={active === i}
                    key={it.href}
                    onClick={() => go(i)}
                    onPointerMove={() => setActive(i)}
                  >
                    <span className="sr-emoji" aria-hidden="true">
                      {it.type === "dict"
                        ? "📖"
                        : (it.type === "word" ? it.emoji : "") ||
                          (it.type === "sent"
                            ? "💬"
                            : it.type === "grammar"
                              ? "🧩"
                              : "🔤")}
                    </span>
                    <span className="sr-main">
                      <b
                        className={
                          it.type === "word" || it.type === "dict"
                            ? "sr-word"
                            : ""
                        }
                      >
                        <Mark
                          text={
                            it.type === "dict"
                              ? it.w
                              : it.type === "word"
                                ? it.text
                                : it.l.title
                          }
                          query={query}
                        />
                      </b>
                      {it.type === "word" && it.ipa && (
                        <span className="ipa"> {it.ipa}</span>
                      )}{" "}
                      <span className="sr-sub">
                        <Mark
                          text={
                            it.type === "dict"
                              ? "在词典中查看音标、释义、例句和拼读拆解"
                              : it.type === "sent"
                                ? it.en + " " + it.zh
                                : it.type === "word"
                                  ? it.zh
                                  : it.l.en
                          }
                          query={query}
                        />
                      </span>
                    </span>
                    <span className="sr-where">
                      {it.type !== "dict"
                        ? `第 ${it.l.id} 课 · ${it.l.title}`
                        : "词典"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      <div className="sd-foot" aria-hidden="true">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> 选择
        </span>
        <span>
          <kbd>Enter</kbd> 打开
        </span>
        <span>
          <kbd>Esc</kbd> 关闭
        </span>
      </div>
    </dialog>
  );
}
