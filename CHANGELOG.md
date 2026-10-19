# Changelog

本專案的所有重要變更都記錄在此檔案。

格式依據 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，
版本號遵循 [語意化版本](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Added
- 建立重建專案環境（階段 0）：專案資料夾、`_legacy` 原始程式參考、git 儲存庫、`.gitignore`、`CHANGELOG.md`、`CLAUDE.md`
- 建立專案骨架（階段 1）：React 19 + Vite 6 + TypeScript + Tailwind CSS 4 + Vitest，含最小佔位頁面與版本號測試
- 以 `__APP_VERSION__` 在建置時注入 `package.json` 的版本號

### Changed
- 啟用 TypeScript 嚴格模式（`strict: true`）
- 統一使用 LF 換行（新增 `.gitattributes`）

### Removed
- 移除原程式中未使用的套件：`@google/genai`、`express`、`@types/express`、`dotenv`、`motion`、`clsx`、`tailwind-merge`、`tsx`、`esbuild`、`autoprefixer`
