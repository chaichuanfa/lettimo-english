import { PageIntro } from "./components/Mascot";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Route } from "./router";
import {
  parseRoute,
  currentPath,
  siteBase,
  subscribeNavigation,
} from "./router";
import { useApp, saveAll, RATES } from "./state";
import { Speech, LESSONS, G_LESSONS, STAGES } from "./data";
import { Icon, NotFound } from "./components/UI";
import Search from "./components/Search";
import Dashboard from "./pages/Dashboard";
import {
  PhonicsPage,
  StagePage,
  LessonPage,
  SoundsPage,
  PhonicsPractice,
} from "./pages/Phonics";
import {
  GrammarPage,
  GrammarLesson,
  GrammarRedo,
  grammarWrongList,
} from "./pages/Grammar";
import Words from "./pages/Words";
import Guide from "./pages/Guide";
import Dictionary from "./pages/Dictionary";
import { useVocab, vocabCounts } from "./vocab-store";
import { useOffline } from "./pwa";
const SITE_NAME = "Lettimo 英语";
/** "更多"菜单里的离线入口：网页、音素、词典首次打开后已离线可用；课程音频可一次下载 */
function OfflineItem() {
  const { status, progress, download } = useOffline();
  if (!status) return null;
  const busy = progress?.type === "progress";
  const all = status.audioCached >= status.audioTotal;
  const mb = Math.round(status.audioBytes / 1048576);
  let label = `下载全部课程音频（约 ${mb}MB）`;
  if (busy) label = `正在下载音频 ${Math.floor((progress.done / progress.total) * 100)}%`;
  else if (all) label = "课程音频已可离线播放";
  else if (progress?.type === "done" && progress.failed) label = `有 ${progress.failed} 个没下载成功，点击重试`;
  return (
    <button
      type="button"
      className="mm-item offline-btn"
      aria-disabled={busy || all}
      title="网页、音素和词典第一次打开后已可离线使用；课程单词和例句音频播放过的会自动保存，也可以在这里一次下载全部"
      onClick={() => {
        if (!busy && !all) download();
      }}
    >
      <span>{label}</span>
      <b className="rate-val" aria-live="polite">
        {busy ? `${progress.done}/${progress.total}` : all ? "✓" : `${status.audioCached}/${status.audioTotal}`}
      </b>
    </button>
  );
}
const NAV = [
  ["", "首页", "home"],
  ["phonics", "拼读", "blend"],
  ["grammar", "语法", "pen"],
  ["words", "单词", "book"],
  ["review", "复习", "review"],
] as const;
function Review() {
  const [redoKey, setRedoKey] = useState(0);
  const app = useApp();
  useVocab();
  const c = vocabCounts(),
    gw = grammarWrongList();
  return (
    <>
      <section className="page-head">
        <PageIntro pose="cheer">
          <p className="eyebrow">Review</p>
          <h1>复习</h1>
          <p className="lead">
            三门课的复习都在这里：单词按间隔复习，语法重做错题，拼读做练习。
          </p>
        </PageIntro>
      </section>
      <section className="block rv-block" style={{ "--lv": "#CE82FF" }}>
        <h2 className="block-title">
          <span aria-hidden="true">📚</span> 单词{" "}
          <small>到期的词按间隔复习</small>
        </h2>
        <p className="rv-line">
          {c.started ? (
            <>
              今天有 <b>{c.due}</b> 个到期单词，已学 {c.learned} 个。
            </>
          ) : (
            "先选一本词书，开始背单词。学过的词会按间隔安排复习。"
          )}
        </p>
        <div className="dc-cta">
          {c.due > 0 && (
            <a className="btn primary" href="./words/study?only=review">
              开始复习 <Icon name="arrow" />
            </a>
          )}
          <a className="btn ghost" href="./words">
            {c.started ? "词书与进度" : "选择词书"}
          </a>
        </div>
      </section>
      <section className="block rv-block" style={{ "--lv": "#1CB0F6" }}>
        <h2 className="block-title">
          <span aria-hidden="true">🧩</span> 语法 <small>错题本</small>
          {gw.length > 0 && (
            <button
              className="link-btn"
              onClick={() => {
                if (confirm("确定要清空语法错题本吗？")) {
                  Speech.stop();
                  app.gwrong = [];
                  saveAll();
                  setRedoKey((k) => k + 1);
                }
              }}
            >
              清空错题本
            </button>
          )}
        </h2>
        <GrammarRedo key={redoKey} />
      </section>
      <PhonicsPractice />
    </>
  );
}
function titleFor({ name, arg }: Route) {
  if (name === "lesson")
    return `${LESSONS.find((l) => l.id === arg)?.title || "页面不存在"} · 拼读`;
  if (name === "stage")
    return `${STAGES.find((s) => s.id === +arg)?.title || "页面不存在"} · 拼读`;
  if (name === "grammar" && arg)
    return `${G_LESSONS.find((l) => l.id === arg)?.title || "页面不存在"} · 语法`;
  const titles: Record<string, string> = {
    phonics: "拼读",
    grammar: "语法",
    words: "单词",
    review: "复习",
    sounds: "音标总表",
    guide: "学习指南",
    dict: arg ? `${arg} · 词典` : "词典",
    "not-found": "页面不存在",
  };
  return titles[name];
}
export default function AppView() {
  const app = useApp(),
    [location, setLocation] = useState(() => ({
      path: currentPath(),
      revision: 0,
    }));
  const route = parseRoute(location.path, siteBase()),
    { name, arg, params } = route;
  const topbar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  useLayoutEffect(() => {
    const header = topbar.current;
    if (!header) return;
    const rootStyle = document.documentElement.style;
    const syncHeight = () => {
      rootStyle.setProperty(
        "--topbar-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(header, { box: "border-box" });
    return () => {
      observer.disconnect();
      rootStyle.removeProperty("--topbar-height");
    };
  }, []);
  useEffect(() => {
    const update = () =>
      setLocation((old) => ({
        path: currentPath(),
        revision: old.revision + 1,
      }));
    return subscribeNavigation(update);
  }, []);
  useEffect(() => {
    Speech.stop();
    document.title = name
      ? `${titleFor(route)} · ${SITE_NAME}`
      : SITE_NAME;
    window.scrollTo(0, 0);
    setFallbackOpen(false);
    if (
      "popover" in HTMLElement.prototype &&
      menu.current?.matches(":popover-open")
    )
      menu.current.hidePopover();
    return () => Speech.stop();
  }, [location]);
  useEffect(() => {
    const storage = (e: StorageEvent) => {
      if (e.key === "phonics-path.theme") applyTheme(e.newValue);
    };
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, []);
  useEffect(() => {
    if ("popover" in HTMLElement.prototype) return;
    const close = (e: Event) => {
      if (
        (e.type === "keydown" &&
          e instanceof KeyboardEvent &&
          e.key === "Escape") ||
        (e.type === "click" &&
          !(
            e.target instanceof Element &&
            e.target.closest("#more-menu,.more-btn")
          ))
      )
        setFallbackOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const active = ["stage", "lesson", "sounds"].includes(name)
    ? "phonics"
    : name;
  let page;
  switch (name) {
    case "":
      page = <Dashboard />;
      break;
    case "phonics":
      page = <PhonicsPage />;
      break;
    case "stage":
      page = <StagePage id={arg} />;
      break;
    case "lesson":
      page = <LessonPage id={arg} params={params} />;
      break;
    case "sounds":
      page = <SoundsPage />;
      break;
    case "grammar":
      page = arg ? <GrammarLesson id={arg} /> : <GrammarPage />;
      break;
    case "words":
      page = <Words sub={arg} params={params} />;
      break;
    case "review":
      page = <Review />;
      break;
    case "guide":
      page = <Guide />;
      break;
    case "dict":
      page = <Dictionary word={arg} />;
      break;
    default:
      page = <NotFound />;
  }
  return (
    <>
      <header className="topbar" ref={topbar}>
        <a className="brand" href="./" aria-label={`${SITE_NAME}首页`}>
          <img
            className="brand-mark"
            src="assets/phonics-logo.webp"
            width="38"
            height="38"
            alt=""
          />
          <span className="brand-text">
            Lettimo
            <small>英语学习</small>
          </span>
        </a>
        <nav className="nav" aria-label="主导航">
          {NAV.map(([path, label, icon]) => (
            <a
              key={path}
              href={"./" + path}
              className={active === path ? "on" : ""}
              aria-current={active === path ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="tools">
          <button
            className="pill search-btn"
            onClick={() => window.dispatchEvent(new Event("phonics:search"))}
            aria-label="搜索（快捷键 /）"
          >
            <Icon name="search" />
            <span>搜索</span>
            <kbd>/</kbd>
          </button>
          <button
            className="pill more-btn"
            type="button"
            popoverTarget="more-menu"
            aria-controls="more-menu"
            aria-label="更多：词典、音标总表、学习指南和设置"
            onClick={() => {
              if (!("popover" in HTMLElement.prototype))
                setFallbackOpen(!fallbackOpen);
            }}
          >
            <Icon name="more" />
          </button>
          <div
            id="more-menu"
            ref={menu}
            className={`more-menu${fallbackOpen ? " :popover-open" : ""}`}
            popover="auto"
          >
            <a className="mm-item" href="./dict">
              词典
            </a>
            <a className="mm-item" href="./sounds">
              音标总表
            </a>
            <a className="mm-item" href="./guide">
              学习指南
            </a>
            <hr />
            <button
              type="button"
              className="mm-item rate-btn"
              title="点击切换 1× / 0.75× / 0.5×"
              aria-label={`朗读速度 ${app.settings.rate} 倍，点击切换`}
              onClick={() => {
                app.settings.rate =
                  RATES[(RATES.indexOf(app.settings.rate) + 1) % RATES.length];
                saveAll();
              }}
            >
              <span>朗读速度</span>
              <b className="rate-val">🐢 {app.settings.rate}×</b>
            </button>
            <OfflineItem />
            <button
              type="button"
              className="mm-item theme-btn"
              onClick={toggleTheme}
            >
              <span className="when-light">
                <span>切换到深色模式</span>
                <Icon name="moon" />
              </span>
              <span className="when-dark">
                <span>切换到浅色模式</span>
                <Icon name="sun" />
              </span>
            </button>
          </div>
        </div>
      </header>
      <main id="view" key={location.path + ":" + location.revision}>
        {page}
      </main>
      {name === "" && (
        <footer className="foot">
          <p>
            {SITE_NAME} · 拼读、语法和单词（中考到四六级词汇） ·
            进度保存在本机浏览器
          </p>
          <p>
            <a href="./guide">学习指南与音频来源说明</a>
          </p>
        </footer>
      )}
      <Search />
    </>
  );
}
function applyTheme(theme: string | null) {
  if (theme === "light" || theme === "dark")
    document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((m) => {
      m.content =
        theme === "dark"
          ? "#131F24"
          : theme === "light"
            ? "#FFFFFF"
            : m.media.includes("dark")
              ? "#131F24"
              : "#FFFFFF";
    });
}
function toggleTheme() {
  const system = matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  const shown = document.documentElement.dataset.theme || system;
  const next = shown === "dark" ? "light" : "dark";
  try {
    if (next === system) localStorage.removeItem("phonics-path.theme");
    else localStorage.setItem("phonics-path.theme", next);
  } catch {}
  applyTheme(next === system ? null : next);
}
