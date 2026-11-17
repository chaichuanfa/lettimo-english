"""核对 26 个字母名的录音：每个字母读的是字母名（b 读 /biː/、h 读 /eɪtʃ/ …），不是字母音、也不是别的词。

a 的字母名直接用长元音音素 a_l（单独的 "a" 会被当成冠词），这里核对 b–z 的整段录音。
方法：对照合成——把字母名写成普通单词（bee、aitch、double you …）合成，与字母录音所用文字合成出完全相同的音频，
就确定读的是字母名；对不上时退回强制对齐（字母名 vs 字母音）。
用法（与 extract_phonemes.py 同一个虚拟环境）：python scripts/verify_letters.py
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

import torch

sys.path.insert(0, os.path.dirname(__file__))
import extract_phonemes as E  # noqa: E402

# 字母 → (字母名的识别记号序列, 字母名的普通写法, 字母音的识别记号序列——最可能的误读)
NAMES = {
    'b': ('b i', ['bee'], 'b ə'), 'c': ('s i', ['see', 'sea'], 'k ə'), 'd': ('d i', ['dee'], 'd ə'), 'e': ('i', ['ee'], 'ɛ'),
    'f': ('ɛ f', ['eff'], 'f ə'), 'g': ('ʤ i', ['jee', 'gee'], 'g ə'), 'h': ('eɪ ʧ', ['aitch'], 'h ə'), 'i': ('aɪ', ['eye'], 'ɪ'),
    'j': ('ʤ eɪ', ['jay'], 'ʤ ə'), 'k': ('k eɪ', ['kay'], 'k ə'), 'l': ('ɛ l', ['ell'], 'l ə'), 'm': ('ɛ m', ['em'], 'm ə'),
    'n': ('ɛ n', ['en'], 'n ə'), 'o': ('oʊ', ['oh'], 'ɑ'), 'p': ('p i', ['pee'], 'p ə'), 'q': ('k j u', ['cue', 'queue'], 'k w ə'),
    'r': ('ɑ ɹ', ['are', 'ar'], 'ɹ ə'), 's': ('ɛ s', ['ess'], 's ə'), 't': ('t i', ['tee', 'tea'], 't ə'), 'u': ('j u', ['you'], 'ə'),
    'v': ('v i', ['vee'], 'v ə'), 'w': ('d ə b ə l j u', ['double you', 'double-u'], 'w ə'), 'x': ('ɛ k s', ['ex'], 'k s ə'),
    'y': ('w aɪ', ['why'], 'j ə'), 'z': ('z i', ['zee'], 'z ə'),
}
TMP = tempfile.mkdtemp(prefix='abc-')


def synth_hash(text, rate=150):
    path = os.path.join(TMP, hashlib.md5(text.encode()).hexdigest() + '.aiff')
    if not os.path.exists(path):
        E.say(text, rate, path)
    return hashlib.md5(open(path, 'rb').read()).hexdigest()


def main():
    js = 'global.window={};require("./audio/manifest.js");console.log(JSON.stringify(window.AUDIO_MANIFEST.t))'
    manifest = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=E.ROOT, check=True).stdout)
    proc, _ = E.get_model(E.MODEL)
    vocab, blank = proc.tokenizer.get_vocab(), proc.tokenizer.pad_token_id
    bad = 0
    for ch, (name, spells, sound) in NAMES.items():
        if ch not in manifest:
            print(f'✗ {ch} 没有录音')
            bad += 1
            continue
        h = synth_hash(ch)
        same = [sp for sp in spells if synth_hash(sp) == h]
        if same:
            ok, how = True, f'对照合成：与 "{same[0]}" 完全相同'
        else:
            lp, _ = E.logprobs(E.load(os.path.join(E.ROOT, 'audio', manifest[ch])))
            lpt = torch.tensor(lp).unsqueeze(1)
            sc = {}
            for label, seq in (('字母名', name), ('字母音', sound)):
                ids = torch.tensor([[vocab[t] for t in seq.split()]])
                sc[label] = round(float(torch.nn.functional.ctc_loss(lpt, ids, torch.tensor([lp.shape[0]]), torch.tensor([ids.shape[1]]),
                                                                      blank=blank, reduction='sum', zero_infinity=True)), 1)
            ok, how = sc['字母名'] < sc['字母音'], f'强制对齐 {sc}'
        bad += not ok
        print(f'{"✓" if ok else "✗"} {ch}  字母名 /{name}/  {how}', flush=True)
    print(f'\n字母名 b–z：不一致 {bad}')
    return bad


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
