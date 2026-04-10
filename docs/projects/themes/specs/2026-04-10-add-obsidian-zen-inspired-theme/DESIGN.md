# Obsidian Theme Mapping Design

## Approach

Use the provided dark token set as the single palette and project it into Obsidian's CSS variable model. Obsidian is CSS-first, so the mapping can remain close to the original semantic names without inventing a separate abstraction layer.

## Selector Strategy

The snippet is scoped under `.theme-dark.zen-inspired` and `body.theme-dark.zen-inspired` so it can be enabled intentionally rather than overriding every dark theme automatically.

## Token Mapping

- Core surfaces map to `--background-*`, `--tab-*`, and `--sidebar-*`.
- Text roles map to `--text-*`, heading colors, and link colors.
- Interaction roles map to `--interactive-*`, selection, and icon states.
- Utility roles map to borders, metadata inputs, blockquotes, tables, and code tokens.

## Tradeoffs

- Obsidian does not use the exact same semantic surface model as tweakcn, so some tokens are reused across multiple CSS variables.
- The provided token set does not include specialized syntax colors; the snippet derives code-related variables from the same palette.
