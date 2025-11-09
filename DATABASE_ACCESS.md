# データベースアクセスガイド

このドキュメントでは、データベースの場所とデータの参照方法を説明します。

## 📍 データベースの場所

### データベースサービス: Aiven for MySQL

あなたのデータベースは **Aiven** というクラウドデータベースサービスでホストされています。

**接続情報**（`.env`ファイルから）:
```
ホスト: shift-scheduler-kinyu000-c42a.i.aivencloud.com
ポート: 21789
データベース名: defaultdb
ユーザー名: avnadmin
```

## 🌐 Aivenの管理画面でデータを確認する方法

### 1. Aivenにログイン

1. ブラウザで https://console.aiven.io/ にアクセス
2. Aivenのアカウントでログイン
   - アカウント作成時に使用したメールアドレスとパスワードでログイン

### 2. データベースを選択

1. ダッシュボードで「Services」を選択
2. サービス一覧から `shift-scheduler-kinyu000-c42a` を選択

### 3. データベースの管理

Aivenの管理画面では以下が可能です：

#### **Overview タブ**
- データベースの接続情報
- 接続状態の確認
- リソース使用状況（CPU、メモリ、ディスク）

#### **Backups タブ**
- 自動バックアップの設定
- バックアップ履歴の確認
- 手動バックアップの作成
- バックアップからの復元

#### **Current queries タブ**
- 現在実行中のクエリを確認
- パフォーマンスの監視

#### **Databases タブ**
- データベース一覧（`defaultdb`）
- 新しいデータベースの作成（必要に応じて）

#### **Users タブ**
- データベースユーザーの管理
- 現在のユーザー: `avnadmin`（管理者権限）

## 💻 ローカルからデータベースに接続する方法

### 方法1: コマンドラインスクリプト（推奨）

プロジェクトに用意されているスクリプトを使用：

```bash
# データベースの状態を確認
pnpm check-db

# 実行結果例:
# 👥 Users: 3 records
# 👷 Employees: 2 records
# など、すべてのテーブルのデータ数と内容が表示されます
```

### 方法2: MySQL Workbenchを使用

#### インストール
1. https://dev.mysql.com/downloads/workbench/ からダウンロード
2. インストール

#### 接続設定
1. MySQL Workbenchを起動
2. 「+」アイコンをクリックして新しい接続を作成
3. 以下の情報を入力：
   - **Connection Name**: Shift Scheduler (任意の名前)
   - **Hostname**: `shift-scheduler-kinyu000-c42a.i.aivencloud.com`
   - **Port**: `21789`
   - **Username**: `avnadmin`
   - **Password**: `AVNS_DFbwqth2Tnib2XE-Mbo`
   - **Default Schema**: `defaultdb`

4. 「SSL」タブで「Use SSL」を選択
   - **SSL Mode**: Require

5. 「Test Connection」で接続テスト
6. 「OK」で保存

#### データの確認
1. 作成した接続をダブルクリック
2. 左側のナビゲーターで `defaultdb` → `Tables` を展開
3. テーブル一覧が表示されます：
   - `users` - ユーザー（管理者・職員のログイン情報）
   - `employees` - 職員情報
   - `positionGroups` - 役職グループ
   - `workTimeSlots` - 勤務時間枠
   - `shifts` - シフト
   - `shiftDetails` - シフト詳細
   - `leaveRequests` - 希望休申請
   - など

4. テーブルを右クリック → 「Select Rows」でデータを確認

### 方法3: TablePlusを使用（Mac/Windows）

#### インストール
1. https://tableplus.com/ からダウンロード
2. インストール

#### 接続設定
1. TablePlusを起動
2. 「Create a new connection」をクリック
3. 「MySQL」を選択
4. 以下の情報を入力：
   - **Name**: Shift Scheduler
   - **Host**: `shift-scheduler-kinyu000-c42a.i.aivencloud.com`
   - **Port**: `21789`
   - **User**: `avnadmin`
   - **Password**: `AVNS_DFbwqth2Tnib2XE-Mbo`
   - **Database**: `defaultdb`
   - **Use SSL**: ON

5. 「Test」で接続テスト
6. 「Connect」で接続

## 📊 主要なテーブルとデータの見方

### `users` テーブル
- **役割**: システムのログインユーザー（管理者と職員）
- **主要カラム**:
  - `id`: ユーザーID
  - `email`: メールアドレス（ログイン用）
  - `name`: 名前
  - `role`: ロール（`admin` または `user`）
  - `createdAt`: 作成日時

### `employees` テーブル
- **役割**: 職員情報
- **主要カラム**:
  - `id`: 職員ID（内部用）
  - `employeeId`: 職員ID（ログイン用、例: EMP00001）
  - `name`: 名前
  - `email`: メールアドレス
  - `positionGroupId`: 役職グループID
  - `skillLevel`: スキルレベル（50-100）
  - `canWorkNightShift`: 夜勤可否

### `positionGroups` テーブル
- **役割**: 役職グループ（正社員、パートなど）
- **主要カラム**:
  - `id`: ID
  - `name`: 名前（例: 正社員）
  - `employmentType`: 雇用形態（`fulltime` / `parttime`）

### `workTimeSlots` テーブル
- **役割**: 勤務時間枠（早番、遅番、夜勤など）
- **主要カラム**:
  - `id`: ID
  - `name`: 名前（例: 早番）
  - `displayLabel`: 表示ラベル（例: 早）
  - `startTime`: 開始時刻（例: 07:00）
  - `endTime`: 終了時刻（例: 16:00）
  - `isNightShift`: 夜勤フラグ

### `shifts` テーブル
- **役割**: シフト（月単位）
- **主要カラム**:
  - `id`: シフトID
  - `year`: 年
  - `month`: 月
  - `name`: シフト名
  - `status`: ステータス（`draft`, `tentative`, `confirmed` など）
  - `generatedBy`: 生成方法（`manual` / `ai`）

### `shiftDetails` テーブル
- **役割**: シフト詳細（日単位の勤務割り当て）
- **主要カラム**:
  - `id`: ID
  - `shiftId`: シフトID
  - `employeeId`: 職員ID
  - `date`: 日付（YYYY-MM-DD）
  - `status`: ステータス（`working`, `off` など）
  - `timeSlotId`: 勤務時間枠ID

### `leaveRequests` テーブル
- **役割**: 希望休申請
- **主要カラム**:
  - `id`: ID
  - `employeeId`: 職員ID
  - `startDate`: 開始日
  - `endDate`: 終了日
  - `leaveType`: 種類（`休`, `有休`, `時間指定`）
  - `status`: ステータス（`pending`, `approved`, `rejected`）

## 🔍 データの検索例（SQLクエリ）

### すべての職員を表示
```sql
SELECT * FROM employees;
```

### 管理者ユーザーを表示
```sql
SELECT * FROM users WHERE role = 'admin';
```

### 2025年11月のシフトを表示
```sql
SELECT * FROM shifts WHERE year = 2025 AND month = 11;
```

### 承認待ちの希望休を表示
```sql
SELECT
  lr.*,
  e.name as employee_name
FROM leaveRequests lr
JOIN employees e ON lr.employeeId = e.id
WHERE lr.status = 'pending';
```

### 職員の勤務シフト詳細を表示（日付順）
```sql
SELECT
  sd.date,
  e.name as employee_name,
  wts.name as time_slot,
  sd.status
FROM shiftDetails sd
JOIN employees e ON sd.employeeId = e.id
LEFT JOIN workTimeSlots wts ON sd.timeSlotId = wts.id
WHERE sd.shiftId = 1
ORDER BY sd.date, e.name;
```

## 🛡️ セキュリティ上の注意

1. **接続情報の管理**
   - `.env` ファイルは **絶対にGitにコミットしない**
   - パスワードは定期的に変更することを推奨

2. **データベースユーザーの権限**
   - `avnadmin` は管理者権限を持っています
   - 必要に応じて、読み取り専用ユーザーを作成することを検討

3. **バックアップ**
   - Aivenで自動バックアップを有効化
   - 重要な操作の前に手動バックアップを作成

4. **SSL接続**
   - 必ずSSL接続を使用（`.env`の`ssl-mode=REQUIRED`）
   - 接続ツールでもSSLを有効化

## 📞 トラブルシューティング

### 接続できない場合

1. **ファイアウォール確認**
   - ポート21789が開いているか確認
   - 企業ネットワークの場合、IT部門に確認

2. **認証情報の確認**
   - ユーザー名: `avnadmin`
   - パスワード: `.env`ファイルで確認
   - 大文字小文字を正確に入力

3. **SSL設定の確認**
   - SSL/TLSが有効になっているか確認

### データが表示されない場合

1. **データベース名の確認**
   - `defaultdb` に接続しているか確認

2. **権限の確認**
   - `avnadmin` ユーザーに適切な権限があるか確認

---

**更新日**: 2025年11月9日
**バージョン**: 1.0.0
