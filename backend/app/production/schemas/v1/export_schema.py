"""Generate the committed JSON Schema used by API and future MCP clients."""

from __future__ import annotations

import json
from pathlib import Path

from app.production.schemas.v1.course_build import CourseBuildSpec


def output_path() -> Path:
    return Path(__file__).resolve().parents[5] / "schemas/course-build/v1/course-build-spec.json"


def write_schema() -> Path:
    path = output_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    schema = CourseBuildSpec.model_json_schema(by_alias=True)
    path.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


if __name__ == "__main__":
    print(write_schema())
