# AGENTS.md — FilMaster 專案規則

## 一、專案簡介

- 名稱：FilMaster（原名 FilmMaster Studio，已更名）。
- 用途：半導體旋塗製程的膜厚與固含量預測網頁。
- 核心公式：`h = C · S^α · ω^(−β) · t^(−γ)`。
- 技術棧：React + Vite + TypeScript（strict）+ Tailwind CSS + Recharts；測試使用 Vitest。
- Repository：`T22016AEMC/FilMaster`，公開原始碼位於 https://github.com/T22016AEMC/FilMaster 。
- 部署：GitHub Pages，由 GitHub Actions 自動測試並部署至 https://t22016aemc.github.io/FilMaster/ 。
- Vite `base` 為 `/FilMaster/`。

## 二、工作規則

- 一律使用台灣繁體中文回覆，介面文字也使用繁體中文。
- 材料參數（C、α、β、γ）與範例數據由使用者自行驗證，不要主動檢查、質疑或修改這些數值。
- `_legacy/` 為原始程式，僅供唯讀參考，不可修改。
- 計算核心（`src/utils` 內的膜厚計算、反算、校正）的任何修改都必須有對應的單元測試。
- 既有的原版對照測試（`src/utils/__fixtures__/` 內的 golden 檔）不可為了讓測試通過而重新產生；若預期行為真的改變，要在測試中明確列出差異。
- localStorage 鍵名 `spin_coating_custom_calibrated_curves_v2` 不可變更，否則使用者既有的自訂曲線會讀不到。
- 不做手機版的檢查與優化，但不要移除現有的響應式排版。
- 只在這一台電腦上開發，專案根目錄為 `C:\Users\t22016\Desktop\程式\FilMaster`。
- 每個階段完成後停下，回報結果，等待下一個指令，不要自行進入下一階段；已授權階段內的發布流程依下節直接完成。

## 三、版本與發布

- 採語意化版本，重建版從 `2.0.0` 起；修 bug 升第三碼，加功能升第二碼。
- 只有在發布、部署上線時才升版，並同步更新 `package.json`、`CHANGELOG.md` 與畫面上顯示的版本號。
- 頁尾與 Header 的版本號由 `__APP_VERSION__` 在建置時自動取自 `package.json` 的 `version`，不需手動修改畫面元件。
- 新版本完成後直接發布，不需要停下來等使用者確認，流程如下：
  1. 執行 lint、test、build，全部通過，並確認 `npm audit --omit=dev` 為 0 個漏洞。
  2. 依語意化版本規則決定新版本號，更新 `package.json` 的 `version`，確認畫面版本號會同步更新。
  3. 將 `CHANGELOG.md` 的 `[Unreleased]` 改為新版本區段並加日期，再新增空的 `[Unreleased]`。
  4. commit 後建立 annotated tag，格式為 `v2.x.x`。
  5. 推送 `main` 與 tag，GitHub Actions 自動測試並部署；測試或型別檢查未通過就不會部署。
  6. 追蹤 GitHub Actions 到結束，檢查線上網址能正常回應且含新版本號，再回報結果。
- 發布時遇到以下情況必須停下來回報，不要自行處理：測試或建置失敗、`npm audit --omit=dev` 有漏洞、推送被拒絕或有衝突、GitHub Actions 部署失敗、需要使用者登入授權。
- 禁止使用 `--force` 或改寫歷史。
- 例外：若使用者的指令明確要求「先停下讓使用者看過本機畫面」，則推送前必須停下。

## 四、git 規則

- commit 訊息使用繁體中文，格式為 `type: 說明`（type 例如 `feat`、`fix`、`docs`、`test`、`chore`、`release`）。
- commit 訊息不要加 `Co-Authored-By` 或任何 AI 署名行。
- 每完成一個明確的小步驟就 commit，方便回溯。

## 五、其他

- `CLAUDE.md` 為舊的規則檔（Claude Code 用），保留但不再維護，規則以 `AGENTS.md` 為準。
