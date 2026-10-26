本檔不再維護，請以 AGENTS.md 為準。

# CLAUDE.md — FilMaster 專案規則

## 專案
- 名稱：FilMaster（原名 FilmMaster Studio，已更名）
- 用途：半導體旋塗製程的膜厚與固含量預測網頁
- 核心公式：`h = C · S^α · ω^(−β) · t^(−γ)`

## 技術棧
- React + Vite + TypeScript + Tailwind CSS + Recharts
- 測試：Vitest

## 部署
- GitHub Pages：https://t22016aemc.github.io/FilMaster/
- Repository：T22016AEMC/FilMaster
- Vite `base` 為 `/FilMaster/`

## 版本規則
- 語意化版本，重建版從 2.0.0 起
- 修 bug 升第三碼，加功能升第二碼
- 只有在「部署上線」時才升版，並同步更新：
  1. `package.json`
  2. 頁尾顯示的版本號
  3. `CHANGELOG.md`

## 發布新版本的流程
1. 依語意化版本規則決定新版本號
2. 更新 `package.json` 的 `version`（頁尾與 Header 的版本號由 `__APP_VERSION__` 在建置時自動取自此欄位，不需手動修改）
3. 將 `CHANGELOG.md` 的 `[Unreleased]` 改為新版本區段並加上日期，再新增空的 `[Unreleased]`
4. commit 後建立 git tag（格式 `v2.x.x`）
5. 推送 main 與 tag，GitHub Actions 會自動部署（測試或型別檢查沒過就不會部署）

## 重要約束
- `_legacy/` 為原始程式，唯讀參考，不可修改
- 計算核心（膜厚計算、反算、校正）的任何修改都必須有對應的單元測試
- localStorage 鍵名 `spin_coating_custom_calibrated_curves_v2` 不可變更，否則使用者既有的自訂曲線會讀不到
- 介面文字使用繁體中文

## 工作流程
- 每個階段完成後停下，回報結果，等待下一個指令，不要自行進入下一階段
