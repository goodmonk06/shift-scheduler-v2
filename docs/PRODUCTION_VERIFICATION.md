# 本番環境検証レポート

## 検証日時
2025-11-12

## 検証内容
本番環境でのtRPC実装の一貫性と、REST-style API呼び出しによる400エラーの可能性を確認。

---

## ✅ 修正完了項目

### 1. ダッシュボードAPI (AdminDashboard)
**ステータス**: ✅ 問題なし

**確認内容**:
- `dashboardService.ts`: 既にtRPCクライアント使用 (`trpcClient.dashboard.getStats.query()`)
- `server/routers.ts:848`: Date→ISO文字列変換が正しく実装されている

```typescript
leaveRequestDeadline: currentShift.leaveRequestDeadline
  ? (typeof currentShift.leaveRequestDeadline === 'string'
      ? currentShift.leaveRequestDeadline
      : new Date(currentShift.leaveRequestDeadline).toISOString())
  : null,
```

### 2. 緊急通知API (EmergencyNotifications)
**ステータス**: ✅ 修正済み (前セッション)

**修正内容**:
- `notificationService.ts`: REST-style GET → tRPCクライアント変換済み
- commit: `01bbd6f`

### 3. シフト作成API (ShiftCreation)
**ステータス**: ✅ 修正済み (前セッション)

**修正内容**:
- `z.date()` → `z.string()` + Date変換実装
- insertId問題解決 (year/month一意制約利用)
- commits: `2de9d27`, `6fd7f5c`

### 4. 希望休管理API (VacationManagement)
**ステータス**: ✅ 修正済み (今回)

**修正内容**:
- `leaveRequestService.ts`: REST-style GET/POST → tRPCクライアント変換
- `getSubmissionStatus`: `trpcClient.leaveRequests.getSubmissionStatus.query()`
- `approveAllForShift`: `trpcClient.leaveRequests.approveAllForShift.mutate()`
- commit: `e0d30a0`

### 5. シフト管理API (ShiftList, ShiftEditor)
**ステータス**: ✅ 修正済み (今回)

**修正内容**:
- `shiftService.ts`: 未実装メソッドをtRPCクライアントで実装
- `getCurrentMonthShift()`: `trpcClient.shifts.getCurrentMonth.query()`
- `getShiftByYearMonth()`: `trpcClient.shifts.getCurrentMonth.query()`
- `getShiftById()`: `trpcClient.shifts.getById.query()`
- commit: `e0d30a0`

---

## ⚠️ 潜在的な問題（未使用サービス）

以下のサービスはREST-style fetchを使用していますが、現在本番環境では使用されていない可能性があります。
ただし、将来的に使用された場合は同じ400エラーが発生します。

### 1. vacationService (希望休申請サービス)
**ファイル**: `client/src/services/vacationService.ts`

**状態**: REST-style fetch使用中

**使用箇所**: 確認できず（モックのみ使用の可能性）

**リスク**: 中 - 職員側の希望休申請機能で使用される可能性

**推奨対応**:
```typescript
// 修正例
async getLeaveRequests(filter: GetLeaveRequestsFilter): Promise<LeaveRequest[]> {
  const result = await trpcClient.leaveRequests.getByEmployee.query({
    employeeId: filter.employeeId
  });
  return result || [];
}
```

### 2. authService (認証サービス)
**ファイル**: `client/src/services/authService.ts`

**状態**: REST-style fetch使用中

**使用箇所**: `client/src/App.tsx` (ログイン/ログアウト)

**リスク**: 高 - ログイン機能で使用される

**推奨対応**:
```typescript
// 修正例
async logout(): Promise<void> {
  await trpcClient.auth.logout.mutate();
}

async getCurrentUser(): Promise<User | null> {
  const result = await trpcClient.auth.me.query();
  return result || null;
}
```

### 3. employeeNotificationService (職員通知サービス)
**ファイル**: `client/src/services/employeeNotificationService.ts`

**状態**: REST-style fetch使用中

**使用箇所**: `client/src/components/EmployeeHome.tsx`

**リスク**: 中 - 職員ホーム画面で使用される

**推奨対応**: バックエンドにemployeeNotifications routerが存在するか確認後、tRPC変換

### 4. shiftDetailService (シフト詳細サービス)
**ファイル**: `client/src/services/shiftDetailService.ts`

**状態**: REST-style fetch使用中

**使用箇所**: `client/src/components/EmployeeHome.tsx`

**リスク**: 中 - 職員ホーム画面で使用される

**推奨対応**: バックエンドにshiftDetails routerが存在するか確認後、tRPC変換

---

## 📊 サービス一覧

| サービス名 | tRPC対応 | 使用箇所 | 優先度 |
|-----------|---------|---------|--------|
| dashboardService | ✅ 完了 | AdminDashboard | - |
| notificationService | ✅ 完了 | AdminDashboard | - |
| shiftService | ✅ 完了 | ShiftList, ShiftEditor | - |
| leaveRequestService | ✅ 完了 | VacationManagement | - |
| vacationService | ⚠️ 未対応 | (未使用?) | 中 |
| authService | ⚠️ 未対応 | App.tsx | 高 |
| employeeNotificationService | ⚠️ 未対応 | EmployeeHome | 中 |
| shiftDetailService | ⚠️ 未対応 | EmployeeHome | 中 |

---

## 🔍 検証方法

### 管理者機能の検証
1. ✅ ダッシュボード表示
2. ✅ シフト作成
3. ✅ 希望休管理 (提出状況確認、一括承認)
4. ✅ 緊急通知表示
5. ⚠️ 職員管理 (データ表示のみ、CRUD未確認)
6. ⚠️ 職種グループ管理 (データ表示のみ、CRUD未確認)
7. ⚠️ 勤務時間枠管理 (データ表示のみ、CRUD未確認)

### 職員機能の検証 (未実施)
1. ⚠️ ログイン (authService使用)
2. ⚠️ EmployeeHome表示 (employeeNotificationService, shiftDetailService使用)
3. ⚠️ 希望休申請 (vacationService使用)

---

## 📝 推奨事項

### 即座に対応すべき項目
1. **authService**: ログイン機能は重要なので、tRPC変換を推奨
   - `auth.logout.mutate()`
   - `auth.me.query()`

### 職員機能を有効化する場合
2. **employeeNotificationService**: 職員ホーム画面で使用
3. **shiftDetailService**: 職員ホーム画面で使用
4. **vacationService**: 希望休申請機能で使用

### Date型の一貫性
すべてのエンドポイントでDate→ISO文字列変換が実装されていることを確認済み:
- ✅ dashboard.getStats (line 878-882)
- ✅ emergencyNotifications.getRecent (line 636-640)
- ✅ shifts.create (line 257-263)
- ✅ shifts.update (line 271-277)
- ✅ shifts.publishTentative (line 296-302)

---

## 🎯 結論

**管理者機能**: 主要機能は本番環境で動作可能
**職員機能**: authService, employeeNotificationService, shiftDetailService, vacationServiceのtRPC変換が必要

**次のステップ**:
1. authServiceのtRPC変換 (優先度: 高)
2. 職員機能有効化の場合: 残り3サービスのtRPC変換
3. 本番環境での動作確認
