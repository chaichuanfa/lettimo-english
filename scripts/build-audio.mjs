// 生成单词/音节/例句音频并写出 audio/manifest.js（音素音频见 scripts/extract_phonemes.py）
// 依赖：macOS `say`、ffmpeg。
// 用法：node scripts/build-audio.mjs [--force] [--voice Samantha]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const AUDIO = path.join(ROOT, 'audio');
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const VOICE = args.includes('--voice') ? args[args.indexOf('--voice') + 1] : 'Samantha';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'phonics-audio-'));

// ---- 载入课程数据 ----
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), ctx);
const { SOUNDS, STAGES } = ctx.window;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/grammar.js'), 'utf8'), ctx);
const { GRAMMAR = [] } = ctx.window;

// ---- 收集文本 ----
const texts = new Set();
const cleanWord = (raw) => raw.split('|')[0].replace(/[·'\-]/g, '');
for (const st of STAGES) for (const l of st.lessons) {
  for (const w of l.words) {
    const word = w.split('|')[0];
    texts.add(cleanWord(w));
    if (word.includes('·')) word.split('·').forEach((s) => texts.add(s.replace("'", '').toLowerCase()));
  }
  for (const s of l.sentences) {
    const en = s.split('|')[0];
    texts.add(en);
    (en.match(/[A-Za-z']+/g) || []).forEach((t) => texts.add(t.toLowerCase()));
  }
  (l.cards || []).forEach((c) => c.kw && texts.add(c.kw));
  (l.sight || []).forEach((w) => texts.add(w));
  (l.pairs || []).forEach((p) => p.split('>').forEach((w) => texts.add(w)));
}
Object.values(SOUNDS).forEach((s) => s.kw && texts.add(s.kw));
// 语法课：例句、测验答案句（与 js/app.js 里的 gPlain / gFilled 保持一致）
const addSentence = (en) => { texts.add(en); (en.match(/[A-Za-z']+/g) || []).forEach((t) => texts.add(t.toLowerCase())); };
const gPlain = (en) => en.replace(/\{[A-Z]+:([^}]*)\}/g, '$1').replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();
const gFilled = (q) => {
  const ans = q.o[0];
  if (!q.c.includes('___') || (/[一-鿿]/.test(ans) && ans !== '不填') || /^(Which|In ")/.test(q.c)) return null;
  const parts = ans === '不填' ? [''] : ans.split(/,\s*/);
  let k = 0;
  return q.c.replace(/___/g, () => parts[Math.min(k++, parts.length - 1)]).replace(/\s+/g, ' ').replace(/\s([.,?!])/g, '$1').trim();
};
for (const st of GRAMMAR) for (const l of st.lessons) {
  l.examples.forEach((e) => addSentence(gPlain(e.split('|')[0])));
  l.quiz.forEach((q) => { const t = q.s || gFilled(q); if (t) addSentence(t); });
}
// 字母名：单个大写字母会被读成 "capital X"，所以用小写；a 的字母名用长元音音素 a_l
'bcdefghijklmnopqrstuvwxyz'.split('').forEach((c) => texts.add(c));
['apple', 'bed', 'cat', 'dog', 'egg', 'fan', 'gum', 'hat', 'in', 'jam', 'kid', 'leg', 'map', 'net', 'octopus', 'pig', 'queen', 'red', 'sun', 'top', 'up', 'van', 'web', 'box', 'yes', 'zip', 'ship'].forEach((w) => texts.add(w));

// ---- 文件名 ----
const fnv = (s) => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const fileFor = (t) => `t/${(t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'x')}-${fnv(t)}.mp3`;

// ---- 并发执行 ----
async function pool(items, n, fn) {
  let i = 0, done = 0;
  const total = items.length;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const it = items[i++];
      await fn(it);
      if (++done % 50 === 0 || done === total) process.stdout.write(`\r  ${done}/${total}`);
    }
  }));
  process.stdout.write('\n');
}

// 只去掉真正的静音：阈值很低（-70dB）且前后各留 30ms。
// 之前用 -48dB 会把开头的 h/f/θ 和结尾 t/d/p/k 的除阻当成静音切掉（hot 听起来像 "ho"）。
const TRIM = 'silenceremove=start_periods=1:start_threshold=-70dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-70dB:start_silence=0.03,areverse';
const ENC = ['-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k'];

async function ttsToMp3(text, out, rate = 175, onsetDb = null) {
  const aiff = path.join(TMP, fnv(text + out) + '.aiff');
  await run('say', ['-v', VOICE, '-r', String(rate), '-o', aiff, '--', text]);
  // onsetDb：用较高阈值切掉弱起始辅音（如 "her" 的 /h/），只留后面的元音
  const onset = onsetDb != null ? `silenceremove=start_periods=1:start_threshold=${onsetDb}dB,atrim=start=0.015,asetpts=PTS-STARTPTS,afade=t=in:d=0.02,` : '';
  await run('ffmpeg', ['-y', '-v', 'error', '-i', aiff, '-af', `${onset}${TRIM},apad=pad_dur=0.06`, ...ENC, out]);
  fs.rmSync(aiff, { force: true });
}

// 音素音频由 scripts/extract_phonemes.py 从 Samantha 朗读的单词中截取并经识别模型校验，
// 这里只登记 audio/p/ 下已有的文件，不再生成（避免 --force 覆盖校验过的音频）。
async function buildPhonemes() {
  const manifest = {};
  const missing = [];
  for (const [id, s] of Object.entries(SOUNDS)) {
    if (s.seq) continue;
    const rel = `p/${id}.mp3`;
    if (fs.existsSync(path.join(AUDIO, rel))) manifest[id] = rel;
    else missing.push(id);
  }
  if (missing.length) console.warn(`  缺少音素音频（请运行 scripts/extract_phonemes.py）：${missing.join(', ')}`);
  return manifest;
}

async function buildTexts() {
  fs.mkdirSync(path.join(AUDIO, 't'), { recursive: true });
  const manifest = {};
  const list = [...texts].filter(Boolean);
  await pool(list, 8, async (t) => {
    const rel = fileFor(t);
    const out = path.join(AUDIO, rel);
    // 单个字母（如代词 I）按小写合成，避免读成 "capital I"
    const speak = t.length === 1 ? t.toLowerCase() : t;
    if (FORCE || !fs.existsSync(out)) await ttsToMp3(speak, out, t.includes(' ') ? 165 : 150);
    manifest[t] = rel;
  });
  return manifest;
}

console.log(`voice: ${VOICE}`);
console.log('phonemes…');
const p = await buildPhonemes();
console.log(`texts (${texts.size})…`);
const t = await buildTexts();
const sorted = Object.fromEntries(Object.entries(t).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(path.join(AUDIO, 'manifest.js'), `/* 由 scripts/build-audio.mjs 生成，请勿手改 */\nwindow.AUDIO_MANIFEST = ${JSON.stringify({ p, t: sorted })};\n`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`done: ${Object.keys(p).length} phonemes, ${Object.keys(t).length} texts`);
