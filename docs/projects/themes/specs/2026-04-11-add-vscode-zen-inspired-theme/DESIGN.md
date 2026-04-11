# VS Code Theme First-Pass Design

## Strategy

Build the first VS Code output in two layers:

- `colors`
  - establishes workbench and editor surfaces
- `tokenColors` plus `semanticTokenColors`
  - establishes code readability

This mirrors how VS Code actually renders themes and avoids forcing UI tokens to carry all syntax meaning alone.

## Palette Translation

- Deep neutrals drive backgrounds:
  - `#101010`, `#141414`, `#1C1C1C`, `#222222`
- Warm light neutrals drive readable text and emphasis:
  - `#E8E3DA`, `#D1CFC0`, `#D9CFC2`
- Muted neutrals support comments and inactive states:
  - `#8E8A83`, `#5C5A56`
- Accent warm red supports strong highlights and warnings:
  - `#F26A4B`
- Error red remains reserved for invalid and destructive states:
  - `#EF4444`

## First-Pass Syntax Rules

- comments -> muted neutral
- strings / numbers -> warm pale accent
- keywords / types -> primary light neutral
- functions / decorators -> chart accent
- variables / properties -> main foreground
- invalid -> destructive red

## Known Follow-Up Areas

- refine terminal ANSI mapping after real usage
- tune selection, find, and bracket colors if they feel too flat
- add more language-specific scopes only after real editor testing
