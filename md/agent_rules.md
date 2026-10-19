# agent_rules.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. 5-Model Role Distribution & Hybrid Delegation (Project-Wide Mandatory)

**The Orchestrator (`Gemini 4 Argon`) must NEVER directly edit product source files (`src/**`).**

1. **Internal Subagent Delegation (`Gemini 3.8 Flash`)**:
   - UI/Tailwind styling, badge/modal/drawer markup, fast codebase research, and `docs/` sync tasks must be delegated immediately via `define_subagent` (`enable_write_tools: true` when editing) and `invoke_subagent` with `Model: "flash"` (explicitly specified by the user).
2. **External Model Dispatch Queue (`GPT Codex`, `Claude Opus 5.5`, `GitHub Copilot`)**:
   - Core ledger/payment/subscription logic and Vitest unit tests (**GPT Codex**), static code review (`review.json`) and complex refactoring (**Claude Opus 5.5**), and general feature implementation (**GitHub Copilot**) must be registered as `▶ READY` in `docs/handoff.md`'s `## 🎯 Active AI Collaboration Dispatch Queue`. Stop immediately after updating the queue and ask the user to switch to the assigned model and enter `"인수인계 문서를 확인해"`.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
