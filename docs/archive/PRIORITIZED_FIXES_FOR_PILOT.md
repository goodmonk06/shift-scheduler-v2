# パイロット施設向け優先修正リスト

## 前提条件（モデル施設での運用）

1. **管理者は1名のみ** - 複数管理者による同時編集なし
2. **職員は管理者ログインしない** - 管理者パスワードは厳重管理
3. **本番商用版ではない** - モデル施設での試験導入

## 修正不要な問題（前提条件により回避）

### ❌ 修正不要: 管理者権限チェック（CRITICAL #1, #2）
**理由**: 職員が管理者ログインすることはない前提
- 管理者パスワードを厳重に管理すれば問題なし
- 職員は管理画面にアクセスできない

### ❌ 修正不要: 楽観的ロック（CRITICAL #7）
**理由**: 管理者は1名のみ
- 同時編集の競合は発生しない
- 複数管理者がいる場合のみ必要

### ❌ 修正不要: 職員が他職員データにアクセス（CRITICAL #3）
**理由**: 職員同士が互いのデータを見ても問題ない運用
- 希望休は職員間で調整が必要な場合がある
- シフトは全員に公開されている
- **ただし**: 個人情報保護が必要な場合は修正が必要

## 🔴 必須修正（データ損失リスク）

### 1. CRITICAL: AIシフト生成のトランザクション化
**問題**:
```typescript
// 現在の処理
await db.delete(shiftDetails).where(...);  // ステップ1: 既存シフト削除
// もしここでエラーが起きたら？
await db.insert(shiftDetails).values(...); // ステップ2: 新シフト挿入
```

**リスク**:
- 削除成功 → 挿入失敗 = **手動で作ったシフトが永久に失われる**
- ネットワーク切断、サーバークラッシュ、データベースエラーで発生

**修正**: トランザクション化
```typescript
await db.transaction(async (tx) => {
  // すべての操作が成功するか、すべて失敗するか
  await tx.delete(shiftDetails).where(...);
  await tx.insert(shiftDetails).values(...);
});
```

**修正時間**: 3-4時間
**優先度**: 🔴 最優先（データ損失の直接原因）

---

### 2. CRITICAL: 外部キー制約の追加
**問題**:
```typescript
// 職員を削除
await db.delete(employees).where(eq(employees.id, 5));

// しかし、その職員のシフトは残ったまま
// → UI表示時にエラー「職員ID:5が見つかりません」
```

**リスク**:
- 職員削除後、そのシフト・希望休が孤立レコードとして残る
- UIが壊れる、エラーが出る
- データの整合性が崩れる

**修正**: 外部キー制約 + CASCADE DELETE
```sql
ALTER TABLE shiftDetails
ADD CONSTRAINT fk_employee
FOREIGN KEY (employeeId) REFERENCES employees(id)
ON DELETE CASCADE;
```

**修正時間**: 2-3時間（マイグレーション含む）
**優先度**: 🔴 高（データ整合性の根本）

---

### 3. HIGH: シフトステータス遷移の検証
**問題**:
```typescript
// 確定済みシフトを下書きに戻せてしまう
await db.update(shifts)
  .set({ status: 'draft' })  // confirmed → draft
  .where(eq(shifts.id, shiftId));
```

**リスク**:
- 確定したシフト（職員に通知済み）が誤って下書きに戻る
- 職員が見ているシフトと実際のシフトが不一致
- アーカイブしたシフトが再編集可能になる

**修正**: ステータス遷移ルール
```typescript
const allowedTransitions = {
  'draft': ['tentative'],
  'tentative': ['tentative_revised', 'confirmed'],
  'tentative_revised': ['confirmed'],
  'confirmed': ['actual'],
  'actual': ['archived'],
  'archived': [], // 変更不可
};
```

**修正時間**: 2-3時間
**優先度**: 🟡 中（業務フロー保護）

---

### 4. MEDIUM: 希望休締切のサーバー側検証
**問題**:
```typescript
// クライアント側でのみチェック（VacationRequest.tsx）
if (new Date() > deadline) {
  alert('締切を過ぎています');
  return;
}

// しかしAPIは直接呼べる
fetch('/api/trpc/leaveRequests.create', {...}); // 通ってしまう
```

**リスク**:
- 技術に詳しい職員が、締切後にAPI直接呼び出しで申請できる
- **ただし**: 管理者が承認しなければ問題ない

**修正**: サーバー側検証
```typescript
// server/routers.ts
create: protectedProcedure.mutation(async ({ input, ctx }) => {
  const shift = await db.select().from(shifts).where(...);
  if (new Date() > new Date(shift.leaveRequestDeadline)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: '締切を過ぎています' });
  }
  // ...
});
```

**修正時間**: 1-2時間
**優先度**: 🟢 低（管理者承認で防げる）

---

## 🟢 修正不要（モックデータ問題）

### ❌ 修正不要: VacationRequest.tsx と ShiftEditor.tsx のモックデータ
**理由**:
- これらは**UIプレビュー用のモックデータ**
- 実際の保存はAPIを通じて行われる
- localStorageはあくまで下書き保存機能

**確認方法**:
```typescript
// VacationRequest.tsx
const handleSubmit = async () => {
  // APIに送信
  await fetch('/api/trpc/leaveRequests.create', {...});
};
```

**ただし**: APIエンドポイントが正しく機能しているか確認が必要

---

## 📋 推奨修正順序（パイロット施設向け）

### フェーズ1: データ損失対策（必須） - 5-7時間

1. **AIシフト生成のトランザクション化** (3-4h)
   - 最優先: シフトが消えるのを防ぐ
   - `server/aiShiftGenerator.ts` 修正

2. **外部キー制約の追加** (2-3h)
   - データ整合性の基盤
   - データベースマイグレーション

### フェーズ2: 業務フロー保護（推奨） - 3-5時間

3. **シフトステータス遷移検証** (2-3h)
   - 確定シフトの誤編集を防ぐ
   - `server/routers.ts` 修正

4. **希望休締切のサーバー側検証** (1-2h)
   - 公平性の担保
   - `server/routers.ts` 修正

### フェーズ3: 将来対応（任意） - 後回し可

5. 監査ログの実装
6. 複数管理者対応（楽観的ロック）
7. 職員データアクセス制御

---

## 🔧 具体的な修正実装

### 1. AIシフト生成のトランザクション化

**ファイル**: `server/aiShiftGenerator.ts`

**修正前**:
```typescript
export async function generateAIShift(config: AIShiftConfig) {
  const db = await getDb();

  // ステップ1: 既存削除
  await db.delete(shiftDetails)
    .where(eq(shiftDetails.shiftId, config.shiftId));

  // ステップ2: AI生成
  const generatedShiftDetails = await callAI(config);

  // ステップ3: 挿入
  await db.insert(shiftDetails).values(generatedShiftDetails);

  // 途中で失敗したら？→ データ損失
}
```

**修正後**:
```typescript
export async function generateAIShift(config: AIShiftConfig) {
  const db = await getDb();

  // トランザクション開始
  try {
    await db.transaction(async (tx) => {
      // すべての操作が成功するか、すべて失敗するか

      // ステップ1: 既存削除
      await tx.delete(shiftDetails)
        .where(eq(shiftDetails.shiftId, config.shiftId));

      // ステップ2: AI生成
      const generatedShiftDetails = await callAI(config);

      // ステップ3: 挿入
      await tx.insert(shiftDetails).values(generatedShiftDetails);

      // ステップ4: シフトステータス更新
      await tx.update(shifts)
        .set({ status: 'tentative' })
        .where(eq(shifts.id, config.shiftId));
    });

    console.log('[AIShift] Generation successful');
  } catch (error) {
    console.error('[AIShift] Generation failed, rolled back:', error);
    throw error; // トランザクション全体がロールバック
  }
}
```

**メリット**:
- エラー時に自動ロールバック（元の状態に戻る）
- データ損失ゼロ
- 中途半端な状態にならない

---

### 2. 外部キー制約の追加

**ファイル**: `drizzle/schema.ts`（修正）+ 新規マイグレーション

**修正前**:
```typescript
export const shiftDetails = mysqlTable("shiftDetails", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(), // 参照先が削除されても残る
  employeeId: int("employeeId").notNull(), // 参照先が削除されても残る
  // ...
});
```

**修正後**:
```typescript
export const shiftDetails = mysqlTable("shiftDetails", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  timeSlotId: int("timeSlotId").references(() => workTimeSlots.id, { onDelete: 'set null' }),
  // ...
});

export const leaveRequests = mysqlTable("leaveRequests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  shiftId: int("shiftId").references(() => shifts.id, { onDelete: 'set null' }),
  // ...
});
```

**マイグレーション実行**:
```bash
# スキーマ変更を生成
pnpm drizzle-kit generate

# マイグレーション実行
pnpm drizzle-kit migrate
```

**メリット**:
- 職員削除時、関連シフトも自動削除
- データの整合性を保証
- UIエラーを防ぐ

---

### 3. シフトステータス遷移検証

**ファイル**: `server/routers.ts`

**追加**:
```typescript
// ステータス遷移ルール
const SHIFT_STATUS_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  'draft': ['tentative'],
  'tentative': ['tentative_revised', 'confirmed'],
  'tentative_revised': ['confirmed'],
  'confirmed': ['actual'],
  'actual': ['archived'],
  'archived': [],
};

function validateStatusTransition(from: ShiftStatus, to: ShiftStatus): boolean {
  const allowed = SHIFT_STATUS_TRANSITIONS[from];
  return allowed.includes(to);
}

// updateStatus のロジック修正
updateStatus: adminProcedure
  .input(z.object({
    id: z.number(),
    status: z.enum(['draft', 'tentative', 'tentative_revised', 'confirmed', 'actual', 'archived']),
  }))
  .mutation(async ({ input, ctx }) => {
    // 現在のステータスを取得
    const currentShift = await ctx.db
      .select()
      .from(schema.shifts)
      .where(eq(schema.shifts.id, input.id))
      .limit(1);

    if (!currentShift.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' });
    }

    const currentStatus = currentShift[0].status;

    // ステータス遷移の検証
    if (!validateStatusTransition(currentStatus, input.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid status transition: ${currentStatus} → ${input.status}`,
      });
    }

    // 更新実行
    await ctx.db
      .update(schema.shifts)
      .set({ status: input.status })
      .where(eq(schema.shifts.id, input.id));

    return { success: true };
  }),
```

---

## 📊 まとめ: パイロット施設で必要な修正

| 問題 | 優先度 | 修正時間 | 理由 |
|------|--------|---------|------|
| AIシフト生成トランザクション | 🔴 必須 | 3-4h | データ損失防止 |
| 外部キー制約 | 🔴 必須 | 2-3h | データ整合性 |
| ステータス遷移検証 | 🟡 推奨 | 2-3h | 業務フロー保護 |
| 締切サーバー検証 | 🟢 任意 | 1-2h | 公平性担保 |

**合計**: 5-7時間（必須のみ）、8-12時間（推奨含む）

---

## ✅ 運用上の注意事項（修正なしで回避）

1. **管理者パスワードの厳重管理**
   - 職員に教えない
   - 定期的に変更

2. **職員削除前の確認**
   - 関連シフトがないか確認
   - アーカイブ済みシフトは保持

3. **重要操作前のバックアップ**
   - シフト確定前にデータベースバックアップ
   - Aivenの自動バックアップ確認

4. **段階的な本番導入**
   - 1ヶ月分のシフトで試験運用
   - 問題なければ通常運用

---

**更新日**: 2025年11月9日
**対象**: パイロット施設（モデル運用）
