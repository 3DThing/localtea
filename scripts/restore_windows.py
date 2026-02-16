#!/usr/bin/env python3
"""
Утилита для восстановления данных LocalTea на Windows.

Предназначена для ЛОКАЛЬНОЙ ОТЛАДКИ на Windows (PowerShell).
Работает с docker-compose.local.yml.

Примеры использования:

  Восстановление БД:
    python scripts/restore_windows.py -sql backups/localtea-20260216-174710.dump

  Восстановление файлов загрузок:
    python scripts/restore_windows.py -file backups/uploads-20260216-174710.tar.gz

  Восстановление БД + файлов:
    python scripts/restore_windows.py -sql backups/localtea-20260216-174710.dump -file backups/uploads-20260216-174710.tar.gz

  Полный бэкап (БД + загрузки -> backups/):
    python scripts/restore_windows.py -fullbackup

  Автоматический поиск и восстановление последнего бэкапа:
    python scripts/restore_windows.py -latest
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tarfile
from datetime import datetime
from pathlib import Path

# ──────────────────────────── constants ────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKUPS_DIR = PROJECT_ROOT / "backups"
COMPOSE_FILE = PROJECT_ROOT / "docker-compose.local.yml"
UPLOADS_DIR = PROJECT_ROOT / "uploads"

DB_NAME = "localtea"
DB_USER = "postgres"


# ──────────────────────────── helpers ──────────────────────────────

def _run(cmd: list[str], *, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a shell command and stream output."""
    print(f"  -> {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, check=check)


def _docker_compose(*args: str) -> list[str]:
    """Return the correct docker compose command with local config."""
    # Try `docker compose` (v2 plugin) first, fall back to `docker-compose`
    for candidate in (["docker", "compose"], ["docker-compose"]):
        try:
            subprocess.run(
                [*candidate, "version"],
                capture_output=True,
                check=True,
            )
            return [*candidate, "-f", str(COMPOSE_FILE), *args]
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    print("ERROR: Docker Compose не найден.", file=sys.stderr)
    print("  Убедитесь что Docker Desktop установлен и запущен.", file=sys.stderr)
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
        print("ERROR: Контейнер db не запущен.", file=sys.stderr)
        print("  Запустите: docker compose -f docker-compose.local.yml up -d db", file=sys.stderr)
        sys.exit(1)
    return cid


def _ensure_db_running() -> None:
    """Start the db service if not running."""
    result = subprocess.run(
        _docker_compose("ps", "-q", "db"),
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT,
    )
    if not result.stdout.strip():
        print("\n[*] Контейнер db не запущен. Запускаю db и redis...")
        _run(_docker_compose("up", "-d", "db", "redis"), cwd=PROJECT_ROOT)
        # Wait for db to be healthy
        print("[*] Жду готовности PostgreSQL...")
        import time
        for i in range(30):
            check = subprocess.run(
                _docker_compose("exec", "-T", "db", "pg_isready", "-U", "postgres"),
                capture_output=True,
                cwd=PROJECT_ROOT,
            )
            if check.returncode == 0:
                print("  PostgreSQL готов.")
                return
            time.sleep(2)
        print("ERROR: PostgreSQL не запустился за 60 секунд.", file=sys.stderr)
        sys.exit(1)


def _find_latest_backup(extension: str) -> Path | None:
    """Find the latest backup file with given extension pattern."""
    if not BACKUPS_DIR.is_dir():
        return None
    
    if extension == ".dump":
        files = sorted(BACKUPS_DIR.glob("localtea-*.dump"), reverse=True)
    elif extension == ".tar.gz":
        files = sorted(BACKUPS_DIR.glob("uploads-*.tar.gz"), reverse=True)
    else:
        return None
    
    return files[0] if files else None


# ──────────────────────── restore: SQL ─────────────────────────────

def restore_sql(dump_path: Path) -> None:
    """Restore a pg_dump (.dump) into the running Postgres container."""
    if not dump_path.is_file():
        print(f"ERROR: Файл дампа не найден: {dump_path}", file=sys.stderr)
        sys.exit(1)

    _ensure_db_running()
    cid = _get_db_container_id()
    container_tmp = f"/tmp/{dump_path.name}"

    print(f"\n[DB] Восстановление БД из {dump_path}")

    # copy dump into container
    _run(["docker", "cp", str(dump_path), f"{cid}:{container_tmp}"])

    # Drop and recreate database to avoid conflicts
    print("  Пересоздаю базу данных...")
    
    # Terminate existing connections
    _run(
        _docker_compose(
            "exec", "-T", "db",
            "psql", "-U", DB_USER, "-d", "postgres", "-c",
            f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{DB_NAME}' AND pid <> pg_backend_pid();",
        ),
        cwd=PROJECT_ROOT,
        check=False,
    )
    
    # Drop and recreate
    _run(
        _docker_compose(
            "exec", "-T", "db",
            "psql", "-U", DB_USER, "-d", "postgres", "-c",
            f"DROP DATABASE IF EXISTS {DB_NAME};",
        ),
        cwd=PROJECT_ROOT,
        check=False,
    )
    
    _run(
        _docker_compose(
            "exec", "-T", "db",
            "psql", "-U", DB_USER, "-d", "postgres", "-c",
            f"CREATE DATABASE {DB_NAME};",
        ),
        cwd=PROJECT_ROOT,
    )

    # pg_restore --no-owner --no-privileges
    _run(
        _docker_compose(
            "exec", "-T", "db",
            "pg_restore", "-U", DB_USER, "-d", DB_NAME,
            "--no-owner", "--no-privileges", container_tmp,
        ),
        cwd=PROJECT_ROOT,
        check=False,  # pg_restore may return warnings (non-zero) even on success
    )

    # Re-run init.sql to create app users
    print("  Настраиваю пользователей БД...")
    _run(
        _docker_compose(
            "exec", "-T", "db",
            "psql", "-U", DB_USER, "-d", DB_NAME, "-f",
            "/docker-entrypoint-initdb.d/init.sql",
        ),
        cwd=PROJECT_ROOT,
        check=False,  # Users may already exist
    )

    # cleanup
    _run(
        _docker_compose("exec", "-T", "db", "rm", "-f", container_tmp),
        cwd=PROJECT_ROOT,
    )

    print("[OK] База данных восстановлена.\n")


# ──────────────────────── restore: files ───────────────────────────

def restore_files(archive_path: Path) -> None:
    """Extract an uploads archive (.tar.gz) back into the project uploads dir."""
    if not archive_path.is_file():
        print(f"ERROR: Архив не найден: {archive_path}", file=sys.stderr)
        sys.exit(1)

    print(f"\n[FILES] Восстановление файлов из {archive_path}")

    # Ensure uploads directory exists
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Use Python's tarfile module — works on Windows without external tools
    try:
        with tarfile.open(str(archive_path), "r:gz") as tar:
            # The archive contains a root folder `uploads/`.
            # We extract to the parent of UPLOADS_DIR so `uploads/` lands correctly.
            extract_to = UPLOADS_DIR.parent
            
            # Security: filter out absolute paths and path traversals
            members = []
            for member in tar.getmembers():
                # Skip absolute paths or path traversal
                if member.name.startswith("/") or ".." in member.name:
                    print(f"  [!] Пропускаю небезопасный путь: {member.name}")
                    continue
                members.append(member)
            
            tar.extractall(path=str(extract_to), members=members)
        
        print(f"[OK] Файлы извлечены в {UPLOADS_DIR}\n")
    except tarfile.TarError as e:
        print(f"ERROR: Ошибка при распаковке архива: {e}", file=sys.stderr)
        sys.exit(1)


# ──────────────────────── full backup ──────────────────────────────

def full_backup() -> None:
    """Create a full backup: DB dump + uploads archive into backups/."""
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")

    db_file = BACKUPS_DIR / f"localtea-{ts}.dump"
    uploads_file = BACKUPS_DIR / f"uploads-{ts}.tar.gz"

    print("\n[BACKUP] Полный бэкап")

    # ── 1. Database ────────────────────────────────────────────────
    print(f"\n[1/2] Бэкап БД -> {db_file}")

    _ensure_db_running()
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
    print(f"  [OK] Дамп БД: {db_file}")

    # ── 2. Uploads ─────────────────────────────────────────────────
    print(f"\n[2/2] Бэкап загрузок -> {uploads_file}")

    if UPLOADS_DIR.is_dir() and any(UPLOADS_DIR.iterdir()):
        with tarfile.open(str(uploads_file), "w:gz") as tar:
            tar.add(str(UPLOADS_DIR), arcname="uploads")
        print(f"  [OK] Архив загрузок: {uploads_file}")
    else:
        print("  [!] Каталог загрузок пуст или не найден, пропускаю.")

    # ── Summary ────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Бэкап завершён:")
    print(f"  БД:       {db_file}")
    if uploads_file.is_file():
        print(f"  Загрузки: {uploads_file}")
    print()
    print("Для восстановления:")
    print(f"  python scripts/restore_windows.py -sql {db_file} -file {uploads_file}")
    print("=" * 60 + "\n")


# ──────────────────────── CLI ──────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Бэкап и восстановление LocalTea (Windows, локальная отладка)",
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
    parser.add_argument(
        "-latest",
        action="store_true",
        help="Автоматически найти и восстановить последний бэкап из backups/",
    )

    args = parser.parse_args()

    if not (args.sql or args.file or args.fullbackup or args.latest):
        parser.print_help()
        sys.exit(1)

    # Full backup (if requested)
    if args.fullbackup:
        full_backup()
        return

    # Auto-detect latest backups
    if args.latest:
        latest_dump = _find_latest_backup(".dump")
        latest_uploads = _find_latest_backup(".tar.gz")
        
        if not latest_dump and not latest_uploads:
            print("ERROR: Бэкапы не найдены в папке backups/", file=sys.stderr)
            sys.exit(1)
        
        if latest_dump:
            print(f"[*] Найден дамп БД: {latest_dump.name}")
            restore_sql(latest_dump)
        
        if latest_uploads:
            print(f"[*] Найден архив загрузок: {latest_uploads.name}")
            restore_files(latest_uploads)
        
        return

    # Restore operations
    if args.sql:
        restore_sql(args.sql.resolve())

    if args.file:
        restore_files(args.file.resolve())


if __name__ == "__main__":
    main()
