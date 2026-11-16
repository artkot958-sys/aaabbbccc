# 365 дней до ядерной войны — короткий анимационный фильм

Русскоязычный 16:9 survival-анимационный эпизод (3:01) с озвучкой, встроенными пословными караоке-субтитрами, процедурным саундтреком и браузерным плеером.

## Запуск плеера

```bash
npm start
```

Откройте `http://localhost:4173`. Плеер поддерживает полноэкранный режим, перемотку и переходы по главам. Файлы фильма и аудио находятся в `public/`.

## Пересборка

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm run build:audio
npm run render
npm test
```

Сборка видео использует FFmpeg из установленного `imageio-ffmpeg` в `.venv`, а кадры рисует общий Canvas-движок `public/engine.js` через `@napi-rs/canvas`. `public/timeline.json` содержит главы и временные интервалы каждого слова. `public/audio/clip_01.mp3`–`clip_10.mp3` — отдельные фрагменты начальной озвучки; мастер-дорожка после ускорения до темпа монтажа — `public/audio/master.mp3` и `.wav`.
