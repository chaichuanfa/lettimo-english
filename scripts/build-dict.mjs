// 词典数据第二步：把 scripts/cache/dict-data.json 转成网站按前两个字母分片加载的 js/dict/*.js
// 用法：先运行 scripts/build-dict-data.py，再 node scripts/build-dict.mjs
//
// js/dict/index.js   全部词条（按词频排序，用于联想提示）
// js/dict/<前两个字母>.js   按单词前两个字母分片：word → [音标, 释义, 原形, 变形, 标签, 例句]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadCMU, toIPA, PICK, MANUAL } from './lib/cmu.mjs';

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/cache/dict-data.json'), 'utf8'));
const cmu = loadCMU();
const OUT = path.join(ROOT, 'js/dict');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function ipaVariants(w) {
  if (MANUAL[w]) return [MANUAL[w]];
  const list = [...(PICK[w] ? [PICK[w]] : []), ...(cmu.get(w) || [])].map(toIPA);
  return [...new Set(list)].slice(0, 3);
}

const shards = {};
const order = [];
let skipped = 0;
for (const [w, e] of Object.entries(data)) {
  const ipa = ipaVariants(w);
  if (!ipa.length) { skipped++; continue; }
  const exch = e.exch ? Object.entries(e.exch).map(([k, v]) => `${k}:${v}`).join('/') : '';
  const row = [ipa.join('|'), e.zh || '', e.lemma ? `${e.lemma}:${e.type || ''}` : '', exch, e.tags || '', e.ex || []];
  while (row.length && (row[row.length - 1] === '' || (Array.isArray(row[row.length - 1]) && !row[row.length - 1].length))) row.pop();
  (shards[w.slice(0, 2)] ||= {})[w] = row;
  order.push([e.zh ? 0 : 1, e.rank, w]);
}
order.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]));

const HEAD = '/* 由 scripts/build-dict.mjs 生成，请勿手改。数据来源：ECDICT (MIT)、Tatoeba (CC BY 2.0 FR)、CMUdict (BSD) */\n';
let total = 0;
for (const [k, obj] of Object.entries(shards)) {
  const body = `${HEAD}DICT_SHARD(${JSON.stringify(k)}, ${JSON.stringify(obj)});\n`;
  fs.writeFileSync(path.join(OUT, `${k}.js`), body);
  total += body.length;
}
fs.writeFileSync(path.join(OUT, 'index.js'), `${HEAD}window.DICT_INDEX = ${JSON.stringify(order.map((x) => x[2]).join(' '))};\n`);
const sizes = Object.entries(shards).map(([k, o]) => [k, Object.keys(o).length]);
console.log(`dict: ${order.length} entries in ${sizes.length} shards, ${(total / 1e6).toFixed(1)} MB; skipped ${skipped}`);
