# Claude Code Statusline

一個依照 `docs/specs/2026-04-08-plan-claude-code-statusline` 建立的 local-first TypeScript Claude Code statusline MVP。

## 特色

- 讀取 Claude Code 從 `stdin` 傳入的 JSON
- 分層架構：`input`、`providers`、`widgets`、`renderers`、`config`
- MVP widgets：`model`、`cwd`、`git`、`context`、`session`
- 同時支援 `plain` 與 `powerline` renderer
- 支援 JSON config 與 theme token 覆寫
- Git branch 具 5 秒快取
- transcript 可抓最後一條 user prompt
- Nerd Font 與 ASCII fallback

## 安裝與建置

```bash
pnpm install
pnpm build
```

## 開發與驗證

```bash
pnpm test
pnpm demo
```

## Claude Code 設定

先建置一次：

```bash
pnpm build
```

把下列設定放進 Claude Code 的 `settings.json`：

```json
{
  "statusLine": {
    "type": "command",
    "command": "/Users/rong/Workspaces/1-Projects/11-Brian-Projects/114-claude-code-statusline/bin/claude-statusline",
    "padding": 0
  }
}
```

## Config

專案根目錄的 [`.claude-code-statusline.json`](/Users/rong/Workspaces/1-Projects/11-Brian-Projects/114-claude-code-statusline/.claude-code-statusline.json) 是預設範例。

支援：

- `renderer`: `plain` 或 `powerline`
- `widgets`: widget 顯示順序
- `nerdFont`: 是否使用 Nerd Font separator
- `theme`: tone 顏色與 separator 覆寫

## 專案結構

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
    session.ts
    index.ts
  renderers/
    plain.ts
    powerline.ts
test/
  input.test.ts
```
