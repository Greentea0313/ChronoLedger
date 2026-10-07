#!/usr/bin/env python3
"""Validate a collaboration JSON artifact against its JSON Schema."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import SchemaError


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def validate_artifact(artifact_path: Path, schema_path: Path) -> tuple[str, ...]:
    schema = _load_json(schema_path)
    Draft202012Validator.check_schema(schema)
    artifact = _load_json(artifact_path)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return tuple(
        ".".join(str(part) for part in error.path) or "<root>"
        for error in validator.iter_errors(artifact)
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--schema", required=True, type=Path)
    args = parser.parse_args(argv)

    try:
        errors = validate_artifact(args.artifact, args.schema)
    except (OSError, UnicodeError, json.JSONDecodeError, SchemaError, ValueError) as exc:
        print(f"Validation could not complete: {exc}", file=sys.stderr)
        return 2

    if errors:
        for location in errors:
            print(f"Invalid artifact at {location}.", file=sys.stderr)
        return 1
    print(f"Valid: {args.artifact}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
