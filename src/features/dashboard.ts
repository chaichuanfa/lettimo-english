import type { Progress } from "../types/app";

type Course = { id: string; title: string };
export interface StudyRecommendation {
  title: string;
  description: string;
  href: string;
  action: string;
}
export function recommendStudy(
  progress: Progress,
  lessons: Course[],
  grammar: Course[],
  due: number,
  wrong: number,
  started: boolean,
): StudyRecommendation {
  if (due > 0)
    return {
      title: `先唤醒 ${due} 个学过的单词`,
      description: "这些单词到了复习时间。先巩固记忆，再学一点新的。",
      href: "./words/study?only=review",
      action: "开始复习单词",
    };
  if (wrong > 0)
    return {
      title: `再练练这 ${wrong} 个易错点`,
      description: "语法和拼读中还没掌握的地方，值得再练一次。",
      href: "./review",
      action: "去巩固错题",
    };
  const next =
    lessons.find(
      (l) => l.id === progress.last && !progress.lessons[l.id]?.done,
    ) || lessons.find((l) => !progress.lessons[l.id]?.done);
  if (next)
    return {
      title: next.title,
      description: progress.last
        ? "接着学习拼读，让字母和声音慢慢连起来。"
        : "从字母和声音开始，迈出英语学习的第一步。",
      href: `./lesson/${next.id}`,
      action: progress.last ? "继续学习拼读" : "开始第一课",
    };
  const nextGrammar = grammar.find((l) => !progress.grammar[l.id]?.done);
  if (nextGrammar)
    return {
      title: nextGrammar.title,
      description: "拼读课程已完成，接下来用语法把单词连成句子。",
      href: `./grammar/${nextGrammar.id}`,
      action: "继续学习语法",
    };
  return {
    title: "课程学完了，再积累一点词汇",
    description: "保持一点点练习，让学过的知识更牢固。",
    href: started ? "./words/study" : "./words",
    action: started ? "开始学习单词" : "选择一本词书",
  };
}

export interface Challenge {
  id: string;
  kind: "grammar" | "phonics" | "words";
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  href: string;
  lesson: string;
  audio?: string;
}
// The same Beijing calendar date always yields the same question and option order.
export function pickChallenge(
  pool: Challenge[],
  day: string,
): Challenge | null {
  const index = Math.floor(Date.parse(day + "T00:00:00Z") / 86400000);
  const kinds = ["grammar", "phonics", "words"];
  const candidates = pool.filter((q) => q.kind === kinds[index % 3]);
  if (!candidates.length) return null;
  const question = candidates[Math.floor(index / 3) % candidates.length];
  const options = [...question.options];
  let seed = index;
  for (let i = options.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...question, options };
}
