# Claude Code Statusline 教學

`Claude Code Statusline` 是顯示在 Claude Code 輸入區附近的一條狀態列。它本質上不是 Claude 內建 UI 元件，而是一個「外部命令」：Claude Code 會把目前上下文以 JSON 丟到你的腳本 `stdin`，你的腳本再把結果輸出到 `stdout`。

這代表你可以完全自訂要顯示什麼資訊，例如：

- 目前模型
- Git branch
- 工作目錄
- Session cost
- Context 使用量
- 最後一條 user prompt
- 今日累積工作時數

---

## 1. Statusline 的運作方式

Claude Code 會執行你指定的 command，並把一份 JSON context 傳給它。

你的 statusline 腳本只需要做兩件事：

1. 從 `stdin` 讀 JSON
2. 往 `stdout` 輸出一行或多行文字

最小概念如下：

```bash
#!/bin/bash

input=$(cat)
echo "$input" | jq .
```

正式使用時，你不會直接把 JSON 印出來，而是只取你要的欄位，拼成一條簡潔的狀態列。

---

## 2. 常見可用資訊

實務上最常用的資訊通常有：

| 資訊                    | 用途                                         |
| ----------------------- | -------------------------------------------- |
| `model.display_name`    | 顯示目前使用的模型                           |
| `session_id`            | 標記當前 session                             |
| `workspace.current_dir` | 顯示目前專案路徑                             |
| `transcript_path`       | 讀取對話紀錄，做 context 分析或抓最後 prompt |

不同版本欄位可能略有差異，所以最穩的做法是先把整份輸入存下來觀察。

例如：

```bash
#!/bin/bash
input=$(cat)
echo "$input" > /tmp/claude-statusline-input.json
echo "debug"
```

跑幾次之後再打開 `/tmp/claude-statusline-input.json` 看真實欄位結構。

---

## 3. 最簡單的 Statusline 範例

下面是一個很適合拿來起步的版本：

```bash
#!/bin/bash

input=$(cat)

MODEL=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
CWD=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
PROJECT=$(basename "$CWD")
BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null)

if [ -n "$BRANCH" ]; then
  echo "[$MODEL] [$PROJECT] [$BRANCH]"
else
  echo "[$MODEL] [$PROJECT]"
fi
```

這個版本會顯示：

- 模型名稱
- 當前資料夾名稱
- Git branch

---

## 4. Claude Code 的設定方式

你需要在 Claude Code 的 `settings.json` 中設定 `statusLine`。

常見格式如下：

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

如果你的腳本是 Node、Bun、或 `npx` 指令，也可以直接填 command，例如：

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y ccstatusline@latest",
    "padding": 0
  }
}
```

---

## 5. 實用資訊應該顯示什麼

從幾篇實作與使用心得來看，真正值得放進 statusline 的資訊不是越多越好，而是要能幫你做判斷。

我建議優先順序如下：

1. `Context 使用量`
2. `目前模型`
3. `Git branch`
4. `目前專案`
5. `Session cost / session duration`

原因很簡單：

- `Context 使用量` 決定你要不要壓縮、切新 session、或收斂任務
- `模型` 決定你現在是在高成本還是高速度模式
- `Git branch` 可避免在錯的 worktree 或分支操作
- `專案名稱` 幫你快速辨識視窗
- `Session cost` 幫你控管使用習慣

---

## 6. 進階做法：顯示最後一條 User Prompt

如果你常同時開多個 Claude Code 視窗，最容易出問題的是「我現在這個視窗剛剛到底叫它做什麼」。

這時候 `transcript_path` 很有價值。

思路是：

1. 從 JSON 拿到 `transcript_path`
2. 讀 transcript 檔
3. 找出最後一條 user message
4. 截斷成一行或兩三行顯示

這可以明顯降低多工時的認知切換成本。

---

## 7. 進階做法：顯示 Context 使用量

這通常是最有價值的資訊，但也最容易做太重。

兩種常見做法：

### 做法 A：直接從 transcript 估算

優點：

- 可完全自訂
- 能做更細的分析

缺點：

- 實作較複雜
- 每次都 parse transcript 可能偏慢

### 做法 B：顯示較粗略的 session 狀態

優點：

- 實作快
- 足夠拿來提醒自己

缺點：

- 不一定精準

如果是你自己從零做，我建議先做一個「低成本提醒版」，例如：

- 小於 50% 顯示綠色
- 50% 到 75% 顯示黃色
- 超過 75% 顯示紅色

---

## 8. 為什麼效能很重要

Statusline 會頻繁執行，所以慢一點點都會累積成糟糕體驗。

要注意幾件事：

- 不要每次都跑很多次 `jq`
- 不要每次都完整掃描大型 transcript
- Git 資訊建議做短時間快取
- 避免寫太多檔案
- 避免在 statusline 裡做重型 network / API 呼叫

一個常見優化技巧是快取 Git branch 5 秒：

```bash
current_time=$(date +%s)
cache_file="$HOME/.claude/cache/git_branch"

if [ -f "$cache_file" ]; then
  cache_time=$(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file" 2>/dev/null)
  if [ $((current_time - cache_time)) -lt 5 ]; then
    cat "$cache_file"
    exit 0
  fi
fi
```

---

## 9. Shell、Node、Go 該選哪個

### Shell

適合：

- 快速做出 MVP
- 只顯示少量欄位
- 你本來就熟 `bash` + `jq`

優點：

- 上手最快
- 部署簡單

缺點：

- 邏輯一複雜就會變難維護

### Node / TypeScript

適合：

- 想做可維護的 widget 系統
- 想支援 theme、config、renderer
- 未來想做成公開專案

優點：

- 結構化好做
- 易於擴充

缺點：

- 啟動成本比 shell 高一些

### Go

適合：

- 想要單一 binary
- 很在意執行速度
- 要處理 transcript、cache、格式化等邏輯

優點：

- 快
- 容易發佈

缺點：

- 初始開發速度通常比 shell 慢

---

## 10. 我建議的 MVP 架構

如果要自己做一個可維護的 `Claude Code Statusline`，我建議先做這五個 widget：

- `model`
- `cwd`
- `git`
- `context`
- `session`

如果用 TypeScript，結構可以長這樣：

```text
src/
  input.ts
  config.ts
  theme.ts
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
  renderers/
    plain.ts
    powerline.ts
  main.ts
```

責任分工如下：

- `providers`：負責拿資料
- `widgets`：負責把資料轉成 segment
- `renderers`：負責畫出最後的 statusline
- `config`：控制主題、順序、顯示哪些 widget

---

## 11. 產品型與個人腳本型的差異

如果你只是自己用，腳本型其實很夠。

但如果你想做成可分享專案，就要往產品型設計靠：

- 可配置 widget 順序
- 可切換 theme
- 支援 powerline / plain 樣式
- 支援 Nerd Font 與 ASCII fallback
- 可快取資料
- 可多行輸出
- 有清楚的設定檔格式

簡單說：

- 自己用：先求快
- 要公開：先把架構做好

---

## 12. 目前社群中值得參考的方向

### `claude-powerline`

適合參考：

- powerline 外觀
- theme 設計
- segment 化架構

### `ccstatusline`

適合參考：

- widget 系統
- 多行配置
- TUI 設定器
- 產品化流程

### Jackle 的做法

適合參考：

- 多工場景需求
- context 監控
- 顯示最後 user prompt
- 今日累積時數

### SDpower 的分析文

適合參考：

- statusline 機制理解
- bash MVP 寫法
- 效能與錯誤處理思路

---

## 13. 建議的開發順序

如果你要自己做，我建議照這個順序：

1. 先做 shell MVP
2. 確認你真正需要哪些資訊
3. 再升級成 TypeScript 或 Go
4. 最後才做 theme、powerline、設定檔、TUI

不要一開始就追求花俏 UI，因為 statusline 最重要的不是漂亮，而是：

- 快
- 穩
- 一眼看懂

---

## 14. 一個務實的最終建議

如果你現在的目標是「做一個自己的 Claude Code Statusline 專案」：

- 第一版先不要做 TUI
- 先不要做太多 widget
- 先確保資料來源穩定
- 先把 `context` 與 `last prompt` 做好

因為這兩個資訊最能直接改善實際使用體驗。

等 MVP 穩定後，再加：

- powerline renderer
- theme system
- widget ordering
- config file
- 多行模式

---

## 15. 可直接抄的起手式

```bash
#!/bin/bash

input=$(cat)

read -r MODEL CURRENT_DIR TRANSCRIPT_PATH <<EOF
$(echo "$input" | jq -r '
  .model.display_name,
  (.workspace.current_dir // .cwd // ""),
  (.transcript_path // "")
')
EOF

PROJECT=$(basename "$CURRENT_DIR")
BRANCH=$(git -C "$CURRENT_DIR" branch --show-current 2>/dev/null)

STATUS="[$MODEL] [$PROJECT]"

if [ -n "$BRANCH" ]; then
  STATUS="$STATUS [$BRANCH]"
fi

echo "$STATUS"
```

先讓這個版本穩定跑起來，再逐步加功能。

---

## 參考資料

- `https://github.com/Owloops/claude-powerline`
- `https://jackle.pro/articles/claude-code-status-line`
- `https://blog.sd.idv.tw/posts/2025-08-10_claude-code-statusline-analysis/`
- `https://github.com/sirmalloc/ccstatusline`
