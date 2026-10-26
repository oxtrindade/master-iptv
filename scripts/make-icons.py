"""Gera os ícones do app (webOS + Android + banner Android TV) com as cores da interface.
Uso: python3 scripts/make-icons.py   (requer Pillow)"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (11, 16, 26)          # #0b101a  fundo da interface
BG2 = (17, 26, 42)         # fundo um pouco mais claro (gradiente)
ACC = (58, 180, 224)       # #3ab4e0  cor de destaque
ACC_TOP = (96, 206, 240)
ACC_BOT = (40, 150, 200)
DARK = (4, 32, 44)         # #04202c  texto sobre o destaque
SS = 4                     # supersampling


def vgrad(size, top, bot):
    w, h = size
    g = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return g.resize((w, h))


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def mark(px):
    """Quadrado ciano arredondado com play escuro (a marca do menu lateral), px = lado em pixels."""
    s = px * SS
    sq = vgrad((s, s), ACC_TOP, ACC_BOT).convert('RGBA')
    sq.putalpha(rounded_mask((s, s), int(s * 0.27)))
    # triângulo do play, cantos suavizados (borra e corta no limiar)
    tri = Image.new('L', (s, s), 0)
    d = ImageDraw.Draw(tri)
    cx, cy, r = s * 0.53, s * 0.5, s * 0.25
    d.polygon([(cx - r * 0.78, cy - r * 1.0), (cx - r * 0.78, cy + r * 1.0), (cx + r * 1.0, cy)], fill=255)
    tri = tri.filter(ImageFilter.GaussianBlur(s * 0.018)).point(lambda v: 255 if v > 128 else 0)
    tri = tri.filter(ImageFilter.GaussianBlur(SS * 0.6))
    sq.paste(Image.new('RGBA', (s, s), DARK + (255,)), (0, 0), tri)
    return sq.resize((px, px), Image.LANCZOS)


def with_glow(img, strength=0.55, radius=0.07):
    w, h = img.size
    glow = Image.new('RGBA', (w, h), ACC + (0,))
    a = img.split()[3].filter(ImageFilter.GaussianBlur(w * radius)).point(lambda v: int(v * strength))
    glow.putalpha(a)
    out = Image.alpha_composite(glow, img)
    return out


def square_icon(px, shape='square', mark_ratio=0.62):
    s = px * SS
    bg = vgrad((s, s), BG2, BG).convert('RGBA')
    m = mark(int(s * mark_ratio))
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    off = (s - m.size[0]) // 2
    canvas.paste(m, (off, off), m)
    canvas = with_glow(canvas, 0.45, 0.05)
    bg = Image.alpha_composite(bg, canvas)
    if shape == 'round':
        mask = Image.new('L', (s, s), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, s - 1, s - 1], fill=255)
        bg.putalpha(mask)
    elif shape == 'rounded':
        bg.putalpha(rounded_mask((s, s), int(s * 0.22)))
    return bg.resize((px, px), Image.LANCZOS)


def foreground_layer(px):
    """Camada frontal do ícone adaptativo (108dp): a marca fica dentro da zona segura (~60%)."""
    s = px * SS
    m = mark(int(s * 0.50))
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    off = (s - m.size[0]) // 2
    canvas.paste(m, (off, off), m)
    canvas = with_glow(canvas, 0.35, 0.04)
    return canvas.resize((px, px), Image.LANCZOS)


def banner(w=320, h=180):
    s = (w * SS, h * SS)
    img = vgrad(s, BG2, BG).convert('RGBA')
    m = mark(int(s[1] * 0.50))
    canvas = Image.new('RGBA', s, (0, 0, 0, 0))
    gap = int(s[1] * 0.10)
    font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', int(s[1] * 0.30))
    tw = ImageDraw.Draw(canvas).textlength('IPTV', font=font)
    total = m.size[0] + gap + tw
    x0 = (s[0] - total) / 2
    y0 = (s[1] - m.size[1]) / 2
    canvas.paste(m, (int(x0), int(y0)), m)
    d = ImageDraw.Draw(canvas)
    d.text((x0 + m.size[0] + gap, s[1] / 2), 'IPTV', font=font, fill=(233, 238, 247, 255), anchor='lm')
    canvas = with_glow(canvas, 0.25, 0.03)
    return Image.alpha_composite(img, canvas).resize((w, h), Image.LANCZOS)


def save(img, rel, mode=None):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    (img.convert(mode) if mode else img).save(p, optimize=True)
    print('ok', rel, img.size)


# webOS (80x80 e 130x130, quadrados sem transparência)
save(square_icon(80, 'square', 0.86), 'app/icon.png', 'RGB')
save(square_icon(130, 'square', 0.86), 'app/largeIcon.png', 'RGB')

# Android: ícones legados + redondos por densidade, camada adaptativa, banner da Android TV
res = 'android/app/src/main/res/'
for name, px in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    save(square_icon(px, 'rounded', 0.60), f'{res}mipmap-{name}/ic_launcher.png')
    save(square_icon(px, 'round', 0.56), f'{res}mipmap-{name}/ic_launcher_round.png')
save(foreground_layer(432), f'{res}drawable-nodpi/ic_launcher_foreground.png')
save(banner(), f'{res}drawable-xhdpi/banner.png', 'RGB')
save(square_icon(512, 'rounded', 0.60), 'docs/icon-512.png')
