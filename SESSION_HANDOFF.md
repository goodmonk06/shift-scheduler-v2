# セッション引き継ぎドキュメント

## プロジェクト概要

**プロジェクト名:** シフトスケジューラーv2
**作業ディレクトリ:** `/home/kinyu000/shift-scheduler-v2`
**デプロイ先:** Railway (GitHub連携で自動デプロイ)
**リポジトリ:** `github.com:goodmonk06/shift-scheduler-v2.git`

---

## 1. ディレクトリ構造

```
/home/kinyu000/shift-scheduler-v2/
├── client/                         # フロントエンド (React + TypeScript)
│   ├── src/
│   │   ├── components/             # UIコンポーネント
│   │   │   ├── DecemberShiftGeneration.tsx    ★ 12月シフト生成メイン画面
│   │   │   ├── DecemberShiftSelectionModal.tsx
│   │   │   ├── AdminApp.tsx        # 管理者画面のレイアウト
│   │   │   ├── ShiftEditor.tsx     # 汎用シフト編集
│   │   │   └── ...
│   │   ├── services/               # APIクライアント
│   │   │   └── shiftService.ts
│   │   ├── lib/
│   │   │   └── trpc.ts             # tRPCクライアント設定
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── index.css               # グローバルスタイル（印刷用CSS含む）
│   └── public/
├── server/                         # バックエンド (Node.js + tRPC)
│   ├── routers.ts                  ★ tRPCルーター定義（全エンドポイント）
│   ├── phaseBasedShiftGenerator.ts ★ 12月シフト生成ロジック
│   ├── aiShiftGenerator.ts         # AI生成エンジン
│   ├── db.ts                       # Drizzle ORM設定
│   ├── _core/
│   │   └── index.ts                # サーバーエントリーポイント
│   ├── ai/                         # AI関連ユーティリティ
│   ├── utils/                      # サーバーユーティリティ
│   └── services/
├── scripts/                        # メンテナンススクリプト
│   ├── verify-random-dates.ts      # シフト検証スクリプト
│   └── ...
├── drizzle/                        # DBマイグレーション
│   └── migrations/
├── data/                           # データファイル
│   └── december-shifts/
│       └── backups/                # シフトバックアップ（JSON）
├── .env                            ★ 環境変数（重要）
├── package.json
├── vite.config.ts
└── drizzle.config.ts
```

---

## 2. 環境変数と認証情報

### ファイル場所
`/home/kinyu000/shift-scheduler-v2/.env`

### 重要な環境変数

```bash
# データベース接続（Aiven MySQL）
DATABASE_URL=mysql://[username]:[password]@[host]:[port]/defaultdb?ssl-mode=REQUIRED
# ※実際の値は /home/kinyu000/shift-scheduler-v2/.env を参照

# JWT認証
JWT_SECRET=[secret-key]
# ※実際の値は .env を参照

# AI生成（OpenAI）
LLM_PROVIDER=openai
OPENAI_API_KEY=[your-openai-api-key]
# ※実際の値は .env を参照
OPENAI_MODEL=gpt-4o-mini

# その他
NODE_ENV=development
PORT=3000
```

### データベース直接接続

```bash
# MySQLクライアントで接続
mysql -h [host] \
      -P [port] \
      -u [username] \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb
# ※パスワードは .env の DATABASE_URL から取得

# または環境変数で
DATABASE_URL='[see .env file]' pnpm tsx scripts/your-script.ts

# .envを読み込んで実行（推奨）
source .env
pnpm tsx scripts/your-script.ts
```

---

## 3. 12月シフト生成の仕組み

### 3-1. フロントエンド

#### メインコンポーネント
**ファイル:** `/home/kinyu000/shift-scheduler-v2/client/src/components/DecemberShiftGeneration.tsx`
**行数:** 約2200行
**責務:**
- シフト表のUI表示（編集画面）
- セル編集（クリック→ドロップダウン選択）
- PDF出力（ブラウザ印刷機能）
- AI生成の呼び出し
- バックアップ保存/読み込み

#### 主要な状態管理

```typescript
// 行: 90-140付近
const [cells, setCells] = useState<CellData[]>([]);  // シフトセルデータ
const [staffList, setStaffList] = useState<StaffData[]>([]);  // 職員リスト
const [eventData, setEventData] = useState<EventData[]>([]);  // 行事データ
const [isGenerating, setIsGenerating] = useState(false);  // AI生成中フラグ
const [printPreview, setPrintPreview] = useState(false);  // 印刷プレビュー
```

#### データフロー

```
ユーザー操作（編集）
    ↓
setCells()で状態更新
    ↓
handleSave()で保存
    ↓
trpcClient.shiftDetails.bulkUpsert.mutate()
    ↓
サーバーへ送信
```

#### AI生成フロー

```typescript
// 行: 629-650付近
const handleGenerate = async () => {
  setIsGenerating(true);
  try {
    const result = await trpcClient.shifts.generatePhaseBased.mutate({
      shiftId: currentShiftId,
      year: 2025,
      month: 12,
    });
    // 生成完了後、データ再読み込み
    await loadShiftData();
  } catch (error) {
    toast.show('生成失敗', 'error');
  } finally {
    setIsGenerating(false);
  }
};
```

#### 重要な関数

- `loadShiftData()` (行: 200-300付近): サーバーからシフトデータを取得
- `handleSave()` (行: 600付近): シフトを保存
- `handleBackup()` (行: 800付近): JSONバックアップを保存
- `handleRestore()` (行: 850付近): バックアップから復元
- `getDayStyle()` (行: 1455): 日付ヘッダーの色（日曜・土曜・平日）

#### スティッキーヘッダー/カラムの実装

**親レイアウト（AdminApp.tsx）:**
```typescript
// 行: 154
<div className="flex h-[calc(100vh-73px)] overflow-hidden">
  <aside className="h-full flex-shrink-0">サイドバー</aside>
  <main className="flex-1 h-full overflow-auto"> {/* ← スクロールコンテナ */}
    <DecemberShiftGeneration />
  </main>
</div>
```

**DecemberShiftGeneration.tsx:**
```typescript
// 行: 1462 - コンテナ
<div className="flex flex-col h-full overflow-hidden">
  <div className="sticky top-0">ヘッダーボタン</div>
  <main className="flex-1 overflow-auto"> {/* ← 親からのスクロール */}
    <div id="grid-wrapper"> {/* overflow-autoを削除済み */}
      <table>
        {/* 行: 1956 - 日付ヘッダー */}
        <tr className="sticky top-0 z-50">
          <th className="sticky left-0 z-[60]">氏名</th>
          <th>12/1</th>...
        </tr>
        {/* 行: 1987 - 職員名セル */}
        <td className="sticky left-0 z-30">{staff.name}</td>
      </table>
    </div>
  </main>
</div>
```

**CSS（index.css）:**
```css
/* 行: 6020-6057 */
.shift-print-root table {
  table-layout: fixed; /* セル幅統一 */
}

.shift-print-root th:first-child,
.shift-print-root td:first-child {
  width: 120px;
  position: sticky !important;
  left: 0 !important;
  z-index: 30;
}

.shift-print-root thead th:first-child {
  z-index: 60 !important; /* ヘッダー×名前の交差部分 */
}
```

---

### 3-2. バックエンド

#### tRPCエンドポイント定義
**ファイル:** `/home/kinyu000/shift-scheduler-v2/server/routers.ts`
**行数:** 約2700行

**主要なエンドポイント（12月シフト関連）:**

```typescript
// 行: 1100-1200付近
export const shiftsRouter = t.router({
  // AI生成（フェーズベース）
  generatePhaseBased: t.procedure
    .input(z.object({
      shiftId: z.number(),
      year: z.number().optional(),
      month: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const generator = new PhaseBasedShiftGenerator(db);
      return await generator.generateShift(input.shiftId);
    }),

  // シフト詳細の一括更新
  bulkUpsert: t.procedure
    .input(z.array(z.object({
      shiftId: z.number(),
      employeeId: z.number(),
      date: z.string(),
      displayText: z.string().nullable(),
      status: z.string().nullable(),
      // ...
    })))
    .mutation(async ({ input }) => {
      // shiftDetailsテーブルに一括挿入/更新
      return await db.insert(shiftDetails).values(input)
        .onDuplicateKeyUpdate({ ... });
    }),

  // シフト取得
  getById: t.procedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.query.shifts.findFirst({
        where: eq(shifts.id, input.id),
      });
    }),
});

// シフト詳細ルーター
export const shiftDetailsRouter = t.router({
  getByShift: t.procedure
    .input(z.object({ shiftId: z.number() }))
    .query(async ({ input }) => {
      return await db.query.shiftDetails.findMany({
        where: eq(shiftDetails.shiftId, input.shiftId),
        with: { employee: true },
      });
    }),
});
```

#### AI生成ロジック
**ファイル:** `/home/kinyu000/shift-scheduler-v2/server/phaseBasedShiftGenerator.ts`
**行数:** 約1200行
**責務:** 12月シフトの自動生成（フェーズベース）

**処理フロー:**

```typescript
// 行: 50-100付近
export class PhaseBasedShiftGenerator {
  async generateShift(shiftId: number) {
    // Phase 1: データ収集
    const employees = await this.fetchEmployees();
    const holidays = await this.fetchHolidays(shiftId);
    const workPreferences = await this.fetchWorkPreferences(shiftId);
    const rules = await this.fetchWorkplaceRules();

    // Phase 2: 夜勤配置
    const nightShifts = await this.assignNightShifts(employees, holidays);

    // Phase 3: 日勤配置
    const dayShifts = await this.assignDayShifts(employees, nightShifts, rules);

    // Phase 4: 検証と調整
    await this.validateAndAdjust(nightShifts, dayShifts);

    // Phase 5: DB保存
    await this.saveToDB(shiftId, nightShifts, dayShifts);

    return { success: true };
  }
}
```

**主要な関数:**

- `assignNightShifts()` (行: 300-500): 夜勤の配置ロジック
  - 正社員優先
  - 月4-5回を目標
  - 夜勤→明け→休みのパターン生成

- `assignDayShifts()` (行: 500-700): 日勤の配置ロジック
  - 早番・日勤A/B・遅番の配置
  - 必要人数を満たすように配置
  - 希望休・希望時間指定を考慮

- `validateAndAdjust()` (行: 700-900): 検証と調整
  - 必要人数チェック（30分単位）
  - 正社員の勤務時間チェック（9:00-16:00）
  - 不足箇所の補充

#### 人数カウントロジック
**場所:** `phaseBasedShiftGenerator.ts` 行: 800-900付近

```typescript
// 30分単位で人数をカウント
const halfHourCounts = new Array(48).fill(0);

for (const detail of shiftDetails) {
  const time = parseShiftTime(detail.displayText);
  if (!time) continue;

  const startSlot = Math.floor(time.start * 2);
  const endSlot = Math.floor(time.end * 2);

  for (let slot = startSlot; slot < endSlot; slot++) {
    if (slot >= 0 && slot < 48) {
      halfHourCounts[slot]++;
    }
  }
}

// 前日夜勤の処理（0:00-9:00）
const prevNightShifts = await this.getPrevDayNightShifts(date);
for (const shift of prevNightShifts) {
  const nextDayDetail = await this.getNextDayDetail(shift.employeeId, date);
  if (nextDayDetail && nextDayDetail.displayText === '明') {
    continue; // 「明」でカウント済み
  }
  // 「明」がない場合、0-9時をカウント
  for (let slot = 0; slot < 18; slot++) {
    halfHourCounts[slot]++;
  }
}
```

---

## 4. よく使うコマンド

### 開発サーバー起動
```bash
cd /home/kinyu000/shift-scheduler-v2
pnpm dev
# http://localhost:3000
```

### ビルド
```bash
pnpm build
# → dist/にバンドル出力
```

### デプロイ
```bash
# 方法1: 自動（推奨）
git add -A
git commit -m "メッセージ"
git push
# → Railwayが自動デプロイ（2-3分）

# 方法2: 手動トリガー
echo "# Force redeploy $(date)" > .railway-redeploy
git add .railway-redeploy
git commit -m "feat: redeploy"
git push
```

### データベーススクリプト実行
```bash
# .envを読み込んで実行（推奨）
source .env
pnpm tsx scripts/verify-random-dates.ts

# または環境変数を直接指定
DATABASE_URL='[see .env file]' pnpm tsx scripts/your-script.ts
```

### マイグレーション
```bash
# マイグレーション生成
pnpm drizzle-kit generate

# マイグレーション実行
source .env
pnpm drizzle-kit migrate
```

---

## 5. データベーステーブル構造

### 主要テーブル（12月シフト関連）

**shifts** - シフトマスター
- `id` (PK): シフトID
- `name`: シフト名（例: "12月シフト_20251122_742"）
- `year`, `month`: 対象年月
- `status`: ステータス（draft/published）
- `createdAt`, `updatedAt`

**shiftDetails** - シフト詳細
- `id` (PK)
- `shiftId` (FK): shifts.id
- `employeeId` (FK): employees.id
- `date`: 日付（YYYY-MM-DD）
- `displayText`: 表示テキスト（"夜", "明", "早", "日A", "休" など）
- `status`: ステータス
- `startTime`, `endTime`: 勤務時間
- `leaveType`: 休暇タイプ（yukyu, off など）

**employees** - 職員マスター
- `id` (PK)
- `employeeId`: 職員番号
- `name`: 氏名
- `position`: 役職
- `isFullTime`: 正社員フラグ

**vacationRequests** - 希望休
- `id` (PK)
- `employeeId` (FK)
- `date`: 希望日
- `reason`: 理由
- `status`: 承認ステータス

**workPreferences** - 時間指定勤務希望
- `id` (PK)
- `employeeId` (FK)
- `date`: 希望日
- `preferredSlot`: 希望時間帯（早番、遅番など）

---

## 6. バックアップデータの保存場所

### ファイルシステム
`/home/kinyu000/shift-scheduler-v2/data/december-shifts/backups/`

### フォーマット
```json
{
  "shiftId": 54,
  "year": 2025,
  "month": 12,
  "name": "12月シフト_20251122_742",
  "timestamp": "2025-11-22T10:30:00Z",
  "cells": [
    {
      "employeeId": 1,
      "employeeName": "山口 夕香里",
      "date": "2025-12-01",
      "displayText": "夜",
      "status": "working",
      "startTime": "16:00",
      "endTime": "10:00"
    },
    ...
  ]
}
```

### 復元方法
1. フロントエンド: 「バックアップから復元」ボタン
2. ファイル選択 → JSON読み込み
3. `setCells()`で状態復元
4. 保存ボタンでDB反映

---

## 7. トラブルシューティング

### スティッキーが動かない
- **原因:** ネストしたスクロールコンテナ
- **確認:** `overflow-auto`が複数階層にないかチェック
- **解決:** 親で`overflow-hidden`、子で`overflow-auto`の1階層のみ

### PDF出力がずれる
- **原因:** `@media print`のCSS競合
- **確認:** `index.css`の`@media print`セクション
- **解決:** `table-layout: fixed`と固定幅を設定

### AI生成が失敗する
- **確認1:** `OPENAI_API_KEY`が有効か
- **確認2:** ネットワーク接続
- **ログ:** `server/phaseBasedShiftGenerator.ts`のconsole.log

### データベース接続エラー
- **確認1:** `.env`の`DATABASE_URL`
- **確認2:** Aivenのデータベースが起動中か
- **確認3:** SSL証明書の問題 → `ssl-mode=REQUIRED`

---

## 8. 現在の作業状態（最終更新: 2025-11-23 03:54）

### 完了した作業
1. ✅ スティッキーヘッダー/カラムの実装
   - 縦スクロール: 日付・曜日が追従
   - 横スクロール: 職員名（フルネーム）が追従
   - 行事予定行は追従しない

2. ✅ レイアウト階層の修正
   - AdminApp: サイドバー固定
   - DecemberShiftGeneration: 独立スクロール領域

3. ✅ UI改善
   - 統計列（日数・時間・夜勤等）を80pxに拡大
   - 日付ヘッダーの背景を不透明化（平日: slate-100）
   - セル幅を統一（氏名: 120px、日付: 90px）

4. ✅ デプロイ完了
   - コミット: `14f9dc4`
   - Railway: 自動デプロイ中

### 未解決の問題
- 印刷ビューの微調整（ユーザーから「印刷ビュー改善しません」との報告あり）
- シフト生成ロジックの最適化（人数不足が発生する場合あり）

### 次のステップ候補
1. 印刷ビューの完全修正
2. シフト生成ロジックのチューニング
3. バックアップ/復元機能のUX改善
4. 統計情報の精度向上

---

## 9. 引き継ぎ時のチェックリスト

- [ ] `.env`ファイルの内容を確認
- [ ] `pnpm install`でパッケージインストール
- [ ] `pnpm dev`でローカルサーバー起動
- [ ] ブラウザで http://localhost:3000 にアクセス
- [ ] 管理者ログイン（認証情報は別途確認）
- [ ] 「12月シフト生成」画面で動作確認
- [ ] スティッキー機能の動作確認（スクロールテスト）
- [ ] 最新のgit logを確認 (`git log --oneline -10`)

---

## 10. 参考ドキュメント

- **プロジェクトルート:**
  - `README.md`: プロジェクト概要
  - `DEPLOYMENT.md`: デプロイ手順
  - `DATABASE_ACCESS.md`: DB接続ガイド
  - `QUICK_START.md`: クイックスタート

- **コード内コメント:**
  - `client/src/components/DecemberShiftGeneration.tsx`: 詳細な関数コメント
  - `server/phaseBasedShiftGenerator.ts`: 生成ロジックの説明

---

**作成日時:** 2025-11-23 03:54
**作成者:** Claude Code
