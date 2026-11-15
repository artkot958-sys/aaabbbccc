#!/usr/bin/env python3
"""
EP01 «Оно вошло» — покадровая анимация серии (не слайдшоу!).

Движение камеры, партиклы (пыль/искры/земля/дым), мерцание огня и света,
тряски при звуковых событиях, HP-drain анимация, радиоволна, дым из трубы,
мерцание звёзд, мерцающий финал 04:30 — всё отрисовывается процедурно
кадр за кадром и пипается напрямую в ffmpeg как rawvideo.

Запуск: .venv/bin/python tools/animate_episode.py
Вход:  assets/frames/*.jpg + assets/video/master.wav (из build_episode.py)
Выход: assets/video/EP01_ono-voshlo.mp4 (перезапись)
"""
import math, sys, os, wave, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from build_episode import (SCENES, TITLE_DUR, END_DUR, W, H, FPS, SR,
                           decode_vo, make_hud, make_caption, FFMPEG)

FRAMES = ROOT / "assets" / "frames"
WORK = ROOT / "assets" / "video"
WORK.mkdir(parents=True, exist_ok=True)
BASE_W, BASE_H = 2560, 1440
DIP = 0.16  # длительность дим-стэка между сценами, с

# ------------------------------------------------------------ координаты эффектов (доли кадра)
# flame: (x, y, r) — источники огня для мерцания/искр; hatch: (x0,x1,y) — откуда сыплется пыль от люка;
# shaft: (x0,y0,x1,y1) — световой луч для motes; wave: (x0,x1,yc) — радиоволна
FX = {
    "sc01": dict(flames=[], dust_shafts=[(0.30, 0.60, 0.47, 0.88)], drips=[],
                 shots=[(0.50, 0.44, 1.00, 1.09), (0.70, 0.28, 1.30, 1.42), (0.42, 0.30, 1.55, 1.70),
                        (0.46, 0.72, 1.25, 1.36), (0.36, 0.72, 1.55, 1.68), (0.66, 0.70, 2.00, 2.15),
                        (0.22, 0.46, 1.65, 1.80), (0.60, 0.56, 1.85, 2.00)],
                 silhouettes=[dict(kind="walker", y=0.463, h=0.055, x_from=0.78, x_to=0.05, t0=0.05, t1=0.97)]),
    "sc02": dict(flames=[], dust_shafts=[(0.20, 0.22, 0.40, 0.85)],
                 drips=[(0.555, 0.645, 0.605, 1.6)],
                 shakes=[(0.16, 10.0, 0.75), (0.72, 4.0, 0.4)],
                 shots=[(0.50, 0.44, 1.00, 1.10), (0.81, 0.27, 1.70, 1.82), (0.66, 0.52, 2.00, 2.12),
                        (0.32, 0.45, 1.45, 1.58), (0.28, 0.66, 2.05, 2.20), (0.58, 0.62, 2.15, 2.30),
                        (0.13, 0.21, 1.80, 1.95), (0.75, 0.62, 1.80, 1.92)]),
    "sc03": dict(flames=[], dust_shafts=[(0.44, 0.38, 0.70, 0.62)],
                 darkness=(0.10, 0.9, 0.62),           # кадр темнеет к сцене с убийством фонарика
                 shakes=[(0.82, 7.0, 0.5)],
                 flash_hp=(0.80, 0.86),                # красная вспышка + HP 82->74
                 redpulse_from=0.80,
                 shots=[(0.50, 0.52, 1.00, 1.14), (0.68, 0.55, 2.05, 2.20), (0.88, 0.67, 1.90, 2.02),
                        (0.48, 0.42, 1.60, 1.74), (0.64, 0.71, 2.20, 2.35), (0.75, 0.87, 2.15, 2.30),
                        (0.13, 0.42, 2.00, 2.15), (0.50, 0.37, 1.70, 1.84)]),
    "sc04": dict(flames=[(0.325, 0.875, 60)], dust_shafts=[(0.42, 0.38, 0.60, 0.60)],
                 drips=[(0.44, 0.57, 0.415, 2.2)],
                 shakes=[(0.62, 9.0, 0.65), (0.90, 5.0, 0.4)],
                 shots=[(0.50, 0.46, 1.00, 1.10), (0.49, 0.20, 1.55, 1.70), (0.50, 0.42, 1.90, 2.05),
                        (0.55, 0.47, 2.05, 2.20), (0.33, 0.88, 1.85, 2.00), (0.52, 0.57, 2.15, 2.30),
                        (0.17, 0.33, 1.65, 1.78), (0.73, 0.62, 1.75, 1.90)]),
    "sc05": dict(flames=[(0.258, 0.775, 55)], dust_shafts=[],
                 drips=[(0.585, 0.625, 0.365, 1.3)],
                 shakes=[(0.30, 5.0, 0.4)], bob=3.0,
                 shots=[(0.50, 0.46, 1.00, 1.10), (0.66, 0.24, 1.60, 1.74), (0.60, 0.34, 2.00, 2.14),
                        (0.60, 0.69, 2.05, 2.20), (0.36, 0.81, 2.10, 2.25), (0.26, 0.77, 1.90, 2.05),
                        (0.79, 0.76, 1.80, 1.94), (0.30, 0.25, 1.70, 1.85)]),
    "sc06": dict(flames=[(0.325, 0.875, 60)], dust_shafts=[],
                 drips=[(0.44, 0.57, 0.415, 2.4)],
                 shakes=[(0.20, 6.0, 0.45), (0.84, 11.0, 0.75)],
                 can_throw=(0.62, 0.70, (0.565, 0.435), (0.835, 0.155)),
                 shots=[(0.50, 0.46, 1.00, 1.10), (0.55, 0.46, 1.90, 2.05), (0.50, 0.42, 2.20, 2.35),
                        (0.49, 0.21, 1.60, 1.75), (0.57, 0.44, 2.15, 2.30), (0.33, 0.88, 1.90, 2.05),
                        (0.69, 0.30, 1.80, 1.94), (0.44, 0.75, 1.80, 1.95)]),
    "sc07": dict(flames=[(0.345, 0.655, 42), (0.435, 0.845, 36)],
                 dust_shafts=[(0.30, 0.45, 0.42, 0.80)],
                 radio_wave=(0.395, 0.545, 0.472),
                 dial_glow=(0.578, 0.655, 52),
                 static_crackles=True, bob=2.0,
                 shots=[(0.50, 0.44, 1.00, 1.10), (0.60, 0.63, 1.90, 2.05), (0.46, 0.47, 1.80, 1.94),
                        (0.345, 0.64, 1.90, 2.05), (0.435, 0.85, 2.00, 2.15), (0.83, 0.15, 1.80, 1.94),
                        (0.88, 0.50, 1.70, 1.84), (0.47, 0.72, 1.95, 2.10)]),
    "sc08": dict(flames=[(0.565, 0.545, 30)], dust_shafts=[],
                 drips=[(0.47, 0.76, 0.155, 2.8)],
                 shakes=[(0.14, 6.0, 0.45), (0.30, 8.0, 0.55)],
                 redpulse_from=0.05,
                 shots=[(0.50, 0.44, 1.00, 1.10), (0.67, 0.25, 1.90, 2.05), (0.17, 0.15, 1.70, 1.84),
                        (0.565, 0.53, 2.00, 2.16), (0.72, 0.67, 2.10, 2.25), (0.40, 0.69, 2.00, 2.15),
                        (0.31, 0.87, 1.80, 1.94), (0.55, 0.36, 1.65, 1.78)]),
    "sc09": dict(flames=[], dust_shafts=[],
                 drips=[(0.485, 0.575, 0.415, 2.6)],
                 radio_wave=(0.325, 0.405, 0.135),
                 shakes=[(0.10, 5.0, 0.4), (0.55, 9.0, 0.65), (0.80, 4.0, 0.35)],
                 redpulse_from=0.0,
                 shots=[(0.50, 0.44, 1.00, 1.10), (0.365, 0.16, 2.00, 2.15), (0.25, 0.54, 1.90, 2.06),
                        (0.36, 0.57, 2.15, 2.30), (0.71, 0.16, 1.70, 1.85), (0.53, 0.43, 2.20, 2.35),
                        (0.58, 0.63, 1.90, 2.05), (0.80, 0.60, 1.75, 1.88)]),
    "fin":  dict(flames=[(0.474, 0.765, 26)], dust_shafts=[],
                 smoke_chimney=(0.527, 0.452),
                 stars=[(0.235, 0.188), (0.155, 0.115), (0.775, 0.09)],
                 redpulse_04_30=True, zoom_out=True, bob=1.5,
                 shots=[(0.50, 0.55, 1.06, 0.99), (0.50, 0.50, 1.60, 1.72), (0.46, 0.77, 1.90, 2.05),
                        (0.235, 0.19, 2.30, 2.45), (0.33, 0.42, 1.50, 1.62), (0.53, 0.45, 2.10, 2.25),
                        (0.50, 0.62, 1.35, 1.45), (0.62, 0.72, 1.80, 1.94)]),
}

# ------------------------------------------------------------ утилиты
def ken_burns_params(idx, n_frames, zoom_out=False):
    """Непрерывный Ken Burns: возвращает функцию tau∈[0,1] -> (zoom, ax, ay)."""
    variants = [
        (0.5, 0.5), (0.0, 0.5), (1.0, 0.5), (0.5, 0.0), (0.5, 1.0),
        (0.35, 0.30), (0.70, 0.70), (0.15, 0.75), (0.85, 0.25), (0.5, 0.5),
    ]
    ax, ay = variants[idx % len(variants)]
    z0, z1 = (1.07, 1.0) if zoom_out else (1.0, 1.10)
    def params(tau):
        return z0 + (z1 - z0) * tau, ax, ay
    return params

defcrop = None  # placeholder, не используется

def crop_frame(base, zoom, ax, ay, shake):
    """Вырезает кадр 1920x1080 из 2560x1440 с учётом зума и тряски."""
    cw, ch = BASE_W / zoom, BASE_H / zoom
    cx = ax * BASE_W
    cy = ay * BASE_H
    x0 = cx - cw / 2 + shake[0]
    y0 = cy - ch / 2 + shake[1]
    x0 = float(np.clip(x0, 0, BASE_W - cw)); y0 = float(np.clip(y0, 0, BASE_H - ch))
    x1, y1 = x0 + cw, y0 + ch
    # PIL crop + resize (x0..x1 float -> int)
    left, top, right, bottom = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
    img = Image.fromarray(base).crop((left, top, right, bottom)).resize((W, H), Image.NEAREST)
    return np.asarray(img).astype(np.float32)

_LR = None
def _lr_grids():
    global _LR
    if _LR is None:
        sh, sw = H // 4, W // 4
        yy, xx = np.mgrid[0:sh, 0:sw]
        _LR = (xx.astype(np.float32), yy.astype(np.float32))
    return _LR

def add_glow(frame, x, y, r, color, strength):
    """Аддитивное радиальное свечение (считается на 1/4 разрешении и растягивается)."""
    xx, yy = _lr_grids()
    r_lr = max(r * 0.25, 1.0)
    d = np.sqrt((xx - x * 0.25) ** 2 + (yy - y * 0.25) ** 2) / r_lr
    fall = 1 - d
    np.clip(fall, 0, 1, out=fall)
    fall **= 2.2
    up = np.repeat(np.repeat(fall, 4, axis=0), 4, axis=1)
    frame += np.array(color, dtype=np.float32)[None, None, :] * (up * strength)[..., None]
    np.clip(frame, 0, 255, out=frame)

def spawn_particles(rng, n, kind, emitter):
    """Предгенерация частиц: list of dicts."""
    parts = []
    if kind == "dust_shaft":
        x0, y0, x1, y1 = emitter
        for _ in range(n):
            parts.append(dict(x=rng.uniform(x0, x1) * W, y=rng.uniform(y0, y1) * H,
                              vy=rng.uniform(6, 14), sway=rng.uniform(3, 9), ph=rng.uniform(0, 6.28),
                              size=int(rng.integers(1, 3)), a=rng.uniform(0.25, 0.7)))
    elif kind == "ember":
        cx, cy = emitter
        for _ in range(n):
            parts.append(dict(x=cx * W + rng.normal(0, 10), y=cy * H + rng.normal(0, 6),
                              vy=-rng.uniform(18, 46), sway=rng.uniform(4, 10), ph=rng.uniform(0, 6.28),
                              size=int(rng.integers(1, 3)), a=rng.uniform(0.4, 0.95)))
    elif kind == "drip":
        x0, x1, y0, g = emitter
        for _ in range(n):
            parts.append(dict(x=rng.uniform(x0, x1) * W, y=y0 * H + rng.uniform(-8, 4),
                              vy=rng.uniform(130, 250), g=520.0, sway=0.0, ph=0.0,
                              size=int(rng.integers(1, 3)), a=rng.uniform(0.4, 0.85)))
    elif kind == "drift":  # вечный медленный свод пепла/снега
        for _ in range(n):
            parts.append(dict(x=rng.uniform(0, W), y=rng.uniform(0, H),
                              vy=rng.uniform(10, 22), sway=rng.uniform(8, 26), ph=rng.uniform(0, 6.28),
                              size=int(rng.integers(1, 3)), a=rng.uniform(0.12, 0.4)))
    return parts

def draw_particles(frame, parts, t):
    for p in parts:
        y = p["y"] + p["vy"] * t + (0.5 * p.get("g", 0) * t * t if p.get("g") else 0)
        x = p["x"] + math.sin(t * 0.9 + p["ph"]) * p["sway"]
        if p["vy"] > 0 and y > H + 4:
            y = (y % (H + 60)) - 30
        elif p["vy"] < 0 and y < -6:
            continue
        s = p["size"]
        xi, yi = int(x), int(y)
        if 0 <= xi < W - s and 0 <= yi < H - s:
            a = p["a"]
            if p["vy"] < 0:  # искры мерцают
                a *= 0.6 + 0.4 * math.sin(t * 9 + p["ph"] * 3)
            frame[yi:yi + s + 1, xi:xi + s + 1] += a * np.array([235, 215, 160], dtype=np.float32)

def draw_walker_silhouette(frame, y_frac, h_frac, x_frac, alpha=0.82):
    """Волочащийся силуэт на горизонте. Рисуется мешком полигонов в малом масштабе."""
    hgt = int(h_frac * H); wid = int(hgt * 0.62)
    cx = int(x_frac * W); feet_y = int(y_frac * H)
    img = Image.new("RGBA", (wid, hgt), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = hgt / 100.0
    col = (8, 9, 12)
    d.ellipse([34 * u / 2.2, 2 * u, 66 * u / 2.2, 24 * u], fill=col)             # голова, наклон вперёд
    d.polygon([(30 * u, 22 * u), (58 * u, 20 * u), (66 * u, 52 * u), (56 * u, 54 * u),
               (42 * u, 54 * u), (26 * u, 50 * u)], fill=col)                    # туловище
    d.polygon([(28 * u, 26 * u), (14 * u, 40 * u), (18 * u, 60 * u), (26 * u, 60 * u),
               (30 * u, 44 * u), (38 * u, 30 * u)], fill=col)                    # висящая рука
    d.polygon([(46 * u, 50 * u), (44 * u, 80 * u), (52 * u, 80 * u), (56 * u, 52 * u)], fill=col)   # опорная нога
    d.polygon([(36 * u, 52 * u), (22 * u, 74 * u), (28 * u, 88 * u), (38 * u, 86 * u),
               (44 * u, 62 * u)], fill=col)                                      # волочащаяся нога
    arr = np.asarray(img).astype(np.float32)
    a = (arr[..., 3:4] / 255.0) * alpha
    x0, y0 = cx - wid // 2, feet_y - hgt
    x1, y1 = x0 + wid, y0 + hgt
    if x1 < 0 or x0 >= W or y1 < 0 or y0 >= H: return
    src = arr[max(0, -y0): hgt - max(0, y1 - H), max(0, -x0): wid - max(0, x1 - W), :3]
    am = a[max(0, -y0): hgt - max(0, y1 - H), max(0, -x0): wid - max(0, x1 - W)]
    frame[max(0, y0): max(0, y0) + src.shape[0], max(0, x0): max(0, x0) + src.shape[1]] = \
        frame[max(0, y0): max(0, y0) + src.shape[0], max(0, x0): max(0, x0) + src.shape[1]] * (1 - am) + \
        np.array([10, 11, 15], dtype=np.float32) * am

def shake_offset(events, t):
    """events: [(t_frac, amp_px, decay_s)] -> (dx, dy) в пикселях."""
    dx = dy = 0.0
    for (tf, amp, decay) in events:
        if t >= tf:
            dt = (t - tf)
            env = math.exp(-dt / max(decay, 0.05))
            dx += amp * env * math.sin(dt * 34.0)
            dy += amp * 0.7 * env * math.cos(dt * 29.0 + 1.3)
    return dx, dy

def overlay_rows(frame, rgba_f32, y0, y1):
    a = rgba_f32[y0:y1, :, 3:4] / 255.0
    frame[y0:y1] = frame[y0:y1] * (1 - a) + rgba_f32[y0:y1, :, :3] * a

def overlay_rgba_fast(frame, rgba_f32):
    alpha = rgba_f32[..., 3]
    rows = np.any(alpha > 2, axis=1)
    nz = np.nonzero(rows)[0]
    if len(nz) == 0:
        return
    overlay_rows(frame, rgba_f32, int(nz[0]), int(nz[-1]) + 1)

def overlay_rgba(frame, rgba):
    a = rgba[..., 3:4] / 255.0
    frame[:] = frame * (1 - a) + rgba[..., :3] * a

_FV = None
def red_vignette(frame, strength):
    global _FV
    if _FV is None:
        yy, xx = np.mgrid[0:H, 0:W]
        d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
        _FV = np.clip(d - 0.45, 0, 1).astype(np.float32)
    v = _FV * strength
    frame[..., 0] *= (1 - v * 0.55); frame[..., 1] *= (1 - v * 0.85); frame[..., 2] *= (1 - v * 0.85)

_NOISE_POOL = None
_GRAIN_IDX = 0
def grain(frame, rng, amount=1.3):
    global _NOISE_POOL, _GRAIN_IDX
    if _NOISE_POOL is None:
        r = np.random.default_rng(42)
        _NOISE_POOL = [r.standard_normal((H, W)).astype(np.float32) for _ in range(8)]
    _GRAIN_IDX += 1
    frame += _NOISE_POOL[_GRAIN_IDX % 8][..., None] * amount

def star_twinkle(frame, x_frac, y_frac, t, ph):
    x, y = int(x_frac * W), int(y_frac * H)
    s = 0.35 + 0.65 * (0.5 + 0.5 * math.sin(t * 2.1 + ph)) ** 2
    for dx, dy in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
        xi, yi = x + dx, y + dy
        if 0 <= xi < W and 0 <= yi < H:
            frame[yi, xi] += np.array([200, 205, 255], dtype=np.float32) * s * (1.3 if (dx, dy) == (0, 0) else 0.6)

def radio_wave(frame, x0f, x1f, ycf, t, scale=1.0):
    x0, x1, y0 = int(x0f * W), int(x1f * W), int(ycf * H)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = []
    for i in range(90):
        u = i / 89
        x = x0 + (x1 - x0) * u
        env_ = 0.5 + 0.5 * math.sin(u * 7 + t * 1.3) * math.sin(u * 2.3 - t * 0.7)
        y = y0 - scale * 13 * env_ * math.sin(u * 16 + t * 2.6) - 4 * math.sin(u * 31 - t * 4.1) * env_
        pts.append((x, y))
    d.line(pts, fill=(120, 255, 145, 220), width=3)
    img = img.filter(ImageFilter.GaussianBlur(1.6))
    glow = np.asarray(img).astype(np.float32)
    frame[:] = np.clip(frame + glow[..., :3] * (glow[..., 3:4] / 255.0) * 1.35, 0, 255)

def draw_can(frame, x, y, trail):
    for k, (tx, ty) in enumerate(trail):
        a = 0.25 + 0.25 * k
        frame[int(ty) - 2:int(ty) + 3, int(tx) - 4:int(tx) + 5] += a * np.array([140, 60, 40], dtype=np.float32)
    xi, yi = int(x), int(y)
    frame[yi - 4:yi + 5, xi - 6:xi + 7] = np.array([210, 210, 215], dtype=np.float32) * 0.75
    frame[yi - 1:yi + 2, xi - 6:xi + 7] = np.array([190, 70, 45], dtype=np.float32) * 0.8

# ------------------------------------------------------------ кадр сцены
def render_scene_frames(sc, vo_len, t_offset, boundaries, parts_cache):
    key = sc["key"]
    dur = vo_len + sc["dur_tail"]
    fx = FX.get(key, {})
    n = int(round(dur * FPS))
    base = np.asarray(Image.open(FRAMES / sc["img"]).convert("RGB").resize((BASE_W, BASE_H), Image.LANCZOS))
    rng = np.random.default_rng(1000 + hash(key) % 500)
    # Шот-лист: смена планов каждые ~3.9 c (>= 15 склеек в минуту)
    shots = fx.get("shots") or [(0.5, 0.5, 1.0, 1.1)]
    shot_count = max(int(math.ceil(dur / 3.9)), len(shots))
    shot_len = dur / shot_count

    # частицы
    parts = []
    for (x0, y0, x1, y1) in (fx.get("dust_shafts") or []):
        parts += spawn_particles(rng, 40, "dust_shaft", (x0, y0, x1, y1))
    for (fx_flame) in fx.get("flames", []):
        parts += spawn_particles(rng, 26, "ember", (fx_flame[0], fx_flame[1] - 0.045))
    for drip in fx.get("drips", []):
        parts += spawn_particles(rng, 34, "drip", drip)
    if key in ("fin", "sc07"):
        parts += spawn_particles(rng, 60, "drift", None)
    # демпфер HP-вариантов для sc03
    hp_variants = {}
    if key == "sc03":
        for hp in (82, 77, 74):
            sc_h = dict(sc); sc_h["hp"] = hp
            hp_variants[hp] = make_hud(sc_h)
    overlay_static = make_hud(sc)
    caption = make_caption(sc["caption"], accent=sc.get("choice", False))
    cap_arr = np.asarray(caption).astype(np.float32)
    hud_static_f32 = np.asarray(overlay_static).astype(np.float32)
    cap_alpha = cap_arr[..., 3:4] / 255.0
    hud_alpha = hud_static_f32[..., 3:4] / 255.0
    hud_variants_f32 = {hp_v: np.asarray(img).astype(np.float32) for hp_v, img in hp_variants.items()}
    hud_variants_alpha = {hp_v: a[..., 3:4] / 255.0 for hp_v, a in hud_variants_f32.items()}

    frames = []
    for i in range(n):
        t = i / FPS
        tau = i / max(n - 1, 1)
        shot_idx = min(int(t / shot_len), shot_count - 1)
        local = (t - shot_idx * shot_len) / shot_len
        ax, ay, z0, z1 = shots[shot_idx % len(shots)]
        zoom = z0 + (z1 - z0) * local
        # микро-затемнение на стыках шотов — монтажный "кнэпок"
        rem = t % shot_len
        dist = min(rem, shot_len - rem)
        shot_fade = 0.45 * max(0.0, 1.0 - dist / 0.05)
        sx, sy = shake_offset([(e[0] * dur, e[1], e[2]) for e in fx.get("shakes", [])], t)
        sy += fx.get("bob", 0.0) * math.sin(2 * math.pi * 0.22 * t)
        frame = crop_frame(base, zoom, ax, ay, (sx, sy))
        frame *= (1 - shot_fade)

        # огонь: мерцание
        for (fxf, fyf, fr) in fx.get("flames", []):
            flick = 0.62 + 0.28 * math.sin(t * 7.3 + fxf * 40) + 0.18 * math.sin(t * 13.7 + 1.7)
            flick *= 1.0 + 0.1 * math.sin(t * 31.0)
            add_glow(frame, fxf * W, fyf * H, fr * (1 + 0.22 * math.sin(t * 9.1)), (255, 176, 60), max(flick, 0.15) * 0.55)
            add_glow(frame, fxf * W, fyf * H, fr * 0.45, (255, 226, 140), max(flick, 0.15) * 0.75)
        # дым из трубы
        if "smoke_chimney" in fx:
            cx, cy = fx["smoke_chimney"]
            for k in range(4):
                ph = (t * 0.22 + k * 0.27) % 1.0
                py = (cy - ph * 0.13) * H
                px = (cx + 0.012 * math.sin(ph * 5 + k)) * W
                pr = (8 + ph * 26) * (W / 1920)
                alpha = 0.24 * (1 - ph)
                add_glow(frame, px, py, pr, (150, 152, 158), alpha)
        # радиоволна
        if "radio_wave" in fx:
            x0, x1, yc = fx["radio_wave"]
            radio_wave(frame, x0, x1, yc, t, scale=1.0 + 0.25 * math.sin(t * 0.8))
        if fx.get("dial_glow"):
            x, y, r = fx["dial_glow"]
            add_glow(frame, x * W, y * H, r, (255, 190, 80), 0.45 + 0.2 * math.sin(t * 3.1))
        if fx.get("static_crackles"):
            if rng.random() < 0.06:
                yy = int((fx.get("radio_wave", (0, 0, 0.47))[2]) * H) + int(rng.normal(0, 14))
                frame[yy:yy + 2, int(0.39 * W):int(0.55 * W)] += 90
        # частицы
        if parts:
            draw_particles(frame, parts, t)
        # силуэт волочащегося мертвеца
        for sil in fx.get("silhouettes", []):
            if sil["kind"] == "walker" and sil["t0"] <= tau <= sil["t1"]:
                u = (tau - sil["t0"]) / (sil["t1"] - sil["t0"])
                x = sil["x_from"] + (sil["x_to"] - sil["x_from"]) * u
                bob = math.sin(t * 2.6) * 2
                draw_walker_silhouette(frame, sil["y"] + bob / H, sil["h"], x)
        # закатное затемнение (sc03)
        if "darkness" in fx:
            d0, d1, max_dark = fx["darkness"]
            ramp = np.clip((tau - d0) / (d1 - d0), 0, 1) * max_dark
            frame *= (1 - ramp)
        if fx.get("redpulse_from") is not None and tau >= fx["redpulse_from"]:
            pulse = max(0.0, math.sin(t * 5.1)) ** 3
            red_vignette(frame, 0.35 + 0.35 * pulse)
        if fx.get("flash_hp"):
            f0, f1 = fx["flash_hp"]
            if f0 <= tau <= f1:
                frame[..., 0] += 60 * math.sin(math.pi * (tau - f0) / (f1 - f0))
        if "redpulse_04_30" in fx:
            add_glow(frame, W * 0.5, 112, 60, (255, 60, 45), 0.30 + 0.25 * (0.5 + 0.5 * math.sin(t * 2.4)))
        for (sxp, syp) in fx.get("stars", []):
            star_twinkle(frame, sxp, syp, t, sxp * 37)
        # бросок банки
        if "can_throw" in fx:
            c0f, c1f, (x0, y0), (x1, y1) = fx["can_throw"]
            if c0f <= tau <= c1f:
                s = (tau - c0f) / (c1f - c0f)
                x = (x0 + (x1 - x0) * s) * W
                y = (y0 + (y1 - y0) * s - 0.24 * math.sin(math.pi * s)) * H
                trail = []
                for k in range(1, 4):
                    ss = max(0.0, s - k * 0.045)
                    tx = (x0 + (x1 - x0) * ss) * W
                    ty = (y0 + (y1 - y0) * ss - 0.24 * math.sin(math.pi * ss)) * H
                    trail.append((tx, ty))
                draw_can(frame, x, y, trail)

        # HP-дрейн в sc03: 82 -> 77 -> 74 по фазам
        if key == "sc03":
            if tau < 0.78: self_hud, self_alpha = hud_variants_f32[82], hud_variants_alpha[82]
            elif tau < 0.86: self_hud, self_alpha = hud_variants_f32[77], hud_variants_alpha[77]
            else: self_hud, self_alpha = hud_variants_f32[74], hud_variants_alpha[74]
            frame[:150] = frame[:150] * (1 - self_alpha[:150]) + self_hud[:150, :, :3] * self_alpha[:150]
        else:
            frame[:150] = frame[:150] * (1 - hud_alpha[:150]) + hud_static_f32[:150, :, :3] * hud_alpha[:150]
        overlay_rgba_fast(frame, cap_arr)
        grain(frame, rng)

        # дим-стэк на границах сцен
        for b in boundaries:
            if abs((t_offset + t) - b) < DIP:
                k = 1 - abs((t_offset + t) - b) / DIP
                frame *= (1 - 0.82 * k)
        yield np.clip(frame, 0, 255).astype(np.uint8)

def render_card_frames(img_path, dur, kb_idx, tint=None):
    base = np.asarray(Image.open(img_path).convert("RGB").resize((BASE_W, BASE_H), Image.LANCZOS))
    n = int(round(dur * FPS))
    kb = ken_burns_params(kb_idx, n, zoom_out=(kb_idx == 10))
    rng = np.random.default_rng(77)
    for i in range(n):
        t = i / FPS
        tau = i / max(n - 1, 1)
        zoom, ax, ay = kb(tau)
        sy = 1.5 * math.sin(2 * math.pi * 0.2 * t)
        frame = crop_frame(base, zoom, ax, ay, (0, sy))
        draw_particles(frame, spawn_particles(np.random.default_rng(5), 46, "drift", None), t)
        grain(frame, rng, 1.5)
        yield np.clip(frame, 0, 255).astype(np.uint8)

# ------------------------------------------------------------ main
VO_DIR = ROOT / "assets" / "vo"


def _ffmpeg_raw(out_path):
    return subprocess.Popen(
        [FFMPEG, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out_path)],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)


def _stream(proc, frames):
    for fr in frames:
        proc.stdin.write(fr.tobytes())
    proc.stdin.close()
    proc.wait()


def _ensure_cards():
    from build_episode import text_card
    title_png = WORK / "card_title.png"
    end_png = WORK / "card_end.png"
    if not title_png.exists():
        text_card([("« Т Р Е Т И Й   Д Е Н Ь »", 84, (240, 234, 220)),
                   ("С Е Р И Я   1  ·  « О Н О   В О Ш Л О »", 34, (216, 178, 106)),
                   ("интерактивное зомби-выживание · 2-е лицо", 24, (130, 130, 138))]).save(title_png)
    if not end_png.exists():
        text_card([("С Е Р И Я   2", 44, (216, 178, 106)),
                   ("А — ночь и лес   ·   Б — прорыв через кухню   ·   В — старый лаз", 26, (200, 196, 185)),
                   ("Пиши «А», «Б» или «В» в комментариях — выбери, как он выберется", 26, (200, 196, 185))],
                  big="04:30").save(end_png)
    return title_png, end_png


def render_job(job):
    kind, payload, t_offset, boundaries = job
    _ensure_cards()
    if kind == "title":
        seg = WORK / "aseg_title.mp4"
        print("· титул", flush=True)
        _stream(_ffmpeg_raw(seg), render_card_frames(WORK / "card_title.png", TITLE_DUR, 3))
    elif kind == "end":
        seg = WORK / "aseg_end.mp4"
        print("· финальная карточка", flush=True)
        _stream(_ffmpeg_raw(seg), render_card_frames(WORK / "card_end.png", END_DUR, 10))
    else:
        sc = payload
        seg = WORK / f"aseg_{sc['key']}.mp4"
        vo_len = len(decode_vo(VO_DIR / sc["vo"])) / SR
        print(f"· сцена {sc['key']} ({vo_len + sc['dur_tail']:.1f}s)", flush=True)
        _stream(_ffmpeg_raw(seg), render_scene_frames(sc, vo_len, t_offset, boundaries, None))
    return seg


def main():
    print("== EP01 animated build ==", flush=True)
    import concurrent.futures
    _ensure_cards()
    wav_path = WORK / "master.wav"
    with wave.open(str(wav_path), "rb") as w:
        total_dur = w.getnframes() / w.getframerate()

    vo_lens = [len(decode_vo(VO_DIR / sc["vo"])) / SR for sc in SCENES]
    boundaries = [TITLE_DUR]
    t = TITLE_DUR
    jobs = [("title", None, 0.0, None)]
    for i, sc in enumerate(SCENES):
        boundaries.append(t)
        jobs.append(("scene", sc, t, boundaries))
        t += vo_lens[i] + sc["dur_tail"]
    jobs.append(("end", None, t, None))
    # boundaries для каждой сцены включают все точки дим-стэка
    full_boundaries = boundaries + [t]
    jobs = [(k, p, off, full_boundaries) for (k, p, off, _b) in jobs]

    out_mp4 = WORK / os.environ.get("EP01_OUT", "EP01_ono-voshlo.mp4")
    only = set(filter(None, os.environ.get("EP01_ONLY", "").split(",")))
    if only:
        jobs = [j for j in jobs if j[0] == "title" or j[1]["key"] in only]
        segs = [render_job(j) for j in jobs]
    else:
        workers = int(os.environ.get("EP01_WORKERS", "2"))
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as ex:
            segs = list(ex.map(render_job, jobs))

    print("· склейка", flush=True)
    list_file = WORK / "anoncat.txt"
    with open(list_file, "w") as fh:
        for s in segs:
            fh.write(f"file '{s.resolve().as_posix()}'\n")
    raw_mp4 = WORK / "ep01_anim_video_only.mp4"
    subprocess.run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
                    "-c", "copy", str(raw_mp4)], check=True)
    print("· мукс с мастер-аудио", flush=True)
    subprocess.run([FFMPEG, "-y", "-i", str(raw_mp4), "-i", str(wav_path),
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                    "-shortest", "-movflags", "+faststart", str(out_mp4)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"== DONE: {out_mp4} ({out_mp4.stat().st_size / 1e6:.1f} MB, {total_dur:.1f}s) ==", flush=True)


if __name__ == "__main__":
    main()
