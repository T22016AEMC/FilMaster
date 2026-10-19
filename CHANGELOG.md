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

### Changed
- 啟用 TypeScript 嚴格模式（`strict: true`）
- 統一使用 LF 換行（新增 `.gitattributes`）
- `importCurvesFromJSON` 改為回傳 `{ curves, importedCount, skipped }`；不再靜默略過不合格項目，改為逐筆驗證並在 `skipped` 寫明原因（繁體中文）
- 匯入錯誤訊息改為具體說明：「檔案不是有效的 JSON 格式」、「JSON 內容必須是校正曲線陣列」
- 匯入時缺少的 `createdAt`、`scaleFactor`、`rSquared` 會補上預設值；同一份檔案內重複的 id 也會改名
- 匯入時只有 `importedCount > 0` 才寫入 localStorage

### Fixed
- 單點校正的 `rSquared` 由 1.0 改為 `null`（單點必然通過該點，R² 沒有意義）
- 多個實測點固含量全相同時，`rSquared` 由 1.0 改為 `null`，並加入 `FIT_DEGENERATE` 警告（計算方式不變）
- 多點擬合的 α 超出 0.05～4.0 時不再靜默改回基準值，改為加入 `ALPHA_OUT_OF_RANGE` 警告並以 `fittedAlpha` 記錄實際擬合值
- 反算固含量（建議值、下限、上限）不是有限數值、≤ 0 或 > 100 wt% 時加入 `SOLIDS_OUT_OF_RANGE` 警告（數值照常回傳）

### Removed
- 移除原程式中未使用的套件：`@google/genai`、`express`、`@types/express`、`dotenv`、`motion`、`clsx`、`tailwind-merge`、`tsx`、`esbuild`、`autoprefixer`
