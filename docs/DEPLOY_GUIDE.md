# デプロイガイド

Shift Scheduler v2をGitHub + Railway + PlanetScaleで本番稼働させるための完全ガイドです。

---

## 📋 前提条件

以下のアカウントを準備してください：

1. **GitHub** アカウント
2. **Railway** アカウント（GitHub連携）
3. **PlanetScale** アカウント（MySQL互換DB）
4. **OpenAI** アカウント（API Key）
5. **Cloudflare** アカウント（R2ストレージ - 任意）
6. **Resend** アカウント（メール通知 - 任意）

---

## 🚀 デプロイ手順

### 1. GitHubリポジトリの作成

```bash
# ローカルでGitリポジトリを初期化
cd /path/to/shift-scheduler-v2
git init
git add .
git commit -m "Initial commit"

# GitHubでリポジトリを作成後、リモートを追加
git remote add origin https://github.com/YOUR_USERNAME/shift-scheduler-v2.git
git branch -M main
git push -u origin main
```

---

### 2. PlanetScale でデータベースを作成

1. [PlanetScale](https://planetscale.com/) にログイン
2. 新しいデータベースを作成（例: `shift-scheduler`）
3. **Connect** → **Create password** で接続情報を取得
4. `DATABASE_URL` をコピー（例: `mysql://USER:PASSWORD@HOST:3306/DB?ssl={"rejectUnauthorized":true}`）

---

### 3. OpenAI API Keyの取得

1. [OpenAI Platform](https://platform.openai.com/) にログイン
2. **API Keys** → **Create new secret key** で作成
3. `OPENAI_API_KEY` をコピー（例: `sk-...`）

---

### 4. Railwayでデプロイ

#### 4-1. Railwayでプロジェクトを作成

1. [Railway](https://railway.app/) にログイン
2. **New Project** → **Deploy from GitHub repo** を選択
3. GitHubリポジトリ `shift-scheduler-v2` を選択

#### 4-2. 環境変数の設定

Railway のプロジェクト画面で **Variables** に以下を追加：

```env
# 必須
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DB?ssl={"rejectUnauthorized":true}
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai

# 任意（ストレージ）
AWS_REGION=auto
S3_BUCKET=your-r2-bucket-name
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# 任意（メール通知）
RESEND_API_KEY=re_...
```

#### 4-3. ビルド & デプロイ

- Railwayが自動的に `Dockerfile` を検出してビルド
- デプロイ完了後、URLが発行される（例: `https://shift-scheduler-v2-production.up.railway.app`）

#### 4-4. データベースマイグレーション

初回デプロイ後、一度だけマイグレーションを実行：

```bash
# Railwayのコンソールで実行（または手元から環境変数を設定して）
pnpm run db:push
```

---

### 5. Cloudflare R2（ストレージ - 任意）

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2** → **Create bucket**
2. バケット名を設定（例: `shift-scheduler-archives`）
3. **API Tokens** → **Create API token** で R2 用のトークンを作成
4. 以下の情報を `.env` / Railway Variables に追加：
   - `S3_BUCKET`: バケット名
   - `S3_ENDPOINT`: `https://ACCOUNT_ID.r2.cloudflarestorage.com`
   - `S3_ACCESS_KEY_ID`: Access Key ID
   - `S3_SECRET_ACCESS_KEY`: Secret Access Key

---

### 6. Resend（メール通知 - 任意）

1. [Resend](https://resend.com/) にログイン
2. **API Keys** → **Create API Key** で作成
3. `RESEND_API_KEY` を `.env` / Railway Variables に追加

または、SMTP を使う場合：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@example.com
```

---

### 7. 月次ワークフロー自動化（Cron）

Railway で **Cron Jobs** を追加：

1. Railway プロジェクト → **New** → **Cron Job**
2. スケジュール: `0 3 20 * *` （毎月20日の03:00 JST）
3. コマンド: `pnpm cron:run`

または、GitHub Actions でスケジュール実行も可能。

---

### 8. カスタムドメインの設定（任意）

1. Railway プロジェクト → **Settings** → **Domains**
2. **Add Custom Domain** でドメインを追加
3. DNS レコードを設定（CNAMEまたはAレコード）

---

## 🛠️ ローカル開発

### 必要な環境

- Node.js 22+
- pnpm 10+
- MySQL 8.0+（ローカルまたはDocker）

### セットアップ

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

---

## 📦 本番ビルド & 起動

```bash
# ビルド
pnpm build

# 起動
pnpm start
```

---

## 🔧 トラブルシューティング

### ビルドエラー

- `pnpm check` でTypeScriptのエラーを確認
- `pnpm build` でビルドエラーを確認

### データベース接続エラー

- `DATABASE_URL` が正しいか確認
- PlanetScale の接続制限に達していないか確認

### LLM API エラー

- `OPENAI_API_KEY` が正しいか確認
- OpenAI の利用上限に達していないか確認

---

## 📝 次のステップ

1. 初期データの投入（`pnpm seed`）
2. 管理者アカウントの作成
3. 職員・役職グループの登録
4. 勤務時間枠の設定
5. 職場ルールの設定
6. AI自動生成のテスト

---

以上で、Shift Scheduler v2 の本番デプロイが完了です！
