# 新セッションで必要な権限リスト

## 📋 必須権限

新しいClaude Codeセッションを開始する際、以下の権限を事前に許可してください。
これにより、作業を中断することなく自律的にPhase 3を進行できます。

---

## 🔧 Bashコマンド権限

### 環境変数確認
```
Bash(cat .env)
Bash(cat .env | grep OPENAI)
Bash(cat .env | grep DATABASE)
```

### ファイル確認・検索
```
Bash(ls -la server/routes)
Bash(ls -la client/src/services)
```

### npm/pnpmコマンド
```
Bash(pnpm install openai)
Bash(pnpm install jsonwebtoken)
Bash(pnpm install bcrypt)
Bash(pnpm install @types/jsonwebtoken)
Bash(pnpm install @types/bcrypt)
```

### サーバー再起動
```
Bash(pkill -f "pnpm dev")
Bash(pnpm dev)
```

### TypeScript実行（テスト用）
```
Bash(npx tsx scripts/test-auth.ts)
Bash(npx tsx scripts/test-openai.ts)
```

### Git操作（バックアップ用）
```
Bash(git status)
Bash(git diff)
Bash(git add .)
Bash(git commit -m "Phase 3: Implement API endpoints")
```

---

## 📂 ファイル操作権限

### 読み取り権限（Read）
以下のパスパターンすべてに読み取り権限が必要:

```
Read(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/**)
Read(/mnt/c/Users/kinyu/Desktop/shift-scheduler/UI_UX Design Guide/**)
```

特に重要なファイル:
- `drizzle/schema.ts` (DBスキーマ確認)
- `server/index.ts` (サーバーエントリポイント)
- `server/routes.ts` (既存ルート確認)
- `.env` (環境変数確認)
- `client/src/services/*.ts` (サービス実装確認)

### 書き込み権限（Write, Edit）
以下のファイルに書き込み権限が必要:

#### 新規作成するファイル
```
server/routes/auth.ts
server/routes/leave-requests.ts
server/routes/shifts.ts
server/middleware/auth.ts
server/utils/jwt.ts
server/utils/openai.ts
client/src/services/authService.ts (既存を上書き)
client/src/services/leaveRequestService.ts (既存を上書き)
client/src/services/shiftService.ts (既存を上書き)
scripts/test-auth.ts (テスト用)
scripts/test-openai.ts (テスト用)
```

#### 既存ファイルの編集
```
server/index.ts (ルート追加)
.env (OpenAI APIキー追加)
package.json (依存関係追加の可能性)
```

---

## 🌐 外部API権限

### OpenAI API
```
WebFetch(domain:api.openai.com)
```
- ChatGPT 4 mini APIへのリクエスト
- プロンプト送信とレスポンス取得

### Railway（デプロイ環境）
```
WebFetch(domain:railway.app)
```
- 環境変数設定の確認（必要に応じて）

---

## 🔍 検索・探索権限

### Grep（コード検索）
```
Grep(pattern:authService, path:client/src)
Grep(pattern:tRPC, path:server)
Grep(pattern:OpenAI, path:*)
```

### Glob（ファイル検索）
```
Glob(pattern:**/*.ts, path:server)
Glob(pattern:**/*Service.ts, path:client/src)
```

---

## 🚀 自動承認推奨コマンド

以下のコマンドは自動承認しておくと作業がスムーズです:

```typescript
// 既に承認済みの権限（前セッションから）
Bash(mkdir:*)
Bash(npm install:*)
Bash(pnpm install:*)
Bash(git add:*)
Bash(git commit:*)
Bash(pkill:*)
Bash(cat:*)
Bash(ls:*)
Read(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/**)

// 追加で承認が必要な権限（Phase 3用）
Bash(npx tsx:*)
Bash(node:*)
Write(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/server/**)
Write(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/client/src/services/**)
Write(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/scripts/**)
Edit(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/server/**)
Edit(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/client/src/services/**)
```

---

## ⚙️ 設定ファイル編集

### .envファイル
以下の環境変数追加が必要になる可能性があります:

```bash
# OpenAI API
OPENAI_API_KEY=sk-...  # ユーザーに確認

# JWT Secret（自動生成）
JWT_SECRET=<ランダム生成される>

# Refresh Token Secret（自動生成）
REFRESH_TOKEN_SECRET=<ランダム生成される>
```

---

## 📝 事前準備チェックリスト

新セッション開始前に、ユーザーが準備すること:

- [ ] OpenAI APIキーを取得（https://platform.openai.com/api-keys）
- [ ] Claude Codeで新しいセッションを開始
- [ ] 後述の「完璧な初回指示文」をコピペ
- [ ] 必要に応じて権限を承認（初回のみ）

---

## 🎯 権限設定の最適化

Claude Codeの設定画面で、以下のパターンを事前に許可リストに追加しておくと、
作業が中断されずにスムーズに進行します:

**設定 → セキュリティ → 自動承認パターン:**

```
Bash(pnpm *)
Bash(npx tsx *)
Bash(cat *)
Bash(ls *)
Read(/mnt/c/Users/kinyu/Desktop/shift-scheduler/**)
Write(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/server/**)
Write(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/client/src/services/**)
Write(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/scripts/**)
Edit(/mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2/**)
```

---

**作成日時:** 2025-11-09
**次のセッション開始時:** この権限リストを参照して許可設定してください
