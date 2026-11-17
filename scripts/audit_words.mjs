// 核查每个课程单词的拼读演示：逐块（或逐音节）播放的音 ↔ 单词下方显示的音标是否一致
//   * 按字母块拼读的词：每个字母块播放的音素 = 音标里对齐到的那几个音
//   * 按音节拼读的词：每个音标都分到了某个音节里，且都有校验过的音素录音（否则会退回语音合成去猜读法）
//   * 每个词都有音标和整词录音
// 用法：node scripts/audit_words.mjs [输出.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/data.js', 'js/ipa.js', 'js/g2p.js', 'js/phonics.js', 'audio/manifest.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
}
const { STAGES, IPA, Phonics, SOUNDS, G2P, AUDIO_MANIFEST } = ctx;
const norm = (x) => x.replace(/[ˈˌː]/g, '').replace(/ɚ/g, 'ɝ').replace(/ər/g, 'ɝ').replace(/ɜr|ɜ/g, 'ɝ');
const sIPA = (sid) => { const S = SOUNDS[sid]; if (!S || sid === 'silent') return ''; return S.seq ? S.seq.map(sIPA).join('') : S.ipa; };
const sidOf = (t) => G2P.PH2SID[t.replace(/[ˈˌː]/g, '').replace('ɚ', 'ɝ')];
// 记法不同、读音相同（ire = aɪ + ɚ 等），已逐个核对过。
// ure：词典记作 /jʊr/，Samantha 实际读 pure/cure/secure 是 [juɚ]（强制对齐 juɝ 明显优于 jʊr），
// 拼读按录音播放 u_l + er，规则文字里已说明两种读法（js/data.js 7-6）
const SAME = new Set(['aɪɝ|aɪr', 'aʊɝ|aʊr', 'jʊɝ|jʊr', 'ʊɝ|ʊr', 'juɝ|jʊr']);

const issues = [];
let total = 0, letters = 0, sylls = 0;
const seen = new Set();
for (const st of STAGES) for (const l of st.lessons) for (const raw of l.words) {
  const a = Phonics.analyze(raw, l);
  const w = a.text.toLowerCase();
  const key = `${l.id}:${w}`;
  if (seen.has(key)) continue;
  seen.add(key);
  total++;
  const tok = IPA[w]?.split(' ');
  if (!tok) { issues.push({ l: l.id, w, issue: '没有音标' }); continue; }
  if (!AUDIO_MANIFEST.t[a.text] && !AUDIO_MANIFEST.t[w]) issues.push({ l: l.id, w, issue: '没有整词录音' });
  if (a.syllables) {
    sylls++;
    const map = Phonics.alignIPA(a, tok);
    const used = new Set((map || []).flat());
    const miss = tok.map((t, k) => (used.has(k) ? null : t)).filter(Boolean);
    const nosid = [...new Set(tok.filter((t) => !sidOf(t)))];
    if (!map) issues.push({ l: l.id, w, issue: '音节无法对齐音标' });
    else if (miss.length) issues.push({ l: l.id, w, issue: `音标 ${miss.join(' ')} 没有分到任何音节` });
    if (nosid.length) issues.push({ l: l.id, w, issue: `音标 ${nosid.join(' ')} 没有对应的音素录音（会退回语音合成）` });
    if (map && map.some((ks) => !ks.length)) issues.push({ l: l.id, w, issue: '有音节没有分到音标' });
    continue;
  }
  letters++;
  const map = Phonics.alignIPA(a, tok);
  a.segs.forEach((s, i) => {
    const exp = norm(s.silent ? '' : sIPA(s.sid));
    const got = norm((map?.[i] || []).map((k) => tok[k]).join(''));
    if (exp !== got && !SAME.has(`${exp}|${got}`)) issues.push({ l: l.id, w, issue: `${s.display} 播放 /${exp}/，音标是 /${got}/` });
  });
}
const out = { total, letters, syllables: sylls, issues };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(`单词 ${total} 个（按字母块拼读 ${letters}、按音节拼读 ${sylls}）；问题 ${issues.length} 处`);
for (const x of issues) console.log(`  ✗ ${x.l} ${x.w}：${x.issue}`);
