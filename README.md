# aaabbbccc

Интерактивный YouTube-сериал «ТРЕТИЙ ДЕНЬ» (реалистичное зомби-выживание, 2D side-scrolling в стиле Terraria, повествование от 2-го лица).

## Серии

- [Серия 1 — «Оно вошло»](episodes/ep01/episode-01_ono-voshlo.md) — полный сценарий, раскадровка, инвентарь, точки выбора, клиффхэнгер и пакет промптов (16:9).
- Готовое видео: `assets/video/EP01_ono-voshlo.mp4` (в ветке, 1920×1080, ~8:39).

## Сборка видео

```bash
pip install -r requirements.txt
python tools/build_episode.py    # слайдшоу-версия: движения Ken Burns + HUD + синтез звука
python tools/animate_episode.py  # полная анимация: партиклы, огонь, тряски, HP-drain, радиоволна (покадрово)
```

`animate_episode.py` — основной билдер серии. Требует `assets/video/master.wav` из `build_episode.py` (или пересоберите сначала им). Переменные окружения: `EP01_WORKERS` (параллельные сегменты, по умолчанию 2), `EP01_ONLY=sc04,fin` (дебаг — рендер только части сцен), `EP01_OUT=name.mp4` (имя выходного файла).

Звук (дрон, сердцебиение, SFX) синтезируется в numpy внутри `build_episode.py` — никаких внешних ассетов не нужно.
