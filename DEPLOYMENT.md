# Railway デプロイメントガイド

このドキュメントでは、シフトスケジューラーアプリケーションをRailwayにデプロイする手順を説明します。

## 前提条件

- [Railway](https://railway.app/) アカウント
- GitHubアカウント
- MySQLデータベース（Railway MySQL Pluginを使用）

## デプロイ手順

### 1. Railwayプロジェクトの作成

1. Railway（https://railway.app/）にログイン
2. 「New Project」をクリック
3. 「Deploy from GitHub repo」を選択
4. リポジトリを選択（事前にGitHubにpushしておく必要があります）

### 2. MySQLデータベースの追加

1. Railwayプロジェクトの画面で「New」→「Database」→「Add MySQL」をクリック
2. MySQLプラグインが自動的に作成されます
3. 接続情報（DATABASE_URL）が自動的に環境変数に設定されます

### 3. 環境変数の設定

Railwayプロジェクトの「Variables」タブで以下の環境変数を設定します：

```bash
# 必須環境変数
NODE_ENV=production
DATABASE_URL=<自動設定されたMySQL接続URL>
JWT_SECRET=<ランダムな文字列を生成>
SESSION_SECRET=<ランダムな文字列を生成>

# オプション環境変数
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### JWT_SECRET と SESSION_SECRET の生成方法

ターミナルで以下のコマンドを実行して、セキュアなランダム文字列を生成できます：

```bash
openssl rand -base64 32
```

### 4. データベースの初期化

デプロイ後、以下のコマンドでデータベーステーブルを作成します：

1. Railwayのプロジェクト画面で、アプリケーションサービスを選択
2. 「Settings」タブの「Deploy」セクションで「Custom Start Command」を一時的に変更：

```bash
pnpm db:push && pnpm start
```

3. デプロイが完了したら、元の `pnpm start` に戻します

### 5. 管理者アカウントの作成

デプロイ後、以下の手順で管理者アカウントを作成します：

1. Railway CLIをインストール（ローカルマシン）：
```bash
npm install -g @railway/cli
```

2. Railwayにログイン：
```bash
railway login
```

3. プロジェクトにリンク：
```bash
railway link
```

4. 管理者作成スクリプトを実行：
```bash
railway run pnpm setup-admin
```

### 6. ドメインの設定

1. Railwayプロジェクトの「Settings」タブを開く
2. 「Domains」セクションで「Generate Domain」をクリック
3. カスタムドメインを使用する場合は「Custom Domain」を追加

## ビルド設定

プロジェクトには以下のRailway設定ファイルが含まれています：

- `railway.json`: Railway用の基本設定
- `nixpacks.toml`: Nixpacksビルドシステムの設定

これらのファイルにより、以下が自動的に実行されます：

1. `pnpm install` - 依存関係のインストール
2. `pnpm build` - アプリケーションのビルド
3. `pnpm start` - 本番サーバーの起動

## トラブルシューティング

### ビルドが失敗する場合

1. ログを確認：Railwayの「Deployments」タブでビルドログを確認
2. 依存関係の確認：`package.json`のdevDependenciesとdependenciesが正しく設定されているか確認
3. Node.jsバージョン：`nixpacks.toml`でNode.js 20を使用しています

### データベース接続エラー

1. `DATABASE_URL`環境変数が正しく設定されているか確認
2. MySQLプラグインが起動しているか確認
3. Railway内部ネットワークで接続されているか確認

### アプリケーションが起動しない

1. ポート設定：Railwayは自動的に`PORT`環境変数を設定します
2. ログ確認：「View Logs」でエラーメッセージを確認
3. 環境変数：すべての必須環境変数が設定されているか確認

## 本番環境の確認

デプロイが成功したら、以下を確認します：

1. Railwayで生成されたドメインにアクセス
2. 管理者アカウントでログイン
3. シフト作成・編集機能の動作確認
4. 職員用ページの表示確認

## 継続的デプロイメント

GitHubリポジトリにプッシュすると、Railwayが自動的に：

1. 変更を検知
2. ビルドを実行
3. デプロイを実行

手動デプロイが必要な場合は、Railwayの「Deployments」タブから「Deploy Now」をクリックします。

## セキュリティ

- すべての環境変数は暗号化されて保存されます
- HTTPS通信が自動的に有効化されます
- データベース接続はRailway内部ネットワークで行われます

## サポート

問題が発生した場合は、以下を確認してください：

- [Railway ドキュメント](https://docs.railway.app/)
- [Railway コミュニティフォーラム](https://help.railway.app/)
