"""生成 PWA / 主屏幕图标（assets/icons/）：吉祥物鹦鹉放在品牌浅绿底上。

  icon-192.png、icon-512.png   purpose "any"：圆角方块底，鹦鹉占约 80%
  maskable-512.png             purpose "maskable"：满版底色，鹦鹉在中间 62% 以内（安卓自适应图标会裁成圆形等形状，安全区是中间 80% 的圆）
  apple-touch-icon.png         180×180，满版底色（iOS 自己加圆角）

素材是 assets/mascots/parrot/wave.webp（384×384），最大图 512 也基本不需要放大。
用法：python3 scripts/build-pwa-icons.py（需要 Pillow）
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'icons'
BG = (215, 255, 184, 255)       # --accent-soft #D7FFB8

src = Image.open(ROOT / 'assets/mascots/parrot/wave.webp').convert('RGBA')
parrot = src.crop(src.getchannel('A').getbbox())


def place(size, fill, radius=0.0):
    """size×size 的图：底色（radius>0 时为圆角方块，其余透明），鹦鹉按 fill（占边长比例）居中"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius), fill=255)
    img.paste(Image.new('RGBA', (size, size), BG), (0, 0), mask)
    scale = size * fill / max(parrot.size)
    p = parrot.resize((round(parrot.width * scale), round(parrot.height * scale)), Image.LANCZOS)
    img.alpha_composite(p, ((size - p.width) // 2, (size - p.height) // 2))
    return img


OUT.mkdir(parents=True, exist_ok=True)
place(192, 0.8, 0.22).save(OUT / 'icon-192.png', optimize=True)
place(512, 0.8, 0.22).save(OUT / 'icon-512.png', optimize=True)
place(512, 0.62).save(OUT / 'maskable-512.png', optimize=True)
place(180, 0.76).convert('RGB').save(OUT / 'apple-touch-icon.png', optimize=True)
print('写入', ', '.join(sorted(p.name for p in OUT.glob('*.png'))))
