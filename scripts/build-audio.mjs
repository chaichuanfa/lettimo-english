// 生成单词/音节/例句音频并写出 audio/manifest.js（音素音频见 scripts/extract_phonemes.py）
// 依赖：macOS `say`、ffmpeg。
// 用法：node scripts/build-audio.mjs [--force] [--voice "Ava (Premium)"]（默认读 scripts/voice.json）
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
const VOICE = args.includes('--voice') ? args[args.indexOf('--voice') + 1]
  : JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'voice.json'), 'utf8')).words;
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
    // 音节不再单独合成：按音节拼读时用校验过的音素录音逐个读出（见 js/app.js 的 blend）
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
  // say 偶尔会卡死不返回（多个进程同时合成时见过）：超时 60 秒，重试 3 次
  for (let k = 0; ; k++) {
    try { await run('say', ['-v', VOICE, '-r', String(rate), '-o', aiff, '--', text], { timeout: 60000 }); break; }
    catch (e) { if (k >= 2) throw e; }
  }
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

// 朗读替换：页面文字不变，只改交给 TTS 的文字，纠正合成声音的误读。
// 全部由"对照合成"核实：同一段文字每次合成的音频完全相同，所以录音与哪种"只能那样读"的写法合成结果相同，就是读成了哪种。
// （换成 Ava 后逐条重新核对过：Samantha 读错的 "used to"（/juːzd/）、"lives next door"（/laɪvz/）Ava 读对了，已去掉）
const SPEAK_AS = [
  // Beijing：Samantha 读成 /beɪʒɪŋ/（"bay-zhing"），应为 /beɪˈdʒɪŋ/；Ava 见 verify_words 的核对
  [/\bBeijing\b/g, 'Bayjing'],
  // Ava："Did you use to …" 的 use 读成 /juːz/（与 "yooz" 合成完全相同），"used to / use to" 应读 /juːs(t)/
  [/\buse to\b/g, 'yoos to'],
  // Ava："I used my camera …" 的 used 读成 /juːst/（与 "yoost" 合成完全相同），这里是 use 的过去式 /juːzd/
  [/\bI used my camera\b/g, 'I yoozd my camera'],
  // Ava："tears running down his face" 的 tears 读成 /tɛrz/（撕破；元音开头 F1 938，与 "tares" 的 922 一致，"teers" 633），应读 /tɪrz/（眼泪）
  [/\btears running\b/g, 'teers running'],
  // Ava 把 elected 读成 /oʊˈlɛktɪd/（"oh-lected"：开头元音 F1 504、F2 1166，与 "oh" 一致；单独读和 "We elected Tom…" 里都是，
  // 与 "ohlektid" 合成完全相同），应读 /ɪˈlɛktɪd/；"electid" 开头 F1 374、F2 2421（同 elect），长度相同
  [/\belected\b/g, 'electid'], [/\bElected\b/g, 'Electid'],
];
// 单独朗读一个词时的替换（只在整段文字正好是这个词时生效，不影响句子）：
// - our：Ava 与 "are" 的合成完全相同（/ɑr/），而第 7-6 课教的是 our 读 /aʊr/；hour 的 h 不发音
// - exit：Ava 与 "egzit" 完全相同（/ˈɛgzɪt/），而第 1-5 课教的是 x 读 /ks/
// - camera：Ava 与 "camra" 完全相同（两个音节；"cammera" 也是），课程按 cam·er·a 三个音节拼读、音标 /ˈkæmɚə/；
//   "kam-er-uh" 读成三个音节且中间没有停顿
// - shin（小腿）：Ava 与 "sheen" 完全相同（/ʃiːn/），应读 /ʃɪn/
// - use：单独读时 Ava 与 "yoos" 完全相同（名词 /juːs/），课程标的是动词 /juːz/
// - a、comfortable、mr、beijing：沿用 Samantha 时的替换（a 单独读成字母名 /eɪ/；comfortable 读成三个音节；
//   Mr 读成字母 M、R），Ava 是否仍需要由 verify_lexicon / verify_words 核对
const SPEAK_WORD = { use: 'yooz', a: 'uh', our: 'hour', exit: 'eksit', camera: 'kam-er-uh', shin: 'shinn', comfortable: 'kumfurtabul', mr: 'mister', beijing: 'Bayjing' };
// 改写拼写也读不对的词：从整句里截出来。Ava 单独读 "ox"（以及 Ox / ocks / ohks……）都读成 /oʊks/（像 oaks；元音 F1 471、F2 973，
// box 的 /ɑ/ 是 F1 935、F2 1277），而句首的 "Ox and box." 读 /ɑks/，截取 0–0.303 秒（到 s 结束、and 开始振动之前）。
// 同一段文字每次合成的音频完全相同，所以截取点可以固定；md5 用来发现声音版本变化（变了就报错，需重新测截取点）。
const CARRIER = { ox: { text: 'Ox and box.', rate: 150, end: 0.303, md5: '27d69825ddc6b498f48248d2ffc4eae7' } };
async function carrierToMp3(c, out) {
  const aiff = path.join(TMP, fnv(c.text + out) + '.aiff');
  await run('say', ['-v', VOICE, '-r', String(c.rate), '-o', aiff, '--', c.text], { timeout: 60000 });
  const { createHash } = await import('node:crypto');
  const md5 = createHash('md5').update(fs.readFileSync(aiff)).digest('hex');
  if (md5 !== c.md5) throw new Error(`截取用的整句 "${c.text}" 合成结果变了（${md5}），请重新测量截取点`);
  await run('ffmpeg', ['-y', '-v', 'error', '-i', aiff, '-af', `atrim=end=${c.end},asetpts=PTS-STARTPTS,afade=t=out:st=${(c.end - 0.02).toFixed(3)}:d=0.02,${TRIM},apad=pad_dur=0.06`, ...ENC, out]);
  fs.rmSync(aiff, { force: true });
}
const carrierOf = (t) => CARRIER[t.toLowerCase()];

const speakAs = (t) => SPEAK_WORD[t.toLowerCase()] || SPEAK_AS.reduce((s, [re, to]) => s.replace(re, to), t);

async function buildTexts() {
  fs.mkdirSync(path.join(AUDIO, 't'), { recursive: true });
  const manifest = {};
  const list = [...texts].filter(Boolean);
  await pool(list, 8, async (t) => {
    const car = carrierOf(t);
    if (car) {
      const rel = fileFor(`${t} → ${car.text} [0-${car.end}]`);
      if (FORCE || !fs.existsSync(path.join(AUDIO, rel))) await carrierToMp3(car, path.join(AUDIO, rel));
      manifest[t] = rel;
      return;
    }
    const spoken = speakAs(t);
    const rel = fileFor(spoken === t ? t : `${t} → ${spoken}`);   // 换了朗读文字就换文件名，旧录音不会被沿用
    const out = path.join(AUDIO, rel);
    // 单个字母（如代词 I）按小写合成，避免读成 "capital I"
    const speak = spoken !== t ? spoken : t.length === 1 ? t.toLowerCase() : t;
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
// 记录哪些文字是用替换后的写法合成的（复查脚本据此做对照合成）
const spoken = Object.fromEntries([...texts].filter(Boolean).map((x) => [x, carrierOf(x) ? `${carrierOf(x).text} [截取 0–${carrierOf(x).end}s]` : speakAs(x)]).filter(([a, b]) => a !== b).sort());
fs.writeFileSync(path.join(AUDIO, 'speak-as.json'), JSON.stringify(spoken, null, 1) + '\n');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`done: ${Object.keys(p).length} phonemes, ${Object.keys(t).length} texts`);
