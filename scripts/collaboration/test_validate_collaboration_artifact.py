from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from validate_collaboration_artifact import validate_artifact


class CollaborationArtifactValidatorTests(unittest.TestCase):
    def test_validates_review_artifact(self) -> None:
        repository_root = Path(__file__).resolve().parents[2]
        schema_path = repository_root / "artifacts" / "schemas" / "review.schema.json"
        artifact = {
            "schema_version": 1,
            "run_id": "sample-run",
            "iteration": 1,
            "agent": "Copilot Reviewer",
            "role": "static-review",
            "base_sha": "abcdef0",
            "target_sha": "1234567",
            "status": "clean",
            "created_at": "2026-10-07T12:00:00Z",
            "findings": [],
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            artifact_path = Path(temp_dir) / "review.json"
            artifact_path.write_text(json.dumps(artifact), encoding="utf-8")
            self.assertEqual(validate_artifact(artifact_path, schema_path), ())

    def test_reports_invalid_artifact_without_echoing_values(self) -> None:
        repository_root = Path(__file__).resolve().parents[2]
        schema_path = repository_root / "artifacts" / "schemas" / "review.schema.json"
        with tempfile.TemporaryDirectory() as temp_dir:
            artifact_path = Path(temp_dir) / "review.json"
            artifact_path.write_text(
                json.dumps({"private": "sensitive-value"}), encoding="utf-8"
            )
            errors = validate_artifact(artifact_path, schema_path)
        self.assertIn("<root>", errors)


if __name__ == "__main__":
    unittest.main()
