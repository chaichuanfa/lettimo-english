// 由 CMU 发音词典（美式）生成单词音标 → js/ipa.js
// 用法：node scripts/build-ipa.mjs
// 词典缓存在 scripts/cache/cmudict.dict（首次运行自动下载）
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CACHE = path.join(ROOT, 'scripts/cache/cmudict.dict');
if (!fs.existsSync(CACHE)) {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  const r = await fetch('https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict');
  fs.writeFileSync(CACHE, await r.text());
}

// 词典里第一个读音不是本课词义时，在这里指定（ARPAbet）
const PICK = {
  wind: 'W IH1 N D',      // 风
  use: 'Y UW1 Z',         // 使用（动词）
  tear: 'T IH1 R',        // 眼泪（Samantha 单独朗读 tear 时读这个音）
  a: 'AH0',
  preschool: 'P R IY1 S K UW2 L',
  vase: 'V EY1 S',
  chocolate: 'CH AA1 K AH0 L AH0 T',  // 与课程中三个音节 choc·o·late 对应
  unhappy: 'AH2 N HH AE1 P IY0', unlock: 'AH2 N L AA1 K', untie: 'AH2 N T AY1',  // 前缀 un- 不弱读
  redo: 'R IY2 D UW1', refill: 'R IY2 F IH1 L', replay: 'R IY1 P L EY2',          // re- 读 /riː/
};
// 词典里没有的词，直接给出 IPA
// 以空格分隔音素
const MANUAL = { sprig: 's p r ɪ g', shush: 'ʃ ʌ ʃ', toucan: 'ˈt uː k æ n' };

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), ctx);
const { STAGES, SOUNDS } = ctx.window;

const dict = new Map();
for (const line of fs.readFileSync(CACHE, 'utf8').split('\n')) {
  const m = line.match(/^([^\s(]+)(?:\(\d+\))?\s+([^#]+)/);
  if (m && !dict.has(m[1])) dict.set(m[1], m[2].trim());
}

const CONS = { B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'g', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ' };
function vowel(v, stress, nextR) {
  const st = stress !== '0';
  if (nextR) {
    const r = { IY: 'ɪ', IH: 'ɪ', AO: 'ɔ', AA: 'ɑ', EH: 'ɛ', EY: 'ɛ', UH: 'ʊ', UW: 'ʊ', AY: 'aɪ', AW: 'aʊ', OW: 'ɔ', AE: 'ɛ', AH: 'ə' }[v];
    if (r) return r;
  }
  switch (v) {
    case 'AA': return 'ɑ';
    case 'AE': return 'æ';
    case 'AH': return st ? 'ʌ' : 'ə';
    case 'AO': return 'ɔː';
    case 'AW': return 'aʊ';
    case 'AY': return 'aɪ';
    case 'EH': return 'ɛ';
    case 'ER': return st ? 'ɝ' : 'ɚ';
    case 'EY': return 'eɪ';
    case 'IH': return 'ɪ';
    case 'IY': return st ? 'iː' : 'i';
    case 'OW': return 'oʊ';
    case 'OY': return 'ɔɪ';
    case 'UH': return 'ʊ';
    case 'UW': return st ? 'uː' : 'u';
  }
  return '?';
}
const ONSET2 = new Set(['P L', 'B L', 'K L', 'G L', 'F L', 'S L', 'P R', 'B R', 'T R', 'D R', 'K R', 'G R', 'F R', 'TH R', 'SH R',
  'S P', 'S T', 'S K', 'S M', 'S N', 'S W', 'S L', 'T W', 'K W', 'D W', 'G W', 'P Y', 'B Y', 'K Y', 'F Y', 'M Y', 'HH Y', 'V Y']);
const ONSET3 = new Set(['S P L', 'S P R', 'S T R', 'S K R', 'S K W', 'S P Y', 'S K Y']);

function toIPA(arpa) {
  const ph = arpa.split(/\s+/);
  const isV = (p) => /\d$/.test(p);
  const nVowels = ph.filter(isV).length;
  const out = ph.map((p, i) => {
    if (!isV(p)) return CONS[p] ?? '?';
    return vowel(p.slice(0, -1), p.slice(-1), ph[i + 1] === 'R' && p.slice(0, -1) !== 'ER');
  });
  if (nVowels > 1) {
    // 在重读音节起始处加重音符号（最大首音原则）
    const marks = [];
    let prevV = -1;
    let primarySeen = false;
    ph.forEach((p, i) => {
      if (!isV(p)) return;
      const s = p.slice(-1);
      // 只标主重音前的次重音（学习词典惯例）
      if (s === '1' || (s === '2' && !primarySeen)) {
        const cons = ph.slice(prevV + 1, i);
        let k = 0;
        if (prevV < 0) k = cons.length;
        else if (cons.length >= 3 && ONSET3.has(cons.slice(-3).join(' '))) k = 3;
        else if (cons.length >= 2 && ONSET2.has(cons.slice(-2).join(' '))) k = 2;
        else if (cons.length >= 1 && cons[cons.length - 1] !== 'NG') k = 1;
        marks.push([i - k, s === '1' ? 'ˈ' : 'ˌ']);
      }
      if (s === '1') primarySeen = true;
      prevV = i;
    });
    marks.forEach(([at, m]) => { out[at] = m + out[at]; });
  }
  return out.join(' ');  // 音素之间用空格分隔，便于拼读时逐个高亮
}

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
  const arpa = PICK[k] || dict.get(k);
  if (arpa) IPA[k] = toIPA(arpa);
  else missing.push(k);
}
const sorted = Object.fromEntries(Object.entries(IPA).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(path.join(ROOT, 'js/ipa.js'), `/* 由 scripts/build-ipa.mjs 根据 CMU 发音词典生成（美式音标，音素以空格分隔） */\nwindow.IPA = ${JSON.stringify(sorted)};\n`);
console.log(`ipa: ${Object.keys(IPA).length} words`);
if (missing.length) console.log('missing:', missing.join(', '));
