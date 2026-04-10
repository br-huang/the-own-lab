# Add Obsidian Zen Inspired Theme

## Context

The `packages/themes/obsidian` directory is currently empty. We have a dark design token set for the `Zen Inspired` theme and need a first Obsidian-targeted output that proves the token mapping approach.

## Goals

- Produce an Obsidian CSS snippet based on the provided dark tokens.
- Keep the mapping semantic so the source token palette remains recognizable.
- Establish the initial documentation for how `themes` outputs should be tracked in this repository.

## Non-Goals

- Build a full packaged Obsidian community theme.
- Generate VS Code or iTerm2 outputs in this change.
- Change root workspace configuration.

## Functional Requirements

- [ ] Add a dark-mode Obsidian CSS file under `packages/themes/obsidian/`.
- [ ] Map the supplied token palette to Obsidian CSS variables for background, text, borders, interactions, navigation, and content rendering.
- [ ] Include a clear theme selector so the snippet can be scoped.
- [ ] Record the upstream source in comments or project docs.

## Quality Requirements

- [ ] The CSS is readable and grouped by semantic area.
- [ ] The change is documented under `docs/projects/themes/`.
- [ ] No root config files are changed.
