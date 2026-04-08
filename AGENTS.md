# Company of One — Project Instructions

This project is a Claude Code / Codex plugin called **Claude 一人公司 (Company of One)**.
It provides enterprise-grade agent pipelines for solo developers.

## Architecture

- **8 agents**: product-owner, architect, developer, qa, reviewer, debugger, devops, ui-designer
- **6 commands**: /develop, /debug, /refactor, /review, /plan, /learn
- **16 skills**: orchestrator + 15 domain skills in `skills/`
- **Orchestrator**: auto-detects user intent and sizes tasks (Small/Medium/Large)

## Plugin Structure

```
.claude-plugin/          → Claude Code plugin manifest
plugins/                 → Codex plugin wrapper (symlinks to shared assets)
agents/                  → Agent definitions (shared)
commands/                → Slash commands (shared)
skills/                  → Skills with SKILL.md (shared)
rules/                   → Coding standards (shared)
hooks/                   → Hook scripts (shared)
templates/               → Document templates (shared)
```

## Conventions

- Plugin content is all English
- Pipeline artifacts go to `docs/specs/{date}-{type}-{slug}/`
- Commit messages follow conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`
- CHANGELOG follows Keep a Changelog format
- Hook scripts use `hooks/scripts/lib/common.sh` for cross-platform path resolution

## Task Sizing

- **Small**: single file, clear, <2 min → just do it, no docs
- **Medium**: 2-5 files, 5-15 min → inline plan, feature branch
- **Large**: cross-module, >15 min → full pipeline with specs directory

## Do NOT

- Write standalone docs for Small/Medium tasks
- Start pipelines for simple questions
- Use Large pipeline for Small tasks
