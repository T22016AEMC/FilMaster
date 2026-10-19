# Changelog

本專案的所有重要變更都記錄在此檔案。

格式依據 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，
版本號遵循 [語意化版本](https://semver.org/lang/zh-TW/)。

## [Unreleased]

## [2.0.0] - 2026-10-19

FilMaster 重建版的第一個正式版本。以原本由 Google AI Studio 產生的 FilmMaster Studio 為基礎重新建立：計算邏輯與預設數值維持原版，另外補上測試、警告機制與多項修正，並改以 GitHub Pages 自動部署。

### Added
- **專案與部署**
  - 全新專案骨架：React 19 + Vite 6 + TypeScript（嚴格模式）+ Tailwind CSS 4 + Recharts，測試使用 Vitest 與 Testing Library
  - GitHub Actions 自動部署到 GitHub Pages（型別檢查與測試沒過就不會部署）
  - `README.md` 與 `CLAUDE.md`（專案規則與發布流程）
  - 建置時以 `__APP_VERSION__` 注入 `package.json` 的版本號，顯示於頁尾與 Header
- **計算警告機制**
  - 擬合 α 超出 0.05～4.0 時，改用基準 α 並顯示 `ALPHA_OUT_OF_RANGE` 警告，同時記錄實際擬合值（`fittedAlpha`）
  - 實測點固含量全相同、無法擬合時，顯示 `FIT_DEGENERATE` 警告
  - 反算固含量（建議值、下限、上限）不是有限數值、≤ 0 或 > 100 wt% 時，顯示 `SOLIDS_OUT_OF_RANGE` 警告（數值照常顯示）
  - 介面：預測摘要上方的琥珀色警示框、固含量數值旁的警示圖示、頂部狀態列的警告標記與數量
  - 結構化報告在有警告時附加「4. 【警告事項】」區段，CSV 在有警告時於檔頭加上 `# Warning:` 行
- **實測點記錄量測條件**：新增實測點自動帶入當下的轉速與時間，列表以小字顯示（舊資料顯示「—」），儲存校正曲線時一併存入；計算不使用這兩個欄位
- **匯入校正曲線**：逐筆驗證，匯入後顯示「成功匯入 N 筆」，並列出每筆被略過的名稱（或第幾筆）與原因
- **數值輸入防呆**：轉速、時間、目標膜厚、容差輸入無效（空白、非數字、≤ 0）時，輸入框保留輸入內容並以紅框與「請輸入大於 0 的數值」提示，計算維持上一次有效結果，失焦後恢復有效值
- **測試**：計算核心單元測試與原版 golden fixture 比對（鎖定原版對 9 個預設情境與 2 條預設曲線的計算結果、報告與 CSV 文字輸出）、自訂曲線儲存測試、介面測試

### Changed
- 名稱由 FilmMaster Studio 改為 FilMaster；「AI Studio 報告」改為中性的「結構化報告」，FormulaModal 第四節標題改為「AI 助理 System Instructions」
- 所有顯示 R² 的地方在 R² 不適用時改顯示「不適用」並附原因（單點校正／未採用擬合／理論模式），移除「1.0000 (Exact)」
- 「1 點測試範例」與「多點擬合範例」按鈕載入的實測點，記錄範例本身的量測條件（2000 rpm / 30 s）
- 儲存校正曲線改由 props 取得目前的實測點，不再使用 `window.__lastMeasuredPoints` 全域變數；App 的狀態與處理函式整理到 `useFilMasterState` hook
- 匯入時缺少的 `createdAt`、`scaleFactor`、`rSquared` 會補上預設值；同一份檔案內重複的 id 也會改名；只有實際匯入至少 1 筆時才寫入 localStorage
- 統一使用 LF 換行
- localStorage 鍵名 `spin_coating_custom_calibrated_curves_v2` 維持不變，既有的自訂曲線可繼續讀取

### Fixed
- 單點校正的 R² 原本固定為 1.0（沒有意義），改為不適用
- 實測點固含量全相同時，R² 原本固定為 1.0，改為不適用並加入警告
- 多點擬合的 α 超出範圍而被靜默改回基準值，現在會明確警告；此時 R² 描述的是被捨棄的擬合，不代表實際採用的曲線，因此改為不適用
- 反算固含量原本沒有任何範圍檢查，可算出超過 100 wt% 卻沒有任何提示
- 匯入校正曲線失敗或檔案格式錯誤時，錯誤訊息原本不具體，且從「儲存」頁籤匯入時看不到；現在訊息具體（「檔案不是有效的 JSON 格式」、「JSON 內容必須是校正曲線陣列」）並自動切換到可見的頁籤

### Removed
- 移除原程式中未使用的套件：`@google/genai`、`express`、`@types/express`、`dotenv`、`motion`、`clsx`、`tailwind-merge`、`tsx`、`esbuild`、`autoprefixer`
- 移除 AI Studio 專用的開發伺服器設定（`DISABLE_HMR`）與未使用的 `@` 路徑別名

[Unreleased]: https://github.com/T22016AEMC/FilMaster/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/T22016AEMC/FilMaster/releases/tag/v2.0.0
