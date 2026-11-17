import { Mascot } from "../components/Mascot";
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
import DailyChallenge from "../components/DailyChallenge";
import { recommendStudy } from "../features/dashboard";
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
      <div className="dc-cta dc-cta--row">{children}</div>
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
  const recommendation = recommendStudy(
    app.progress,
    LESSONS,
    G_LESSONS,
    counts.due,
    gw + app.wrong.length,
    counts.started,
  );
  return (
    <>
      <section className="page-head dash-head">
        <p className="eyebrow">Lettimo</p>
        <h1>每天一点，英语更进一步</h1>
        <p className="lead">
          从拼读到单词，从语法到表达，按自己的节奏，把英语基础学扎实。
        </p>
      </section>
      <section className="today-study" aria-labelledby="today-title">
        <div className="today-copy">
          <Mascot pose="wave" className="reading-mascot" />
          <p className="today-eyebrow">
            <Icon name="sun" /> 今日学习 · 每天进步一点点
          </p>
          <h2 id="today-title">{recommendation.title}</h2>
          <p className="today-description">{recommendation.description}</p>
          <div className="today-actions">
            <a className="btn primary" href={recommendation.href}>
              {recommendation.action} <Icon name="arrow" />
            </a>
            {!counts.started && (
              <a className="today-alternative" href="./words">
                也可以从背单词开始
              </a>
            )}
          </div>
        </div>
        <div className="today-path">
          <p>一点巩固，一点新收获</p>
          <ol role="list">
            <li>
              <span className="today-step">
                <Icon name="review" />
              </span>
              <div>
                <b>温习旧知识</b>
                <span>
                  {total ? `${total} 项等待复习` : "暂时没有待复习内容"}
                </span>
              </div>
            </li>
            <li>
              <span className="today-step">
                <Icon name="book" />
              </span>
              <div>
                <b>学一点新内容</b>
                <span>跟着自己的进度往前走</span>
              </div>
            </li>
            <li>
              <span className="today-step">
                <Icon name="pen" />
              </span>
              <div>
                <b>试一道小挑战</b>
                <span>就在下方，随时试试</span>
              </div>
            </li>
          </ol>
        </div>
      </section>
      <div className="daily-grid">
        <DailyQuote />
        <DailyChallenge />
      </div>
      <div className="dash-section-heading">
        <h2>我的学习</h2>
        <p>按自己的节奏，一步一步来</p>
      </div>
      <section className="dash-grid" aria-label="课程">
        <Course
          color="#58CC02"
          icon="🔤"
          title="拼读"
          sub={`Phonics · ${STAGES.length} 个阶段`}
          done={pd}
          total={LESSONS.length}
        >
          <a className="btn ghost" href="./phonics">
            学习路径
          </a>
          {pn && (
            <a className="btn primary" href={`./lesson/${pn.id}`}>
              {pd ? "继续" : "开始"}：{pn.title} <Icon name="arrow" />
            </a>
          )}
        </Course>
        <Course
          color="#1CB0F6"
          icon="🧩"
          title="语法"
          sub={`Grammar · ${GRAMMAR.length} 个阶段`}
          done={gd}
          total={G_LESSONS.length}
        >
          <a className="btn ghost" href="./grammar">
            课程目录
          </a>
          <a className="btn primary" href={`./grammar/${gn.id}`}>
            {gd ? "继续" : "开始"}：{gn.title} <Icon name="arrow" />
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
          <a className="btn ghost" href="./words">
            词书与进度
          </a>
          <a
            className="btn primary"
            href={counts.started ? "./words/study" : "./words"}
          >
            {counts.started ? "开始今天的学习" : "选词书，开始背单词"}{" "}
            <Icon name="arrow" />
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
      <nav className="dash-shortcuts" aria-label="学习工具">
        <a href="./dict">
          <span className="shortcut-icon">
            <Icon name="search" />
          </span>
          <span>
            <b>查词典</b>
            <small>释义、发音与例句</small>
          </span>
          <Icon name="arrow" />
        </a>
        <a href="./sounds">
          <span className="shortcut-icon">
            <Icon name="speaker" />
          </span>
          <span>
            <b>音标总表</b>
            <small>听一听，练准每个音</small>
          </span>
          <Icon name="arrow" />
        </a>
        <a href="./guide">
          <span className="shortcut-icon">
            <Icon name="book" />
          </span>
          <span>
            <b>学习指南</b>
            <small>找到适合自己的起点</small>
          </span>
          <Icon name="arrow" />
        </a>
      </nav>
    </>
  );
}
