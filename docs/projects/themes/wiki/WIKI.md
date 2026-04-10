# Themes Wiki

## Purpose

`packages/themes` stores platform-specific theme outputs derived from a shared design-token palette.

## Current Outputs

- Obsidian
  - `packages/themes/obsidian/zen-inspired.css`
  - dark snippet based on the `Zen Inspired` palette
  - targets `.theme-dark` directly so it can be installed as a normal Obsidian CSS snippet

## Conventions

- Keep project docs in `docs/projects/themes/`.
- Prefer one named output per platform and theme.
- Preserve source attribution for imported palettes.

## Obsidian Installation

1. Copy `packages/themes/obsidian/zen-inspired.css` into your vault's `.obsidian/snippets/` directory.
2. Open Obsidian `Settings -> Appearance -> CSS snippets`.
3. Reload snippets if needed.
4. Enable `zen-inspired.css`.
