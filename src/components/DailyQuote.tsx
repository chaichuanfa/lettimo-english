import React, { useEffect, useState } from "react";
import { SayButton } from "./UI";
const Q = window.DailyQuote;
export default function DailyQuote() {
  const [quote, setQuote] = useState(() => {
      try {
        const q = Q.normalize(
          JSON.parse(
            localStorage.getItem("phonics-path.daily-quote") ?? "null",
          ),
        );
        return q && q.date <= Q.day() ? q : null;
      } catch {
        return null;
      }
    }),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    let alive = true,
      pending = false,
      current = quote;
    const update = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const next = await Q.load();
        if (alive) {
          current = next;
          setQuote(next);
          setBusy(false);
        }
      } finally {
        pending = false;
      }
    };
    const refresh = () => {
      if (current?.date !== Q.day()) update();
    };
    update();
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return (
    <section
      className="daily-quote"
      aria-labelledby="daily-quote-title"
      aria-busy={busy}
    >
      <div className="dq-content">
        <div className="dq-heading">
          <h2 id="daily-quote-title">每日一句</h2>
          <time dateTime={quote?.date || ""}>
            {quote?.date.replaceAll("-", ".")}
          </time>
        </div>
        <p className="dq-english" lang="en">
          {quote?.english ||
            (busy
              ? "正在准备今天的一句话…"
              : "今天的一句话暂时没加载出来，下次来看看。")}
        </p>
        <p className="dq-chinese" lang="zh-CN">
          {quote?.chinese || ""}
        </p>
        {quote && (
          <a
            className="dq-source"
            href={quote.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            来源：{quote.source}
          </a>
        )}
      </div>
      {quote && (
        <SayButton
          className="dq-play"
          text={quote.english}
          clip={quote.audio}
          toggle
        />
      )}
    </section>
  );
}
