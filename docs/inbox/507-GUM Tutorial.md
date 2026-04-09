# Gum - Shell Script TUI 工具教學

  

[Gum](https://github.com/charmbracelet/gum) 是 [Charm](https://charm.sh/) 出品的 CLI 工具，讓你在 Shell Script 中直接使用互動式 UI 元件，不需要寫 Go 或任何其他語言。

  

## 安裝

  

```bash

# macOS

brew install gum

  

# mise (推薦)

# 在 mise.toml 中加入：

[tools]

gum = "latest"

  

# Go

go install github.com/charmbracelet/gum@latest

```

  

---

  

## 元件總覽

  

| 元件 | 用途 | 類比 |

|------|------|------|

| `input` | 單行文字輸入 | HTML `<input>` |

| `write` | 多行文字輸入 | HTML `<textarea>` |

| `choose` | 從清單中選擇 | HTML `<select>` |

| `filter` | 模糊搜尋 + 選擇 | VS Code 的 Cmd+P |

| `confirm` | 是/否確認 | JavaScript `confirm()` |

| `spin` | Loading 動畫 | CSS spinner |

| `table` | 表格顯示 | HTML `<table>` |

| `style` | 文字樣式 | CSS |

| `format` | Markdown / Code 渲染 | Markdown renderer |

| `log` | 結構化日誌 | console.log |

| `file` | 檔案選擇器 | HTML `<input type="file">` |

| `pager` | 捲動檢視 | `less` |

| `join` | 組合排版 | CSS flexbox |

  

---

  

## 1. input — 單行輸入

  

```bash

# 基本用法（結果存到變數）

NAME=$(gum input --placeholder "請輸入你的名字")

echo "Hello, $NAME"

  

# 密碼輸入（自動遮罩）

PASSWORD=$(gum input --password --placeholder "請輸入密碼")

  

# 帶預設值

PORT=$(gum input --value "8080" --header "監聽 Port")

  

# 自訂樣式

gum input --cursor.foreground "#FF0" \

--prompt.foreground "#0FF" \

--prompt "=> " \

--placeholder "搜尋..." \

--width 60

```

  

**常用 flags：**

  

| Flag | 說明 |

|------|------|

| `--placeholder` | 佔位提示文字 |

| `--header` | 輸入框上方標題 |

| `--value` | 預設值 |

| `--password` | 密碼模式（顯示 *） |

| `--width` | 輸入框寬度 |

| `--prompt` | 提示符號（預設 `> `） |

  

---

  

## 2. write — 多行輸入

  

```bash

# 多行文字輸入（Ctrl+D 完成）

DESCRIPTION=$(gum write --placeholder "請描述這次變更...")

  

# 指定大小

NOTES=$(gum write --width 80 --height 10 --header "會議紀錄")

```

  

---

  

## 3. choose — 選擇清單

  

```bash

# 單選

TYPE=$(gum choose "fix" "feat" "docs" "style" "refactor" "test" "chore")

echo "選擇了: $TYPE"

  

# 多選（限制數量）

ITEMS=$(gum choose --limit 3 "Apple" "Banana" "Cherry" "Date" "Fig")

  

# 無限多選

ITEMS=$(gum choose --no-limit "React" "Vue" "Angular" "Svelte")

  

# 自訂樣式

gum choose --cursor "=> " \

--cursor.foreground 212 \

--selected.foreground 10 \

"Option A" "Option B" "Option C"

```

  

---

  

## 4. filter — 模糊搜尋

  

```bash

# 從清單模糊搜尋

echo -e "postgres\nredis\nnginx\nnode" | gum filter

  

# 從檔案篩選

gum filter < servers.txt

  

# 多選

cat services.txt | gum filter --limit 5

  

# 無限多選

cat services.txt | gum filter --no-limit

  

# 用於選擇 git branch

git branch | cut -c 3- | gum filter | xargs git checkout

  

# 用於開啟檔案

$EDITOR $(gum filter)

  

# 自訂外觀

gum filter --header "選擇服務:" \

--placeholder "搜尋..." \

--indicator "-> " \

--match.foreground 212

```

  

**choose vs filter 差異：**

  

| Type  | Choose   | Filter    |
| ----- | -------- | --------- |
| 適合項目數 | 少量（< 20） | 大量（可數百筆）  |
| 搜尋    | 無        | 模糊搜尋      |
| 輸入來源  | 參數       | stdin 或參數 |

  

---

  

## 5. confirm — 確認


```bash

# 基本確認

gum confirm "確定要部署嗎？" && ./deploy.sh || echo "已取消"

  

# if/else 用法

if gum confirm "刪除所有暫存檔？"; then

rm -rf /tmp/cache/*

echo "已清除"

else

echo "已取消"

fi

  

# 自訂按鈕文字

gum confirm "確認刪除？" \

--affirmative "是，刪除" \

--negative "不，保留"

```

  

---

  

## 6. spin — Loading 動畫

  

```bash

# 基本 spinner

gum spin --title "安裝中..." -- npm install

  

# 顯示指令輸出

gum spin --title "Building..." --show-output -- make build

  

# 不同 spinner 樣式

gum spin --spinner dot --title "Loading..." -- sleep 3

gum spin --spinner line --title "Loading..." -- sleep 3

gum spin --spinner globe --title "Loading..." -- sleep 3

gum spin --spinner moon --title "Loading..." -- sleep 3

gum spin --spinner pulse --title "Loading..." -- sleep 3

  

# 搭配 --show-output 取得結果

RESULT=$(gum spin --title "查詢中..." --show-output -- curl -s https://api.example.com)

```

  

**可用 spinner 樣式：** `line`, `dot`, `minidot`, `jump`, `pulse`, `points`, `globe`, `moon`, `monkey`, `meter`, `hamburger`

  

---

  

## 7. table — 表格

  

```bash

# 從 CSV 字串

gum table <<< "Name,Port,Status

postgres,5432,running

redis,6379,running

nginx,80,stopped"

  

# 從 CSV 檔案

gum table < services.csv

  

# 自訂分隔符

gum table --separator "|" < data.txt

  

# 自訂欄位寬度與邊框

gum table --columns "Name,Age,City" \

--widths 20,10,15 \

--border rounded \

--border.foreground 212 < users.csv

  

# 純顯示（不需要選擇）

gum table --print < report.csv

  

# 選擇某一行並取得欄位

SELECTED=$(gum table < services.csv | cut -d ',' -f 1)

echo "你選了: $SELECTED"

```

  

---

  

## 8. style — 文字樣式

  

```bash

# 顏色

gum style --foreground 212 "粉紅色文字"

gum style --foreground "#FF6347" "番茄紅"

  

# 粗體 / 斜體 / 底線

gum style --bold "粗體"

gum style --italic "斜體"

gum style --underline "底線"

gum style --bold --italic --foreground 99 "組合樣式"

  

# 邊框

gum style --border rounded --padding "1 2" "有邊框的內容"

gum style --border double --border-foreground 63 --padding "0 2" "雙線邊框"

  

# 完整佈局

gum style \

--foreground 212 \

--border-foreground 212 \

--border double \

--align center \

--width 50 \

--margin "1 2" \

--padding "2 4" \

"標題" \

"副標題"

```

  

**邊框樣式：** `none`, `hidden`, `normal`, `rounded`, `double`, `thick`, `block`

  

---

  

## 9. format — 格式化輸出

  

```bash

# Markdown 渲染

gum format -- "# 標題" "## 副標題" "- 項目一" "- 項目二"

  

# Markdown 表格

gum format -- "| 名稱 | 狀態 |" "|------|------|" "| DB | running |" "| Redis | stopped |"

  

# 程式碼高亮

cat main.go | gum format -t code

gum format -t code --language go < main.go

  

# Emoji 渲染

echo "Deploy :rocket: Success :white_check_mark:" | gum format -t emoji

  

# Template（使用 Lip Gloss 語法）

echo '{{ Bold "重要" }} {{ Color "99" "0" " 訊息 " }}' | gum format -t template

```

  

**format type (`-t`)：** `markdown`（預設）, `code`, `template`, `emoji`

  

---

  

## 10. log — 結構化日誌

  

```bash

# 不同等級

gum log --level debug "除錯訊息"

gum log --level info "一般訊息"

gum log --level warn "警告訊息"

gum log --level error "錯誤訊息"

gum log --level fatal "致命錯誤"

  

# 結構化 key-value

gum log --structured --level info "使用者登入" user "admin" ip "192.168.1.1"

  

# 帶時間戳

gum log --time rfc822 --level info "處理請求"

gum log --time "2006-01-02 15:04:05" --level warn "記憶體偏高"

  

# 不同格式

gum log --formatter json --structured --level info "Event" action "deploy"

gum log --formatter logfmt --structured --level debug "Query" duration 45

  

# 寫入檔案

gum log --file app.log --level error "寫入失敗"

```

  

---

  

## 11. file — 檔案選擇器

  

```bash

# 選擇檔案（從當前目錄）

FILE=$(gum file)

echo "選擇了: $FILE"

  

# 指定起始目錄

FILE=$(gum file /var/log)

  

# 只選目錄

DIR=$(gum file --directory)

  

# 顯示隱藏檔案

FILE=$(gum file --all)

```

  

---

  

## 12. pager — 捲動檢視

  

```bash

# 檢視檔案

gum pager < README.md

  

# 顯示行號

gum pager --show-line-numbers < main.go

  

# 自訂大小

gum pager --height 30 --width 100 < large_file.txt

  

# 長行自動換行

gum pager --soft-wrap < access.log

```

  

---

  

## 13. join — 組合排版

  

```bash

# 水平組合

A=$(gum style --border rounded --padding "1 3" "Box A")

B=$(gum style --border rounded --padding "1 3" "Box B")

gum join "$A" "$B"

  

# 垂直組合

gum join --vertical "$A" "$B"

  

# 對齊方式

gum join --align center --vertical "$A" "$B"

gum join --align right --vertical "$A" "$B"

  

# 實際範例：Dashboard 佈局

HEADER=$(gum style --border double --width 60 --align center "System Dashboard")

LEFT=$(gum style --border rounded --width 29 --height 5 "CPU: 45%")

RIGHT=$(gum style --border rounded --width 29 --height 5 "MEM: 72%")

BODY=$(gum join "$LEFT" "$RIGHT")

gum join --vertical "$HEADER" "$BODY"

```

  

---

  

## 環境變數自訂

  

所有 gum 元件都支援用環境變數設定預設樣式，格式為 `GUM_<元件>_<屬性>`：

  

```bash

# 在 .bashrc / .zshrc 中設定全域樣式

export GUM_INPUT_CURSOR_FOREGROUND="#FF0"

export GUM_INPUT_PROMPT_FOREGROUND="#0FF"

export GUM_INPUT_PLACEHOLDER="Type here..."

export GUM_INPUT_WIDTH=80

  

export GUM_CONFIRM_SELECTED_FOREGROUND="10"

export GUM_CHOOSE_CURSOR_FOREGROUND="212"

  

# 設定後，所有 gum input 都會套用這些樣式

gum input # 自動使用上面的設定

```

  

---

  

## 實戰範例：Git Conventional Commit

  

```bash

#!/usr/bin/env bash

# 互動式 Conventional Commit

  

TYPE=$(gum choose "fix" "feat" "docs" "style" "refactor" "test" "chore")

SCOPE=$(gum input --placeholder "scope (選填，例：api, ui)")

SUMMARY=$(gum input --placeholder "簡短描述這次變更" --width 72 --header "Summary")

DESCRIPTION=$(gum write --placeholder "詳細說明（選填，Ctrl+D 完成）" --header "Description")

  

# 組合 commit message

if [ -n "$SCOPE" ]; then

COMMIT_MSG="$TYPE($SCOPE): $SUMMARY"

else

COMMIT_MSG="$TYPE: $SUMMARY"

fi

  

if [ -n "$DESCRIPTION" ]; then

COMMIT_MSG="$COMMIT_MSG

  

$DESCRIPTION"

fi

  

# 預覽

echo ""

gum style --border rounded --padding "1 2" --border-foreground 63 "$COMMIT_MSG"

echo ""

  

# 確認

gum confirm "確認 commit？" && git commit -m "$COMMIT_MSG" || echo "已取消"

```

  

## 實戰範例：Docker 服務管理選單

  

```bash

#!/usr/bin/env bash

# Docker 服務互動式管理

  

ACTION=$(gum choose \

"status — 查看所有容器" \

"logs — 檢視容器日誌" \

"restart — 重啟容器" \

"stop — 停止容器" \

"exec — 進入容器 Shell")

  

# 取得動作名稱

CMD=$(echo "$ACTION" | cut -d' ' -f1)

  

case "$CMD" in

status)

docker ps --format "table {{.Names}},{{.Status}},{{.Ports}}" \

| gum table --print

;;

logs|restart|stop|exec)

# 選擇容器

CONTAINER=$(docker ps --format "{{.Names}}" | gum filter --header "選擇容器:")

[ -z "$CONTAINER" ] && exit 0

  

case "$CMD" in

logs) docker logs -f --tail 100 "$CONTAINER" | gum pager ;;

restart) gum spin --title "重啟 $CONTAINER..." -- docker restart "$CONTAINER" ;;

stop) gum confirm "停止 $CONTAINER？" && docker stop "$CONTAINER" ;;

exec) docker exec -it "$CONTAINER" sh ;;

esac

;;

esac

```

  

---

  

## Charm 全家桶關係

  

```

你的需求是什麼？

│

├── Shell Script 加上互動 UI

│ └── Gum ← 直接在 bash 中呼叫，零成本

│

├── 寫完整的 TUI 應用程式（如 lazygit, k9s）

│ └── Bubble Tea ← Go 框架，Elm 架構 (Model → Update → View)

│ └── Lip Gloss ← 樣式引擎，CSS-like 的終端排版

│

└── 其他語言生態

├── Python → Textual (Rich 作者出品)

├── Rust → Ratatui

└── JS → Ink (React for CLI)

```

  

**簡單記法：**

- **Gum** = Shell Script 的 UI 元件庫（不用寫程式）

- **Bubble Tea** = 用 Go 寫 TUI App 的框架（要寫 Go）

- **Lip Gloss** = Bubble Tea 內部的 CSS 引擎（通常不單獨用）