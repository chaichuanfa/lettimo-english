import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  MouseEvent,
  Dispatch,
  SetStateAction,
} from "react";
import type { DisplayAnalysis, Lesson } from "../types/phonics";
import type { SpeechStep } from "../types/app";
import { Phonics, Speech, SOUNDS, G2P } from "../data";
import { Icon } from "./Icon";
export { Icon };

// Only repository-authored lesson prose may enter this component. Never pass user input.
export function RichText({
  html,
  ...props
}: HTMLAttributes<HTMLDivElement> & { html?: string }) {
  return <div {...props} dangerouslySetInnerHTML={{ __html: html || "" }} />;
}
export function NotFound() {
  return (
    <section className="page-head">
      <h1>页面不存在</h1>
      <p>
        <a className="btn primary" href="./">
          返回首页
        </a>
      </p>
    </section>
  );
}

type SayButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
  clip?: string;
  toggle?: boolean;
};
export function SayButton({
  text,
  clip,
  toggle = false,
  className = "",
  children,
  onClick,
  ...props
}: SayButtonProps) {
  const [playing, setPlaying] = useState(false);
  const run = useRef(0);
  useEffect(() => {
    const stop = () => {
      run.current++;
      setPlaying(false);
    };
    window.addEventListener("phonics:audio-start", stop);
    return () => {
      window.removeEventListener("phonics:audio-start", stop);
      run.current++;
    };
  }, []);
  async function click(e: MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (toggle && playing) {
      Speech.stop();
      setPlaying(false);
      return;
    }
    const promise =
      clip !== undefined ? Speech.clip(clip, text) : Speech.say(text);
    const id = ++run.current;
    setPlaying(true);
    try {
      await promise;
    } finally {
      if (run.current === id) setPlaying(false);
    }
  }
  const label = toggle
    ? playing
      ? "停止朗读"
      : "朗读整句"
    : props["aria-label"];
  return (
    <button
      type="button"
      {...props}
      className={`${className}${playing ? " playing" : ""}`}
      aria-label={label}
      aria-pressed={toggle ? playing : undefined}
      title={toggle ? label : props.title}
      onClick={click}
    >
      {toggle ? (
        <Icon name={playing ? "stop" : "play"} />
      ) : (
        children || <Icon name="speaker" />
      )}
    </button>
  );
}
export function SoundButton({
  sid,
  keyword,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  sid: string;
  keyword?: string;
}) {
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        keyword
          ? Speech.sequence([
              { type: "p", v: sid },
              { type: "wait", v: 350 },
              { type: "t", v: keyword },
            ])
          : Speech.phoneme(sid);
      }}
    >
      {children || <Icon name="speaker" />}
    </button>
  );
}
export function Sentence({
  text = "",
  words = [],
}: {
  text?: string;
  words?: string[];
}) {
  const hits = new Set(words.map((w) => String(w).toLowerCase()));
  return (
    <>
      {text.split(/([A-Za-z]+(?:['’][A-Za-z]+)*)/).map((part, i) =>
        /^[A-Za-z]/.test(part) ? (
          <button
            key={i}
            className={`sw${[part.toLowerCase(), part.toLowerCase().replace(/(es|s)$/, ""), part.toLowerCase().replace(/s$/, "")].some((w) => hits.has(w)) ? " hit" : ""}`}
            onClick={() => Speech.say(part)}
          >
            {part}
          </button>
        ) : (
          part
        ),
      )}
    </>
  );
}
interface BlendState {
  text: string;
  tile?: number;
  ips?: number[];
  done?: number[];
  all?: boolean;
}
const BlendContext = createContext<{
  state: BlendState | null;
  setState: Dispatch<SetStateAction<BlendState | null>>;
} | null>(null);
export function BlendScope({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BlendState | null>(null);
  return (
    <BlendContext.Provider value={{ state, setState }}>
      {children}
    </BlendContext.Provider>
  );
}
export function WordTiles({
  analysis: a,
  className = "",
}: {
  analysis: DisplayAnalysis;
  className?: string;
}) {
  const shared = useContext(BlendContext);
  const active = shared?.state?.text === a.text ? shared?.state : null;
  const tiles: {
    t: string;
    display?: string;
    stress?: boolean;
    hl?: boolean;
    silent?: boolean;
  }[] = a.syllables || a.segs || [{ t: a.text, display: a.text }];
  return (
    <span className={`tiles ${a.syllables ? "syl" : ""} ${className}`}>
      {tiles.map((s, i) => (
        <React.Fragment key={i}>
          {a.syllables && i > 0 && <span className="dot">·</span>}
          <span
            className={`tile${s.stress ? " stress" : ""}${s.hl ? " hl" : ""}${s.silent ? " silent" : ""}${(s.t?.length || 0) > 1 ? " multi" : ""}${active?.tile === i ? " active" : ""}${active?.all || active?.done?.includes(i) ? " done" : ""}`}
            data-i={i}
          >
            {s.display ?? s.t}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}
export function IPASpans({
  tokens,
  className = "ipa",
  text,
}: {
  tokens?: string[] | null;
  className?: string;
  text?: string;
}) {
  const shared = useContext(BlendContext);
  const active = shared?.state;
  return tokens?.length ? (
    <span className={className}>
      /
      {tokens.map((x, i) => (
        <span
          key={i}
          className={`ip${active?.ips?.includes(i) && (!text || text === active.text) ? " active done" : ""}${active?.all && (!text || text === active.text) ? " all" : ""}`}
          data-p={i}
        >
          {x}
        </span>
      ))}
      /
    </span>
  ) : null;
}
export function BlendButton({
  analysis: a,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { analysis: DisplayAnalysis }) {
  const shared = useContext(BlendContext);
  const alive = useRef(true);
  const session = useRef(0);
  useEffect(() => {
    alive.current = true;
    const stop = () => {
      session.current++;
      shared?.setState(null);
    };
    window.addEventListener("phonics:audio-start", stop);
    return () => {
      alive.current = false;
      session.current++;
      window.removeEventListener("phonics:audio-start", stop);
    };
  }, [shared?.setState]);
  async function play(e: MouseEvent<HTMLButtonElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    const tokens =
      a.tokens || window.IPA?.[a.text.toLowerCase()]?.split(" ") || [];
    const map = a.ipaMap ?? Phonics.alignIPA(a, tokens);
    let id = 0;
    const done: number[] = [];
    const mark = (tile: number, ips = map?.[tile] || []) => {
      if (alive.current && session.current === id) {
        if (!done.includes(tile)) done.push(tile);
        shared?.setState({ text: a.text, tile, ips, done: [...done] });
      }
    };
    const steps: SpeechStep[] = [];
    if (a.syllables) {
      a.syllables.forEach((s, i) => {
        steps.push(() => mark(i));
        const ks = map?.[i] || [];
        const sid = (k: number) =>
          G2P?.PH2SID[tokens[k].replace(/[ˈˌː]/g, "").replace("ɚ", "ɝ")];
        if (ks.length && ks.every(sid)) {
          ks.forEach((k) =>
            steps.push(
              () => mark(i, [k]),
              { type: "p", v: sid(k) },
              { type: "wait", v: 70 },
            ),
          );
          steps.push({ type: "wait", v: 260 });
        } else
          steps.push(
            { type: "t", v: s.t.toLowerCase() },
            { type: "wait", v: 180 },
          );
      });
    } else
      (a.segs || []).forEach((s, i) => {
        steps.push(() => mark(i));
        if (!s.silent && s.sid && SOUNDS[s.sid] && s.sid !== "silent")
          steps.push({ type: "p", v: s.sid }, { type: "wait", v: 140 });
        else if (!s.silent && s.seq?.length) {
          s.seq.forEach((p) =>
            steps.push({ type: "p", v: p }, { type: "wait", v: 60 }),
          );
          steps.push({ type: "wait", v: 80 });
        } else steps.push({ type: "wait", v: 450 });
      });
    steps.push(
      () => {
        if (alive.current && session.current === id)
          shared?.setState({ text: a.text, all: true });
      },
      { type: "t", v: a.text },
    );
    // sequence starts synchronously; establish session in its first callback after cancellation.
    const promise = Speech.sequence([
      () => {
        id = ++session.current;
      },
      ...steps,
    ]);
    await promise;
    setTimeout(() => {
      if (alive.current && session.current === id) shared?.setState(null);
    }, 600);
  }
  return (
    <button type="button" {...props} onClick={play}>
      {children || (
        <>
          <Icon name="blend" />
          <span>拼读</span>
        </>
      )}
    </button>
  );
}
export function WordCard({
  raw,
  lesson,
  className = "",
}: {
  raw: string;
  lesson?: Lesson;
  className?: string;
}) {
  const a = Phonics.analyze(raw, lesson);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const button = ref.current?.querySelector<HTMLButtonElement>(".wc-word");
    if (!button) return;
    const fit = () => {
      button.style.fontSize = "";
      let n = parseFloat(getComputedStyle(button).fontSize);
      while (button.scrollWidth > ref.current!.clientWidth - 12 && n > 11)
        button.style.fontSize = --n + "px";
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [raw]);
  return (
    <BlendScope>
      <div ref={ref} className={`word-card ${className}`} data-word={a.text}>
        <div className="wc-emoji" aria-hidden="true">
          {a.emoji || ""}
        </div>
        <SayButton
          className="wc-word"
          text={a.text}
          aria-label={`朗读 ${a.text}`}
        >
          <WordTiles analysis={a} />
        </SayButton>
        <IPASpans
          tokens={window.IPA?.[a.text.toLowerCase()]?.split(" ")}
          className="wc-ipa"
          text={a.text}
        />
        <div className="wc-zh">{a.zh}</div>
        <div className="wc-actions">
          <SayButton
            className="icon-btn"
            text={a.text}
            title="朗读"
            aria-label={`朗读 ${a.text}`}
          />
          <BlendButton className="chip-btn" analysis={a} title="逐个音拼读" />
        </div>
      </div>
    </BlendScope>
  );
}
