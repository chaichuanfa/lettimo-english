"""用声学特征核对识别模型难以判断的音素录音（/r/ /l/ /θ/ /ð/），并与已通过校验的音素对照。

- /r/ 与 /l/、/w/ 的区别：/r/ 的第三共振峰 F3 明显降低（成年女声约 2000 Hz 以下），/l/、/w/ 不降
- /θ/ 与 /s/、/f/：/θ/ 是弱摩擦，强度远低于 /s/，频谱重心也低于 /s/
- /ð/ 与 /z/、/θ/：/ð/ 是浊音（有周期性），摩擦弱，强度低于 /z/

用法：python scripts/acoustic_check.py（需要 praat-parselmouth）
"""
import os

import numpy as np
import parselmouth
from parselmouth.praat import call

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
P = os.path.join(ROOT, 'audio', 'p')


def load(sid):
    return parselmouth.Sound(os.path.join(P, sid + '.mp3'))


def voiced_part(snd):
    """取能量最强的中间 60%（避开首尾的淡入淡出和过渡段）"""
    a, b = snd.xmin, snd.xmax
    d = b - a
    return snd.extract_part(a + d * 0.2, b - d * 0.2)


def formants(sid):
    s = voiced_part(load(sid))
    f = s.to_formant_burg(time_step=0.01, max_number_of_formants=5, maximum_formant=5500)
    out = []
    for n in (1, 2, 3):
        vals = [f.get_value_at_time(n, t) for t in np.arange(s.xmin + 0.01, s.xmax - 0.01, 0.01)]
        vals = [v for v in vals if v == v]
        out.append(float(np.median(vals)) if vals else float('nan'))
    return out


def fric(sid):
    s = voiced_part(load(sid))
    spec = s.to_spectrum()
    cog = call(spec, 'Get centre of gravity', 2)
    # 4–8 kHz 频带能量占比：/s/ 的能量集中在高频
    hi = call(spec, 'Get band energy', 4000, 8000)
    tot = call(spec, 'Get band energy', 0, 8000)
    db = s.get_intensity()
    pitch = s.to_pitch(time_step=0.01, pitch_floor=75, pitch_ceiling=500)
    voiced = float(np.mean(pitch.selected_array['frequency'] > 0))
    return cog, hi / tot, db, voiced


print('— 近音 /r/ /l/ /w/：中段共振峰（Hz）')
for sid in ('r', 'l', 'w', 'er'):
    f1, f2, f3 = formants(sid)
    print(f'  {sid:3s} F1 {f1:6.0f}  F2 {f2:6.0f}  F3 {f3:6.0f}')
print('— 摩擦音：频谱重心(Hz)、4–8kHz 能量占比、强度(dB)、浊音帧比例')
for sid in ('th', 'f', 's', 'sh', 'th_v', 'v', 'z'):
    cog, hi, db, voiced = fric(sid)
    print(f'  {sid:5s} 重心 {cog:6.0f}  高频占比 {hi:4.2f}  强度 {db:5.1f}  浊音 {voiced:4.2f}')
