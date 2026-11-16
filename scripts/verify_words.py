"""检查单词音频：识别每个示例单词的发音，与词典音标（js/ipa.js）比对，列出偏差较大的词。
用法（与 extract_phonemes.py 同一个虚拟环境）：python scripts/verify_words.py
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
import extract_phonemes as E

ROOT = E.ROOT
js = subprocess.run(['node', '-e', '''
global.window={};require("./js/data.js");require("./js/ipa.js");require("./audio/manifest.js");
const out=[];const seen=new Set();
for(const st of window.STAGES)for(const l of st.lessons)for(const w of l.words){
  const t=w.split("|")[0].replace(/[·'\\-]/g,"");const k=t.toLowerCase();if(seen.has(k))continue;seen.add(k);
  out.push({lesson:l.id,text:t,ipa:window.IPA[k]||"",file:window.AUDIO_MANIFEST.t[t]||window.AUDIO_MANIFEST.t[k]||""});}
console.log(JSON.stringify(out));'''], capture_output=True, text=True, cwd=ROOT).stdout
words = json.loads(js)

MAP = [('tʃ', 'ʧ'), ('dʒ', 'ʤ'), ('ɚ', 'ɝ'), ('ʌ', 'ə'), ('ɔɪ', 'OI'), ('ɔː', 'ɑ'), ('ɔ', 'ɑ'), ('OI', 'ɔɪ'), ('iː', 'i'), ('uː', 'u'), ('r', 'ɹ'), ('ʒ', 'ʃ'), ('ɡ', 'g')]


def norm(tokens):
    out = []
    for t in tokens:
        t = t.replace('ˈ', '').replace('ˌ', '')
        for a, b in MAP:
            t = t.replace(a, b)
        out.append(t)
    # 元音后的 ɹ 与 ɝ 视为同一种卷舌
    s = ' '.join(out).replace('ɝ', 'ɹ').replace('ə ɹ', 'ɹ')
    s = re.sub(r'(ɑ|ɛ|ɪ|i|oʊ|ʊ|u|eɪ|aɪ) ɹ ɹ', r'\1 ɹ', s)
    return s.split()


def dist(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] != b[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(b)]


def main(out=None):
    rows = []
    for w in words:
        if not w['file'] or not w['ipa']:
            rows.append((1.0, w, '(缺音频或音标)', [])); continue
        x = E.load(os.path.join(ROOT, 'audio', w['file']))
        exp = norm(w['ipa'].split())
        got = norm(E.recognize(x).split())
        per = dist(exp, got) / max(len(exp), 1)
        rows.append((per, w, ' '.join(got), exp))

    rows.sort(key=lambda r: -r[0])
    total = len(rows)
    good = sum(1 for r in rows if r[0] == 0)
    print(f'{total} 个单词；完全一致 {good}；平均音素错误率 {sum(r[0] for r in rows) / total:.1%}')
    print('偏差最大的单词（期望 → 识别）：')
    for per, w, got, exp in rows[:60]:
        print(f'{per:5.0%}  {w["lesson"]:5s} {w["text"]:12s} /{" ".join(exp)}/ → /{got}/')
    json.dump([{'per': r[0], 'lesson': r[1]['lesson'], 'text': r[1]['text'], 'expected': ' '.join(r[3]), 'heard': r[2]} for r in rows],
              open(os.path.join(E.TMP, 'words.json'), 'w'), ensure_ascii=False, indent=1)
    if out:
        json.dump([{'per': r[0], **r[1], 'got': r[2], 'exp': ' '.join(r[3])} for r in rows], open(out, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
