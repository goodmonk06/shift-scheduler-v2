# API リファレンス

このドキュメントは tRPC API エンドポイントの詳細を説明します。

全てのエンドポイントは `/api/trpc` でアクセスできます。

## 認証

### コンテキスト (`server/_core/context.ts`)

各リクエストには `TrpcContext` が渡されます：

```typescript
{
  req: Express Request,
  res: Express Response,
  user: User | null  // 認証済みユーザー（未認証時は null）
}
```

**認証方法の優先順位**:
1. AdminAuth（管理者） - Cookie: `admin_auth_token`
2. SDK OAuth（管理者） - Authorization ヘッダー
3. SimpleAuth（職員） - Cookie: `simple_auth_token`

---

## エンドポイント一覧

### 1. `shifts.*` - シフト管理

#### `shifts.create`
月次シフトを作成。

**入力**:
```typescript
{
  year: number,
  month: number,
  assignmentStrategy?: 'manual' | 'ai_optimized'
}
```

**出力**:
```typescript
{
  id: number,
  year: number,
  month: number,
  status: 'draft',
  assignmentStrategy: 'manual' | 'ai_optimized',
  createdBy: number | null,
  createdAt: Date,
  updatedAt: Date
}
```

**エラー**:
- `400 Bad Request`: 不正な年月
- `409 Conflict`: 既に同じ年月のシフトが存在
- `401 Unauthorized`: 未認証

---

#### `shifts.getByYearMonth`
年月でシフトを取得。

**入力**:
```typescript
{
  year: number,
  month: number
}
```

**出力**:
```typescript
{
  id: number,
  year: number,
  month: number,
  status: 'draft' | 'confirmed' | 'published' | 'archived',
  assignmentStrategy: 'manual' | 'ai_optimized',
  createdBy: number | null,
  createdAt: Date,
  updatedAt: Date
} | null
```

---

#### `shifts.updateStatus`
シフトのステータスを更新。

**入力**:
```typescript
{
  id: number,
  status: 'draft' | 'confirmed' | 'published' | 'archived'
}
```

**出力**:
```typescript
{
  id: number,
  status: string,
  updatedAt: Date
}
```

**ステータス遷移**:
- `draft` → `confirmed`: シフト確定
- `confirmed` → `published`: シフト公開（職員に表示）
- `published` → `archived`: アーカイブ

---

#### `shifts.delete`
シフトを削除。

**入力**:
```typescript
{
  id: number
}
```

**出力**:
```typescript
{
  success: true
}
```

---

### 2. `shiftDetails.*` - シフト詳細

#### `shiftDetails.updateBatch`
シフト詳細を一括更新。

**入力**:
```typescript
{
  shiftId: number,
  updates: Array<{
    id?: number,           // 既存レコード更新時
    employeeId: number,
    date: string,          // YYYY-MM-DD 形式
    workTimeSlotId: number | null,
    status: 'off' | 'working' | 'leave' | 'holiday',
    notes?: string | null
  }>
}
```

**出力**:
```typescript
{
  updated: number,  // 更新件数
  created: number   // 新規作成件数
}
```

**バリデーション**:
- `date`: YYYY-MM-DD 形式
- `status`: off, working, leave, holiday のいずれか

---

### 3. `employees.*` - 職員管理

#### `employees.getAll`
全職員を取得。

**入力**: なし

**出力**:
```typescript
Array<{
  id: number,
  userId: number | null,
  name: string,
  email: string,
  phoneNumber: string | null,
  birthday: Date,
  positionGroupId: number,
  additionalConstraints: EmployeeConstraints | null,
  createdAt: Date,
  updatedAt: Date
}>
```

---

#### `employees.create`
職員を作成。

**入力**:
```typescript
{
  name: string,
  email: string,
  phoneNumber?: string,
  birthday: string,        // YYYY-MM-DD 形式
  positionGroupId: number
}
```

**出力**:
```typescript
{
  id: number,
  name: string,
  email: string,
  // ... 他のフィールド
}
```

---

#### `employees.update`
職員を更新。

**入力**:
```typescript
{
  id: number,
  name?: string,
  email?: string,
  phoneNumber?: string,
  birthday?: string,
  positionGroupId?: number
}
```

**出力**:
```typescript
{
  id: number,
  // ... 更新後のデータ
}
```

---

#### `employees.delete`
職員を削除。

**入力**:
```typescript
{
  id: number
}
```

**出力**:
```typescript
{
  success: true
}
```

---

#### `employees.structureData`
自然言語から構造化データを生成（LLM 使用）。

**入力**:
```typescript
{
  employeeId: number,
  naturalLanguageInput: string  // 例: "土日祝日休み、9-14時勤務"
}
```

**出力**:
```typescript
{
  success: true,
  data: EmployeeConstraints
} | {
  success: false,
  error: string
}
```

**EmployeeConstraints 構造**:
```typescript
{
  rawInput: string,
  lastUpdated: string,
  workConstraints: Array<{
    id: number,
    type: 'day_off_pattern' | 'specific_day_off' | 'work_hours' | 'specific_day_hours' | 'max_consecutive_days' | 'max_weekly_hours',
    description: string,
    dayOfWeek?: number[],      // 0=日曜, 1=月曜, ..., 6=土曜
    includeHolidays?: boolean,
    startTime?: string,         // HH:MM 形式
    endTime?: string,           // HH:MM 形式
    maxValue?: number,
    priority: number,           // 100 = 絶対厳守
    isActive: boolean
  }>,
  leaveAllowances: {
    paidLeave: { totalDays, usedDays, remainingDays, ... },
    birthdayLeave: { eligible, totalDays, ... },
    seasonalLeave: { summer: {...}, winter: {...} }
  },
  personalInfo?: {
    birthday?: string,
    age?: number,
    childrenAges?: number[],
    situation?: string,
    specialNotes?: string,
    priority: 90
  },
  aiMetadata: {
    lastProcessed: string,
    processingModel: string,
    confidenceScore: number,
    validationStatus: string
  }
}
```

**LLM モデル**: `gpt-4o-2024-11-20` (Azure OpenAI)

---

### 4. `leaveRequests.*` - 休暇申請

#### `leaveRequests.create`
休暇を申請。

**入力**:
```typescript
{
  employeeId: number,
  shiftId: number,
  leaveType: 'paid' | 'birthday' | 'seasonal_summer' | 'seasonal_winter',
  startDate: string,  // YYYY-MM-DD
  endDate: string,    // YYYY-MM-DD
  reason?: string
}
```

**出力**:
```typescript
{
  id: number,
  status: 'pending',
  // ... 他のフィールド
}
```

**バリデーション**:
- `startDate <= endDate`
- `leaveType` が職員の対象範囲内か確認

---

#### `leaveRequests.approve`
休暇申請を承認。

**入力**:
```typescript
{
  id: number,
  reviewNotes?: string
}
```

**出力**:
```typescript
{
  id: number,
  status: 'approved',
  reviewedBy: number,
  reviewedAt: Date,
  // ... 他のフィールド
}
```

**副作用**:
- `shiftDetails` の該当日が自動的に `status: 'leave'` に更新される（トランザクション保証）
- 職員に通知が送信される（`notifications` テーブル）

**実装**: `server/db.ts` の `applyApprovedLeaveRequestsToShift()`

---

#### `leaveRequests.reject`
休暇申請を却下。

**入力**:
```typescript
{
  id: number,
  reviewNotes?: string
}
```

**出力**:
```typescript
{
  id: number,
  status: 'rejected',
  reviewedBy: number,
  reviewedAt: Date,
  // ... 他のフィールド
}
```

**副作用**:
- 職員に通知が送信される

---

#### `leaveRequests.getByEmployee`
職員別に休暇申請を取得。

**入力**:
```typescript
{
  employeeId: number
}
```

**出力**:
```typescript
Array<{
  id: number,
  employeeId: number,
  shiftId: number,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  status: string,
  // ... 他のフィールド
}>
```

---

#### `leaveRequests.getByShift`
シフト別に休暇申請を取得。

**入力**:
```typescript
{
  shiftId: number
}
```

**出力**: `getByEmployee` と同じ形式の配列

---

### 5. `modificationRequests.*` - シフト変更申請

#### `modificationRequests.create`
シフト変更を申請。

**入力**:
```typescript
{
  shiftDetailId: number,
  employeeId: number,
  requestedWorkTimeSlotId?: number | null,
  requestedStatus: 'off' | 'working' | 'leave' | 'holiday',
  reason: string
}
```

**出力**:
```typescript
{
  id: number,
  status: 'pending',
  // ... 他のフィールド
}
```

---

#### `modificationRequests.approve`
変更申請を承認。

**入力**:
```typescript
{
  id: number,
  reviewNotes?: string
}
```

**出力**:
```typescript
{
  id: number,
  status: 'approved',
  // ... 他のフィールド
}
```

**副作用**:
- `shiftDetails` が更新される
- 職員に通知が送信される

---

#### `modificationRequests.reject`
変更申請を却下。

**入力**:
```typescript
{
  id: number,
  reviewNotes?: string
}
```

---

### 6. `notifications.*` - 通知

#### `notifications.getByRecipient`
受信者別に通知を取得。

**入力**:
```typescript
{
  recipientId: number,
  limit?: number,
  offset?: number
}
```

**出力**:
```typescript
Array<{
  id: number,
  recipientId: number,
  type: string,
  title: string,
  message: string,
  isRead: boolean,
  createdAt: Date,
  // ... 他のフィールド
}>
```

---

#### `notifications.markAsRead`
通知を既読にする。

**入力**:
```typescript
{
  id: number
}
```

**出力**:
```typescript
{
  id: number,
  isRead: true
}
```

---

### 7. `positionGroups.*` - 役職グループ

#### `positionGroups.getAll`
全役職グループを取得。

#### `positionGroups.create`
役職グループを作成。

#### `positionGroups.update`
役職グループを更新。

#### `positionGroups.delete`
役職グループを削除。

---

### 8. `workTimeSlots.*` - 勤務時間帯

#### `workTimeSlots.getAll`
全勤務時間帯を取得。

#### `workTimeSlots.create`
勤務時間帯を作成。

**入力**:
```typescript
{
  name: string,
  startTime: string,  // HH:MM 形式
  endTime: string,    // HH:MM 形式
  color?: string,
  isActive?: boolean
}
```

**バリデーション**:
- `startTime`, `endTime`: HH:MM 形式（正規表現: `/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/`）

#### `workTimeSlots.update`
勤務時間帯を更新。

#### `workTimeSlots.delete`
勤務時間帯を削除。

---

### 9. `workplaceRules.*` - 職場ルール

#### `workplaceRules.getAll`
全職場ルールを取得。

#### `workplaceRules.create`
職場ルールを作成。

#### `workplaceRules.update`
職場ルールを更新。

#### `workplaceRules.delete`
職場ルールを削除。

---

## 非 tRPC エンドポイント

### 認証エンドポイント

#### `POST /api/admin-auth/login`
管理者ログイン（パスワードレス）。

**レート制限**: 5回/15分

**入力**:
```json
{
  "email": "admin@example.com"
}
```

**出力**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Cookie 設定**: `admin_auth_token` (JWT)

---

#### `POST /api/simple-auth/login`
職員ログイン（メール + 誕生日）。

**レート制限**: 10回/15分

**入力**:
```json
{
  "email": "employee@example.com",
  "birthday": "1990-01-01"
}
```

**出力**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "職員名",
    "email": "employee@example.com",
    "employeeId": 123
  }
}
```

**Cookie 設定**: `simple_auth_token` (JWT)

---

#### `POST /api/admin-auth/logout` / `POST /api/simple-auth/logout`
ログアウト。

**出力**:
```json
{
  "success": true
}
```

**Cookie クリア**: 対応する認証トークンを削除

---

### その他

#### `GET /api/pdf/shift/:shiftId`
シフト表を PDF でダウンロード。

**パラメータ**:
- `shiftId`: シフトID

**出力**: PDF ファイル（`Content-Type: application/pdf`）

**実装**: `server/pdfGenerator.ts` の `generateShiftPDF()`

---

## エラーハンドリング

### カスタムエラークラス (`server/_core/errors.ts`)

全てのエラーは `AppError` を継承し、適切な HTTP ステータスコードを持ちます：

- `BadRequestError` (400): 不正なリクエスト
- `UnauthorizedError` (401): 認証が必要
- `ForbiddenError` (403): 権限不足
- `NotFoundError` (404): リソースが見つからない
- `ConflictError` (409): データの競合
- `ValidationError` (422): バリデーションエラー
- `InternalServerError` (500): サーバーエラー
- `DatabaseError` (500): データベースエラー
- `ExternalServiceError` (502): 外部サービスエラー
- `RateLimitError` (429): レート制限超過

**エラーレスポンス形式**:
```json
{
  "error": {
    "message": "エラーメッセージ",
    "statusCode": 400,
    "context": {
      // 追加のコンテキスト情報
    }
  }
}
```

---

## 監査ログ

全ての重要操作は `auditLogs` テーブルに記録されます。

**記録される操作**:
- シフト作成・更新・削除・承認・公開
- 職員作成・更新・削除
- 休暇申請・承認・却下
- シフト変更申請・承認・却下
- ログイン・ログアウト・ログイン失敗
- 設定更新・一括操作

**実装**: `server/_core/audit.ts`

**使用例**:
```typescript
import { recordAudit, AuditAction, createTarget } from './server/_core/audit';

await recordAudit({
  actorUserId: ctx.user.id,
  action: AuditAction.SHIFT_CONFIRMED,
  target: createTarget.shift(shiftId),
  meta: { year: 2025, month: 11 }
});
```
