# セッション再開用コンテキスト

## 最新の作業状況

### 完了した機能
1. **祝日データの実装**
   - ファイル: `client/src/constants/employeeHomeConstants.ts`
   - 2025年の全祝日データを追加済み
   - `getHolidaysForMonth(year, month)` 関数で取得可能

2. **祝日名の表示**
   - 従業員ホーム (`client/src/components/EmployeeHome.tsx`)
   - 希望休ダイアログ (`client/src/components/VacationDayDialog.tsx`)
   - カレンダー表示ではなく、モーダル内のみに表示

3. **希望休カレンダーでの祝日参照**
   - `client/src/components/VacationRequest.tsx`: 祝日データ取得
   - `client/src/components/VacationCalendar.tsx`: 土日祝日の色分け実装済み
   - 日曜・祝日: 赤色、土曜: 青色、平日: 通常色

4. **曜日計算の修正**
   - `VacationCalendar.tsx`の`getDayOfWeek()`関数で正確な曜日計算
   - 土日祝日の色が正しく表示されることを確認済み

5. **施設イベント管理機能** ✨NEW
   - データベース: `facilityEvents` テーブルを追加
   - 管理者画面: `client/src/components/FacilityEventManagement.tsx` で作成・編集・削除可能
   - 職員ホーム: APIから施設イベントを取得して表示（モックデータは削除済み）
   - 全職員のカレンダーに自動反映（🎉マークで表示）
   - マイグレーション: `drizzle/0009_amazing_matthew_murdock.sql` で本番環境に適用済み

## 環境変数・設定

### 重要な環境変数 (.env)
```env
# データベース
DATABASE_URL="mysql://user:password@host:port/database"

# セッション暗号化キー（32文字）
SESSION_SECRET="your-32-character-secret-key-here"

# 管理者アカウント
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"

# OpenAI API（AI機能用）
OPENAI_API_KEY="sk-..."

# Railway設定
RAILWAY_ENVIRONMENT="production"
PORT=3000
```

### 暗号化キーの確認方法
```bash
# .envファイルのSESSION_SECRETを確認
cat .env | grep SESSION_SECRET
```

## プロジェクト構造

```
shift-scheduler-v2/
├── client/                        # フロントエンド
│   ├── src/
│   │   ├── components/           # Reactコンポーネント
│   │   │   ├── EmployeeHome.tsx  # 従業員ホーム
│   │   │   ├── VacationRequest.tsx  # 希望休申請
│   │   │   ├── VacationCalendar.tsx # 希望休カレンダー
│   │   │   ├── VacationDayDialog.tsx # 日付選択ダイアログ
│   │   │   └── FacilityEventManagement.tsx # 施設イベント管理（管理者）
│   │   ├── services/
│   │   │   └── facilityEventService.ts # 施設イベントAPI
│   │   ├── constants/
│   │   │   └── employeeHomeConstants.ts # 祝日データ
│   │   ├── types/                # TypeScript型定義
│   │   └── lib/                  # ユーティリティ
├── server/                        # バックエンド
│   ├── _core/
│   │   └── index.ts              # サーバーエントリーポイント
│   ├── routes/                   # APIルート
│   ├── db.ts                     # データベース操作関数
│   └── routers.ts                # tRPC APIルーター
├── drizzle/                       # データベース
│   └── schema.ts                 # Drizzle ORMスキーマ
└── scripts/                      # ユーティリティスクリプト
```

## 開発サーバーの起動

### フロントエンド + バックエンド
```bash
cd /mnt/c/Users/kinyu/Desktop/shift-scheduler/shift-scheduler-v2
pnpm dev
```

### 本番ビルド
```bash
NODE_ENV=production pnpm build
```

### サーバーのみ起動
```bash
NODE_ENV=development tsx server/_core/index.ts
```

## データベース操作

### マイグレーション実行
```bash
pnpm drizzle-kit generate
pnpm tsx scripts/apply-migration.ts
```

### 管理者ユーザー追加
```bash
pnpm tsx scripts/add-admin.ts
```

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite + TailwindCSS
- **バックエンド**: Express + TypeScript
- **データベース**: MySQL (Railway)
- **ORM**: Drizzle ORM
- **UI**: shadcn/ui コンポーネント
- **状態管理**: React hooks (useState, useEffect, useMemo)
- **認証**: セッションベース (express-session)

## 現在のバックグラウンドプロセス

PC再起動後は以下のプロセスが停止しているため、必要に応じて再起動が必要:
- 開発サーバー (pnpm dev)
- その他のバックグラウンドビルドプロセス

## トラブルシューティング

### ポートが使用中の場合
```bash
# プロセス確認
lsof -i :3000
lsof -i :5000

# プロセス終了
kill -9 <PID>
```

### データベース接続エラー
1. `.env`の`DATABASE_URL`を確認
2. Railwayのデータベースが起動しているか確認
3. ネットワーク接続を確認

### ビルドエラー
```bash
# node_modules再インストール
rm -rf node_modules
pnpm install

# キャッシュクリア
rm -rf .vite
rm -rf dist
```

## 次回セッション開始時のチェックリスト

1. ✅ 開発サーバーの起動状態確認
2. ✅ 祝日機能の動作確認
3. ✅ 環境変数の確認
4. ✅ データベース接続確認
5. ⏭️ 次の機能開発・修正

## 重要な実装詳細

### 祝日データ構造
```typescript
export interface Holiday {
  day: number;
  name: string;
}

export const holidays2025: Record<number, Holiday[]> = {
  1: [{ day: 1, name: "元日" }, { day: 13, name: "成人の日" }],
  // ... 全12ヶ月分
};
```

### 曜日計算ロジック
```typescript
const getDayOfWeek = (day: number) => {
  const date = new Date(nextMonthYear, nextMonthNum - 1, day);
  return date.getDay(); // 0=日曜, 6=土曜
};
```

### 色分けロジック
```typescript
if (hasRequest) {
  textColor = hasEditingRequest ? "text-white" : "text-primary";
} else if (isHoliday || isSunday) {
  textColor = "text-destructive"; // 赤
} else if (isSaturday) {
  textColor = "text-blue-600"; // 青
} else {
  textColor = "text-foreground"; // 通常
}
```

## 施設イベント機能の詳細

### データベーステーブル構造
```sql
CREATE TABLE `facilityEvents` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `day` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text,
  `time` varchar(50),
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE cascade
);
```

### API エンドポイント
- `trpc.facilityEvents.list.query()` - 全イベント取得
- `trpc.facilityEvents.getByMonth.query({ year, month })` - 月別イベント取得
- `trpc.facilityEvents.create.mutate(event)` - イベント作成（管理者のみ）
- `trpc.facilityEvents.update.mutate({ id, ...updates })` - イベント更新（管理者のみ）
- `trpc.facilityEvents.delete.mutate({ id })` - イベント削除（管理者のみ）

### 使用方法
**管理者:**
1. 管理者画面にログイン
2. サイドバー「設定」→「施設イベント」
3. 新規イベントボタンから登録

**職員:**
- ホーム画面のカレンダーに自動表示
- イベントがある日には🎉マークが表示される

## 重要な修正履歴 🔧

### useEffect インポートエラー修正（2025年11月15日）

**問題の概要**
一部の職員が「cant find variable: useEffect」エラーでホーム画面が表示されない致命的な問題が発生。

**原因**
`EmployeeHome.tsx`（89行目、98行目）でuseEffectを使用しているが、Reactからインポートしていなかった。
施設イベント自動更新機能追加時（コミット e50d218）にuseEffectを追加したが、インポート文の更新を忘れていた。

**修正内容**
```typescript
// Before:
import { useState, useMemo } from "react";

// After:
import { useState, useMemo, useEffect } from "react";
```

**影響範囲**
- 職員ホーム画面のみ（管理者画面は影響なし）
- 施設イベント自動更新機能を追加した時点から発生

**対応状況**
- ✅ 修正完了（コミット ce9b39b）
- ✅ 本番環境にデプロイ済み
- ✅ 全職員がホーム画面にアクセス可能

---

## 最後の確認事項

- ✅ 全ての変更がコミット済み
- ✅ 祝日カレンダー機能が正常動作
- ✅ 土日祝日の色分けが正確
- ✅ モーダル内の祝日名表示が正常
- ✅ 施設イベント機能が本番環境で動作中
- ✅ useEffectインポートエラー修正済み

---

**最終更新**: 2025年11月15日（useEffectインポートエラー修正）
