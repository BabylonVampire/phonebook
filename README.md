# Телефонный справочник

NestJS (TypeScript) + PostgreSQL на сервере, Vite + React (TypeScript) на клиенте.
Приложение работает только с PostgreSQL.

## Запуск в Docker (рекомендуется)

Нужен Docker Desktop (или Docker Engine с плагином compose).

```bash
docker compose up -d --build
```

Откройте http://localhost:3000. Поднимаются два контейнера:

- `db` — PostgreSQL 16, данные хранятся в томе `pgdata`, снаружи доступен на порту **5433**;
- `app` — сервер NestJS, который раздаёт и собранный React-клиент. Стартует после того, как `db` прошла healthcheck.

При первом запуске сервер создаёт таблицы и заполняет их моковыми данными (12 абонентов).
Логин, пароль, имя БД и порты можно поменять: скопируйте `.env.example` в `.env`.

```bash
docker compose logs -f app       # логи приложения
docker compose down              # остановить
docker compose down -v           # остановить и удалить данные БД (моковые данные создадутся заново)
```

Подключиться к БД (например, из pgAdmin или DBeaver): `localhost:5433`, база `phonebook`,
пользователь и пароль `phonebook` / `phonebook`.

## Разработка без сборки образа приложения

```bash
npm run setup                    # зависимости (корень, server, client)
docker compose up -d db          # только PostgreSQL
cp server/.env.example server/.env
npm run dev                      # сервер :3000 + Vite :5173 (прокси /api → :3000)
```

## Структура (MVC)

| Слой       | Файлы |
|------------|-------|
| Model      | `server/src/database.service.ts`, `server/src/phonebook.service.ts` |
| Controller | `server/src/phonebook.controller.ts` (REST API `/api/...`) |
| View       | `client/src/App.tsx`, `dialogs.tsx`, `Fields.tsx`, `api.ts` |
