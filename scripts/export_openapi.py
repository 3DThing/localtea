#!/usr/bin/env python3
"""Dump FastAPI OpenAPI schema to files.

Usage (from project root):
  # inside docker container (recommended, so env is available):
  docker-compose exec backend python scripts/export_openapi.py

  # or locally (make sure PYTHONPATH and env are set):
  python3 scripts/export_openapi.py

Outputs to `openapi_output/openapi.json` and, if PyYAML is installed,
`openapi_output/openapi.yaml`.
"""

import argparse
import importlib
import json
import sys
from pathlib import Path


def add_project_root_to_path():
    # Try to add repository root to sys.path so imports like `backend` work
    here = Path(__file__).resolve()
    # scripts/ is usually at <repo>/scripts/, repo root is parent
    repo_root = here.parent.parent
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))


def load_app(module_spec: str):
    """Load FastAPI `app` given a module spec.

    module_spec format: `module.path:attr` (attr defaults to `app`)
    Examples: `backend.main:app`, `main:app`, `app:application`
    """
    add_project_root_to_path()

    if ":" in module_spec:
        module_name, attr = module_spec.split(":", 1)
    else:
        module_name, attr = module_spec, "app"

    try:
        module = importlib.import_module(module_name)
        app = getattr(module, attr)
        return app
    except Exception as exc:
        print(f"Failed to import `{attr}` from `{module_name}`: {exc}")
        # Try a few sensible fallbacks
        fallbacks = [
            "backend.main:app",
            "main:app",
            "app:app",
            "backend.app:app",
        ]
        for fb in fallbacks:
            try:
                m, a = fb.split(":", 1)
                module = importlib.import_module(m)
                app = getattr(module, a)
                print(f"Loaded app via fallback `{fb}`")
                return app
            except Exception:
                continue
        print("If your app is defined elsewhere, pass its module path with --module, e.g. --module backend.main:app")
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", "-m", default="backend.main:app",
                        help="Python module where FastAPI `app` is defined, e.g. backend.main:app")
    args = parser.parse_args()

    app = load_app(args.module)
    spec = app.openapi()

    out_dir = Path("openapi_output")
    out_dir.mkdir(parents=True, exist_ok=True)

    json_path = out_dir / "openapi.json"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)
    print("Wrote:", json_path)

    try:
        import yaml

        yaml_path = out_dir / "openapi.yaml"
        with yaml_path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(spec, f, sort_keys=False, allow_unicode=True)
        print("Wrote:", yaml_path)
    except Exception:
        print("PyYAML not installed; skipping YAML output. Install with: pip install pyyaml")

if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(2)
