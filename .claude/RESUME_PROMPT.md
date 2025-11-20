# 新規セッション用プロンプト

新しい会話セッションを開始する際は、以下のプロンプトを使用してください：

---

## プロンプト

```
このプロジェクトは Shift Scheduler V2 というシフトスケジューリングシステムです。
以下のファイルを読み込んで、プロジェクトの完全なコンテキストを理解してください：

1. .claude/PROJECT_CONTEXT.md - プロジェクト全体の概要、技術スタック、アーキテクチャ
2. package.json - 依存関係とスクリプト
3. drizzle/schema.ts - データベーススキーマ
4. server/_core/index.ts - サーバーエントリーポイント
5. server/routers.ts - API エンドポイント定義

これらを読み込んだら、現在のプロジェクト状態を簡潔に要約してください。
```

---

## 使用方法

1. 新しい Claude Code セッションを開始
2. 上記のプロンプトをコピー&ペースト
3. Claude が自動的にファイルを読み込み、コンテキストを理解します
4. その後、通常通り作業を継続できます

## 追加の読み込みが必要な場合

特定の機能に関する作業を行う場合は、以下の追加ファイルも読み込んでください：

### 認証関連
- `server/simpleAuth.ts` - 職員認証（職員IDまたはメールアドレスのみ）
- `server/adminAuth.ts` - 管理者認証（メールのみ、パスワードレス）
- `server/_core/context.ts`

### データベース関連
- `server/db.ts`
- `drizzle/migrations/*.sql`

### LLM 機能
- `server/employeeDataStructurer.ts`
- `server/_core/llm.ts`

### PDF 生成
- `server/pdfGenerator.ts`

### エラーハンドリング・監査
- `server/_core/errors.ts`
- `server/_core/audit.ts`

## 環境情報

- **プロジェクトディレクトリ**: `/home/kinyu000/shift-scheduler-v2`
- **Git リポジトリ**: `git@github.com:goodmonk06/shift-scheduler-v2.git`
- **Railway デプロイ URL**: https://shift-scheduler-v2-production.up.railway.app
- **データベース**: Aiven MySQL (環境変数 `DATABASE_URL` で接続)

## 最後の作業内容

最後のセッションでは以下の改善を実装しました：

1. **トランザクションサポート** - データ整合性の保証
2. **カスタムエラークラス** - 包括的なエラーハンドリング
3. **監査ログシステム** - コンプライアンス対応の操作記録

コミット: `eb469f7` "Add transaction support, custom error classes, and audit logging"

全ての変更は GitHub にプッシュ済みで、Railway が自動デプロイしています。
