# Requirements: Claude Code Statusline

## Planning Scope

Design a polished, local-first Claude Code statusline product implemented in TypeScript.

The project will:

- Render a custom statusline from Claude Code `stdin` JSON input.
- Prioritize high-value developer context over decorative density.
- Optimize for a strong balance of UI polish, engineering cost, and maintenance burden.
- Avoid introducing a server unless a later requirement proves it necessary.

This planning package covers the architecture and implementation direction for the first usable version and the extension path after MVP.

## Problem Statement

Claude Code sessions benefit from fast, glanceable operational context, especially when working across multiple windows or sessions. Existing community projects demonstrate strong ideas, but the new project should define a cohesive product direction that fits solo-maintained development:

- More polished than a throwaway shell script
- Much cheaper to build and maintain than a full TUI product
- Structured enough to evolve into a public-quality tool

## Goals

- Build a local TypeScript statusline tool with a clean architecture.
- Ship a visually refined first version without requiring a TUI framework.
- Surface the highest-value session signals first.
- Keep execution fast enough for frequent statusline refreshes.
- Make the system extensible through widgets, renderers, and config.
- Support future open-source packaging without a rewrite.

## Non-Goals

- Building a remote service or always-on daemon for MVP
- Building a full-screen interactive TUI during MVP
- Supporting every possible widget or customization in v1
- Solving cross-machine sync in the first release
- Adding external network dependencies for core rendering

## Users

### Primary User

A solo builder using Claude Code heavily across multiple sessions and projects, who needs fast orientation and lightweight operational visibility.

### Secondary Users

Developers who may adopt the tool later and expect reasonable configuration, sensible defaults, and maintainable code.

## Constraints

- Implementation language is TypeScript.
- The statusline should run as a local command invoked by Claude Code.
- The tool must work without a server for normal operation.
- The architecture should keep startup and render overhead low.
- The initial workspace is effectively empty, so the architecture can be designed cleanly from scratch.

## Key Product Principles

1. Local-first
   The statusline should read local inputs, local cache, and local transcript/session files. No server should be required for the core path.

2. Fast by default
   Expensive operations such as transcript parsing and git inspection should be minimized and cacheable.

3. High signal density
   The statusline should emphasize actionable context, not decorative clutter.

4. Progressive sophistication
   MVP should be structurally sound but intentionally limited. More advanced customization should come after the core loop is stable.

5. Maintainable elegance
   Visual polish matters, but the implementation should remain easy for one person to evolve.

## Functional Requirements

### Input and Runtime

- Read Claude Code context from `stdin`.
- Parse and normalize statusline-relevant fields.
- Output one rendered statusline string to `stdout`.
- Fail gracefully when optional fields are missing.

### Core Widgets for MVP

- Model widget
  Show the current model name in a compact form.

- Current directory widget
  Show the current project or working directory in a concise readable form.

- Git widget
  Show branch and a basic dirty/clean indication when available.

- Context widget
  Show a coarse but useful indicator of context/session pressure.

- Session widget
  Show a compact session-oriented metric such as cost, elapsed time, or usage state, depending on what is reliably available.

### Rendering

- Support at least one plain renderer and one polished renderer.
- The polished renderer should support a powerline- or capsule-style visual system.
- ANSI colors should be supported.
- A fallback mode should be available for environments without Nerd Font support.

### Configuration

- Support a project or user config file.
- Allow widget ordering and renderer selection through config.
- Allow theme tokens to be changed without code edits.

### Performance

- Avoid repeated heavy parsing on each invocation.
- Support short-lived local cache for expensive providers such as git or transcript-derived metadata.
- Keep the default execution path lightweight.

## Quality Requirements

- Clean separation between input parsing, data providers, widgets, and renderers
- Predictable output with missing or partial data
- Config schema validation
- Testable core formatting logic
- Portable CLI behavior on common local developer environments

## Candidate Technical Direction

- Language: TypeScript
- Runtime: Node.js
- Recommended utility dependencies:
  - `picocolors` or equivalent for ANSI colors
  - `string-width`
  - `strip-ansi`
  - `zod`
- Explicitly deferred:
  - `Ink`
  - React-based terminal UI
  - `Bubble Tea` equivalents
  - server infrastructure

## Open Questions

- What exact data should drive the initial `session` widget: cost, elapsed time, or another locally derivable metric?
- How accurate does the first `context` indicator need to be versus how cheap it must remain?
- Should the first config file format be JSON, JSONC, or YAML?
- Should multi-line rendering be deferred until after v1?

## Success Criteria

The planning and design should be considered successful if the resulting implementation direction can support:

- A TypeScript MVP with no server
- A visually polished renderer without a TUI framework
- Five core widgets with sensible defaults
- Clean future expansion to themes, extra widgets, and richer layout
- A solo-maintainable codebase with moderate engineering effort

## Recommended Scope Size

Medium.

This is too large for an unstructured shell script if long-term maintenance matters, but small enough to avoid introducing a backend service, plugin host, or interactive configuration UI in v1.
