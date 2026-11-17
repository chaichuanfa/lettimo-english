// 获取每日一句，失败时保留站内上一份有效快照。node scripts/update-daily-quote.mjs
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Quote from '../js/daily-quote.js';

export async function updateQuote({ path = new URL('../data/daily-quote.json', import.meta.url), fetcher = fetch, today = Quote.day() } = {}) {
  let previous;
  try { previous = Quote.normalize(JSON.parse(await readFile(path, 'utf8'))); } catch { /* 首次生成 */ }
  if (previous?.date === today) return { updated: false, quote: previous };
  try {
    const response = await fetcher('https://open.iciba.com/dsapi/?date=' + today, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('HTTP ' + response.status);
    const raw = await response.json();
    const quote = Quote.normalize({ date: raw.dateline, english: raw.content, chinese: raw.note, audio: raw.tts });
    if (!quote || quote.date !== today) throw Error('接口未返回当天的完整双语内容');
    const target = path instanceof URL ? path : pathToFileURL(path);
    await mkdir(dirname(fileURLToPath(target)), { recursive: true });
    const temporary = new URL(target.href + '.tmp');
    await writeFile(temporary, JSON.stringify(quote, null, 2) + '\n');
    await rename(temporary, target);
    return { updated: true, quote };
  } catch (error) {
    if (!previous) throw error;
    return { updated: false, quote: previous, error: error.message };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await updateQuote();
  console.log(result.updated ? `已更新每日一句：${result.quote.date}` : `保留每日一句：${result.quote.date}`);
  if (result.error) console.warn('本次获取失败：' + result.error);
}
