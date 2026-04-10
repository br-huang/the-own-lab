---
name: write-plan
description: 'Write detailed implementation plans at file-level specificity. Use when breaking a design into executable steps.'
---

# Write Plan

Author implementation plans that can be executed without ambiguity.

## Plan Philosophy

> Write as if the executor is an enthusiastic junior engineer with no project context.

Every step must be self-contained and unambiguous. If someone has to guess what you meant, the plan failed.

## Step Requirements

Each step in the plan must include:

- **Exact file paths** — Full paths to every file that will be created or modified.
- **Function signatures with types** — The exact function names, parameter types, and return types.
- **Data flow** — Where data comes from, how it transforms, where it goes.
- **Error handling strategy** — What errors can occur and how each is handled.
- **What NOT to change** — Explicitly call out nearby code that must remain untouched.
- **Verification criteria** — How to confirm this step is done correctly (test command, expected output, etc.).

## Step Sizing

Each step should take **2-5 minutes** to execute. If a step feels larger, break it down further. If it feels smaller, consider combining with an adjacent step.

## Step Ordering

Steps must be ordered by dependency. No step should reference code that has not yet been created by a prior step. Draw the dependency graph mentally before writing the sequence.

## Templates

Read the relevant template before producing output:

- Implementation plan: `Read ${CLAUDE_PLUGIN_ROOT}/templates/PLAN.md`
- Design document: `Read ${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`

## Prerequisites Section

Every plan starts with a prerequisites section listing:

- Files that must exist before starting
- Tools or dependencies that must be installed
- Environment setup required
- Context the executor needs to read first
