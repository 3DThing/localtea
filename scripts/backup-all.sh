#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/backup-all.sh [db_dump_filename] [uploads_archive_filename]
# Examples:
#   ./scripts/backup-all.sh
#   OUT_DIR=./backups ./scripts/backup-all.sh localtea.dump uploads.tar.gz

OUT_DIR="${OUT_DIR:-./backups}"
mkdir -p "$OUT_DIR"

TS=$(date +"%Y%m%d-%H%M%S")
DB_FILE=${1:-"localtea-$TS.dump"}
UPLOADS_FILE=${2:-"uploads-$TS.tar.gz"}

echo "[1/2] Backing up Postgres -> $OUT_DIR/$DB_FILE"
OUT_DIR="$OUT_DIR" ./scripts/db-backup.sh "$DB_FILE"

# Uploads/media storage (images, avatars)
# In docker-compose.yml it's mounted from host: /var/www/localtea/uploads -> /app/uploads
# Also support local dev folders.
CANDIDATES=(
  "/var/www/localtea/uploads"
  "./uploads"
  "./backend/uploads"
)

existing_base_dirs=()
existing_names=()

for path in "${CANDIDATES[@]}"; do
  if [ -d "$path" ]; then
    if [[ "$path" == /* ]]; then
      base_dir=$(dirname "$path")
      name=$(basename "$path")
      existing_base_dirs+=("$base_dir")
      existing_names+=("$name")
    else
      # Relative path: make base relative to repo root
      base_dir=$(cd "$(dirname "$path")" && pwd)
      name=$(basename "$path")
      existing_base_dirs+=("$base_dir")
      existing_names+=("$name")
    fi
  fi
done

if [ ${#existing_names[@]} -eq 0 ]; then
  echo "[2/2] WARNING: No uploads directory found to archive. Looked for:" >&2
  printf '  - %s\n' "${CANDIDATES[@]}" >&2
  echo "Done (DB backup created)." >&2
  exit 0
fi

# Build tar args as pairs of: -C base name
# Deduplicate identical (base,name) pairs
pairs=()
for i in "${!existing_names[@]}"; do
  pair="${existing_base_dirs[$i]}|${existing_names[$i]}"
  pairs+=("$pair")
done

unique_pairs=$(printf "%s\n" "${pairs[@]}" | sort -u)

echo "[2/2] Archiving uploads -> $OUT_DIR/$UPLOADS_FILE"

# shellcheck disable=SC2086
{
  set +e
  tar_args=()
  while IFS='|' read -r base name; do
    [ -n "$base" ] || continue
    [ -n "$name" ] || continue
    tar_args+=("-C" "$base" "$name")
  done <<< "$unique_pairs"
  set -e

  tar -czf "$OUT_DIR/$UPLOADS_FILE" "${tar_args[@]}"
}

echo "Backups created:"
echo "- DB:      $OUT_DIR/$DB_FILE"
echo "- Uploads: $OUT_DIR/$UPLOADS_FILE"

echo
echo "Restore hints:"
echo "- DB:      ./scripts/db-restore.sh $OUT_DIR/$DB_FILE"
echo "- Uploads: tar -xzf $OUT_DIR/$UPLOADS_FILE -C /"
