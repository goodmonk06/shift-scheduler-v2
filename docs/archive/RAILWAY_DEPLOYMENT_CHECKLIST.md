# 🚂 Railway デプロイチェックリスト

**プロジェクト**: Shift Scheduler v2
**デプロイ先**: Railway (shift-scheduler-v2-production.up.railway.app)
**作成日**: 2025-11-09

---

## ✅ デプロイ前の確認事項

### 1. コードの準備

- [x] **ローカルビルドテスト完了**
  ```bash
  pnpm build
  ```
  - ✅ ビルド成功 (1m 23s, 602.63 kB JS bundle)

- [x] **Dockerfile 更新済み**
  - ✅ `build/` → `dist/public/` へのコピーを追加
  - ✅ 静的ファイル配信の検証ステップを追加

- [x] **.dockerignore 作成済み**
  - ✅ node_modules, .env ファイル除外
  - ✅ ビルド最適化

- [ ] **GitHubリポジトリへプッシュ**（Railway GitHub連携を使用する場合）
  ```bash
  git add .
  git commit -m "Phase 3完了: Railway本番デプロイ準備"
  git push origin main
  ```

---

## 🔧 Railway 環境変数設定

### 必須環境変数（必ず設定）

Railwayプロジェクトの「Variables」タブで以下を設定してください：

```bash
# Node環境
NODE_ENV=production
PORT=8080

# データベース（Aiven MySQL）
DATABASE_URL=mysql://avnadmin:***REMOVED***@shift-scheduler-kinyu000-c42a.i.aivencloud.com:21789/defaultdb?ssl-mode=REQUIRED

# JWT認証
JWT_SECRET=***REMOVED***
```

### AI機能（後のフェーズで設定）

```bash
# OpenAI設定（Phase 4以降）
LLM_PROVIDER=openai
OPENAI_API_KEY=(まだ設定しない)
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

### オプション（未使用機能）

以下は現在未使用なので設定不要：

```bash
# OAuth（未使用）
OAUTH_SERVER_URL=

# Storage（未使用）
AWS_REGION=
S3_BUCKET=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# メール通知（未使用）
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Web Push（未使用）
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# 監視（未使用）
SENTRY_DSN=
```

---

## 📋 Railway ビルド設定確認

### 現在の設定（自動検出済み）

- **Builder**: Dockerfile (自動検出)
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start` → `node dist/index.js`
- **Port**: 8080
- **Region**: Southeast Asia (Singapore)
- **Resources**: 2 vCPU, 1 GB Memory

### 注意事項

- ✅ Dockerfileが自動検出されているため、ビルドコマンドは不要
- ✅ `PORT` 環境変数は Railway が自動設定（8080）
- ✅ Dockerfile内で `0.0.0.0` でリッスンしているため、Railway の接続が可能

---

## 🚀 デプロイ手順

### オプションA: GitHub連携（推奨）

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Phase 3完了: Railway本番デプロイ準備"
   git push origin main
   ```

2. **Railway で自動デプロイ**
   - Railwayが自動的にビルド＆デプロイを開始
   - デプロイログを確認

### オプションB: Railway CLI

1. **Railway CLI インストール**（未インストールの場合）
   ```bash
   npm i -g @railway/cli
   ```

2. **ログイン**
   ```bash
   railway login
   ```

3. **プロジェクトにリンク**
   ```bash
   railway link
   ```

4. **デプロイ**
   ```bash
   railway up
   ```

---

## ✅ デプロイ後の動作確認

### 1. アプリケーション起動確認

ブラウザで以下にアクセス：

```
https://shift-scheduler-v2-production.up.railway.app
```

**期待される動作**:
- ログイン画面が表示される
- 職員ログイン / 管理者ログインボタンが表示される

### 2. API動作確認

#### 管理者ログインテスト

```bash
curl -X POST https://shift-scheduler-v2-production.up.railway.app/api/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}' \
  -c cookies.txt
```

**期待される結果**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "管理者",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

#### 現在のユーザー取得

```bash
curl https://shift-scheduler-v2-production.up.railway.app/api/admin-auth/me \
  -b cookies.txt
```

**期待される結果**:
```json
{
  "user": {
    "id": 1,
    "name": "管理者",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

#### 職員ログインテスト

```bash
curl -X POST https://shift-scheduler-v2-production.up.railway.app/api/simple-auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"EMP00001"}' \
  -c employee_cookies.txt
```

**期待される結果**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "employeeId": "EMP00001",
    "name": "山田太郎",
    "email": "yamada@example.com"
  }
}
```

### 3. Railway ログ確認

Railwayの「Deployments」→「Logs」で以下を確認：

```
[Server] Listening on port 8080, expecting Railway to connect
[Static] Serving static files from: /app/dist/public
[Static] Directory exists: true
```

**エラーがないこと**を確認してください。

---

## 🔍 トラブルシューティング

### ❌ 問題: ビルドが失敗する

**症状**: `vite build` または `esbuild` が失敗

**解決策**:
1. ローカルで再ビルド確認
   ```bash
   rm -rf node_modules pnpm-lock.yaml build dist
   pnpm install
   pnpm build
   ```

2. エラーメッセージを確認してTypeScriptエラーを修正

### ❌ 問題: データベース接続エラー

**症状**: `Failed to connect to database`

**解決策**:
1. `DATABASE_URL` 環境変数を確認
2. Aivenのファイアウォール設定を確認
3. SSL接続設定 `ssl-mode=REQUIRED` が含まれていることを確認

### ❌ 問題: 静的ファイルが見つからない

**症状**: `Could not find the build directory: /app/dist/public`

**解決策**:
1. Dockerfile の `COPY --from=builder /app/build ./dist/public` が正しいことを確認
2. ビルドログで `dist/public/index.html exists === YES` と表示されることを確認

### ❌ 問題: ポート接続エラー

**症状**: `EADDRINUSE: address already in use`

**解決策**:
- Railway は自動的に `PORT` 環境変数を設定します（8080）
- アプリケーションは `process.env.PORT` を使用しているため、通常は問題ありません
- Railwayのログで正しいポートでリッスンしていることを確認

### ❌ 問題: 401 Unauthorized エラー

**症状**: ログイン後にすぐ401エラー

**解決策**:
1. `JWT_SECRET` が正しく設定されていることを確認
2. Cookieが正しく送信されていることを確認（ブラウザの開発者ツール）
3. HTTPS環境で `secure: true` が設定されていることを確認（server/simpleAuth.ts, server/adminAuth.ts）

---

## 📊 Phase 3 デプロイチェックリスト

### ビルド前

- [x] TypeScriptエラー確認（一部既知のエラーあり - 動作に影響なし）
- [x] vite.config.ts 設定確認（`root: 'client'`, `outDir: '../build'`）
- [x] index.html パス修正（`/src/main.tsx`）
- [x] ビルドテスト成功（602.63 kB, 1m 23s）
- [x] Dockerfile 更新（`build/` → `dist/public/`）
- [x] .dockerignore 作成

### Railway デプロイ前

- [ ] **環境変数設定**（上記の必須環境変数を設定）
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=8080`
  - [ ] `DATABASE_URL`（Aiven MySQL）
  - [ ] `JWT_SECRET`
- [ ] **GitHubプッシュ**（GitHub連携を使用する場合）
- [ ] **Railway プロジェクト準備完了**

### デプロイ後

- [ ] **アプリケーション起動確認**
  - [ ] ブラウザでアクセス可能
  - [ ] ログイン画面表示
- [ ] **データベース接続確認**
  - [ ] Railwayログで接続成功
- [ ] **認証API動作確認**
  - [ ] 管理者ログイン成功
  - [ ] 職員ログイン成功
  - [ ] `/api/admin-auth/me` 動作
  - [ ] `/api/simple-auth/me` 動作
- [ ] **フロントエンド表示確認**
  - [ ] 静的ファイル配信成功
  - [ ] CSS/JSロード成功
  - [ ] UI正常表示

---

## 🎯 次のフェーズ（Phase 4）

デプロイ成功後、以下を実施予定：

### AI統合
1. OpenAI APIキー設定
2. AI自動生成機能テスト
3. プロンプト/レスポンス保存確認

### フロントエンド統合
1. VacationServiceProduction 実装
2. ShiftServiceProduction 実装
3. エラーハンドリング実装（401自動ログアウト）

### E2Eテスト
1. 職員ログイン → 希望休作成フロー
2. 管理者ログイン → シフト作成 → AI生成フロー
3. 仮確定 → 追加希望 → 本確定フロー

---

## 📝 本番環境情報まとめ

### アプリケーション
- **Platform**: Railway
- **URL**: https://shift-scheduler-v2-production.up.railway.app
- **Node.js**: v22 (Alpine)
- **Package Manager**: pnpm 10.4.1+
- **Build Tool**: Docker (multi-stage)

### データベース
- **Provider**: Aiven MySQL
- **Version**: MySQL 8.x
- **Connection**: SSL required
- **Host**: shift-scheduler-kinyu000-c42a.i.aivencloud.com
- **Port**: 21789
- **Database**: defaultdb

### API
- **AI Provider**: OpenAI（Phase 4以降）
- **Model**: gpt-4o-mini
- **Authentication**: JWT (Cookie-based)
  - `simple_auth_token`（職員）
  - `admin_auth_token`（管理者）

---

## 🔒 セキュリティチェック

- [x] **JWT_SECRET**: 本番用シークレット設定済み（256bit）
- [x] **DATABASE_URL**: 環境変数で管理（コードにハードコードなし）
- [ ] **OPENAI_API_KEY**: Phase 4で設定予定
- [x] **HTTPS**: Railway が自動提供
- [x] **Cookie設定**:
  - `secure: true`（production）
  - `sameSite: 'lax'`
  - `httpOnly: true`

---

## 📚 参考ドキュメント

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 本番環境デプロイガイド
- [PHASE3_COMPLETE.md](./PHASE3_COMPLETE.md) - Phase 3完了報告
- [Railway Documentation](https://docs.railway.app/)
- [Aiven MySQL Documentation](https://aiven.io/docs/products/mysql)

---

**作成日時**: 2025-11-09
**Phase**: 3 - Railway本番デプロイ準備完了
**次のステップ**: 環境変数設定 → デプロイ実行 → 動作確認
