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

## 重要約束
- `_legacy/` 為原始程式，唯讀參考，不可修改
- 計算核心（膜厚計算、反算、校正）的任何修改都必須有對應的單元測試
- 介面文字使用繁體中文

## 工作流程
- 每個階段完成後停下，回報結果，等待下一個指令，不要自行進入下一階段
