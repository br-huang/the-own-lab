---
name: orchestrator
description: 'Company of One orchestrator. Read this skill ONLY when a user message implies work (bug, feature, refactor, plan, review) AND the task is Medium or Large. Do NOT read for questions, explanations, or Small tasks.'
disable-model-invocation: false
user-invocable: false
---

# Orchestrator — Team Coordinator

You coordinate a team of agents. Not a linear pipeline — a team working in parallel.

**Default to Small.** Only upgrade when clearly needed.

---

## Sizing → Execution Model

| Size       | Execution                       | Agents                                       |
| ---------- | ------------------------------- | -------------------------------------------- |
| **Small**  | Just do it. No team.            | You alone.                                   |
| **Medium** | Partial parallel. 2-3 agents.   | Brief plan → implement → test+review → merge |
| **Large**  | Full team. Wave-based parallel. | Read pipeline reference for wave details.    |

---

## State Management (Medium + Large)

Pipeline state is managed by shell scripts — not prompt conventions.
Call these via Bash tool at each transition:

```bash
# Initialize pipeline state
bash hooks/scripts/lib/pipeline-state.sh init <pipeline> <feature> <size> <wave_count>

# Wave transitions
bash hooks/scripts/lib/pipeline-state.sh wave-start <wave_num> <agent1> [agent2...]
bash hooks/scripts/lib/pipeline-state.sh wave-complete <wave_num>

# Gate decisions
bash hooks/scripts/lib/pipeline-state.sh gate <gate_name> <approved|rejected>

# Brief management (agent handoff — single source of truth)
bash hooks/scripts/lib/brief-manager.sh init <pipeline> <feature> <size>
bash hooks/scripts/lib/brief-manager.sh update <field> <value>
bash hooks/scripts/lib/brief-manager.sh read

# Pipeline completion (runs all finalization: state + brief archive + context + pattern index)
bash hooks/scripts/pipeline-complete.sh
```

**CRITICAL: Call these scripts. Do not skip them. This is how state persists across sessions.**

---

## Medium Flow (partial parallel)

**1. Initialize + TaskCreate:**

```bash
bash hooks/scripts/lib/pipeline-state.sh init develop {feature} medium 4
bash hooks/scripts/lib/brief-manager.sh init develop {feature} medium
```

```
TaskCreate: "Brief Plan" / "Implement" / "Test & Review" / "Merge"
```

**2. Brief Plan** — 3-5 bullets inline. User confirms (only gate).
**3. Implement** — branch + TDD.
**4. Test & Review** — run tests + quick review. 1 fix round max. Both inline.
**5. Merge** — CHANGELOG + squash merge + `bash hooks/scripts/pipeline-complete.sh`

---

## Large Flow (full team, wave-based)

Read the appropriate pipeline reference:

- Develop → `${CLAUDE_SKILL_DIR}/references/pipeline-develop.md`
- Debug → `${CLAUDE_SKILL_DIR}/references/pipeline-debug.md`
- Refactor → `${CLAUDE_SKILL_DIR}/references/pipeline-refactor.md`
- Plan → `${CLAUDE_SKILL_DIR}/references/pipeline-plan.md`
- Review → `${CLAUDE_SKILL_DIR}/references/pipeline-review.md`

### Key principle: WAVES, not stages

```
Wave = a set of agents working in PARALLEL
Sync = wait for all agents in the wave to finish
Gate = wait for USER approval (max 2 per pipeline)
```

Launch parallel agents using multiple Agent tool calls in the SAME message.
After a wave completes, start the next wave immediately (unless there's a gate).

### Max 2 hard gates for Large:

1. **Design approval** — before implementation starts
2. **Review approval** — before merge

---

## UI Detection (Large only)

Signals: frontend, UI, UX, layout, page, screen, component, button, form, modal, theme, dark mode, responsive, CSS, style, visual

If detected → add ui-designer to Wave 2 (parallel with architect + QA).

---

## Review-Fix Loop

- Medium: 1 round, inline
- Large: 2 rounds max, reviewer → developer auto-fix → reviewer re-verify
- Critical issues always go to user
