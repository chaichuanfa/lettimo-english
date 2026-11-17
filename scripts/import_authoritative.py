"""把权威词典的美式音素录音（audio-src/authoritative/，不入库）整理成网站用的音素文件 audio/p/<id>.mp3。

来源：Cambridge Dictionary 美式音标页的单音素录音（40 个）；Cambridge 没有的 ar or air ear u_l
用牛津 / 朗文里本身只由这几个音组成的单词（are oar air ear ewe）。

处理原则：只截取、不拉长、不合成。
  * 元音和补充的 5 个词：去掉前后静音，从声带开始振动处开始（不带气声起音）。
  * Cambridge 的辅音录音都读成"辅音 + ə"（puh、muh……），自然拼读要去掉这个 ə：
    - 清辅音 p t k f θ s ʃ tʃ h：截到后面元音开始振动为止（送气 / 摩擦整段保留）；
    - 浊辅音 b d g dʒ v ð z ʒ m n l r w j：截到进入 ə 的地方（F1 升过 430Hz、且不再是摩擦噪声）；
    - ŋ 本身就是一段纯鼻音，只去掉尾部的除阻。
  * 音量：截出来后按平均强度统一到 78dB（f θ h 本来就弱，74dB），与网站其他音素一致；峰值不超过 -1dBFS。

用法：python scripts/import_authoritative.py [音素id ...]
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import parselmouth

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'audio-src', 'authoritative')
OUT = os.path.join(ROOT, 'audio', 'p')
TMP = tempfile.mkdtemp(prefix='auth-')

VOWELS = ['a_s', 'e_s', 'i_s', 'o_s', 'u_s', 'oo_s', 'schwa', 'e_l', 'oo_l', 'aw', 'er', 'a_l', 'i_l', 'o_l', 'oi', 'ow']
WORDS = {'ar': 'ar__longman', 'or': 'or__oxford', 'air': 'air__longman', 'ear': 'ear__longman', 'u_l': 'u_l__longman'}
VOICELESS = ['p', 't', 'k', 'f', 'th', 's', 'sh', 'ch', 'h']
STOPS_VOICED = {'b', 'd', 'g', 'j'}
VOICED = ['b', 'd', 'g', 'j', 'v', 'th_v', 'z', 'zh', 'm', 'n', 'l', 'r', 'w', 'y']
SOURCE = {**{k: ('Cambridge Dictionary（美式音标页）', k) for k in VOWELS + VOICELESS + VOICED + ['ng']},
          'ar': ('Longman（are 的重读形式）', WORDS['ar']), 'or': ('Oxford Learner\'s（oar）', WORDS['or']),
          'air': ('Longman（air）', WORDS['air']), 'ear': ('Longman（ear）', WORDS['ear']), 'u_l': ('Longman（ewe）', WORDS['u_l'])}


def load(name):
    wav = os.path.join(TMP, name + '.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', os.path.join(SRC, name + '.mp3'), '-ac', '1', '-ar', '24000', wav], check=True)
    s = parselmouth.Sound(wav)
    s.scale_peak(10 ** (-2 / 20))      # 整段峰值 -2dBFS
    return s


def frames(s, step=0.005):
    x, sr = s.values[0], s.sampling_frequency
    it = s.to_intensity(100, 0.005)
    p = s.to_pitch(0.005)
    f = s.to_formant_burg(0.005, 5, 4500)
    out = []
    for t in np.arange(s.xmin + 0.015, s.xmax - 0.015, step):
        seg = x[int((t - 0.0125) * sr):int((t + 0.0125) * sr)]
        sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
        fr = np.fft.rfftfreq(len(seg), 1 / sr)
        f0 = p.get_value_at_time(t)
        db = it.get_value(t)
        out.append({'t': float(t), 'db': db if db == db else 0.0, 'voiced': f0 == f0 and f0 > 0,
                    'hf': 10 * np.log10(sp[fr > 3000].sum() / (sp.sum() + 1e-20) + 1e-12), 'f1': f.get_value_at_time(1, t)})
    return out


def span(fr, below=35):
    peak = max(r['db'] for r in fr)
    on = [r['t'] for r in fr if r['db'] > peak - below]
    return on[0], on[-1]


def first(fr, t0, cond, run=3):
    """t0 之后第一个连续 run 帧都满足 cond 的帧的时刻"""
    for i, r in enumerate(fr):
        if r['t'] > t0 and i + run <= len(fr) and all(cond(q) for q in fr[i:i + run]):
            return r['t']
    return None


def cut(sid):
    if sid in VOWELS or sid in WORDS:
        s = load(WORDS.get(sid, sid))
        fr = frames(s)
        a, b = span(fr)
        peak = max(r['db'] for r in fr)
        a = first(fr, a - 0.01, lambda r: r['voiced'] and r['db'] > peak - 25) or a   # 从声带振动开始
        return s, a, b + 0.01, 0.004, 0.03, 'vowel'
    s = load(sid)
    fr = frames(s)
    a, b = span(fr)
    a -= 0.01
    if sid == 'ng':   # 纯鼻音段：F1 低于 400 的连续浊音段
        e = first(fr, a + 0.05, lambda r: not (r['voiced'] and r['f1'] == r['f1'] and r['f1'] < 400), run=2)
        return s, a, e or b, 0.005, 0.03, 'ng'
    if sid in VOICELESS:   # 截到后面元音开始振动为止
        e = first(fr, a + 0.02, lambda r: r['voiced'] and r['db'] > max(q['db'] for q in fr) - 15, run=4)
        return s, a, e, 0.003, 0.012, 'voiceless'
    # 浊辅音：进入 ə 的地方 = F1 升过 430Hz 且不再是摩擦噪声（高频占比低）
    e = first(fr, a + 0.02, lambda r: r['voiced'] and r['f1'] == r['f1'] and r['f1'] > 430 and r['hf'] < -12, run=3)
    if sid in STOPS_VOICED:
        # 浊塞音前面有 80–90ms 的"浊音杠"（双唇/舌头还闭着、声带先振动），单独听像 m/n，
        # 只留爆破前 15ms；爆破 = 高频占比在 10ms 内跳升 10dB 以上
        burst = next((fr[i]['t'] for i in range(2, len(fr)) if fr[i]['t'] > a + 0.02
                      and fr[i]['hf'] - fr[i - 2]['hf'] > 10 and fr[i]['hf'] > -40), None)
        if burst:
            a = burst - 0.015
            if sid != 'j':
                e = max(e or 0, burst + 0.03)
    return s, a, e, 0.003, 0.015, 'voiced'


TARGET_DB = {'th': 74, 'h': 74, 'f': 74}


def render(s, a, b, fi, fo, dest, sid=''):
    seg = s.extract_part(max(s.xmin, a), min(s.xmax, b), parselmouth.WindowShape.RECTANGULAR, 1, False)
    tmp = os.path.join(TMP, 'seg.wav')
    seg.save(tmp, 'WAV')
    dur = seg.xmax - seg.xmin
    # 响度与网站其他音素一致（同 refine_phonemes：平均强度 78dB，弱擦音 / 送气 74dB），峰值不超过 -1dBFS
    gain = TARGET_DB.get(sid, 78) - seg.get_intensity()
    peak = 20 * np.log10(np.abs(seg.values).max() + 1e-12)
    gain = min(gain, -1 - peak)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af',
                    f'volume={gain:.1f}dB,afade=t=in:d={fi},afade=t=out:st={max(0, dur - fo):.3f}:d={fo},apad=pad_dur=0.05',
                    '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '64k', dest], check=True)
    return dur


WANT = {'p': 'p', 't': 't', 'k': 'k', 'f': 'f', 'th': 'θ', 's': 's', 'sh': 'ʃ', 'ch': 'ʧ', 'h': 'h', 'b': 'b', 'd': 'd',
        'g': 'g', 'j': 'ʤ', 'v': 'v', 'th_v': 'ð', 'z': 'z', 'zh': 'ʃ', 'm': 'm', 'n': 'n', 'l': 'l', 'r': 'ɹ', 'w': 'w',
        'y': 'j', 'ng': 'ŋ'}     # 识别模型没有 ʒ，ʒ 按 ʃ 计（同 sustain_phonemes）


def cv_test(sid, path):
    """辨认测试：辅音后接同一位发音人的 /ɑ/（Cambridge father 的元音），6 种识别条件下识别出目标辅音的次数"""
    import extract_phonemes as E
    x = E.load_trimmed(path)
    v = E.load_trimmed(os.path.join(OUT, 'o_s.mp3'))
    gap = np.zeros(int(0.01 * E.SR), np.float32)
    test = np.concatenate([v, gap, x]) if sid in ('ng', 'zh') else np.concatenate([x, gap, v])
    return sum(WANT[sid] in E.recognize(test, E.MODEL, p, g).split() for p, g in E.VARIANTS)


# 这几个音主要靠滑向元音的过渡辨认（截在过渡起点时识别模型听成 u / m / n / z），
# 截止点依次往后挪 10–40ms（ð 最多 60ms，与原先 Samantha 版相同），取第一个能稳定辨认（≥4/6）的；过渡很短，不构成音节
TRANSITION = {'l', 'w', 'th_v', 'r', 'y', 'm', 'n', 'v', 'z', 'b', 'd', 'g'}


def main(only):
    report_path = os.path.join(OUT, 'authoritative-report.json')
    report = json.load(open(report_path)) if os.path.exists(report_path) else {}
    for sid in VOWELS + list(WORDS) + VOICELESS + VOICED + ['ng']:
        if only and sid not in only:
            continue
        s, a, b, fi, fo, kind = cut(sid)
        if b is None or b - a < 0.02:
            print(f'✗ {sid}: 找不到分界点', flush=True)
            continue
        dest = os.path.join(OUT, sid + '.mp3')
        dur = render(s, a, b, fi, fo, dest, sid)
        n, ext = (cv_test(sid, dest), 0.0) if sid in WANT else (None, 0.0)
        if sid in TRANSITION and n < 4:
            for d in (0.01, 0.02, 0.03, 0.04) + ((0.05, 0.06) if sid == 'th_v' else ()):
                dur = render(s, a, b + d, fi, fo, dest, sid)
                n, ext = cv_test(sid, dest), d
                if n >= 4:
                    break
            else:
                ext = 0.0
                dur = render(s, a, b, fi, fo, dest, sid)
                n = cv_test(sid, dest)
        src, f = SOURCE[sid]
        report[sid] = {'source': src, 'file': f + '.mp3', 'kind': kind, 'window': [round(a, 3), round(b + ext, 3)],
                       'dur': round(dur, 3), 'trans_added': ext, 'cv_test': n}
        print(f'✓ {sid:6s} {kind:9s} {src}  截取 {a:.3f}–{b + ext:.3f}s（{dur * 1000:.0f}ms）'
              + (f'  辨认 {n}/6' if n is not None else '') + (f'  加过渡 {ext * 1000:.0f}ms' if ext else ''), flush=True)
    json.dump(report, open(report_path, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
