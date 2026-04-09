---
name: codebase-scan
description: "Explore and understand codebase structure, patterns, and conventions. Use before making design decisions or diagnosing bugs."
---

# Codebase Scan

Explore and map a codebase before making any decisions.

## Process

1. **Identify project type from config files** — Look for `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Makefile`, etc. Determine language, framework, and build system.

2. **Map directory structure** — Understand the top-level organization. Identify where source code, tests, configuration, and assets live.

3. **Identify key patterns** — Look for:
   - Routing (how requests are handled)
   - Data models (schemas, types, interfaces)
   - State management (stores, context, caches)
   - Error handling patterns
   - Dependency injection or service patterns

4. **Find relevant existing code for the current task** — Search for code related to the feature or bug at hand. Identify files that will need to change and files that provide context.

5. **Document conventions** — Note:
   - Naming conventions (camelCase, snake_case, file naming)
   - File organization patterns (feature folders, layer folders)
   - Import style (absolute vs relative, barrel files)
   - Test organization (co-located, separate directory)

## Tools to Use

- **Glob** — For mapping directory structure and finding files by pattern.
- **Grep** — For finding patterns, usages, and conventions across the codebase.
- **Read** — For understanding specific files in detail.

## Output

Produce a structured codebase context summary containing:

- Project type and key dependencies
- Directory structure overview
- Key patterns identified
- Relevant files for the current task
- Conventions to follow
