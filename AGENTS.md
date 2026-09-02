# Badminton 3x3 iPad — Codex / xtog Instructions

Repository:
- repo: ksp4022-ko/badminton-3x3-ipad-v1
- primary UI: index.html
- iPad/mobile touch first

xtog modes:
- xtog-direct = small/focused implementation
- xtog-patch = higher-risk multi-case change
- xtog-audit = read-only trace; no edit/commit/push unless explicitly requested

Every implementation:
1. git checkout main
2. git pull --ff-only
3. inspect actual latest source
4. never overwrite from stale conversation copies
5. minimum requested delta only
6. run checks
7. verify no unrelated changes
8. checks pass才 commit
9. push main
10. Plain text handoff required

Required checks:
- npm test
- npm run test:visual
- git diff --check
- voice work additionally run relevant voice tests / voice:sync when applicable

Stable Do Not Touch unless explicitly requested:
- scheduling/assignment algorithm
- queue priority/order
- rest sorting
- Next
- game counts/statistics
- court-switch algorithm
- registration/waiting behavior
- 今日重新開始 core behavior
- unrelated notifications
- D1/schema/migrations
- external API contracts

Court baseline:
- formal system remains 3 court slots
- courtLabel may be dynamic
- testing 4/5/A/B/C must NOT increase formal court count

Voice guardrails:
- voice never changes scheduling result
- announcement only consumes final player names + courtLabel
- fixed assets currently under voice-poc/ unless latest source intentionally moves them
- Chinese baseline: zh-TW-HsiaoChenNeural
- English baseline: en-US-AriaNeural rate -20%
- voice sync command: npm run voice:sync
- never invent/hardcode roster names into production logic

UI rule:
- screenshots/annotations are authoritative
- modify requested section only
- preserve iPad/mobile touch usability

Required Codex implementation handoff:

HEAD BEFORE:
HEAD AFTER:

CHANGED FILES:

CHANGES:
- ...

TEST:
- npm test:
- npm run test:visual:
- git diff --check:

COMMIT:
PUSH:

ISSUES:
- NONE

xtog-audit must instead include:
CHANGES: NONE
COMMIT: NONE
PUSH: NONE

Efficiency:
Keep future xtog implementation minimal.
Do not repeat/reopen completed features unless requested.
