# 新セッション用 初回指示文

以下の指示文を**そのままコピー&ペースト**して、新しいClaude Codeセッションを開始してください。

---

## 📋 コピー開始（ここから）

```
シフトスケジューラーアプリケーションのPhase 3（APIエンドポイント実装）を進めてください。

## 📂 プロジェクト情報
- 作業ディレクトリ: /mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2
- 引き継ぎドキュメント: HANDOFF_PHASE3.md（必読）
- 必要な権限リスト: PERMISSIONS_NEEDED.md（参照）

## ✅ 完了済み作業（Phase 1-2）
1. UI/UX統合完了 - 新しいReact UIを完全に統合済み
2. データベーススキーマ拡張完了 - 4テーブル拡張・追加、マイグレーション適用済み（Aiven MySQL本番環境）
3. 本番版切り替え確認完了 - App.tsx（デモ版）とApp.production.tsx（本番版）の違いを確認済み

## 🎯 Phase 3 の目標
以下を順番に実装してください:

### 1. 環境変数設定
- OpenAI APIキーを.envに追加（私から提供します）
- JWTシークレットを生成・追加

### 2. 認証API実装
- POST /api/auth/employee/login（職員ログイン: employeeId + email）
- POST /api/auth/admin/login（管理者ログイン: email + password）
- POST /api/auth/logout
- GET /api/auth/me
- JWTトークン生成・検証ミドルウェア

### 3. 希望休API実装
- POST /api/leave-requests（希望休作成）
- PUT /api/leave-requests/:id（希望休更新）
- DELETE /api/leave-requests/:id（希望休削除）
- GET /api/leave-requests（希望休一覧取得）
- 通常希望休 vs 追加希望休の区別
- 時間指定希望休の処理

### 4. シフトAPI実装
- POST /api/shifts（シフト新規作成）
- POST /api/shifts/:id/generate-ai（AI自動生成）
- PUT /api/shifts/:id/publish-tentative（仮確定公開）
- PUT /api/shifts/:id/confirm（本確定）
- GET /api/shifts（シフト一覧取得）
- GET /api/shifts/:id（シフト詳細取得）
- 6段階ステータス管理（draft → tentative → tentative_revised → confirmed → actual → archived）

### 5. AI自動生成機能実装
- OpenAI API統合（gpt-4o-mini使用）
- シフト自動生成プロンプト作成
- 制約条件の読み込み（workplaceRules, employeeConstraints, requiredStaffing）
- レスポンスのパース＆DB保存（shifts.aiPrompt, shifts.aiResponse）

### 6. フロントエンド統合
- client/src/services/authService.ts の実装（現在モック）
- client/src/services/leaveRequestService.ts の実装（現在モック）
- client/src/services/shiftService.ts の実装（現在モック）

### 7. 統合テスト
- 職員ログイン → 希望休作成フロー
- 管理者ログイン → シフト作成 → AI生成フロー
- 仮確定 → 追加希望受付 → 本確定フロー

## 📚 重要なドキュメント
実装前に以下を必ず参照してください:
1. HANDOFF_PHASE3.md - 全体の引き継ぎ情報
2. C:\Users\kinyu\Desktop\shift-scheduler\UI_UX Design Guide\README_FOR_BACKEND.md - バックエンド要件
3. C:\Users\kinyu\Desktop\shift-scheduler\UI_UX Design Guide\API_REQUIREMENTS.md - API仕様
4. C:\Users\kinyu\Desktop\shift-scheduler\UI_UX Design Guide\AI_GENERATION_GUIDE.md - AI生成ガイド
5. drizzle/schema.ts - データベーススキーマ

## 🚨 重要な制約
- 本番データベース（Aiven MySQL）に接続しています。慎重に作業してください。
- AI生成はChatGPT 4 mini（gpt-4o-mini）を使用してください。
- 認証はJWTトークンを使用（simple_auth_token / admin_auth_token）
- 6段階ステータスフローを厳密に守ってください

## 🔧 技術スタック
- フロントエンド: React 19, TypeScript, Vite 7, Tailwind CSS 4, shadcn/ui
- バックエンド: Express.js, Drizzle ORM, MySQL
- AI: OpenAI API (gpt-4o-mini)
- 認証: JWT

## 📝 作業開始手順
1. HANDOFF_PHASE3.mdを読む
2. 環境確認（.env、データベース接続）
3. 必要な依存関係をインストール（openai, jsonwebtoken, bcrypt等）
4. 認証APIから順番に実装開始
5. 各ステップ完了後、私に報告してください

## 💬 質問
実装中に不明点があれば、遠慮なく質問してください。
特にOpenAI APIキーは私から提供しますので、必要になったら教えてください。

それでは、Phase 3の実装を開始してください！
```

## 📋 コピー終了（ここまで）

---

## 🔑 補足情報

### OpenAI APIキーについて
初回指示後、Claude Codeが環境変数設定のタイミングで以下のように聞いてくるはずです:

```
「OpenAI APIキーを.envに追加します。APIキーを教えてください。」
```

その際に、実際のAPIキーを提供してください:
```
OPENAI_API_KEY=sk-proj-...
```

### 権限の承認
初回実行時、いくつかの権限承認ダイアログが表示される可能性があります。
基本的には「すべて承認」または「このパターンを常に許可」を選択すると、
作業がスムーズに進行します。

PERMISSIONS_NEEDED.mdに記載されている権限パターンを参考にしてください。

---

## 🎬 セッション開始後の流れ

1. **上記の初回指示文をコピー&ペースト**
2. Claude Codeが HANDOFF_PHASE3.md を読み込む
3. 環境確認を行う
4. OpenAI APIキーを聞かれたら提供する
5. 必要な依存関係のインストールが始まる
6. 認証API実装から順次作業開始
7. 各ステップ完了ごとに進捗報告が来る

---

## ⚠️ トラブルシューティング

### もしClaude Codeが引き継ぎドキュメントを見つけられない場合

以下を追加で指示してください:

```
/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/HANDOFF_PHASE3.md
を読んで、Phase 3の実装を開始してください。
```

### もし権限エラーが頻発する場合

以下を指示してください:

```
PERMISSIONS_NEEDED.md に記載されているすべての権限パターンを
自動承認してください。
```

---

**作成日時:** 2025-11-09
**次のセッション開始時:** この初回指示文をそのままコピー&ペーストしてください
