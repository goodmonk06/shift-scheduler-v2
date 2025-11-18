# Shift Scheduler V2 - プロジェクトコンテキスト

## プロジェクト概要

シフトスケジューリングシステムの Web アプリケーション。職員の勤務条件、休暇管理、シフト作成を AI（LLM）を活用して効率化する。

### 技術スタック
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + tRPC
- **Database**: MySQL (Aiven Cloud)
- **ORM**: Drizzle ORM
- **AI/LLM**: OpenAI GPT-4o (via Azure)
- **Hosting**: Railway
- **認証**: SimpleAuth (職員用), AdminAuth (管理者用), OAuth (オプション)

## プロジェクト構造

```
shift-scheduler-v2/
├── client/              # React フロントエンド
│   ├── src/
│   │   ├── components/  # UI コンポーネント
│   │   ├── pages/       # ページコンポーネント
│   │   └── lib/         # ユーティリティ、tRPC クライアント
│   └── vite.config.ts
├── server/              # Node.js バックエンド
│   ├── _core/           # コアモジュール
│   │   ├── index.ts     # Express サーバーエントリーポイント
│   │   ├── env.ts       # 環境変数管理
│   │   ├── sdk.ts       # OAuth SDK
│   │   ├── llm.ts       # LLM 統合
│   │   ├── context.ts   # tRPC コンテキスト
│   │   ├── errors.ts    # カスタムエラークラス
│   │   ├── audit.ts     # 監査ログシステム
│   │   └── constants.ts # 共有定数
│   ├── db.ts            # データベース接続・操作
│   ├── routers.ts       # tRPC ルーター定義
│   ├── simpleAuth.ts    # 職員認証
│   ├── adminAuth.ts     # 管理者認証
│   ├── pdfGenerator.ts  # PDF 生成
│   ├── employeeDataStructurer.ts  # 職員データ構造化（LLM）
│   └── ...
├── drizzle/             # データベーススキーマ・マイグレーション
│   ├── schema.ts        # Drizzle スキーマ定義
│   └── migrations/      # SQL マイグレーションファイル
└── shared/              # フロントエンド・バックエンド共有型定義
```

## データベーススキーマ（主要テーブル）

### `users`
OAuth ユーザー（管理者など）

### `employees`
職員マスタ
- `additionalConstraints`: JSON フィールド（LLM で構造化された勤務制約）
- `positionGroupId`: 役職グループ外部キー

### `positionGroups`
役職グループマスタ（雇用形態、給与計算倍率など）

### `workTimeSlots`
勤務時間帯マスタ（例: 早番 09:00-14:00、遅番 14:00-20:00）

### `shifts`
シフト（月次単位）
- `year`, `month`: 対象年月
- `status`: draft, confirmed, published, archived
- `assignmentStrategy`: manual, ai_optimized

### `shiftDetails`
シフト詳細（日次・職員ごと）
- `shiftId`, `employeeId`, `date`
- `workTimeSlotId`: 勤務時間帯
- `status`: off, working, leave, holiday

### `leaveRequests`
休暇申請
- `employeeId`, `shiftId`, `startDate`, `endDate`
- `leaveType`: paid, birthday, seasonal_summer, seasonal_winter
- `status`: pending, approved, rejected

### `modificationRequests`
シフト変更申請
- 承認フロー付き

### `workplaceRules`
職場ルール（誕生日休暇、季節休暇の設定など）
- `ruleType`: birthday_leave, seasonal_leave
- `employmentType`: 対象雇用形態（all, fulltime, parttime）
- `ruleValue`: JSON フィールド

### `auditLogs`
監査ログ（全ての重要操作を記録）
- `actorUserId`, `action`, `target`, `meta`, `createdAt`

### `notifications`
通知

## 主要機能

### 1. 認証システム
- **AdminAuth** (`/api/admin-auth/login`): 管理者ログイン（メールのみ、パスワードレス）
- **SimpleAuth** (`/api/simple-auth/login`): 職員ログイン（メール + 誕生日）
- **OAuth**: オプション（OAUTH_SERVER_URL 設定時のみ有効）
- **レート制限**: 管理者 5回/15分、職員 10回/15分

### 2. 職員データ構造化（LLM）
`structureEmployeeData()` - `server/employeeDataStructurer.ts`
- 自然言語入力（例: "土日祝日休み、9-14時勤務"）を構造化データに変換
- 職場ルールと統合して休暇対象を自動判定
- `employees.additionalConstraints` に JSON として保存

### 3. シフト管理
- **作成**: 月次シフトを作成（手動 or AI 最適化）
- **編集**: シフト詳細の編集
- **承認**: draft → confirmed → published
- **PDF 生成**: シフト表を PDF でエクスポート

### 4. 休暇管理
- **休暇申請**: 職員が有給・誕生日休・季節休を申請
- **承認/却下**: 管理者が承認・却下
- **自動反映**: 承認された休暇を自動的にシフトに反映（トランザクション保証）

### 5. 通知システム
- 休暇申請の承認/却下通知
- シフト公開通知

### 6. PDF 生成
`generateShiftPDF()` - `server/pdfGenerator.ts`
- PDFKit を使用
- 月次シフト表を生成（職員別、日別）
- N+1 クエリ問題を解決済み（Map 構造で O(1) ルックアップ）

## API エンドポイント（tRPC）

### `shifts.*`
- `shifts.create`: シフト作成
- `shifts.getByYearMonth`: 年月でシフト取得
- `shifts.updateStatus`: ステータス更新
- `shifts.delete`: シフト削除

### `shiftDetails.*`
- `shiftDetails.updateBatch`: シフト詳細の一括更新

### `employees.*`
- `employees.getAll`: 全職員取得
- `employees.create`: 職員作成
- `employees.update`: 職員更新
- `employees.delete`: 職員削除
- `employees.structureData`: 自然言語から構造化データ生成（LLM）

### `leaveRequests.*`
- `leaveRequests.create`: 休暇申請
- `leaveRequests.approve`: 承認
- `leaveRequests.reject`: 却下
- `leaveRequests.getByEmployee`: 職員別取得
- `leaveRequests.getByShift`: シフト別取得

### `modificationRequests.*`
- シフト変更申請の CRUD

### `notifications.*`
- `notifications.getByRecipient`: 受信者別取得
- `notifications.markAsRead`: 既読

### その他
- `positionGroups.*`: 役職グループ管理
- `workTimeSlots.*`: 勤務時間帯管理
- `workplaceRules.*`: 職場ルール管理

## 環境変数

### 必須
- `DATABASE_URL`: MySQL 接続文字列
- `JWT_SECRET`: JWT 署名用シークレット（32文字以上推奨）

### 推奨
- `OWNER_OPEN_ID`: 自動管理者昇格用（OAuth 使用時）

### オプション
- `OAUTH_SERVER_URL`: OAuth サーバー URL（未設定時は OAuth 無効）
- `OPENAI_API_KEY`: OpenAI API キー（LLM 機能用）
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI エンドポイント
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API キー
- `AZURE_OPENAI_DEPLOYMENT`: Azure OpenAI デプロイ名
- `DEBUG`: デバッグログ有効化（'true' で有効）

## 最近の実装改善（2025年11月）

### セキュリティ
1. **環境変数検証** (`server/_core/env.ts`)
   - 必須変数（JWT_SECRET, DATABASE_URL）の検証
   - 推奨変数（OWNER_OPEN_ID）の警告

2. **レート制限** (`server/adminAuth.ts`, `server/simpleAuth.ts`)
   - 管理者ログイン: 5回/15分
   - 職員ログイン: 10回/15分

3. **入力バリデーション** (`server/routers.ts`)
   - 時刻形式（HH:MM）検証
   - 日付形式（YYYY-MM-DD）検証
   - 日付範囲検証

### パフォーマンス
1. **データベースインデックス** (`drizzle/0018_add_performance_indexes.sql`)
   - 15個のインデックスを追加
   - 主要クエリの高速化

2. **N+1 クエリ問題解決**
   - PDF 生成: O(n³) → O(n)（Map 構造使用）
   - 休暇申請処理: O(n*m) → O(1) + バッチ操作

3. **デバッグコード最適化**
   - DEBUG モード実装（環境変数で制御）
   - 本番環境でのログ出力削減

### コード品質
1. **コード重複削除** (`server/_core/constants.ts`)
   - 共有定数の一元管理
   - クッキー名、レート制限設定など

2. **未使用インポート削除**
   - LLM 関連コードを `_core/llm.ts` に集約

### データ整合性
1. **トランザクションサポート** (`server/db.ts`)
   - `withTransaction()` ヘルパー関数
   - 休暇申請の自動反映をトランザクション化
   - 原子性保証（全て成功 or 全て失敗）

2. **カスタムエラークラス** (`server/_core/errors.ts`)
   - 9種類のエラークラス
   - HTTP ステータスコードとコンテキスト情報を含む
   - エラーログの標準化

3. **監査ログシステム** (`server/_core/audit.ts`)
   - 全ての重要操作を記録
   - コンプライアンス対応
   - フェイルセーフ設計（監査エラーが本来の操作を妨げない）

## デプロイメント

### Railway
- **URL**: https://shift-scheduler-v2-production.up.railway.app
- **自動デプロイ**: GitHub main ブランチへの push で自動デプロイ
- **環境変数**: Railway ダッシュボードで設定

### データベース
- **Aiven MySQL**: クラウドホスティング
- **接続文字列**: `DATABASE_URL` 環境変数で設定
- **マイグレーション**: アプリ起動時に自動実行

## 開発コマンド

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev

# 型チェック
pnpm check

# ビルド
pnpm build

# 本番サーバー起動
pnpm start

# データベースマイグレーション生成
pnpm db:generate

# データベースマイグレーション適用
pnpm db:migrate
```

## 既知の制限事項

1. **管理者ログイン**: パスワード認証なし（メールのみ）
   - ユーザーは将来的に必要になるまで実装不要と明示

2. **OAuth**: オプション機能
   - `OAUTH_SERVER_URL` 未設定時は無効化される

3. **LLM 機能**: Azure OpenAI または OpenAI の API キーが必要
   - `employeeDataStructurer.ts` の自然言語処理機能

## トラブルシューティング

### Railway デプロイ時の警告
以下の警告は**正常な動作**であり、エラーではありません：

```
Without OWNER_OPEN_ID, no user will be automatically promoted to admin role.
⚠️  Warning: Recommended environment variables not set: OWNER_OPEN_ID
[OAuth] OAuth is disabled (OAUTH_SERVER_URL not configured)
[Migration] ⚠ Some tables already exist, skipping migration
```

### データベース接続エラー
- `DATABASE_URL` が正しく設定されているか確認
- Aiven データベースが起動しているか確認

### LLM 機能が動作しない
- `AZURE_OPENAI_*` または `OPENAI_API_KEY` が設定されているか確認
- API キーの有効期限を確認

## 次のステップ（未実装機能）

1. **AI シフト最適化**
   - `assignmentStrategy: "ai_optimized"` の実装
   - 職員の制約と職場ルールを考慮した自動シフト生成

2. **エラーハンドリングの統合**
   - カスタムエラークラスの全エンドポイントへの適用
   - エラーレスポンスの標準化

3. **監査ログの活用**
   - 管理画面での監査ログ表示
   - フィルタリング・検索機能

4. **通知機能の拡張**
   - メール通知
   - プッシュ通知

5. **パフォーマンス監視**
   - クエリパフォーマンスの継続的な監視
   - スロークエリの特定と最適化

## 重要な設計決定

1. **認証の多様性**: SimpleAuth（職員）、AdminAuth（管理者）、OAuth（オプション）の3つを並行運用
2. **LLM 活用**: 自然言語からの構造化データ生成で UX 向上
3. **トランザクション**: データ整合性を重視した設計
4. **フェイルセーフ**: 監査ログのエラーが本来の操作を妨げない設計
5. **型安全性**: TypeScript + Zod + tRPC で完全な型安全性

## コミット履歴（主要）

- `eb469f7`: Add transaction support, custom error classes, and audit logging
- `8e7a9f5`: Optimize performance and clean up codebase
- その前: Add critical security improvements and performance optimizations
