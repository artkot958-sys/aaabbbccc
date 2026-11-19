# 2D survival-анимации на русском

В проекте два side-view эпизода 1920×1080, 30 fps, с русской озвучкой, музыкой, пословными караоке-субтитрами и полноэкранным браузерным плеером:

1. **«365 дней до ядерной войны»** — 9:47, 20 глав. Скачать: [`public/video.mp4`](public/video.mp4) · [озвучка](public/audio/master.mp3) · [плеер](http://localhost:4173/)
2. **«100 дней до спасения на острове»** — 8:48, 19 глав, новый мужской голос и короткий динамичный хук в начале. Скачать: [`public/island/video.mp4`](public/island/video.mp4) · [озвучка](public/island/audio/master.mp3) · [плеер](http://localhost:4173/island/)

## Запуск плееров

```bash
npm start
```

Плееры поддерживают полноэкранный режим, перемотку, переход к главам и скачивание MP4/MP3.

## Пересборка

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm run build:audio && npm run render && npm test
PROJECT=island npm run build:island && npm run render:island && npm run test:island
```

`public/{,island/}timeline.json` содержит пословные интервалы. Сценарии расположены в `scripts/story.json` и `scripts/island_story.json`. Несжатые мастер WAV-файлы генерируются при сборке, но исключены из Git.
