# Shift Scheduler v2

介護施設向けの高度なシフト管理システム

## 特徴

- 🤖 **AI自動シフト生成**: OpenAI/Anthropic APIを使用した制約充足型シフト生成
- 📱 **スマホ最適化**: 職員側はスマホから希望休入力・シフト確認が可能
- 🔄 **ワークフロー管理**: 仮確定 → 変更提案 → 確定の段階的シフト確定
- 📦 **5年間アーカイブ**: 過去シフトをPDF化してクラウドストレージに保管
- 📊 **統計・レポート**: 月間勤務時間、夜勤回数の推移を可視化
- 🔔 **通知機能**: メール・Web Pushで仮確定・確定シフトを通知

## 技術スタック

- **Frontend**: React 19 + Vite + Tailwind CSS 4 + shadcn/ui
- **Backend**: Express 4 + tRPC 11
- **Database**: MySQL (PlanetScale/TiDB) + Drizzle ORM
- **AI**: OpenAI API / Anthropic API
- **Storage**: Cloudflare R2 / AWS S3
- **Deployment**: Railway / Docker

## クイックスタート

### ローカル開発

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env
# .env を編集して必要な値を設定

# データベースマイグレーション
pnpm run db:push

# 開発サーバーの起動
pnpm dev
```

ブラウザで `http://localhost:3000` にアクセス。

### 本番デプロイ

詳細は [デプロイガイド](./docs/DEPLOY_GUIDE.md) を参照してください。

**必要なサービス:**
- GitHub（コード管理）
- Railway（アプリ実行）
- PlanetScale（MySQL）
- OpenAI（AI生成）

**任意のサービス:**
- Cloudflare R2（ストレージ）
- Resend（メール通知）

## プロジェクト構成

```
shift-scheduler-v2/
├── client/              # フロントエンド（React + Vite）
│   ├── src/
│   │   ├── pages/      # ページコンポーネント
│   │   └── components/ # 再利用可能なコンポーネント
│   └── public/          # 静的ファイル
├── server/              # バックエンド（Express + tRPC）
│   ├── _core/          # コア機能（auth, llm, など）
│   ├── routers/        # tRPC ルーター
│   └── services/       # ビジネスロジック（email, storage）
├── drizzle/             # データベーススキーマ
├── scripts/             # ユーティリティスクリプト（seed, cron）
├── docs/                # ドキュメント
├── Dockerfile           # Docker設定
├── docker-compose.yml   # ローカル開発用
└── .github/workflows/   # CI/CD設定
```

## 環境変数

`.env.example` を参照してください。主要な変数：

```env
# 必須
DATABASE_URL=mysql://...
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...

# 任意
S3_BUCKET=...
RESEND_API_KEY=...
```

## 開発コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # 本番ビルド
pnpm start        # 本番サーバー起動
pnpm check        # 型チェック
pnpm test         # テスト実行
pnpm db:push      # データベースマイグレーション
pnpm seed         # 初期データ投入
pnpm cron:run     # 月次ワークフロー実行
```

## ライセンス

MIT

## サポート

問題が発生した場合は、[Issues](https://github.com/YOUR_USERNAME/shift-scheduler-v2/issues) で報告してください。
