# Medium Pipeline — Lightweight Flow

Used for 2-5 file changes with some design decisions. No standalone docs.

## Tasks (create ALL at pipeline start)

```
TaskCreate: "Brief Plan"        activeForm: "Planning approach"
TaskCreate: "Implement (TDD)"   activeForm: "Implementing changes"
TaskCreate: "Test & Review"     activeForm: "Testing and reviewing"
TaskCreate: "Merge"             activeForm: "Merging to main"
```

## 1. Brief Plan

- TaskUpdate → in_progress
- Write 3-5 bullet points INLINE describing:
  - What files to change and why
  - Key design choice (if any)
  - Test strategy (1 sentence)
- Present to user inline. This is the ONLY hard gate.
- Wait for "approved" or feedback.
- TaskUpdate → completed

## 2. Implement

- TaskUpdate → in_progress
- Create feature branch: `feature/{slug}` or `fix/{slug}`
- Implement with TDD:
  - Write failing test → implement → verify → commit
  - Repeat per logical change
- TaskUpdate → completed

## 3. Test & Review

- TaskUpdate → in_progress
- Run full test suite
- Quick code review (inline, no REVIEW.md):
  - Any critical issues? → report inline, user decides
  - Warnings? → fix immediately (1 round)
  - Clean? → proceed
- TaskUpdate → completed

## 4. Merge

- TaskUpdate → in_progress
- Update CHANGELOG.md (Keep a Changelog format)
- Squash merge to target branch
- Delete feature branch
- TaskUpdate → completed
- Announce: `[Medium] Complete: {description}`
