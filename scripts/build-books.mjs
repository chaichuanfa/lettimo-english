// 生成背单词用的词书数据 js/vocab/core.js
// 用法：node scripts/build-books.mjs   （先要有 js/dict/*.js，见 README"重新生成词典数据"）
//
// 词书按词典里的考试标签（来自 ECDICT）划分，单词按词频从高到低排列。
// 输出一个文件：window.VOCAB_CORE = { v, books, words }，等号后面是纯 JSON，移动端可以直接解析。
//   books: [{ id, name, desc, bit, not }]   词书 = 带 bit 标记、且不带 not 标记的词
//   words: [[单词, 音标, 短释义, 标记位], ...]   标记位：1 中考  2 高考  4 四级  8 六级
// 这里只放出题和排队需要的字段；完整释义、例句、词形变化学习时再从词典分片（js/dict/）里取。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { shortGloss } = createRequire(import.meta.url)(path.join(ROOT, 'js/vocab-core.js'));

const BITS = { zk: 1, gk: 2, cet4: 4, cet6: 8 };
const BOOKS = [
  { id: 'zk', name: '中考词汇', desc: '初中阶段要求掌握的词', bit: 1, not: 0 },
  { id: 'gk', name: '高考词汇', desc: '高中阶段要求掌握的词，包含中考词', bit: 2, not: 0 },
  { id: 'cet4', name: '四级词汇', desc: '大学英语四级', bit: 4, not: 0 },
  { id: 'cet6', name: '六级词汇', desc: '大学英语六级，只收四级以外的词', bit: 8, not: 4 },
];

// 读入词典分片（它们是 DICT_SHARD(key, {...}) 形式的脚本）
const DICT = path.join(ROOT, 'js/dict');
const rows = {};
const payload = (file, re) => { const m = fs.readFileSync(path.join(DICT, file), 'utf8').match(re); if (!m) throw new Error(`无法解析 ${file}`); return JSON.parse(m[1]); };
for (const f of fs.readdirSync(DICT)) {
  if (f === 'index.js' || !f.endsWith('.js')) continue;
  Object.assign(rows, payload(f, /DICT_SHARD\("[a-z]+", (\{.*\})\);\s*$/s));
}
const index = payload('index.js', /window\.DICT_INDEX = (".*");\s*$/s).split(' ');   // 已按词频排序

const bitsOf = (row) => (row[4] || '').split(' ').reduce((b, t) => b | (BITS[t] || 0), 0);
const words = [];
const skipped = { form: 0, nopos: 0, short: 0 };
for (const w of index) {
  const row = rows[w];
  if (!row) continue;
  const bits = bitsOf(row);
  if (!bits) continue;
  const [ipa = '', zh = '', lemma = ''] = row;
  // 变形（chips → chip）：原形也在词书里时不单独收
  if (lemma) { const base = rows[lemma.split(':')[0]]; if (base && bitsOf(base) & bits) { skipped.form++; continue; } }
  if (!/^[a-z]+\.\s*\S/m.test(zh)) { skipped.nopos++; continue; }   // 没有词性的条目多是缩写、单位（mm）
  if (w.length < 2 && w !== 'a') { skipped.short++; continue; }
  words.push([w, ipa.split('|')[0].replace(/ /g, ''), shortGloss(zh), bits]);
}

const books = BOOKS.map((b) => ({ ...b, count: words.filter((x) => (x[3] & b.bit) && !(x[3] & b.not)).length }));
const out = path.join(ROOT, 'js/vocab');
fs.mkdirSync(out, { recursive: true });
const HEAD = '/* 由 scripts/build-books.mjs 生成，请勿手改。数据来源：ECDICT (MIT)、CMUdict (BSD) */\n';
const body = `${HEAD}window.VOCAB_CORE = ${JSON.stringify({ v: 1, books, words })};\n`;
fs.writeFileSync(path.join(out, 'core.js'), body);
console.log(`vocab: ${words.length} words, ${(body.length / 1024).toFixed(0)} KB; ${books.map((b) => `${b.name} ${b.count}`).join('，')}; skipped ${JSON.stringify(skipped)}`);
const long = words.filter((x) => x[2].length > 30).length, empty = words.filter((x) => !x[2]).length;
console.log(`gloss: longest ${Math.max(...words.map((x) => x[2].length))} chars, >30 chars ${long}, empty ${empty}`);
