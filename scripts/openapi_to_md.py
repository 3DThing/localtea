#!/usr/bin/env python3
"""Convert OpenAPI JSON/YAML to Markdown.

Behavior:
- If `widdershins` is available on PATH, delegate conversion to it.
- Otherwise, perform a best-effort fallback conversion in Python
  that outputs paths, methods, params, request/response snippets.

Usage:
  python scripts/openapi_to_md.py \
    --in openapi_output/openapi.json \
    --out docs/API.md

If `--in` is omitted, defaults to `openapi_output/openapi.json`.
If `--out` is omitted, defaults to `docs/API.md`.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict


def run_widdershins(input_path: Path, output_path: Path) -> int:
    cmd = ["widdershins", str(input_path), "-o", str(output_path)]
    print("Running:", " ".join(cmd))
    return subprocess.run(cmd).returncode


def load_spec(path: Path) -> Dict[str, Any]:
    # try JSON first, then YAML if PyYAML available
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        try:
            import yaml

            with path.open("r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        except Exception as exc:
            raise RuntimeError(f"Failed to load OpenAPI spec {path}: {exc}")


def md_escape(s: str) -> str:
    return s.replace("`", "\\`")


def snippet_to_json(obj: Any) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False, indent=2)
    except Exception:
        return str(obj)


def generate_markdown(spec: Dict[str, Any]) -> str:
    lines: list[str] = []

    info = spec.get("info", {})
    title = info.get("title", "API")
    version = info.get("version", "")
    desc = info.get("description", "")

    lines.append(f"# {md_escape(title)}")
    if version:
        lines.append(f"**Version:** {md_escape(version)}")
    if desc:
        lines.append("")
        lines.append(desc)
    lines.append("")

    paths = spec.get("paths", {})
    if not paths:
        lines.append("_No paths found in the OpenAPI spec._")
        return "\n".join(lines)

    lines.append("## Endpoints")
    lines.append("")

    for path in sorted(paths.keys()):
        path_item = paths[path]
        lines.append(f"### `{path}`")
        lines.append("")
        for method in sorted(path_item.keys()):
            op = path_item[method]
            method_upper = method.upper()
            summary = op.get("summary") or op.get("operationId") or ""
            description = op.get("description", "")

            lines.append(f"#### {method_upper}")
            if summary:
                lines.append(f"**Summary:** {md_escape(summary)}")
            if description:
                lines.append("")
                lines.append(description)

            # Parameters
            params = op.get("parameters", [])
            if params:
                lines.append("")
                lines.append("**Parameters:**")
                lines.append("")
                for p in params:
                    name = p.get("name")
                    _in = p.get("in")
                    required = p.get("required", False)
                    pdesc = p.get("description", "")
                    schema = p.get("schema")
                    lines.append(f"- `{name}` ({_in}) {'**required**' if required else ''} - {md_escape(pdesc)}")
                    if schema:
                        lines.append("```json")
                        lines.append(snippet_to_json(schema))
                        lines.append("```")

            # Request body
            request_body = op.get("requestBody")
            if request_body:
                lines.append("")
                lines.append("**Request Body:**")
                rb_desc = request_body.get("description")
                if rb_desc:
                    lines.append(rb_desc)
                content = request_body.get("content", {})
                for ctype, cval in content.items():
                    lines.append("")
                    lines.append(f"- Content-Type: `{ctype}`")
                    schema = cval.get("schema")
                    if schema:
                        lines.append("```json")
                        lines.append(snippet_to_json(schema))
                        lines.append("```")

            # Responses
            responses = op.get("responses", {})
            if responses:
                lines.append("")
                lines.append("**Responses:**")
                for status, resp in sorted(responses.items()):
                    desc = resp.get("description", "")
                    lines.append("")
                    lines.append(f"- **{status}**: {md_escape(desc)}")
                    content = resp.get("content", {})
                    for ctype, cval in content.items():
                        lines.append(f"  - Content-Type: `{ctype}`")
                        schema = cval.get("schema")
                        if schema:
                            lines.append("```json")
                            lines.append(snippet_to_json(schema))
                            lines.append("```")

            lines.append("")

    # Components (brief)
    components = spec.get("components", {})
    if components:
        lines.append("## Components")
        lines.append("")
        schemas = components.get("schemas", {})
        if schemas:
            lines.append("### Schemas")
            lines.append("")
            for name, schema in sorted(schemas.items()):
                lines.append(f"#### {name}")
                lines.append("```json")
                lines.append(snippet_to_json(schema))
                lines.append("```")
                lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", "-i", dest="input", default="openapi_output/openapi.json",
                        help="Input OpenAPI file (JSON or YAML). Defaults to openapi_output/openapi.json")
    parser.add_argument("--out", "-o", dest="output", default="docs/API.md",
                        help="Output Markdown file. Defaults to docs/API.md")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    # Prefer widdershins if available
    if shutil.which("widdershins"):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        rc = run_widdershins(input_path, output_path)
        if rc == 0:
            print(f"Widdershins completed, wrote {output_path}")
            return
        else:
            print("widdershins failed, falling back to builtin converter")

    # Fallback conversion
    spec = load_spec(input_path)
    md = generate_markdown(spec)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        f.write(md)
    print(f"Wrote Markdown to {output_path} (fallback converter)")


if __name__ == "__main__":
    main()
