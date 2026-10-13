# Claude Repository Instructions

Read `AGENTS.md` and `HANDOFF_CLAUDE.md` before changing anything.
The repository workflow, checks, scope limits, and plain-text handoff in
`AGENTS.md` apply to Claude as well as Codex.

- Read latest main and actual source; never restore code from chat snapshots.
- Inspect the worktree before checkout/pull. Preserve unrelated user changes.
- Do not implement pending work until the user requests it.
- The current Admin redesign is a gated preview, not the formal Admin UI.
  Do not promote it to the formal entry without explicit user approval.
- Reuse existing nodes, handlers, state, persistence, and confirmations.
- Never reset user storage, IndexedDB voices, or rosters to make a UI test pass.
- Never commit secrets or expose generator authorization to the browser.
- Screenshots and the latest user request define the intended UI.
- Do not claim physical iOS acceptance from Playwright/UA emulation alone.
- Commit only intended files after required checks pass; push main according
  to the existing workflow and report what is actually live.

Voice note: AGENTS.md still describes historical fixed Aria assets. The current
production local-voice contract in index.html is HsiaoChen/default and
Ana/-35%, specVersion local-voice-v1. Do not revert this contract to Aria.
Inspect current source and flag conflicting documentation instead of changing
voice providers or playback behavior as unrelated cleanup.
