// 由 CMU 发音词典（美式）生成单词音标 → js/ipa.js
// 用法：node scripts/build-ipa.mjs
// 词典缓存在 scripts/cache/cmudict.dict（首次运行自动下载）
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, loadCMU, toIPA, PICK, MANUAL } from './lib/cmu.mjs';

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), ctx);
const { STAGES, SOUNDS } = ctx.window;

const dict = loadCMU();

const words = new Map();
const add = (text, raw) => { const k = text.toLowerCase(); if (!words.has(k)) words.set(k, raw); };
for (const st of STAGES) for (const l of st.lessons) {
  l.words.forEach((w) => add(w.split('|')[0].replace(/[·'\-]/g, ''), w));
  (l.pairs || []).forEach((p) => p.split('>').forEach((w) => add(w, w)));
  (l.sight || []).forEach((w) => add(w, w));
  (l.cards || []).forEach((c) => c.kw && add(c.kw, c.kw));
}
Object.values(SOUNDS).forEach((s) => s.kw && add(s.kw, s.kw));

const IPA = {};
const missing = [];
for (const [k] of words) {
  if (MANUAL[k]) { IPA[k] = MANUAL[k]; continue; }
  const arpa = PICK[k] || dict.get(k)?.[0];
  if (arpa) IPA[k] = toIPA(arpa);
  else missing.push(k);
}
const sorted = Object.fromEntries(Object.entries(IPA).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(path.join(ROOT, 'js/ipa.js'), `/* 由 scripts/build-ipa.mjs 根据 CMU 发音词典生成（美式音标，音素以空格分隔） */\nwindow.IPA = ${JSON.stringify(sorted)};\n`);
console.log(`ipa: ${Object.keys(IPA).length} words`);
if (missing.length) console.log('missing:', missing.join(', '));
