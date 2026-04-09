# npm Publish 教學

這篇是給「要把自己的 CLI 工具發佈到 npm，讓其他機器可以直接安裝」的實作筆記。

以這次的 `Claude Code Statusline` 為例，目標是做到：

```bash
npm install -g @johnnyboy11234/claude-code-statusline
claude-code-statusline
```

也就是：

- npm 上有可安裝的 package
- 安裝後能直接執行全域 command
- 可以接到 Claude Code 的 `statusLine.command`

---

## 1. 先理解 package 名稱與 command 名稱是兩回事

很多人一開始會把這兩個混在一起。

### npm package 名稱

這是拿來安裝的名稱，例如：

```bash
npm install -g @johnnyboy11234/claude-code-statusline
```

### CLI command 名稱

這是安裝後在 terminal 裡執行的名稱，例如：

```bash
claude-code-statusline
```

這兩個通常相近，但不一定要完全相同。

在 `package.json` 中，真正控制 command 名稱的是 `bin`：

```json
{
  "name": "@johnnyboy11234/claude-code-statusline",
  "bin": {
    "claude-code-statusline": "./bin/claude-statusline"
  }
}
```

所以：

- package 名稱可以是 scoped package
- command 仍然可以是漂亮的全域指令

---

## 2. 為什麼常常需要 scoped package

如果你想用的 npm 名稱已經被別人佔用，例如：

- `claude-best-statusline`
- `claude-code-statusline`

那你就不能再用 unscoped package 發佈。

這時候最務實的做法就是改用自己的 scope：

```bash
@johnnyboy11234/claude-code-statusline
```

優點：

- 幾乎一定可用
- 品牌與所有權明確
- 安裝名稱穩定

然後把全域 command 保持成：

```bash
claude-code-statusline
```

這樣使用者體驗還是很好。

---

## 3. 發佈前 `package.json` 至少要有什麼

最基本建議如下：

```json
{
  "name": "@johnnyboy11234/claude-code-statusline",
  "version": "0.1.0",
  "description": "A local-first Claude Code statusline CLI with powerline and plain renderers.",
  "license": "MIT",
  "type": "module",
  "bin": {
    "claude-code-statusline": "./bin/claude-statusline"
  },
  "files": ["bin", "dist", "README.md"],
  "exports": {
    ".": "./dist/main.js"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

幾個重點：

- `name`：npm package 名稱
- `version`：版本號
- `bin`：全域 CLI command
- `files`：控制發佈內容，避免把整個 repo 都丟上去
- `publishConfig.access`：scoped package 若要公開，通常要設成 `public`

---

## 4. `bin` 檔要用發佈版路徑，不要依賴開發環境

開發時你可能會讓 `bin` fallback 到 `tsx src/main.ts`。

但正式發佈時，建議只跑 build 後的檔案：

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

exec node "$PROJECT_ROOT/dist/main.js"
```

原因：

- 使用者安裝的是 package，不是你的開發環境
- 不應要求使用者機器上還要有 `tsx`
- 發佈後最穩的是直接執行 `dist`

---

## 5. 發佈前一定要先做這三件事

### 1. build

```bash
pnpm build
```

### 2. test

```bash
pnpm test
```

### 3. pack dry run

```bash
npm pack --dry-run
```

這一步超重要，因為它會直接告訴你：

- 會打包哪些檔案
- tarball 大小
- 有沒有漏掉 `dist`
- 有沒有把不該發的東西一起送出去

如果你的 npm cache 權限有問題，可以用暫存 cache：

```bash
env npm_config_cache=/tmp/my-npm-cache npm pack --dry-run
```

---

## 6. 怎麼確認名稱有沒有被占用

用：

```bash
npm view <package-name> name version
```

例如：

```bash
npm view claude-code-statusline name version
```

如果查得到版本，代表這個名稱已經有人用了。

如果你要查 scoped package：

```bash
npm view @johnnyboy11234/claude-code-statusline name version
```

---

## 7. 怎麼確認自己有沒有登入 npm

```bash
npm whoami
```

如果沒登入，會看到類似：

```text
ENEEDAUTH
```

這時候先登入：

```bash
npm login
```

登入成功後再跑一次：

```bash
npm whoami
```

---

## 8. 正式發佈

最基本指令：

```bash
npm publish
```

如果你的 package 是 scoped package，且你希望是公開的，通常要在 `package.json` 裡加：

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

如果你開了 npm 2FA，發佈時可能會出現：

```text
EOTP
```

這代表需要 OTP 驗證碼。

這時候可以直接帶上：

```bash
npm publish --otp=123456
```

或者先執行 `npm publish`，再輸入 authenticator app 的 6 位數 OTP。

---

## 9. 發佈成功後怎麼驗證

先查 registry：

```bash
npm view @johnnyboy11234/claude-code-statusline name version dist-tags --json
```

如果成功，通常會看到：

```json
{
  "name": "@johnnyboy11234/claude-code-statusline",
  "version": "0.1.0",
  "dist-tags": {
    "latest": "0.1.0"
  }
}
```

接著可以用另一台機器，或本機重新安裝驗證：

```bash
npm install -g @johnnyboy11234/claude-code-statusline
claude-code-statusline
```

---

## 10. Claude Code CLI 工具的實戰安裝方式

對這類專案，我建議 README 直接寫這組：

```bash
npm install -g @johnnyboy11234/claude-code-statusline
```

Claude Code 的 `settings.json`：

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-code-statusline",
    "padding": 0
  }
}
```

這樣安裝完就能直接用，不需要知道 repo 的絕對路徑。

---

## 11. 一次完整流程範例

```bash
# 1. 確認名稱
npm view @johnnyboy11234/claude-code-statusline name version

# 2. 確認登入
npm whoami

# 3. 建置與測試
pnpm build
pnpm test

# 4. 確認打包內容
env npm_config_cache=/tmp/claude-code-statusline-npm-cache npm pack --dry-run

# 5. 正式發佈
env npm_config_cache=/tmp/claude-code-statusline-npm-cache npm publish --otp=123456

# 6. 驗證 registry
npm view @johnnyboy11234/claude-code-statusline name version dist-tags --json

# 7. 安裝驗證
npm install -g @johnnyboy11234/claude-code-statusline
claude-code-statusline
```

---

## 12. 幾個常見坑

### `name` 已被佔用

解法：

- 換名稱
- 改用 scoped package

### `ENEEDAUTH`

解法：

- 先 `npm login`

### `EOTP`

解法：

- 帶 `--otp=<6位數驗證碼>`

### `npm pack` 找不到 `dist`

解法：

- 先 `pnpm build`
- 確認 `files` 裡有 `dist`
- 確認 build script 真的有輸出到 `dist`

### 發佈了但 command 不能執行

解法：

- 檢查 `bin` 設定
- 檢查 `bin` 檔案有沒有 shebang
- 確認 `bin` 是執行 build 後的檔案，不是指向本地開發檔

---

## 13. 我自己的建議

如果你做的是 CLI 工具，npm 發佈的原則很簡單：

- package 名稱先求可用
- command 名稱再求好記
- 發佈前一定先 `pack --dry-run`
- scoped package 完全沒問題，不要硬追 unscoped 名稱

對使用者來說，真正重要的是：

- 一條安裝指令
- 一個能直接跑的 command

不是你 package 名稱有沒有剛好最短。
