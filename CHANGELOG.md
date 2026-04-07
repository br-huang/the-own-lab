# Changelog

All notable changes to Claude 一人公司 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-04-07

### Added
- **Orchestrator skill** — auto-detects user intent (bug/feature/refactor/plan/review) from natural conversation and starts the appropriate pipeline without explicit commands
- **Pipeline TODO tracking** — TaskCreate/TaskUpdate at each stage for visual progress in Claude Code UI
- **UI/UX Designer agent** (`ui-designer`) — creates wireframes via Pencil MCP, only activated when frontend/UI work is detected
- **Review-fix loop** — reviewer finds warnings → developer auto-fixes → reviewer re-verifies (max 2 rounds); critical issues always go to user
- **CHANGELOG generation** — devops agent auto-updates CHANGELOG.md during merge stage (Keep a Changelog format)
- **Mermaid diagrams** in DESIGN.md (architecture, data flow, component relationships) and ADR.md (decision context, implementation impact)
- **Pipeline reference files** — progressive disclosure for orchestrator (5 pipeline flows in `references/`)

### Changed
- Orchestrator SKILL.md reduced from 423 to 111 lines (core logic only, pipelines moved to references)
- Session-start hook now injects `<claude-company-of-one>` orchestrator context block
- DESIGN.md and ADR.md templates updated with Mermaid diagram sections

## [0.2.0] - 2026-04-07

### Added
- Orchestrator skill with intent detection and confidence assessment
- Session-start hook injects orchestrator context into every session
- Bump from explicit commands to auto-detection model

### Changed
- Plugin manifest simplified to minimal format (auto-discovery)
- Agent `tools` field converted to comma-separated string format
- Hooks format aligned with official Claude Code spec (nested structure)

### Removed
- `allowedSkills` field from agents (not supported by Claude Code)
- Redundant `commands`, `agents`, `skills`, `hooks` fields from plugin.json

### Fixed
- marketplace.json: added required `name` and `owner` fields
- marketplace.json: fixed `authir` typo → `author`
- hooks.json: converted from flat array to correct nested format
- Agent frontmatter: removed unsupported YAML array format for `tools`

## [0.1.0] - 2026-04-06

### Added
- Initial plugin scaffold
- 7 agents: product-owner, architect, developer, qa, reviewer, debugger, devops
- 6 commands: /develop, /debug, /refactor, /review, /plan, /learn
- 15 skills: pipeline-gate, requirements, codebase-scan, write-plan, execute-plan, tdd, test-verify, code-review, security-scan, git-ops, git-worktree, root-cause, postmortem, adr, learn
- 4 common rules: code-style, git-conventions, testing-standards, security-baseline
- 3 language rules: TypeScript, Python, Rust
- 3 hooks: session-start, pre-compact, post-compact
- 7 templates: REQUIREMENTS, DESIGN, PLAN, REVIEW, DIAGNOSIS, POSTMORTEM, RETRO
- Continuous learning system with pattern extraction and confidence scoring
- MCP self-extension mechanism (suggest + user confirm)
- Strictness model: strict / balanced / fast
