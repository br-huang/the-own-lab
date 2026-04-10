# Changelog

All notable changes to Claude 一人公司 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.3] - 2026-04-09

### Added

- Per-project data layout under `${COMPANY_OF_ONE_PLUGIN_DATA}/projects/{project-key}/`
- Pipeline state manager in `hooks/scripts/lib/pipeline-state.sh`
- Pipeline brief manager in `hooks/scripts/lib/brief-manager.sh`
- Pattern index manager in `hooks/scripts/lib/pattern-index.sh`
- Pipeline completion routine in `hooks/scripts/pipeline-complete.sh`

### Changed

- Runtime state now uses per-project storage instead of a plugin-global data directory
- Session start and post-compact restore active pipeline state, active brief, pattern index, and project context from the per-project data directory
- Medium pipelines now use `briefs/current.json` as the single source of truth for agent handoff instead of full spec files
- Full specs are now intended to live under plugin data `specs/` instead of `docs/specs/` in the project repo

### Removed

- Default reliance on repo-local `docs/specs/` as the primary storage location for transient pipeline documents

## [0.7.2] - 2026-04-09

### Changed

- Wired templates into the active skills flow so pipeline artifacts are driven from shared templates

### Removed

- Unused directories and stale scaffolding no longer shipped in the plugin payload

## [0.7.1] - 2026-04-09

### Added

- Hard runtime state management for pipeline state, pattern index, and project context

## [0.7.0] - 2026-04-09

### Added

- Parallel wave execution model for `/develop` so agent teams can coordinate by stage instead of one long linear pass

## [0.6.0] - 2026-04-08

### Changed

- Session-start was slimmed down and orchestrator activation became lazier to reduce startup token cost

## [0.5.0] - 2026-04-08

### Added

- Codex plugin scaffold under `plugins/claude-company-of-one/`
- Codex marketplace manifest under `.agents/plugins/marketplace.json`
- Shared hook runtime helper `hooks/scripts/lib/common.sh` for plugin root and data directory resolution

### Changed

- Hook scripts now resolve storage via platform-neutral `COMPANY_OF_ONE_PLUGIN_*` variables with Claude and Codex fallbacks

## [0.4.0] - 2026-04-07

### Added

- **Task sizing** — orchestrator now assesses complexity (Small/Medium/Large) before starting any pipeline
  - Small: no docs, no branch, no TaskCreate — just TDD and commit (<2 min)
  - Medium: 4-step lightweight flow with inline plan, no standalone docs (5-10 min)
  - Large: full pipeline with specs directory, complete docs, and Mermaid diagrams (unchanged)
- **Medium pipeline reference** (`pipeline-medium.md`) — compact 4-stage flow: Brief Plan → Implement → Test & Review → Merge

### Changed

- Session-start hook rewritten with task sizing as CRITICAL RULES (not buried in references)
- TaskCreate instructions moved from reference files to session-start context for reliability
- Explicit "IMMEDIATELY proceed after gate approval" instruction to prevent stalling
- Small tasks no longer trigger any pipeline overhead
- Medium tasks use inline notes instead of standalone REQUIREMENTS.md/DESIGN.md/PLAN.md

### Fixed

- TODO List (TaskCreate) not activating — instructions were buried in reference files, now in session-start hook
- Pipeline stalling after gate approval — user had to manually prompt next step

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
