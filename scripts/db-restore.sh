#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/db-restore.sh /path/to/dump.dump [target_db]
# WARNING: This will restore into target_db and can overwrite data. Use with care.

if [ $# -lt 1 ]; then
  echo "Usage: $0 /path/to/dump.dump [target_db]"
  exit 2
fi

DUMP_PATH="$1"
TARGET_DB=${2:-localtea}

if [ ! -f "$DUMP_PATH" ]; then
  echo "ERROR: Dump file not found: $DUMP_PATH" >&2
  exit 1
fi

# Copy dump into container
DB_CONTAINER=$(docker-compose ps -q db)
if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: Could not find running db container" >&2
  exit 1
fi

FNAME=$(basename "$DUMP_PATH")
CONTAINER_PATH="/tmp/$FNAME"

echo "Copying $DUMP_PATH -> $DB_CONTAINER:$CONTAINER_PATH"
docker cp "$DUMP_PATH" "$DB_CONTAINER":"$CONTAINER_PATH"

echo "Restoring into database '$TARGET_DB' (this may overwrite data)."

echo "If you want a clean restore, ensure the target DB exists and is empty or adjust command."

echo "Running pg_restore inside container..."
# Using --no-owner to avoid ownership issues, --clean to drop objects before recreate
docker-compose exec db pg_restore -U postgres -d "$TARGET_DB" --clean --no-owner "$CONTAINER_PATH"

echo "Removing temporary dump from container..."
docker-compose exec db rm -f "$CONTAINER_PATH"

echo "Restore finished."
