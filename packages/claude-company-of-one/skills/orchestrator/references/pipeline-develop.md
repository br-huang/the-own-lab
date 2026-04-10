# Develop Pipeline — Agent Team Model

## Task Creation

At pipeline start, create ALL tasks:

```
TaskCreate: "Wave 1: Requirements + Branch Setup"
TaskCreate: "Wave 2: Design + Test Plan"
TaskCreate: "Wave 3: Implementation Plan + Scaffold"
TaskCreate: "Wave 4: Implement (TDD)"
TaskCreate: "Wave 5: Verify + Review"
TaskCreate: "Wave 6: Merge + Ship"
```

Initialize brief: `bash hooks/scripts/lib/brief-manager.sh init develop {feature} large`

---

## Wave 1: Requirements + Branch Setup

**Agents: product-owner + devops (PARALLEL)**

Launch both agents in the SAME message:

```
Agent(product-owner):
  "Clarify requirements for: {user's request}
   Ask questions ONE AT A TIME.
   Update brief: bash hooks/scripts/lib/brief-manager.sh update requirements '{1-3 sentence summary}'
   Include acceptance criteria, scope, constraints."

Agent(devops):
  "Create feature branch: feature/{slug}
   Set up for development."
```

**Sync 1**: Wait for both agents to complete.
TaskUpdate → completed.

---

## Wave 2: Design + Test Plan

**Agents: architect + qa (PARALLEL) + ui-designer (conditional)**

Launch in the SAME message:

```
Agent(architect):
  "Read brief: bash hooks/scripts/lib/brief-manager.sh read
   Scan codebase for existing patterns.
   Update brief: bash hooks/scripts/lib/brief-manager.sh update design '{approach summary}'
   Add decisions: bash hooks/scripts/lib/brief-manager.sh add-decision '{decision}'"

Agent(qa):
  "Read brief: bash hooks/scripts/lib/brief-manager.sh read
   Write a test plan from the acceptance criteria.
   List test cases, edge cases, and verification strategy.
   Output inline (no standalone file)."

Agent(ui-designer):  ← ONLY if UI detected
  "Read brief: bash hooks/scripts/lib/brief-manager.sh read
   Create UI wireframes for the frontend components."
```

**Sync 2**: Wait for all agents.

**HARD GATE 1**: Present design summary to user.

```
Design ready. Key decisions:
- {decision 1}
- {decision 2}
Architecture: {1-line summary}
Reply 'approved' to proceed, or provide feedback.
```

TaskUpdate → completed.

---

## Wave 3: Plan + Scaffold

**Agents: architect + developer (PARALLEL)**

```
Agent(architect):
  "Read brief: bash hooks/scripts/lib/brief-manager.sh read
   Write implementation plan with file-level steps.
   Update brief: bash hooks/scripts/lib/brief-manager.sh update plan '{step summary}'
   Each step: exact files, signatures, verification criteria."

Agent(developer):
  "Read brief: bash hooks/scripts/lib/brief-manager.sh read
   On branch feature/{slug}:
   Create initial project scaffolding based on the architecture.
   Set up file structure, interfaces, types — no implementation yet.
   Commit: 'chore: scaffold for {feature}'"
```

**Sync 3**: Wait for both.
TaskUpdate → completed.

---

## Wave 4: Implement

**Agent: developer (primary), architect available for questions**

```
Agent(developer):
  "Read brief: bash hooks/scripts/lib/brief-manager.sh read
   On branch feature/{slug}:
   Implement each step with TDD (RED → GREEN → REFACTOR).
   Incremental commits per logical change.
   If unclear about a design decision, read the brief first.
   If still unclear, flag it — do not guess."
```

This wave is primarily sequential (developer works through the plan).

TaskUpdate → completed.

---

## Wave 5: Verify + Review

**Agents: qa + reviewer (PARALLEL)**

Launch both in the SAME message:

```
Agent(qa):
  "On branch feature/{slug}:
   Run full test suite.
   Verify each acceptance criterion from the brief.
   Test edge cases from the test plan.
   Update brief: bash hooks/scripts/lib/brief-manager.sh update test_results '{pass/fail summary}'"

Agent(reviewer):
  "On branch feature/{slug}:
   Review all changes (git diff against target branch).
   Check: logic, security, maintainability, tests.
   Update brief: bash hooks/scripts/lib/brief-manager.sh update review_verdict '{verdict + issue count}'
   Verdict: APPROVED / CHANGES REQUESTED / REJECTED."
```

**Sync 5**: Wait for both.

### Review-Fix Loop (if needed)

```
If review has warnings only:
  → Agent(developer): "Fix these warnings: {list}. On branch feature/{slug}."
  → Agent(reviewer): "Re-review the fixes on feature/{slug}."
  → Max 2 rounds.

If critical issues:
  → HARD GATE: present to user.
```

**HARD GATE 2**: Present results to user.

```
QA: {pass/fail summary}
Review: {verdict} — {N issues}
Reply 'merge' to ship, 'fix' to address issues, or 'abort'.
```

TaskUpdate → completed.

---

## Wave 6: Merge + Ship

**Agent: devops**

```
Agent(devops):
  "On branch feature/{slug}:
   1. Final test verification
   2. Update CHANGELOG.md (Keep a Changelog format, under ### Added)
   3. Squash merge to {target branch}
   4. Delete feature branch
   5. Run: bash hooks/scripts/pipeline-complete.sh"
```

TaskUpdate → completed.

---

## Dependency Graph

```
Wave 1: PM ──────┐
         DevOps ──┤
                  │
         Sync 1 ──┤
                  │
Wave 2: Architect ┤
         QA ──────┤
         UI? ─────┤
                  │
         Sync 2 ──→ GATE 1 (design approval)
                  │
Wave 3: Architect ┤
         Developer┤
                  │
         Sync 3 ──┤
                  │
Wave 4: Developer ┤
                  │
         Sync 4 ──┤
                  │
Wave 5: QA ───────┤
         Reviewer ┤
                  │
         Sync 5 ──→ GATE 2 (merge approval)
                  │
Wave 6: DevOps ───┘
```

## Parallel Agent Invocation

CRITICAL: To achieve parallelism, you MUST launch agents in the SAME message.
Claude Code executes multiple Agent tool calls from a single message concurrently.

```
// CORRECT — parallel
Message contains: Agent(architect, ...) AND Agent(qa, ...)
→ Both run at the same time

// WRONG — sequential
Message 1: Agent(architect, ...)
Message 2: Agent(qa, ...)
→ Runs one after the other
```
