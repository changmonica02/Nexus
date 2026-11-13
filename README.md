# Nexus

Nexus 是整合學習、知識與創作工具的模組化 Web 專案，採用 Next.js、React、TypeScript 與 Supabase。

## 本地開發

```bash
npm install
npm run dev
```

常用命令：`npm run build`、`npm run lint`。測試位於 `tests/`。正式連線需要依環境配置變數，不要提交金鑰。

## 專案文件

| 文件 | 職責 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Codex 開發規則與文件更新規範 |
| [docs/SPEC.md](docs/SPEC.md) | 產品應具備的行為與功能 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技術架構與資料結構 |
| [docs/HISTORY.md](docs/HISTORY.md) | 重要變更、原因與設計決策 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 目前狀態、待確認事項、下一步 |

任務追蹤使用 GitHub Issues，變更審核使用 Pull Requests。現行產品契約以 SPEC 為準；技術與正式 Migration 狀態以 ARCHITECTURE／HANDOFF 配合實際 GitHub、Supabase 核對。HISTORY 記錄當時成果，不能將歷史的 Draft／待套用敘述當成現況；自動化測試成功亦不等於真人裝置驗收完成。
