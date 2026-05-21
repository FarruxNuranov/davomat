# Davomat Bot

Telegram-бот системы давомата. Node.js + [telegraf](https://telegraf.js.org/).
Пока рабочий каркас: команды `/start`, `/help`, `/ping`, `/health`.

## Запуск
```bash
cd DavomatBot
npm install
cp .env.example .env     # затем впишите BOT_TOKEN от @BotFather
npm run dev              # автоперезапуск (node --watch)
# или: npm start
```

## Переменные окружения (.env)
- `BOT_TOKEN` — токен бота от @BotFather (обязательно).
- `API_BASE_URL` — адрес API давомата (по умолчанию `https://localhost:7052/api`).
- `API_INSECURE_TLS` — `true`, чтобы принимать самоподписанный сертификат локального бэкенда (только для разработки).

## Структура
- `src/bot.js` — точка входа, команды бота.
- `src/api.js` — HTTP-клиент к API давомата.

## Что дальше
Логика (отчёты, привязка сотрудников, напоминания) добавляется поверх этого каркаса.
`.env` в git не попадает — храните токен только локально.
