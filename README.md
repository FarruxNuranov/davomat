# Davomat — учёт посещаемости сотрудников

Full-stack приложение: вход по JWT, управление сотрудниками, календарь давомата,
итоги за месяц, ИИ-аналитика (Claude), Telegram-отчёты и портал сотрудника.

## Стек
- **AuthBackend** — .NET 8, ASP.NET Core Web API, EF Core + SQLite, BCrypt, JWT.
- **AuthFrontend** — React 19, Vite, React Router, axios.

## Запуск

### Бэкенд
```bash
cd AuthBackend
dotnet user-secrets set "Jwt:Key" "<любая строка ≥ 32 символов>"
dotnet run --launch-profile https   # https://localhost:7052 (Swagger в Development)
```
БД (`authbackend.db`) и админ создаются автоматически при первом запуске.
Дефолтный админ: `admin@local.dev` / `Admin12345` (смените пароль).

Опциональные интеграции задаются в UI (Настройки → Интеграции) или в user-secrets:
`Anthropic:ApiKey`, `Telegram:BotToken`, `Telegram:ChatId`.

### Фронтенд
```bash
cd AuthFrontend
npm install
npm run dev   # http://localhost:5173
```

### Telegram-бот
```bash
cd DavomatBot
npm install
cp .env.example .env   # впишите BOT_TOKEN
npm run dev
```

## Структура
- `AuthBackend/` — API (контроллеры, сервисы, EF-модели, миграции).
- `AuthFrontend/` — SPA (страницы, компоненты, API-клиент).
- `DavomatBot/` — Telegram-бот (Node.js + telegraf), каркас.
