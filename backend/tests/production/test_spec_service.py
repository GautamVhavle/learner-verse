import json
from pathlib import Path

from app.production.schemas.v1.course_build import CourseBuildSpec
from app.production.services.spec_service import ProductionSpecService


def _example() -> dict:
    path = Path(__file__).resolve().parents[3] / "schemas/course-build/v1/minimal-course.json"
    return json.loads(path.read_text())


def test_minimal_example_validates_deterministically():
    service = ProductionSpecService()
    first = service.validate(_example())
    second = service.validate(_example())

    assert first.valid is True
    assert first.spec_checksum == second.spec_checksum
    assert first.normalized_plan is not None
    assert first.estimated_duration_seconds and first.estimated_duration_seconds > 0


def test_validation_errors_report_json_pointer():
    payload = _example()
    payload["sections"][0]["lessons"][0]["script"]["scenes"][0]["duration_policy"] = "fixed"

    result = ProductionSpecService().validate(payload)

    assert result.valid is False
    assert result.errors[0].field_path.startswith("/sections/0/lessons/0/script/scenes/0")


def test_dangling_asset_reference_is_rejected():
    payload = _example()
    payload["sections"][0]["lessons"][0]["script"]["scenes"][0]["asset_refs"] = ["missing"]

    result = ProductionSpecService().validate(payload)

    assert result.valid is False
    assert result.errors[0].code == "invalid_spec"


def test_generated_assets_are_respected_by_policy():
    payload = _example()
    payload["assets"] = {
        "hero": {
            "mode": "new",
            "generation": {"prompt": "A learning illustration"},
            "license_assertion": "owned_or_authorized",
        }
    }
    payload["sections"][0]["lessons"][0]["script"]["scenes"][0]["asset_refs"] = ["hero"]
    payload["policies"] = {"allow_generated_assets": False}

    result = ProductionSpecService().validate(payload)

    assert result.valid is False
    assert result.errors[0].field_path == "/"


def test_committed_json_schema_matches_model_schema():
    path = Path(__file__).resolve().parents[3] / "schemas/course-build/v1/course-build-spec.json"
    committed = json.loads(path.read_text())

    assert committed == CourseBuildSpec.model_json_schema(by_alias=True)
