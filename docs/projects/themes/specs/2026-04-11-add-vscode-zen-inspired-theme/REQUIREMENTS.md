# Add VS Code Zen Inspired Theme

## Context

`packages/themes/vscode` is empty. We already have a dark `Zen Inspired` palette and an Obsidian output, and now need a first VS Code-targeted theme that translates the same palette into editor UI and syntax highlighting semantics.

## Goals

- Add a first usable VS Code dark theme JSON for the `Zen Inspired` palette.
- Cover the highest-impact workbench color slots so the editor UI reads coherently.
- Add a first-pass syntax palette for common code scopes.
- Keep the implementation easy to iterate after visual testing in the editor.

## Non-Goals

- Package and publish a VS Code extension in this change.
- Perfectly tune every edge-case workbench key in the first pass.
- Guarantee language-specific syntax perfection for every grammar.

## Functional Requirements

- [ ] Add a dark theme JSON under `packages/themes/vscode/`.
- [ ] Map the token palette to core VS Code workbench colors, including editor, sidebar, tabs, panel, status bar, inputs, notifications, and terminal.
- [ ] Provide `tokenColors` for common TextMate scopes.
- [ ] Provide an initial `semanticTokenColors` mapping.
- [ ] Keep the theme name and file naming stable for future refinement.

## Quality Requirements

- [ ] The theme file is valid JSON and follows the VS Code color theme schema.
- [ ] The theme uses the supplied palette consistently rather than introducing unrelated colors.
- [ ] The implementation stays local to `packages/themes` and `docs/projects/themes`.
