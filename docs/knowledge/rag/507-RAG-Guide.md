# Obsidian KB — 使用指南與技術說明

## 目錄

- [快速開始](#快速開始)
- [安裝方式](#安裝方式)
- [設定說明](#設定說明)
- [使用方式](#使用方式)
- [技術架構](#技術架構)
- [常見問題](#常見問題)

---

## 快速開始

Obsidian KB 是一個 RAG（檢索增強生成）插件，將你的 Obsidian Vault 變成 AI 知識庫。

- **Embedding（索引）**：完全在本地執行，免費、離線可用、資料不離開你的電腦
- **Chat（對話）**：透過 OpenAI API 回答問題，需要 API Key

---

## 安裝方式

### 方式 A：Symlink（開發用，推薦）

```bash
ln -s /path/to/110-Obsidian-RAG \
  "/path/to/your/vault/.obsidian/plugins/obsidian-kb"
```

### 方式 B：複製檔案

```bash
cp -r /path/to/110-Obsidian-RAG \
  "/path/to/your/vault/.obsidian/plugins/obsidian-kb"
```

### 啟用插件

1. 開啟 Obsidian
2. **Settings** → **Community plugins** → 關閉 **Restricted mode**
3. 找到 **Obsidian KB** → 啟用
4. **Settings** → **Obsidian KB Settings** → 填入 OpenAI API Key

> 注意：Embedding 不需要 API Key，插件啟用後會自動開始索引。API Key 僅用於聊天功能。

---

## 設定說明

### Chat (LLM)

| 設定           | 說明                             | 預設值 |
| -------------- | -------------------------------- | ------ |
| OpenAI API Key | 用於聊天回答（不用於 Embedding） | 無     |
| Chat Model     | OpenAI 聊天模型                  | gpt-4o |

### Advanced

| 設定                 | 說明                              | 預設值 |
| -------------------- | --------------------------------- | ------ |
| Top-K Results        | 每次查詢檢索的 chunk 數量（1-20） | 5      |
| Embedding Batch Size | 索引時每批處理的檔案數（5-50）    | 20     |

---

## 使用方式

### 索引

插件啟用後自動索引 Vault 中所有 `.md` 檔案：

- 狀態列顯示進度：`Indexing: X / Y notes`
- 完成後顯示：`KB: N notes indexed`
- 編輯、新增、刪除筆記時自動增量更新（2 秒 debounce）
- 首次載入需下載 BGE 模型（約 33MB），之後完全離線

### 聊天

1. 點擊左側 ribbon 的聊天圖示，或 `Ctrl/Cmd+P` → `Open KB Chat`
2. 在右側邊欄輸入與筆記相關的問題
3. AI 會串流回答，底部顯示來源筆記的可點擊連結
4. 點擊來源連結可跳轉到對應筆記

---

## 技術架構

### 資料流

```
你的筆記 (.md)
    │
    ▼
  Chunker（Markdown 感知分塊，500 tokens / chunk）
    │
    ▼
  Transformers.js（本地 Embedding，BGE-small-en 模型）
    │
    ▼
  vectors.json（純 JSON 儲存，在 vault/.obsidian-kb/ 內）
    │
    ▼
  ── 查詢時 ──
    │
  你的問題 → 本地 Embedding → Cosine Similarity 搜索 → Top-K chunks
    │
    ▼
  OpenAI GPT-4o（組合 context + 問題 → 串流回答 + 來源引用）
```

### 向量儲存：為什麼用 JSON 而不是向量資料庫？

我們把向量存在 `vault/.obsidian-kb/vectors.json`，搜索用純 JS cosine similarity 暴力遍歷。這是參考 [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections) 插件的做法（它用 `.ajson` 格式，概念相同）。

**AJSON**（Append-only JSON）是 Smart Connections 自創的格式，每行一筆向量記錄，只追加不覆寫。本質上就是把向量存成純文字檔案。

|                   | 純文字檔案（JSON / AJSON）      | 向量資料庫（LanceDB / Chroma / Pinecone） |
| ----------------- | ------------------------------- | ----------------------------------------- |
| **搜索方式**      | 暴力遍歷 cosine similarity O(n) | 索引結構（HNSW / IVF）O(log n)            |
| **適用規模**      | < 10,000 chunks                 | 百萬級以上                                |
| **依賴**          | 零（純 JS）                     | native binary / 雲端服務                  |
| **精確度**        | 100%（遍歷所有向量）            | 近似搜索（可能漏掉結果）                  |
| **Obsidian 相容** | 完美（無 native binary 問題）   | 有 Electron ABI 相容風險                  |

**結論**：個人 Vault 幾千篇筆記產生幾萬個 chunks，暴力搜索在毫秒級完成，不需要向量資料庫。

### Embedding：Transformers.js vs OpenAI Embedding API

兩者做的是同一件事 — 把文字轉成向量（數字陣列）：

```
"Obsidian is a note-taking app" → [0.12, -0.34, 0.56, ...]
```

差異在於模型在哪裡執行：

|              | Transformers.js（本地）        | OpenAI Embedding API（雲端） |
| ------------ | ------------------------------ | ---------------------------- |
| **執行位置** | 你的電腦（WASM）               | OpenAI 伺服器                |
| **模型**     | BGE-small-en（33MB）           | text-embedding-3-small       |
| **向量維度** | 384 維                         | 1536 維                      |
| **費用**     | 免費                           | ~$0.02 / 百萬 tokens         |
| **速度**     | 首次載入 2-3 秒，之後每次幾 ms | 每次需 HTTP 請求 ~200ms      |
| **離線**     | 模型下載後完全離線             | 需要網路                     |
| **品質**     | 良好（英文佳，中文一般）       | 較好（多語言支援）           |
| **隱私**     | 資料不離開你的電腦             | 資料送到 OpenAI              |

**Transformers.js** 是 HuggingFace 開發的 JavaScript ML 推論庫。它把 Python 訓練的模型轉成 ONNX 格式，用 WebAssembly（WASM）在瀏覽器或 Electron 環境中執行。不需要 Python、不需要 GPU，純粹靠 CPU 就能跑。

**本插件的選擇**：Embedding 全部走本地（Transformers.js），只有 Chat 走 OpenAI API。這樣索引免費、離線可用，只有問答時才需要網路和 API 費用。

### 模組架構

```
src/
├── main.ts              ← 插件入口，組裝所有模組
├── settings.ts          ← 設定面板
├── types.ts             ← 共用 TypeScript 型別
├── llm/
│   ├── provider.ts      ← LLM 抽象介面（chat + embedding）
│   ├── openai.ts        ← OpenAI 實作（僅 chat）
│   └── local-embeddings.ts  ← Transformers.js 本地 Embedding
├── core/
│   ├── chunker.ts       ← Markdown 感知分塊器
│   ├── vector-store.ts  ← 純 JS 向量儲存 + cosine similarity 搜索
│   ├── vault-indexer.ts ← Vault 索引器（全量 + 增量）
│   └── rag-engine.ts    ← RAG 管線（embed → search → LLM → 回答）
└── ui/
    └── chat-view.ts     ← 聊天側邊欄 UI
```

---

## 常見問題

### 插件載入失敗（Failed to load plugin）

最常見原因是 native binary 不相容。本插件已移除所有 native 依賴，但如果仍然失敗：

1. 按 `Ctrl/Cmd+Shift+I` 開啟 Developer Console
2. 查看紅色錯誤訊息
3. 常見錯誤：
   - `Cannot find module '@xenova/transformers'` → 確認 `node_modules` 目錄存在於插件目錄中
   - `Failed to resolve module specifier` → 需要重新 build（`npm run build`）

### 索引速度慢

- 首次索引需下載 BGE 模型（~33MB），之後會快取
- 大型 Vault（200+ 筆記）索引時間取決於筆記數量，通常幾十秒到幾分鐘
- 增量索引只處理變更的檔案，通常瞬間完成

### 聊天沒有回應

1. 確認已設定 OpenAI API Key
2. 確認索引已完成（狀態列顯示 `KB: N notes indexed`）
3. 按 `Ctrl/Cmd+Shift+I` 查看 Console 是否有 API 錯誤

### 中文筆記的搜索品質

目前使用的 BGE-small-en 模型以英文為主。中文搜索可用但品質較低。未來可考慮切換為多語言模型（如 `Xenova/multilingual-e5-small`）。

---

_文件版本：0.1.0 | 最後更新：2026-04-07_
