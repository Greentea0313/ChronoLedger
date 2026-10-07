from __future__ import annotations

import io
import json
import subprocess
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import replace
from pathlib import Path
from typing import Any
from unittest.mock import patch

from run_gemini_reviewer import (
    ReviewRunError,
    _terminal_safe,
    main,
    make_review_artifact,
    prepare_review,
    save_review_atomically,
)


REPO_ROOT = Path(__file__).resolve().parents[2]


class GeminiReviewerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.worktree = self.root / ".worktrees" / "sample-run"
        self.worktree.parent.mkdir(parents=True)
        self._git(self.root, "init", "-b", "main")
        self._git(self.root, "config", "user.email", "test@example.invalid")
        self._git(self.root, "config", "user.name", "Test")
        (self.root / "tracked.txt").write_text("base\n", encoding="utf-8")
        self._git(self.root, "add", "tracked.txt")
        self._git(self.root, "commit", "-m", "base")
        self.base_sha = self._git(self.root, "rev-parse", "HEAD")
        (self.root / "tracked.txt").write_text("base\ntarget change\n", encoding="utf-8")
        self._git(self.root, "commit", "-am", "target")
        self.target_sha = self._git(self.root, "rev-parse", "HEAD")
        self._git(
            self.root,
            "worktree",
            "add",
            "-b",
            "collab/sample-run",
            str(self.worktree),
            self.target_sha,
        )
        self.run_dir = self.root / "artifacts" / "sample-run"
        self.iteration_dir = self.run_dir / "iteration-01"
        self.iteration_dir.mkdir(parents=True)
        (self.run_dir / "run.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "run_id": "sample-run",
                    "created_at": "2026-10-07T12:00:00Z",
                    "objective": "Review the target change",
                    "acceptance_criteria": ["The change is reviewed"],
                    "base_sha": self.base_sha,
                    "target_sha": self.target_sha,
                    "branch": "collab/sample-run",
                    "worktree_path": ".worktrees/sample-run",
                    "max_iterations": 3,
                    "status": "in_progress",
                }
            ),
            encoding="utf-8",
        )
        self.schemas = self.root / "artifacts" / "schemas"
        self.schemas.mkdir()
        for name in ("run.schema.json", "review.schema.json"):
            source = REPO_ROOT / "artifacts" / "schemas" / name
            (self.schemas / name).write_bytes(source.read_bytes())

    def tearDown(self) -> None:
        subprocess.run(
            ["git", "-C", str(self.root), "worktree", "remove", "--force", str(self.worktree)],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.temp_dir.cleanup()

    @staticmethod
    def _git(repo: Path, *args: str) -> str:
        result = subprocess.run(
            ["git", "-C", str(repo), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
        return result.stdout.strip()

    def _rewrite_manifest(self, **changes: Any) -> None:
        manifest_path = self.run_dir / "run.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest.update(changes)
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    def test_prepares_exact_clean_target_range(self) -> None:
        prepared = prepare_review(self.root, "sample-run", 1)
        self.assertEqual(prepared.base_sha, self.base_sha)
        self.assertEqual(prepared.target_sha, self.target_sha)
        self.assertEqual(prepared.changed_paths, ("tracked.txt",))
        self.assertIn("+target change", prepared.diff_text)
        self.assertEqual(prepared.acceptance_criteria, ("The change is reviewed",))

    def test_reads_powershell_utf8_bom_manifest(self) -> None:
        manifest_path = self.run_dir / "run.json"
        manifest_path.write_text(
            manifest_path.read_text(encoding="utf-8"),
            encoding="utf-8-sig",
        )
        prepared = prepare_review(self.root, "sample-run", 1)
        self.assertEqual(prepared.target_sha, self.target_sha)

    def test_rejects_manifest_target_that_is_not_worktree_head(self) -> None:
        self._rewrite_manifest(target_sha=self.base_sha)
        with self.assertRaisesRegex(ReviewRunError, "HEAD does not equal"):
            prepare_review(self.root, "sample-run", 1)

    def test_rejects_dirty_worktree(self) -> None:
        (self.worktree / "tracked.txt").write_text("uncommitted\n", encoding="utf-8")
        with self.assertRaisesRegex(ReviewRunError, "not clean"):
            prepare_review(self.root, "sample-run", 1)

    def test_rejects_sensitive_path(self) -> None:
        self._git(self.root, "worktree", "remove", str(self.worktree))
        (self.root / ".env.local").write_text("NOT_A_REAL_SECRET=value\n", encoding="utf-8")
        self._git(self.root, "add", ".env.local")
        self._git(self.root, "commit", "-m", "add local env fixture")
        self.target_sha = self._git(self.root, "rev-parse", "HEAD")
        self._git(
            self.root,
            "worktree",
            "add",
            "-B",
            "collab/sample-run",
            str(self.worktree),
            self.target_sha,
        )
        self._rewrite_manifest(target_sha=self.target_sha)
        with self.assertRaisesRegex(ReviewRunError, "Sensitive-path filter"):
            prepare_review(self.root, "sample-run", 1)

    def test_rejects_secret_pattern_without_echoing_value(self) -> None:
        (self.root / "tracked.txt").write_text('password = "ACTUAL_SECRET_VALUE_123"\n', encoding="utf-8")
        self._git(self.root, "commit", "-am", "add secret fixture")
        self.target_sha = self._git(self.root, "rev-parse", "HEAD")
        self._git(self.root, "worktree", "remove", str(self.worktree))
        self._git(
            self.root,
            "worktree",
            "add",
            "-B",
            "collab/sample-run",
            str(self.worktree),
            self.target_sha,
        )
        self._rewrite_manifest(target_sha=self.target_sha)
        with self.assertRaisesRegex(ReviewRunError, "Secret-pattern scan"):
            prepare_review(self.root, "sample-run", 1)

    def test_rejects_overwrite(self) -> None:
        prepared = prepare_review(self.root, "sample-run", 1)
        prepared.output_path.write_text("preserve me", encoding="utf-8")
        with self.assertRaisesRegex(ReviewRunError, "Refusing to overwrite"):
            save_review_atomically({}, self.schemas / "review.schema.json", prepared.output_path)
        self.assertEqual(prepared.output_path.read_text(encoding="utf-8"), "preserve me")

    def test_rejects_invalid_artifact_without_creating_output(self) -> None:
        prepared = prepare_review(self.root, "sample-run", 1)
        artifact = make_review_artifact(
            {"status": "clean", "findings": [{"unexpected": "finding"}]},
            prepared,
            "test-model",
        )
        with self.assertRaisesRegex(ReviewRunError, "JSON Schema validation"):
            save_review_atomically(
                artifact, self.schemas / "review.schema.json", prepared.output_path
            )
        self.assertFalse(prepared.output_path.exists())

    def test_builds_schema_valid_envelope_from_review_body(self) -> None:
        prepared = prepare_review(self.root, "sample-run", 1)
        artifact = make_review_artifact(
            {"status": "clean", "findings": []}, prepared, "test-model"
        )
        save_review_atomically(
            artifact, self.schemas / "review.schema.json", prepared.output_path
        )
        saved = json.loads(prepared.output_path.read_text(encoding="utf-8"))
        self.assertEqual(saved["target_sha"], self.target_sha)
        self.assertEqual(saved["role"], "static-review")
        self.assertEqual(saved["status"], "clean")

    def test_terminal_preview_escapes_control_characters(self) -> None:
        self.assertEqual(_terminal_safe("safe\x1b[31m\ntext"), r"safe\x1b[31m" + "\ntext")

    def test_dry_run_escapes_control_characters_in_diff(self) -> None:
        prepared = replace(
            prepare_review(self.root, "sample-run", 1),
            diff_text="safe\x1b[31munsafe\n",
        )
        output = io.StringIO()
        with patch("run_gemini_reviewer.prepare_review", return_value=prepared):
            with redirect_stdout(output):
                exit_code = main(
                    [
                        "--run-id",
                        "sample-run",
                        "--iteration",
                        "1",
                        "--repo-root",
                        str(self.root),
                        "--dry-run",
                    ]
                )
        self.assertEqual(exit_code, 0)
        self.assertIn(r"safe\x1b[31munsafe", output.getvalue())

    def test_declined_transfer_never_calls_gemini(self) -> None:
        errors = io.StringIO()
        with (
            patch.dict(
                "os.environ",
                {"GEMINI_MODEL": "gemini-test", "GEMINI_API_KEY": "test-key"},
            ),
            patch("run_gemini_reviewer._confirm_external_transfer", return_value=False),
            patch("run_gemini_reviewer.call_gemini_api") as call_gemini,
            redirect_stderr(errors),
        ):
            exit_code = main(
                [
                    "--run-id",
                    "sample-run",
                    "--iteration",
                    "1",
                    "--repo-root",
                    str(self.root),
                ]
            )
        self.assertEqual(exit_code, 2)
        call_gemini.assert_not_called()
        self.assertIn("user declined external transfer", errors.getvalue())

    def test_approved_transfer_saves_validated_review(self) -> None:
        output = io.StringIO()
        with (
            patch.dict(
                "os.environ",
                {"GEMINI_MODEL": "gemini-test", "GEMINI_API_KEY": "test-key"},
            ),
            patch("run_gemini_reviewer._confirm_external_transfer", return_value=True),
            patch(
                "run_gemini_reviewer.call_gemini_api",
                return_value={"status": "clean", "findings": []},
            ) as call_gemini,
            redirect_stdout(output),
        ):
            exit_code = main(
                [
                    "--run-id",
                    "sample-run",
                    "--iteration",
                    "1",
                    "--repo-root",
                    str(self.root),
                ]
            )
        self.assertEqual(exit_code, 0)
        args, _ = call_gemini.call_args
        self.assertEqual(args[:2], ("test-key", "gemini-test"))
        self.assertIn("+target change", args[2])
        saved = json.loads(
            (self.iteration_dir / "review.json").read_text(encoding="utf-8")
        )
        self.assertEqual(saved["target_sha"], self.target_sha)
        self.assertIn("Review draft saved after schema validation", output.getvalue())


if __name__ == "__main__":
    unittest.main()
