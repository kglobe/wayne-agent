# wayne-agent

herdr-app 的 agents 側邊欄，每個 Claude Code agent 底下多一行 wayne-mode 進度，例如 `13/20 跑 e2e`、`15/20 等：第 2 件常用詞`。資料來源是 wayne-mode 寫在 repo 根目錄的 `.wayne-mode-todo-<session>.md`，只讀不寫。

- 有 `[wait]` 的話，那一行是紅色，寫在等什麼
- 進行中、清單超過 10 分鐘沒變，紅色加「N 分沒動」
- 全部打勾顯示 `完成 N/N`

跟 wayne-progress 是同一件事的兩種做法：這個放在側邊欄、一行看完；wayne-progress 是獨立一欄，看得到整份清單。

## 安裝

需要 Windows 版 herdr-app、`git` 在 PATH 上，以及 herdr-notify-win 裝好的 `main-wintoast` layout。

```powershell
pwsh -File install.ps1
```

install.ps1 會：

1. 從內建 agents mod 重新 clone 出 `wayne-agent`，放進 `progress.js`、`todo.js`
2. 在 `main.js` 打 4 個補丁（import、啟動輪詢、每列包一層、補右括號）。內建 agents 改版對不上時會停下來，說是哪一個
3. `main-wintoast` 的側邊欄從 `agents` 換成 `wayne-agent`
4. 跑 `herdr-app check`

herdr-app 更新內建 agents 之後重跑一次。

## 還原

把 `~/.config/herdr-app/layouts/main-wintoast.json` 裡的 `"mod": "wayne-agent"` 改回 `"agents"`，刪掉 `mods/wayne-agent`。

## 已知限制

這是 spike，還沒優化：

- 每個 repo 只看最新的那份 todo 檔。舊 session 做完的清單會顯示成 `完成 N/N`；同一個 repo 跑兩場分不出來
- 用 `cmd /c dir` 列檔，只能在 Windows 跑
- 字小、會截斷

## 測試

```powershell
npm test
```
