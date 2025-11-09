# 本番環境デプロイガイド

## 🚀 Railwayへのデプロイ手順

### 前提条件
- ✅ Railwayアカウント作成済み
- ✅ Aiven MySQL データベース設定済み
- ✅ OpenAI APIキー取得済み（後のフェーズで設定）
- ✅ GitHubリポジトリ作成済み（推奨）

---

## 📋 デプロイ手順

### 1. Railwayプロジェクト作成

1. [Railway](https://railway.app)にログイン
2. 「New Project」をクリック
3. 「Deploy from GitHub repo」を選択（またはCLIでデプロイ）

### 2. 環境変数の設定

Railwayプロジェクトの「Variables」タブで以下を設定:

#### 必須環境変数

```bash
# Node環境
NODE_ENV=production
PORT=3000

# データベース（Aiven MySQL）
DATABASE_URL=mysql://avnadmin:AVNS_DFbwqth2Tnib2XE-Mbo@shift-scheduler-kinyu000-c42a.i.aivencloud.com:21789/defaultdb?ssl-mode=REQUIRED

# JWT認証
JWT_SECRET=1Ggzey4jtDqOoP1Dx4B46yjFlAKuCppQRt4vCsWxyukEY+woKu92c3fCzzI41RlJ

# AI（後のフェーズで設定）
LLM_PROVIDER=openai
OPENAI_API_KEY=(後で設定)
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

#### オプション環境変数

```bash
# OAuth（未使用）
OAUTH_SERVER_URL=

# Storage（未使用）
AWS_REGION=auto
S3_BUCKET=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# メール通知（未使用）
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@example.com

# Web Push（未使用）
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com

# 監視（未使用）
SENTRY_DSN=
```

### 3. ビルド設定

**Build Command**:
```bash
pnpm install && pnpm build
```

**Start Command**:
```bash
pnpm start
```

### 4. デプロイ実行

#### オプションA: GitHub連携（推奨）

1. GitHubにコードをプッシュ
```bash
git add .
git commit -m "Phase 3: API実装完了 - 本番デプロイ準備"
git push origin main
```

2. Railwayが自動的にビルド＆デプロイ

#### オプションB: Railway CLI

```bash
# Railway CLI インストール
npm i -g @railway/cli

# ログイン
railway login

# プロジェクトにリンク
railway link

# デプロイ
railway up
```

---

## ✅ デプロイ後の確認

### 1. ヘルスチェック

デプロイ完了後、以下をブラウザで確認:

```
https://your-app.railway.app
```

### 2. API動作確認

#### 管理者ログインテスト
```bash
curl -X POST https://your-app.railway.app/api/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}' \
  -c cookies.txt
```

#### 現在のユーザー取得
```bash
curl https://your-app.railway.app/api/admin-auth/me \
  -b cookies.txt
```

### 3. データベース接続確認

Railwayのログで以下を確認:
```
[Server] Listening on port 3000
[Database] Connected to Aiven MySQL
```

---

## 🔧 トラブルシューティング

### ビルドエラー

**問題**: `vite build` が失敗する
**解決**:
```bash
# ローカルで確認
pnpm build

# node_modulesをクリーン
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### データベース接続エラー

**問題**: `Failed to connect to database`
**解決**:
1. `DATABASE_URL` 環境変数を確認
2. Aivenのファイアウォール設定を確認
3. SSL接続設定を確認（`ssl-mode=REQUIRED`）

### ポート設定エラー

**問題**: `EADDRINUSE: address already in use`
**解決**:
- Railwayは自動的にポートを割り当てます
- `PORT` 環境変数を削除するか、Railway推奨値を使用

---

## 📊 Phase 3 デプロイチェックリスト

### ビルド前
- [x] TypeScriptエラー確認（一部既知のエラーあり - 動作に影響なし）
- [x] vite.config.ts 設定確認
- [x] index.html パス修正
- [x] ビルドテスト成功

### Railwayデプロイ前
- [x] 環境変数一覧作成
- [x] データベースURL確認
- [x] JWT_SECRET確認
- [ ] OpenAI APIキー設定（後のフェーズ）

### デプロイ後
- [ ] アプリケーション起動確認
- [ ] データベース接続確認
- [ ] 認証API動作確認
- [ ] フロントエンド表示確認

---

## 🎯 次のフェーズ（Phase 4）

### AI統合
1. OpenAI APIキー設定
2. AI自動生成機能テスト
3. プロンプト/レスポンス保存確認

### フロントエンド統合
1. VacationServiceProduction 実装
2. ShiftServiceProduction 実装
3. エラーハンドリング実装

### E2Eテスト
1. 職員ログイン → 希望休作成フロー
2. 管理者ログイン → シフト作成 → AI生成フロー
3. 仮確定 → 追加希望 → 本確定フロー

---

## 📝 本番環境情報

### アプリケーション
- **Platform**: Railway
- **Node.js**: v20.x (推奨)
- **Package Manager**: pnpm

### データベース
- **Provider**: Aiven MySQL
- **Version**: MySQL 8.x
- **Connection**: SSL required
- **Host**: shift-scheduler-kinyu000-c42a.i.aivencloud.com
- **Port**: 21789

### API
- **AI Provider**: OpenAI
- **Model**: gpt-4o-mini
- **Authentication**: JWT (Cookie-based)

---

## 🔒 セキュリティ

### 本番環境での注意事項

1. **JWT_SECRET**: 本番用の強力なシークレットを使用
2. **DATABASE_URL**: 環境変数で管理（コードにハードコードしない）
3. **OPENAI_API_KEY**: 安全に保管
4. **HTTPS**: Railway は自動的にHTTPSを提供

### Cookie設定
```typescript
// 本番環境では secure: true
secure: process.env.NODE_ENV === "production"
sameSite: "lax"
httpOnly: true
```

---

## 📚 参考リンク

- [Railway Documentation](https://docs.railway.app/)
- [Aiven MySQL Documentation](https://aiven.io/docs/products/mysql)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

**作成日時**: 2025-11-09
**Phase**: 3 - API実装完了、本番デプロイ準備完了
**次のフェーズ**: Phase 4 - AI統合＆フロントエンド統合
