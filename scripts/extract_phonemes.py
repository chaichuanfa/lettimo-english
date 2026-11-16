"""从 Samantha 朗读的真实单词中截取每个自然拼读音素，并用音素识别模型逐个校验。

为什么这样做
  * macOS `say` 不支持音素输入，单独的字母会被读成字母名，大写字母甚至会读成 "capital A"；
  * Wikimedia 的 IPA 录音是语音学"基准元音"，和美式英语里的实际元音不一样，且是另一个人声。
  所以让同一个声音（Samantha）朗读含目标音素的单词，用 CTC 强制对齐找到音素位置，截取出来。

怎样算"正确"（每项都在 6 种识别条件下重复，至少 5 次通过）
  * 元音类：片段严格位于模型判定的目标音素区间内；识别结果中的元音部分 = 目标元音
  * 爆破音等（p b t d k g ch j h w y）：爆破音无法单独持续，保留极短的后接弱元音；
    识别结果第一个音 = 目标辅音，其后最多一个弱元音，不得有其他辅音
  * 可持续辅音（f v s z sh zh m n l r ð）：片段位于目标区间内；与已验证的元音 /ɑ/ 拼读后
    识别为"辅音+ɑ"（响音前后都测；ʒ 只出现在词尾，测"ɑ+辅音"）；擦音另做声学检查确保不含元音
  * θ、ŋ：人耳和模型都主要靠元音过渡来区分 θ/f、ŋ/n，所以保留极短的过渡；识别为 θ / ŋ
  * 最终写入的 mp3 会再按同样规则复查一次（scripts/verify_phonemes.py 可随时复查）

识别模型：TIMIT 英语音素模型（vitouphy/wav2vec2-xls-r-300m-timit-phoneme）；
ð 改用多语言 espeak 音素模型判定（TIMIT 模型常把 ð 听成 v）。

依赖（独立虚拟环境）：torch transformers numpy；系统需要 say、ffmpeg。
用法：python scripts/extract_phonemes.py [音素id ...]
输出：audio/p/<id>.mp3、audio/p/report.json
"""
import json, os, re, subprocess, sys, tempfile
import numpy as np
import torch
from transformers import AutoProcessor, AutoModelForCTC

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'audio', 'p')
VOICE, RATE = 'Samantha', 150
SR, FRAME = 16000, 0.02
MODEL = 'vitouphy/wav2vec2-xls-r-300m-timit-phoneme'
JUDGE2 = 'facebook/wav2vec2-lv-60-espeak-cv-ft'

# 音素id → 候选单词 [(单词, 音素序列(TIMIT 记号), 目标下标, 截取方式)]，按优先顺序尝试
SPEC = {
    'a_s': [('cat', 'k æ t', 1, 'vowel'), ('bat', 'b æ t', 1, 'vowel'), ('sat', 's æ t', 1, 'vowel')],
    'e_s': [('head', 'h ɛ d', 1, 'vowel'), ('bed', 'b ɛ d', 1, 'vowel'), ('pet', 'p ɛ t', 1, 'vowel'), ('egg', 'ɛ g', 0, 'vowel')],
    'i_s': [('pig', 'p ɪ g', 1, 'vowel'), ('sit', 's ɪ t', 1, 'vowel'), ('bit', 'b ɪ t', 1, 'vowel')],
    'o_s': [('hot', 'h ɑ t', 1, 'vowel'), ('pot', 'p ɑ t', 1, 'vowel'), ('top', 't ɑ p', 1, 'vowel')],
    'u_s': [('sun', 's ə n', 1, 'vowel'), ('cut', 'k ə t', 1, 'vowel'), ('but', 'b ə t', 1, 'vowel')],
    'oo_s': [('hood', 'h ʊ d', 1, 'hvowel', 100), ('book', 'b ʊ k', 1, 'vowel', 100), ('hood', 'h ʊ d', 1, 'hvowel'), ('hook', 'h ʊ k', 1, 'hvowel'), ('book', 'b ʊ k', 1, 'vowel'), ('put', 'p ʊ t', 1, 'vowel'), ('good', 'g ʊ d', 1, 'vowel')],
    'schwa': [('about', 'ə b aʊ t', 0, 'vowel'), ('ago', 'ə g oʊ', 0, 'vowel'), ('sofa', 's oʊ f ə', 3, 'vowel')],
    'a_l': [('hay', 'h eɪ', 1, 'hvowel'), ('say', 's eɪ', 1, 'vowel'), ('day', 'd eɪ', 1, 'vowel')],
    'e_l': [('see', 's i', 1, 'vowel'), ('he', 'h i', 1, 'hvowel'), ('bee', 'b i', 1, 'vowel')],
    'i_l': [('eye', 'aɪ', 0, 'whole'), ('high', 'h aɪ', 1, 'hvowel'), ('pie', 'p aɪ', 1, 'vowel')],
    'o_l': [('go', 'g oʊ', 1, 'vowel', 110), ('hoe', 'h oʊ', 1, 'hvowel', 110), ('hoe', 'h oʊ', 1, 'hvowel'), ('oh', 'oʊ', 0, 'whole'), ('go', 'g oʊ', 1, 'vowel')],
    'u_l': [('you', 'j u', 0, 'whole'), ('hue', 'h j u', 1, 'tail'), ('few', 'f j u', 1, 'tail')],
    'oo_l': [('too', 't u', 1, 'vowel'), ('who', 'h u', 1, 'hvowel'), ('zoo', 'z u', 1, 'vowel')],
    'aw': [('awe', 'ɑ', 0, 'whole'), ('saw', 's ɑ', 1, 'vowel'), ('law', 'l ɑ', 1, 'vowel')],
    'oi': [('oy', 'ɔɪ', 0, 'whole'), ('boy', 'b ɔɪ', 1, 'vowel'), ('toy', 't ɔɪ', 1, 'vowel')],
    'ow': [('how', 'h aʊ', 1, 'hvowel'), ('ow', 'aʊ', 0, 'whole'), ('cow', 'k aʊ', 1, 'vowel')],
    'ar': [('car', 'k ɑ ɹ', 1, 'tail'), ('are', 'ɑ ɹ', 0, 'whole'), ('far', 'f ɑ ɹ', 1, 'tail')],
    'or': [('or', 'ɑ ɹ', 0, 'whole'), ('for', 'f ɑ ɹ', 1, 'tail'), ('more', 'm ɑ ɹ', 1, 'tail')],
    'er': [('her', 'h ɝ', 1, 'hvowel'), ('fur', 'f ɝ', 1, 'vowel'), ('sir', 's ɝ', 1, 'vowel')],
    'air': [('hair', 'h ɛ ɹ', 1, 'htail'), ('air', 'ɛ ɹ', 0, 'whole'), ('pair', 'p ɛ ɹ', 1, 'tail')],
    'ear': [('hear', 'h ɪ ɹ', 1, 'htail'), ('ear', 'ɪ ɹ', 0, 'whole'), ('near', 'n ɪ ɹ', 1, 'tail')],
    'p': [('pup', 'p ə p', 0, 'stop'), ('puff', 'p ə f', 0, 'stop')],
    'b': [('bus', 'b ə s', 0, 'stop'), ('bug', 'b ə g', 0, 'stop')],
    't': [('tub', 't ə b', 0, 'stop'), ('tug', 't ə g', 0, 'stop')],
    'd': [('dug', 'd ə g', 0, 'stop', 110), ('dug', 'd ə g', 0, 'stop'), ('duck', 'd ə k', 0, 'stop')],
    'k': [('cup', 'k ə p', 0, 'stop', 110), ('cup', 'k ə p', 0, 'stop'), ('cub', 'k ə b', 0, 'stop'), ('cut', 'k ə t', 0, 'stop')],
    'g': [('gum', 'g ə m', 0, 'stop'), ('gut', 'g ə t', 0, 'stop')],
    'ch': [('chop', 'ʧ ɑ p', 0, 'stop'), ('chuck', 'ʧ ə k', 0, 'stop')],
    'j': [('jug', 'ʤ ə g', 0, 'stop', 110), ('jug', 'ʤ ə g', 0, 'stop'), ('jam', 'ʤ æ m', 0, 'stop')],
    'h': [('hut', 'h ə t', 0, 'stop'), ('hum', 'h ə m', 0, 'stop')],
    'w': [('one', 'w ə n', 0, 'stop'), ('won', 'w ə n', 0, 'stop'), ('wet', 'w ɛ t', 0, 'stop')],
    'y': [('yum', 'j ə m', 0, 'stop'), ('young', 'j ə ŋ', 0, 'stop'), ('yes', 'j ɛ s', 0, 'stop')],
    'f': [('off', 'ɑ f', 1, 'fric'), ('puff', 'p ə f', 2, 'fric'), ('fun', 'f ə n', 0, 'cont')],
    'v': [('love', 'l ə v', 2, 'fric', 100), ('van', 'v æ n', 0, 'fric', 100), ('love', 'l ə v', 2, 'fric'), ('five', 'f aɪ v', 2, 'fric'), ('van', 'v æ n', 0, 'cont')],
    's': [('bus', 'b ə s', 2, 'fric'), ('sun', 's ə n', 0, 'fric'), ('sun', 's ə n', 0, 'cont')],
    'z': [('zoo', 'z u', 0, 'fric', 100), ('buzz', 'b ə z', 2, 'fric', 100), ('zoo', 'z u', 0, 'cont'), ('buzz', 'b ə z', 2, 'fric'), ('zip', 'z ɪ p', 0, 'cont')],
    'th': [('thug', 'θ ə g', 0, 'fricstop', 110), ('thud', 'θ ə d', 0, 'fricstop'), ('thug', 'θ ə g', 0, 'fricstop'), ('thick', 'θ ɪ k', 0, 'fricstop')],
    'th_v': [('that', 'ð æ t', 0, 'onset', 100), ('this', 'ð ɪ s', 0, 'onset', 100), ('them', 'ð ɛ m', 0, 'onset', 100), ('the', 'ð ə', 0, 'onset', 100), ('that', 'ð æ t', 0, 'fric', 100), ('this', 'ð ɪ s', 0, 'fric', 100), ('that', 'ð æ t', 0, 'cont', 100), ('that', 'ð æ t', 0, 'fric'), ('this', 'ð ɪ s', 0, 'fric'), ('then', 'ð ɛ n', 0, 'fric')],
    'sh': [('fish', 'f ɪ ʃ', 2, 'fric'), ('shop', 'ʃ ɑ p', 0, 'cont'), ('ship', 'ʃ ɪ p', 0, 'cont')],
    'zh': [('beige', 'b eɪ ʃ', 2, 'fric', 100), ('beige', 'b eɪ ʃ', 2, 'cont', 100), ('beige', 'b eɪ ʃ', 2, 'cont'), ('garage', 'g ə ɹ ɑ ʃ', 4, 'cont'), ('vision', 'v ɪ ʃ ə n', 2, 'cont')],
    'm': [('mom', 'm ɑ m', 0, 'cont', 100), ('hum', 'h ə m', 2, 'cont', 100), ('mom', 'm ɑ m', 0, 'cont'), ('map', 'm æ p', 0, 'cont'), ('hum', 'h ə m', 2, 'cont')],
    'n': [('nut', 'n ə t', 0, 'cont', 100), ('sun', 's ə n', 2, 'cont', 100), ('nap', 'n æ p', 0, 'cont'), ('net', 'n ɛ t', 0, 'cont'), ('sun', 's ə n', 2, 'cont'), ('nut', 'n ə t', 0, 'cont')],
    'ng': [('sing', 's ɪ ŋ', 2, 'rstop'), ('sung', 's ə ŋ', 2, 'rstop'), ('song', 's ɑ ŋ', 2, 'rstop')],
    'l': [('lip', 'l ɪ p', 0, 'onset', 85), ('leg', 'l ɛ g', 0, 'onset', 85), ('lot', 'l ɑ t', 0, 'onset', 85), ('lip', 'l ɪ p', 0, 'onset'), ('leg', 'l ɛ g', 0, 'cont', 85), ('ball', 'b ɑ l', 2, 'cont', 85), ('lot', 'l ɑ t', 0, 'cont', 85), ('leg', 'l ɛ g', 0, 'cont'), ('lip', 'l ɪ p', 0, 'cont'), ('lot', 'l ɑ t', 0, 'cont'), ('ball', 'b ɑ l', 2, 'cont')],
    'r': [('red', 'ɹ ɛ d', 0, 'onset', 85), ('run', 'ɹ ə n', 0, 'onset', 85), ('rock', 'ɹ ɑ k', 0, 'onset', 85), ('red', 'ɹ ɛ d', 0, 'onset'), ('red', 'ɹ ɛ d', 0, 'cont', 85), ('run', 'ɹ ə n', 0, 'cont', 85), ('rock', 'ɹ ɑ k', 0, 'cont', 85), ('red', 'ɹ ɛ d', 0, 'cont'), ('run', 'ɹ ə n', 0, 'cont'), ('rock', 'ɹ ɑ k', 0, 'cont'), ('rat', 'ɹ æ t', 0, 'cont')],
}

VOWELS = {'ɑ', 'æ', 'ə', 'aʊ', 'aɪ', 'ɛ', 'ɝ', 'eɪ', 'ɪ', 'i', 'oʊ', 'ɔɪ', 'ʊ', 'u'}
# 元音类：识别结果只保留元音（以及 ɹ / j）后应等于下列之一（TIMIT 把 ʌ 并入 ə，ɔ 并入 ɑ）
VOWEL_OK = {
    'a_s': ['æ'], 'e_s': ['ɛ'], 'i_s': ['ɪ'], 'o_s': ['ɑ'], 'u_s': ['ə'], 'oo_s': ['ʊ'], 'schwa': ['ə'],
    'a_l': ['eɪ'], 'e_l': ['i'], 'i_l': ['aɪ'], 'o_l': ['oʊ'], 'u_l': ['j u'], 'oo_l': ['u'], 'aw': ['ɑ'],
    'oi': ['ɔɪ'], 'ow': ['aʊ'], 'ar': ['ɑ ɹ', 'ɑ ɝ'], 'or': ['ɑ ɹ', 'ɑ ɝ', 'oʊ ɹ', 'oʊ ɝ'], 'er': ['ɝ'],
    'air': ['ɛ ɹ', 'ɛ ɝ'], 'ear': ['ɪ ɹ', 'ɪ ɝ', 'i ɹ', 'i ɝ'],
}
STOPS = {'p': 'p', 'b': 'b', 't': 't', 'd': 'd', 'k': 'k', 'g': 'g', 'ch': 'ʧ', 'j': 'ʤ', 'h': 'h', 'w': 'w', 'y': 'j'}
# 可持续辅音：(TIMIT 记号, 拼读测试方向)
CONT = {'f': ('f', ['pre']), 'v': ('v', ['pre']), 's': ('s', ['pre']), 'z': ('z', ['pre']), 'sh': ('ʃ', ['pre']),
        'zh': ('ʃ', ['post']), 'th_v': ('ð', ['pre']), 'm': ('m', ['pre', 'post']), 'n': ('n', ['pre', 'post']),
        'l': ('l', ['pre', 'post']), 'r': ('ɹ', ['pre', 'post'])}
FRICATIVES = {'f', 'v', 's', 'z', 'sh', 'zh', 'th_v'}
TARGET_DUR = {'vowel': 0.42, 'hvowel': 0.42, 'cont': 0.40, 'fric': 0.40, 'onset': 0.40}
VARIANTS = [(p, g) for p in (0.15, 0.3, 0.5) for g in (0.5, 0.9)]
PASS = 5

TMP = tempfile.mkdtemp(prefix='phx-')
_models = {}
_ref = {}


# ---------------------------------------------------------------- 基础
def run(cmd):
    return subprocess.run(cmd, capture_output=True, check=True)


def load(path):
    out = run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']).stdout
    return np.frombuffer(out, np.float32).copy()


def load_trimmed(path):
    x = load(path)
    nz = np.abs(x) > 1e-4
    return x[:len(x) - nz[::-1].argmax()] if nz.any() else x


def peak_db(path):
    st = subprocess.run(['ffmpeg', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(st.split('max_volume:')[1].split('dB')[0]) if 'max_volume:' in st else 0.0


def tts(word, rate=RATE):
    aiff = os.path.join(TMP, f'{word}-{rate}.aiff')
    if not os.path.exists(aiff):
        run(['say', '-v', VOICE, '-r', str(rate), '-o', aiff, '--', word])
    return aiff


def get_model(name):
    if name not in _models:
        _models[name] = (AutoProcessor.from_pretrained(name), AutoModelForCTC.from_pretrained(name).eval())
    return _models[name]


def logprobs(x, name=MODEL, pad=0.3, gain=0.9):
    proc, model = get_model(name)
    x = x / (np.abs(x).max() + 1e-9) * gain
    z = np.zeros(int(pad * SR), np.float32)
    inp = proc(np.concatenate([z, x, z]), sampling_rate=SR, return_tensors='pt')
    with torch.no_grad():
        return torch.log_softmax(model(inp.input_values).logits[0], -1).numpy(), int(pad / FRAME)


def recognize(x, name=MODEL, pad=0.3, gain=0.9):
    proc, _ = get_model(name)
    lp, _ = logprobs(x, name, pad, gain)
    if name != MODEL:
        return proc.batch_decode(torch.tensor(lp.argmax(-1))[None])[0].strip()
    out, prev, blank = [], None, proc.tokenizer.pad_token_id
    for i in lp.argmax(-1):
        if i != prev and i != blank:
            out.append(proc.tokenizer.convert_ids_to_tokens(int(i)))
        prev = i
    return ' '.join(t for t in out if t not in ('|', ' ', '<s>', '</s>'))


_VCH = re.compile(r'[aeiouyɑæɐəɛɜɪʊʌɔɒœøɚɝɨʉɯɤ]')


def espeak_consonants(txt):
    return [t for t in txt.split() if not _VCH.search(t)]


def ref_vowel():
    if 'v' not in _ref:
        _ref['v'] = load_trimmed(os.path.join(OUT, 'o_s.mp3'))
    return _ref['v']


# ---------------------------------------------------------------- 定位
def force_align(lp, ids, blank):
    T, S = lp.shape[0], 2 * len(ids) + 1
    ext = [blank if s % 2 == 0 else ids[s // 2] for s in range(S)]
    dp = np.full((T, S), -np.inf); bp = np.zeros((T, S), int)
    dp[0, 0], dp[0, 1] = lp[0, ext[0]], lp[0, ext[1]]
    for t in range(1, T):
        for s in range(S):
            best, arg = dp[t - 1, s], s
            if s >= 1 and dp[t - 1, s - 1] > best: best, arg = dp[t - 1, s - 1], s - 1
            if s >= 2 and ext[s] != blank and ext[s] != ext[s - 2] and dp[t - 1, s - 2] > best: best, arg = dp[t - 1, s - 2], s - 2
            dp[t, s], bp[t, s] = best + lp[t, ext[s]], arg
    s = S - 1 if dp[T - 1, S - 1] >= dp[T - 1, S - 2] else S - 2
    path = []
    for t in range(T - 1, -1, -1):
        path.append(s); s = bp[t, s]
    spans = {}
    for t, s in enumerate(reversed(path)):
        if s % 2:
            spans.setdefault(s // 2, [t, t])[1] = t
    return [spans[k] for k in range(len(ids))]


def frame_feats(x, fl=0.01):
    n = int(fl * SR)
    return [(np.sqrt((x[i:i + n] ** 2).mean()), (np.abs(np.diff(np.sign(x[i:i + n]))) > 0).mean())
            for i in range(0, len(x) - n, n)]


def locate(word, toks, rate=RATE):
    """返回 (音频, 语音起止, 每个音素的区间[按后验交叉点划分])"""
    proc, _ = get_model(MODEL)
    vocab, blank = proc.tokenizer.get_vocab(), proc.tokenizer.pad_token_id
    x = load(tts(word, rate))
    lp, off = logprobs(x)
    ids = [vocab[t] for t in toks]
    spans = force_align(lp, ids, blank)
    env = np.convolve(np.abs(x), np.ones(160) / 160, 'same')
    idx = np.where(env > 0.02 * env.max())[0]
    on, end = idx[0] / SR, idx[-1] / SR
    fr = lambda f: (f - off) * FRAME

    def cross(k):  # 从"更像音素 k"变为"更像音素 k+1"的第一帧
        a, b = spans[k][1], spans[k + 1][0]
        for t in range(a, b + 1):
            if lp[t, ids[k]] < lp[t, ids[k + 1]]:
                return fr(t)
        return (fr(a) + fr(b)) / 2 + FRAME / 2
    def mid(k):
        return (fr(spans[k][1]) + fr(spans[k + 1][0])) / 2 + FRAME / 2
    bounds = []
    for k in range(len(spans)):
        a = on if k == 0 else cross(k - 1)
        b = end if k == len(spans) - 1 else cross(k)
        if b - a < 0.08:
            a = on if k == 0 else min(a, mid(k - 1))
            b = end if k == len(spans) - 1 else max(b, mid(k))
        bounds.append((a, b))
    return x, (on, end), bounds


def candidates(word, toks, idx, mode, rate=RATE):
    toks = toks.split()
    x, (on, end), bounds = locate(word, toks, rate)
    s0, e0 = bounds[idx]
    steps = [i * 0.02 for i in range(8)]
    out = []
    if mode in ('vowel', 'cont'):  # 只允许在区间内往里缩
        out = [(s0 + a, e0 - b) for a in steps for b in steps]
    elif mode == 'onset':
        out = [(on + a, on + L) for L in (0.04, 0.05, 0.06, 0.07, 0.08, 0.10, 0.12) for a in (0.0, 0.01)]
    elif mode == 'hvowel':  # 跳过弱起始音（h 的气流）：从能量升到 30% 处开始
        env = np.convolve(np.abs(x), np.ones(320) / 320, 'same')
        st = max(s0, np.argmax(env > 0.3 * env.max()) / SR)
        if st >= e0 - 0.05:  # 能量起点落在区间外时退回区间起点
            st = s0
        out = [(st + a, e0 - b) for a in (0, 0.01, 0.02, 0.04) for b in steps]
    elif mode == 'whole':
        out = [(on, end)]
    elif mode == 'tail':
        out = [(s0 + a, end) for a in steps]
    elif mode == 'htail':
        env = np.convolve(np.abs(x), np.ones(320) / 320, 'same')
        st = max(s0, np.argmax(env > 0.3 * env.max()) / SR)
        out = [(st + a, end) for a in (0, 0.01, 0.03, 0.05, 0.07, 0.09)]
    elif mode == 'stop':
        nxt = bounds[idx + 1][1]
        out = [(max(0, s0 + a), min(e0 + k, nxt)) for k in (0.0, 0.02, 0.03, 0.05, 0.07) for a in (-0.02, 0, 0.02)]
    elif mode == 'fric':  # 区间内找擦音段：清音过零率高；浊音能量明显低于元音
        f = frame_feats(x)
        ref = max(r for r, _ in f)
        voiced = toks[idx] in ('v', 'ð', 'z')
        good = [(0.003 * ref < r < 0.5 * ref) if voiced else (z > 0.2 and r > 0.002 * ref) for r, z in f]
        lo, hi = int(s0 / 0.01), min(len(good), int(e0 / 0.01) + 1)
        runs, cur = [], None
        for i in range(lo, hi):
            if good[i]: cur = [i, i] if cur is None else [cur[0], i]
            elif cur: runs.append(cur); cur = None
        if cur: runs.append(cur)
        if runs:
            a, b = max(runs, key=lambda r: r[1] - r[0])
            out = [(a * 0.01 + da, (b + 1) * 0.01 - db) for da in (0, 0.01, 0.02) for db in (0, 0.01, 0.02)]
    elif mode == 'fricstop':  # θ：词首擦音段（很弱，从头找）+ keep 秒元音过渡
        f = frame_feats(x)
        ref = max(r for r, _ in f)
        i = 0
        while i < len(f) and not (f[i][1] > 0.15 and f[i][0] > 0.002 * ref): i += 1
        a = i
        while i < len(f) and f[i][1] > 0.15: i += 1
        out = [(a * 0.01, i * 0.01 + db, keep) for keep in (0.05, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16) for db in (0, 0.01)]
    elif mode == 'rstop':  # ŋ：极短的前接元音过渡 + 鼻音，到词尾
        prev = bounds[idx - 1][0]
        out = [(max(prev, s0 - k), end) for k in (0.03, 0.05, 0.06, 0.07, 0.08, 0.10)]
    return x, [c for c in out if c[1] - c[0] >= 0.04]


# ---------------------------------------------------------------- 渲染
def render(word, cand, mode, dest, rate=RATE):
    src = tts(word, rate)
    s, e = cand[0], cand[1]
    wav = os.path.join(TMP, 'r.wav')
    if mode == 'fricstop':
        # 擦音段拉长到 ~0.3s 并单独提音量（TTS 的 θ 比元音弱约 40dB），再接原速的元音过渡
        keep = cand[2]
        fw, vw = os.path.join(TMP, 'f.wav'), os.path.join(TMP, 'v.wav')
        ratio = max(min((e - s) / 0.30, 1.0), 0.5)
        run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', f'atrim={s:.4f}:{e:.4f},asetpts=PTS-STARTPTS,atempo={ratio:.3f},afade=t=in:d=0.02', '-ac', '1', '-ar', '24000', fw])
        run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', f'atrim={e:.4f}:{e + keep:.4f},asetpts=PTS-STARTPTS', '-ac', '1', '-ar', '24000', vw])
        gf, gv = -9 - peak_db(fw), -6 - peak_db(vw)
        run(['ffmpeg', '-y', '-v', 'error', '-i', fw, '-i', vw, '-filter_complex',
             f'[0:a]volume={gf:.1f}dB[f];[1:a]volume={gv:.1f}dB[v];[f][v]concat=n=2:v=0:a=1,areverse,afade=t=in:d=0.04,areverse[o]',
             '-map', '[o]', wav])
        gain = 0.0
    else:
        dur = e - s
        flt = [f'atrim={s:.4f}:{e:.4f}', 'asetpts=PTS-STARTPTS']
        target = TARGET_DUR.get(mode) or (0.38 if mode == 'rstop' else None)
        if target and dur < target:
            r = max(dur / target, 0.5)
            flt.append(f'atempo={r:.3f}'); dur /= r
        fo = 0.06 if mode == 'stop' else 0.05
        flt += ['afade=t=in:d=0.012', f'afade=t=out:st={max(0, dur - fo):.3f}:d={fo}']
        run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', ','.join(flt), '-ac', '1', '-ar', '24000', wav])
        gain = -2 - peak_db(wav)
    run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-af', f'volume={gain:.1f}dB,apad=pad_dur=0.05',
         '-codec:a', 'libmp3lame', '-b:a', '64k', dest])


# ---------------------------------------------------------------- 校验
def vowel_like(x, ref_rms):
    return sum(1 for r, z in frame_feats(x, 0.02) if r > 0.35 * ref_rms and z < 0.12)


def check_once(sid, x, pad, gain):
    """单次校验，返回 (是否通过, 说明)"""
    if sid in VOWEL_OK:
        got = recognize(x, pad=pad, gain=gain)
        core = ' '.join(t for t in got.split() if t in VOWELS or t in ('ɹ', 'j'))
        return core in VOWEL_OK[sid], got
    if sid in STOPS:
        # 爆破音的部位、清浊主要靠后接元音的过渡辨认：接上 /ɑ/ 后，
        # 识别出的辅音必须只有目标辅音（其后的弱元音不计）
        test = np.concatenate([x, np.zeros(int(0.01 * SR), np.float32), ref_vowel()])
        got = recognize(test, pad=pad, gain=gain)
        cons = [t for t in got.split() if t not in VOWELS]
        return cons == [STOPS[sid]] and got.split()[0] == STOPS[sid], f'前接 {got}'
    if sid == 'th':
        got = recognize(x, pad=pad, gain=gain)
        return got in ('θ', 'θ ə', 'θ ɪ'), got
    if sid == 'ng':
        got = recognize(x, pad=pad, gain=gain)
        return [t for t in got.split() if t not in VOWELS] == ['ŋ'], got
    c, sides = CONT[sid]
    gap, v = np.zeros(int(0.01 * SR), np.float32), ref_vowel()
    notes = []
    for side in sides:
        test = np.concatenate([x, gap, v]) if side == 'pre' else np.concatenate([v, gap, x])
        if sid == 'th_v':  # ð 由 espeak 模型判定
            got = recognize(test, JUDGE2, pad, gain)
            ok = espeak_consonants(got) == ['ð'] and (side != 'pre' or len(got.split()) == 2)
        else:
            got = recognize(test, pad=pad, gain=gain)
            want = [f'{c} ɑ'] if side == 'pre' else [f'ɑ {c}'] + (['ɑ ɝ'] if c == 'ɹ' else [])
            g = got.split()
            if side == 'post' and len(g) == 3 and g[0] not in VOWELS:  # 参考元音前幻听出的起始辅音
                g = g[1:]
            ok = ' '.join(g) in want
        notes.append(f'{"前" if side == "pre" else "后"}接 {got}')
        if not ok:
            return False, '；'.join(notes)
    return True, '；'.join(notes)


def check(sid, x):
    """在 6 种识别条件下校验，返回 (通过次数, 代表性说明)"""
    n, note = 0, ''
    for pad, gain in VARIANTS:
        ok, got = check_once(sid, x, pad, gain)
        n += ok
        if ok and not note:
            note = got
    return n, note or got


def final_check(sid, path):
    n, note = check(sid, load_trimmed(path))
    return n >= PASS, f'{note}  [{n}/{len(VARIANTS)}]'


# ---------------------------------------------------------------- 主流程
def extract(sid):
    fallback = None  # 未达标时得分最高的候选
    for spec in SPEC[sid]:
        word, toks, idx, mode = spec[:4]
        rate = spec[4] if len(spec) > 4 else RATE
        x, cands = candidates(word, toks, idx, mode, rate)
        ref_rms = max(r for r, _ in frame_feats(x, 0.02))
        scored = []
        for cand in cands:
            raw = x[int(cand[0] * SR):int(cand[1] * SR)]
            if sid in FRICATIVES and vowel_like(raw, ref_rms):
                continue  # 擦音片段里混进了元音
            tmp = os.path.join(TMP, 'c.mp3')
            render(word, cand, mode, tmp, rate)
            clip = load_trimmed(tmp)
            ok, _ = check_once(sid, clip, 0.3, 0.9)  # 先快速筛一遍
            if not ok:
                continue
            n, note = check(sid, clip)
            if fallback is None or n > fallback[0]:
                fallback = (n, word, cand, mode, rate, note)
            if n >= PASS:
                length = cand[1] - cand[0]
                pref = -cand[2] if mode == 'fricstop' else (-length if mode in ('stop', 'rstop') else length)
                scored.append((n, pref, cand, note))
        for n, pref, cand, note in sorted(scored, key=lambda t: (-t[0], -t[1])):
            dest = os.path.join(TMP, f'{sid}.mp3')
            render(word, cand, mode, dest, rate)
            ok, fnote = final_check(sid, dest)
            if ok:
                os.replace(dest, os.path.join(OUT, f'{sid}.mp3'))
                return {'ok': True, 'source': word, 'rate': rate, 'mode': mode, 'window': [round(v, 3) for v in cand], 'check': fnote}
    # 没有候选达到 5/6：与现有文件比较，只在更好时替换
    cur = os.path.join(OUT, f'{sid}.mp3')
    cur_n = check(sid, load_trimmed(cur))[0] if os.path.exists(cur) else -1
    if fallback and fallback[0] > cur_n:
        n, word, cand, mode, rate, note = fallback
        render(word, cand, mode, cur, rate)
        return {'ok': False, 'score': f'{n}/{len(VARIANTS)}', 'source': word, 'rate': rate, 'mode': mode,
                'window': [round(v, 3) for v in cand], 'check': note, 'replaced': True}
    return {'ok': False, 'score': f'{cur_n}/{len(VARIANTS)}', 'replaced': False}


def main(only):
    os.makedirs(OUT, exist_ok=True)
    rp = os.path.join(OUT, 'report.json')
    report = json.load(open(rp)) if os.path.exists(rp) else {}
    order = ['o_s'] + [k for k in SPEC if k != 'o_s']  # 先做参考元音 /ɑ/
    for sid in order:
        if only and sid not in only:
            continue
        r = extract(sid)
        report[sid] = r
        if r['ok']:
            msg = f'from "{r["source"]}"  {r["check"]}'
        else:
            msg = f'未达到 5/6（最好 {r["score"]}）' + (f'，已换成得分更高的 "{r["source"]}" 版本' if r.get('replaced') else '，保留现有文件')
        print(('✓' if r['ok'] else '✗'), f'{sid:6s}', msg, flush=True)
        json.dump(report, open(rp, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
