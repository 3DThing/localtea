#!/usr/bin/env bash
set -euo pipefail
# ──────────────────────────────────────────────────────────────────
# deploy.sh — скрипт деплоя на сервере
#
# Вызывается из CI/CD или вручную:
#   cd /root/LocalTea && bash scripts/deploy.sh
#
# Что делает:
#   1. git pull
#   2. Автоматический бэкап БД перед деплоем
#   3. Пересборка и перезапуск контейнеров (prod)
#   4. Применение миграций Alembic
#   5. Очистка старых Docker-образов
# ──────────────────────────────────────────────────────────────────

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "═══════════════════════════════════════════════"
echo "  LocalTea Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════"

# ── 1. Pull latest code ──────────────────────────────────────────
echo ""
echo "[1/5] Pulling latest code..."
git pull --ff-only origin main

# ── 2. Pre-deploy backup ─────────────────────────────────────────
echo ""
echo "[2/5] Pre-deploy database backup..."
if docker compose -f "$COMPOSE_FILE" ps -q db 2>/dev/null | grep -q .; then
  python3 scripts/restore.py -fullbackup || echo "WARNING: Backup failed, continuing deploy..."
else
  echo "  ⚠  DB container not running, skipping backup."
fi

# ── 3. Build & restart ───────────────────────────────────────────
echo ""
echo "[3/5] Building and restarting containers..."
docker compose -f "$COMPOSE_FILE" build --parallel
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── 4. Run migrations ────────────────────────────────────────────
echo ""
echo "[4/5] Running database migrations..."
# Wait for DB to be healthy
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  echo "  Waiting for database... ($i/30)"
  sleep 2
done

docker compose -f "$COMPOSE_FILE" exec -T backend \
  alembic upgrade head || echo "WARNING: Migrations failed or no pending migrations."

# ── 5. Cleanup ────────────────────────────────────────────────────
echo ""
echo "[5/5] Cleaning up old Docker images..."
docker image prune -f --filter "until=168h" 2>/dev/null || true

# ── Done ──────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  Deploy complete!"
echo ""
echo "  Services status:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo "═══════════════════════════════════════════════"
