# AuthBackend

Бэкенд на ASP.NET Core 8 с авторизацией (регистрация + логин + JWT).
База данных: SQLite. Хэширование паролей: BCrypt.

---

## Содержание

1. [Стек технологий](#стек-технологий)
2. [Структура проекта](#структура-проекта)
3. [Архитектура и поток данных](#архитектура-и-поток-данных)
4. [Установка и запуск](#установка-и-запуск)
5. [Конфигурация](#конфигурация)
6. [База данных и миграции](#база-данных-и-миграции)
7. [API endpoints](#api-endpoints)
8. [Аутентификация (JWT)](#аутентификация-jwt)
9. [Описание файлов](#описание-файлов)
10. [Тестирование через Swagger](#тестирование-через-swagger)
11. [Тестирование через curl](#тестирование-через-curl)
12. [Что дальше](#что-дальше)

---

## Стек технологий

| Технология | Назначение |
|---|---|
| .NET 8 | Платформа |
| ASP.NET Core 8 Web API | HTTP-сервер, контроллеры, роутинг |
| Entity Framework Core 8 | ORM (работа с БД через C# объекты) |
| SQLite | Файловая БД (без установки) |
| BCrypt.Net-Next | Хэширование паролей |
| JWT Bearer | Аутентификация по токенам |
| Swashbuckle (Swagger) | Документация и тестирование API |

### NuGet пакеты

```
Microsoft.EntityFrameworkCore             8.0.10
Microsoft.EntityFrameworkCore.Sqlite      8.0.10
Microsoft.EntityFrameworkCore.Design      8.0.10
Microsoft.AspNetCore.Authentication.JwtBearer 8.0.10
BCrypt.Net-Next                           4.0.3
Swashbuckle.AspNetCore                    (входит в шаблон webapi)
```

---

## Структура проекта

```
AuthBackend/
├── Controllers/
│   └── AuthController.cs           # HTTP-эндпоинты /api/auth/*
├── Services/
│   ├── IAuthService.cs             # контракт сервиса аутентификации
│   ├── AuthService.cs              # реализация Register/Login
│   ├── ITokenService.cs            # контракт генератора токенов
│   └── TokenService.cs             # генерация JWT
├── Data/
│   └── AppDbContext.cs             # EF Core контекст БД
├── Models/
│   └── User.cs                     # сущность пользователя в БД
├── DTOs/
│   ├── RegisterDto.cs              # тело запроса /register
│   ├── LoginDto.cs                 # тело запроса /login
│   └── AuthResponseDto.cs          # ответ при успешной авторизации
├── Migrations/                     # сгенерировано EF (создание таблиц)
├── Properties/
│   └── launchSettings.json         # настройки запуска (порты, окружение)
├── appsettings.json                # конфиг (JWT, ConnectionStrings)
├── appsettings.Development.json    # переопределения для Development
├── Program.cs                      # точка входа + конфигурация DI
├── AuthBackend.csproj              # описание проекта (зависимости)
└── authbackend.db                  # SQLite БД (создаётся при запуске)
```

### Зачем такое разделение

| Папка | Ответственность | Знает о чём |
|---|---|---|
| **Models** | Структуры данных в БД | ни о чём (просто свойства) |
| **DTOs** | Структуры запросов/ответов HTTP | ни о чём |
| **Data** | Конфигурация БД (DbContext) | Models |
| **Services** | Бизнес-логика (правила, проверки) | Data, Models, DTOs |
| **Controllers** | HTTP-слой (приём запроса, вызов сервиса, возврат ответа) | Services, DTOs |
| **Program.cs** | Сборка приложения (DI, middleware) | всё |

**Контроллер не должен ходить в БД напрямую.** Он зовёт сервис. Сервис делает работу. Это упрощает тесты и замену реализации.

---

## Архитектура и поток данных

### Регистрация (POST /api/auth/register)

```
Клиент (браузер/Postman)
   │  HTTP POST { email, password, fullName }
   ▼
[AuthController.Register]
   │  валидация DTO ([Required], [EmailAddress], [MinLength])
   ▼
[AuthService.RegisterAsync]
   │  1. проверить, что email не занят (EF: SELECT)
   │  2. захэшировать пароль (BCrypt)
   │  3. сохранить User в БД (EF: INSERT)
   │  4. вызвать TokenService для JWT
   ▼
[TokenService.CreateAccessToken]
   │  собрать claims (sub, email, name)
   │  подписать ключом из appsettings.json
   ▼
Ответ: { userId, email, fullName, accessToken }
```

### Логин (POST /api/auth/login)

```
Клиент → AuthController.Login → AuthService.LoginAsync
   1. найти User по email (EF)
   2. BCrypt.Verify(password, user.PasswordHash)
   3. если ОК → вернуть TokenService.CreateAccessToken(user)
   4. если нет → 401 Unauthorized
```

### Защищённый endpoint (в будущем)

```
Клиент → HTTP GET с заголовком  Authorization: Bearer <token>
   │
   ▼
[JWT Middleware] (настроен в Program.cs)
   │  валидирует подпись, issuer, audience, срок жизни
   │  если ок → заполняет HttpContext.User
   ▼
[Controller с [Authorize]] → выполняется
[Controller без токена/невалидный] → 401
```

---

## Установка и запуск

### Требования

- macOS / Linux / Windows
- .NET 8 SDK (`dotnet --version` должно показывать 8.x)

### Первый запуск

```bash
cd ~/Backend/AuthBackend

# Восстановить пакеты (один раз)
dotnet restore

# Собрать
dotnet build

# Запустить (HTTPS, порт 7052)
dotnet run --launch-profile https
```

При первом запуске EF Core применит миграции и создаст файл `authbackend.db`.

### Адреса по умолчанию

- HTTP:  http://localhost:5260
- HTTPS: https://localhost:7052
- Swagger: https://localhost:7052/swagger

Порты прописаны в `Properties/launchSettings.json`.

### Остановка

`Ctrl + C` в терминале.

---

## Конфигурация

### appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=authbackend.db"
  },
  "Jwt": {
    "Key": "ThisIsASuperSecretKeyForJwtPleaseChangeInProduction_32+chars!",
    "Issuer": "AuthBackend",
    "Audience": "AuthBackendClient",
    "ExpiresMinutes": "60"
  }
}
```

| Поле | Описание |
|---|---|
| `ConnectionStrings:DefaultConnection` | путь к файлу SQLite (или строка для другой БД) |
| `Jwt:Key` | секретный ключ для подписи токена. **Минимум 32 символа** для HS256. В проде хранить в секретах (не коммитить!) |
| `Jwt:Issuer` | кто выпустил токен (обычно имя сервиса) |
| `Jwt:Audience` | для кого токен предназначен (имя клиента) |
| `Jwt:ExpiresMinutes` | срок жизни access-токена в минутах |

### Production-замечание

В реальном проекте `Jwt:Key` нужно переопределять через переменные окружения или User Secrets:

```bash
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "real-secret-key-here"
```

---

## База данных и миграции

### Подход Code-First

Сначала пишем C# классы (Models), потом EF генерирует SQL. БД отражает код, а не наоборот.

### Текущая схема

Таблица `Users`:

| Колонка | Тип | Notes |
|---|---|---|
| Id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| Email | TEXT | NOT NULL, UNIQUE INDEX |
| PasswordHash | TEXT | NOT NULL (BCrypt hash) |
| FullName | TEXT | NOT NULL |
| CreatedAt | TEXT | NOT NULL (UTC datetime) |

### Создание новой миграции

После изменения сущностей или `OnModelCreating`:

```bash
dotnet ef migrations add НазваниеИзменения
dotnet ef database update    # применит миграции
```

В этом проекте `db.Database.Migrate()` вызывается автоматически в `Program.cs` при старте — БД всегда актуальна.

### Откат миграции

```bash
dotnet ef migrations remove                    # удалить последнюю (если ещё не применена)
dotnet ef database update НазваниеПредыдущей   # откатить применённую
```

### Просмотр содержимого БД

```bash
sqlite3 authbackend.db
sqlite> .tables
sqlite> SELECT * FROM Users;
sqlite> .quit
```

Или через GUI: **DB Browser for SQLite**, **TablePlus**, **DataGrip**.

---

## API endpoints

Базовый URL: `https://localhost:7052`

### POST /api/auth/register

Создаёт нового пользователя и возвращает JWT.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "fullName": "John Doe"
}
```

**Response 200 OK:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "fullName": "John Doe",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

**Response 400 Bad Request** — валидация не прошла (короткий пароль, невалидный email).

**Response 409 Conflict** — email уже зарегистрирован.

---

### POST /api/auth/login

Аутентифицирует пользователя по email + password, возвращает JWT.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response 200 OK:** такая же структура, как у `/register`.

**Response 401 Unauthorized** — пользователь не найден или пароль неверный.

---

## Аутентификация (JWT)

### Как использовать токен

Клиент сохраняет `accessToken` (например, в `localStorage` для SPA) и шлёт его на каждый защищённый запрос:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### Структура JWT

Токен состоит из 3 частей: `header.payload.signature`, разделённых точкой.

**Payload (claims):**
- `sub` — userId
- `email`
- `name` — fullName
- `jti` — уникальный id токена
- `exp` — Unix-timestamp истечения
- `iss` — issuer
- `aud` — audience

Сервер проверяет подпись секретным ключом — клиент не может подделать данные.

### Защита endpoint'а

Просто навесь атрибут `[Authorize]`:

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]                              // весь контроллер требует токен
public class UsersController : ControllerBase
{
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirst("sub")?.Value;
        var email  = User.FindFirst("email")?.Value;
        return Ok(new { userId, email });
    }
}
```

JWT middleware автоматически валидирует токен и заполняет `HttpContext.User`.

---

## Описание файлов

### Program.cs

Точка входа. Регистрирует:
- `AppDbContext` (с SQLite)
- `IAuthService → AuthService`, `ITokenService → TokenService` (DI)
- JWT Bearer аутентификацию (валидация Issuer/Audience/Lifetime/Key)
- Swagger с поддержкой Bearer токена в UI
- Middleware: HTTPS redirect → Authentication → Authorization → MapControllers
- Применение EF миграций при старте

### Models/User.cs

POCO-класс, отражающий таблицу `Users`. Никакой логики.

### Data/AppDbContext.cs

EF Core контекст. Объявляет `DbSet<User>` и в `OnModelCreating` ставит уникальный индекс на `Email`.

### DTOs/

Объекты передачи данных между HTTP и приложением. Отделены от сущностей БД, чтобы:
- не светить внутреннюю структуру (например, `PasswordHash`)
- иметь свою валидацию (`[Required]`, `[EmailAddress]`)
- свободно менять схему БД, не ломая API

### Services/AuthService.cs

Бизнес-логика регистрации и входа. Бросает осмысленные исключения:
- `InvalidOperationException` — email занят (контроллер ловит → 409)
- `UnauthorizedAccessException` — неверный логин/пароль (→ 401)

### Services/TokenService.cs

Собирает JWT из claims пользователя, подписывает HMAC-SHA256 с ключом из конфига.

### Controllers/AuthController.cs

Тонкий слой: принимает DTO, зовёт сервис, мапит исключения в HTTP-коды.

---

## Тестирование через Swagger

1. Открой https://localhost:7052/swagger
2. Если браузер ругается на сертификат — Advanced → Proceed.
3. Разверни `POST /api/auth/register` → **Try it out** → заполни JSON → **Execute**.
4. Скопируй `accessToken` из ответа.
5. Жми кнопку **Authorize** (зелёный замок справа сверху) → введи `Bearer <token>` → **Authorize** → **Close**.
6. Теперь можно дёргать защищённые endpoint'ы (когда добавим).

### Доверить локальный HTTPS-сертификат (опционально)

Чтобы браузер не ругался:

```bash
dotnet dev-certs https --trust
```

---

## Тестирование через curl

```bash
# Регистрация
curl -k -X POST https://localhost:7052/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"123456","fullName":"Test User"}'

# Логин
curl -k -X POST https://localhost:7052/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"123456"}'

# Защищённый запрос (когда появится)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
curl -k https://localhost:7052/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

Флаг `-k` отключает проверку сертификата для локальной разработки.

---

## Что дальше

Дорожная карта расширения бэкенда:

### Auth (доделать)

- [ ] **Refresh-токены** — длинный токен в БД, ротация при использовании, отзыв при логауте
- [ ] **POST /api/auth/refresh** — обновить access по refresh
- [ ] **POST /api/auth/logout** — отозвать refresh
- [ ] **Защищённый /api/users/me** — пример endpoint'а с `[Authorize]`
- [ ] **Роли** (Admin/User) и `[Authorize(Roles = "Admin")]`
- [ ] **Email verification** (токен → ссылка на email)
- [ ] **Forgot/Reset password**

### Дашборд

- [ ] Модули будущего функционала (определим по мере добавления)
- [ ] Глобальный обработчик ошибок (middleware) — убрать try/catch из контроллеров
- [ ] Логирование (Serilog)
- [ ] CORS для фронта
- [ ] Rate limiting на /login (защита от брутфорса)

### Качество

- [ ] Переход на PostgreSQL для прода
- [ ] Unit-тесты для AuthService (xUnit + Moq)
- [ ] Integration-тесты на endpoint'ы (WebApplicationFactory)
- [ ] CI (GitHub Actions: build + test)
- [ ] Docker-образ + docker-compose

---

## Полезные ссылки

- ASP.NET Core docs: https://learn.microsoft.com/aspnet/core
- EF Core docs: https://learn.microsoft.com/ef/core
- JWT.io (декодер токенов): https://jwt.io
- Swagger / OpenAPI: https://swagger.io/specification/
