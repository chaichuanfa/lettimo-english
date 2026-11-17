"""检查单词音频是否按词典音标（js/ipa.js）读：逐音做"发音质量"检查（GOP 思路）。

只看识别模型的自由识别结果不可靠（它有系统偏差，比如 r 后的 /æ/ 常被识别成 /aɪ/），所以改用强制对齐比较：
  对每个词的每个音，把它换成容易混淆的音（其他元音；清浊/部位相近的辅音），
  比较"按词典读"和"换掉这个音"两种读法与录音的吻合程度（CTC 损失）；
  若换掉后明显更吻合（损失低 MARGIN 以上），说明这个位置可能读成了别的音，列出来人工复核。
允许的正常变体不算错：t/d 在元音间闪音化成 ɾ；非重读的 ə/ɪ 互换。
用法（与 extract_phonemes.py 同一个虚拟环境）：python scripts/verify_words.py [输出.json]
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
// 其余单独的单词录音（例句点读、最小对立词、关键词、高频词等）
for(const [t,f] of Object.entries(window.AUDIO_MANIFEST.t)){if(!/^[A-Za-z']+$/.test(t)||t.length<2)continue;const k=t.toLowerCase();
  if(seen.has(k))continue;seen.add(k);out.push({lesson:"点读",text:t,ipa:window.IPA[k]||"",file:f});}
console.log(JSON.stringify(out));'''], capture_output=True, text=True, cwd=ROOT).stdout
words = json.loads(js)

# 不是课程单词的录音按 CMU 词典核对：单独朗读时词典里的任何一种读法都算对，取与录音最吻合的一种
_cmu = {}
for _line in open(os.path.join(ROOT, 'scripts/cache/cmudict.dict'), encoding='utf8'):
    _m = re.match(r"^([a-z']+)(?:\(\d+\))?\s+([^#]+)", _line)
    if _m:
        _cmu.setdefault(_m.group(1), []).append(_m.group(2).split())
ARPA = {'AA': 'ɑ', 'AE': 'æ', 'AH': 'ə', 'AO': 'ɑ', 'AW': 'aʊ', 'AY': 'aɪ', 'EH': 'ɛ', 'ER': 'ɝ', 'EY': 'eɪ', 'IH': 'ɪ', 'IY': 'i',
        'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'u', 'B': 'b', 'CH': 'ʧ', 'D': 'd', 'DH': 'ð', 'F': 'f', 'G': 'g', 'HH': 'h',
        'JH': 'ʤ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ', 'T': 't',
        'TH': 'θ', 'V': 'v', 'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʃ'}


def cmu_variants(word):
    out = []
    for v in _cmu.get(word.lower(), []):
        seq = ' '.join(ARPA[re.sub(r'\d', '', p)] for p in v)
        seq = seq.replace('ɝ', 'ɹ').replace('ə ɹ', 'ɹ')
        out.append(seq.split())
    return out

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


VOW = ['i', 'ɪ', 'eɪ', 'ɛ', 'æ', 'ɑ', 'ə', 'ʊ', 'u', 'oʊ', 'aɪ', 'aʊ', 'ɔɪ', 'ɝ']
CONF = {v: [w for w in VOW if w != v] for v in VOW}
CONF.update({'p': ['b'], 'b': ['p'], 't': ['d'], 'd': ['t'], 'k': ['g'], 'g': ['k'], 'f': ['v', 'θ'], 'v': ['f', 'ð', 'b'],
             'θ': ['f', 'ð', 's'], 'ð': ['θ', 'v', 'd', 'z'], 's': ['z', 'ʃ', 'θ'], 'z': ['s', 'ð'], 'ʃ': ['s', 'ʧ'],
             'ʧ': ['ʃ', 'ʤ', 't'], 'ʤ': ['ʧ', 'd'], 'm': ['n'], 'n': ['m', 'ŋ'], 'ŋ': ['n'], 'l': ['ɹ', 'w'], 'ɹ': ['l', 'w'],
             'w': ['ɹ', 'v'], 'j': [], 'h': []})
OK_ALT = {('t', 'ɾ'), ('d', 'ɾ'), ('ə', 'ɪ'), ('ɪ', 'ə')}
MARGIN = 3.0


def ctc_loss(x, seq):
    import torch
    proc, _ = E.get_model(E.MODEL)
    vocab, blank = proc.tokenizer.get_vocab(), proc.tokenizer.pad_token_id
    lp, _ = E.logprobs(x)
    ids = torch.tensor([[vocab[t] for t in seq]])
    return float(torch.nn.functional.ctc_loss(torch.tensor(lp).unsqueeze(1), ids, torch.tensor([lp.shape[0]]), torch.tensor([len(seq)]),
                                              blank=blank, reduction='sum', zero_infinity=True))


def gop(x, exp):
    import torch
    proc, _ = E.get_model(E.MODEL)
    vocab, blank = proc.tokenizer.get_vocab(), proc.tokenizer.pad_token_id
    lp, _ = E.logprobs(x)
    lpt = torch.tensor(lp).unsqueeze(1)

    def loss(seq):
        ids = torch.tensor([[vocab[t] for t in seq]])
        return float(torch.nn.functional.ctc_loss(lpt, ids, torch.tensor([lp.shape[0]]), torch.tensor([len(seq)]),
                                                  blank=blank, reduction='sum', zero_infinity=True))
    base = loss(exp)
    flags = []
    for i, t in enumerate(exp):
        best = None
        for alt in CONF.get(t, []) + (['ɾ'] if t in ('t', 'd') else []):
            d = base - loss(exp[:i] + [alt] + exp[i + 1:])
            if best is None or d > best[1]:
                best = (alt, d)
        if best and best[1] > MARGIN and (t, best[0]) not in OK_ALT:
            flags.append({'pos': i, 'phone': t, 'heard_as': best[0], 'margin': round(best[1], 1)})
    return flags


# ---------------------------------------------------------------- 第二步：按说话人本人的元音核对
# 识别模型对 Samantha 的口音有系统偏差（ɛ→æ、ʌ→ɑ、r 后的 æ→aɪ 等），所以被标记的元音再用她自己的元音分布核对：
# 用标准语境（h_d、b_d 等）的单词测出她每个元音前段/后段的共振峰中心，被标记的元音离哪个中心最近就是读成了哪个。
CENTROID_WORDS = {
    'i': ['heed', 'bead', 'feet', 'seat', 'keep'], 'ɪ': ['hid', 'bid', 'sit', 'kick', 'fish'],
    'eɪ': ['hay', 'bait', 'made', 'cake', 'gate'], 'ɛ': ['head', 'bed', 'set', 'peck', 'fed'],
    'æ': ['had', 'bad', 'sat', 'back', 'cap'], 'ɑ': ['cot', 'pot', 'shop', 'dock', 'caught', 'talk'],
    'ə': ['hud', 'bud', 'cut', 'cup', 'duck'], 'ʊ': ['hood', 'book', 'put', 'foot', 'cook'],
    'u': ['food', 'boot', 'suit', 'shoot', 'hoot'], 'oʊ': ['boat', 'coat', 'soap', 'goat', 'hope'],
    'ɝ': ['heard', 'bird', 'hurt', 'word', 'turn'], 'aɪ': ['hide', 'bite', 'kite', 'side', 'type'],
    'aʊ': ['how', 'out', 'shout', 'doubt', 'house'], 'ɔɪ': ['boy', 'toy', 'coin', 'voice', 'boil'],
}
_cent = {}


def bounds_of(x, toks):
    """音素区间（与 extract_phonemes.locate 相同：相邻两个音素后验概率的交叉点作为边界）"""
    proc, _ = E.get_model(E.MODEL)
    vocab, blank = proc.tokenizer.get_vocab(), proc.tokenizer.pad_token_id
    lp, off = E.logprobs(x)
    ids = [vocab[t] for t in toks]
    spans = E.force_align(lp, ids, blank)
    fr = lambda f: (f - off) * E.FRAME

    def cross(k):
        a, b = spans[k][1], spans[k + 1][0]
        for t in range(a, b + 1):
            if lp[t, ids[k]] < lp[t, ids[k + 1]]:
                return fr(t)
        return (fr(a) + fr(b)) / 2 + E.FRAME / 2
    n = len(spans)
    return [(fr(spans[0][0]) if k == 0 else cross(k - 1), fr(spans[-1][1] + 1) if k == n - 1 else cross(k)) for k in range(n)]


def vowel_feats(x, exp, i):
    """第 i 个音（元音）区间里浊音、较强的帧，取前 1/3 与后 1/3 的 log F1/F2 中位数"""
    import numpy as np
    import parselmouth
    a, b = bounds_of(x, exp)[i]
    snd = parselmouth.Sound(x.astype('float64'), E.SR)
    fm = snd.to_formant_burg(time_step=0.005, max_number_of_formants=5, maximum_formant=5500)
    pitch = snd.to_pitch(time_step=0.005)
    it = snd.to_intensity(time_step=0.005)
    ts = [t for t in np.arange(a, b, 0.005) if pitch.get_value_at_time(t) == pitch.get_value_at_time(t)]
    if len(ts) < 4:
        return None
    pk = max(it.get_value(t) for t in ts)
    ts = [t for t in ts if it.get_value(t) > pk - 10]
    if len(ts) < 4:
        return None
    k = max(2, len(ts) // 3)
    out = []
    for part in (ts[:k], ts[-k:]):
        vals = [(fm.get_value_at_time(1, t), fm.get_value_at_time(2, t)) for t in part]
        vals = [v for v in vals if v[0] == v[0] and v[1] == v[1]]
        if not vals:
            return None
        out += [np.log(np.median([v[0] for v in vals])), np.log(np.median([v[1] for v in vals]))]
    return np.array(out)


def centroids():
    import numpy as np
    if _cent:
        return _cent
    cmu = {}
    for line in open(os.path.join(ROOT, 'scripts/cache/cmudict.dict'), encoding='utf8'):
        m = re.match(r"^([a-z']+)(?:\(\d+\))?\s+([^#]+)", line)
        if m and m.group(1) not in cmu:
            cmu[m.group(1)] = m.group(2).split()
    ARPA = {'AA': 'ɑ', 'AE': 'æ', 'AH': 'ə', 'AO': 'ɑ', 'AW': 'aʊ', 'AY': 'aɪ', 'EH': 'ɛ', 'ER': 'ɝ', 'EY': 'eɪ', 'IH': 'ɪ',
            'IY': 'i', 'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'u', 'B': 'b', 'CH': 'ʧ', 'D': 'd', 'DH': 'ð', 'F': 'f', 'G': 'g',
            'HH': 'h', 'JH': 'ʤ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ',
            'T': 't', 'TH': 'θ', 'V': 'v', 'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʃ'}
    for v, ws in CENTROID_WORDS.items():
        feats = []
        for w in ws:
            seq = [ARPA[re.sub(r'\d', '', p)] for p in cmu[w]]
            k = next(j for j, t in enumerate(seq) if t == v)
            f = vowel_feats(E.load(E.tts(w, 150)), seq, k)
            if f is not None:
                feats.append(f)
        _cent[v] = np.median(feats, axis=0)
    return _cent


def nearest(f):
    import numpy as np
    c = centroids()
    d = {v: float(np.linalg.norm(f - m)) for v, m in c.items()}
    return min(d, key=d.get), d


# ---------------------------------------------------------------- 第二步：对照合成证实
# 被标记的词再用对照合成核实"读的是常规读法"：把词写成一个规则拼写（双写末尾辅音，或 scripts/ref/word-respellings.json
# 里的音标式拼写，如 phone→fone、grow→groe），Samantha 合成出与原词完全相同的音频，就证明她按常规读法读这个词，
# 标记只是识别模型对她口音的偏差（ɛ→æ、ʌ→ɑ、词尾不爆破的 t→d 等）。证明不了的列为"待复核"。
RESPELL = json.load(open(os.path.join(ROOT, 'scripts', 'ref', 'word-respellings.json')))
# 找不到合成完全相同的规则拼写时的反向证明：把被标记的音换掉造出"误读版"拼写（shin→sheen、guess→gas），
# 与原词合成不同，就证明没有读成那个音（shin 就是这样查出与 sheen 完全相同、读错了的）
MISREAD = json.load(open(os.path.join(ROOT, 'scripts', 'ref', 'word-misreadings.json')))
# 有据可查的读音变体（不是错误）
# 有据可查、无法用拼写证明的情况（证据针对当前声音 Ava；换声音后要重新核实）
KNOWN = {'hangzhou': '专有名词，词典里没有：识别结果为 /h ɑ n ʤ oʊ/（ŋ 在 ʤ 前同化为 n），即英语词典标注的 /ˌhɑːŋˈdʒoʊ/；与英语化误读 Hang-zoo、Hangzoe、Hang-chow 的识别结果都不同',
         'schoolbag': '合成词（school + bag），词典里没有：识别 6 种条件全部是 /s k u l b æ g/，与 "school bag" 一致'}
_h = {}


def synth_hash(text, rate=150):
    import hashlib
    import tempfile
    if text not in _h:
        path = os.path.join(tempfile.gettempdir(), 'w-' + hashlib.md5(text.encode()).hexdigest() + '.aiff')
        E.say(text, rate, path)
        _h[text] = hashlib.md5(open(path, 'rb').read()).hexdigest()
        os.remove(path)
    return _h[text]


def respellings(word):
    w = word.lower()
    out = [RESPELL[w]] if w in RESPELL else []
    if w[-1] not in 'aeiouy':
        out.append(word + word[-1])                       # bed → bedd
    if w.endswith('e') and len(w) > 2 and w[-2] not in 'aeiou':
        out.append(word[:-1] + word[-2] + 'e')            # tickle → ticklle（尾 e 前的辅音双写）
    return out


# 按音标拼出"只能那样读"的写法（用于声学距离对比：正确读法 vs 识别模型以为的读法）
SPELL_OF = {'ɪ': 'i', 'ɛ': 'e', 'æ': 'a', 'ɑ': 'ah', 'ʌ': 'u', 'ə': 'u', 'ʊ': 'oo', 'u': 'oo', 'i': 'ee', 'eɪ': 'ay',
            'aɪ': 'igh', 'oʊ': 'oh', 'aʊ': 'ow', 'ɔɪ': 'oy', 'ɔ': 'aw', 'ɝ': 'er', 'ɚ': 'er', 'p': 'p', 'b': 'b', 't': 't',
            'd': 'd', 'k': 'k', 'g': 'g', 'f': 'f', 'v': 'v', 's': 's', 'z': 'z', 'θ': 'th', 'ð': 'th', 'ʃ': 'sh', 'ʒ': 'zh',
            'ʧ': 'ch', 'ʤ': 'j', 'm': 'm', 'n': 'n', 'ŋ': 'ng', 'l': 'l', 'ɹ': 'r', 'w': 'w', 'j': 'y', 'h': 'h', 'ɾ': 't'}


def phonetic(toks):
    try:
        return ''.join(SPELL_OF[t] for t in toks)
    except KeyError:
        return None


VOWELS_ALL = set('ɪ ɛ æ ɑ ʌ ə ʊ u i eɪ aɪ oʊ aʊ ɔɪ ɔ ɝ ɚ'.split())


def neutral(exp, pos, heard):
    """这个替换在美式英语里本来就不区分（不是误读）：r 前的元音（/ɔr/ /oʊr/ /ʊr/ 合流，ɪr/ir、ɛr/eɪr 同理）；
    元音之间的 t/d（闪音，metal 读得像 medal）；弱读元音 ə 与 ɪ ɛ ʊ ʌ 互换"""
    ph, nxt = exp[pos], exp[pos + 1] if pos + 1 < len(exp) else None
    prv = exp[pos - 1] if pos > 0 else None
    if ph in VOWELS_ALL and nxt in ('ɹ', 'ɝ', 'ɚ'):
        return 'r 前元音不区分'
    if {ph, heard} == {'t', 'd'} and prv in VOWELS_ALL | {'ɹ'} and (nxt in VOWELS_ALL | {'l', 'ɹ'} or nxt is None and False):
        return '元音间 t/d 闪音化'
    if 'ə' in (ph, heard) and {ph, heard} <= {'ə', 'ɪ', 'ɛ', 'ʊ', 'ʌ'}:
        return '弱读元音'
    return None


def prove(word, spoken, exp=None, flags=(), alts=()):
    """返回 (证明 或 None, 是否证实读错)。Ava 对同一串音素必定合成出逐字节相同的音频、不同音素就不同，所以：
    1. 与"正确读法"的规则拼写合成完全相同 → 证明读对；
    2. 把被标记的音换成识别模型听到的音，拼出"误读写法"：合成完全相同 → 证实读错；全都不同 → 证明没有读成那样；
    r 前元音、元音间 t/d、弱读元音这几类美式英语本来就不区分的替换不算误读（拼出的误读写法也会被读成正确读法）"""
    w = word.lower()
    if w in KNOWN:
        return KNOWN[w], False
    h = synth_hash(spoken)
    sp = next((sp for sp in respellings(word) if sp.lower() != spoken.lower() and synth_hash(sp) == h), None)
    if sp:
        return f'与 "{sp}" 合成完全相同', False
    if not exp:
        if w in MISREAD and synth_hash(MISREAD[w]) != h:
            return f'与误读版 "{MISREAD[w]}" 合成不同', False
        return None, False
    checked, skipped = [], []
    for f in flags:
        if not isinstance(f.get('pos'), int) or f.get('heard_as') not in SPELL_OF:
            return None, False
        why = neutral(exp, f['pos'], f['heard_as'])
        mis = exp[:f['pos']] + [f['heard_as']] + exp[f['pos'] + 1:]
        if why or mis in alts:
            skipped.append(f"/{f['phone']}/→/{f['heard_as']}/（{why or '词典里的另一种读法'}）")
            continue
        m = phonetic(mis)
        if not m or m.lower() == spoken.lower():
            if w in MISREAD:          # 拼不出与原词不同的误读写法（his → /hɪs/ 还是 "his"），改用 word-misreadings.json 里的写法
                continue
            return None, False
        if synth_hash(m) == h:
            return f'与误读写法 "{m}"（/{" ".join(mis)}/）合成完全相同', True
        checked.append(f'"{m}"')
    if w in MISREAD:
        if synth_hash(MISREAD[w]) == h:
            return f'与误读版 "{MISREAD[w]}" 合成完全相同', True
        checked.append(f'"{MISREAD[w]}"')
    parts = ([f'与误读写法 {"、".join(checked)} 合成都不同'] if checked else []) + ([f'不算误读：{"；".join(skipped)}'] if skipped else [])
    return ('；'.join(parts), False) if parts else (None, False)


def main(out=None, only=None):
    speak_as = json.load(open(os.path.join(ROOT, 'audio', 'speak-as.json')))
    rows = []
    for w in words:
        if only and w['text'].lower() not in only:
            continue
        if not w['file'] or (not w['ipa'] and w['lesson'] != '点读'):
            rows.append({**w, 'issue': '缺音频或音标', 'flags': []})
            continue
        x = E.load(os.path.join(ROOT, 'audio', w['file']))
        if w['ipa']:
            exp = norm(w['ipa'].split())
        else:                        # 点读词：取 CMU 里与录音最吻合的读法
            vs = cmu_variants(w['text'])
            if not vs:      # 词典里没有（专有名词、合成词）：只能用对照合成证实
                proof, wrong = prove(w['text'], speak_as.get(w['text'], w['text']))
                rows.append({**w, 'flags': [{'pos': 0, 'phone': '?', 'heard_as': '?', 'margin': 0}] if not proof else [{'pos': 0, 'phone': '词典无', 'heard_as': '-', 'margin': 0}],
                             'proof': None if wrong else proof, 'wrong': proof if wrong else None,
                             **({} if proof and not wrong else {'issue': '词典里没有，对照合成也无法证实'})})
                continue
            exp = min(vs, key=lambda v: ctc_loss(x, v)) if len(vs) > 1 else vs[0]
        flags = gop(x, exp)
        # 换掉后正好是词典收录的另一种读法（always 读 /ɪz/、exam 读 /ɛg-/ 等）：是正常的读音变体，不算错
        alts = [norm(w['ipa'].split())] if w['ipa'] else []
        alts += cmu_variants(w['text'])
        flags = [f for f in flags if exp[:f['pos']] + [f['heard_as']] + exp[f['pos'] + 1:] not in alts]
        for f in flags:          # 元音：按说话人本人的元音分布核对
            if f['phone'] in VOW and f['heard_as'] in VOW:
                fe = vowel_feats(x, exp, f['pos'])
                if fe is not None:
                    v, d = nearest(fe)
                    f['speaker_nearest'] = v
                    f['bias'] = v == f['phone'] or (f['phone'] in ('ə', 'ɪ') and v in ('ə', 'ɪ'))
        proof, wrong = prove(w['text'], speak_as.get(w['text'], w['text']), exp, flags, alts) if flags else (None, False)
        rows.append({**w, 'exp': ' '.join(exp), 'heard': E.recognize(x), 'flags': flags,
                     'proof': None if wrong else proof, 'wrong': proof if wrong else None})
    bad = [r for r in rows if r['flags'] or r.get('issue')]
    review = [r for r in bad if not r.get('proof')]
    wrong = [r for r in review if r.get('wrong')]
    print(f'{len(rows)} 个单词；识别模型标记 {len(bad)} 个，其中对照合成证实按常规读法读的 {len(bad) - len(review)} 个；'
          f'证实读错 {len(wrong)} 个；待复核 {len(review)} 个')
    for r in wrong:
        print(f'  ✗✗ {r["lesson"]:5s} {r["text"]:12s} 读错：{r["wrong"]}')
    for r in review:
        if r.get('wrong'):
            continue
        if r.get('issue'):
            print(f'  ✗ {r["lesson"]:5s} {r["text"]:12s} {r["issue"]}')
            continue
        f = '；'.join(f'第{x["pos"] + 1}个音 /{x["phone"]}/ 更像 /{x["heard_as"]}/（差 {x["margin"]}）'
                     + (f'，按她本人元音分布最近 /{x["speaker_nearest"]}/' if 'speaker_nearest' in x else '') for x in r['flags'])
        print(f'  ✗ {r["lesson"]:5s} {r["text"]:12s} /{r["exp"]}/  识别 /{r["heard"]}/  {f}')
    if out:
        json.dump(rows, open(out, 'w'), ensure_ascii=False, indent=1)
    return rows


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None, {a.lower() for a in sys.argv[2:]} or None)
