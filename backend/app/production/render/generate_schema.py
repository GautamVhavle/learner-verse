"""Regenerate schemas/render-manifest/v1/render-manifest.json after contract changes."""

from __future__ import annotations

import json
from pathlib import Path

from app.production.render.schemas import RenderManifestV1


def main() -> None:
    target = (
        Path(__file__).resolve().parents[4]
        / "schemas"
        / "render-manifest"
        / "v1"
        / "render-manifest.json"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(RenderManifestV1.model_json_schema(), indent=2, ensure_ascii=False) + "\n"
    )


if __name__ == "__main__":
    main()
