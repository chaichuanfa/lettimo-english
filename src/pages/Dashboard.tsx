import React from "react";
interface CourseProps {
  color: string;
  icon: string;
  title: string;
  sub: string;
  done?: number;
  total?: number;
  tag?: string;
  note?: string;
  children: React.ReactNode;
}
import { STAGES, GRAMMAR, LESSONS, G_LESSONS } from "../data";
import { useApp } from "../state";
import { useVocab, vocabCounts } from "../vocab-store";
import { grammarWrongList } from "./Grammar";
import { Icon } from "../components/UI";
import DailyQuote from "../components/DailyQuote";
function Course({
  color,
  icon,
  title,
  sub,
  done = 0,
  total,
  tag,
  note,
  children,
}: CourseProps) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <article className="dash-card" style={{ "--lv": color }}>
      <div className="dc-top">
        <span className="dc-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="dc-name">
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        {tag ? (
          <span className="dc-tag">{tag}</span>
        ) : (
          <b className="dc-pct">{pct}%</b>
        )}
      </div>
      {total ? (
        <>
          <div className="bar">
            <i style={{ width: pct + "%" }} />
          </div>
          <p className="dc-meta">
            已完成 {done} / {total} 课
          </p>
        </>
      ) : (
        <p className="dc-meta">{note}</p>
      )}
      <div className="dc-cta">{children}</div>
    </article>
  );
}
export default function Dashboard() {
  const app = useApp();
  useVocab();
  const counts = vocabCounts();
  const pn =
    LESSONS.find((l) => !app.progress.lessons[l.id]?.done) || LESSONS.at(-1);
  const gn =
    G_LESSONS.find((l) => !app.progress.grammar[l.id]?.done) || G_LESSONS[0];
  const pd = LESSONS.filter((l) => app.progress.lessons[l.id]?.done).length,
    gd = G_LESSONS.filter((l) => app.progress.grammar[l.id]?.done).length;
  const gw = grammarWrongList().length,
    total = counts.due + gw + app.wrong.length;
  return (
    <>
      <section className="page-head dash-head">
        <p className="eyebrow">English Path</p>
        <h1>今天学点什么？</h1>
        <p className="lead">
          拼读、语法、单词——从小学的英语基础到四六级词汇，一步一步来。
        </p>
        <button
          className="hero-search"
          onClick={() => window.dispatchEvent(new Event("phonics:search"))}
        >
          <Icon name="search" />
          <span>搜单词、语法点、字母组合或中文…</span>
          <kbd>/</kbd>
        </button>
      </section>
      <DailyQuote />
      <section className="dash-grid" aria-label="课程">
        <Course
          color="#58CC02"
          icon="🔤"
          title="拼读"
          sub={`Phonics · ${STAGES.length} 个阶段`}
          done={pd}
          total={LESSONS.length}
        >
          {pn && (
            <a className="btn primary" href={`./lesson/${pn.id}`}>
              {pd ? "继续" : "开始"}：{pn.title} <Icon name="arrow" />
            </a>
          )}
          <a className="btn ghost" href="./phonics">
            学习路径
          </a>
        </Course>
        <Course
          color="#1CB0F6"
          icon="🧩"
          title="语法"
          sub={`Grammar · ${GRAMMAR.length} 个阶段`}
          done={gd}
          total={G_LESSONS.length}
        >
          <a className="btn primary" href={`./grammar/${gn.id}`}>
            {gd ? "继续" : "开始"}：{gn.title} <Icon name="arrow" />
          </a>
          <a className="btn ghost" href="./grammar">
            课程目录
          </a>
        </Course>
        <Course
          color="#CE82FF"
          icon="📚"
          title="单词"
          sub="Words · 背单词"
          tag={counts.started ? "每天学一点" : "选一本词书"}
          note={
            counts.started
              ? `已学 ${counts.learned} 个 · 今天到期 ${counts.due} 个`
              : "中考 · 高考 · 四级 · 六级，按间隔复习"
          }
        >
          <a
            className="btn primary"
            href={counts.started ? "./words/study" : "./words"}
          >
            {counts.started ? "开始今天的学习" : "选词书，开始背单词"}{" "}
            <Icon name="arrow" />
          </a>
          <a className="btn ghost" href="./words">
            词书与进度
          </a>
        </Course>
        <Course
          color="#FF9600"
          icon="🔁"
          title="复习"
          sub="Review · 单词、语法、拼读"
          tag={total ? `${total} 项待复习` : "都复习完了"}
          note={`单词到期 ${counts.due} 个 · 语法错题 ${gw} 道 · 拼读错词 ${app.wrong.length} 个`}
        >
          <a className="btn primary" href="./review">
            去复习 <Icon name="arrow" />
          </a>
        </Course>
      </section>
    </>
  );
}
