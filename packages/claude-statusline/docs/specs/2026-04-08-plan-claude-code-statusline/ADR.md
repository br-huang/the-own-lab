# ADR-001: Use a Local-First TypeScript CLI Architecture for Claude Code Statusline

## Status
Proposed

## Context

The project needs a maintainable architecture for a Claude Code statusline tool that:

- looks polished
- remains cheap to build and maintain
- runs quickly in a high-frequency command invocation path
- avoids unnecessary infrastructure

The design space included:

- a shell-script-based implementation
- a TypeScript local CLI
- a Go local CLI
- a server-backed architecture

The project also needs to decide whether a TUI framework is necessary for the first version.

## Decision

Adopt a local-first TypeScript CLI architecture with the following characteristics:

- Claude Code invokes a local command directly
- the tool reads JSON from `stdin` and writes the statusline to `stdout`
- internal structure is split into input normalization, providers, widgets, renderers, and config
- rendering uses ANSI text output with a `plain` renderer and a polished `powerline` renderer
- expensive local data sources use short-lived cache
- no server is used for MVP
- no interactive TUI framework is used for MVP

## Consequences

### Positive

- Preserves a simple runtime model with minimal operational overhead
- Matches the actual integration contract of Claude Code statusline commands
- Keeps the codebase maintainable for a solo developer
- Supports visual polish without dragging in a heavier interactive UI stack
- Leaves a clean path for future open-source packaging and extension

### Negative

- Requires a Node runtime rather than distributing as a single static binary
- Startup latency will be higher than an equivalent Go implementation
- Advanced interactive configuration is deferred

### Risks

- Provider costs may grow as more widgets are added: mitigate with explicit cache boundaries and widget scope limits
- ANSI layout quality may degrade with icon or width issues: mitigate with width-aware utilities and ASCII fallback
- Session metrics may vary in availability: mitigate by designing the session widget to degrade gracefully

## Alternatives Considered

| Option | Pros | Cons | Rejected Because |
|--------|------|------|-----------------|
| Shell script with `jq` | fastest prototype path, low initial setup | brittle formatting, poor maintainability, weak extensibility | does not meet long-term polish and maintainability goals |
| Go CLI with `lipgloss` | fast runtime, single binary, strong terminal rendering | higher iteration cost, less flexible for early product exploration | a good future optimization path, but not the best first decision |
| Server-backed architecture | shared state, advanced aggregation options, future multi-session possibilities | unnecessary complexity, operational burden, higher latency and failure modes | not justified for MVP or local-first usage |
| TUI framework in v1 | richer interactive configuration | major complexity increase unrelated to core statusline rendering | configuration UI is not necessary to validate product value |

## Implementation Roadmap

1. Phase 1: Bootstrap CLI foundation
   - create package setup, stdin parser, core types, config loader, and plain renderer

2. Phase 2: Ship MVP widgets
   - implement model, cwd, git, context, and session widgets

3. Phase 3: Add polished renderer and cache
   - implement powerline renderer, theme tokens, ASCII fallback, and provider cache

4. Phase 4: Harden and document
   - add tests for formatting and normalization, write usage docs, and validate default configuration

5. Phase 5: Optional expansion
   - add more widgets, multi-line mode, richer themes, and future packaging improvements

## Dependencies

- Node.js runtime: required
- TypeScript toolchain: required
- ANSI/text utilities such as `picocolors`, `string-width`, `strip-ansi`: expected
- Config validation utility such as `zod`: expected
- Remote service or daemon: not required

