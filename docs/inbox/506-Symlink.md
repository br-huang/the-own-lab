
一、 Symlink 的運作機制

在作業系統底層（以 Linux 的 ext4 為例），Symlink 的實現方式如下：

1. **獨立的節點 (Inode)**：Symlink 擁有自己的 Inode，這表示它在檔案系統中是一個真實存在的檔案對象，而不是原始檔案的別名。
2. **存儲內容為路徑**：
    - **一般情況**：Symlink 的資料區塊（Data Block）不存原始數據，而是存儲目標檔案的**路徑字串**（例如 `/home/user/data.txt`）。
    - **優化情況 (Fast Symlink)**：如果目標路徑很短（例如 < 60 字節），有些檔案系統會直接將路徑存放在 Inode 結構內部，省去讀取額外資料區塊的開銷。
3. **解析過程**：當應用程式呼叫 `open()` 存取 Symlink 時，內核會發現該 Inode 的類型是「符號連結」，隨即讀取其內容，並重新啟動路徑搜尋流程指向目標
```Python
import os

target = 'original_file.txt'
link = 'my_shortcut'

try:
    os.symlink(target, link)
    print("Symlink 建立成功")
except OSError as e:
    print(f"失敗: {e}")

```