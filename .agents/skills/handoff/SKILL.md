---
name: handoff
description: Keep project handoff documentation up to date after development work. Use when files are added, removed, moved, refactored, or when work is completed, blocked, or handed off in coding agents such as Codex, Claude, OpenCode, or similar tools.
license: MIT
---

# Handoff Documentation

After each meaningful development session, update the relevant documentation in `docs/`.

## Required Updates

* Update `docs/progress.md` after every meaningful session with the current project state, work completed, active or blocked work, and the next concrete steps. Keep it concise and current so another session can resume without reconstructing the conversation.
* Update `docs/architecture.md` when files, folders, modules, responsibilities, or project structure change.
* Update `docs/handoff.md` with what was done, why it was done, current state, and recommended next steps.
* Update `docs/changelog.md` when behavior, features, fixes, refactors, or documentation meaningfully changed.
* Update `docs/to-do.md` by marking completed work and adding remaining tasks as clear, actionable items.
* Update `docs/known-pitfalls.md` when a repeated failure pattern, fragile behavior, blocker, or useful workaround is discovered.

## Rules

* Keep entries concise, factual, and useful for the next AI agent or developer.
* Preserve the existing format of each documentation file.
* Do not rewrite entire documents unless the current content is outdated or misleading.
* Do not claim work is complete unless it was actually completed.
* If something is uncertain, mark it as needing verification.
* Avoid duplicate information across files unless each file needs different context.

## Limited Context or Token Budget

* Keep track of whether the remaining context or token budget is likely to be insufficient to finish the requested work reliably. Do not claim an exact remaining amount unless the environment provides it.
* If completion is at risk, tell the user promptly before running out of context. Then save a checkpoint in `docs/progress.md` before continuing broad work.
* The checkpoint must state the user's goal, work completed, files changed, decisions and assumptions, checks performed and their results, blockers, and the next concrete action. Update the relevant handoff and to-do entries as well.
* Save current project-file edits and preserve unfinished work. Do not leave the user with only a chat summary when a durable project checkpoint can be written.

## Completion Summary

Before finishing, report:

* The current project state and the checkpoint location, if one was needed.
* Which documentation files were updated.
* What major changes were recorded.
* What remaining tasks were added.
* What pitfalls or blockers were documented.
* Which expected files were not updated, and why.

