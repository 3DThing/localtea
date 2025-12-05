#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/db-backup.sh [output_filename]
# Default filename: backups/localtea-YYYYMMDD-HHMMSS.dump

OUT_DIR="./backups"
mkdir -p "$OUT_DIR"

TS=$(date +"%Y%m%d-%H%M%S")
DEFAULT_FILE="localtea-$TS.dump"
FILE=${1:-$DEFAULT_FILE}

CONTAINER_DIR="/tmp/$FILE"

echo "Creating backup: $FILE"

echo "Dumping database inside container..."
docker-compose exec db pg_dump -U postgres -Fc -f "$CONTAINER_DIR" localtea

echo "Copying dump from container to host ($OUT_DIR/$FILE)..."
DB_CONTAINER=$(docker-compose ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: Could not find running db container" >&2
  exit 1
fi

docker cp "$DB_CONTAINER":"$CONTAINER_DIR" "$OUT_DIR/$FILE"

echo "Removing temporary dump from container..."
docker-compose exec db rm -f "$CONTAINER_DIR"

echo "Backup saved to: $OUT_DIR/$FILE"

echo "To restore: ./scripts/db-restore.sh $OUT_DIR/$FILE"
