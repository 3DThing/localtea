#!/usr/bin/env bash
set -euo pipefail

# Backs up all .env / .env.* files found in the repo into backups/ as a tar.gz.
# WARNING: The resulting archive contains secrets in plaintext. Store it securely.
#
# Usage:
#   ./scripts/backup-env.sh [output_filename]
# Examples:
#   ./scripts/backup-env.sh
#   OUT_DIR=./backups ./scripts/backup-env.sh env.tar.gz

OUT_DIR="${OUT_DIR:-./backups}"
mkdir -p "$OUT_DIR"

TS=$(date +"%Y%m%d-%H%M%S")
DEFAULT_FILE="env-$TS.tar.gz"
OUT_FILE=${1:-"$DEFAULT_FILE"}

# Find env files excluding common large folders
mapfile -t env_files < <(
  find . -type d \( \
      -name .git -o -name node_modules -o -name .next -o -name dist -o -name build -o \
      -name pg_data -o -name backups -o -name __pycache__ \
    \) -prune -o \
    -type f \( -name '.env' -o -name '.env.*' \) -print | sort
)

if [ ${#env_files[@]} -eq 0 ]; then
  echo "No .env files found. Nothing to back up." >&2
  exit 0
fi

echo "Creating env backup: $OUT_DIR/$OUT_FILE"

# Use -C repo_root to keep paths relative
repo_root=$(pwd)
(
  cd "$repo_root"
  tar -czf "$OUT_DIR/$OUT_FILE" --warning=no-file-changed "${env_files[@]}"
)

chmod 600 "$OUT_DIR/$OUT_FILE" || true

echo "Included files:"
printf '  - %s\n' "${env_files[@]}"

echo "Backup saved to: $OUT_DIR/$OUT_FILE"
