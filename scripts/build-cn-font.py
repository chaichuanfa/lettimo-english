#!/usr/bin/env python3
"""从思源柔黑（Resource Han Rounded CN，SIL OFL 1.1）裁出网站用的中文圆体。

覆盖 400–900 字重，让正文、标题、按钮和课程名使用同一套中文圆体；
保留真实字重变化，与 Nunito 的圆润风格对齐。

输出：
  fonts/ep-rounded-a.woff2      界面与课程内容用到的字（每页都会用到）
  fonts/ep-rounded-b1..b4.woff2 词书、词典释义里额外的字，按出现频率分 4 块，用到才下载
  css/fonts-cn.css              对应的 @font-face（unicode-range 分块）

课程、词书、词典内容新增汉字后重新运行即可：
  pip install fonttools brotli
  python3 scripts/build-cn-font.py
源字体首次运行时下载到 scripts/cache/（约 16 MB 压缩包，需要 bsdtar 解 7z，macOS 自带）。
OFL 要求修改版不得使用保留字体名，所以裁剪后的字体改名为 "EP Rounded CN"。
"""
import collections
import glob
import os
import re
import subprocess
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', 'cache')
SRC_URL = 'https://github.com/CyanoHao/Resource-Han-Rounded/releases/download/v1.910/RHR-CFF2-CN-1.910.7z'
SRC = os.path.join(CACHE, 'ResourceHanRoundedCN-VF.otf')
FAMILY = 'EP Rounded CN'
PS = 'EPRoundedCN'
FEATURES = ['kern', 'locl', 'halt', 'palt']
B_CHUNKS = 4
CJK = re.compile(r'[　-〿㐀-鿿豈-﫿＀-￯]')


def source_font():
    if not os.path.exists(SRC):
        os.makedirs(CACHE, exist_ok=True)
        archive = os.path.join(CACHE, 'rhr-cn.7z')
        print('下载', SRC_URL)
        urllib.request.urlretrieve(SRC_URL, archive)
        subprocess.run(['tar', '-xf', archive, '-C', CACHE], check=True)
        os.remove(archive)
    return SRC


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def char_sets():
    files = glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True) + [os.path.join(ROOT, 'index.html')]
    # React 页面及共享模块也包含界面文字；词典/词书仍归入按需字体块。
    for extension in ('js', 'jsx', 'ts', 'tsx'):
        files += glob.glob(os.path.join(ROOT, 'src', '**', f'*.{extension}'), recursive=True)
    extra = [f for f in files if f'{os.sep}dict{os.sep}' in f or f'{os.sep}vocab{os.sep}' in f]
    ui = set()
    for f in files:
        if f not in extra:
            ui |= set(CJK.findall(read(f)))
    freq = collections.Counter()
    for f in extra:
        freq.update(CJK.findall(read(f)))
    rest = set(freq) - ui
    punct = {c for c in rest if ord(c) < 0x3400 or ord(c) >= 0xFF00}  # 标点放进常驻块
    ui |= punct
    rest -= punct
    order = sorted(rest, key=lambda c: (-freq[c], c))
    size = -(-len(order) // B_CHUNKS) if order else 0
    chunks = [('a', ''.join(sorted(ui)))]
    for i in range(B_CHUNKS):
        part = order[i * size:(i + 1) * size]
        if part:
            chunks.append((f'b{i + 1}', ''.join(sorted(part))))
    return chunks


def ranges(text):
    cps = sorted(set(map(ord, text)))
    out, start, prev = [], cps[0], cps[0]
    for c in cps[1:]:
        if c == prev + 1:
            prev = c
            continue
        out.append((start, prev))
        start = prev = c
    out.append((start, prev))
    return ', '.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in out)


def rename(font):
    for rec in font['name'].names:
        s = rec.toUnicode()
        if rec.nameID in (1, 16):
            rec.string = FAMILY
        elif rec.nameID == 4:
            rec.string = FAMILY + ' Variable'
        elif rec.nameID == 6:
            rec.string = PS + '-Variable'
        elif rec.nameID == 3:
            rec.string = PS + '-Variable; subset of Resource Han Rounded CN 1.910'
        elif rec.nameID == 25:
            rec.string = PS
        elif s.startswith('ResourceHanRoundedCNVF-'):
            rec.string = PS + '-' + s.split('-', 1)[1]


def main():
    chunks = char_sets()
    print('字数：', ', '.join(f'{n} {len(t)}' for n, t in chunks))
    base = TTFont(source_font())
    opts = subset.Options()
    opts.layout_features = FEATURES
    opts.hinting = False
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    s = subset.Subsetter(opts)
    s.populate(text=''.join(t for _, t in chunks))
    s.subset(base)
    tmp = os.path.join(CACHE, 'ep-rounded-all.otf')
    base.save(tmp)  # 先落盘再读回，CFF2 在内存里直接做实例化会出错
    base = instancer.instantiateVariableFont(TTFont(tmp), {'wght': (400, 900), 'ROND': 100})
    rename(base)
    base.save(tmp)

    for old in glob.glob(os.path.join(ROOT, 'fonts', 'ep-rounded-*.woff2')):
        os.remove(old)
    faces = []
    for name, text in chunks:
        font = TTFont(tmp)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        font.flavor = 'woff2'
        out = os.path.join(ROOT, 'fonts', f'ep-rounded-{name}.woff2')
        font.save(out)
        print(f'fonts/ep-rounded-{name}.woff2', os.path.getsize(out) // 1024, 'KB')
        # 常驻块用宽范围：每页都要用，范围外的字下载后找不到字形会自动回退到下一个字体
        rng = 'U+3000-303F, U+3400-9FFF, U+F900-FAFF, U+FF00-FFEF' if name == 'a' else ranges(text)
        faces.append(f'@font-face {{ font-family: "{FAMILY}"; font-style: normal; font-weight: 400 900; font-display: swap;\n'
                     f'  src: url("../fonts/ep-rounded-{name}.woff2") format("woff2");\n  unicode-range: {rng}; }}')
    os.remove(tmp)

    css = (
        '/* 由 scripts/build-cn-font.py 生成，不要手改。\n'
        ' * 中文圆体：思源柔黑 Resource Han Rounded CN 1.910 的子集（SIL OFL 1.1，见 fonts/OFL-ResourceHanRounded.txt），\n'
        ' * 按 OFL 要求改名为 EP Rounded CN。覆盖 400–900 字重，正文和标题统一使用圆体。\n'
        ' * 字典额外汉字按需加载；未收录的字形仍由系统字体兜底。 */\n'
        # 浏览器从后往前匹配同名规则：先查按需块，最后落到常驻块
        + '\n'.join(faces) + '\n'
    )
    with open(os.path.join(ROOT, 'css', 'fonts-cn.css'), 'w', encoding='utf-8') as f:
        f.write(css)
    print('css/fonts-cn.css', len(css) // 1024, 'KB')


if __name__ == '__main__':
    sys.exit(main())
