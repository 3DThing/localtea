FROM python:3.10-slim as base

# Создаем пользователя заранее, но пока не переключаемся
# UID 10001 - стандартная практика для non-root
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -s /bin/false -m appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Dev Stage (Для локальной разработки) ---
FROM base as dev
# Оставляем root, чтобы работали volume mounts
# Оставляем shell (/bin/bash) для отладки
# Копируем код (хотя он все равно перекроется вольюмом в docker-compose)
COPY . .
# Запуск с --reload
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- Prod Stage (Для боевого сервера) ---
FROM base as prod
# Копируем код приложения
COPY . .

# Создаём каталоги с правильными правами
RUN mkdir -p /app/backend/logs /app/uploads && \
    chown -R appuser:appuser /app/backend/logs /app/uploads

# Удаляем shell для безопасности (если кто-то проломит RCE, он не сможет запустить команды)
RUN rm -rf /bin/sh /bin/bash /usr/bin/sh /usr/bin/bash

# Переключаемся на безопасного пользователя
USER 10001

# Запуск без reload
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
