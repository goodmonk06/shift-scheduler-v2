# シフト生成UI統一化 - 詳細実装計画書

## 概要

12月シフト生成システムのUI/UXを全ての月に適用し、職員がスマホから登録した希望休・勤務希望時間をシフトに自動反映できるようにする。

---

## 現状分析

### 現在のファイル構成

```
client/src/components/
├── DecemberShiftGeneration.tsx     (2,871行) - 12月専用、ハードコード職員
├── DecemberShiftSelectionModal.tsx (200行)   - 12月専用選択モーダル
├── ShiftYearlyView.tsx             (296行)   - 年間ビュー
├── ShiftEditor.tsx                 (1,045行) - 旧シフトエディタ（使わない）
└── AdminApp.tsx                    (360行)   - ルーティング・サイドバー
```

### 現在のデータフロー

```
【12月の場合】
サイドバー「12月シフト生成」
  → DecemberShiftSelectionModal
  → DecemberShiftGeneration（ハードコード職員）
  → shifts.saveStandalone（名前でマッチング）

【他の月の場合】
サイドバー「シフト作成・編集」
  → ShiftYearlyView
  → ShiftEditor（旧UI、DB連携）
  → shiftDetails.update（ID連携）
```

### 問題点

1. **職員データ**: DecemberShiftGenerationは27名をハードコード
2. **希望休**: 職員がスマホから登録したデータが反映されない
3. **UI不統一**: 12月とそれ以外で異なるUI
4. **選択モーダル**: 12月のみ「新規/過去データ」選択可能

---

## 目標アーキテクチャ

### 新しいファイル構成

```
client/src/components/
├── ShiftGeneration.tsx             (リネーム) - 汎用シフト生成
├── ShiftSelectionModal.tsx         (リネーム) - 汎用選択モーダル
├── ShiftYearlyView.tsx             (修正)     - 全月で統一動作
└── AdminApp.tsx                    (修正)     - サイドバー整理

server/
├── db.ts                           (追加)     - 日付範囲取得関数
└── routers.ts                      (追加)     - 新規APIエンドポイント
```

### 新しいデータフロー

```
サイドバー「シフト作成・編集」
  → ShiftYearlyView（どの月も同じ動作）
  → ShiftSelectionModal（年月を渡す）
  → ShiftGeneration（年月を渡す）
      ├→ employees.list（職員一覧をDBから取得）
      ├→ leaveRequests.getByDateRange（希望休を取得）
      └→ workPreferences.getByDateRange（勤務希望を取得）
  → shifts.saveStandalone（保存）
```

---

## 実装ステップ

### Phase 1: サーバーサイドAPI追加

#### 1.1 db.ts に関数追加

**ファイル**: `server/db.ts`
**位置**: `getLeaveRequestsByEmployee` の後（約629行目）

```typescript
// 追加する関数
export async function getLeaveRequestsByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  // startDate <= endDate AND endDate >= startDate の条件で重複する日付範囲を取得
  const results = await db.select({
    leaveRequest: leaveRequests,
    employee: employees,
  })
  .from(leaveRequests)
  .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
  .where(
    and(
      sql`${leaveRequests.startDate} <= ${endDate}`,
      sql`${leaveRequests.endDate} >= ${startDate}`
    )
  )
  .orderBy(desc(leaveRequests.createdAt));

  return results.map(r => ({
    ...r.leaveRequest,
    employee: r.employee,
  }));
}

export async function getWorkPreferencesByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select({
    workPreference: workPreferences,
    employee: employees,
  })
  .from(workPreferences)
  .innerJoin(employees, eq(workPreferences.employeeId, employees.id))
  .where(
    and(
      sql`${workPreferences.startDate} <= ${endDate}`,
      sql`${workPreferences.endDate} >= ${startDate}`
    )
  )
  .orderBy(desc(workPreferences.createdAt));

  return results.map(r => ({
    ...r.workPreference,
    employee: r.employee,
  }));
}
```

#### 1.2 routers.ts にエンドポイント追加

**ファイル**: `server/routers.ts`
**位置**: `leaveRequests.getByShift` の後（約865行目）

```typescript
// leaveRequests ルーター内に追加
getByDateRange: protectedProcedure
  .input(z.object({
    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(),   // YYYY-MM-DD
  }))
  .query(async ({ input }) => {
    return await db.getLeaveRequestsByDateRange(input.startDate, input.endDate);
  }),
```

**位置**: `workPreferences.getByShift` の後（約1070行目）

```typescript
// workPreferences ルーター内に追加
getByDateRange: protectedProcedure
  .input(z.object({
    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(),   // YYYY-MM-DD
  }))
  .query(async ({ input }) => {
    return await db.getWorkPreferencesByDateRange(input.startDate, input.endDate);
  }),
```

---

### Phase 2: ShiftSelectionModal 汎用化

#### 2.1 ファイルリネームと修正

**元ファイル**: `DecemberShiftSelectionModal.tsx` (200行)
**新ファイル**: `ShiftSelectionModal.tsx`

**変更点**:

| 行番号 | 変更前 | 変更後 |
|--------|--------|--------|
| 7-12 | `DecemberShiftSelectionModalProps` | `ShiftSelectionModalProps` に変更、`year`, `month` props追加 |
| 14 | `export function DecemberShiftSelectionModal` | `export function ShiftSelectionModal` |
| 34-37 | `s.month === 12` | `s.year === year && s.month === month` |
| 68 | `12月シフト生成` | `${month}月シフト生成` |
| 148 | `保存済みの12月シフト` | `保存済みの${month}月シフト` |

**新しいProps**:
```typescript
interface ShiftSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNew: () => void;
  onSelectExisting: (shiftId: number) => void;
  year: number;   // 追加
  month: number;  // 追加
}
```

---

### Phase 3: ShiftGeneration 汎用化

#### 3.1 ファイルリネームと主要変更

**元ファイル**: `DecemberShiftGeneration.tsx` (2,871行)
**新ファイル**: `ShiftGeneration.tsx`

#### 3.2 定数の動的化

**削除する定数** (行8-11):
```typescript
// 削除
const START_DATE = new Date(2025, 11, 1);
const END_DATE = new Date(2026, 0, 5);
```

**Propsの変更** (行516-518):
```typescript
// 変更前
interface DecemberShiftGenerationProps {
  initialShiftId?: number | null;
}

// 変更後
interface ShiftGenerationProps {
  year: number;
  month: number;
  initialShiftId?: number | null;
}
```

#### 3.3 日付範囲の動的生成

**関数追加** (行156付近):
```typescript
// 月の日付範囲を生成（月末まで + 翌月5日まで）
const getMonthDateRange = (year: number, month: number) => {
  const startDate = new Date(year, month - 1, 1);
  // 翌月5日まで（夜勤の関係で）
  const endDate = new Date(year, month, 5);
  return { startDate, endDate };
};
```

**state変更** (行522-523):
```typescript
// 変更前
const [dates] = useState(generateDateRange(START_DATE, END_DATE));
const [staffList] = useState(STAFF_RAW_DATA);

// 変更後
const { startDate, endDate } = useMemo(() => getMonthDateRange(year, month), [year, month]);
const [dates] = useState(() => generateDateRange(startDate, endDate));
const [staffList, setStaffList] = useState<any[]>([]);
const [isLoadingStaff, setIsLoadingStaff] = useState(true);
```

#### 3.4 職員データのDB取得

**useEffect追加** (行712付近、初期シフトデータ読み込みの前):
```typescript
// 職員データの読み込み
useEffect(() => {
  const loadStaffData = async () => {
    try {
      setIsLoadingStaff(true);
      const employees = await trpcClient.employees.list.query();

      // 表示順でソート
      const sorted = [...employees].sort((a, b) =>
        (a.displayOrder || 0) - (b.displayOrder || 0)
      );

      // DecemberShiftGenerationの形式に変換
      const staffData = sorted.map(emp => ({
        id: emp.id.toString(),
        name: emp.name,
        role: emp.positionGroup?.name || 'staff',
        qualification: emp.positionGroup?.name || '',
        schedule: {},  // 希望休・勤務希望から後で設定
        constraints: {
          defaultShift: '9～18',  // TODO: employeeから取得可能にする
          breakTime: 1,
        },
      }));

      setStaffList(staffData);
    } catch (error) {
      console.error('Failed to load staff data:', error);
      toast.error('職員データの読み込みに失敗しました');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  loadStaffData();
}, []);
```

#### 3.5 希望休・勤務希望の自動反映

**useEffect追加** (職員データ読み込みの後):
```typescript
// 希望休・勤務希望の読み込みと反映
useEffect(() => {
  if (staffList.length === 0 || isLoadingStaff) return;

  const loadPreferences = async () => {
    try {
      const startDateStr = getIsoDate(startDate);
      const endDateStr = getIsoDate(endDate);

      // 希望休を取得
      const leaveRequests = await trpcClient.leaveRequests.getByDateRange.query({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      // 勤務希望を取得
      const workPrefs = await trpcClient.workPreferences.getByDateRange.query({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      // shifts stateに反映
      const newShifts: any = { ...shifts };

      // 希望休を反映（ロック状態で）
      for (const req of leaveRequests) {
        const staff = staffList.find(s => s.name === req.employee?.name);
        if (!staff) continue;

        // 日付範囲をループ
        const reqStart = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);
        for (let d = new Date(reqStart); d <= reqEnd; d.setDate(d.getDate() + 1)) {
          const key = `${staff.id}_${getIsoDate(d)}`;
          newShifts[key] = {
            type: 'OFF',
            customText: req.leaveType || '休',
            isLocked: true,  // ロック
            editedInActualMode: false,
          };
        }
      }

      // 勤務希望を反映（ロック状態で）
      for (const pref of workPrefs) {
        const staff = staffList.find(s => s.name === pref.employee?.name);
        if (!staff) continue;

        const prefStart = new Date(pref.startDate);
        const prefEnd = new Date(pref.endDate);
        for (let d = new Date(prefStart); d <= prefEnd; d.setDate(d.getDate() + 1)) {
          const key = `${staff.id}_${getIsoDate(d)}`;
          // 時間を "9～15" 形式に変換
          const startHour = parseInt(pref.startTime.split(':')[0]);
          const endHour = parseInt(pref.endTime.split(':')[0]);
          const customText = `${startHour}～${endHour}`;

          newShifts[key] = {
            type: 'WORK',
            customText: customText,
            isLocked: true,  // ロック
            editedInActualMode: false,
          };
        }
      }

      setShifts(newShifts);
      setOriginalShifts(JSON.parse(JSON.stringify(newShifts)));

      const totalLocked = leaveRequests.length + workPrefs.length;
      if (totalLocked > 0) {
        toast.info(`${totalLocked}件の希望休・勤務希望を反映しました`);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  // 新規作成時のみ（initialShiftIdがない場合）
  if (!initialShiftId) {
    loadPreferences();
  }
}, [staffList, isLoadingStaff, startDate, endDate, initialShiftId]);
```

#### 3.6 ハードコード定数の削除/移動

**削除対象** (行17-127):
- `FULL_TIME_STAFF_IDS` → positionGroupから判定に変更
- `CLERK_STAFF_ID` → employee.isOfficeStaffから判定
- `ADMIN_STAFF_IDS` → positionGroupから判定
- `REQUIRED_STAFF_BY_DAY` → requiredStaffingテーブルから取得に変更（将来）
- `STAFF_RAW_DATA` → DBから取得に変更

**暫定対応**: 上記定数は一旦残し、コメントで「TODO: DBから取得に変更」と記載

#### 3.7 保存名の動的化

**変更** (行706-707):
```typescript
// 変更前
const defaultName = `12月シフト_${new Date()...}`;

// 変更後
const defaultName = `${month}月シフト_${new Date()...}`;
```

---

### Phase 4: ShiftYearlyView 修正

#### 4.1 全月で選択モーダルを表示

**変更** (行66-117):
```typescript
// 変更後
const handleCardClick = async (card: MonthCardData) => {
  // 全ての月で選択モーダルを表示
  if (onMonthClick) {
    onMonthClick(selectedYear, card.month, card.shift?.id || null);
  }
};
```

**Propsの変更**:
```typescript
interface ShiftYearlyViewProps {
  onMonthClick?: (year: number, month: number, existingShiftId: number | null) => void;
}
```

---

### Phase 5: AdminApp.tsx 修正

#### 5.1 状態管理の変更

**追加** (行62付近):
```typescript
const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
const [isShiftSelectionModalOpen, setIsShiftSelectionModalOpen] = useState(false);
```

#### 5.2 ハンドラーの変更

**変更** (行79-94):
```typescript
// 月クリック時のハンドラー
const handleMonthClick = (year: number, month: number, existingShiftId: number | null) => {
  setSelectedYear(year);
  setSelectedMonth(month);
  if (existingShiftId) {
    setSelectedDecemberShiftId(existingShiftId);
  } else {
    setSelectedDecemberShiftId(null);
  }
  setIsShiftSelectionModalOpen(true);
};

// 新規作成
const handleShiftNew = () => {
  setSelectedDecemberShiftId(null);
  setAdminView("shift-generation");
  setIsShiftSelectionModalOpen(false);
};

// 既存データから作成
const handleShiftExisting = (shiftId: number) => {
  setSelectedDecemberShiftId(shiftId);
  setAdminView("shift-generation");
  setIsShiftSelectionModalOpen(false);
};
```

#### 5.3 renderAdminView の変更

**変更** (行114-126):
```typescript
case "shifts":
  return <ShiftYearlyView onMonthClick={handleMonthClick} />;
case "shift-generation":  // "december-shift-generation" から変更
  return (
    <ShiftGeneration
      year={selectedYear}
      month={selectedMonth}
      initialShiftId={selectedDecemberShiftId}
    />
  );
```

#### 5.4 サイドバーの変更

**削除** (行253-260): 「12月シフト生成」ボタンを削除

#### 5.5 モーダルの変更

**変更** (行349-356):
```typescript
<ShiftSelectionModal
  isOpen={isShiftSelectionModalOpen}
  onClose={() => setIsShiftSelectionModalOpen(false)}
  onSelectNew={handleShiftNew}
  onSelectExisting={handleShiftExisting}
  year={selectedYear}
  month={selectedMonth}
/>
```

#### 5.6 インポートの変更

**変更** (行29-30):
```typescript
// 変更前
import { DecemberShiftGeneration } from "./components/DecemberShiftGeneration";
import { DecemberShiftSelectionModal } from "./components/DecemberShiftSelectionModal";

// 変更後
import { ShiftGeneration } from "./components/ShiftGeneration";
import { ShiftSelectionModal } from "./components/ShiftSelectionModal";
```

#### 5.7 AdminView型の変更

**変更** (行33-50):
```typescript
type AdminView =
  | "dashboard"
  | "employees"
  | "position-groups"
  | "work-time-slots"
  | "workplace-rules"
  | "required-staffing"
  | "facility-events"
  | "shifts"
  | "shift-generation"    // "december-shift-generation" から変更
  | "leave-requests"
  | "work-preferences"
  | "change-proposals"
  | "statistics"
  | "emergency-notifications"
  | "archive"
  | "server-management";
```

---

## 実装順序チェックリスト

### Phase 1: サーバーサイド
- [ ] 1.1 `db.ts` に `getLeaveRequestsByDateRange` 追加
- [ ] 1.2 `db.ts` に `getWorkPreferencesByDateRange` 追加
- [ ] 1.3 `routers.ts` に `leaveRequests.getByDateRange` 追加
- [ ] 1.4 `routers.ts` に `workPreferences.getByDateRange` 追加
- [ ] 1.5 サーバー再起動してテスト

### Phase 2: ShiftSelectionModal
- [ ] 2.1 `DecemberShiftSelectionModal.tsx` を `ShiftSelectionModal.tsx` にリネーム
- [ ] 2.2 Props に `year`, `month` 追加
- [ ] 2.3 月名表示を動的化
- [ ] 2.4 シフトフィルタリングを年月対応

### Phase 3: ShiftGeneration
- [ ] 3.1 `DecemberShiftGeneration.tsx` を `ShiftGeneration.tsx` にリネーム
- [ ] 3.2 Props に `year`, `month` 追加
- [ ] 3.3 日付範囲を動的生成に変更
- [ ] 3.4 職員データをDB取得に変更
- [ ] 3.5 希望休・勤務希望の自動反映を追加
- [ ] 3.6 保存名を動的化
- [ ] 3.7 ハードコード定数に TODO コメント追加

### Phase 4: ShiftYearlyView
- [ ] 4.1 Props を `onMonthClick` に変更
- [ ] 4.2 全月で統一動作に変更

### Phase 5: AdminApp
- [ ] 5.1 状態管理を更新
- [ ] 5.2 ハンドラーを更新
- [ ] 5.3 renderAdminView を更新
- [ ] 5.4 サイドバーから「12月シフト生成」削除
- [ ] 5.5 インポートを更新
- [ ] 5.6 AdminView 型を更新

### Phase 6: クリーンアップ
- [ ] 6.1 不要ファイル削除確認
- [ ] 6.2 ビルドテスト
- [ ] 6.3 動作確認

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| 職員名でのマッチングが失敗する | employee.idでマッチングに移行（将来） |
| AI生成ロジックが月固有 | 一旦ハードコードを残し、段階的に汎用化 |
| 希望休が複数日にまたがる | 日付ループで各日に反映 |
| 既存12月データとの互換性 | 既存の読み込みロジックは維持 |

---

## テスト項目

1. **新規シフト作成**
   - 1月〜12月全ての月で新規作成可能
   - 選択モーダルが正しく表示される

2. **希望休反映**
   - DBに登録された希望休がロックセルとして表示
   - 複数日の希望休が正しく反映

3. **勤務希望反映**
   - DBに登録された勤務希望がロックセルとして表示
   - 時間が「9～15」形式で表示

4. **過去データ読み込み**
   - 既存シフトを選択して読み込み可能
   - ロック状態が正しく復元

5. **保存**
   - 新規保存・上書き保存が正常動作
   - 希望休由来のセルが `isLocked: true` で保存

---

作成日: 2025-12-01
