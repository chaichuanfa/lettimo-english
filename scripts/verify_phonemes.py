"""复查全部音素音频（audio/p/*.mp3），按音的类别用不同的标准：

  元音（单元音、二合元音、r 化元音）：严格识别——6 种识别条件下识别结果（合并相邻重复记号后）必须正好是目标元音，
    不允许多出辅音（多出来说明带着送气或辅音过渡）；开头不能有清音（送气）；
    ɛ 例外：识别模型对孤立的 ɛ 一律判成 æ（试过 26 个词），改为"识别结果里没有辅音 + 共振峰最接近 ɛ"
  可持续辅音（f v s z θ ð ʃ ʒ m n ŋ l r）：辨认测试（≥4/6）+ 声学标准（清音不含浊音、浊音不含元音，
    过渡段除外）——孤立辅音的严格拼读测试不可靠（原样重新编码一次就可能从 6/6 变成 0/6）
  塞音、塞擦音、半元音、h（p b t d k g ch j w y h）：拼读测试（接上参考元音 /ɑ/ 后识别出目标辅音，≥5/6）
用法（同一个虚拟环境，需要 praat-parselmouth）：python scripts/verify_phonemes.py
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
import extract_phonemes as E  # noqa: E402
import refine_phonemes as R  # noqa: E402

out = subprocess.run(['node', '-e', 'global.window={};require("./js/data.js");console.log(JSON.stringify(Object.fromEntries(Object.entries(window.SOUNDS).map(([k,v])=>[k,v.ipa]))))'],
                     capture_output=True, text=True, cwd=E.ROOT).stdout
ipa = json.loads(out) if out.strip() else {}
# 重新截取时选定的过渡长度（声学标准里允许的元音段）
trans = {r['sid']: r.get('trans', 0) for r in json.load(open(os.path.join(E.OUT, 'refine-report.json'))) if r.get('ok')} \
    if os.path.exists(os.path.join(E.OUT, 'refine-report.json')) else {}


def _trans(sid):
    """截取时选定的过渡长度：sustain_phonemes 的结果优先，其次 refine_phonemes"""
    for name in ('sustain-report.json', 'refine-report.json'):
        path = os.path.join(E.OUT, name)
        if os.path.exists(path):
            for r in json.load(open(path)):
                if r.get('sid') == sid and r.get('ok') and 'trans' in r:
                    return r['trans']
    return 0


AUTH_REPORT = os.path.join(E.OUT, 'authoritative-report.json')
AUTH = json.load(open(AUTH_REPORT)) if os.path.exists(AUTH_REPORT) else {}
# 这几个音连未截取的 Cambridge 原录音（"θə" "ŋ"）识别模型都识别不出（θ→s、ŋ→u），属于模型对这位发音人的偏差，
# 改用声学特征：θ 是又弱又散的摩擦噪声（比 /s/ 弱 8dB 以上、频谱比 /s/ 散）；ŋ 是持续的低 F1 浊音（鼻音）
ASR_BLIND = {'th', 'ng'}


def _frames(f):
    import parselmouth
    import numpy as np
    wav = os.path.join(E.TMP, 'vf.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f, '-ac', '1', '-ar', '24000', wav], check=True)
    snd = parselmouth.Sound(wav)
    x, sr = snd.values[0], snd.sampling_frequency
    it, pt, fm = snd.to_intensity(100, 0.005), snd.to_pitch(0.005), snd.to_formant_burg(0.005, 5, 4500)
    out = []
    for t in np.arange(snd.xmin + 0.0125, snd.xmax - 0.0125, 0.005):
        seg = x[int((t - 0.0125) * sr):int((t + 0.0125) * sr)]
        sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
        fr = np.fft.rfftfreq(len(seg), 1 / sr)
        db, f0 = it.get_value(t), pt.get_value_at_time(t)
        out.append({'t': t, 'db': db if db == db else 0, 'voiced': f0 == f0 and f0 > 0, 'f1': fm.get_value_at_time(1, t),
                    'hf': 10 * np.log10(sp[fr > 3000].sum() / (sp.sum() + 1e-20) + 1e-12)})
    return snd, out


def verify_auth(sid, f):
    """权威录音（Cambridge / 牛津 / 朗文）截出的音素：音本身是词典的，这里只查截取有没有出错——
    元音：开头不带送气噪声、长度正常；辅音：结尾不带超出允许过渡的元音、接上同一位发音人的 /ɑ/ 能辨认出来"""
    import numpy as np
    import import_authoritative as A
    r = AUTH[sid]
    snd, fr = _frames(f)
    peak = max(q['db'] for q in fr)
    body = [q for q in fr if q['db'] > peak - 20]
    if r['kind'] == 'vowel':
        # 开头 20ms 内不能有送气（高频占比 > -10dB 的噪声帧）；音高跟踪在起音处有延迟，不用"有没有基频"判断
        on = next(i for i, q in enumerate(fr) if q['db'] > peak - 25)
        asp = sum(1 for q in fr[on:on + 4] if q['hf'] > -10 and not q['voiced'])   # 送气 = 无声带振动的高频噪声
        dur = body[-1]['t'] - body[0]['t']
        ok = asp == 0 and 0.2 <= dur <= 0.6
        return ok, f'来源 {r["source"]}；开头送气帧 {asp}；发音段 {dur:.2f}s'
    allow = int(round(r.get('trans_added', 0) / 0.005)) + (8 if sid in A.STOPS_VOICED else 3)
    vowel = sum(1 for q in body if q['voiced'] and q['f1'] == q['f1'] and q['f1'] > 500 and q['hf'] < -12)
    if r['kind'] == 'voiceless':
        vowel = sum(1 for q in body if q['voiced'] and q['hf'] < -12)
        allow = 3
    tail_ok = vowel <= allow
    note = f'来源 {r["source"]}；元音帧 {vowel}（允许 {allow}）'
    if sid in ASR_BLIND:
        if sid == 'th':
            # 在未截取、未调音量的 Cambridge 原录音里比较"摩擦段比后面的 ə 弱多少"：θ 是弱摩擦音，/s/ 是强摩擦音
            def rel(name):
                w = A.load(name)                       # 原录音（整段峰值归一，摩擦段与 ə 的比例不变）
                _, a, e, *_ = A.cut(name)
                fric = w.extract_part(a + 0.02, e - 0.01).get_intensity()
                vow = w.extract_part(e + 0.05, e + 0.15).get_intensity()
                return vow - fric
            d_th, d_s = rel('th'), rel('s')
            ss, _ = _frames(os.path.join(E.OUT, 's.mp3'))
            sd, sds = snd.to_spectrum().get_standard_deviation(), ss.to_spectrum().get_standard_deviation()
            ok = d_th >= d_s + 6 and sd > sds
            note += f'；原录音里摩擦段比 ə 弱 {d_th:.1f}dB（/s/ 只弱 {d_s:.1f}dB），频谱离散度 {int(sd)} > /s/ {int(sds)}'
        else:
            low = [q for q in body if q['voiced'] and q['f1'] == q['f1'] and q['f1'] < 420]
            ok = len(low) >= 0.9 * len(body)
            note += f'；低 F1 浊音帧 {len(low)}/{len(body)}'
        return ok and tail_ok, note + '（识别模型对原录音也识别不出，改用声学判断）'
    n = A.cv_test(sid, f)
    return tail_ok and n >= 4, note + f'；接 /ɑ/ 辨认 {n}/6'


def verify(sid, f):
    """复查一个音素文件，返回 (是否通过, 说明)"""
    if sid in AUTH:
        return verify_auth(sid, f)
    import sustain_phonemes as P
    if sid in E.VOWEL_OK:
        q = P.vowel_quality(f)
        lead_ok = q['lead_unvoiced_ms'] <= 5
        if sid in P.ACOUSTIC_ID:
            n = P.clean_vowel(f)
            near = P.nearest_vowel(q['F1'], q['F2'])
            ok = n >= E.PASS and near == P.VOWELS[sid][0] and lead_ok
            return ok, f'无辅音 {n}/6；共振峰 {q["F1"]}/{q["F2"]} 最接近 /{near}/；开头清音 {q["lead_unvoiced_ms"]}ms；时长 {q["dur"]}s'
        n, heard = P.strict_vowel(sid, f)
        return n >= E.PASS and lead_ok, f'严格识别 {n}/6（{heard}）；开头清音 {q["lead_unvoiced_ms"]}ms；时长 {q["dur"]}s'
    if sid in P.CONSONANTS:
        kind = P.CONSONANTS[sid][0]
        tr = _trans(sid)
        ac, m = P.acoustic(f, kind, tr)
        n = P.detect(sid, f)
        return ac and n >= 4, f'辨认 {n}/6；声学{"合格" if ac else "不合格"}（时长 {m["dur"]}s，浊音 {m["voiced_ms"]}ms，过渡 {int(tr * 1000)}ms）'
    if sid in R.SPEC:          # h
        kind = R.KIND[sid]
        m = R.measure(f, kind)
        tr = _trans(sid)
        ac = m['voiced_ms'] <= tr * 1000 + 10
        n = R.detect(sid, f)
        return ac and n >= 4, f'辨认 {n}/6；声学{"合格" if ac else "不合格"}（时长 {m["dur"]}s，浊音 {m["voiced_ms"]}ms，过渡 {int(tr * 1000)}ms）'
    return E.final_check(sid, f)


def main():
    fails = []
    for sid in E.SPEC:
        f = os.path.join(E.OUT, sid + '.mp3')
        if not os.path.exists(f):
            print(f'✗ {sid:6s} 缺失')
            fails.append(sid)
            continue
        ok, note = verify(sid, f)
        print(f'{"✓" if ok else "✗"} {sid:6s} /{ipa.get(sid, "?")}/'.ljust(18), note, flush=True)
        if not ok:
            fails.append(sid)
    n = len(E.SPEC)
    print(f'\n{n - len(fails)}/{n} 通过' + (f'；未通过：{", ".join(fails)}' if fails else ''))


if __name__ == '__main__':
    main()
