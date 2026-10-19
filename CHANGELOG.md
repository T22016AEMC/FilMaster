# Changelog

本專案的所有重要變更都記錄在此檔案。

格式依據 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，
版本號遵循 [語意化版本](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Added
- 建立重建專案環境（階段 0）：專案資料夾、`_legacy` 原始程式參考、git 儲存庫、`.gitignore`、`CHANGELOG.md`、`CLAUDE.md`
- 建立專案骨架（階段 1）：React 19 + Vite 6 + TypeScript + Tailwind CSS 4 + Vitest，含最小佔位頁面與版本號測試
- 以 `__APP_VERSION__` 在建置時注入 `package.json` 的版本號
- 搬移計算核心（階段 2）：`types.ts`、`utils/meyerhofer.ts`、`utils/resinConfigs.ts`、`utils/customCurves.ts`，內容與原版完全相同
- 建立 golden fixture（`src/utils/__fixtures__/legacy-golden.json`），鎖定原版對 9 個預設情境與 2 條預設自訂曲線的計算結果
- 建立計算核心單元測試（`meyerhofer.test.ts`）：golden 比對、SOC 官方範例驗算、數學性質、現行已知問題的行為記錄
- 建立自訂曲線儲存單元測試（`customCurves.test.ts`）

- 計算核心警告機制（階段 3）：新增 `WarningCode`、`PredictionWarning`；`CalibrationResult` 與 `PredictionResult` 新增 `warnings`，`CalibrationResult` 另新增 `fittedAlpha`；匯出常數 `ALPHA_FIT_MIN`、`ALPHA_FIT_MAX`、`SOLIDS_MAX`
- `MeasuredPoint` 新增選填欄位 `spinSpeed`、`spinTime`（僅資料結構，計算不使用；舊資料沒有這兩個欄位仍可正常讀取與計算）
- 報告（`generateStructuredReport`）在有警告時附加「4. 【警告事項】」區段，CSV（`generateCSV`）在有警告時於檔頭加上 `# Warning:` 行；沒有警告時輸出與原版完全相同
- `legacy-report-golden.json`：鎖定原版報告與 CSV 文字輸出的 golden fixture
- `CLAUDE.md` 新增規則：localStorage 鍵名 `spin_coating_custom_calibrated_curves_v2` 不可變更
- 介面元件搬移（階段 4）：`App.tsx` 與 9 個元件自原版搬入，外觀、排版、配色與互動維持原樣
- `WarningPanel`：有計算警告時在預測摘要上方以琥珀色警示框逐條顯示；固含量超出範圍的數值旁加上警示圖示，頂部狀態列顯示警告標記與數量
- 實測點記錄量測條件：新增實測點自動帶入當下轉速與時間、預設情境的實測點帶入該情境條件，列表以小字顯示（舊資料顯示「—」）；儲存校正曲線時一併存入
- 匯入校正曲線後顯示「成功匯入 N 筆」，並列出每筆被略過的名稱（或第幾筆）與原因
- 數值輸入防呆：轉速、時間、目標膜厚、容差輸入無效（空白、非數字、≤ 0）時，輸入框保留輸入內容並以紅框與「請輸入大於 0 的數值」提示，計算維持上一次有效結果，失焦後恢復有效值
- `useFilMasterState` hook：App 的狀態與處理函式集中於 `src/hooks/useFilMasterState.ts`
- 介面測試（`@testing-library/react`、`@testing-library/user-event`、`jsdom`）

### Changed
- Header 與頁尾的「FilmMaster Studio」改為「FilMaster」，頁尾與 Header 徽章顯示版本號（取自 `package.json`）；「AI Studio 報告」改為中性的「結構化報告」，FormulaModal 第四節標題改為「AI 助理 System Instructions」
- 所有顯示 R² 的地方（預測摘要、校正管理、已存曲線列表）在 R² 不適用時改顯示「不適用」並附原因（單點校正／未採用擬合／理論模式），移除「1.0000 (Exact)」
- 儲存校正曲線改由 props 取得目前的實測點，不再使用 `window.__lastMeasuredPoints` 全域變數
- 啟用 TypeScript 嚴格模式（`strict: true`）
- 統一使用 LF 換行（新增 `.gitattributes`）
- `importCurvesFromJSON` 改為回傳 `{ curves, importedCount, skipped }`；不再靜默略過不合格項目，改為逐筆驗證並在 `skipped` 寫明原因（繁體中文）
- 匯入錯誤訊息改為具體說明：「檔案不是有效的 JSON 格式」、「JSON 內容必須是校正曲線陣列」
- 匯入時缺少的 `createdAt`、`scaleFactor`、`rSquared` 會補上預設值；同一份檔案內重複的 id 也會改名
- 匯入時只有 `importedCount > 0` 才寫入 localStorage

### Fixed
- 多點擬合的 α 因超出範圍而改回基準值時，`rSquared` 改為 `null`（此時 R² 描述的是被捨棄的擬合，不代表實際採用的曲線）
- 匯入校正曲線失敗時，錯誤訊息原本只在「列表」頁籤顯示，從「儲存」頁籤匯入會看不到；現在會自動切換到列表頁籤
- 單點校正的 `rSquared` 由 1.0 改為 `null`（單點必然通過該點，R² 沒有意義）
- 多個實測點固含量全相同時，`rSquared` 由 1.0 改為 `null`，並加入 `FIT_DEGENERATE` 警告（計算方式不變）
- 多點擬合的 α 超出 0.05～4.0 時不再靜默改回基準值，改為加入 `ALPHA_OUT_OF_RANGE` 警告並以 `fittedAlpha` 記錄實際擬合值
- 反算固含量（建議值、下限、上限）不是有限數值、≤ 0 或 > 100 wt% 時加入 `SOLIDS_OUT_OF_RANGE` 警告（數值照常回傳）

### Removed
- 移除原程式中未使用的套件：`@google/genai`、`express`、`@types/express`、`dotenv`、`motion`、`clsx`、`tailwind-merge`、`tsx`、`esbuild`、`autoprefixer`
