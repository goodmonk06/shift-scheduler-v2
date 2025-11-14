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
│   │   │   └── VacationDayDialog.tsx # 日付選択ダイアログ
│   │   ├── constants/
│   │   │   └── employeeHomeConstants.ts # 祝日データ
│   │   ├── types/                # TypeScript型定義
│   │   └── lib/                  # ユーティリティ
├── server/                        # バックエンド
│   ├── _core/
│   │   └── index.ts              # サーバーエントリーポイント
│   └── routes/                   # APIルート
├── db/                           # データベース
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

## 最後の確認事項

- 全ての変更がコミット済み（確認推奨）
- 祝日カレンダー機能が正常動作
- 土日祝日の色分けが正確
- モーダル内の祝日名表示が正常

---

**最終更新**: 2025年（PC再起動前）
