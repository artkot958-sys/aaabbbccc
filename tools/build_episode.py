#!/usr/bin/env python3
"""
EP01 «Оно вошло» — автоматическая сборка серии.
Кадры (assets/frames) + озвучка (assets/vo, voice-00) + синтез SFX/эмбиент
-> 1920x1080 16:9 H.264 MP4 с Ken Burns-анимацией, HUD и субтитрами.

Запуск: .venv/bin/python tools/build_episode.py
"""
import subprocess, sys, math, textwrap, os, wave, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
FRAMES = ROOT / "assets" / "frames"
VO = ROOT / "assets" / "vo"
WORK = ROOT / "assets" / "video" / "segments"
OUT = ROOT / "assets" / "video"
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)

FFMPEG = None
try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG = "ffmpeg"

W, H, FPS = 1920, 1080, 24
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
SR = 44100

def f(name):
    return FONT_MONO if "mono" in name else FONT_BOLD

# ---------------------------------------------------------------- audio decode
def decode_vo(path: Path) -> np.ndarray:
    p = subprocess.run([FFMPEG, "-v", "error", "-i", str(path), "-f", "f32le",
                        "-ac", "1", "-ar", str(SR), "pipe:1"],
                       stdout=subprocess.PIPE, check=True)
    x = np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)
    peak = np.max(np.abs(x)) or 1.0
    return x / peak * 0.82  # нормализация реплик

# ---------------------------------------------------------------- sfx synth
def pink_noise(n):
    white = np.random.default_rng(7).standard_normal(n)
    # простой розовый шум: интегральный фильтр 1-го порядка
    b = np.zeros(n)
    acc = 0.0
    a = 0.02
    for i in range(n):
        acc = a * white[i] + (1 - a) * acc
        b[i] = acc
    b /= (np.std(b) + 1e-9)
    return b

def low_sine(n, freq, amp, wobble=0.0):
    t = np.arange(n) / SR
    w = 1.0 + wobble * np.sin(2 * np.pi * 0.13 * t)
    return amp * np.sin(2 * np.pi * freq * t) * w

def thump(n, at, freq=62, amp=0.9, decay=0.32):
    """Низкий удар (шаги зомби, вздрагивания)."""
    start = int(at * SR)
    length = int(decay * 3 * SR)
    if start >= n: return np.zeros(n)
    length = min(length, n - start)
    t = np.arange(length) / SR
    env = np.exp(-t / decay)
    sig = amp * env * np.sin(2 * np.pi * freq * t)
    out = np.zeros(n); out[start:start+length] = sig
    return out

def metallic_clank(n, at, amp=0.55):
    """Кастрюля."""
    start = int(at * SR); length = int(1.4 * SR)
    if start >= n: return np.zeros(n)
    length = min(length, n - start)
    t = np.arange(length) / SR
    out = np.zeros(n)
    for frq, a in [(513, .5), (811, .4), (1267, .3), (2013, .22), (3110, .12)]:
        out[start:start+length] += amp * a * np.exp(-t / 0.55) * np.sin(2 * np.pi * frq * t)
    out[start:start+length] += amp * 0.5 * np.exp(-t / 0.03) * np.random.default_rng(3).standard_normal(length)
    return out

def glass_crunch(n, at, amp=0.5):
    """Хруст стекла — серия коротких щелчков."""
    rng = np.random.default_rng(11)
    out = np.zeros(n)
    t0 = int(at * SR)
    for k in range(7):
        start = t0 + int(k * (0.045 + rng.random() * 0.05) * SR)
        length = int(0.02 * SR)
        if start + length >= n: break
        t = np.arange(length) / SR
        env = np.exp(-t / 0.006)
        frq = rng.uniform(1800, 5200)
        out[start:start+length] += amp * env * np.sin(2 * np.pi * frq * t)
        out[start:start+length] += amp * 0.6 * env * rng.standard_normal(length)
    return out

def wood_crack(n, at, amp=0.7):
    """Треск дерева."""
    start = int(at * SR); length = int(0.22 * SR)
    out = np.zeros(n)
    if start >= n: return out
    length = min(length, n - start)
    t = np.arange(length) / SR
    out[start:start+length] += amp * np.exp(-t / 0.05) * (np.sin(2 * np.pi * 95 * t)
        + 0.7 * np.random.default_rng(5).standard_normal(length))
    return out

def door_crash(n, at, amp=0.8):
    start = int(at * SR); length = int(1.9 * SR)
    out = np.zeros(n)
    if start >= n: return out
    length = min(length, n - start)
    t = np.arange(length) / SR
    out[start:start+length] += amp * np.exp(-t / 0.28) * np.sin(2 * np.pi * 55 * t)
    out[start:start+length] += amp * 0.65 * np.exp(-t / 0.11) * np.random.default_rng(9).standard_normal(length).cumsum() * 0.18
    return out

def radio_burst(n, at, dur, amp=0.22, seed=21):
    """Треск/голос радио — полосовой шум с амплитудной и гребёнчатой маской."""
    start = int(at * SR); length = min(int(dur * SR), n - start)
    if length <= 0: return np.zeros(n)
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(length)
    # узкополосный "голос": сумма синусоид под медленно дрейфующей огибающей
    t = np.arange(length) / SR
    formant = (np.sin(2 * np.pi * 220 * t + 3 * np.sin(2 * np.pi * 3.1 * t))
               * (1 + 0.7 * np.sin(2 * np.pi * 5.3 * t)))
    env = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 1.7 * t + 1))
    sig = amp * (0.55 * formant * env + 0.45 * noise * 0.4)
    out = np.zeros(n); out[start:start+length] = sig
    return out

def sub_drop(n, at, amp=1.0):
    """Финальный суббас-удар: свип 48->30 Гц."""
    start = int(at * SR); length = min(int(3.4 * SR), n - start)
    if length <= 0: return np.zeros(n)
    t = np.arange(length) / SR
    frq = 48 - 18 * (t / (length / SR)) ** 1.6
    phase = 2 * np.pi * np.cumsum(frq) / SR
    env = np.exp(-t / 1.6)
    out = np.zeros(n); out[start:start+length] = amp * env * np.sin(phase)
    return out

def heartbeat(n, intensity, bpm=54):
    """Двойной удар сердца; intensity 0..1."""
    if intensity <= 0.01: return np.zeros(n)
    out = np.zeros(n)
    period = 60.0 / bpm
    t = 0.0
    while t < n / SR:
        out += thump(n, t, freq=58, amp=0.5 * intensity, decay=0.16)
        out += thump(n, t + 0.19, freq=52, amp=0.34 * intensity, decay=0.13)
        t += period
    return out

def bandage_tear(n, at, amp=0.3):
    start = int(at * SR); length = min(int(0.35 * SR), n - start)
    if length <= 0: return np.zeros(n)
    rng = np.random.default_rng(13)
    t = np.arange(length) / SR
    env = np.abs(np.sin(2 * np.pi * 31 * t)) * np.exp(-t / 0.16)
    out = np.zeros(n); out[start:start+length] = amp * env * rng.standard_normal(length)
    return out

def groan(n, at, amp=0.35):
    """Дальний стон — низкий воющий тон."""
    start = int(at * SR); length = min(int(2.6 * SR), n - start)
    if length <= 0: return np.zeros(n)
    t = np.arange(length) / SR
    frq = 82 + 18 * np.sin(2 * np.pi * 0.7 * t)
    phase = 2 * np.pi * np.cumsum(frq) / SR
    env = np.sin(np.pi * np.clip(t / (length / SR), 0, 1)) ** 1.5
    out = np.zeros(n)
    out[start:start+length] = amp * env * (0.8 * np.sin(phase) + 0.25 * np.sin(2 * phase))
    return out

def bottle_gulp(n, at, amp=0.3):
    rng = np.random.default_rng(17)
    out = np.zeros(n)
    t0 = int(at * SR)
    for k in range(3):
        start = t0 + int(k * 0.17 * SR); length = int(0.09 * SR)
        if start + length >= n: break
        t = np.arange(length) / SR
        frq = 300 + 120 * np.sin(2 * np.pi * 9 * t + k)
        out[start:start+length] += amp * np.exp(-t / 0.05) * np.sin(2 * np.pi * frq * t)
    return out

# ---------------------------------------------------------------- сцены
# caption — текст для субтитров; hud — состояние HUD; sfx — события (функция, доля от длины реплики)
SCENES = [
    dict(key="sc01", img="sc01.jpg", vo="sc01.mp3", dur_tail=1.1, hb=0.00, clock="16:50", dark=False,
         hp=82, boards=3, planks=3, bandages=2, water="0.5 л", food=None, torch=True, flash=True,
         caption="Третий день в подвале. Давай честно посчитаем: доски — три. Топор ржавый. Факел один. Воды полбутылки. Бинтов два. До темноты минут двадцать.",
         choice=False,
         sfx=[("groan", 0.86)]),
    dict(key="sc02", img="sc02.jpg", vo="sc02.mp3", dur_tail=1.0, hb=0.50, clock="17:05", dark=False,
         hp=82, planks=3, bandages=2, water="0.5 л", torch=True, flash=True,
         caption="Ветер не поднимает кастрюлю и не несёт её через кухню. Правило номер один: они идут на звук. Ты — самая тихая точка во всей этой истории.",
         choice=False,
         sfx=[("metallic_clank", 0.16), ("groan", 0.55)]),
    dict(key="sc03", img="sc03.jpg", vo="sc03.mp3", dur_tail=1.0, hb=0.60, clock="17:15", dark=False,
         hp=74, planks=3, bandages=1, water="0.5 л", torch=True, flash=False,
         caption="ТОЧКА ВЫБОРА №1 — СВЕТ ПРОТИВ ТЬМЫ. Выбор сделан: тьма. Стена… полка… ящик. Тушенка и открывалка. И под ботинком — хруст.",
         choice=True,
         sfx=[("glass_crunch", 0.82), ("bandage_tear", 0.90)]),
    dict(key="sc04", img="sc04.jpg", vo="sc04.mp3", dur_tail=1.0, hb=0.70, clock="17:25", dark=True,
         hp=74, planks=1, bandages=1, water="0.5 л", torch=True, flash=False,
         caption="Две доски — диагональ под крышкой. Упор в бревно. Раз. Два. Трещина по волокну — и крышка стоит. Доски: одна.",
         choice=False,
         sfx=[("wood_crack", 0.62)]),
    dict(key="sc05", img="sc05.jpg", vo="sc05.mp3", dur_tail=1.0, hb=0.40, clock="17:35", dark=True,
         hp=74, planks=1, bandages=1, water="0.5 л", torch=True, flash=False,
         caption="Банка в кармане тянет так, что сводит зубы. Щелчок открывалки — и он у люка через десять секунд. Еды нет.",
         choice=False,
         sfx=[("door_crash", 0.30)]),
    dict(key="sc06", img="sc04.jpg", vo="sc06.mp3", dur_tail=1.0, hb=0.80, clock="17:42", dark=True,
         hp=74, planks=1, bandages=1, water="0.4 л", torch=True, flash=False, food=0,
         caption="ТОЧКА ВЫБОРА №2 — БАНКА ИЛИ ТИШИНА. Выбор сделан: банка летит. Он уходит к звуку. Тушенка — 0. Доски — одна.",
         choice=True,
         sfx=[("wood_crack", 0.20), ("metallic_clank", 0.76), ("door_crash", 0.84)]),
    dict(key="sc07", img="sc07.jpg", vo="sc07.mp3", dur_tail=1.1, hb=0.35, clock="17:48", dark=True,
         hp=74, planks=1, bandages=1, water="0.4 л", torch=True, flash=False,
         caption="«Всем, кто нас слышит. Колонна со склада Юг уходит завтра в 04:30, от заправки на трассе. Повторяю: 04:30, заправка Юг…»",
         choice=False,
         sfx=[("radio_burst", 0.28, 1.6), ("radio_burst", 0.52, 1.1), ("bottle_gulp", 0.90)]),
    dict(key="sc08", img="sc08.jpg", vo="sc08.mp3", dur_tail=1.0, hb=0.90, clock="17:53", dark=True,
         hp=74, planks=1, bandages=1, water="0.2 л", torch=True, flash=False,
         caption="Снаружи хрустнула гниль. Он шёл на твой хруст стекла — всё это время. HP 74 · Воды на дне · Бинт 1 · Доски 1 · Еды 0.",
         choice=False,
         sfx=[("wood_crack", 0.14), ("groan", 0.38)]),
    dict(key="sc09", img="sc09.jpg", vo="sc09.mp3", dur_tail=1.2, hb=0.85, clock="17:56", dark=True,
         hp=74, planks=1, bandages=1, water="0.2 л", torch=True, flash=False,
         caption="Над люком — второй. За окошком — один. Между ними — ты, одна доска и ржавый топор. Радио шепчет: 04:30…",
         choice=False,
         sfx=[("wood_crack", 0.10), ("thump", 0.55, 70, 0.5, 0.25), ("radio_burst", 0.78, 1.0)]),
    dict(key="fin", img="fin.jpg", vo="fin.mp3", dur_tail=2.2, hb=0.00, clock="17:58", dark=True,
         hp=74, planks=1, bandages=1, water="0.2 л", torch=True, flash=False, final=True,
         caption="ФИНАЛЬНЫЙ ВЫБОР: А — ночь и лес · Б — прорыв через кухню · В — старый лаз за стеллажом. Пиши А, Б или В в комментариях.",
         choice=True,
         sfx=[("sub_drop", 1.02)]),
]
TITLE_DUR = 3.8
END_DUR = 6.4

# ------------------------------------------------------------------ HUD render
def chip(draw, xy, w, icon_draw, label, border=(216, 178, 106)):
    x, y = xy
    h = 44
    draw.rounded_rectangle([x, y, x + w, y + h], radius=6, fill=(10, 10, 12, 200),
                           outline=border, width=2)
    icon_draw(draw, (x + 10, y + 9))
    draw.text((x + 42, y + 9), label, font=ImageFont.truetype(FONT_MONO, 22),
              fill=(240, 234, 220, 255))

def icon_plank(draw, o):
    x, y = o
    draw.rectangle([x, y + 8, x + 26, y + 16], fill=(150, 98, 52, 255), outline=(70, 40, 18, 255))
    draw.rectangle([x + 2, y + 11, x + 24, y + 13], fill=(110, 68, 34, 255))

def icon_torch(draw, o):
    x, y = o
    draw.rectangle([x + 9, y + 10, x + 15, y + 26], fill=(120, 76, 40, 255))
    draw.pieslice([x + 2, y - 4, x + 22, y + 14], 180, 360, fill=(255, 176, 46, 255))
    draw.ellipse([x + 8, y - 2, x + 16, y + 8], fill=(255, 226, 120, 255))

def icon_axe(draw, o):
    x, y = o
    draw.rectangle([x + 10, y + 2, x + 15, y + 28], fill=(96, 60, 32, 255))
    draw.polygon([(x + 3, y), (x + 17, y), (x + 11, y + 12)], fill=(154, 158, 166, 255),
                 outline=(60, 62, 70, 255))

def icon_bottle(draw, o):
    x, y = o
    draw.rounded_rectangle([x + 6, y + 6, x + 20, y + 28], radius=4, fill=(70, 130, 180, 255),
                           outline=(30, 60, 90, 255))
    draw.rectangle([x + 9, y, x + 17, y + 7], fill=(120, 120, 120, 255))

def icon_bandage(draw, o):
    x, y = o
    draw.ellipse([x + 1, y + 5, x + 19, y + 23], fill=(228, 224, 210, 255), outline=(120, 116, 100, 255))
    draw.ellipse([x + 7, y + 11, x + 13, y + 17], fill=(160, 150, 130, 255))

def make_hud(sc):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # HP-бар (10 сегментов, террария-стиль)
    bx, by, bw, bh = 28, 26, 300, 40
    d.rounded_rectangle([bx - 6, by - 6, bx + bw + 6, by + bh + 6], radius=8,
                        fill=(8, 8, 10, 205), outline=(216, 178, 106, 255), width=3)
    seg = (bw - 18) // 10
    hp = sc.get("hp", 100)
    fill = int(math.ceil(hp / 10.0))
    for i in range(10):
        sx = bx + 9 + i * (seg + 1)
        on = i < fill
        d.rectangle([sx, by + 6, sx + seg - 2, by + bh - 6],
                    fill=(200, 40, 40, 255) if on else (46, 20, 20, 255))
    d.text((bx + 2, by + bh + 10), f"HP {hp}/100", font=ImageFont.truetype(FONT_MONO, 20),
           fill=(240, 234, 220, 235))
    # Часы по центру (короткая подпись — не сталкивается с чипами инвентаря)
    clock = sc.get("clock", "")
    label = clock
    tw = d.textlength(label, font=ImageFont.truetype(FONT_MONO, 26))
    d.rounded_rectangle([W/2 - tw/2 - 18, 22, W/2 + tw/2 + 18, 66], radius=8,
                        fill=(8, 8, 10, 205), outline=(216, 178, 106, 255), width=3)
    d.text((W/2 - tw/2, 31), label, font=ImageFont.truetype(FONT_MONO, 26), fill=(240, 234, 220, 255))
    # Инвентарь справа: доски/факел/топор/вода/бинт
    chips = []
    chips.append((icon_plank, f"x{sc.get('planks', 0)}", 150))
    chips.append((icon_torch, "x1" if sc.get("torch") else "x0", 150))
    chips.append((icon_axe, "x1", 150))
    chips.append((icon_bottle, sc.get("water", ""), 168))
    chips.append((icon_bandage, f"x{sc.get('bandages', 0)}", 150))
    if sc.get("food") == 0:
        chips.append((icon_plank, "ЕДА 0", 158))
    x = W - 28
    for icon, lab, wchip in reversed(chips):
        x -= wchip + 8
        chip(d, (x, 24), wchip, icon, lab)
    # Если финальная сцена — красный «04:30» вместо часов
    if sc.get("final"):
        t = "04:30"
        tw = d.textlength(t, font=ImageFont.truetype(FONT_MONO, 54))
        d.text((W/2 - tw/2, 84), t, font=ImageFont.truetype(FONT_MONO, 54), fill=(255, 70, 60, 255))
    return img

def make_caption(text, accent=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_BOLD, 29)
    lines = textwrap.wrap(text, width=64)
    lh = 38
    tw = max(d.textlength(ln, font=font) for ln in lines)
    box_w = int(tw) + 64
    box_h = len(lines) * lh + 34
    x0 = (W - box_w) // 2
    y0 = H - box_h - 34
    d.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h], radius=10,
                        fill=(5, 5, 8, 205),
                        outline=(255, 196, 77, 255) if accent else (70, 70, 78, 255),
                        width=3 if accent else 2)
    if accent:
        d.text((x0 + 16, y0 - 18), " ВЫБОР ", font=ImageFont.truetype(FONT_MONO, 19),
               fill=(20, 14, 4, 255), stroke_width=2, stroke_fill=(255, 196, 77, 255))
    ty = y0 + 16
    for ln in lines:
        lw = d.textlength(ln, font=font)
        d.text((x0 + (box_w - lw) / 2, ty), ln, font=font, fill=(245, 242, 232, 255))
        ty += lh
    return img

def make_vignette():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([-W * 0.25, -H * 0.35, W * 1.25, H * 1.35], fill=(0, 0, 0, 0))
    # радиальная виньетка через размытые кольца
    base = Image.new("L", (W, H), 0)
    bd = ImageDraw.Draw(base)
    for i, (pad, alpha) in enumerate([(0.30, 60), (0.18, 95), (0.08, 130)]):
        bd.ellipse([W * pad, H * pad * 1.15, W * (1 - pad), H * (1 - pad * 1.15)], fill=alpha)
    base = base.filter(ImageFilter.GaussianBlur(120))
    black = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    img = Image.composite(black, img, base.point(lambda v: v))
    return img

def text_card(lines, big=None, sub=None):
    img = Image.new("RGB", (W, H), (4, 4, 6))
    d = ImageDraw.Draw(img)
    if big:
        f1 = ImageFont.truetype(FONT_MONO, 170)
        tw = d.textlength(big, font=f1)
        d.text(((W - tw) / 2, H * 0.30), big, font=f1, fill=(255, 70, 60))
    y = H * 0.62 if big else H * 0.30
    for txt, size, color in lines:
        f2 = ImageFont.truetype(FONT_MONO, size)
        tw = d.textlength(txt, font=f2)
        d.text(((W - tw) / 2, y), txt, font=f2, fill=color)
        y += size + 26
    return img.convert("RGB")

# ------------------------------------------------------------ рендер сегмента
def ken_burns(idx, dur):
    """Параметры Ken Burns по номеру сцены: медленный зум + дрейф."""
    n = int(round(dur * FPS))
    zmax = 1.10
    speed = (zmax - 1.0) / n
    variants = [
        (f"min(1.0+{speed:.7f}*on,{zmax})", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"),  # центр, зум внутрь
        (f"min(1.0+{speed:.7f}*on,{zmax})", "0", "ih/2-(ih/zoom/2)"),                # дрейф влево
        (f"min(1.0+{speed:.7f}*on,{zmax})", "iw-iw/zoom", "ih/2-(ih/zoom/2)"),       # дрейф вправо
        (f"min(1.0+{speed:.7f}*on,{zmax})", "iw/2-(iw/zoom/2)", "0"),                # вверх
        (f"min(1.0+{speed:.7f}*on,{zmax})", "iw/2-(iw/zoom/2)", "ih-ih/zoom"),       # вниз
    ]
    z, x, y = variants[idx % len(variants)]
    return n, f"zoompan=z='{z}':x='{x}':y='{y}':d={n}:s={W}x{H}:fps={FPS}"

def render_segment(key, img_path, vo_len, tail, hud_png, cap_png, vig_png, out_path, kb_index=0):
    dur = vo_len + tail
    n, zoom = ken_burns(kb_index, dur)
    # три луп-слоя оверлея: рендер обрежется по -t; eof overlay-repeat не нужен
    filter_complex = (
        f"[0:v]scale=2560:1440:flags=lanczos,{zoom},"
        f"fade=in:st=0:d=0.4,fade=out:st={max(0.0, dur - 0.4):.2f}:d=0.4[base];"
        f"[base][1:v]overlay=0:0[b1];"
        f"[b1][2:v]overlay=0:0[b2];"
        f"[b2][3:v]overlay=0:0,format=yuv420p[v]"
    )
    cmd = [FFMPEG, "-y", "-i", str(img_path), "-loop", "1", "-framerate", str(FPS), "-i", str(hud_png),
           "-loop", "1", "-framerate", str(FPS), "-i", str(cap_png),
           "-loop", "1", "-framerate", str(FPS), "-i", str(vig_png),
           "-filter_complex", filter_complex, "-map", "[v]",
           "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-r", str(FPS),
           "-t", f"{dur:.3f}", str(out_path)]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return dur

def render_card(img_path, dur, out_path, zoom_in=True):
    n = int(round(dur * FPS))
    if zoom_in:
        zoom = f"zoompan=z='min(1.0+{0.055/n:.7f}*on,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"
    else:
        zoom = f"zoompan=z='if(eq(on,0),1.06,max(1.06-{0.06/n:.7f}*on,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}"
    vf = f"scale=2560:1440:flags=lanczos,{zoom},fade=in:st=0:d=0.5,fade=out:st={dur-0.5:.2f}:d=0.5,format=yuv420p"
    cmd = [FFMPEG, "-y", "-i", str(img_path), "-vf", vf, "-an",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-r", str(FPS),
           "-t", f"{dur:.3f}", str(out_path)]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

# --------------------------------------------------------------- сборка audio
def build_master(timeline):
    """timeline: список (kind, payload, start, dur). Возвращает стерео-массив float64."""
    total = int((timeline[-1][2] + timeline[-1][3]) * SR) + SR
    mixL = np.zeros(total); mixR = np.zeros(total)

    def add(sig, at, pan=0.0, gain=1.0):
        s = int(at * SR); L = min(len(sig), total - s)
        if L <= 0: return
        mono = sig[:L] * gain
        mixL[s:s+L] += mono * math.cos((pan + 1) * math.pi / 4)
        mixR[s:s+L] += mono * math.sin((pan + 1) * math.pi / 4)

    # Дрон + ветер на всю длину
    drone = low_sine(total, 48, 0.05, wobble=1.0) + low_sine(total, 96, 0.018)
    wind = pink_noise(total)
    from numpy import convolve, ones
    wind = np.convolve(wind, ones(240) / 240, mode="same") * 0.016
    add(drone + wind, 0.0, gain=1.0)

    for kind, payload, start, dur in timeline:
        if kind == "scene":
            sc = payload
            vo = decode_vo(VO / sc["vo"])
            add(vo, start, gain=0.95)
            add(heartbeat(total - int(start * SR) + SR * 2, sc.get("hb", 0), bpm=54)[:total], start, gain=1.0)
            for ev in sc.get("sfx", []):
                name = ev[0]
                at = start + ev[1] * (len(vo) / SR)
                if name == "thump":
                    add(thump(total, at, freq=ev[2], amp=ev[3], decay=ev[4]), 0)
                elif name == "metallic_clank": add(metallic_clank(total, at), 0)
                elif name == "glass_crunch": add(glass_crunch(total, at), 0)
                elif name == "bandage_tear": add(bandage_tear(total, at), 0)
                elif name == "wood_crack": add(wood_crack(total, at), 0)
                elif name == "door_crash": add(door_crash(total, at), 0)
                elif name == "radio_burst": add(radio_burst(total, at, ev[2] if len(ev) > 2 else 1.2), 0)
                elif name == "bottle_gulp": add(bottle_gulp(total, at), 0)
                elif name == "groan": add(groan(total, at), 0)
                elif name == "sub_drop": add(sub_drop(total, at), 0)
        elif kind == "end":
            add(thump(total, start + 0.35, freq=48, amp=0.9, decay=1.2), 0)
            add(radio_burst(total, start + 2.2, 1.4, amp=0.10, seed=33), 0)

    peak = max(np.max(np.abs(mixL)), np.max(np.abs(mixR)), 1e-9)
    mixL = mixL / peak * 0.89; mixR = mixR / peak * 0.89
    stereo = np.stack([mixL, mixR], axis=-1)
    pcm = (stereo * 32767).astype(np.int16)
    return pcm

def write_wav(path, pcm):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

# --------------------------------------------------------------------- main
def main():
    print("== EP01 build ==")
    skip_render = os.environ.get("EP01_SKIP_RENDER") == "1"
    only = set(filter(None, os.environ.get("EP01_ONLY", "").split(",")))
    def want(key):
        return (not skip_render) or (key in only)
    vig_png = OUT / "vignette.png"
    make_vignette().save(vig_png)

    # 1) длительности VO
    vo_lens = []
    for sc in SCENES:
        info = subprocess.run([FFMPEG, "-i", str(VO / sc["vo"])],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE).stderr.decode()
        # fallback: декодируем и считаем сэмплы
        vo_lens.append(len(decode_vo(VO / sc["vo"])) / SR)

    # 2) рендер карточек и сегментов
    def card_title():
        img = text_card(
            [("« Т Р Е Т И Й   Д Е Н Ь »", 84, (240, 234, 220)),
             ("С Е Р И Я   1  ·  « О Н О   В О Ш Л О »", 34, (216, 178, 106)),
             ("интерактивное зомби-выживание · 2-е лицо", 24, (130, 130, 138))],
        )
        return img

    def card_end():
        img = text_card(
            [("С Е Р И Я   2", 44, (216, 178, 106)),
             ("А — ночь и лес   ·   Б — прорыв через кухню   ·   В — старый лаз", 26, (200, 196, 185)),
             ("Пиши «А», «Б» или «В» в комментариях — выбери, как он выберется", 26, (200, 196, 185))],
            big="04:30")
        return img

    title_png = OUT / "card_title.png"
    end_png = OUT / "card_end.png"
    if want("cards"):
        card_title().save(title_png)
        card_end().save(end_png)

    segments = []
    t_title = OUT / "seg_title.mp4"
    if want("title"):
        print("· рендер титула")
        render_card(title_png, TITLE_DUR, t_title, zoom_in=True)
    segments.append(t_title)

    t = TITLE_DUR
    timeline = [("title", None, 0.0, TITLE_DUR)]
    for i, sc in enumerate(SCENES):
        vo_len = vo_lens[i]
        dur = vo_len + sc["dur_tail"]
        out_mp4 = WORK / f"seg_{sc['key']}.mp4"
        if want(sc["key"]):
            hud_png = OUT / f"hud_{sc['key']}.png"
            cap_png = OUT / f"cap_{sc['key']}.png"
            make_hud(sc).save(hud_png)
            make_caption(sc["caption"], accent=sc.get("choice", False)).save(cap_png)
            print(f"· сегмент {sc['key']} ({dur:.1f}s)")
            render_segment(sc["key"], FRAMES / sc["img"], vo_len, sc["dur_tail"],
                           hud_png, cap_png, vig_png, out_mp4, kb_index=i)
        else:
            print(f"· сегмент {sc['key']}: беру готовый ({dur:.1f}s)")
        segments.append(out_mp4)
        timeline.append(("scene", sc, t, dur))
        t += dur
    t_end = OUT / "seg_end.mp4"
    if want("end"):
        print("· рендер финальной карточки")
        render_card(end_png, END_DUR, t_end, zoom_in=False)
    segments.append(t_end)
    timeline.append(("end", None, t, END_DUR))
    t += END_DUR

    # 3) master audio
    print("· синтез аудио (дрон/сердце/SFX)…")
    pcm = build_master(timeline)
    wav_path = OUT / "master.wav"
    write_wav(wav_path, pcm)
    print(f"  audio: {len(pcm) / SR:.1f}s")

    # 4) concat видео
    list_file = OUT / "concat.txt"
    with open(list_file, "w") as fh:
        for s in segments:
            fh.write(f"file '{s.resolve()}'\n")
    concat_mp4 = OUT / "ep01_video_only.mp4"
    subprocess.run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
                    "-c", "copy", str(concat_mp4)], check=True)

    # 5) финальный мукс + faststart
    final_mp4 = OUT / "EP01_ono-voshlo.mp4"
    subprocess.run([FFMPEG, "-y", "-i", str(concat_mp4), "-i", str(wav_path),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                    "-shortest", "-movflags", "+faststart", str(final_mp4)], check=True)
    size_mb = final_mp4.stat().st_size / 1e6
    print(f"== DONE: {final_mp4} ({size_mb:.1f} MB, ~{t:.1f}s) ==")

if __name__ == "__main__":
    main()
