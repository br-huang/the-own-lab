# Claude Code Statusline

A local-first TypeScript statusline for Claude Code.

It renders a compact, high-signal statusline from Claude Code `stdin` JSON and prints the final result to `stdout`. The project is designed for fast local execution, clean extensibility, and practical daily use across multiple Claude Code sessions.

## Install

This package is published as a scoped npm package because the unscoped `claude-code-statusline` package name is already taken.

```bash
npm install -g @johnnyboy11234/claude-code-statusline
```

After installation, the global command is:

```bash
claude-code-statusline
```

## Use With Claude Code

Add this to your Claude Code `settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-code-statusline",
    "padding": 0
  }
}
```

That is all another machine needs:

1. Install Node.js 20 or newer
2. Run `npm install -g @johnnyboy11234/claude-code-statusline`
3. Set Claude Code `statusLine.command` to `claude-code-statusline`

## Features

- Local-first CLI with no server requirement
- TypeScript architecture with clear separation between input, providers, widgets, and renderers
- MVP widgets: `model`, `cwd`, `git`, `context`, `pet`, `session`
- `plain` and `powerline` renderers
- ANSI color output with Nerd Font and ASCII fallback support
- Short-lived cache for git and transcript-derived metadata
- JSON config with schema validation via `zod`

## Configuration

Supported config locations:

- Project config: `.claude-best-statusline.json`
- Backward-compatible project config: `.claude-code-statusline.json`
- User config: `~/.config/claude-best-statusline/config.json`
- Backward-compatible user config: `~/.config/claude-code-statusline/config.json`

Supported config fields:

- `renderer`: `plain` or `powerline`
- `widgets`: ordered widget list
- `nerdFont`: enable Nerd Font separators
- `theme`: override tone colors and separators

Example:

```json
{
  "renderer": "powerline",
  "widgets": ["model", "cwd", "git", "context", "pet"],
  "nerdFont": true,
  "theme": {
    "info": { "fg": "255", "bg": "25" },
    "success": { "fg": "16", "bg": "78" },
    "warning": { "fg": "16", "bg": "220" },
    "danger": { "fg": "255", "bg": "160" }
  }
}
```

## Local Development

```bash
pnpm install
pnpm build
pnpm test
```

Useful commands:

```bash
pnpm demo
./bin/claude-statusline < sample-input.json
```

## Publish

Publish flow:

```bash
pnpm build
pnpm test
env npm_config_cache=/tmp/claude-code-statusline-npm-cache npm pack --dry-run
env npm_config_cache=/tmp/claude-code-statusline-npm-cache npm publish
```

If npm 2FA is enabled:

```bash
env npm_config_cache=/tmp/claude-code-statusline-npm-cache npm publish --otp=<code>
```

## Project Structure

```text
bin/
  claude-statusline
src/
  main.ts
  types.ts
  input.ts
  config.ts
  theme.ts
  cache.ts
  providers/
    git.ts
    transcript.ts
    session.ts
  widgets/
    model.ts
    cwd.ts
    git.ts
    context.ts
    pet.ts
    session.ts
    index.ts
  renderers/
    plain.ts
    powerline.ts
test/
  input.test.ts
```

## License

MIT
