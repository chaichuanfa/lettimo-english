"""复查最终的音素音频（audio/p/*.mp3）。
- 由 extract_phonemes.py 截取的 36 个音素：用识别模型做拼读测试（规则与 extract_phonemes.py 相同）
- 由 refine_phonemes.py 重新截取的 9 个辅音（θ ð z ʒ v l r ŋ h）：短辅音片段在识别模型里很容易幻听出别的音，
  所以改用"辨认测试"（目标辅音在 6 种识别条件下被识别出来的次数，≥4 为通过）+ 声学标准
  （清音没有浊音段、浊音基本全程浊音、元音段不超过过渡长度）
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

fails = []
for sid in E.SPEC:
    f = os.path.join(E.OUT, sid + '.mp3')
    if not os.path.exists(f):
        print(f'✗ {sid:6s} 缺失')
        fails.append(sid)
        continue
    if sid in R.SPEC:
        kind = R.KIND[sid]
        m = R.measure(f, kind)
        tr = trans.get(sid, 0)
        if kind in ('vl_fric', 'aspiration'):
            ac = m['voiced_ms'] <= tr * 1000 + 10
        else:
            allow = round(tr / 0.01) + 1
            ac = R.accept(dict(m, vowel_frames=max(0, m['vowel_frames'] - allow + 1)), kind)
        n = R.detect(sid, f)
        ok = ac and n >= 4
        note = f'辨认 {n}/6；声学{"合格" if ac else "不合格"}（时长 {m["dur"]}s，浊音 {m["voiced_ms"]}ms，过渡 {int(tr * 1000)}ms）'
    else:
        ok, note = E.final_check(sid, f)
    print(f'{"✓" if ok else "✗"} {sid:6s} /{ipa.get(sid, "?")}/'.ljust(18), note, flush=True)
    if not ok:
        fails.append(sid)
n = len(E.SPEC)
print(f'\n{n - len(fails)}/{n} 通过' + (f'；未通过：{", ".join(fails)}' if fails else ''))
