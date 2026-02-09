# pgAdmin для PostgreSQL

## Обзор

pgAdmin — это веб-интерфейс для управления базами данных PostgreSQL. В проекте LocalTea он развернут в Docker контейнере с безопасным доступом через nginx с HTTPS и ограничением по IP адресам.

## Доступ

### URL
```
https://pg.localtea.ru
```

### Автоматический редирект
HTTP запросы автоматически перенаправляются на HTTPS:
```
http://pg.localtea.ru → https://pg.localtea.ru
```

## Безопасность

### HTTPS и сертификаты
- **SSL сертификат**: Let's Encrypt
- **Срок действия**: 90 дней с автоматическим продлением
- **Протоколы**: TLSv1.2, TLSv1.3
- **Шифрование**: HIGH grade ciphers

### Ограничение доступа по IP адресам

Доступ разрешен только со следующих адресов:

#### Внешние IP
- `5.129.219.127` — основной сервер
- `188.92.28.153` — разрешенный клиент

#### Локальные сети
- `127.0.0.0/8` — localhost
- `10.0.0.0/8` — приватная сеть
- `172.16.0.0/12` — Docker сети
- `192.168.0.0/16` — приватная сеть

**Остальные IP получат ответ 403 Forbidden.**

## Инфраструктура

### Docker контейнер

pgAdmin запущен в контейнере:
- **Image**: `dpage/pgadmin4:latest`
- **Container name**: `pgadmin`
- **Port**: `127.0.0.1:8003:80` (доступен только локально)
- **Network**: `localtea_default` (Docker сеть)

### Nginx обратный прокси

pgAdmin доступен через nginx обратный прокси с конфигурацией в `/etc/nginx/sites-available/pg.localtea.ru`:

```nginx
# HTTP блок для Let's Encrypt и редиректа на HTTPS
server {
    listen 80;
    server_name pg.localtea.ru;
    
    location /.well-known/acme-challenge/ {
        # Позволяет всем IP (для валидации сертификата)
        allow all;
    }
    
    location / {
        # Редирект на HTTPS
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS блок с IP фильтрацией
server {
    listen 443 ssl http2;
    server_name pg.localtea.ru;
    
    ssl_certificate /etc/letsencrypt/live/pg.localtea.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pg.localtea.ru/privkey.pem;
    
    # IP фильтрация
    if ($allowed_ip = 0) {
        return 403;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8003;
        # ... заголовки и настройки прокси
    }
}
```

## Подключение к базе данных

### Параметры подключения

Внутри Docker контейнера используйте следующие параметры:

| Параметр | Значение |
|----------|----------|
| Host | `db` |
| Port | `5432` |
| Database | `localtea` |
| User | `postgres` |
| Password | `postgres` |

### Шаги подключения

1. Откройте https://pg.localtea.ru
2. Авторизуйтесь в pgAdmin
3. В меню выберите **Servers → Register → Server**
4. На вкладке **General** введите имя сервера
5. На вкладке **Connection** заполните параметры:
   - **Host**: `db`
   - **Port**: `5432`
   - **Maintenance database**: `postgres`
   - **Username**: `postgres`
    - **Password**: `postgres` (и отметьте **Save password?** при необходимости)
6. Нажмите **Save**

## Управление контейнером

### Проверка статуса
```bash
docker ps | grep pgadmin
```

### Просмотр логов
```bash
docker logs pgadmin
```

### Перезапуск контейнера
```bash
docker restart pgadmin
```

### Остановка контейнера
```bash
docker stop pgadmin
```

### Запуск контейнера
```bash
docker start pgadmin
```

## Сертификаты Let's Encrypt

### Автоматическое продление
Certbot настроен на автоматическое продление сертификата за 30 дней до истечения срока.

### Проверка статуса сертификата
```bash
certbot certificates
```

### Ручное продление
```bash
certbot renew --force-renewal
```

### Логи Certbot
```bash
tail -f /var/log/letsencrypt/letsencrypt.log
```

## Troubleshooting

### pgAdmin недоступен

**Проверка 1**: Docker контейнер запущен?
```bash
docker ps | grep pgadmin
```

**Проверка 2**: Сеть доступна?
```bash
docker exec pgadmin ping db
```

**Проверка 3**: nginx работает?
```bash
systemctl status nginx
```

**Проверка 4**: Ваш IP в разрешенном списке?
```bash
curl -v https://pg.localtea.ru
```

Если IP не в списке, вернется код 403.

### Сертификат истекает

Проверьте автоматическое продление:
```bash
certbot renew --dry-run
```

Если сертификат не продлевается, проверьте логи:
```bash
tail -50 /var/log/letsencrypt/letsencrypt.log
```

## История конфигурации

| Дата | Изменение |
|------|-----------|
| 2025-12-08 | Инициальная настройка: HTTPS, IP whitelist, Docker контейнер |
