#!/usr/bin/env python3
"""
Утилита для бэкапа и восстановления данных LocalTea.

Примеры использования:

  Восстановление БД:
    python3 scripts/restore.py -sql /root/LocalTea/backups/localtea-20260123-125952.dump

  Восстановление файлов загрузок:
    python3 scripts/restore.py -file /root/LocalTea/backups/uploads-20260123-130008.tar.gz

  Восстановление БД + файлов:
    python3 scripts/restore.py \\
      -sql /root/LocalTea/backups/localtea-20260123-125952.dump \\
      -file /root/LocalTea/backups/uploads-20260123-130008.tar.gz

  Полный бэкап (БД + загрузки -> backups/):
    python3 scripts/restore.py -fullbackup
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ──────────────────────────── constants ────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKUPS_DIR = PROJECT_ROOT / "backups"
COMPOSE_FILE = PROJECT_ROOT / "docker-compose.yml"

UPLOAD_CANDIDATES: list[Path] = [
    Path("/var/www/localtea/uploads"),
    PROJECT_ROOT / "uploads",
    PROJECT_ROOT / "backend" / "uploads",
]

DB_NAME = "localtea"
DB_USER = "postgres"


# ──────────────────────────── helpers ──────────────────────────────

def _run(cmd: list[str], *, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command and stream output."""
    print(f"  → {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, check=check)


def _docker_compose(*args: str) -> list[str]:
    """Return the correct docker-compose / docker compose command."""
    # Try `docker compose` (v2 plugin) first, fall back to `docker-compose`
    for candidate in (["docker", "compose"], ["docker-compose"]):
        try:
            subprocess.run(
                [*candidate, "version"],
                capture_output=True,
                check=True,
            )
            return [*candidate, *args]
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    print("ERROR: ни docker compose, ни docker-compose не найдены", file=sys.stderr)
    sys.exit(1)


def _get_db_container_id() -> str:
    """Return the container ID of the running `db` service."""
    result = subprocess.run(
        _docker_compose("ps", "-q", "db"),
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT,
    )
    cid = result.stdout.strip()
    if not cid:
        print("ERROR: Контейнер db не запущен. Запустите `docker compose up -d db`.", file=sys.stderr)
        sys.exit(1)
    return cid


def _find_uploads_dir() -> Path | None:
    """Return the first existing uploads directory, or None."""
    for p in UPLOAD_CANDIDATES:
        if p.is_dir():
            return p
    return None


# ──────────────────────── restore: SQL ─────────────────────────────

def restore_sql(dump_path: Path) -> None:
    """Restore a pg_dump (.dump) into the running Postgres container."""
    if not dump_path.is_file():
        print(f"ERROR: Файл дампа не найден: {dump_path}", file=sys.stderr)
        sys.exit(1)

    cid = _get_db_container_id()
    container_tmp = f"/tmp/{dump_path.name}"

    print(f"\n📦 Восстановление БД из {dump_path}")

    # copy dump into container
    _run(["docker", "cp", str(dump_path), f"{cid}:{container_tmp}"])

    # pg_restore --clean --if-exists --no-owner
    _run(
        _docker_compose(
            "exec", "-T", "db",
            "pg_restore", "-U", DB_USER, "-d", DB_NAME,
            "--clean", "--if-exists", "--no-owner", container_tmp,
        ),
        cwd=PROJECT_ROOT,
        check=False,  # pg_restore may return warnings (non-zero) even on success
    )

    # cleanup
    _run(
        _docker_compose("exec", "-T", "db", "rm", "-f", container_tmp),
        cwd=PROJECT_ROOT,
    )

    print("✅ База данных восстановлена.\n")


# ──────────────────────── restore: files ───────────────────────────

def restore_files(archive_path: Path) -> None:
    """Extract an uploads archive (.tar.gz) back into the correct location."""
    if not archive_path.is_file():
        print(f"ERROR: Архив не найден: {archive_path}", file=sys.stderr)
        sys.exit(1)

    print(f"\n📂 Восстановление файлов из {archive_path}")

    # Determine where to extract.
    # The archive was created with `tar -czf ... -C /var/www/localtea uploads`
    # so it contains a root folder `uploads/`.  We detect the current uploads
    # mount point and extract there.
    uploads_dir = _find_uploads_dir()

    if uploads_dir:
        # Extract into the *parent* of the existing uploads dir so that
        # the `uploads/` folder inside the archive lands correctly.
        extract_to = uploads_dir.parent
    else:
        # Fallback: extract to /var/www/localtea (prod) or project root (dev)
        prod_path = Path("/var/www/localtea")
        if prod_path.is_dir():
            extract_to = prod_path
        else:
            extract_to = PROJECT_ROOT
        print(f"  ⚠  Каталог загрузок не найден, извлекаю в {extract_to}")

    tar_cmd = ["tar", "-xzf", str(archive_path), "-C", str(extract_to)]

    # If extracting to a system path and we're not root, use sudo
    needs_sudo = (
        str(extract_to).startswith("/var/")
        and os.geteuid() != 0
    )
    if needs_sudo:
        print("  ℹ  Требуются права sudo для записи в системный каталог")
        tar_cmd = ["sudo"] + tar_cmd

    _run(tar_cmd, check=False)

    print(f"✅ Файлы извлечены в {extract_to}/uploads\n")


# ──────────────────────── full backup ──────────────────────────────

def full_backup() -> None:
    """Create a full backup: DB dump + uploads archive into backups/."""
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")

    db_file = BACKUPS_DIR / f"localtea-{ts}.dump"
    uploads_file = BACKUPS_DIR / f"uploads-{ts}.tar.gz"

    print("\n🗄  Полный бэкап")

    # ── 1. Database ────────────────────────────────────────────────
    print(f"\n[1/2] Бэкап БД → {db_file}")

    cid = _get_db_container_id()
    container_tmp = f"/tmp/localtea-{ts}.dump"

    _run(
        _docker_compose(
            "exec", "-T", "db",
            "pg_dump", "-U", DB_USER, "-Fc", "-f", container_tmp, DB_NAME,
        ),
        cwd=PROJECT_ROOT,
    )
    _run(["docker", "cp", f"{cid}:{container_tmp}", str(db_file)])
    _run(
        _docker_compose("exec", "-T", "db", "rm", "-f", container_tmp),
        cwd=PROJECT_ROOT,
    )
    print(f"  ✓ Дамп БД: {db_file}")

    # ── 2. Uploads ─────────────────────────────────────────────────
    print(f"\n[2/2] Бэкап загрузок → {uploads_file}")

    uploads_dir = _find_uploads_dir()
    if uploads_dir is None:
        print("  ⚠  Каталог загрузок не найден, пропускаю.")
        print("     Искал:", ", ".join(str(p) for p in UPLOAD_CANDIDATES))
    else:
        _run([
            "tar", "-czf", str(uploads_file),
            "-C", str(uploads_dir.parent),
            uploads_dir.name,
        ])
        print(f"  ✓ Архив загрузок: {uploads_file}")

    # ── Summary ────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Бэкап завершён:")
    print(f"  БД:       {db_file}")
    if uploads_dir:
        print(f"  Загрузки: {uploads_file}")
    print()
    print("Для восстановления:")
    print(f"  python3 scripts/restore.py -sql {db_file}", end="")
    if uploads_dir:
        print(f" -file {uploads_file}", end="")
    print()
    print("=" * 60 + "\n")


# ──────────────────────── CLI ──────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Бэкап и восстановление LocalTea (БД + загрузки)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "-sql",
        metavar="PATH",
        type=Path,
        help="Путь до .dump файла для восстановления БД",
    )
    parser.add_argument(
        "-file",
        metavar="PATH",
        type=Path,
        help="Путь до .tar.gz архива для восстановления загрузок",
    )
    parser.add_argument(
        "-fullbackup",
        action="store_true",
        help="Создать полный бэкап (БД + загрузки) в backups/",
    )

    args = parser.parse_args()

    if not (args.sql or args.file or args.fullbackup):
        parser.print_help()
        sys.exit(1)

    # Full backup first (if requested)
    if args.fullbackup:
        full_backup()

    # Restore operations
    if args.sql:
        restore_sql(args.sql.resolve())

    if args.file:
        restore_files(args.file.resolve())


if __name__ == "__main__":
    main()
