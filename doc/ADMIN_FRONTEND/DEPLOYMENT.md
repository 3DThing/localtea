# Развёртывание Admin Frontend

## Оглавление

- [Требования](#требования)
- [Переменные окружения](#переменные-окружения)
- [Режимы работы](#режимы-работы)
- [Docker Deploy](#docker-deploy)
- [NGINX конфигурация](#nginx-конфигурация)
- [SSL сертификаты](#ssl-сертификаты)
- [Обновление и CI/CD](#обновление-и-cicd)
- [Troubleshooting](#troubleshooting)

---

## Требования

- Node.js 20+
- Docker и Docker Compose
- NGINX (для production)
- ~2GB RAM (для сборки)
- ~500MB дискового пространства

## Переменные окружения

### `.env.local` (в папке admin_frontend)

```env
# Development
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1

# Production
NEXT_PUBLIC_API_URL=https://apiadmin.localtea.ru/api/v1
```

> **Важно:** `NEXT_PUBLIC_*` переменные встраиваются в bundle при сборке, поэтому при изменении требуется пересборка.

---

## Режимы работы

### Сравнение режимов

| Параметр | Development | Production |
|----------|-------------|------------|
| Скорость загрузки | 5-30 сек (компиляция на лету) | 50-100 мс |
| Hot Reload | ✅ Да | ❌ Нет |
| Source Maps | ✅ Полные | ⚠️ Минимальные |
| Размер образа | ~1.5 GB | ~200 MB |
| Потребление RAM | ~500 MB | ~100 MB |
| Применение | Разработка, отладка | Production сервер |

### Production режим (рекомендуется)

**Используется по умолчанию** — все страницы предварительно скомпилированы, мгновенная загрузка.

```bash
# Сборка и запуск
docker-compose up -d admin_frontend

# Пересборка при изменениях в коде
docker-compose build admin_frontend && docker-compose up -d admin_frontend

# Полная пересборка (без кэша)
docker-compose build --no-cache admin_frontend && docker-compose up -d admin_frontend
```

### Development режим

Используйте когда нужен hot-reload для активной разработки:

```bash
# Запуск в режиме разработки
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up admin_frontend

# С пересборкой
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build admin_frontend

# В фоне
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d admin_frontend
```

### Переключение режимов

```bash
# Остановить текущий контейнер
docker-compose stop admin_frontend && docker-compose rm -f admin_frontend

# Запустить в нужном режиме
# Production:
docker-compose up -d admin_frontend

# Development:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d admin_frontend
```

---

## Docker Deploy

### Файлы конфигурации

#### `Dockerfile.prod` (Production)

```dockerfile
# Multi-stage build для минимального размера образа
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci --only=production=false

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

#### `Dockerfile` (Development)

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

#### `docker-compose.yml` (Production)

```yaml
services:
  admin_frontend:
    build:
      context: ./admin_frontend
      dockerfile: Dockerfile.prod
      args:
        - NEXT_PUBLIC_API_URL=https://apiadmin.localtea.ru/api/v1
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://apiadmin.localtea.ru/api/v1
    restart: unless-stopped
```

#### `docker-compose.dev.yml` (Development override)

```yaml
version: '3.3'
services:
  admin_frontend:
    build:
      context: ./admin_frontend
      dockerfile: Dockerfile
    volumes:
      - ./admin_frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - WATCHPACK_POLLING=true
      - NEXT_PUBLIC_API_URL=https://apiadmin.localtea.ru/api/v1
    stdin_open: true
    tty: true
    restart: "no"
```

### Команды Docker

```bash
# Проверка статуса
docker ps | grep admin_frontend

# Логи (последние 100 строк)
docker logs --tail 100 localtea_admin_frontend_1

# Логи в реальном времени
docker logs -f localtea_admin_frontend_1

# Перезапуск
docker-compose restart admin_frontend

# Остановка
docker-compose stop admin_frontend

# Удаление контейнера
docker-compose rm -f admin_frontend

# Очистка неиспользуемых образов (освобождение места)
docker system prune -af
```

---

## NGINX конфигурация

### `/etc/nginx/sites-available/admin.localtea.ru`

```nginx
upstream admin_frontend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name admin.localtea.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.localtea.ru;

    ssl_certificate /etc/letsencrypt/live/api.localtea.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.localtea.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Ограничение доступа по IP
    allow 188.92.28.153;
    allow 5.129.219.127;
    allow 127.0.0.1;
    deny all;

    location / {
        proxy_pass http://admin_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
}
```

### Применение конфигурации

```bash
# Создать симлинк (если еще нет)
ln -s /etc/nginx/sites-available/admin.localtea.ru /etc/nginx/sites-enabled/

# Проверка синтаксиса
nginx -t

# Перезагрузка
systemctl reload nginx
```

---

## SSL сертификаты

### Получение через Certbot

```bash
# Установка certbot
apt install certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d admin.localtea.ru

# Для нескольких доменов
certbot --nginx -d api.localtea.ru -d apiadmin.localtea.ru -d admin.localtea.ru
```

### Автообновление

```bash
# Проверка таймера автообновления
systemctl list-timers | grep certbot

# Тест обновления
certbot renew --dry-run

# Проверка срока действия
certbot certificates
```

---

## Обновление и CI/CD

### Ручное обновление

```bash
cd /root/LocalTea

# Получить изменения
git pull

# Пересобрать и перезапустить
docker-compose build admin_frontend
docker-compose up -d admin_frontend

# Проверить
docker logs --tail 20 localtea_admin_frontend_1
```

### Скрипт быстрого деплоя

Создайте файл `scripts/deploy-admin-frontend.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Admin Frontend..."

cd /root/LocalTea

# Остановить старый контейнер
docker-compose stop admin_frontend

# Собрать новый образ
docker-compose build admin_frontend

# Запустить
docker-compose up -d admin_frontend

# Подождать запуска
sleep 3

# Проверить
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login | grep -q "200"; then
    echo "✅ Deploy successful!"
else
    echo "❌ Deploy failed! Check logs:"
    docker logs --tail 30 localtea_admin_frontend_1
    exit 1
fi
```

```bash
chmod +x scripts/deploy-admin-frontend.sh
```

### Zero-downtime deploy

```bash
# Собрать новый образ без остановки текущего
docker-compose build admin_frontend

# Быстрая замена контейнера
docker-compose up -d --no-deps --force-recreate admin_frontend
```

---

## Troubleshooting

### 502 Bad Gateway

Контейнер не запущен или упал:

```bash
# Проверить статус
docker ps -a | grep admin_frontend

# Если Exited — перезапустить
docker-compose up -d admin_frontend

# Проверить логи
docker logs localtea_admin_frontend_1
```

### Долгая загрузка страниц (10+ секунд)

Приложение работает в режиме разработки. Переключитесь на production:

```bash
docker-compose stop admin_frontend
docker-compose rm -f admin_frontend
docker-compose build admin_frontend
docker-compose up -d admin_frontend
```

### Ошибка "no space left on device" при сборке

```bash
# Очистить Docker
docker system prune -af
docker volume prune -f

# Повторить сборку
docker-compose build --no-cache admin_frontend
```

### CORS ошибки

Убедитесь что домен добавлен в `admin_backend/main.py`:

```python
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://admin.localtea.ru",
]
```

### 403 Forbidden

Ваш IP не в белом списке NGINX:

```bash
# Узнать свой IP
curl ifconfig.me

# Добавить в NGINX конфиг
nano /etc/nginx/sites-available/admin.localtea.ru
# Добавить: allow YOUR_IP;

nginx -t && systemctl reload nginx
```

### Белый экран / JS ошибки

```bash
# Полная пересборка
docker-compose stop admin_frontend
docker-compose rm -f admin_frontend
docker-compose build --no-cache admin_frontend
docker-compose up -d admin_frontend
```

### Изменения в коде не применяются

В production режиме требуется пересборка:

```bash
docker-compose build admin_frontend && docker-compose up -d admin_frontend
```

---

## Чек-лист деплоя

- [ ] Код загружен на сервер (`git pull`)
- [ ] Переменные окружения настроены (`.env.local`)
- [ ] Docker образ собран (`docker-compose build admin_frontend`)
- [ ] Контейнер запущен (`docker-compose up -d admin_frontend`)
- [ ] NGINX настроен и работает (`nginx -t && systemctl status nginx`)
- [ ] SSL сертификат валиден (`certbot certificates`)
- [ ] IP добавлен в белый список
- [ ] Сайт доступен (`curl -I https://admin.localtea.ru`)
- [ ] Авторизация работает
