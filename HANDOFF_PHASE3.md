# Phase 3 引き継ぎドキュメント

## 🎯 現在の状態

### ✅ 完了した作業（Phase 1-2）

1. **UI/UX統合完了** (Phase 1)
   - `C:\Users\kinyu\Desktop\shift-scheduler\UI_UX Design Guide` の全ファイルを統合
   - `client/src/` を完全に新UIに置き換え
   - vite.config.ts、index.html、server/_core/vite.ts のパス修正完了
   - 開発サーバーで新UI正常動作確認済み（http://localhost:5000）

2. **データベーススキーマ拡張完了** (Phase 2)
   - LeaveRequestテーブル拡張: `leaveType`, `startTime`, `endTime`, `isAdditional` 追加
   - Shiftテーブル拡張: 6段階status、`leaveRequestDeadline`, `additionalRequestDeadline`, `aiPrompt`, `aiResponse` 追加
   - ShiftActualテーブル新規作成: 実績報告機能用
   - StaffSettingsテーブル新規作成: 職員カスタマイズ設定用
   - マイグレーション実行完了: `drizzle/0009_motionless_magdalene.sql` 適用済み（Aiven MySQL本番DB）

3. **本番版切り替え確認完了**
   - `App.tsx` (デモ版・タブ切り替え) と `App.production.tsx` (本番版・認証フロー) の違いを確認
   - 本番版へはファイル名変更のみで切り替え可能

### 🔄 次のフェーズ（Phase 3）: APIエンドポイント実装

**実装が必要な14のAPIエンドポイント:**

#### 認証関連
1. `POST /api/auth/employee/login` - 職員ログイン（簡易認証）
2. `POST /api/auth/admin/login` - 管理者ログイン
3. `POST /api/auth/logout` - ログアウト
4. `GET /api/auth/me` - 現在のユーザー情報取得

#### 希望休関連（職員側）
5. `POST /api/leave-requests` - 希望休作成
6. `PUT /api/leave-requests/:id` - 希望休更新
7. `DELETE /api/leave-requests/:id` - 希望休削除
8. `GET /api/leave-requests` - 希望休一覧取得

#### シフト関連（管理者側）
9. `POST /api/shifts` - シフト新規作成
10. `POST /api/shifts/:id/generate-ai` - AI自動生成
11. `PUT /api/shifts/:id/publish-tentative` - 仮確定公開
12. `PUT /api/shifts/:id/confirm` - 本確定
13. `GET /api/shifts` - シフト一覧取得
14. `GET /api/shifts/:id` - シフト詳細取得

---

## 📋 Phase 3 実装チェックリスト

### ステップ1: 環境変数設定
- [ ] OpenAI APIキーを`.env`に追加
- [ ] Railway環境変数に`OPENAI_API_KEY`を設定

### ステップ2: 認証API実装
- [ ] `server/routes/auth.ts` 作成
- [ ] 職員ログイン（employeeId + email）
- [ ] 管理者ログイン（email + password）
- [ ] JWTトークン生成
- [ ] 認証ミドルウェア作成

### ステップ3: 希望休API実装
- [ ] `server/routes/leave-requests.ts` 作成
- [ ] CRUD操作実装
- [ ] 通常希望休 vs 追加希望休の区別
- [ ] 時間指定希望休の処理

### ステップ4: シフトAPI実装
- [ ] `server/routes/shifts.ts` 作成
- [ ] 6段階ステータス管理
- [ ] 締め切り日時管理
- [ ] シフト詳細（shiftDetails）の関連処理

### ステップ5: AI自動生成機能実装
- [ ] OpenAI API統合（ChatGPT 4 mini）
- [ ] プロンプト生成ロジック
- [ ] 制約条件の読み込み（workplaceRules, employeeConstraints, requiredStaffing）
- [ ] レスポンスのパース＆DB保存

### ステップ6: フロントエンド統合
- [ ] `authService.ts` の実装（現在はモック）
- [ ] `leaveRequestService.ts` の実装
- [ ] `shiftService.ts` の実装
- [ ] エラーハンドリング

### ステップ7: 統合テスト
- [ ] 職員ログイン → 希望休作成フロー
- [ ] 管理者ログイン → シフト作成 → AI生成フロー
- [ ] 仮確定 → 追加希望受付 → 本確定フロー

---

## 🗂️ 重要なファイルパス

### データベース関連
- スキーマ定義: `/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/drizzle/schema.ts`
- マイグレーション: `/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/drizzle/0009_motionless_magdalene.sql`

### フロントエンド
- メインApp（デモ版）: `/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/client/src/App.tsx`
- メインApp（本番版）: `/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/client/src/App.production.tsx`
- authService（要実装）: `/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/client/src/services/authService.ts`

### バックエンド
- サーバーエントリ: `/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/server/index.ts`
- 既存ルート例: `/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/server/routes.ts`

### ドキュメント
- バックエンド要件: `C:\Users\kinyu\Desktop\shift-scheduler\UI_UX Design Guide\README_FOR_BACKEND.md`
- API要件: `C:\Users\kinyu\Desktop\shift-scheduler\UI_UX Design Guide\API_REQUIREMENTS.md`
- AI生成ガイド: `C:\Users\kinyu\Desktop\shift-scheduler\UI_UX Design Guide\AI_GENERATION_GUIDE.md`

---

## 🔧 技術スタック

### フロントエンド
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- shadcn/ui (48 @radix-ui components)
- Recharts（グラフ）
- date-fns（日付処理）

### バックエンド
- Express.js
- tRPC 11（将来的に）
- Drizzle ORM
- MySQL (Aiven hosted)
- OpenAI API (gpt-4o-mini)

### 認証
- JWT (simple_auth_token / admin_auth_token)
- 職員: employeeId + email（簡易認証）
- 管理者: email + password

---

## 🚨 注意事項

1. **本番DBへの接続**
   - DATABASE_URL は Aiven MySQL を指している
   - SSL証明書: `rejectUnauthorized: false` が必要
   - 既にマイグレーション適用済みなので、スキーマは最新状態

2. **AI生成の制約**
   - ChatGPT 4 mini使用（コスト効率）
   - プロンプトとレスポンスは `shifts.aiPrompt`, `shifts.aiResponse` に保存
   - デバッグ用のログも重要

3. **6段階ステータスフロー**
   ```
   draft → tentative → tentative_revised → confirmed → actual → archived
   ```
   - `tentative`: 仮確定（職員に公開）
   - `tentative_revised`: 追加希望を反映して再生成
   - `confirmed`: 本確定（変更不可）
   - `actual`: 実績報告期間
   - `archived`: アーカイブ

4. **締め切り管理**
   - `leaveRequestDeadline`: 通常希望休の締め切り
   - `additionalRequestDeadline`: 仮確定後の追加希望締め切り

---

## 📝 既知の問題

### 解決済み
- ✅ Vite plugin compatibility (react-swc → react)
- ✅ ESM __dirname issue (fileURLToPath使用)
- ✅ Path mismatches (/client/src/main.tsx)
- ✅ Drizzle Kit migration errors (custom script作成)
- ✅ MySQL SSL certificate (rejectUnauthorized: false)

### 未解決（Phase 3で対応）
- ⚠️ authService.ts が現在モック実装
- ⚠️ leaveRequestService.ts が現在モック実装
- ⚠️ shiftService.ts が現在モック実装
- ⚠️ OpenAI API未統合

---

## 🎬 次のセッション開始時のアクション

1. **環境確認**
   ```bash
   cd /mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2
   cat .env | grep OPENAI  # OpenAI APIキー確認
   ```

2. **開発サーバー起動確認**
   ```bash
   pnpm dev  # 既に起動中かもしれない
   ```

3. **Phase 3 実装開始**
   - 認証API → 希望休API → シフトAPI → AI生成 の順で実装

---

## 🔑 必要な情報

### OpenAI APIキー
- ユーザーに確認が必要
- `.env` に `OPENAI_API_KEY=sk-...` として追加
- Railway環境変数にも同じ値を設定

### データベース接続
- 既に `.env` に設定済み（DATABASE_URL）
- Aiven MySQL接続確認済み

---

## 📊 進捗状況

```
Phase 1: UI/UX統合           ████████████████████ 100% ✅
Phase 2: DB拡張              ████████████████████ 100% ✅
Phase 3: API実装             ░░░░░░░░░░░░░░░░░░░░   0% 🔄 (次のセッション)
Phase 4: AI統合              ░░░░░░░░░░░░░░░░░░░░   0%
Phase 5: 統合テスト          ░░░░░░░░░░░░░░░░░░░░   0%
Phase 6: 本番デプロイ        ░░░░░░░░░░░░░░░░░░░░   0%
```

---

**作成日時:** 2025-11-09
**次のセッション開始時:** このファイルを必ず参照してください
