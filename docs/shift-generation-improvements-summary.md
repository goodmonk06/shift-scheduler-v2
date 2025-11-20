# シフト生成システム改善まとめ

## 完了した作業

### 1. 問題の分析と特定 ✅
**ドキュメント**: `/docs/shift-generation-analysis.md`

主な問題点:
- 承認済み希望休・勤務希望が固定データとして扱われていない
- リセット時に必要なデータまで消えてしまう
- 研修データの扱いが不明確（勤務人数にカウントすべきでない）
- データの種類（固定/生成）が混在して区別できない

### 2. データベーススキーマの改修 ✅

#### 2.1 実行したカラム追加
**実行スクリプト**: `scripts/add-columns-fixed-support.ts`

**shiftDetails テーブル**:
- `isFixed` BOOLEAN - 固定データフラグ（デフォルト: false）
- `sourceType` VARCHAR(50) - データソース
- `sourceId` INT - ソースデータのID

**workPreferences テーブル**:
- `preferenceType` ENUM - 勤務希望タイプ（time_specified, night_shift, post_night, training, other）
- `isCountAsStaff` BOOLEAN - 勤務人数カウント（研修時false）
- `displayIcon` VARCHAR(10) - 表示用アイコン

#### 2.2 Drizzleスキーマの更新 ✅
**更新ファイル**: `/drizzle/schema.ts`
- 新しいカラムを追加してORMが認識できるように更新

### 3. データマイグレーション ✅

**現在のデータ状況**:
```
shiftDetails:
- 総件数: 750件
- 固定シフト: 750件（すべてisFixed=true）
  - leave_request由来: 322件
  - rule_based由来: 428件

leaveRequests (承認済み):
- 総数: 750件
  - 休: 737件
  - 有休: 10件
  - 冬季休暇: 3件

workPreferences (承認済み):
- 総数: 232件
- 12月分: 206件
```

### 4. 改善されたシフト生成モジュール ✅
**作成ファイル**: `/server/improvedShiftGenerator.ts`

主な機能:
1. **loadFixedConstraints()**: 承認済み希望休・勤務希望を固定制約として読み込み
2. **generateFixedShifts()**: 固定シフトを生成（変更不可）
3. **resetShifts()**: リセット機能（固定データ保護オプション付き）
4. **generateImprovedShift()**: 改善された生成メインプロセス

### 5. ドキュメント作成 ✅

作成したドキュメント:
- `/docs/shift-generation-analysis.md` - 問題分析と改善提案
- `/docs/shift-generation-improvements-summary.md` - 本ドキュメント

## 次のステップ（実装待ち）

### 1. 既存生成ロジックとの統合
```typescript
// server/routers.ts の修正例
import { generateImprovedShift, resetShifts } from "./improvedShiftGenerator";

// AI生成エンドポイントの修正
.mutation("generateWithAI", {
  input: z.object({
    shiftId: z.number(),
    year: z.number(),
    month: z.number(),
    options: z.object({
      keepApprovedRequests: z.boolean().default(true),
      keepManualEdits: z.boolean().default(false),
    }).optional()
  }),
  async resolve({ input }) {
    const result = await generateImprovedShift(
      input.shiftId,
      input.year,
      input.month,
      {
        ...input.options,
        useAI: true,
        usePhased: false
      }
    );
    return result;
  }
})
```

### 2. 希望休管理UI実装

必要な画面:
- 承認済み希望休・勤務希望の一覧表示
- 固定データと生成データの区別表示
- 個別承認/却下機能
- 研修データの「！」アイコン表示

### 3. リセット機能のUI

```tsx
// components/ShiftResetDialog.tsx の例
export function ShiftResetDialog({ shiftId }: { shiftId: number }) {
  const [options, setOptions] = useState({
    keepApprovedRequests: true,
    keepManualEdits: false
  });

  const handleReset = async () => {
    await trpc.shifts.resetShifts.mutate({
      shiftId,
      options
    });
  };

  return (
    <Dialog>
      <DialogContent>
        <h3>シフトのリセット</h3>
        <Checkbox
          checked={options.keepApprovedRequests}
          onChange={(e) => setOptions({
            ...options,
            keepApprovedRequests: e.target.checked
          })}
        >
          承認済み希望休・勤務希望を保持
        </Checkbox>
        <Button onClick={handleReset}>リセット実行</Button>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. 研修データの特別処理

```typescript
// 研修データの登録例
await db.insert(workPreferences).values({
  employeeId: employeeId,
  startDate: '2024-12-15',
  endDate: '2024-12-15',
  startTime: '13:00',
  endTime: '17:00',
  preferenceType: 'training',
  isCountAsStaff: false,
  displayIcon: '！',
  reason: 'PM研修',
  status: 'approved'
});
```

## 重要な変更点

### データの扱い

**以前**: すべてのシフトデータが同じように扱われ、リセット時に全削除

**現在**:
- `isFixed=true`: 承認済み希望休・勤務希望由来（変更不可）
- `isFixed=false`: AI生成・手動作成（変更可能）

### リセット機能

**以前**: すべてのシフトデータを削除

**現在**:
- デフォルト: 固定データ（isFixed=true）を保持
- オプション: すべて削除も可能

### 研修の扱い

**以前**: 通常の勤務として扱われる

**現在**:
- `preferenceType='training'`
- `isCountAsStaff=false`（勤務人数にカウントしない）
- `displayIcon='！'`（特別表示）

## テスト手順

1. **固定データの確認**
```bash
pnpm tsx scripts/check-fixed-data-status.ts
```

2. **改善されたシフト生成のテスト**
```typescript
// テストスクリプト作成
import { generateImprovedShift } from "../server/improvedShiftGenerator";

const result = await generateImprovedShift(
  shiftId,
  2024,
  12,
  {
    keepApprovedRequests: true,
    keepManualEdits: false,
    usePhased: true,
    useAI: false
  }
);

console.log("固定シフト:", result.fixedShifts.length);
console.log("生成シフト:", result.generatedShifts.length);
```

3. **リセット機能のテスト**
```typescript
import { resetShifts } from "../server/improvedShiftGenerator";

// 固定データを保持してリセット
const result = await resetShifts(shiftId, {
  keepApprovedRequests: true,
  keepManualEdits: false
});

console.log("削除:", result.deletedCount);
console.log("保持:", result.keptCount);
```

## まとめ

シフト生成システムの主要な問題を特定し、以下の改善を実施しました：

1. ✅ **データベースの改修**: 固定データフラグと詳細タイプの追加
2. ✅ **データマイグレーション**: 既存データの固定化（750件）
3. ✅ **生成ロジックの改善**: 固定データを保護する新しい生成モジュール
4. ⏳ **UI実装待ち**: 希望休管理画面とリセット機能のUI

これにより、承認済みの希望休・勤務希望が意図せず削除される問題が解決され、より安定したシフト生成が可能になります。