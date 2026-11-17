"""检查例句录音里的多音词读得对不对（read /riːd/ 还是 /rɛd/、used to /juːst/ 还是 /juːzd/ …）。

做法（两级）：
  1. 对照合成：Samantha 对同一段文字每次合成的音频完全相同。把句中的多音词换成"只能那样读"的拼写
     （reed / red、yoost / yoozd …）分别合成，实际录音所用的文字与哪一种合成出完全相同的音频，就是读成了哪种。
     两种拼写合成结果相同时说明在这个语境里读音中和（如 "use to" 的 s/z 在 t 前都读成清音），按中和处理。
  2. 对照合成判断不了时，退回强制对齐：整句按词典读音转成音素序列，多音词分别代入两种读音，
     用识别模型比较哪种与录音更吻合（CTC 损失）。已知局限：在 "use / used + to" 里会偏向 /z/。
录音用替换写法合成的句子（audio/speak-as.json，由 build-audio.mjs 生成）按实际合成的文字核对。
用法（与 extract_phonemes.py 同一个虚拟环境）：python scripts/verify_heteronyms.py
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
    'lived': {'lɪvd': 'L IH1 V D', 'laɪvd': 'L AY1 V D'}, 'closed': {'kloʊzd': 'K L OW1 Z D', 'kloʊst': 'K L OW1 S T'},
    'learned': {'lɝnd': 'L ER1 N D', 'ˈlɝnɪd': 'L ER1 N IH0 D'},
    'presents': {'ˈprɛzənts': 'P R EH1 Z AH0 N T S', 'prɪˈzɛnts': 'P R IY0 Z EH1 N T S'},
    'tears': {'tɪrz': 'T IH1 R Z', 'tɛrz': 'T EH1 R Z'}, 'minutes': {'ˈmɪnɪts': 'M IH1 N AH0 T S', 'maɪˈnuːts': 'M AY0 N UW1 T S'},
    'uses': {'ˈjuːzɪz': 'Y UW1 Z IH0 Z', 'ˈjuːsɪz': 'Y UW1 S IH0 Z'}, 'reads': {'riːdz': 'R IY1 D Z', 'rɛdz': 'R EH1 D Z'},
}


# 多音词各读法"只能那样读"的拼写（用于对照合成）
SPELL = {
    'read': {'riːd': 'reed', 'rɛd': 'red'}, 'live': {'lɪv': 'liv', 'laɪv': 'lyve'}, 'lives': {'lɪvz': 'livs', 'laɪvz': 'lyves'},
    'use': {'juːz': 'yooz', 'juːs': 'yoos'}, 'used': {'juːzd': 'yoozd', 'juːst': 'yoost'},
    'close': {'kloʊz': 'cloze', 'kloʊs': 'klohs'}, 'house': {'haʊs': 'howss', 'haʊz': 'howz'},
    'does': {'dʌz': 'duz', 'doʊz': 'doze'}, 'present': {'ˈprɛzənt': 'prezzent', 'prɪˈzɛnt': 'prizzent'},
    'wind': {'wɪnd': 'winned', 'waɪnd': 'wined'},
    'lived': {'lɪvd': 'livd', 'laɪvd': 'lyved'}, 'closed': {'kloʊzd': 'clozed', 'kloʊst': 'klohst'},
    'learned': {'lɝnd': 'lernd', 'ˈlɝnɪd': 'lernid'}, 'presents': {'ˈprɛzənts': 'prezzents', 'prɪˈzɛnts': 'prizzents'},
    'tears': {'tɪrz': 'teers', 'tɛrz': 'tares'}, 'minutes': {'ˈmɪnɪts': 'minnits', 'maɪˈnuːts': 'mynoots'},
    'uses': {'ˈjuːzɪz': 'yoozez', 'ˈjuːsɪz': 'yoosez'}, 'reads': {'riːdz': 'reeds', 'rɛdz': 'reds'},
}
_hash = {}


def synth_hash(text, rate=165):
    import hashlib
    import tempfile
    if text not in _hash:
        path = os.path.join(tempfile.gettempdir(), 'het-' + hashlib.md5(text.encode()).hexdigest() + '.aiff')
        E.say(text, rate, path)
        _hash[text] = hashlib.md5(open(path, 'rb').read()).hexdigest()
        os.remove(path)
    return _hash[text]


def control(spoken, word):
    """对照合成：返回读法（唯一匹配）、'neutral'（两种拼写合成相同）或 None（都不匹配）"""
    h = synth_hash(spoken)
    pat = re.compile(r'\b' + word + r'\b', re.I)
    if not pat.search(spoken):
        return None
    alts = {name: synth_hash(pat.sub(sp, spoken, count=1)) for name, sp in SPELL[word].items()}
    if len(set(alts.values())) == 1:
        return 'neutral' if h == next(iter(alts.values())) else None
    hit = [name for name, ah in alts.items() if ah == h]
    return hit[0] if len(hit) == 1 else None


def acoustic(spoken, word):
    """对照合成不逐字节相同时：声学距离判读（见 acoustic_compare.py）。返回 (读法 或 None, 说明)"""
    import acoustic_compare as AC
    pat = re.compile(r'\b' + word + r'\b', re.I)
    if not pat.search(spoken):
        return None, ''
    got, d = AC.pick(spoken, {name: pat.sub(sp, spoken, count=1) for name, sp in SPELL[word].items()}, 165)
    return got, '声学距离 ' + '、'.join(f'"{SPELL[word][k]}" {v}' for k, v in d.items())


# 强制对齐与声学距离结论冲突、经人工逐项测量裁决的句子（证据与录音指纹一起记录；录音一变指纹不符，复核自动失效）
REVIEWED = json.load(open(os.path.join(ROOT, 'scripts', 'ref', 'heteronym-reviewed.json')))


def reviewed(sent, word, file):
    import hashlib
    r = REVIEWED.get(sent)
    if r and r['word'] == word and hashlib.md5(open(os.path.join(ROOT, 'audio', file), 'rb').read()).hexdigest() == r['audio_md5']:
        return r['reading'], '人工复核：' + r['evidence']
    return None, ''


# 例句里 read 是过去式、但句子本身看不出时态的，按中文翻译确定（等公共汽车的时候，我看了一会儿书）
READ_PAST = {'while waiting for the bus, i read a book.'}


def expected(word, sent):
    s = sent.lower()
    if word == 'read':
        past = re.search(r"\b(have|has|had)( already| never| ever)? read\b", s) or re.search(r"\bread\b.*\b(yesterday|last|ago)\b", s) \
            or re.search(r"\b(she|he|i|we|they) read a\b.*yesterday", s)
        return 'rɛd' if past or s in READ_PAST else 'riːd'
    if word == 'use':      # use to（过去常常）、no use / of use（名词）读 /juːs/
        return 'juːs' if re.search(r'\buse to\b|\bno use\b|\bof use\b|\bthe use of\b', s) else 'juːz'
    if word == 'used':
        return 'juːst' if re.search(r'\bused to\b', s) else 'juːzd'
    return {'live': 'lɪv', 'lives': 'lɪvz', 'close': 'kloʊz', 'house': 'haʊs', 'does': 'dʌz', 'present': 'ˈprɛzənt', 'wind': 'wɪnd',
            'lived': 'lɪvd', 'closed': 'kloʊzd', 'learned': 'lɝnd', 'presents': 'ˈprɛzənts', 'tears': 'tɪrz', 'minutes': 'ˈmɪnɪts',
            'uses': 'ˈjuːzɪz', 'reads': 'riːdz'}[word]


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
    speak_as = json.load(open(os.path.join(ROOT, 'audio', 'speak-as.json')))
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
            # 有词不在词典里，无法做强制对齐；对照合成不需要词典
            spoken = speak_as.get(s['en'], s['en'])
            for tw in targets:
                want, ctl = expected(tw, s['en']), control(spoken, tw)
                ac, ac_how = (None, '') if ctl else acoustic(spoken, tw)
                rv, rv_how = reviewed(s['en'], tw, s['file'])
                if rv and not ctl:
                    rows.append({**s, 'spoken': spoken, 'word': tw, 'want': want, 'got': rv, 'ok': rv == want, 'how': rv_how})
                elif ctl:
                    got = want if ctl == 'neutral' else ctl
                    rows.append({**s, 'spoken': spoken, 'word': tw, 'want': want, 'got': got, 'ok': got == want,
                                 'how': '对照合成：两种拼写合成相同（读音中和）' if ctl == 'neutral' else f'对照合成：与 "{SPELL[tw][ctl]}" 写法完全相同'})
                elif ac:
                    rows.append({**s, 'spoken': spoken, 'word': tw, 'want': want, 'got': ac, 'ok': ac == want, 'how': ac_how})
                else:
                    rows.append({**s, 'error': '有词不在词典里、对照合成也无法判断：' + ', '.join(w for w in words if w not in cmu and w not in VAR)})
            continue
        spoken = speak_as.get(s['en'], s['en'])
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
            margin = round(abs(scores[got] - scores[want] if got != want else sorted(scores.values())[1] - scores[got]), 2)
            # 对照合成优先（按实际合成的文字；替换写法里多音词已换掉时只能用强制对齐）
            ctl = control(spoken, tw)
            if ctl == 'neutral':
                got, how = want, '对照合成：两种拼写合成相同（读音中和）'
            elif ctl:
                got, how = ctl, f'对照合成：与 "{SPELL[tw][ctl]}" 写法完全相同'
            elif spoken != s['en'] and any(re.search(r'\b' + sp + r'\b', spoken) for sp in SPELL[tw].values()):
                alt = next(name for name, sp in SPELL[tw].items() if re.search(r'\b' + sp + r'\b', spoken))
                got, how = alt, f'按替换写法 "{SPELL[tw][alt]}" 合成'
            else:
                # 强制对齐与声学距离一致才定案（两者各有偏差：强制对齐在 use(d) to 偏向 /z/，整句声学距离会被韵律变化带偏）；
                # 冲突时看人工复核清单，没有复核记录就列为无法判断
                ac, ac_how = acoustic(spoken, tw)
                rv, rv_how = reviewed(s['en'], tw, s['file'])
                if rv:
                    got, how = rv, rv_how
                elif ac == got or (ac is None and margin >= 3):
                    how = f'强制对齐（差距 {margin}）' + (f'，{ac_how}' if ac else '')
                else:
                    rows.append({**s, 'error': f'强制对齐判 /{got}/（差距 {margin}）与{ac_how or "声学距离（无法区分）"}不一致，需人工复核'})
                    continue
            rows.append({**s, 'spoken': spoken, 'word': tw, 'want': want, 'got': got, 'ok': got == want, 'how': how, 'scores': scores})
    bad = [r for r in rows if not r.get('ok', False)]
    for r in rows:
        if 'error' in r:
            print('?', r['src'], r['en'], r['error'])
        else:
            print('✓' if r['ok'] else '✗', f"{r['src']:8s} {r['word']:7s} 应读 /{r['want']}/ 录音读 /{r['got']}/  {r['how']}  {r['en']}")
    print(f"\n{len([r for r in rows if 'ok' in r])} 处多音词；读错 {len([r for r in bad if 'error' not in r])}；无法判断 {len([r for r in rows if 'error' in r])}")
    json.dump(rows, open(os.path.join(ROOT, 'audio', 'heteronyms-report.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
