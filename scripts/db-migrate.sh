#!/usr/bin/env bash
set -euo pipefail

CMD=${1:-help}
shift || true

function die() {
  echo "$@" >&2
  exit 1
}

function usage() {
  cat <<EOF
Usage: $0 <command> [args]

Commands:
  new "message"     Create a new alembic revision (autogenerate) with message
  upgrade            Apply migrations: alembic upgrade head
  current            Show current alembic version
  downgrade REV      Downgrade to REV (default -1)
  help               Show this message
EOF
  exit 1
}

# Ensure docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
  die "docker-compose is required but not found in PATH"
fi

case "$CMD" in
  new)
    MSG=${1:-"auto-migration"}
    echo "Creating new migration with message: $MSG"
    docker-compose exec backend alembic revision --autogenerate -m "$MSG"
    ;;
  upgrade)
    echo "Applying migrations (upgrade head)"
    docker-compose exec backend alembic upgrade head
    ;;
  current)
    echo "Current alembic version:"
    docker-compose exec backend alembic current
    ;;
  downgrade)
    REV=${1:--1}
    echo "Downgrading alembic to: $REV"
    docker-compose exec backend alembic downgrade "$REV"
    ;;
  help|*)
    usage
    ;;
esac
