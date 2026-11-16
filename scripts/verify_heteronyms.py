"""检查例句录音里的多音词读得对不对（read /riːd/ 还是 /rɛd/、used to /juːst/ 还是 /juːzd/ …）。

做法：整句按词典读音转成音素序列，多音词分别代入两种读音，用识别模型做强制对齐（CTC 损失），
哪种读音与录音更匹配，TTS 就读成了哪种；再与按语境应读的读音比较。
用法（与 extract_phonemes.py 同一个虚拟环境）：python scripts/verify_heteronyms.py

已知局限：在 "use / used + to" 里，对齐打分会偏向 /z/（读对的 "Did you use to" 也会被判成 /juːz/），
这几句要用对照合成核实：把句中的 use(d) 换成只可能读 /s/ 的写法（uce、yoost）合成，与原录音比较——
Samantha 对 "Did you use to" 与 "Did you uce to" 合成出完全相同的音频（读对了）；"I used to" 与 "I yoozd to"
完全相同（读错了），所以 build-audio.mjs 的 SPEAK_AS 把 "used to" 换成 "yoost to" 合成，摩擦段时长与 /s/ 参照一致。
"""
import json
import os
import re
import subprocess
import sys

import torch

sys.path.insert(0, os.path.dirname(__file__))
import extract_phonemes as E  # noqa: E402

ROOT = E.ROOT
ARPA = {'AA': 'ɑ', 'AE': 'æ', 'AH': 'ə', 'AO': 'ɑ', 'AW': 'aʊ', 'AY': 'aɪ', 'EH': 'ɛ', 'ER': 'ɝ', 'EY': 'eɪ', 'IH': 'ɪ', 'IY': 'i',
        'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'u', 'B': 'b', 'CH': 'ʧ', 'D': 'd', 'DH': 'ð', 'F': 'f', 'G': 'g', 'HH': 'h',
        'JH': 'ʤ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ', 'T': 't',
        'TH': 'θ', 'V': 'v', 'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʃ'}
# 多音词的两种读音（ARPAbet）
VAR = {
    'read': {'riːd': 'R IY1 D', 'rɛd': 'R EH1 D'},
    'live': {'lɪv': 'L IH1 V', 'laɪv': 'L AY1 V'}, 'lives': {'lɪvz': 'L IH1 V Z', 'laɪvz': 'L AY1 V Z'},
    'use': {'juːz': 'Y UW1 Z', 'juːs': 'Y UW1 S'}, 'used': {'juːzd': 'Y UW1 Z D', 'juːst': 'Y UW1 S T'},
    'close': {'kloʊz': 'K L OW1 Z', 'kloʊs': 'K L OW1 S'}, 'house': {'haʊs': 'HH AW1 S', 'haʊz': 'HH AW1 Z'},
    'does': {'dʌz': 'D AH1 Z', 'doʊz': 'D OW1 Z'}, 'present': {'ˈprɛzənt': 'P R EH1 Z AH0 N T', 'prɪˈzɛnt': 'P R IY0 Z EH1 N T'},
    'wind': {'wɪnd': 'W IH1 N D', 'waɪnd': 'W AY1 N D'},
}


def expected(word, sent):
    s = sent.lower()
    if word == 'read':
        past = re.search(r"\b(have|has|had)( already| never| ever)? read\b", s) or re.search(r"\bread\b.*\b(yesterday|last|ago)\b", s) \
            or re.search(r"\b(she|he|i|we|they) read a\b.*yesterday", s)
        return 'rɛd' if past else 'riːd'
    if word == 'use':
        return 'juːs' if re.search(r'\buse to\b', s) else 'juːz'
    if word == 'used':
        return 'juːst' if re.search(r'\bused to\b', s) else 'juːzd'
    return {'live': 'lɪv', 'lives': 'lɪvz', 'close': 'kloʊz', 'house': 'haʊs', 'does': 'dʌz', 'present': 'ˈprɛzənt', 'wind': 'wɪnd'}[word]


def main():
    cmu = {}
    for line in open(os.path.join(ROOT, 'scripts/cache/cmudict.dict'), encoding='utf8'):
        m = re.match(r"^([a-z']+)(?:\(\d+\))?\s+([^#]+)", line)
        if m and m.group(1) not in cmu:
            cmu[m.group(1)] = m.group(2).split()
    js = r'''
const vm=require("vm"),fs=require("fs");const c={};c.window=c;vm.createContext(c);
for(const f of ["js/data.js","js/grammar.js","audio/manifest.js"])vm.runInContext(fs.readFileSync(f,"utf8"),c);
const plain=(en)=>en.replace(/\{[A-Z]+:([^}]*)\}/g,"$1").replace(/[[\]]/g,"").replace(/\s+/g," ").trim();
const out=[];const add=(src,en)=>{const f=c.AUDIO_MANIFEST.t[en];if(f)out.push({src,en,file:f})};
for(const st of c.STAGES)for(const l of st.lessons)for(const s of l.sentences)add("课"+l.id,s.split("|")[0]);
for(const st of c.GRAMMAR)for(const l of st.lessons){for(const e of l.examples)add("语法"+l.id,plain(e.split("|")[0]));
 for(const q of l.quiz){if(q.s){add("测验"+l.id,q.s);continue}if(!q.c||!q.c.includes("___")||/^(Which|In ")/.test(q.c))continue;
  const a=q.o[0];if(/[一-鿿]/.test(a)&&a!=="不填")continue;const parts=a==="不填"?[""]:a.split(/,\s*/);let k=0;
  add("测验"+l.id,q.c.replace(/___/g,()=>parts[Math.min(k++,parts.length-1)]).replace(/\s+/g," ").replace(/\s([.,?!])/g,"$1").trim())}}
console.log(JSON.stringify(out));'''
    sents = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT, check=True).stdout)
    proc, _ = E.get_model(E.MODEL)
    vocab, blank = proc.tokenizer.get_vocab(), proc.tokenizer.pad_token_id
    rows, seen = [], set()
    for s in sents:
        words = re.findall(r"[a-z']+", s['en'].lower())
        targets = [w for w in dict.fromkeys(words) if w in VAR]
        if not targets or s['en'] in seen:
            continue
        seen.add(s['en'])
        if any(w not in cmu and w not in VAR for w in words):
            rows.append({**s, 'error': '有词不在词典里：' + ', '.join(w for w in words if w not in cmu and w not in VAR)})
            continue
        lp, _ = E.logprobs(E.load(os.path.join(ROOT, 'audio', s['file'])))
        lp_t = torch.tensor(lp).unsqueeze(1)
        for tw in targets:
            want = expected(tw, s['en'])
            scores = {}
            for name, arpa in VAR[tw].items():
                phones = []
                for w in words:
                    seq = arpa.split() if w == tw else (VAR[w][expected(w, s['en'])].split() if w in VAR else cmu[w])
                    phones += [ARPA[re.sub(r'\d', '', p)] for p in seq]
                ids = torch.tensor([[vocab[p] for p in phones]])
                loss = torch.nn.functional.ctc_loss(lp_t, ids, torch.tensor([lp.shape[0]]), torch.tensor([len(phones)]),
                                                    blank=blank, reduction='sum', zero_infinity=True)
                scores[name] = round(float(loss), 2)
            got = min(scores, key=scores.get)
            rows.append({**s, 'word': tw, 'want': want, 'got': got, 'ok': got == want, 'margin': round(abs(scores[got] - scores[want] if got != want else sorted(scores.values())[1] - scores[got]), 2), 'scores': scores})
    bad = [r for r in rows if not r.get('ok', False)]
    for r in rows:
        if 'error' in r:
            print('?', r['src'], r['en'], r['error'])
        else:
            print('✓' if r['ok'] else '✗', f"{r['src']:8s} {r['word']:7s} 应读 /{r['want']}/ 录音像 /{r['got']}/ (差距 {r['margin']})  {r['en']}")
    print(f"\n{len([r for r in rows if 'ok' in r])} 处多音词；读错 {len([r for r in bad if 'error' not in r])}；无法判断 {len([r for r in rows if 'error' in r])}")
    json.dump(rows, open(os.path.join(ROOT, 'audio', 'heteronyms-report.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
