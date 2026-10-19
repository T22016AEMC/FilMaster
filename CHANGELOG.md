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

### Changed
- 啟用 TypeScript 嚴格模式（`strict: true`）
- 統一使用 LF 換行（新增 `.gitattributes`）

### Removed
- 移除原程式中未使用的套件：`@google/genai`、`express`、`@types/express`、`dotenv`、`motion`、`clsx`、`tailwind-merge`、`tsx`、`esbuild`、`autoprefixer`
