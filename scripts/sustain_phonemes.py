"""把音素录音里"能持续的音"做稳、做长：单元音、鼻音、边音/卷舌音、擦音。

为什么需要
  extract_phonemes.py / refine_phonemes.py 按识别模型的音素区间截取，识别模型对下面几种缺陷不敏感，人耳却很明显：
  * 元音开头带着前一个辅音的送气（cat 的 k、pig 的 p），听起来像 "ha"、"hi"；
  * 单元音带着滑动（hot 的 ɑ 结尾滑向 t、too 的 u 开头被 t 带偏、pig 的 ɪ 从 /i/ 滑过来），音色不纯；
  * 可持续的辅音（m n l r f v s z θ ð ʃ ʒ ŋ）稳定段只有 40–120ms，听起来是一下短促的声音，
    而自然拼读教这些音时要拖长（"mmm"、"sss"），学生才听得清。

做法
  单元音（VOWELS）：从候选词里重新截取
    1. Samantha 朗读候选词（优先 h_d 语境：h 没有发音部位，不会把元音带偏），CTC 强制对齐定位元音；
    2. 用 Praat 逐帧测量，从浊音起点开始截（不含送气），结尾往前收掉滑向后一个辅音的过渡；
       不把元音削成完全平稳——孤立元音要靠元音自身的音色变化辨认，只截平稳段时 ɛ 会被听成 æ、ʌ 听成 ɑ；
    3. 滑动小的窗口优先，同档内选共振峰最接近美式女声参考值（Hillenbrand 1995）的；
    4. 保持音高整体放慢（PSOLA）到目标时长，加淡入淡出，统一响度。
  辅音（CONSONANTS）：方法同 refine_phonemes（找辅音本体 + 最短的元音过渡），区别是
    1. 用慢语速朗读，让辅音在词里自然变长；
    2. 本体不足 0.25 秒的补拉长：浊音用 PSOLA；清擦音用按原段平均频谱整形的新噪声（避免 PSOLA 处理噪声时
       的机械周期感，也避免颗粒叠加的梳状干涉）；需要拉长 3 倍以上的候选不用；
    3. 选择标准：声学合格 + 辨认测试 ≥4/6 的前提下，过渡最短、拉长倍数最小。
  二合元音、r 化元音（GLIDES）：本身要滑动，不挑平稳段；换用前面没有 h / 送气辅音的词，只从浊音起点截，
    保留完整滑动，严格识别通过（不允许多出 h 等辅音）。
  复查：单元音用识别模型拼读测试（6 种条件至少 5 次）+ 成品开头无清音、F2 稳定；
    辅音用辨认测试 + 声学标准（孤立辅音的严格拼读测试不可靠：原样重新编码一次就可能从 6/6 变 0/6）。

用法（与 extract_phonemes.py 同一个虚拟环境，需要 praat-parselmouth）：
  python scripts/sustain_phonemes.py [音素id ...]
输出：audio/p/<id>.mp3，结果写入 audio/p/sustain-report.json
"""
import json
import os
import sys

import numpy as np
import parselmouth
from parselmouth.praat import call

sys.path.insert(0, os.path.dirname(__file__))
import extract_phonemes as E  # noqa: E402
import refine_phonemes as R  # noqa: E402

# 美式成年女声元音共振峰参考值（Hillenbrand et al. 1995），用于在候选中挑最典型的一个；ə 取央元音的大致位置
REF = {'æ': (669, 2349), 'ɪ': (483, 2365), 'ɛ': (731, 2058), 'ɑ': (936, 1551), 'ʌ': (753, 1426), 'ʊ': (519, 1225),
       'ə': (600, 1500), 'i': (437, 2761), 'u': (459, 1105)}

# 单元音：音素id → (参考元音, 目标时长, 候选 [(单词, 音素序列(TIMIT 记号), 目标下标, 语速)])
# 候选优先用前面没有送气辅音的词（元音开头、或 b/d/h 开头）；最终由稳定段和共振峰决定
# 目标时长。注意松元音 ɪ ɛ ʌ ʊ 天然就短：美式英语里元音长短本身是辨认线索（æ、ɑ 比 ɛ、ʌ 长），
# 把 ɛ 拉到 0.32 秒会被听成 æ、ʌ 听成 ɑ、ʊ 听成 ə，所以松元音只保持自然长度
SHORT, LAX, LONG = 0.32, 0.22, 0.42
VOWELS = {
    'a_s': ('æ', SHORT, [('add', 'æ d', 0, 100), ('at', 'æ t', 0, 100), ('pat', 'p æ t', 1, 100), ('bad', 'b æ d', 1, 100),
                         ('dad', 'd æ d', 1, 100), ('bat', 'b æ t', 1, 100), ('add', 'æ d', 0, 80), ('bad', 'b æ d', 1, 80)]),
    # ɛ：TIMIT 识别模型对孤立的 ɛ 一律判成 æ（试了 26 个词的纯净 ɛ，无一例外；带着 b/d 过渡时才判成 ɛ），
    # 所以 ɛ 改用共振峰判定（见 ACOUSTIC_ID）；候选只用后面不接鼻音的词（鼻音前的元音带鼻化）
    'e_s': ('ɛ', LAX, [('get', 'g ɛ t', 1, 100), ('bet', 'b ɛ t', 1, 100), ('red', 'ɹ ɛ d', 1, 100), ('leg', 'l ɛ g', 1, 100),
                       ('beg', 'b ɛ g', 1, 100), ('edge', 'ɛ ʤ', 0, 100), ('bed', 'b ɛ d', 1, 100), ('head', 'h ɛ d', 1, 80)]),
    'i_s': ('ɪ', LAX, [('hid', 'h ɪ d', 1, 80), ('did', 'd ɪ d', 1, 100), ('fix', 'f ɪ k s', 1, 100), ('bid', 'b ɪ d', 1, 100), ('hid', 'h ɪ d', 1, 100),
                         ('did', 'd ɪ d', 1, 80), ('bid', 'b ɪ d', 1, 80), ('big', 'b ɪ g', 1, 100), ('dig', 'd ɪ g', 1, 100)]),
    'o_s': ('ɑ', SHORT, [('odd', 'ɑ d', 0, 100), ('hot', 'h ɑ t', 1, 100), ('bob', 'b ɑ b', 1, 100), ('hop', 'h ɑ p', 1, 100),
                         ('dot', 'd ɑ t', 1, 100), ('odd', 'ɑ d', 0, 80), ('hot', 'h ɑ t', 1, 80), ('pot', 'p ɑ t', 1, 100)]),
    'u_s': ('ʌ', LAX, [('hut', 'h ə t', 1, 80), ('hud', 'h ə d', 1, 80), ('up', 'ə p', 0, 100), ('bud', 'b ə d', 1, 100), ('hub', 'h ə b', 1, 100), ('dub', 'd ə b', 1, 100),
                         ('sun', 's ə n', 1, 100), ('bus', 'b ə s', 1, 100), ('up', 'ə p', 0, 80), ('bud', 'b ə d', 1, 80)]),
    'oo_s': ('ʊ', LAX, [('hood', 'h ʊ d', 1, 70), ('hook', 'h ʊ k', 1, 80), ('hood', 'h ʊ d', 1, 100), ('book', 'b ʊ k', 1, 100), ('good', 'g ʊ d', 1, 100), ('hook', 'h ʊ k', 1, 100),
                          ('wood', 'w ʊ d', 1, 100), ('push', 'p ʊ ʃ', 1, 100), ('hood', 'h ʊ d', 1, 80), ('book', 'b ʊ k', 1, 80)]),
    # ə 本来就短而弱，拉长了会变成 /ʌ/，所以目标时长短一些
    # panda 词尾的 ə 开口一路变大（F1 550→850，看语谱图发现），所以多给几个 ə 位置稳定的候选
    'schwa': ('ə', 0.22, [('sofa', 's oʊ f ə', 3, 100), ('pizza', 'p i t s ə', 4, 100), ('comma', 'k ɑ m ə', 3, 100),
                          ('ago', 'ə g oʊ', 0, 100), ('away', 'ə w eɪ', 0, 100), ('around', 'ə ɹ aʊ n d', 0, 100),
                          ('about', 'ə b aʊ t', 0, 100), ('again', 'ə g ɛ n', 0, 100), ('banana', 'b ə n æ n ə', 1, 100),
                          ('soda', 's oʊ d ə', 3, 100), ('panda', 'p æ n d ə', 4, 100)]),
    'e_l': ('i', LONG, [('see', 's i', 1, 100), ('bee', 'b i', 1, 100), ('he', 'h i', 1, 100), ('eat', 'i t', 0, 100),
                        ('ease', 'i z', 0, 100), ('feed', 'f i d', 1, 100), ('bead', 'b i d', 1, 100)]),
    'oo_l': ('u', LONG, [('who', 'h u', 1, 100), ('boo', 'b u', 1, 100), ('food', 'f u d', 1, 100), ('ooze', 'u z', 0, 100),
                         ('moo', 'm u', 1, 100), ('zoo', 'z u', 1, 100), ('too', 't u', 1, 100), ('who', 'h u', 1, 80)]),
}

# 二合元音与 r 化元音：本身就要滑动，不挑平稳段；只从浊音起点截（不带 h 的气流、辅音送气），保留完整滑动。
# 音素id → (目标时长, 候选 [(单词, 音素序列, (起始下标, 结束下标), 语速)])；优先用元音开头或 b/d 开头的词
GLIDES = {
    'a_l': (0.40, [('eight', 'eɪ t', (0, 0), 100), ('day', 'd eɪ', (1, 1), 100), ('bay', 'b eɪ', (1, 1), 100), ('way', 'w eɪ', (1, 1), 100),
                   ('say', 's eɪ', (1, 1), 100), ('aid', 'eɪ d', (0, 0), 100)]),
    'oi':  (0.40, [('boy', 'b ɔɪ', (1, 1), 100), ('oil', 'ɔɪ l', (0, 0), 100), ('toy', 't ɔɪ', (1, 1), 100), ('joy', 'ʤ ɔɪ', (1, 1), 100),
                   ('soy', 's ɔɪ', (1, 1), 100), ('oy', 'ɔɪ', (0, 0), 100)]),
    # Samantha 的 /aʊ/ 后半段很弱：单独的 "ow" 会被听成 ɑ，放慢太多（滑动变缓）也会被听成 ɑ，
    # 所以目标时长接近自然长度；how 从浊音起点截（去掉 h 的气流）
    'ow':  (0.26, [('how', 'h aʊ', (1, 1), 100), ('how', 'h aʊ', (1, 1), 80), ('wow', 'w aʊ w', (1, 1), 80), ('out', 'aʊ t', (0, 0), 80), ('down', 'd aʊ n', (1, 1), 80), ('loud', 'l aʊ d', (1, 1), 80), ('cloud', 'k l aʊ d', (2, 2), 80),
                   ('bow', 'b aʊ', (1, 1), 80), ('now', 'n aʊ', (1, 1), 80), ('ouch', 'aʊ ʧ', (0, 0), 80), ('ow', 'aʊ', (0, 0), 100),
                   ('out', 'aʊ t', (0, 0), 100), ('down', 'd aʊ n', (1, 1), 100)]),
    'air': (0.36, [('air', 'ɛ ɹ', (0, 1), 100), ('bear', 'b ɛ ɹ', (1, 2), 100), ('dare', 'd ɛ ɹ', (1, 2), 100), ('chair', 'ʧ ɛ ɹ', (1, 2), 100),
                   ('pair', 'p ɛ ɹ', (1, 2), 100), ('air', 'ɛ ɹ', (0, 1), 85)]),
    'ear': (0.36, [('ear', 'ɪ ɹ', (0, 1), 100), ('deer', 'd ɪ ɹ', (1, 2), 100), ('beer', 'b ɪ ɹ', (1, 2), 100), ('near', 'n ɪ ɹ', (1, 2), 100),
                   ('year', 'j ɪ ɹ', (1, 2), 100), ('ear', 'ɪ ɹ', (0, 1), 85)]),
}


# 用共振峰判定元音身份的音素（识别模型对它们的孤立元音有系统偏差）：识别结果里不能有任何辅音（不带送气和过渡），
# 且共振峰在美式女声参考值里最近的是目标元音
ACOUSTIC_ID = {'e_s'}


def nearest_vowel(f1, f2):
    return min(REF, key=lambda v: np.hypot(np.log(f1 / REF[v][0]), np.log(f2 / REF[v][1])))


# 可持续辅音：音素id → (帧类型, 识别记号, 候选 [(单词, 音素序列, 目标下标, 语速)])
# 用慢语速朗读，让辅音在词里自然变长（PSOLA 只补拉不足的部分，倍数越小越自然）；
# 帧类型同 refine_phonemes：清擦音 vl_fric、浊擦音 vd_fric、响音 sonorant
CONSONANTS = {
    'f':    ('vl_fric', 'f', [('off', 'ɑ f', 1, 80), ('fun', 'f ə n', 0, 80), ('fan', 'f æ n', 0, 80), ('puff', 'p ə f', 2, 80), ('leaf', 'l i f', 2, 80)]),
    's':    ('vl_fric', 's', [('sun', 's ə n', 0, 90), ('bus', 'b ə s', 2, 90), ('sat', 's æ t', 0, 90), ('yes', 'j ɛ s', 2, 90)]),
    'sh':   ('vl_fric', 'ʃ', [('ship', 'ʃ ɪ p', 0, 90), ('fish', 'f ɪ ʃ', 2, 90), ('shop', 'ʃ ɑ p', 0, 90), ('wash', 'w ɑ ʃ', 2, 90)]),
    'th':   ('vl_fric', 'θ', [('thin', 'θ ɪ n', 0, 80), ('thumb', 'θ ə m', 0, 80), ('thud', 'θ ə d', 0, 80), ('bath', 'b æ θ', 2, 80), ('teeth', 't i θ', 2, 80),
                              ('thin', 'θ ɪ n', 0, 55), ('thumb', 'θ ə m', 0, 55), ('bath', 'b æ θ', 2, 60), ('teeth', 't i θ', 2, 60), ('mouth', 'm aʊ θ', 2, 60)]),
    'v':    ('vd_fric', 'v', [('over', 'oʊ v ɝ', 1, 80), ('ever', 'ɛ v ɝ', 1, 80), ('river', 'ɹ ɪ v ɝ', 2, 80), ('seven', 's ɛ v ə n', 2, 80), ('love', 'l ə v', 2, 80)]),
    'z':    ('vd_fric', 'z', [('easy', 'i z i', 1, 80), ('lazy', 'l eɪ z i', 2, 80), ('busy', 'b ɪ z i', 2, 80), ('buzz', 'b ə z', 2, 80)]),
    'zh':   ('vd_fric', 'ʃ', [('vision', 'v ɪ ʃ ə n', 2, 80), ('measure', 'm ɛ ʃ ɝ', 2, 80), ('treasure', 't ɹ ɛ ʃ ɝ', 3, 80), ('pleasure', 'p l ɛ ʃ ɝ', 3, 80),
                              ('vision', 'v ɪ ʃ ə n', 2, 60), ('measure', 'm ɛ ʃ ɝ', 2, 60), ('usual', 'j u ʃ u ə l', 2, 60), ('beige', 'b eɪ ʃ', 2, 70)]),
    'th_v': ('vd_fric', 'ð', [('mother', 'm ə ð ɝ', 2, 80), ('other', 'ə ð ɝ', 1, 80), ('father', 'f ɑ ð ɝ', 2, 80), ('either', 'i ð ɝ', 1, 80),
                              ('mother', 'm ə ð ɝ', 2, 60), ('other', 'ə ð ɝ', 1, 60), ('either', 'i ð ɝ', 1, 60), ('breathe', 'b ɹ i ð', 3, 70),
                              ('smooth', 's m u ð', 3, 70), ('bathe', 'b eɪ ð', 2, 70)]),
    'm':    ('sonorant', 'm', [('mom', 'm ɑ m', 0, 80), ('map', 'm æ p', 0, 80), ('me', 'm i', 0, 80), ('mud', 'm ə d', 0, 80), ('hum', 'h ə m', 2, 80)]),
    'n':    ('sonorant', 'n', [('sun', 's ə n', 2, 80), ('in', 'ɪ n', 1, 80), ('pen', 'p ɛ n', 2, 80), ('ten', 't ɛ n', 2, 80), ('fan', 'f æ n', 2, 80),
                              ('own', 'oʊ n', 1, 80), ('nut', 'n ə t', 0, 60), ('no', 'n oʊ', 0, 60), ('net', 'n ɛ t', 0, 60)]),
    'ng':   ('sonorant', 'ŋ', [('sing', 's ɪ ŋ', 2, 80), ('long', 'l ɑ ŋ', 2, 80), ('ring', 'ɹ ɪ ŋ', 2, 80), ('song', 's ɑ ŋ', 2, 80)]),
    # 词尾的 l 是"暗 l"（音色接近 /o/），自然拼读教的是词首的"清 l"，所以只用词首。
    # 拉长后的 l 本体（F1≈320、F2≈1130、F3≈3100，与 m/n 相比 1–2kHz 能量高 15dB 以上）各候选几乎一样，
    # 但识别模型只在 look 的 l 后面接 /ɑ/ 时稳定听成 l（其余听成 m/n 或元音），所以 look 放第一个
    'l':    ('sonorant', 'l', [('look', 'l ʊ k', 0, 70), ('lip', 'l ɪ p', 0, 70), ('law', 'l ɑ', 0, 70), ('leaf', 'l i f', 0, 70), ('lot', 'l ɑ t', 0, 70),
                              ('lip', 'l ɪ p', 0, 55), ('law', 'l ɑ', 0, 55), ('leaf', 'l i f', 0, 55), ('let', 'l ɛ t', 0, 55)]),
    'r':    ('sonorant', 'ɹ', [('run', 'ɹ ə n', 0, 70), ('red', 'ɹ ɛ d', 0, 70), ('rock', 'ɹ ɑ k', 0, 70), ('raw', 'ɹ ɑ', 0, 70),
                              ('run', 'ɹ ə n', 0, 50), ('red', 'ɹ ɛ d', 0, 50), ('rock', 'ɹ ɑ k', 0, 50), ('raw', 'ɹ ɑ', 0, 50), ('rat', 'ɹ æ t', 0, 50)]),
}
CORE = 0.25            # 辅音本体（不含过渡）的目标时长
MAX_FACTOR = 3.5       # 本体太短、要拉长超过 3.5 倍的候选不用（听起来不自然）
# Samantha 读 θ ð l r 时无论语速多慢本体都只有 50–70ms，只能拉得更多；这几个音的本体是平稳的
# （擦音噪声 / 稳定的共振峰），PSOLA 或噪声颗粒拉长后仍是同一个音，是否可用由辨认测试和声学标准把关
MAX_FACTOR_SID = {'th': 6.0, 'th_v': 6.0, 'l': 5.0, 'r': 6.0}
TARGET_DB = {'th': 74, 'f': 74}   # 弱擦音本来就比 /s/ 弱
REPORT = os.path.join(E.OUT, 'sustain-report.json')


# ---------------------------------------------------------------- 基础
def wav_of(word, rate):
    src = E.tts(word, rate)
    wav = src[:-5] + '.wav'
    if not os.path.exists(wav):
        E.run(['ffmpeg', '-y', '-v', 'error', '-i', src, wav])
    return wav


def to_mp3(snd, dest, fade_in=0.0, fade_out=0.0, peak=None):
    tmp = os.path.join(E.TMP, 'sustain.wav')
    snd.save(tmp, 'WAV')
    dur = snd.xmax - snd.xmin
    af = []
    if fade_in:
        af.append(f'afade=t=in:d={fade_in}')
    if fade_out:
        af.append(f'afade=t=out:st={max(0, dur - fade_out):.3f}:d={fade_out}')
    if peak is not None:
        E.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', ','.join(af) or 'anull', '-ac', '1', '-ar', '24000', tmp + '.f.wav'])
        af = [f'volume={peak - E.peak_db(tmp + ".f.wav"):.1f}dB', 'apad=pad_dur=0.05']
        tmp = tmp + '.f.wav'
    E.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', ','.join(af) or 'anull', '-ac', '1', '-ar', '24000',
           '-codec:a', 'libmp3lame', '-b:a', '64k', dest])


def psola(snd, x0, x1, factor):
    """保持音高把 [x0, x1] 拉长 factor 倍（Praat Manipulation + DurationTier），其余部分不变。
    Praat 的 overlap-add 重合成一次最多拉长约 3 倍（多出的部分是空的），所以分几次做"""
    while factor > 1.001:
        step = min(2.5, factor)
        dur = snd.xmax - snd.xmin
        manip = call(snd, 'To Manipulation', 0.01, 75, 600)
        tier = call('Create DurationTier', 'd', snd.xmin, snd.xmax)
        for t, v in ((x0 - 0.001, 1.0), (x0 + 0.001, step), (x1 - 0.001, step), (x1 + 0.001, 1.0)):
            if snd.xmin < t < snd.xmax:
                call(tier, 'Add point', t, v)
        if call(tier, 'Get number of points') == 0:
            call(tier, 'Add point', snd.xmin, step)
        call([manip, tier], 'Replace duration tier')
        out = call(manip, 'Get resynthesis (overlap-add)')
        want = dur + (x1 - x0) * (step - 1)
        got = out.n_samples / out.sampling_frequency
        if abs(got - want) > 0.02:
            raise RuntimeError(f'PSOLA 输出长度 {got:.3f}s，应为 {want:.3f}s')
        snd = parselmouth.Sound(out.values, out.sampling_frequency)
        x1 = x0 + (x1 - x0) * step
        factor /= step
    return snd


def noise_stretch(snd, x0, x1, factor, seed=0):
    """清擦音：把 [x0, x1] 换成 factor 倍长的噪声。擦音本质上是经声道滤波的噪声，所以：
    用 Welch 法测出原段的平均功率谱，生成新的白噪声按这个谱整形（频域相乘），能量与原段一致，
    前后各 10ms 交叉淡化接回原录音。
    （早先用"从原段随机取 20ms 颗粒叠加"，原段很短时颗粒彼此相关，会产生梳状干涉：f 拉长后频谱毛刺
    从 1.9dB 增加到 4.1dB，听起来带金属感——是看语谱图时发现的）"""
    x = snd.values[0].astype(np.float64)
    sr = snd.sampling_frequency
    i0, i1 = int(x0 * sr), int(x1 * sr)
    src = x[i0:i1]
    nf = 256 if len(src) >= 1024 else 128
    w = np.hanning(nf)
    frames = [src[i:i + nf] * w for i in range(0, len(src) - nf + 1, nf // 4)]
    psd = np.mean([np.abs(np.fft.rfft(f)) ** 2 for f in frames], axis=0)
    n = int(len(src) * factor)
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(n)
    spec = np.fft.rfft(noise)
    shape = np.sqrt(np.interp(np.fft.rfftfreq(n, 1 / sr), np.fft.rfftfreq(nf, 1 / sr), psd))
    out = np.fft.irfft(spec * shape, n)
    out *= np.sqrt((src ** 2).mean() / ((out ** 2).mean() + 1e-20))
    c = int(0.010 * sr)
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, c))      # 等功率附近的平滑交叉淡化
    head, tail = x[:i0 + c].copy(), x[i1 - c:].copy()
    mid = out.copy()
    mid[:c] = head[-c:] * (1 - ramp) + mid[:c] * ramp
    mid[-c:] = mid[-c:] * (1 - ramp) + tail[:c] * ramp
    y = np.concatenate([head[:-c], mid, tail[c:]])
    return parselmouth.Sound(y, sr)


# ---------------------------------------------------------------- 单元音
def vframes(snd, a, b, step=0.01):
    f = snd.to_formant_burg(time_step=step, max_number_of_formants=5, maximum_formant=5500)
    p = snd.to_pitch(time_step=step)
    it = snd.to_intensity(time_step=step)
    return [{'t': float(t), 'voiced': p.get_value_at_time(t) == p.get_value_at_time(t), 'db': it.get_value(t),
             'f1': f.get_value_at_time(1, t), 'f2': f.get_value_at_time(2, t)} for t in np.arange(a, b, step)]


def spread(fr):
    """F1、F2 的 10–90% 分位差占中位数的比例（元音段内滑动的幅度）"""
    f1 = [r['f1'] for r in fr]
    f2 = [r['f2'] for r in fr]
    return max((np.percentile(f1, 90) - np.percentile(f1, 10)) / np.median(f1),
               (np.percentile(f2, 90) - np.percentile(f2, 10)) / np.median(f2))


# 窗口起点额外跳过的帧数（10ms/帧）：schwa 截自词尾，开头 30–60ms 是前一个辅音的过渡（F1 从 640 升到 790）
SKIP = {'schwa': 3}


def windows(fr, skip=0):
    """元音窗口：从浊音、强度在峰值 12dB 以内的第一帧开始（不含送气 / h 的气流），
    结尾往前收 0–60ms（去掉滑向后一个辅音的过渡）。不追求完全平稳：
    孤立元音靠元音自身的音色变化辨认（ɛ/æ、ʌ/ɑ 只截平稳段反而会混），只去掉辅音带来的过渡"""
    peak = max(r['db'] for r in fr if r['db'] == r['db'])
    ok = [k for k, r in enumerate(fr) if r['voiced'] and r['db'] > peak - 12 and r['f1'] == r['f1']]
    if not ok:
        return []
    on, off = ok[0], ok[-1]
    out = []
    for da in range(skip, skip + 4):
        for db in (0, 2, 4, 6, 8):
            i, j = on + da, off + 1 - db
            if j - i >= 6 and all(fr[k]['voiced'] and fr[k]['f1'] == fr[k]['f1'] for k in range(i, j)):
                out.append((i, j))
    return out


def vowel_quality(path):
    """成品：开头清音时长、浊音段 F1/F2 中位数、F2 的 10–90% 分位差"""
    snd = parselmouth.Sound(path)
    it = snd.to_intensity(time_step=0.005)
    pk = max(it.values[0])
    p = snd.to_pitch(time_step=0.005)
    lead = 0
    for t in np.arange(snd.xmin + 0.005, snd.xmax, 0.005):
        db = it.get_value(t)
        if db != db or db < pk - 12:          # 淡入阶段很弱、音高检测不到，不算送气
            continue
        if p.get_value_at_time(t) == p.get_value_at_time(t):
            break
        lead += 5
    fr = [r for r in vframes(snd, snd.xmin + 0.04, snd.xmax - 0.1) if r['voiced'] and r['f1'] == r['f1']]
    f2 = [r['f2'] for r in fr]
    return {'dur': round(snd.xmax - 0.05, 2), 'lead_unvoiced_ms': lead, 'F1': int(np.median([r['f1'] for r in fr])),
            'F2': int(np.median(f2)), 'F2_spread': int(np.percentile(f2, 90) - np.percentile(f2, 10))}


def strict_vowel(sid, path):
    """严格的元音识别，返回 (准确次数, 识别结果样例)。6 种条件下，识别结果（相邻重复的记号合并——
    长元音在 CTC 里常被输出成 "ɪ ɪ"，只表示同一个音持续）必须正好是目标元音，不允许多出 h、m 之类的辅音：
    多出来的辅音说明片段里带着送气或辅音过渡"""
    x = E.load_trimmed(path)
    n, seen = 0, []
    for pad, gain in E.VARIANTS:
        toks = E.recognize(x, pad=pad, gain=gain).split()
        got = ' '.join(t for k, t in enumerate(toks) if k == 0 or t != toks[k - 1])
        n += got in E.VOWEL_OK[sid]
        seen.append(got)
    return n, '、'.join(dict.fromkeys(seen))


def clean_vowel(path):
    """识别结果里没有任何辅音（只有元音）的次数——片段不带送气和辅音过渡"""
    x = E.load_trimmed(path)
    return sum(all(t in E.VOWELS for t in E.recognize(x, pad=pad, gain=gain).split()) for pad, gain in E.VARIANTS)


def clip_spread(path):
    snd = parselmouth.Sound(path)
    fr = vframes(snd, snd.xmin, snd.xmax)
    peak = max(r['db'] for r in fr if r['db'] == r['db'])
    return float(spread([r for r in fr if r['voiced'] and r['db'] > peak - 12 and r['f1'] == r['f1']]))


def head_clip(sid):
    """git HEAD 里已验证过的版本，用 ffmpeg 解码（Praat 直接读 mp3 不处理编码器延迟）"""
    import subprocess
    mp3 = os.path.join(E.TMP, f'{sid}.head.mp3')
    with open(mp3, 'wb') as f:
        f.write(subprocess.run(['git', 'show', f'HEAD:audio/p/{sid}.mp3'], cwd=E.ROOT, capture_output=True, check=True).stdout)
    wav = mp3[:-4] + '.wav'
    E.run(['ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', wav])
    return mp3, wav


def lengthen_existing(sid, target):
    """保留原录音（含它的自然过渡），只把元音中间 60% 保持音高拉长到目标时长"""
    mp3, wav = head_clip(sid)
    snd = parselmouth.Sound(wav)
    fr = vframes(snd, snd.xmin, snd.xmax)
    peak = max(r['db'] for r in fr if r['db'] == r['db'])
    v = [r['t'] for r in fr if r['voiced'] and r['db'] > peak - 12]
    on, off = v[0], v[-1] + 0.01
    x0, x1 = on + 0.2 * (off - on), off - 0.2 * (off - on)
    factor = (target - (off - on) + (x1 - x0)) / (x1 - x0)
    if factor > 1.05:
        snd = psola(snd, x0, x1, factor)
    if np.abs(snd.values).max() > 0.95:
        snd.scale_peak(0.9)
    dest = os.path.join(E.TMP, f'{sid}.mp3')
    to_mp3(snd, dest)
    return dest, round(factor, 2)


def build_vowel(sid):
    ref, target, words = VOWELS[sid]
    r1, r2 = REF[ref]
    base_mp3, _ = head_clip(sid)
    base_spread = clip_spread(base_mp3)
    cands = []
    for order, (word, toks, idx, rate) in enumerate(words):
        _, _, bounds = E.locate(word, toks.split(), rate)
        snd = parselmouth.Sound(wav_of(word, rate))
        a, b = bounds[idx]
        fr = vframes(snd, a, b)
        for i, j in windows(fr, SKIP.get(sid, 0)):
            w = fr[i:j]
            f1, f2 = float(np.median([r['f1'] for r in w])), float(np.median([r['f2'] for r in w]))
            cands.append({'word': word, 'rate': rate, 'order': order, 'seg': [round(fr[i]['t'], 3), round(fr[j - 1]['t'] + 0.01, 3)],
                          'F1': int(f1), 'F2': int(f2), 'spread': round(float(spread(w)), 3),
                          'dist': round(float(np.hypot(np.log(f1 / r1), np.log(f2 / r2))), 3)})
    # 只考虑比原录音明显更纯（滑动至少小 0.03）的窗口；滑动小的优先（5% 分档），同档内共振峰更接近参考值的优先
    base_n, base_heard = strict_vowel(sid, base_mp3)
    if base_n >= E.PASS:      # 原录音本身合格：只考虑明显更纯（滑动至少小 0.03）的窗口
        cands = [c for c in cands if c['spread'] < base_spread - 0.03]
    if sid in ACOUSTIC_ID:     # 处在模糊区的元音：在足够平稳（滑动 ≤0.12）的窗口里，优先选最接近参考值的
        cands.sort(key=lambda c: (c['spread'] > 0.12, c['dist'], c['spread']))
    else:
        cands.sort(key=lambda c: (round(c['spread'] / 0.05), c['dist'], c['order']))
    print(f'  原录音滑动 {base_spread:.2f}、严格识别 {base_n}/6（{base_heard}）；候选窗口 {len(cands)} 个', flush=True)
    tried = []
    for c in cands[:120]:
        a, b = c['seg']
        factor = target / (b - a)
        if factor > 3.0:
            continue
        snd = parselmouth.Sound(wav_of(c['word'], c['rate'])).extract_part(a, b, parselmouth.WindowShape.RECTANGULAR, 1, False)
        snd = parselmouth.Sound(snd.values, snd.sampling_frequency)
        snd = psola(snd, 0, snd.xmax, max(1.0, factor))
        dest = os.path.join(E.TMP, f'{sid}.mp3')
        to_mp3(snd, dest, fade_in=0.025, fade_out=0.07, peak=-2)
        n, heard = strict_vowel(sid, dest)
        q = vowel_quality(dest)
        if sid in ACOUSTIC_ID:
            n = clean_vowel(dest)
            good = n >= E.PASS and nearest_vowel(q['F1'], q['F2']) == ref and q['lead_unvoiced_ms'] <= 5 and c['spread'] <= 0.12
        else:
            good = n >= E.PASS and q['lead_unvoiced_ms'] <= 5
        tried.append({**c, 'strict': n, 'heard': heard, 'acoustic': q, 'ok': good})
        if good:
            print(f"  ✓ {c['word']} r{c['rate']} {int((b - a) * 1000)}ms 滑动 {c['spread']:.2f} F1/F2 {c['F1']}/{c['F2']}  严格识别 {n}/6（{heard}）", flush=True)
            os.replace(dest, os.path.join(E.OUT, f'{sid}.mp3'))
            return {'sid': sid, 'ok': True, 'mode': 'recut', 'base_spread': round(base_spread, 3), **tried[-1]}, tried
    # 没有更纯又能被准确识别的窗口：保留原录音，只把中间部分拉长
    dest, factor = lengthen_existing(sid, target)
    n, heard = strict_vowel(sid, dest)
    q = vowel_quality(dest)
    ok = n >= E.PASS and q['lead_unvoiced_ms'] <= 5
    print(f'  没有更纯的合格窗口；原录音中段拉长 ×{factor}：严格识别 {n}/6（{heard}），开头清音 {q["lead_unvoiced_ms"]}ms', flush=True)
    if ok:
        os.replace(dest, os.path.join(E.OUT, f'{sid}.mp3'))
        return {'sid': sid, 'ok': True, 'mode': 'lengthen', 'factor': factor, 'strict': n, 'heard': heard, 'acoustic': q}, tried
    os.replace(base_mp3, os.path.join(E.OUT, f'{sid}.mp3'))
    return {'sid': sid, 'ok': False, 'note': '没有合格方案，保留原录音'}, tried


def build_glide(sid):
    target, words = GLIDES[sid]
    tried = []
    for order, (word, toks, (i0, i1), rate) in enumerate(words):
        _, _, bounds = E.locate(word, toks.split(), rate)
        wav = wav_of(word, rate)
        snd0 = parselmouth.Sound(wav)
        a, b = bounds[i0][0], bounds[i1][1]
        fr = vframes(snd0, a, b)
        peak = max(r['db'] for r in fr if r['db'] == r['db'])
        ok = [k for k, r in enumerate(fr) if r['voiced'] and r['db'] > peak - 15]
        if not ok:
            continue
        on, off = ok[0], ok[-1] + 1
        for da in (0, 1, 2):
            for db in (0, 2, 4):
                i, j = on + da, off - db
                if j - i < 10:
                    continue
                seg = (fr[i]['t'], fr[j - 1]['t'] + 0.01)
                snd = snd0.extract_part(seg[0], seg[1], parselmouth.WindowShape.RECTANGULAR, 1, False)
                snd = parselmouth.Sound(snd.values, snd.sampling_frequency)
                factor = target / (seg[1] - seg[0])
                if factor > 2.0:          # 滑动元音不宜放慢太多
                    continue
                snd = psola(snd, 0, snd.xmax, max(1.0, factor))
                dest = os.path.join(E.TMP, f'{sid}.mp3')
                to_mp3(snd, dest, fade_in=0.02, fade_out=0.06, peak=-2)
                n, heard = strict_vowel(sid, dest)
                q = vowel_quality(dest)
                good = n >= E.PASS and q['lead_unvoiced_ms'] <= 5
                row = {'word': word, 'rate': rate, 'seg': [round(v, 3) for v in seg], 'stretch': round(max(1.0, factor), 2),
                       'strict': n, 'heard': heard, 'acoustic': q, 'ok': good}
                tried.append(row)
                print(f"  {word:6s} r{rate} {int((seg[1] - seg[0]) * 1000)}ms ×{row['stretch']}  严格识别 {n}/6（{heard}）  开头清音 {q['lead_unvoiced_ms']}ms  {'✓' if good else '✗'}", flush=True)
                if good:
                    os.replace(dest, os.path.join(E.OUT, f'{sid}.mp3'))
                    return {'sid': sid, 'ok': True, 'mode': 'glide', **row}, tried
    return {'sid': sid, 'ok': False, 'note': '没有合格候选，保留原录音'}, tried


# ---------------------------------------------------------------- 辅音
def detect(sid, path):
    """辨认测试（同 refine_phonemes.detect）：6 种识别条件下目标辅音被识别出来的次数。
    只要求识别出目标辅音、不要求整段只有它——孤立的短辅音在识别模型里很容易多出幻听的音，
    连原样重新编码一次都会让严格的拼读测试从 6/6 变成 0/6。鼻音另要求不能同时听出另一个鼻音（m/n 不能混）"""
    want = CONSONANTS[sid][1]
    other = {'m': 'n', 'n': 'm'}.get(sid)
    x = E.load_trimmed(path)
    gap, v = np.zeros(int(0.01 * E.SR), np.float32), E.ref_vowel()
    n = 0
    for pad, gain in E.VARIANTS:
        if sid in ('th', 'ng'):
            test = x
        elif sid == 'zh':
            test = np.concatenate([v, gap, x])
        else:
            test = np.concatenate([x, gap, v])
        got = E.recognize(test, E.JUDGE2 if sid == 'th_v' else E.MODEL, pad, gain).split()
        n += want in got and not (other and other in got)
    return n


def acoustic(path, kind, tr):
    """声学标准（同 refine_phonemes）：清擦音只允许过渡段里有浊音；浊擦音/响音不能含元音（过渡段的元音帧不计）"""
    m = R.measure(path, kind)
    if kind == 'vl_fric':
        return m['voiced_ms'] <= tr * 1000 + 10, m
    allow = round(tr / 0.01) + 1
    return R.accept(dict(m, vowel_frames=max(0, m['vowel_frames'] - allow + 1)), kind), m


def build_consonant(sid):
    kind, _, words = CONSONANTS[sid]
    tried, best = [], None
    for word, toks, idx, rate in words:
        _, _, bounds = E.locate(word, toks.split(), rate)
        a, b = bounds[idx]
        wav = wav_of(word, rate)
        snd = parselmouth.Sound(wav)
        last = idx == len(toks.split()) - 1
        frs = R.frames(snd, a - 0.06, snd.xmax if last else b + 0.06)
        if not frs:
            continue
        floor = max(f['db'] for f in frs) - (40 if kind == 'vl_fric' else 30)
        run = R.best_run(frs, kind, floor)
        if len(run) < 4:
            print(f'  {word:7s} r{rate} 找不到辅音本体，跳过', flush=True)
            continue
        ca, cb = run[0]['t'] - 0.01, run[-1]['t'] + 0.01
        core = cb - ca
        factor = max(1.0, CORE / core)
        if factor > MAX_FACTOR_SID.get(sid, MAX_FACTOR):
            print(f'  {word:7s} r{rate} 本体只有 {int(core * 1000)}ms，跳过', flush=True)
            continue
        side = 'pre' if last else 'post'                 # 过渡加在与元音相接的一侧
        for tr in R.TRANSITIONS:
            a2, b2 = (ca - tr, cb) if side == 'pre' else (ca, cb + tr)
            a2, b2 = max(a2, 0.0), min(b2, snd.xmax)
            seg = snd.extract_part(a2, b2, parselmouth.WindowShape.RECTANGULAR, 1, False)
            seg = parselmouth.Sound(seg.values, seg.sampling_frequency)
            # 只拉长本体（两头各留 10ms 不动，避免把过渡也拉长）
            x0, x1 = ca - a2 + 0.01, cb - a2 - 0.01
            f2 = max(1.0, (CORE - 0.02) / (x1 - x0)) if factor > 1 else 1.0
            if f2 > 1:
                seg = noise_stretch(seg, x0, x1, f2) if kind == 'vl_fric' else psola(seg, x0, x1, f2)
            tmp = os.path.join(E.TMP, f'{sid}.seg.wav')
            if np.abs(seg.values).max() > 0.95:          # 重合成后可能超过满幅，存 WAV 前先压一下，免得削波
                seg.scale_peak(0.9)
            seg.save(tmp, 'WAV')
            dest = os.path.join(E.TMP, f'{sid}.cand.mp3')
            fi, fo = (max(0.015, tr), 0.02) if side == 'pre' else (0.015, max(0.02, tr))
            R.render(tmp, 0, seg.xmax, dest, TARGET_DB.get(sid, R.TARGET_DB.get(sid, R.DEFAULT_DB)), fi, fo)
            ac, m = acoustic(dest, kind, tr)
            n = detect(sid, dest)
            cand = {'word': word, 'rate': rate, 'core_ms': int(core * 1000), 'stretch': round(f2, 2), 'trans': tr,
                    'acoustic_ok': ac, 'detect': n, **m}
            tried.append(cand)
            print(f"  {word:7s} r{rate} 本体 {int(core * 1000)}ms×{f2:.1f} 过渡 {int(tr * 1000)}ms  时长 {m['dur']}s  "
                  f"声学{'合格' if ac else '不合格'}  辨认 {n}/6", flush=True)
            # 能稳定辨认（≥4/6）且声学合格的前提下：过渡越短越好，其次拉长倍数越小越好，再次辨认次数越多越好
            key = (ac, n >= 4, -tr, -round(f2, 1), n)
            if best is None or key > best[0]:
                os.replace(dest, os.path.join(E.TMP, f'{sid}.best.mp3'))
                best = (key, cand)
    if best and best[0][0] and best[0][1]:
        os.replace(os.path.join(E.TMP, f'{sid}.best.mp3'), os.path.join(E.OUT, f'{sid}.mp3'))
        return {'sid': sid, 'ok': True, **best[1]}, tried
    return {'sid': sid, 'ok': False, 'note': '没有合格候选，保留原录音'}, tried


def main(only):
    report = {r['sid']: r for r in json.load(open(REPORT))} if os.path.exists(REPORT) else {}
    for sid in list(VOWELS) + list(GLIDES) + list(CONSONANTS):
        if only and sid not in only:
            continue
        print(sid, flush=True)
        r, tried = build_vowel(sid) if sid in VOWELS else build_glide(sid) if sid in GLIDES else build_consonant(sid)
        report[sid] = {**r, 'tried': tried}
        print(('✓' if r['ok'] else '✗'), sid, r.get('note', ''), flush=True)
        json.dump(list(report.values()), open(REPORT, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
