"""核对课程单词的整词录音"选的是哪种读法"：有多种读法的词（多音词、强弱读形式、带不带某个音），
录音必须和网站上显示的音标一致。

方法：对照合成。Samantha 对同一段文字每次合成的音频完全相同，所以把每种读法写成"只能那样读"的拼写去合成，
录音所用的文字与哪种拼写合成出完全相同的音频，就是读成了哪种——这是确定的结论。
两种拼写都对不上时，退一步用强制对齐（CTC 损失）比较两种读法与实际录音的吻合程度，并在结果里注明。

用法（与 extract_phonemes.py 同一个虚拟环境）：python scripts/verify_lexicon.py
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

ROOT = E.ROOT
# 单词 → (网站上标的读法, {读法: (识别模型记号序列, [只能这样读的拼写])})
TABLE = {
    'wind':   ('wɪnd', {'wɪnd': ('w ɪ n d', ['winned']), 'waɪnd': ('w aɪ n d', ['wined', 'wynd'])}),
    'tear':   ('tɪr', {'tɪr': ('t ɪ ɹ', ['teer']), 'tɛr': ('t ɛ ɹ', ['tare'])}),
    'route':  ('ruːt', {'ruːt': ('ɹ u t', ['root']), 'raʊt': ('ɹ aʊ t', ['rowt'])}),
    'vase':   ('veɪs', {'veɪs': ('v eɪ s', ['vace']), 'vɑz': ('v ɑ z', ['vahz'])}),
    'use':    ('juːz', {'juːz': ('j u z', ['yooz']), 'juːs': ('j u s', [])}),
    'to':     ('tuː', {'tuː': ('t u', ['too']), 'tə': ('t ə', ['tuh'])}),
    'was':    ('wɑz', {'wɑz': ('w ɑ z', ['wahz']), 'wʌz': ('w ə z', ['wuz'])}),
    'are':    ('ɑr', {'ɑr': ('ɑ ɹ', ['ar']), 'ɚ': ('ɝ', ['er'])}),
    'our':    ('aʊɚ', {'aʊɚ': ('aʊ ɝ', ['hour']), 'ɑr': ('ɑ ɹ', ['are'])}),
    'a':      ('ə', {'ə': ('ə', ['uh']), 'eɪ': ('eɪ', ['ay'])}),
    'the':    ('ðə', {'ðə': ('ð ə', ['thuh']), 'ðiː': ('ð i', ['thee'])}),
    'and':    ('ænd', {'ænd': ('æ n d', []), 'ənd': ('ə n d', [])}),
    'of':     ('ʌv', {'ʌv': ('ə v', []), 'ɔf': ('ɑ f', ['off'])}),
    'said':   ('sɛd', {'sɛd': ('s ɛ d', ['sed']), 'seɪd': ('s eɪ d', ['sayed'])}),
    'have':   ('hæv', {'hæv': ('h æ v', []), 'həv': ('h ə v', [])}),
    'do':     ('duː', {'duː': ('d u', ['doo']), 'də': ('d ə', [])}),
    'you':    ('juː', {'juː': ('j u', []), 'jə': ('j ə', [])}),
    'often':  ('ɔːfən', {'ɔːfən': ('ɑ f ə n', ['offen']), 'ɔːftən': ('ɑ f t ə n', ['offten'])}),
    'calm':   ('kɑm', {'kɑm': ('k ɑ m', []), 'kɑlm': ('k ɑ l m', [])}),
    'palm':   ('pɑm', {'pɑm': ('p ɑ m', []), 'pɑlm': ('p ɑ l m', [])}),
    'tomato': ('təˈmeɪtoʊ', {'təˈmeɪtoʊ': ('t ə m eɪ t oʊ', ['tomayto']), 'təˈmɑtoʊ': ('t ə m ɑ t oʊ', ['tomahto'])}),
    'again':  ('əˈgɛn', {'əˈgɛn': ('ə g ɛ n', []), 'əˈgeɪn': ('ə g eɪ n', [])}),
    'human':  ('ˈhjuːmən', {'ˈhjuːmən': ('h j u m ə n', []), 'ˈjuːmən': ('j u m ə n', [])}),
    'huge':   ('hjuːdʒ', {'hjuːdʒ': ('h j u ʤ', []), 'juːdʒ': ('j u ʤ', [])}),
    'tube':   ('tuːb', {'tuːb': ('t u b', ['toob']), 'tjuːb': ('t j u b', ['tyoob'])}),
    'new':    ('nuː', {'nuː': ('n u', ['noo']), 'njuː': ('n j u', ['nyoo'])}),
    'coupon': ('ˈkuːpɑn', {'ˈkuːpɑn': ('k u p ɑ n', []), 'ˈkjuːpɑn': ('k j u p ɑ n', [])}),
    'job':    ('dʒɑb', {'dʒɑb': ('ʤ ɑ b', []), 'dʒoʊb': ('ʤ oʊ b', [])}),
    'with':   ('wɪθ', {'wɪθ': ('w ɪ θ', []), 'wɪð': ('w ɪ ð', [])}),
    'herb':   ('ɝb', {'ɝb': ('ɝ b', ['erb']), 'hɝb': ('h ɝ b', ['hurb'])}),
    'zero':   ('ˈziːroʊ', {'ˈziːroʊ': ('z i ɹ oʊ', ['zeero']), 'ˈzɪroʊ': ('z ɪ ɹ oʊ', ['zirro'])}),
    'engine': ('ˈɛndʒɪn', {'ˈɛndʒɪn': ('ɛ n ʤ ɪ n', ['enjin']), 'ˈɪndʒɪn': ('ɪ n ʤ ɪ n', ['injin'])}),
    'family': ('ˈfæməli', {'ˈfæməli': ('f æ m ə l i', ['fammily']), 'ˈfæmli': ('f æ m l i', ['famly'])}),
    'camera': ('ˈkæmɚə', {'ˈkæmɚə': ('k æ m ɝ ə', ['kam-er-uh']), 'ˈkæmrə': ('k æ m ɹ ə', ['camra'])}),
    'sunday': ('ˈsʌndeɪ', {'ˈsʌndeɪ': ('s ə n d eɪ', ['sundae']), 'ˈsʌndi': ('s ə n d i', ['sundee'])}),
    'exit':   ('ˈɛksɪt', {'ˈɛksɪt': ('ɛ k s ɪ t', ['eksit']), 'ˈɛgzɪt': ('ɛ g z ɪ t', ['egzit'])}),
    'shin':   ('ʃɪn', {'ʃɪn': ('ʃ ɪ n', ['shinn']), 'ʃiːn': ('ʃ i n', ['sheen'])}),
    'comfortable': ('ˈkʌmfɚtəbəl', {'ˈkʌmfɚtəbəl': ('k ə m f ɝ t ə b ə l', ['kumfurtabul']), 'ˈkʌmftɚbəl': ('k ə m f t ɝ b ə l', ['comfterble'])}),
    'august': ('ˈɔːgəst', {'ˈɔːgəst': ('ɑ g ə s t', ['Awgust']), 'ɔːˈgʌst': ('ɑ g ə s t', ['Aw gust'])}),
}
TMP = tempfile.mkdtemp(prefix='lex-')


def synth_hash(text, rate=150):
    path = os.path.join(TMP, hashlib.md5(text.encode()).hexdigest() + '.aiff')
    if not os.path.exists(path):
        E.say(text, rate, path)
    with open(path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def ctc_scores(x, variants):
    proc, _ = E.get_model(E.MODEL)
    vocab, blank = proc.tokenizer.get_vocab(), proc.tokenizer.pad_token_id
    lp, _ = E.logprobs(x)
    lpt = torch.tensor(lp).unsqueeze(1)
    out = {}
    for name, (seq, _) in variants.items():
        ids = torch.tensor([[vocab[t] for t in seq.split()]])
        out[name] = round(float(torch.nn.functional.ctc_loss(lpt, ids, torch.tensor([lp.shape[0]]), torch.tensor([ids.shape[1]]),
                                                             blank=blank, reduction='sum', zero_infinity=True)), 1)
    return out


def main():
    js = 'global.window={};require("./audio/manifest.js");console.log(JSON.stringify(window.AUDIO_MANIFEST.t))'
    manifest = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT, check=True).stdout)
    speak_as = json.load(open(os.path.join(ROOT, 'audio', 'speak-as.json')))
    rows, bad = [], 0
    for word, (want, variants) in TABLE.items():
        key = next((k for k in manifest if k.lower() == word), None)
        if not key:
            continue
        spoken = speak_as.get(key, key.lower() if len(key) == 1 else key)
        h = synth_hash(spoken)
        same = [name for name, (_, spells) in variants.items() for sp in spells if synth_hash(sp) == h]
        same = list(dict.fromkeys(same))
        if len(same) == 1:
            got, how = same[0], f'对照合成：与 "{next(sp for sp in variants[same[0]][1] if synth_hash(sp) == h)}" 完全相同'
        else:
            sc = ctc_scores(E.load(os.path.join(ROOT, 'audio', manifest[key])), variants)
            got = min(sc, key=sc.get)
            how = f'强制对齐 {sc}' + ('（对照合成两种都相同，无法区分）' if len(same) > 1 else '')
        ok = got == want
        bad += not ok
        rows.append({'word': key, 'spoken': spoken, 'want': want, 'got': got, 'how': how, 'ok': ok})
        print(f'{"✓" if ok else "✗"} {key:8s} 标 /{want}/，录音读 /{got}/' + (f'（按 "{spoken}" 合成）' if spoken != key else '') + f'  {how}', flush=True)
    print(f'\n{len(rows)} 个词；不一致 {bad}')
    json.dump(rows, open(os.path.join(ROOT, 'audio', 'lexicon-report.json'), 'w'), ensure_ascii=False, indent=1)
    return bad


if __name__ == '__main__':
    sys.exit(1 if main() else 0)
