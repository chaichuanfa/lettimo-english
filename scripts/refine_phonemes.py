"""重新截取声学核查（scripts/acoustic_check.py 思路）发现问题的音素录音：
- /θ/ 原录音后半段是响亮的元音（听起来像 "thuh"）
- /ʒ/ 取自词尾（beige），被读成了清音，声学上等于 /ʃ/；/z/ 后半段清化成 /s/
- /l/ /ŋ/ /h/ /v/ /r/ /ð/ 带了一段元音

做法：从最合适的位置取音（浊擦音取元音之间、/θ/ 取词尾、/l/ /r/ 取词首、/ŋ/ 取词尾），先用强制对齐找到大致区间，
再用逐帧声学特征（浊音、F1、频带能量）把边界切到纯辅音段，统一响度后按客观标准验收：
清音不能有浊音帧，浊音必须基本全程浊音，不能含元音帧（F1 过高），时长足够。

用法（与 extract_phonemes.py 同一个虚拟环境，需要 praat-parselmouth）：
  python scripts/refine_phonemes.py            # 处理全部
  python scripts/refine_phonemes.py th zh      # 只处理指定音素
"""
import json
import os
import sys

import numpy as np
import parselmouth
from parselmouth.praat import call

sys.path.insert(0, os.path.dirname(__file__))
import extract_phonemes as E  # noqa: E402

ENC = ['-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k']

# 音素 → 候选 [(单词, 对齐用音素序列(TIMIT 记号), 目标下标, 语速)]
SPEC = {
    'th':   [('thumb', 'θ ə m', 0, 100), ('thin', 'θ ɪ n', 0, 100), ('thud', 'θ ə d', 0, 100), ('bath', 'b æ θ', 2, 110), ('teeth', 't i θ', 2, 110)],
    'th_v': [('other', 'ə ð ɝ', 1, 100), ('mother', 'm ə ð ɝ', 2, 100), ('father', 'f ɑ ð ɝ', 2, 100), ('either', 'i ð ɝ', 1, 100)],
    'z':    [('easy', 'i z i', 1, 110), ('lazy', 'l eɪ z i', 2, 110), ('busy', 'b ɪ z i', 2, 110), ('dizzy', 'd ɪ z i', 2, 110)],
    'zh':   [('measure', 'm ɛ ʃ ɝ', 2, 100), ('treasure', 't ɹ ɛ ʃ ɝ', 3, 100), ('pleasure', 'p l ɛ ʃ ɝ', 3, 100), ('vision', 'v ɪ ʃ ə n', 2, 100)],
    'v':    [('over', 'oʊ v ɝ', 1, 110), ('ever', 'ɛ v ɝ', 1, 110), ('river', 'ɹ ɪ v ɝ', 2, 110), ('seven', 's ɛ v ə n', 2, 110)],
    'l':    [('law', 'l ɑ', 0, 90), ('lip', 'l ɪ p', 0, 90), ('leaf', 'l i f', 0, 90), ('lot', 'l ɑ t', 0, 90)],
    'r':    [('red', 'ɹ ɛ d', 0, 90), ('rock', 'ɹ ɑ k', 0, 90), ('run', 'ɹ ə n', 0, 90), ('raw', 'ɹ ɑ', 0, 90)],
    'ng':   [('sing', 's ɪ ŋ', 2, 100), ('long', 'l ɑ ŋ', 2, 100), ('ring', 'ɹ ɪ ŋ', 2, 100), ('song', 's ɑ ŋ', 2, 100)],
    'h':    [('hat', 'h æ t', 0, 100), ('hot', 'h ɑ t', 0, 100), ('he', 'h i', 0, 100), ('hut', 'h ə t', 0, 100)],
}
KIND = {'th': 'vl_fric', 'th_v': 'vd_fric', 'z': 'vd_fric', 'zh': 'vd_fric', 'v': 'vd_fric',
        'l': 'sonorant', 'r': 'sonorant', 'ng': 'sonorant', 'h': 'aspiration'}
MIN_DUR = {'vl_fric': 0.12, 'vd_fric': 0.10, 'sonorant': 0.10, 'aspiration': 0.07}
# 过渡段：只保留辅音与元音之间很短的一段过渡（帮助辨认发音部位），不能长到构成一个音节
TRANSITIONS = (0.0, 0.02, 0.04, 0.06)
TARGET_DB = {'th': 74, 'h': 74}       # 弱摩擦 / 送气本来就比 /s/ 弱，略低于其他音素
DEFAULT_DB = 78


def frames(snd, a, b, step=0.01):
    """逐帧特征：时间、强度、浊音(是否有基频)、低频(0–400Hz)能量占比、F1"""
    pitch = snd.to_pitch(time_step=step, pitch_floor=75, pitch_ceiling=500)
    inten = snd.to_intensity(time_step=step)
    fm = snd.to_formant_burg(time_step=step, max_number_of_formants=5, maximum_formant=5500)
    out = []
    for t in np.arange(max(a, snd.xmin + 0.015), min(b, snd.xmax - 0.015), step):
        part = snd.extract_part(t - 0.012, t + 0.012)
        sp = part.to_spectrum()
        tot = call(sp, 'Get band energy', 0, 8000) + 1e-15
        lo = call(sp, 'Get band energy', 0, 400) / tot
        f0 = pitch.get_value_at_time(t)
        db = inten.get_value(t)
        f1 = fm.get_value_at_time(1, t)
        out.append({'t': t, 'db': db if db == db else 0, 'voiced': f0 == f0, 'lo': lo, 'f1': f1 if f1 == f1 else 9999})
    return out


def good(fr, kind):
    if kind == 'vl_fric':
        return not fr['voiced'] and fr['lo'] < 0.2
    if kind == 'vd_fric':
        return fr['lo'] >= 0.3 and fr['f1'] < 500          # 有浊音、声道收窄（非元音）
    if kind == 'sonorant':
        return fr['voiced'] and fr['f1'] < 420
    if kind == 'aspiration':
        return not fr['voiced']
    return False


def best_run(frs, kind, floor):
    """满足条件、且强度高于下限的最长连续帧"""
    best, cur = [], []
    for f in frs:
        if good(f, kind) and f['db'] > floor:
            cur.append(f)
            if len(cur) > len(best):
                best = cur[:]
        else:
            cur = []
    return best


def measure(path, kind):
    snd = parselmouth.Sound(path)
    frs = frames(snd, snd.xmin, snd.xmax)
    peak = max(f['db'] for f in frs)
    body = [f for f in frs if f['db'] > peak - 20]
    n = max(len(body), 1)
    return {
        'dur': round(snd.xmax, 3),
        'voiced': round(sum(f['voiced'] for f in body) / n, 2),
        'lo': round(float(np.mean([f['lo'] for f in body])), 2),
        'vowel_frames': sum(1 for f in body if f['f1'] > 600 and f['voiced']),
        # 浊音总时长（毫秒，含弱帧）：清音只允许过渡段里的浊音
        'voiced_ms': 10 * sum(1 for f in frs if f['voiced'] and f['db'] > peak - 40),
        'peak_db': round(peak, 1),
    }


def accept(m, kind):
    if kind == 'vl_fric':
        return m['voiced'] <= 0.1 and m['dur'] >= MIN_DUR[kind]
    if kind == 'vd_fric':
        return m['lo'] >= 0.45 and m['vowel_frames'] <= 1 and m['dur'] >= MIN_DUR[kind]
    if kind == 'sonorant':
        return m['voiced'] >= 0.8 and m['vowel_frames'] <= 1 and m['dur'] >= MIN_DUR[kind]
    if kind == 'aspiration':
        return m['voiced'] <= 0.35 and m['dur'] >= MIN_DUR[kind]
    return False


def render(src, a, b, dest, db_target, fade_in=0.015, fade_out=0.02):
    """截取 [a, b]；过渡段整段淡入/淡出，只保留提示发音部位的共振峰走向，不形成响亮的元音"""
    tmp = dest + '.wav'
    E.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af',
           f'atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={fade_in:.3f},areverse,afade=t=in:d={fade_out:.3f},areverse',
           '-ac', '1', '-ar', '24000', tmp])
    snd = parselmouth.Sound(tmp)
    gain = db_target - snd.get_intensity()
    E.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', f'volume={gain:.1f}dB,apad=pad_dur=0.06', *ENC, dest])
    os.remove(tmp)


def detect(sid, path):
    """辨认测试：在 6 种识别条件下，目标辅音是否被识别出来（接上参考元音 /ɑ/，与 extract_phonemes 的拼读测试同样的拼接方式）。
    只要求识别出目标辅音，不要求整段只有它——短辅音片段在识别模型里很容易多出幻听的音。"""
    x = E.load_trimmed(path)
    want = {'th': 'θ', 'th_v': 'ð', 'z': 'z', 'zh': 'ʃ', 'v': 'v', 'l': 'l', 'r': 'ɹ', 'ng': 'ŋ', 'h': 'h'}[sid]
    gap, v = np.zeros(int(0.01 * E.SR), np.float32), E.ref_vowel()
    n = 0
    for pad, gain in E.VARIANTS:
        if sid in ('th', 'ng'):
            test = x
        elif sid == 'zh':                                  # /ʒ/ 在词尾之外很少见，接在元音后面测
            test = np.concatenate([v, gap, x])
        else:
            test = np.concatenate([x, gap, v])
        if sid == 'th_v':
            got = E.recognize(test, E.JUDGE2, pad, gain).split()
        else:
            got = E.recognize(test, pad=pad, gain=gain).split()
        n += want in got
    return n


def refine(sid):
    kind = KIND[sid]
    tried, best = [], None
    for word, toks, idx, rate in SPEC[sid]:
        _, _, bounds = E.locate(word, toks.split(), rate)
        a, b = bounds[idx]
        aiff = E.tts(word, rate)
        wav = aiff[:-5] + '.wav'                          # Praat 读不了 macOS say 输出的压缩 AIFC
        if not os.path.exists(wav):
            E.run(['ffmpeg', '-y', '-v', 'error', '-i', aiff, wav])
        snd = parselmouth.Sound(wav)
        n_tok = len(toks.split())
        last = idx == n_tok - 1
        frs = frames(snd, a - 0.06, snd.xmax if last else b + 0.06)    # 词尾的音一直找到词尾（对齐边界常常偏早）
        if not frs:
            continue
        floor = max(f['db'] for f in frs) - (40 if kind == 'vl_fric' else 30)  # /θ/ 很弱，比元音低 30 多 dB
        run = best_run(frs, kind, floor)
        if len(run) < 3:
            tried.append((word, 'no run'))
            continue
        ca, cb = run[0]['t'] - 0.01, run[-1]['t'] + 0.01
        side = 'pre' if last else 'post'                  # 过渡加在与元音相接的一侧
        for tr in TRANSITIONS:
            a2, b2 = (ca - tr, cb) if side == 'pre' else (ca, cb + tr)
            a2, b2 = max(a2, 0.0), min(b2, snd.xmax)
            dest = os.path.join(E.OUT, f'{sid}.cand.mp3')
            fi, fo = (max(0.015, tr), 0.02) if side == 'pre' else (0.015, max(0.02, tr))
            render(wav, a2, b2, dest, TARGET_DB.get(sid, DEFAULT_DB), fi, fo)
            m = measure(dest, kind)
            allow = round(tr / 0.01) + 1                  # 过渡段里的元音帧不计（过渡最长 60ms，构不成音节）
            m_ok = dict(m, vowel_frames=max(0, m['vowel_frames'] - allow + 1))
            if kind in ('vl_fric', 'aspiration'):         # 清音：浊音只能来自过渡段
                ac = m['dur'] >= MIN_DUR[kind] and m['voiced_ms'] <= tr * 1000 + 10
            else:
                ac = accept(m_ok, kind)
            n, note = detect(sid, dest), ''
            cand = {'word': word, 'trans': tr, 'acoustic_ok': ac, 'asr': n, 'asr_note': note, **m}
            tried.append(cand)
            key = (ac, n >= 4, -tr, n)                    # 在能稳定辨认（≥4/6）的前提下，过渡越短越好
            if best is None or key > best[0]:
                keep = os.path.join(E.OUT, f'{sid}.best.mp3')
                os.replace(dest, keep)
                best = (key, cand)
            else:
                os.remove(dest)
    if best and best[1]['acoustic_ok']:
        os.replace(os.path.join(E.OUT, f'{sid}.best.mp3'), os.path.join(E.OUT, f'{sid}.mp3'))
        return {'sid': sid, 'ok': True, **best[1], 'tried': tried}
    if best:
        os.remove(os.path.join(E.OUT, f'{sid}.best.mp3'))
    return {'sid': sid, 'ok': False, 'tried': tried}


def main(only):
    report = []
    for sid in (only or SPEC):
        r = refine(sid)
        report.append(r)
        status = (f"✓ 取自 {r['word']}，过渡 {int(r['trans'] * 1000)}ms，时长 {r['dur']}s，浊音 {r['voiced']}，"
                  f"辨认 {r['asr']}/6") if r['ok'] else '✗ 没有候选通过声学标准，保留原录音'
        print(f'{sid:5s} {status}')
        if not r['ok']:
            for t in r['tried'][:6]:
                print('      ', t)
    path = os.path.join(E.OUT, 'refine-report.json')
    json.dump(report, open(path, 'w'), ensure_ascii=False, indent=1, default=str)


if __name__ == '__main__':
    main(sys.argv[1:])
