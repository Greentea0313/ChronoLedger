# Iteration 01

Maker records the Target SHA in docs/handoff.md after the implementation commit (run.json stays unchanged).
Reviewer (or Orchestrator) copies that SHA into run.json target_sha in the artifact commit and reviews Base..Target.
Write sanitized results to `review.json` and `test.json` using `artifacts/schemas/`.
Do not put raw logs, credentials, or personal data in shared result files.
