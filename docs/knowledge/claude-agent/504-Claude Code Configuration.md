# Claude Code Configuration

> Reference guide for Claude Code plugin development, based on official documentation + hands-on experience building the Claude 一人公司 plugin.
> Last updated: 2026-04-07

---

## Table of Contents

1. [Plugin Architecture Overview](#1-plugin-architecture-overview)
2. [plugin.json — Manifest](#2-pluginjson--manifest)
3. [marketplace.json — Marketplace Registry](#3-marketplacejson--marketplace-registry)
4. [Agents](#4-agents)
5. [Commands](#5-commands)
6. [Skills](#6-skills)
7. [Hooks](#7-hooks)
8. [Rules](#8-rules)
9. [MCP Servers](#9-mcp-servers)
10. [LSP Servers](#10-lsp-servers)
11. [Settings & Installation](#11-settings--installation)
12. [Auto-Update Marketplace](#12-auto-update-marketplace)
13. [Environment Variables](#13-environment-variables)
14. [Development Workflow](#14-development-workflow)
15. [Gotchas & Lessons Learned](#15-gotchas--lessons-learned)

---

## 1. Plugin Architecture Overview

### Directory Structure

```
plugin-name/
├── .claude-plugin/
│   ├── plugin.json              # Required: plugin manifest
│   └── marketplace.json         # Required if acting as a marketplace
├── agents/                      # Auto-discovered: subagent definitions
│   └── my-agent.md
├── commands/                    # Auto-discovered: slash commands (legacy)
│   └── my-command.md
├── skills/                      # Auto-discovered: reusable skills
│   └── my-skill/
│       ├── SKILL.md
│       ├── references/          # Optional: detailed docs (progressive disclosure)
│       ├── examples/            # Optional: working code examples
│       └── scripts/             # Optional: executable utilities
├── hooks/
│   └── hooks.json               # Hook configuration
├── rules/                       # Auto-discovered: always-loaded guidelines
│   └── my-rule.md
├── output-styles/               # Custom output styles
│   └── terse.md
├── bin/                         # Executables added to Bash tool PATH
│   └── my-tool
├── .mcp.json                    # MCP server definitions
├── .lsp.json                    # LSP server definitions
├── settings.json                # Default plugin settings
├── README.md
└── LICENSE
```

### Auto-Discovery

Components are auto-discovered from standard directories. You do NOT need to list them in `plugin.json`:

| Component     | Discovery Pattern       | Notes                            |
| ------------- | ----------------------- | -------------------------------- |
| Agents        | `agents/**/*.md`        | YAML frontmatter + markdown body |
| Commands      | `commands/**/*.md`      | Same format as skills            |
| Skills        | `skills/*/SKILL.md`     | Each skill in its own directory  |
| Hooks         | `hooks/hooks.json`      | Single JSON config file          |
| Rules         | `rules/**/*.md`         | Always loaded into context       |
| Output styles | `output-styles/**/*.md` | Formatting directives            |
| MCP servers   | `.mcp.json`             | Or inline in plugin.json         |
| LSP servers   | `.lsp.json`             | Or inline in plugin.json         |
| Executables   | `bin/*`                 | Added to PATH                    |

### Namespacing

Plugin components are namespaced: `plugin-name:component-name`

- Agent: `claude-company-of-one:architect`
- Skill: `claude-company-of-one:tdd`
- Command: `/claude-company-of-one:develop`

---

## 2. plugin.json — Manifest

**Location:** `.claude-plugin/plugin.json` (ONLY file that goes in `.claude-plugin/`)

### Minimal (Recommended)

Most official plugins use the minimal format and rely on auto-discovery:

```json
{
  "name": "my-plugin",
  "description": "Brief description of what the plugin does",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  }
}
```

### Complete Schema

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "commands": ["./custom/path/command.md"],
  "agents": "./custom/agents/",
  "skills": "./custom/skills/",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json",
  "outputStyles": "./output-styles/",
  "lspServers": "./.lsp.json",
  "userConfig": {
    "api_token": {
      "description": "API authentication token",
      "sensitive": true
    },
    "api_endpoint": {
      "description": "Your API endpoint",
      "sensitive": false
    }
  }
}
```

### Field Reference

| Field          | Type           | Required | Notes                                                                                            |
| -------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `name`         | string         | **Yes**  | Kebab-case, no spaces                                                                            |
| `version`      | string         | No       | Semantic versioning (X.Y.Z). **Bump on every release — Claude Code uses this to detect updates** |
| `description`  | string         | No       | Brief plugin purpose                                                                             |
| `author`       | object         | No       | `name` (string), `email` (string, optional), `url` (string, optional)                            |
| `homepage`     | string         | No       | Documentation URL                                                                                |
| `repository`   | string         | No       | Source code URL                                                                                  |
| `license`      | string         | No       | SPDX identifier (MIT, Apache-2.0, etc.)                                                          |
| `keywords`     | array          | No       | Discovery tags                                                                                   |
| `commands`     | string\|array  | No       | Override command paths (replaces `commands/` auto-discovery)                                     |
| `agents`       | string\|array  | No       | Override agent paths                                                                             |
| `skills`       | string\|array  | No       | Override skill paths                                                                             |
| `hooks`        | string\|object | No       | Hook config path or inline                                                                       |
| `mcpServers`   | string\|object | No       | MCP config path or inline                                                                        |
| `outputStyles` | string\|array  | No       | Output style paths                                                                               |
| `lspServers`   | string\|object | No       | LSP config path or inline                                                                        |
| `userConfig`   | object         | No       | User-prompted config values at enable time                                                       |

---

## 3. marketplace.json — Marketplace Registry

**Location:** `.claude-plugin/marketplace.json`

A marketplace is a registry of plugins. One repo can be both a marketplace and a plugin.

### Schema

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Owner Name",
    "email": "owner@example.com"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "description": "What the plugin does",
      "version": "1.0.0",
      "source": "./",
      "author": {
        "name": "Author Name",
        "email": "author@example.com"
      },
      "category": "development",
      "homepage": "https://example.com"
    }
  ]
}
```

### Required Fields

| Field     | Type   | Notes                                 |
| --------- | ------ | ------------------------------------- |
| `name`    | string | Marketplace identifier (kebab-case)   |
| `owner`   | object | `name` (required), `email` (optional) |
| `plugins` | array  | List of plugin entries                |

### Plugin Entry Fields

| Field         | Required | Notes                                             |
| ------------- | -------- | ------------------------------------------------- |
| `name`        | Yes      | Plugin identifier                                 |
| `source`      | Yes      | Where to find the plugin (see source types below) |
| `description` | No       | Plugin description                                |
| `version`     | No       | Should match plugin.json version                  |
| `author`      | No       | Author info                                       |
| `category`    | No       | Plugin category                                   |
| `homepage`    | No       | Documentation URL                                 |

### Source Types

```json
// Relative path (same repo)
"source": "./plugins/my-plugin"

// Current directory (plugin IS the marketplace)
"source": "./"

// GitHub
"source": {
  "source": "github",
  "repo": "owner/repo",
  "ref": "v2.0.0",
  "sha": "abc123..."
}

// Generic git URL
"source": {
  "source": "url",
  "url": "https://gitlab.com/team/plugin.git",
  "ref": "main"
}

// Git subdirectory (monorepo)
"source": {
  "source": "git-subdir",
  "url": "https://github.com/org/monorepo.git",
  "path": "tools/claude-plugin"
}

// npm package
"source": {
  "source": "npm",
  "package": "@scope/plugin",
  "version": "2.1.0"
}
```

### Gotcha: `description` at top level

The `claude plugin validate` command flags top-level `description` as "Unrecognized key" (even the official Anthropic marketplace has this). It's a validator strictness issue — the field is still usable but triggers a warning. Use `metadata.description` for the recommended approach.

### Reserved Marketplace Names

Cannot use: `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `knowledge-work-plugins`, `life-sciences`

---

## 4. Agents

**Location:** `agents/<agent-name>.md`

### Frontmatter Schema

```yaml
---
name: my-agent
description: |
  Brief description of what this agent does and when to use it.

  <example>
  Context: User wants to review code
  user: "Review this PR for security issues"
  assistant: "I'll delegate to the security reviewer."
  <commentary>
  User requesting security review, delegate to specialized agent.
  </commentary>
  </example>
model: sonnet
tools: Read, Glob, Grep, Bash, Agent
color: green
effort: medium
maxTurns: 20
---
# Agent prompt content here...
```

### Field Reference

| Field             | Required | Type          | Notes                                                                       |
| ----------------- | -------- | ------------- | --------------------------------------------------------------------------- |
| `name`            | Yes      | string        | Lowercase, hyphens, 3-50 chars                                              |
| `description`     | Yes      | string        | When to delegate to this agent. Include `<example>` blocks for best results |
| `model`           | No       | string        | `sonnet`, `opus`, `haiku`, `inherit` (default: inherit from session)        |
| `tools`           | No       | string\|array | Tools available. Two formats work: comma-separated string OR JSON array     |
| `color`           | No       | string        | `blue`, `cyan`, `green`, `yellow`, `magenta`, `red`                         |
| `effort`          | No       | string        | `low`, `medium`, `high`, `max` (Opus 4.6 only)                              |
| `maxTurns`        | No       | number        | Maximum agentic turns                                                       |
| `skills`          | No       | array         | Skills preloaded into agent context                                         |
| `memory`          | No       | boolean       | Enable auto-memory (default: inherits)                                      |
| `background`      | No       | string        | Background context                                                          |
| `isolation`       | No       | string        | `"worktree"` for git worktree isolation                                     |
| `disallowedTools` | No       | string\|array | Tools denied to agent                                                       |

### Tools Format

Both formats are valid:

```yaml
# Format 1: Comma-separated string (older convention)
tools: Glob, Grep, Read, Bash, Agent, WebFetch

# Format 2: JSON array (newer convention)
tools: ["Read", "Write", "Grep", "Glob", "Bash"]
```

### Common Tool Names

`Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Agent`, `WebFetch`, `WebSearch`, `TodoWrite`, `NotebookRead`, `AskUserQuestion`

### Color Convention (from official plugins)

| Color     | Typical Use                    |
| --------- | ------------------------------ |
| `red`     | Code review, critical analysis |
| `green`   | Architecture, design           |
| `yellow`  | Exploration, analysis          |
| `cyan`    | Skills, knowledge              |
| `magenta` | Creation, generation           |
| `blue`    | General utility                |

### Description Best Practices

Include `<example>` blocks (2-4 recommended) for reliable triggering:

```yaml
description: |
  Use this agent when the user needs architecture design or technical planning.

  <example>
  Context: User wants to plan a new feature
  user: "Design the authentication system"
  assistant: "I'll use the architect agent to design this."
  <commentary>
  Architecture request, delegate to architect for design.
  </commentary>
  </example>
```

### Plugin Agent Restrictions

Plugin-shipped agents **cannot** use:

- `hooks` (security restriction)
- `mcpServers` (security restriction)
- `permissionMode` (security restriction)

Only `isolation: "worktree"` is valid for isolation.

---

## 5. Commands

**Location:** `commands/<command-name>.md`

Commands and skills are functionally identical. Commands are the legacy naming; skills are preferred for new work. The file name (minus `.md`) becomes the slash command name.

### Frontmatter Schema

```yaml
---
description: What this command does
argument-hint: Optional feature description
allowed-tools: Read, Grep, Bash
disable-model-invocation: false
---
# Command content here...
```

### Field Reference

| Field                      | Required | Type          | Notes                                                    |
| -------------------------- | -------- | ------------- | -------------------------------------------------------- |
| `description`              | Yes      | string        | Brief command description                                |
| `argument-hint`            | No       | string        | Autocomplete hint (e.g., `[issue-number]`, `[filename]`) |
| `allowed-tools`            | No       | string\|array | Tools Claude can use. Supports tool-specific filters     |
| `disable-model-invocation` | No       | boolean       | Prevent auto-invocation (default: false)                 |

### Tool-Specific Filters

Commands can restrict which sub-commands of a tool are allowed:

```yaml
# Allow only specific gh commands
allowed-tools: Bash(gh issue view:*), Bash(gh search:*), Bash(gh pr comment:*)

# Or as array
allowed-tools: ["Read", "Write", "Grep", "Glob", "Bash", "TodoWrite"]
```

---

## 6. Skills

**Location:** `skills/<skill-name>/SKILL.md`

### Frontmatter Schema

```yaml
---
name: my-skill
description: 'This skill should be used when the user asks to... Include specific trigger phrases.'
version: 0.1.0
allowed-tools: Read Grep Bash
model: sonnet
effort: medium
context: fork
agent: my-agent
user-invocable: true
disable-model-invocation: false
paths: 'src/**/*.ts, lib/**/*.py'
---
# Skill content here...
```

### Field Reference

| Field                      | Required    | Type          | Notes                                                                                  |
| -------------------------- | ----------- | ------------- | -------------------------------------------------------------------------------------- |
| `name`                     | No          | string        | Defaults to directory name. Lowercase, hyphens, max 64 chars                           |
| `description`              | Recommended | string        | **Critical for discovery.** Include specific trigger phrases. Max ~250 chars displayed |
| `version`                  | No          | string        | Semantic versioning                                                                    |
| `allowed-tools`            | No          | string\|array | Tools available when skill active (space-separated or YAML list)                       |
| `model`                    | No          | string        | Model override when skill active                                                       |
| `effort`                   | No          | string        | `low`, `medium`, `high`, `max`                                                         |
| `context`                  | No          | string        | `fork` to run in forked subagent context                                               |
| `agent`                    | No          | string        | Subagent type when `context: fork`                                                     |
| `user-invocable`           | No          | boolean       | Show in `/` menu (default: true). Set false for background knowledge                   |
| `disable-model-invocation` | No          | boolean       | Prevent auto-loading (default: false)                                                  |
| `paths`                    | No          | string\|array | Glob patterns limiting activation scope                                                |
| `hooks`                    | No          | object        | Hooks scoped to skill lifecycle                                                        |
| `shell`                    | No          | string        | `bash` (default) or `powershell`                                                       |

### String Substitutions (in skill body)

- `$ARGUMENTS` — All arguments passed to the skill
- `$ARGUMENTS[N]` or `$N` — Specific argument by index (0-based)
- `${CLAUDE_SESSION_ID}` — Current session ID
- `${CLAUDE_SKILL_DIR}` — Skill's directory path

### Description Best Practices

Skills use "pushy" descriptions to combat undertriggering:

```yaml
# Good: specific trigger phrases
description: "This skill should be used when the user asks to 'build an MCP server',
  'create an MCP', 'wrap an API for Claude', or discusses building something with
  the Model Context Protocol."

# Bad: vague
description: "Use for MCP development."
```

### Progressive Disclosure

Keep SKILL.md focused (1,000-3,000 words). Use subdirectories for detailed content:

```
skills/my-skill/
├── SKILL.md           # Core instructions (loaded into context)
├── references/        # Detailed docs (loaded on demand)
│   ├── api-spec.md
│   └── patterns.md
├── examples/          # Working code examples
│   ├── basic.ts
│   └── advanced.ts
└── scripts/           # Utility scripts
    └── validate.sh
```

---

## 7. Hooks

**Location:** `hooks/hooks.json`

### Structure

```json
{
  "description": "What these hooks do",
  "hooks": {
    "EventType": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PLUGIN_ROOT}/scripts/handler.sh\"",
            "timeout": 10
          }
        ],
        "matcher": "Edit|Write|MultiEdit"
      }
    ]
  }
}
```

### Hook Event Types (24+)

**Session Lifecycle:**

| Event                | When                      | Common Use                   |
| -------------------- | ------------------------- | ---------------------------- |
| `SessionStart`       | Session begins/resumes    | Load context, display status |
| `SessionEnd`         | Session terminates        | Cleanup, save state          |
| `InstructionsLoaded` | CLAUDE.md or rules loaded | Modify instructions          |

**User Input:**

| Event              | When                           | Common Use                |
| ------------------ | ------------------------------ | ------------------------- |
| `UserPromptSubmit` | Before Claude processes prompt | Input validation, routing |
| `Stop`             | Claude finishes responding     | Post-processing, logging  |
| `StopFailure`      | Turn ends due to API error     | Error handling            |

**Tool Execution:**

| Event                | When                      | Common Use                   |
| -------------------- | ------------------------- | ---------------------------- |
| `PreToolUse`         | Before tool executes      | **Can block tool execution** |
| `PostToolUse`        | After tool succeeds       | Logging, validation          |
| `PostToolUseFailure` | After tool fails          | Error handling               |
| `PermissionRequest`  | Permission dialog appears | Auto-approval logic          |
| `PermissionDenied`   | Tool call denied          | Notification                 |

**Agent/Team:**

| Event           | When              | Common Use         |
| --------------- | ----------------- | ------------------ |
| `SubagentStart` | Subagent spawned  | Context injection  |
| `SubagentStop`  | Subagent finished | Output capture     |
| `TaskCreated`   | Task created      | Task tracking      |
| `TaskCompleted` | Task completed    | Progress reporting |

**File & Config:**

| Event            | When                      | Common Use              |
| ---------------- | ------------------------- | ----------------------- |
| `FileChanged`    | Watched file changes      | Auto-reload, validation |
| `CwdChanged`     | Working directory changes | Context switch          |
| `ConfigChange`   | Config file changes       | Re-apply settings       |
| `WorktreeCreate` | Worktree created          | Setup                   |
| `WorktreeRemove` | Worktree removed          | Cleanup                 |

**Optimization:**

| Event         | When                      | Common Use                         |
| ------------- | ------------------------- | ---------------------------------- |
| `PreCompact`  | Before context compaction | **Save state before context loss** |
| `PostCompact` | After context compaction  | **Restore critical context**       |

### Handler Types

```json
// Command: Execute a script
{
  "type": "command",
  "command": "bash \"${CLAUDE_PLUGIN_ROOT}/scripts/check.sh\"",
  "timeout": 10
}

// Prompt: LLM-driven decision
{
  "type": "prompt",
  "prompt": "Evaluate if this action is appropriate: $ARGUMENTS"
}

// HTTP: Webhook
{
  "type": "http",
  "url": "https://example.com/webhook"
}

// Agent: Delegate to agent
{
  "type": "agent",
  "agent": "verification-agent"
}
```

### Matcher (Optional)

Filter hooks to specific tools:

```json
{
  "matcher": "Edit|Write|MultiEdit",
  "hooks": [...]
}
```

### Hook Input (stdin for command type)

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/dir",
  "hook_event_name": "PreToolUse",
  "agent_id": "agent-xyz"
}
```

### Hook Output (stdout)

```json
{
  "continue": true,
  "decision": "allow",
  "reason": "Explanation",
  "suppressOutput": false
}
```

### Exit Code Semantics (command hooks)

| Exit Code | Meaning                                          |
| --------- | ------------------------------------------------ |
| 0         | Success, stdout parsed as JSON                   |
| 2         | **Blocking error**, stderr fed to Claude         |
| Other     | Non-blocking error, stderr shown in verbose mode |

---

## 8. Rules

**Location:** `rules/<rule-name>.md` or `rules/<category>/<rule-name>.md`

Rules are always-loaded guidelines that are injected into every session. They use simple markdown with optional YAML frontmatter.

```yaml
---
name: code-style
description: 'Universal coding standards'
---
# Code Style Rules

- Functions under 50 lines
- Meaningful names
- Comments explain WHY, not WHAT
```

Rules are auto-discovered from the `rules/` directory. No registration needed.

---

## 9. MCP Servers

**Location:** `.mcp.json` at plugin root, or inline in `plugin.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DATA_DIR": "${CLAUDE_PLUGIN_DATA}"
      }
    },
    "npm-server": {
      "command": "npx",
      "args": ["@scope/mcp-server", "--plugin-mode"],
      "cwd": "${CLAUDE_PLUGIN_ROOT}"
    }
  }
}
```

MCP servers start automatically when the plugin is enabled and appear as standard tools.

---

## 10. LSP Servers

**Location:** `.lsp.json` at plugin root

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": { ".go": "go" },
    "transport": "stdio",
    "restartOnCrash": true,
    "maxRestarts": 5,
    "startupTimeout": 5000,
    "shutdownTimeout": 5000
  }
}
```

LSP servers provide code intelligence (goto definition, hover, diagnostics). The language server binary must be installed separately by the user.

---

## 11. Settings & Installation

### Installation Scopes

| Scope     | File                          | Affects           | Shared          |
| --------- | ----------------------------- | ----------------- | --------------- |
| `user`    | `~/.claude/settings.json`     | All projects      | No              |
| `project` | `.claude/settings.json`       | All team members  | Yes (git)       |
| `local`   | `.claude/settings.local.json` | You, this project | No (gitignored) |
| `managed` | Managed settings              | Organization-wide | Deployed        |

### Enabling a Plugin

In `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "marketplace-name@plugin-name": true
  }
}
```

### Adding a Marketplace

```json
{
  "extraKnownMarketplaces": {
    "my-marketplace": {
      "source": {
        "source": "github",
        "repo": "owner/repo"
      },
      "autoUpdate": true
    }
  }
}
```

---

## 12. Auto-Update Marketplace

### How It Works

```
GitHub Repo (owner/repo)
    │
    │  1. Claude Code fetches (git clone/pull)
    │     Triggered by: session start, /reload-plugins, periodic check
    ▼
~/.claude/plugins/marketplaces/{marketplace-name}/
    │
    │  2. Reads .claude-plugin/marketplace.json
    │     Parses plugins[] entries
    ▼
~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/
    │
    │  3. Copies plugin files to cache
    │     Resolves source paths
    │     Detects version changes
    ▼
Claude Code Session
    │
    │  4. Auto-discovers components from cache
    │     agents/, commands/, skills/, hooks/, rules/
    ▼
Available (agents, skills, commands, hooks, MCP, LSP)
```

### Key Details

1. **Source of truth:** The GitHub repo specified in `extraKnownMarketplaces`
2. **Fetch trigger:** Session start (if `autoUpdate: true`), or manually via `/reload-plugins`
3. **Cache location:** `~/.claude/plugins/cache/{marketplace}/{plugin}/{version}/`
4. **Data persistence:** `~/.claude/plugins/data/{marketplace}-{plugin}/` survives updates
5. **Version detection:** Compares `version` field in plugin.json. **No version bump = no update detected**
6. **Local changes don't apply** until pushed to the GitHub repo and re-fetched

### Important: Local Development vs. Production

During development, your local changes are NOT reflected in the running plugin because Claude Code loads from the **cache** (fetched from GitHub). Two options:

1. **Push to GitHub** then `/reload-plugins`
2. **Use `claude --plugin-dir ./my-plugin`** to test locally without going through the marketplace

---

## 13. Environment Variables

| Variable                | Description                                                     | Example                            |
| ----------------------- | --------------------------------------------------------------- | ---------------------------------- |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin installation directory (cache path). Changes on updates. | Use for scripts, configs, binaries |
| `${CLAUDE_PLUGIN_DATA}` | Persistent data directory. Survives updates.                    | `~/.claude/plugins/data/{id}/`     |
| `${CLAUDE_SESSION_ID}`  | Current session ID                                              | Use in skills                      |
| `${CLAUDE_SKILL_DIR}`   | Skill's directory path                                          | Use in skill body                  |

**Where they work:** Hooks, MCP server configs, LSP server configs, skill body text.

---

## 14. Development Workflow

### Local Testing

```bash
# Test plugin locally (bypass marketplace)
claude --plugin-dir ./my-plugin

# Validate plugin structure
claude plugin validate /path/to/plugin

# Reload after changes (when using marketplace)
# Run inside Claude Code session:
/reload-plugins
```

### Debugging

```bash
# Verbose mode for plugin loading details
claude --debug

# Check for common issues:
# - Invalid JSON in plugin.json
# - Hook scripts not executable (chmod +x)
# - Incorrect event names (case-sensitive: PostToolUse, not postToolUse)
# - Paths using ../ (won't work after caching)
# - Version not bumped (updates won't be detected)
```

### Release Checklist

1. Bump `version` in both `plugin.json` and `marketplace.json`
2. Run `claude plugin validate .`
3. Test with `claude --plugin-dir .`
4. Push to GitHub
5. Verify with `/reload-plugins` in a fresh session

---

## 15. Gotchas & Lessons Learned

### Critical Mistakes

| Mistake                                      | Impact                     | Fix                                                              |
| -------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Put agents/commands inside `.claude-plugin/` | Not discovered             | Place at plugin root                                             |
| Use `../` paths                              | Break after caching        | Use relative `./` paths only                                     |
| Don't bump version                           | Updates not detected       | Always bump version                                              |
| Wrong hooks.json format (flat array)         | Hooks not loaded           | Use nested `{ hooks: { EventType: [{ hooks: [...] }] } }` format |
| Use `allowedSkills` in agents                | Field ignored              | Use `skills` array instead                                       |
| Vague skill descriptions                     | Skill never auto-triggered | Include specific user trigger phrases                            |
| Hook scripts not executable                  | Hooks fail silently        | `chmod +x hooks/scripts/*.sh`                                    |
| Top-level `description` in marketplace.json  | Validator warning          | Technically works but flagged as unrecognized                    |

### Agent Format Pitfalls

```yaml
# Wrong: tools as YAML array (worked in past, unreliable)
tools:
  - Read
  - Glob

# Right: comma-separated string
tools: Read, Glob, Grep, Bash

# Also right: JSON array
tools: ["Read", "Glob", "Grep", "Bash"]
```

### Hooks Format (Correct)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/scripts/start.sh\""
          }
        ]
      }
    ]
  }
}
```

**NOT** this (common mistake):

```json
{
  "hooks": [
    {
      "event": "SessionStart",
      "command": "..."
    }
  ]
}
```

### Marketplace vs Plugin

A single repo can be **both** a marketplace and a plugin:

```
my-repo/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Marketplace registry (source: "./")
├── agents/
├── commands/
└── skills/
```

### Cache Staleness

The plugin cache (`~/.claude/plugins/cache/`) can become stale. Signs:

- Old version loaded after push
- `.orphaned_at` files appearing in cache

Fix: Delete the cache directory and `/reload-plugins`:

```bash
rm -rf ~/.claude/plugins/cache/my-marketplace/my-plugin/
# Then /reload-plugins in Claude Code
```

---

## Appendix: Official References

- [Plugins Overview](https://code.claude.com/docs/en/plugins)
- [Plugins Reference](https://code.claude.com/docs/en/plugins-reference)
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Skills](https://code.claude.com/docs/en/skills)
- [Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Hooks](https://code.claude.com/docs/en/hooks)
- [Settings](https://code.claude.com/docs/en/settings)
- [Official Plugin Repository](https://github.com/anthropics/claude-plugins-official)
