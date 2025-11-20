# シフト生成プロセス分析と改善提案

## 現在のシフト生成工程

### 1. データの流れ

```
1. 職員の希望休・勤務希望入力
   ├── leaveRequests（希望休）: 休み、有休、夏季休暇、冬季休暇
   └── workPreferences（勤務希望）: 時間指定勤務、夜勤など

2. シフトステータスの遷移
   vacation_only（希望休入力済み）
   ↓
   draft（下書き）/ ai_generated（AI生成）
   ↓
   tentative（仮確定）
   ↓
   confirmed（確定）
   ↓
   actual（実績）
   ↓
   archived（アーカイブ）
```

### 2. 現在の生成ロジック（phaseBasedShiftGenerator）

#### Phase 1: ハード制約の確定
```typescript
// server/phaseBasedShiftGenerator.ts:36-110
phase1_confirmHardConstraints():
  - 希望休（leaveRequests）を「requested_off」として確定
  - 時間指定勤務希望（workPreferences）を「working」として配置
```

#### Phase 2: 勤務可能枠の計算
```typescript
// server/phaseBasedShiftGenerator.ts:124-246
phase2_calculateAvailability():
  - 各職員・各日付の勤務可能性を判定
  - workableDays（曜日別勤務可否）考慮
  - 連続勤務制限チェック（最大4日）
```

#### Phase 3: ルールベース配置
```typescript
// server/phaseBasedShiftGenerator.ts:249-1090
phase3_ruleBasedAssignment():
  1. 固定シフト配置（weeklyFixed、workPreferences）
  2. 夜勤の優先配置
  3. 必要人数充足のための配置
  4. 最小勤務日数確保
```

## 問題点の特定

### 1. 希望休の扱いが不明確
**問題**: 承認済み（approved）の希望休が固定データとして扱われていない
- 現状: AI生成やリセット時に希望休も消えてしまう可能性
- 期待: 承認済み希望休は変更不可の固定データ

### 2. 勤務希望の種類が混在
**問題**: 異なる性質のデータが同じテーブルに混在
```
workPreferences に含まれるもの:
- 時間指定勤務（9:00-14:00など）→ 勤務扱い
- 夜勤（16:00-10:00）→ 勤務扱い
- 明け → 勤務扱い（夜勤明けの休息時間）

これらはすべて「勤務」として扱うべきだが、名前が「希望休」と混同しやすい
```

### 3. 研修の扱いが不明確
**問題**: 研修（PM研修、研修1日）の処理方法が未定義
- 勤務人数にカウントしない
- 表示時は「!」アイコンで別扱い
- 現在のシステムに研修用のフラグやタイプがない

### 4. リセット機能の範囲が不明確
**問題**: どのデータをリセットするか明確でない
- リセット対象: AI生成、段階的生成、手作業のシフト
- リセット非対象: 承認済み希望休、承認済み勤務希望

### 5. 連続勤務制限の計算が複雑
**問題**: 夜勤の扱いが特殊
- 夜勤入り〜夜勤明け = 2連勤扱い
- 通常の連続勤務制限（4日）と組み合わせた判定が複雑

## 改善提案

### 1. データモデルの再構成

```sql
-- 希望休テーブル（固定データ）
leaveRequests:
  - status: 'approved' → 固定（変更不可）
  - status: 'pending' → 仮（変更可能）
  - leaveType: '休', '有休', '夏', '冬'

-- 勤務希望テーブル（固定データ）
workPreferences:
  - status: 'approved' → 固定（変更不可）
  - preferenceType: 'time_specified', 'night_shift', 'training' (新規追加)
  - isCountAsStaff: boolean (研修時はfalse)

-- シフト詳細テーブル（生成データ）
shiftDetails:
  - generatedBy: 'leave_request', 'work_preference', 'rule_based', 'ai_generated', 'manual'
  - isFixed: boolean (希望休・勤務希望由来の場合true)
```

### 2. シフト生成プロセスの改善

```typescript
// 新しい生成フロー
async function generateShiftImproved(shiftId: number, year: number, month: number) {
  // Step 1: 固定データの読み込み
  const fixedConstraints = await loadFixedConstraints(shiftId);
  // - approved状態のleaveRequests
  // - approved状態のworkPreferences

  // Step 2: 固定シフトの生成（変更不可）
  const fixedShifts = generateFixedShifts(fixedConstraints);

  // Step 3: 勤務可能枠の計算（固定シフトを考慮）
  const availability = calculateAvailability(fixedShifts);

  // Step 4: AI/ルールベース生成（固定シフト以外）
  const generatedShifts = generateFlexibleShifts(availability);

  // Step 5: 統合（固定 + 生成）
  return mergeShifts(fixedShifts, generatedShifts);
}
```

### 3. リセット機能の実装

```typescript
async function resetShifts(shiftId: number, options: {
  keepApprovedRequests: boolean = true,
  keepManualEdits: boolean = false
}) {
  if (options.keepApprovedRequests) {
    // approved状態の希望休・勤務希望由来のシフトは削除しない
    await db.delete(shiftDetails).where(
      and(
        eq(shiftDetails.shiftId, shiftId),
        not(eq(shiftDetails.isFixed, true))
      )
    );
  } else {
    // すべて削除
    await db.delete(shiftDetails).where(
      eq(shiftDetails.shiftId, shiftId)
    );
  }
}
```

### 4. 研修データの管理

```typescript
// workPreferencesテーブルに列追加
ALTER TABLE workPreferences ADD COLUMN preferenceType ENUM('time_specified', 'night_shift', 'training', 'post_night') DEFAULT 'time_specified';
ALTER TABLE workPreferences ADD COLUMN isCountAsStaff BOOLEAN DEFAULT TRUE;

// 研修登録時
await db.insert(workPreferences).values({
  employeeId: employee.id,
  startDate: '2024-12-15',
  endDate: '2024-12-15',
  startTime: '13:00',
  endTime: '17:00',
  preferenceType: 'training',
  isCountAsStaff: false,
  reason: 'PM研修',
  status: 'approved'
});
```

### 5. UI改善案

#### 希望休管理タブ
```
【希望休管理】
┌─────────────────────────────────┐
│ 12月の希望休・勤務希望一覧       │
├─────────────────────────────────┤
│ ■ 固定データ（承認済み）        │
│   - 岩崎: 12/5(休), 12/24(休)   │
│   - 髙野: 12/11(夜勤), 12/24(夜勤)│
│                                  │
│ □ 仮データ（未承認）            │
│   - なし                         │
├─────────────────────────────────┤
│ [一括承認] [個別編集] [CSVエクスポート] │
└─────────────────────────────────┘
```

#### シフト生成画面
```
【シフト生成】
┌─────────────────────────────────┐
│ 生成オプション                   │
├─────────────────────────────────┤
│ ☑ 承認済み希望休を固定          │
│ ☑ 承認済み勤務希望を固定        │
│ ☐ 手動編集を保持                │
├─────────────────────────────────┤
│ 生成方法:                        │
│ ○ 段階的生成（推奨）            │
│ ○ AI生成                        │
│ ○ 手動作成                      │
├─────────────────────────────────┤
│ [生成開始] [リセット]            │
└─────────────────────────────────┘
```

## 実装優先順位

1. **高優先度**（即座に対応）
   - 承認済み希望休・勤務希望を固定データとして扱う
   - リセット機能で固定データを保護
   - 希望休管理画面の実装

2. **中優先度**（次のステップ）
   - 研修データの別管理（preferenceType追加）
   - 勤務人数カウントの修正
   - UI表示の改善（!アイコン等）

3. **低優先度**（将来的に）
   - 連続勤務制限ロジックの簡潔化
   - パフォーマンス最適化
   - 詳細なログ出力

## まとめ

現在のシステムの主な問題は、**承認済みデータと生成データの区別が不明確**なことです。これにより：
- 希望休が意図せず消える
- リセット範囲が不明確
- 生成時に固定すべきデータが変更される

解決策として、データに「固定フラグ（isFixed）」を追加し、承認済みの希望休・勤務希望は変更不可として扱うことを推奨します。