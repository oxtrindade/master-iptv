"""Gera os ícones do app (webOS + Android + banner Android TV) a partir de docs/icon-source.png.
Uso: python3 scripts/make-icons.py   (requer Pillow)"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = Image.open(os.path.join(ROOT, 'docs', 'icon-source.png')).convert('RGB')
BG = SRC.getpixel((6, 6))          # cor do canto da imagem (fundo azul-marinho)


def save(img, rel, mode=None):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    (img.convert(mode) if mode else img).save(p, optimize=True)
    print('ok', rel, img.size)


def square(px):
    return SRC.resize((px, px), Image.LANCZOS)


def circle(px):
    im = square(px).convert('RGBA')
    m = Image.new('L', (px * 4, px * 4), 0)
    ImageDraw.Draw(m).ellipse([0, 0, px * 4 - 1, px * 4 - 1], fill=255)
    im.putalpha(m.resize((px, px), Image.LANCZOS))
    return im


def foreground(px):
    """Camada frontal do ícone adaptativo (108dp): a arte fica dentro da zona segura (~64%)."""
    canvas = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    inner = int(px * 0.66)
    art = SRC.resize((inner, inner), Image.LANCZOS).convert('RGBA')
    canvas.paste(art, ((px - inner) // 2, (px - inner) // 2), art)
    return canvas


def banner(w=320, h=180):
    img = Image.new('RGB', (w, h), BG)
    art = SRC.resize((h - 16, h - 16), Image.LANCZOS)
    img.paste(art, ((w - art.size[0]) // 2, 8))
    return img


# webOS (80x80 e 130x130)
save(square(80), 'app/icon.png', 'RGB')
save(square(130), 'app/largeIcon.png', 'RGB')

# Android: ícones legados + redondos por densidade, camada adaptativa, banner da Android TV
res = 'android/app/src/main/res/'
for name, px in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    save(square(px), f'{res}mipmap-{name}/ic_launcher.png', 'RGB')
    save(circle(px), f'{res}mipmap-{name}/ic_launcher_round.png')
save(foreground(432), f'{res}drawable-nodpi/ic_launcher_foreground.png')
save(banner(), f'{res}drawable-xhdpi/banner.png', 'RGB')
save(square(512), 'docs/icon-512.png', 'RGB')

# cor de fundo do ícone adaptativo = canto da imagem
hexcolor = '#%02X%02X%02X' % BG
cp = os.path.join(ROOT, res, 'values/colors.xml')
open(cp, 'w').write('<resources>\n    <color name="app_bg">#0B101A</color>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' % hexcolor)
print('fundo adaptativo', hexcolor)
