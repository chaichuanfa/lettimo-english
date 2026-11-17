// 核查词典（4 万词）的拼读拆解：每一块播放的音素录音 ↔ 这一块显示的音标是否一致，有没有音标找不到音素录音
// （找不到时拼读会悄悄少一个音）。逻辑与 js/app.js 的 dictAnalyze / blend 相同。
// 词典单词的整词发音用浏览器语音合成，不在这里核查。
// 用法：node scripts/audit_dict.mjs [输出.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
const dict = {};
ctx.DICT_SHARD = (k, d) => Object.assign(dict, d);
for (const f of ['js/data.js', 'js/g2p.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
for (const f of fs.readdirSync(path.join(ROOT, 'js/dict'))) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/dict', f), 'utf8'), ctx);
const { SOUNDS, G2P } = ctx;
const norm = (x) => x.replace(/[ˈˌː]/g, '').replace(/ɚ/g, 'ɝ').replace(/ər/g, 'ɝ').replace(/ɜr|ɜ/g, 'ɝ');
const sIPA = (sid) => { const S = SOUNDS[sid]; if (!S || sid === 'silent') return ''; return S.seq ? S.seq.map(sIPA).join('') : S.ipa; };
// 记法不同、读音相同（与 audit_words.mjs 一致；ure 见第 7-6 课说明）
const SAME = new Set(['aɪɝ|aɪr', 'aʊɝ|aʊr', 'jʊɝ|jʊr', 'ʊɝ|ʊr', 'juɝ|jʊr']);

let words = 0, analysed = 0;
const issues = {};
const add = (kind, w, detail) => { (issues[kind] ||= []).push(`${w}${detail ? '：' + detail : ''}`); };
for (const [w, e] of Object.entries(dict)) {
  if (!Array.isArray(e) || !e[0]) continue;
  words++;
  const tokens = e[0].split('|')[0].split(' ');
  const r = G2P.align(w, tokens);
  if (!(r && /[aeiouy]/.test(w) && !r.segs.some((s) => s.cost >= 4))) continue;
  analysed++;
  for (const sg of r.segs) {
    if (sg.silent) continue;
    const shown = norm(sg.ph.map((k) => tokens[k]).join(''));
    const lost = sg.ph.filter((k) => !G2P.PH2SID[tokens[k].replace(/[ˈˌː]/g, '').replace('ɚ', 'ɝ')]);
    let played;
    if (sg.sid && SOUNDS[sg.sid]) played = norm(sIPA(sg.sid));
    else {
      played = norm(sg.seq.map(sIPA).join(''));
      if (lost.length) add('音标没有对应的音素录音（拼读会少音）', w, `${sg.t} /${shown}/ 缺 ${lost.map((k) => tokens[k]).join(' ')}`);
    }
    if (played !== shown && !SAME.has(`${played}|${shown}`)) add(`显示 /${shown}/、播放 /${played}/`, w, sg.t);
  }
}
const n = Object.values(issues).reduce((a, b) => a + b.length, 0);
console.log(`词典 ${words} 词；做拼读拆解的 ${analysed} 词；问题 ${n} 处`);
for (const [k, v] of Object.entries(issues).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ✗ ${k}：${v.length} 处，如 ${v.slice(0, 8).join('、')}`);
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(issues, null, 1));
