# 優先度付き実装タスク詳細リスト

## タスク一覧（優先度順）

### フェーズ 1: CRITICAL セキュリティ・データ損失対策
**実装期間**: Week 1 (15-20時間)  
**必須度**: 本番化前に必ず実装  

---

### T1-1: 管理者権限チェック (2-4時間)

**優先度**: CRITICAL  
**影響**: セキュリティ（職員が管理機能を実行可能）  
**ファイル**: `server/routers.ts`  

**現状コード（❌ 問題あり）**:
```typescript
positionGroups: router({
  create: protectedProcedure  // ← 職員も実行可能！
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      return await db.createPositionGroup(input);
    }),
})
```

**修正対象エンドポイント** (15個):
- positionGroups.create/update/delete
- employees.create/update/delete
- workTimeSlots.create/update/delete
- workplaceRules.create/update/delete
- requiredStaffing.upsert
- shifts.create/update/delete/generateAI
- leaveRequests.approve/reject/approveAllForShift
- changeProposals.approve/reject

**修正コード（✓ 修正後）**:
```typescript
create: adminProcedure  // ← adminProcedure に変更
  .input(z.object({ name: z.string() }))
  .mutation(async ({ input }) => {
    return await db.createPositionGroup(input);
  }),
```

**テスト項目**:
- [ ] 職員が adminProcedure エンドポイント呼び出し → FORBIDDEN
- [ ] 管理者が adminProcedure エンドポイント呼び出し → 成功

---

### T1-2: 職員データアクセス制御 (2-3時間)

**優先度**: CRITICAL  
**影響**: 情報漏洩（他人の希望休・シフト参照可能）  
**ファイル**: `server/routers.ts`, `server/db.ts`  

**現状コード（❌ 問題あり）**:
```typescript
getByEmployee: protectedProcedure
  .input(z.object({ employeeId: z.number() }))
  .query(async ({ input }) => {
    // employeeId チェックなし → 他人のデータも取得可能！
    return await db.getLeaveRequestsByEmployee(input.employeeId);
  }),
```

**修正対象エンドポイント** (3個):
- leaveRequests.getByEmployee
- shiftDetails.getByEmployee
- その他の個人データ取得

**修正コード（✓ 修正後）**:
```typescript
getByEmployee: protectedProcedure
  .input(z.object({ employeeId: z.number() }))
  .query(async ({ input, ctx }) => {
    // 本人またはadminのみアクセス可能
    const employee = await db.getEmployeeById(input.employeeId);
    
    if (!employee) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Employee not found" });
    }

    // 本人確認: 職員は自分のデータのみアクセス可能
    if (ctx.user.role !== 'admin' && ctx.user.id !== employee.userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot access other's data" });
    }

    return await db.getLeaveRequestsByEmployee(input.employeeId);
  }),
```

**テスト項目**:
- [ ] 職員A が職員B のデータ要求 → FORBIDDEN
- [ ] 職員A が自分のデータ要求 → 成功
- [ ] 管理者がデータ要求 → 成功

---

### T1-3: 変更提案の自己承認防止 (2-3時間)

**優先度**: CRITICAL  
**影響**: ワークフロー破壊（職員が自分の提案を承認可能）  
**ファイル**: `server/routers.ts`, `server/db.ts`  

**現状コード（❌ 問題あり）**:
```typescript
approve: protectedProcedure  // ← protectedProcedure なので職員も実行可能
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    return await db.updateChangeProposal(input.id, { status: "approved" });
  }),
```

**修正コード（✓ 修正後）**:
```typescript
approve: adminProcedure  // ← adminProcedure に変更（管理者のみ）
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input, ctx }) => {
    const proposal = await db.getChangeProposalById(input.id);
    
    if (!proposal) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
    }

    // トランザクションで原子的に実行
    const db = await getDb();
    await db.transaction(async (tx) => {
      // 1. 提案を承認
      await db.updateChangeProposal(input.id, { status: "approved" });
      
      // 2. 提案の内容をシフト詳細に反映
      const shiftDetail = await db.getShiftDetailById(proposal.shiftDetailId);
      await db.updateShiftDetail(shiftDetail.id, {
        timeSlotId: proposal.proposedTimeSlotId,
        isChanged: true,
        previousTimeSlotId: shiftDetail.timeSlotId,
      });
    });

    // 3. 監査ログに記録
    await db.logAuditAction({
      userId: ctx.user.id,
      action: 'PROPOSAL_APPROVED',
      target: `proposal:${input.id}`,
    });

    return { success: true };
  }),
```

**テスト項目**:
- [ ] 提案者が自分の提案を承認 → FORBIDDEN
- [ ] 管理者が提案を承認 → 成功、シフト反映確認
- [ ] 承認後、複数回承認は不可

---

### T1-4: 外部キー制約の追加 (2-3時間)

**優先度**: CRITICAL  
**影響**: データ整合性（職員削除後、シフト・希望休が孤立）  
**ファイル**: `drizzle/schema.ts`  

**現状コード（❌ 制約なし）**:
```typescript
export const shiftDetails = mysqlTable("shiftDetails", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),  // ← 参照先が削除されても残る
  employeeId: int("employeeId").notNull(),  // ← 参照先が削除されても残る
  // ...
});
```

**修正コード（✓ 制約追加）**:
```typescript
export const shiftDetails = mysqlTable("shiftDetails", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId")
    .notNull()
    .references(() => shifts.id, { onDelete: 'cascade' }),  // ← CASCADE
  employeeId: int("employeeId")
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),  // ← CASCADE
  timeSlotId: int("timeSlotId")
    .references(() => workTimeSlots.id, { onDelete: 'set null' }),  // ← SET NULL
  // ...
});

export const leaveRequests = mysqlTable("leaveRequests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId")
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),  // ← CASCADE
  shiftId: int("shiftId")
    .references(() => shifts.id, { onDelete: 'set null' }),  // ← SET NULL
  // ...
});
```

**実行手順**:
```bash
# 1. スキーマ修正
# ↑ 上記の修正を適用

# 2. マイグレーション生成
pnpm drizzle-kit generate

# 3. マイグレーション実行
pnpm drizzle-kit migrate

# 4. テスト
pnpm test:db
```

**テスト項目**:
- [ ] 職員削除 → 関連 shiftDetails 自動削除確認
- [ ] 職員削除 → 関連 leaveRequests 自動削除確認
- [ ] shift 削除 → 関連 shiftDetails 自動削除確認
- [ ] workTimeSlot 削除 → 関連 shiftDetails の timeSlotId が NULL になることを確認

---

## フェーズ 2: HIGH 優先度・業務フロー保護
**実装期間**: Week 1-2 (5-10時間)  

### T2-1: ステータス遷移検証 ✓ 実装済み

**状態**: routers.ts 295-318行で実装済み  
**検証内容**: draft → tentative → tentative_revised → confirmed → actual → archived

```typescript
const allowedTransitions: Record<string, string[]> = {
  'draft': ['tentative'],
  'tentative': ['tentative_revised', 'confirmed'],
  'tentative_revised': ['confirmed'],
  'confirmed': ['actual'],
  'actual': ['archived'],
  'archived': [],
};
```

---

### T2-2: 希望休締切のサーバー側検証 ✓ 実装済み

**状態**: routers.ts 456-483行で実装済み  
**検証内容**: 締切を超過した希望休申請を拒否

```typescript
if (!input.isAdditional && shift.leaveRequestDeadline) {
  const deadline = new Date(shift.leaveRequestDeadline);
  const now = new Date();
  if (now > deadline) {
    throw new Error(`希望休の締切を過ぎています`);
  }
}
```

---

### T2-3: エラーハンドリング改善 (3-4時間)

**優先度**: HIGH  
**影響**: UX（エラーが表示されない）  
**対象**: 複数コンポーネント  

**修正内容**:

1. **aiShiftGenerator.ts (112行)**
   ```typescript
   // ❌ 現在
   } catch (error: any) {
     console.error("[AIシフト生成] エラー:", error);
     // throw なし → フロント側に通知されない
   }

   // ✓ 修正後
   } catch (error: any) {
     console.error("[AIシフト生成] エラー:", error);
     throw new TRPCError({
       code: "INTERNAL_SERVER_ERROR",
       message: "シフト生成に失敗しました。管理者に連絡してください。",
     });
   }
   ```

2. **db.ts (getDb 関数)**
   ```typescript
   // ❌ 現在
   if (!_db && process.env.DATABASE_URL) {
     try {
       _db = drizzle(process.env.DATABASE_URL);
     } catch (error) {
       console.warn("[Database] Failed to connect:", error);
       _db = null;  // ← null を返す → API が undefined 返却
     }
   }

   // ✓ 修正後
   if (!_db && process.env.DATABASE_URL) {
     try {
       _db = drizzle(process.env.DATABASE_URL);
     } catch (error) {
       console.error("[Database] Failed to connect:", error);
       throw new TRPCError({
         code: "INTERNAL_SERVER_ERROR",
         message: "データベース接続エラー",
       });
     }
   }
   ```

3. **Statistics.tsx**
   ```typescript
   // ✓ 修正後：API エラーハンドリング
   useEffect(() => {
     async function loadStatistics() {
       try {
         const data = await statisticsService.getStats();
         setStatistics(data);
       } catch (error) {
         console.error("統計データ取得エラー:", error);
         toast.error("統計データの取得に失敗しました");
       } finally {
         setIsLoading(false);
       }
     }
     loadStatistics();
   }, []);
   ```

---

### T2-4: ロール別APIアクセステスト (1-2時間)

**優先度**: HIGH  
**内容**: 権限チェックが正しく機能していることを確認  

**テストケース**:
```typescript
// 例：職員は管理者エンドポイントにアクセスできないこと
describe('Role-based access control', () => {
  it('should reject employee accessing admin endpoints', async () => {
    const employeeCtx = { user: { id: 1, role: 'user' } };
    
    await expect(
      positionGroups.create({ ...employeeCtx }, { name: 'Test' })
    ).rejects.toThrow('FORBIDDEN');
  });

  it('should allow admin accessing admin endpoints', async () => {
    const adminCtx = { user: { id: 1, role: 'admin' } };
    
    const result = await positionGroups.create(
      adminCtx,
      { name: 'Test' }
    );
    expect(result).toBeDefined();
  });
});
```

---

## フェーズ 3: MEDIUM 優先度・機能統合
**実装期間**: Week 2-3 (20-30時間)  

### T3-1: モック実装からの移行 (8-12時間)

**優先度**: MEDIUM-HIGH  
**対象コンポーネント**: Statistics, EmployeeHome など  

#### Statistics.tsx → API連携
```typescript
// ❌ 現在
const mockEmployeeStats: EmployeeStats[] = [
  { employeeId: "EMP001", workDays: 22 },
  // ...
];

// ✓ 修正後
const [stats, setStats] = useState<EmployeeStats[]>([]);

useEffect(() => {
  async function loadStats() {
    try {
      const data = await statisticsService.getEmployeeStats(year, month);
      setStats(data);
    } catch (error) {
      toast.error("統計データ取得失敗");
    }
  }
  loadStats();
}, [year, month]);
```

#### EmployeeHome.tsx → nextShift API連携
```typescript
// ✓ 修正後
const [nextShift, setNextShift] = useState<Shift | null>(null);

useEffect(() => {
  async function loadNextShift() {
    try {
      const shift = await shiftService.getNextShift(employeeId);
      setNextShift(shift);
    } catch (error) {
      console.error("シフト情報取得失敗", error);
    }
  }
  loadNextShift();
}, [employeeId]);
```

---

### T3-2: コンポーネント分割 (6-8時間)

**優先度**: MEDIUM  
**対象**: ShiftEditor.tsx (1434行) など  

**分割案**:
```
ShiftEditor.tsx (1434行) 
  ├─ ShiftCalendarView.tsx (300行)
  ├─ ShiftTableView.tsx (350行)
  ├─ ShiftAddDialog.tsx (250行)
  └─ AIGenerationPanel.tsx (200行)
```

---

### T3-3: テスト整備 (8-12時間)

**フレームワーク**: Vitest + Playwright  

**対象**:
- aiShiftGenerator.ts （ユニット）
- routers.ts （統合）
- コンポーネント（E2E）

---

### T3-4: ドキュメント整備 (6-8時間)

**作成予定**:
1. API ドキュメント (OpenAPI)
2. DB スキーマガイド
3. コンポーネント設計
4. トラブルシューティング

---

## 実装スケジュール

```
Week 1
  Monday:   T1-1 (4-7時間) - 管理者権限チェック
  Tuesday:  T1-2, T1-3 (4-6時間) - データアクセス制御
  Wed-Thu:  T1-4 (2-3時間) - FK制約 + テスト
  Friday:   統合テスト・リリース準備

Week 2-3
  Monday:   T3-1 (8-12時間) - モック移行
  Tue-Wed:  T3-2 (6-8時間) - コンポーネント分割
  Thu-Fri:  T2-3, T2-4 (4-6時間) - エラーハンドリング

Week 4+
  T3-3, T3-4, T4-* (継続的改善)
```

---

## チェックリスト

本番化前:
- [ ] T1-1: adminProcedure 置換完了
- [ ] T1-2: 職員データアクセス制御実装
- [ ] T1-3: 変更提案自己承認防止
- [ ] T1-4: 外部キー制約追加・マイグレーション実行
- [ ] T2-3: エラーハンドリング改善
- [ ] T2-4: テスト実行確認

本番化3ヶ月内:
- [ ] T3-1: モック実装移行
- [ ] T3-2: コンポーネント分割
- [ ] T3-3: テスト整備（70%以上カバレッジ）
- [ ] T3-4: ドキュメント完成

