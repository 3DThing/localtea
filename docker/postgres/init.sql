-- Создание пользователей
-- В реальном проде пароли должны быть сложными и передаваться через переменные,
-- но для init-скрипта в docker-entrypoint часто используют хардкод или envsubst.
-- Здесь используем дефолтные, которые должны совпадать с .env

-- 1. Пользователь для миграций (Alembic) - Владелец схемы
CREATE USER migration_user WITH PASSWORD 'migration_password';

-- 2. Пользователь приложения (FastAPI) - Ограниченные права
CREATE USER app_user WITH PASSWORD 'app_password';

-- Предоставление прав на базу данных
GRANT CONNECT ON DATABASE localtea TO migration_user;
GRANT CONNECT ON DATABASE localtea TO app_user;

-- Подключаемся к базе (хотя init скрипты обычно запускаются уже в контексте БД, если она создана через POSTGRES_DB)
\c localtea

-- Настройка прав на схему public
GRANT USAGE, CREATE ON SCHEMA public TO migration_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- Права для migration_user (Полные права на всё)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO migration_user;

-- Права для app_user (Только DML)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Настройка прав по умолчанию для БУДУЩИХ таблиц
-- Если migration_user создает таблицу, app_user получает к ней доступ
ALTER DEFAULT PRIVILEGES FOR ROLE migration_user IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE migration_user IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Если migration_user создает таблицу, он сам имеет полные права (это дефолт, но явно не помешает)
ALTER DEFAULT PRIVILEGES FOR ROLE migration_user IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO migration_user;
