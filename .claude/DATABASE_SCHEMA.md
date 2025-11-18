# データベーススキーマ詳細

このドキュメントは `drizzle/schema.ts` に定義されているデータベーススキーマの詳細を説明します。

## テーブル一覧

### 1. `users` - OAuth ユーザー
管理者など、OAuth でログインするユーザー。

```typescript
{
  id: serial (PK),
  openId: string (unique), // OAuth プロバイダーからの一意ID
  name: string,
  email: string,
  role: enum('user', 'admin'),
  loginMethod: string | null,
  createdAt: timestamp,
  updatedAt: timestamp,
  lastSignedIn: timestamp
}
```

**インデックス**:
- `idx_users_open_id` on `openId`

---

### 2. `employees` - 職員マスタ
シフトに割り当てられる職員の情報。

```typescript
{
  id: serial (PK),
  userId: int | null (FK -> users.id), // OAuth ユーザーと紐付け（オプション）
  name: string,
  email: string,
  phoneNumber: string | null,
  birthday: date,
  positionGroupId: int (FK -> positionGroups.id),
  additionalConstraints: json | null, // LLM で構造化された勤務制約
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**`additionalConstraints` 構造** (EmployeeConstraints 型):
```typescript
{
  rawInput: string,                    // 元の自然言語入力
  lastUpdated: string,                 // ISO 日時
  workConstraints: WorkConstraint[],   // 勤務制約配列
  leaveAllowances: LeaveAllowances,    // 休暇管理
  personalInfo?: PersonalInfo,         // 個人情報
  aiMetadata: {
    lastProcessed: string,
    processingModel: string,
    confidenceScore: number,
    validationStatus: string
  }
}
```

**インデックス**:
- `idx_employees_user_id` on `userId`
- `idx_employees_position_group` on `positionGroupId`

---

### 3. `positionGroups` - 役職グループ
職員の雇用形態と給与計算の設定。

```typescript
{
  id: serial (PK),
  name: string,                        // 例: "正社員", "パート"
  employmentType: enum('fulltime', 'parttime'),
  baseSalaryMultiplier: decimal(3,2),  // 給与計算倍率
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

### 4. `workTimeSlots` - 勤務時間帯マスタ
シフトで使用する勤務時間帯の定義。

```typescript
{
  id: serial (PK),
  name: string,           // 例: "早番", "遅番"
  startTime: string,      // HH:MM 形式（例: "09:00"）
  endTime: string,        // HH:MM 形式（例: "14:00"）
  color: string | null,   // UI 表示用カラーコード
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**インデックス**:
- `idx_work_time_slots_active` on `isActive`

---

### 5. `shifts` - シフト（月次）
月ごとのシフト。

```typescript
{
  id: serial (PK),
  year: int,
  month: int,
  status: enum('draft', 'confirmed', 'published', 'archived'),
  assignmentStrategy: enum('manual', 'ai_optimized'),
  createdBy: int | null (FK -> users.id),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**ステータス遷移**:
1. `draft`: 編集中
2. `confirmed`: 確定（職員には未公開）
3. `published`: 公開済み
4. `archived`: アーカイブ

**インデックス**:
- `idx_shifts_year_month` on `year, month`
- `idx_shifts_status` on `status`

---

### 6. `shiftDetails` - シフト詳細（日次・職員ごと）
シフトの各日・各職員の勤務内容。

```typescript
{
  id: serial (PK),
  shiftId: int (FK -> shifts.id),
  employeeId: int (FK -> employees.id),
  date: date,
  workTimeSlotId: int | null (FK -> workTimeSlots.id),
  status: enum('off', 'working', 'leave', 'holiday'),
  notes: text | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**status の意味**:
- `off`: 休み（通常の休日）
- `working`: 勤務
- `leave`: 休暇（有給・誕生日休・季節休など）
- `holiday`: 祝日

**インデックス**:
- `idx_shift_details_shift_date` on `shiftId, date`
- `idx_shift_details_employee` on `employeeId`

---

### 7. `leaveRequests` - 休暇申請
職員が申請する休暇。

```typescript
{
  id: serial (PK),
  employeeId: int (FK -> employees.id),
  shiftId: int (FK -> shifts.id),
  leaveType: enum('paid', 'birthday', 'seasonal_summer', 'seasonal_winter'),
  startDate: date,
  endDate: date,
  reason: text | null,
  status: enum('pending', 'approved', 'rejected'),
  reviewedBy: int | null (FK -> users.id),
  reviewedAt: timestamp | null,
  reviewNotes: text | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**leaveType の意味**:
- `paid`: 有給休暇
- `birthday`: 誕生日休暇
- `seasonal_summer`: 夏季休暇
- `seasonal_winter`: 冬季休暇

**承認フロー**:
1. 職員が申請 → `status: 'pending'`
2. 管理者が承認 → `status: 'approved'`, `reviewedBy`, `reviewedAt` 設定
3. 管理者が却下 → `status: 'rejected'`, `reviewedBy`, `reviewedAt` 設定

**インデックス**:
- `idx_leave_requests_employee_status` on `employeeId, status`
- `idx_leave_requests_shift` on `shiftId`

---

### 8. `modificationRequests` - シフト変更申請
職員が既存シフトの変更を申請。

```typescript
{
  id: serial (PK),
  shiftDetailId: int (FK -> shiftDetails.id),
  employeeId: int (FK -> employees.id),
  requestedWorkTimeSlotId: int | null (FK -> workTimeSlots.id),
  requestedStatus: enum('off', 'working', 'leave', 'holiday'),
  reason: text,
  status: enum('pending', 'approved', 'rejected'),
  reviewedBy: int | null (FK -> users.id),
  reviewedAt: timestamp | null,
  reviewNotes: text | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**インデックス**:
- `idx_modification_requests_employee` on `employeeId`
- `idx_modification_requests_status` on `status`

---

### 9. `workplaceRules` - 職場ルール
職場全体のルール設定（誕生日休暇、季節休暇など）。

```typescript
{
  id: serial (PK),
  ruleType: enum('birthday_leave', 'seasonal_leave'),
  employmentType: enum('all', 'fulltime', 'parttime'),
  ruleValue: json,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**`ruleValue` の例**:

**誕生日休暇** (`ruleType: 'birthday_leave'`):
```json
{
  "daysPerYear": 1,
  "validityPeriod": "誕生月の前後1ヶ月"
}
```

**季節休暇** (`ruleType: 'seasonal_leave'`):
```json
{
  "summer": {
    "days": 3,
    "period": "6-9月"
  },
  "winter": {
    "days": 5,
    "period": "12-1月"
  }
}
```

**インデックス**:
- `idx_workplace_rules_type_employment` on `ruleType, employmentType`

---

### 10. `notifications` - 通知
職員への通知。

```typescript
{
  id: serial (PK),
  recipientId: int (FK -> employees.id),
  type: enum('leave_approved', 'leave_rejected', 'shift_published', 'modification_approved', 'modification_rejected'),
  title: string,
  message: text,
  relatedEntityType: string | null,  // 例: "leave_request"
  relatedEntityId: int | null,       // 例: leaveRequestId
  isRead: boolean,
  createdAt: timestamp
}
```

**インデックス**:
- `idx_notifications_recipient` on `recipientId, isRead`

---

### 11. `auditLogs` - 監査ログ
全ての重要操作を記録（コンプライアンス対応）。

```typescript
{
  id: serial (PK),
  actorUserId: int,                  // 操作者のユーザーID
  action: string,                    // 例: "SHIFT_CONFIRMED", "LEAVE_APPROVED"
  target: string,                    // 例: "shift:123", "employee:456"
  meta: json | null,                 // 追加のメタデータ
  createdAt: timestamp
}
```

**action の例** (AuditAction enum):
- `SHIFT_CREATED`, `SHIFT_UPDATED`, `SHIFT_DELETED`, `SHIFT_CONFIRMED`, `SHIFT_PUBLISHED`, `ARCHIVED`
- `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `EMPLOYEE_DELETED`
- `LEAVE_REQUEST_CREATED`, `LEAVE_REQUEST_APPROVED`, `LEAVE_REQUEST_REJECTED`
- `MODIFICATION_REQUEST_CREATED`, `MODIFICATION_REQUEST_APPROVED`, `MODIFICATION_REQUEST_REJECTED`
- `USER_LOGIN`, `USER_LOGOUT`, `USER_LOGIN_FAILED`
- `SETTINGS_UPDATED`, `BULK_OPERATION`

**インデックス**:
- `idx_audit_logs_actor` on `actorUserId`
- `idx_audit_logs_action` on `action`
- `idx_audit_logs_created_at` on `createdAt`

---

## リレーション図（主要部分）

```
users (OAuth管理者)
  ├─→ shifts.createdBy
  ├─→ leaveRequests.reviewedBy
  └─→ modificationRequests.reviewedBy

employees (職員)
  ├─→ positionGroups (役職グループ)
  ├─→ users (OAuth紐付け, optional)
  ├─→ shiftDetails
  ├─→ leaveRequests
  ├─→ modificationRequests
  └─→ notifications

shifts (月次シフト)
  ├─→ shiftDetails (日次詳細)
  └─→ leaveRequests

shiftDetails
  ├─→ workTimeSlots (勤務時間帯)
  └─→ modificationRequests
```

---

## マイグレーション

最新マイグレーション: `0018_add_performance_indexes.sql`

主要なマイグレーション:
1. `0000_initial_schema.sql`: 初期スキーマ
2. `0018_add_performance_indexes.sql`: パフォーマンスインデックス追加

マイグレーションは `server/_core/index.ts` でアプリ起動時に自動実行されます。
