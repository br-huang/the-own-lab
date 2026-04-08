---
name: orchestrator
description: "Company of One orchestrator. Read this skill ONLY when a user message implies work (bug, feature, refactor, plan, review) AND the task is Medium or Large. Do NOT read for questions, explanations, or Small tasks."
disable-model-invocation: false
user-invocable: false
---

# Orchestrator — Medium & Large Tasks Only

You only need this file when the session-start context told you to upgrade from Small.
If the task is Small, stop reading and just do the work.

---

## Sizing Confirmation

Before proceeding, confirm the size is correct:

| Size | Criteria | Flow |
|------|----------|------|
| **Small** | Single file, clear, <2 min | STOP READING. Just code it. |
| **Medium** | 2-5 files, some design, 5-15 min | Use the Medium flow below. |
| **Large** | Cross-module, architectural, >15 min | Read pipeline reference file. |

**Default to Small. Only upgrade if you see clear signals:**
- Multiple modules/files → Medium
- Architecture decision needed → Large
- User explicitly asks to plan/design → Large
- "just", "quickly", "simple" → stay Small even if 2-3 files

---

## Medium Flow

**1. Announce + TaskCreate (same message):**
```
[Medium] {type}: {description}

TaskCreate: "Brief Plan"
TaskCreate: "Implement"
TaskCreate: "Test & Review"
TaskCreate: "Merge"
```

**2. Brief Plan** (the ONLY gate):
- 3-5 bullet points INLINE: what to change, why, test strategy
- User confirms or adjusts
- TaskUpdate → completed

**3. Implement**:
- Create branch: `feature/{slug}` or `fix/{slug}`
- TDD: test → implement → verify → commit
- TaskUpdate → completed

**4. Test & Review**:
- Run tests. Quick review inline (no REVIEW.md).
- Issues? Fix once. Still broken? Report to user.
- TaskUpdate → completed

**5. Merge**:
- Update CHANGELOG.md
- Squash merge. Delete branch.
- TaskUpdate → completed

---

## Large Flow

Read the appropriate pipeline reference:
- Develop → `${CLAUDE_SKILL_DIR}/references/pipeline-develop.md`
- Debug → `${CLAUDE_SKILL_DIR}/references/pipeline-debug.md`
- Refactor → `${CLAUDE_SKILL_DIR}/references/pipeline-refactor.md`
- Plan → `${CLAUDE_SKILL_DIR}/references/pipeline-plan.md`
- Review → `${CLAUDE_SKILL_DIR}/references/pipeline-review.md`

Create specs directory: `docs/specs/{YYYY-MM-DD}-{type}-{slug}/`

**Max 2 hard gates** for Large pipelines:
- Gate 1: Design/Diagnosis approval (confirm approach before coding)
- Gate 2: Review approval (confirm quality before merging)
- All other stages auto-proceed.

---

## UI Detection (Large only)

Signals: frontend, UI, UX, layout, page, screen, component, button, form, modal, theme, dark mode, responsive, CSS, style, visual

If detected → insert UI Wireframe stage (ui-designer agent) between Design and Plan.

---

## Review-Fix Loop

- Medium: 1 round max, inline
- Large: 2 rounds max, REVIEW.md produced
- Critical issues always go to user
