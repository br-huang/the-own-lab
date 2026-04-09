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
agents/                  → Agent definitions
commands/                → Slash commands
skills/                  → Skills with SKILL.md (each skill references its template)
hooks/                   → Hook scripts
templates/               → Document templates (referenced by skills, not standalone)
```

## Conventions

- Plugin content is all English
- Pipeline briefs/specs go to `${COMPANY_OF_ONE_PLUGIN_DATA}/projects/{key}/` — never to the project repo
- Only ADRs go to `docs/adr/` in the project repo (git-tracked)
- Commit messages follow conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`
- CHANGELOG follows Keep a Changelog format
- Hook scripts use `hooks/scripts/lib/common.sh` for cross-platform path resolution

## Task Sizing

- **Small**: single file, clear, <2 min → just do it, no docs
- **Medium**: 2-5 files, 5-15 min → inline plan, feature branch
- **Large**: cross-module, >15 min → full pipeline with specs directory

## Code Style

- Functions do one thing, under 50 lines; split if longer
- Early returns over nested conditionals; max 3 nesting levels
- No dead code, no commented-out code, no unused imports
- Comments explain WHY, never WHAT
- Error messages are actionable (what went wrong + what to do)
- YAGNI — don't build what you don't need yet

## Do NOT

- Write standalone docs for Small/Medium tasks
- Start pipelines for simple questions
- Use Large pipeline for Small tasks
