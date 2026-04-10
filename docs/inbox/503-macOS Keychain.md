## macOS Keychain

### 是什麼

macOS 內建的密碼管理器（Wi-Fi 密碼、網站密碼、SSH passphrase 都存在這裡）。

底層：一個加密的 SQLite 資料庫，路徑 `~/Library/Keychains/login.keychain-db`。

### 實現原理（虛擬碼）

```python
class Keychain:
    def store(self, service, account, secret):
        # 用 macOS 登入密碼衍生的 master key 加密後寫入
        encrypted = aes_encrypt(secret, self.master_key)
        self.db.insert(service, account, encrypted)

    def lookup(self, service, account):
        encrypted = self.db.query(service, account)
        return aes_decrypt(encrypted, self.master_key)

    def unlock(self, login_password):
        # macOS 登入時自動呼叫
        self.master_key = kdf(login_password)  # PBKDF2 衍生金鑰
```

### 加密鏈

```
macOS 登入密碼
    │  (PBKDF2 金鑰衍生)
    ▼
Keychain master key
    │  (AES 加密/解密)
    ▼
SSH passphrase（加密存在磁碟）
    │  (解密後拿來用)
    ▼
SSH 私鑰（AES 加密存在磁碟）
    │  (解密後送入 agent 記憶體)
    ▼
解密後的私鑰 → 用來簽名
```

> 安全性最終取決於 macOS 登入密碼。登入時 Keychain 自動解鎖，登出/鎖屏時自動上鎖。

### 查看 Keychain 中的 SSH 項目

```bash
# 指令查看
security find-generic-password -s "SSH" -a ~/.ssh/id_ed25519

# GUI
# 打開「鑰匙圈存取」(Keychain Access) app → 搜尋 "SSH"

# 查看 agent 目前載入的鑰匙
ssh-add -l
```

### 有 Keychain vs 沒有 Keychain

|                  | 沒有 Keychain        | 有 Keychain                     |
| ---------------- | -------------------- | ------------------------------- |
| 開機後第一次 SSH | 輸入 passphrase      | 輸入 passphrase                 |
| 之後（同次開機） | agent 記住，不用輸入 | agent 記住，不用輸入            |
| **重開機後**     | **又要重新輸入**     | **Keychain 自動提供，不用輸入** |

---

## 跨平台替代方案（沒有 macOS Keychain 時）

### Linux

**方法 A：shell 啟動時自動載入**

```bash
# ~/.bashrc 或 ~/.zshrc
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

每次開終端問一次 passphrase，該 session 內不再問。

**方法 B：`keychain` 工具（推薦）**

```bash
sudo apt install keychain
# ~/.bashrc 加入：
eval "$(keychain --eval --agents ssh id_ed25519)"
```

跨終端 session 共享同一個 agent，每次登入只問一次。

**方法 C：`gnome-keyring` / `KDE Wallet`**

桌面環境下功能等同 macOS Keychain，登入桌面時自動解鎖。

### Windows

**方法 A：OpenSSH agent 服務（Windows 10+ 內建）**

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
ssh-add ~/.ssh/id_ed25519
```

Windows 用 DPAPI 加密保存，效果等同 Keychain。

**方法 B：Pageant（PuTTY 的 agent）** 或 **1Password / KeeAgent** 等密碼管理器直接當 SSH agent。

---

## 總結

> **ssh-agent** = 記憶體中的簽名服務（透過 Unix socket 通訊，私鑰不外洩）
> **Keychain** = 磁碟上的加密密碼庫（用登入密碼保護，重開機後仍在）
> 兩者配合，實現「安全 + 方便」。
