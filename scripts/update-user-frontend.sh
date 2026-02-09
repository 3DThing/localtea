#!/usr/bin/env bash
set -euo pipefail

# Update user_frontend in production (Docker Compose v1).
# Usage:
#   ./scripts/update-user-frontend.sh [--no-cache] [--pull] [--force-recreate] [--hard-recreate]
# Examples:
#   ./scripts/update-user-frontend.sh
#   ./scripts/update-user-frontend.sh --pull
#   ./scripts/update-user-frontend.sh --no-cache --force-recreate
#   ./scripts/update-user-frontend.sh --hard-recreate

NO_CACHE=0
PULL=0
FORCE_RECREATE=0
HARD_RECREATE=0

for arg in "$@"; do
  case "$arg" in
    --no-cache) NO_CACHE=1 ;;
    --pull) PULL=1 ;;
    --force-recreate) FORCE_RECREATE=1 ;;
    --hard-recreate) HARD_RECREATE=1 ;;
    -h|--help)
      sed -n '1,40p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v docker-compose >/dev/null 2>&1; then
  echo "docker-compose is required but not found in PATH" >&2
  exit 1
fi

SERVICE="user_frontend"
COMPOSE_FILES=("-f" "docker-compose.yml")

BUILD_ARGS=("build")
if [[ "$NO_CACHE" == "1" ]]; then
  BUILD_ARGS+=("--no-cache")
fi
if [[ "$PULL" == "1" ]]; then
  BUILD_ARGS+=("--pull")
fi
BUILD_ARGS+=("$SERVICE")

echo "[update] Building $SERVICE..."
docker-compose "${COMPOSE_FILES[@]}" "${BUILD_ARGS[@]}"

UP_ARGS=("up" "-d" "--no-deps")
if [[ "$FORCE_RECREATE" == "1" ]]; then
  UP_ARGS+=("--force-recreate")
fi
UP_ARGS+=("$SERVICE")

echo "[update] Restarting $SERVICE..."
set +e
docker-compose "${COMPOSE_FILES[@]}" "${UP_ARGS[@]}"
UP_EXIT=$?
set -e

if [[ "$HARD_RECREATE" == "1" || "$UP_EXIT" != "0" ]]; then
  if [[ "$UP_EXIT" != "0" ]]; then
    echo "[update] docker-compose up failed (exit=$UP_EXIT). Trying hard recreate (stop + rm + up)..."
    echo "[update] Note: This is a known workaround for docker-compose v1 on newer Docker engines (KeyError: ContainerConfig)."
  else
    echo "[update] Hard recreate requested (stop + rm + up)..."
  fi

  docker-compose "${COMPOSE_FILES[@]}" stop "$SERVICE" || true
  docker-compose "${COMPOSE_FILES[@]}" rm -f "$SERVICE" || true
  docker-compose "${COMPOSE_FILES[@]}" up -d --no-deps "$SERVICE"
fi

echo "[update] Done. Current status:"
docker-compose "${COMPOSE_FILES[@]}" ps "$SERVICE"
