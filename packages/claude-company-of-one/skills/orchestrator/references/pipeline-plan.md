# Plan Pipeline — Full Orchestration Flow

## Task Creation (at pipeline start)

```
TaskCreate: "Stage 1/3: Gather (product-owner)"
TaskCreate: "Stage 2/3: Design (architect)"
TaskCreate: "Stage 3/3: Document (architect)"
```

---

## Stage 1: GATHER

- **Agent**: product-owner
- **Action**: Elicit requirements, constraints, success criteria, priorities
- **Output**: `REQUIREMENTS.md`
- **Gate**: HARD GATE — user must confirm planning scope

---

## Stage 2: DESIGN

- **Agent**: architect
- **Action**: Scan codebase, explore 2-3 options, analyze trade-offs, recommend approach
- **Output**: `DESIGN.md` (with Mermaid architecture + data flow diagrams)
- **Gate**: Auto-proceed

---

## Stage 3: DOCUMENT

- **Agent**: architect
- **Action**: Produce formal Architecture Decision Record with Mermaid context diagram
- **Output**: `ADR.md`
- **Gate**: Auto-proceed

No code is written. No merge. No CHANGELOG update.
Pipeline retrospective still runs (via devops agent).

---

## Post-Pipeline

The output documents (`REQUIREMENTS.md`, `DESIGN.md`, `ADR.md`) can be used as input to a future `/develop` pipeline when the user is ready to implement.
