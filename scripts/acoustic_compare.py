"""声学距离判读：神经网络合成声音（Ava）改一个词，整句的韵律也会跟着微调，所以"对照合成"常常不会逐字节相同。
这时把实际合成的文字与各读法的替换写法分别合成，算 MFCC 动态时间规整（DTW）距离，原句明显更接近哪种写法（距离比 ≤0.7），
就判为读成了哪种。校准：与原句逐字节相同的写法距离为 0；"I used to walk" 与 "yoost" 0.0、与 "yoozd" 1.17。
"""
import hashlib
import os
import subprocess
import tempfile

import numpy as np
import parselmouth

import extract_phonemes as E

RATIO = 0.7
_cache = {}


def mfcc(text, rate):
    key = (text, rate)
    if key not in _cache:
        p = os.path.join(tempfile.gettempdir(), 'ac-' + hashlib.md5(f'{E.WORD_VOICE}|{rate}|{text}'.encode()).hexdigest())
        if not os.path.exists(p + '.wav'):
            E.say(text, rate, p + '.aiff')
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', p + '.aiff', '-ac', '1', '-ar', '16000', p + '.wav'], check=True)
        m = parselmouth.Sound(p + '.wav').to_mfcc(12, 0.015, 0.005).to_array()[1:].T
        _cache[key] = (m - m.mean(0)) / (m.std(0) + 1e-9)
    return _cache[key]


def dtw(a, b):
    n, m = len(a), len(b)
    C = np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(-1))
    D = np.full((n + 1, m + 1), np.inf)
    D[0, 0] = 0
    for i in range(1, n + 1):
        row, prev = D[i], D[i - 1]
        for j in range(1, m + 1):
            row[j] = C[i - 1, j - 1] + min(prev[j], row[j - 1], prev[j - 1])
    return D[n, m] / (n + m)


def pick(spoken, alts, rate):
    """alts: {读法: 替换写法后的整段文字}。返回 (读法 或 None, {读法: 距离})"""
    o = mfcc(spoken, rate)
    d = {name: round(float(dtw(o, mfcc(t, rate))), 3) for name, t in alts.items()}
    best = min(d, key=d.get)
    other = min(v for k, v in d.items() if k != best)
    return (best if other > 0 and d[best] / other <= RATIO else None), d


def local_feats(wav_or_x, toks, span):
    """目标词每个音的局部特征：起止段 F1、F2（取对数）、浊音比例、时长。对齐用识别模型的强制对齐。"""
    import verify_words as W
    x = E.load(wav_or_x) if isinstance(wav_or_x, str) else wav_or_x
    bd = W.bounds_of(x, toks)
    snd = parselmouth.Sound(x, E.SR)
    fm, pt = snd.to_formant_burg(0.005, 5, 5500), snd.to_pitch(0.005)
    out = []
    for k in range(*span):
        t0, t1 = bd[k]
        ts = np.linspace(t0 + 0.2 * (t1 - t0), t1 - 0.2 * (t1 - t0), 9)
        f1 = np.array([fm.get_value_at_time(1, t) for t in ts])
        f2 = np.array([fm.get_value_at_time(2, t) for t in ts])
        vo = np.mean([pt.get_value_at_time(t) == pt.get_value_at_time(t) for t in ts])
        lg = lambda v: np.log(np.nanmean(v)) if np.isfinite(v).any() else 0.0
        out += [lg(f1[:3]), lg(f1[-3:]), lg(f2[:3]), lg(f2[-3:]), vo, np.log(max(t1 - t0, 0.01))]
    return np.array(out)


def local_pick(spoken, alts, toks, span, rate=165):
    """alts: {读法: 替换写法后的整段文字}；toks/span：录音（按"应读"音素序列）对齐用的识别记号与目标词的下标区间。
    比较目标词局部特征与各写法合成里同一位置的特征，明显更近（比值 ≤0.7）才判定。"""
    def wav(text):
        mfcc(text, rate)          # 借用缓存合成
        return os.path.join(tempfile.gettempdir(), 'ac-' + hashlib.md5(f'{E.WORD_VOICE}|{rate}|{text}'.encode()).hexdigest() + '.wav')
    o = local_feats(wav(spoken), toks, span)
    d = {name: float(np.linalg.norm(o - local_feats(wav(t), toks, span))) for name, t in alts.items()}
    best = min(d, key=d.get)
    other = min(v for k, v in d.items() if k != best)
    return (best if other > 0 and d[best] / other <= RATIO else None), {k: round(v, 2) for k, v in d.items()}
