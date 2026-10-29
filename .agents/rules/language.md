---
trigger: always_on
description: Ensures the agent always communicates with the user in Korean, including tool calls like ask_question.
---

# Korean Language Communication Rule (한국어 소통 원칙)

- **Always communicate with the user in Korean.**
- When prompting questions to the user (e.g. using `ask_question`), **the question text and all options MUST be written in Korean**.
- All interactive explanations, progress reports, handoff messages, and conversational summaries must be in Korean, unless English is explicitly requested (e.g., standard code comments, commit messages, or test names where conventional).
