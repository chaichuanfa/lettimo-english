"""复查最终的音素音频（audio/p/*.mp3），规则与 extract_phonemes.py 完全相同。
用法（同一个虚拟环境）：python scripts/verify_phonemes.py
"""
import os, sys, json, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import extract_phonemes as E

out = subprocess.run(['node', '-e', 'global.window={};require("./js/data.js");console.log(JSON.stringify(Object.fromEntries(Object.entries(window.SOUNDS).map(([k,v])=>[k,v.ipa]))))'],
                     capture_output=True, text=True, cwd=E.ROOT).stdout
ipa = json.loads(out) if out.strip() else {}
fails = []
for sid in E.SPEC:
    f = os.path.join(E.OUT, sid + '.mp3')
    if not os.path.exists(f):
        print(f'✗ {sid:6s} 缺失'); fails.append(sid); continue
    ok, note = E.final_check(sid, f)
    print(f'{"✓" if ok else "✗"} {sid:6s} /{ipa.get(sid, "?")}/'.ljust(18), note, flush=True)
    if not ok:
        fails.append(sid)
n = len(E.SPEC)
print(f'\n{n - len(fails)}/{n} 通过' + (f'；未通过：{", ".join(fails)}' if fails else ''))
