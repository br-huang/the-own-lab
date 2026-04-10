# docs/projects/ 文件規範

`docs/projects/` 是所有專案管理文件的唯一入口。禁止在 `apps/`、`packages/`、`scripts/` 內建立 `docs/`。

## 結構

```
docs/projects/<project-name>/
├── specs/                     ← 功能規格
│   └── YYYY-MM-DD-<slug>/
│       ├── REQUIREMENTS.md    ← 必要
│       ├── DESIGN.md
│       ├── PLAN.md
│       ├── REVIEW.md          ← 選填
│       └── TEST.md            ← 選填
├── adr/                       ← 架構決策紀錄
│   └── NNN-<title>.md
└── issues/                    ← Bug 追蹤
    └── NNN-<title>.md
```

## 四種文件類型

| 類型 | 回答的問題 | 生命週期 |
|------|-----------|---------|
| specs/ | 這個功能要做什麼、怎麼做？ | 開發前寫 → 開發中參考 → 完成後歸檔 |
| adr/ | 為什麼選 A 不選 B？ | 決策時寫一次，永久保留 |
| issues/ | 出了什麼問題、怎麼修的？ | 發現時建 → 修復後關閉 |

## 命名規則

- **Spec 目錄**: `YYYY-MM-DD-<verb>-<feature-slug>` (e.g., `2026-04-09-add-dark-mode`)
- **Spec 檔案**: 大寫 `REQUIREMENTS.md`, `DESIGN.md`, `PLAN.md`, `REVIEW.md`, `TEST.md`
- **ADR**: `001-chose-electron-over-tauri.md` (零填充, 過去式動詞)
- **Issue**: `001-tab-crash-on-close.md` (零填充, 描述性)

## Specs 流程

```
REQUIREMENTS.md → DESIGN.md → PLAN.md → [實作] → REVIEW.md → TEST.md
```

- **REQUIREMENTS.md** — 需求定義：目標、範圍、驗收條件
- **DESIGN.md** — 技術設計：架構、資料流、介面定義
- **PLAN.md** — 實作計畫：分步驟、每步驟對應檔案
- **REVIEW.md** — 開發後回顧：實際 vs 預期、取捨紀錄
- **TEST.md** — 測試計畫：測試策略、邊界條件、驗收結果

## ADR 格式

```markdown
# NNN-<title>

- Status: accepted | superseded by NNN
- Date: YYYY-MM-DD

## Context
（背景：遇到什麼問題）

## Decision
（決策：選了什麼方案）

## Consequences
（後果：帶來什麼影響）
```

一旦寫入不刪除，只能用新的 ADR 取代（標記舊的為 `superseded`）。

## Issues 格式

```markdown
# NNN-<title>

- Status: open | investigating | fixed
- Date: YYYY-MM-DD

## Problem
（問題描述 + 重現步驟）

## Root Cause
（根因分析）

## Fix
（修復方案）
```
