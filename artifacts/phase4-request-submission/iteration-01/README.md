# Iteration 01

Target SHA is recorded by Maker after implementation. Reviewer and Orchestrator must use that same SHA.
Write sanitized results to `review.json` and `test.json` using `artifacts/schemas/`.
Do not put raw logs, credentials, or personal data in shared result files.

Gemini's separate manual static-review result is recorded in `gemini-manual-review.md` and `gemini-review.json`. It does not replace or modify `review.json`; the manual review reported no findings and left live Supabase/RLS/RPC behavior unverified.
