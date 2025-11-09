# API要件定義書

このドキュメントは、バックエンドチームがAPI実装を行うための詳細な要件定義です。

**最終更新**: 2025年11月8日  
**バージョン**: 2.0.0

---

## 📋 目次

1. [データベーススキーマ変更](#データベーススキーマ変更)
2. [希望休関連API](#希望休関連api)
3. [シフト関連API](#シフト関連api)
4. [実績報告API](#実績報告api)
5. [設定管理API](#設定管理api)
6. [AI生成API](#ai生成api)
7. [バリデーション要件](#バリデーション要件)
8. [エラーハンドリング](#エラーハンドリング)
9. [テストケース](#テストケース)

---

## データベーススキーマ変更

### 1. LeaveRequestテーブル（拡張）

#### 追加カラム

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| `leaveType` | VARCHAR(20) | NO | `'休'` | 休みの種類（"休", "有休", "時間指定"） |
| `startTime` | VARCHAR(5) | YES | NULL | 開始時刻（HH:MM形式） |
| `endTime` | VARCHAR(5) | YES | NULL | 終了時刻（HH:MM形式） |
| `isAdditional` | BOOLEAN | NO | FALSE | 追加希望かどうか（仮確定後の申請） |

#### マイグレーション

```sql
-- LeaveRequestテーブルにカラムを追加
ALTER TABLE "LeaveRequest"
ADD COLUMN "leaveType" VARCHAR(20) NOT NULL DEFAULT '休',
ADD COLUMN "startTime" VARCHAR(5),
ADD COLUMN "endTime" VARCHAR(5),
ADD COLUMN "isAdditional" BOOLEAN NOT NULL DEFAULT FALSE;

-- leaveTypeの値制約
ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "check_leave_type" 
CHECK ("leaveType" IN ('休', '有休', '時間指定'));

-- 時刻フォーマットの制約
ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "check_time_format"
CHECK (
  ("startTime" IS NULL OR "startTime" ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$') AND
  ("endTime" IS NULL OR "endTime" ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$')
);

-- 時間指定の場合は両方の時刻が必要
ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "check_time_required"
CHECK (
  ("leaveType" != '時間指定') OR 
  ("startTime" IS NOT NULL AND "endTime" IS NOT NULL)
);

-- インデックスの追加（検索パフォーマンス向上）
CREATE INDEX "idx_leave_request_employee_shift" ON "LeaveRequest"("employeeId", "shiftId");
CREATE INDEX "idx_leave_request_status" ON "LeaveRequest"("status");
CREATE INDEX "idx_leave_request_date" ON "LeaveRequest"("startDate", "endDate");
CREATE INDEX "idx_leave_request_additional" ON "LeaveRequest"("isAdditional");
```

#### Prismaスキーマ

```prisma
model LeaveRequest {
  id          Int      @id @default(autoincrement())
  employeeId  Int
  shiftId     Int
  requestDate String   // YYYY-MM-DD
  startDate   String   // YYYY-MM-DD
  endDate     String   // YYYY-MM-DD
  reason      String?
  status      String   // "pending" | "approved" | "rejected"
  
  // ✅ 追加フィールド
  leaveType   String   @default("休")  // "休" | "有休" | "時間指定"
  startTime   String?  // HH:MM
  endTime     String?  // HH:MM
  isAdditional Boolean @default(false) // 追加希望かどうか
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  employee    Employee @relation(fields: [employeeId], references: [id])
  shift       Shift    @relation(fields: [shiftId], references: [id])

  @@index([employeeId, shiftId])
  @@index([status])
  @@index([startDate, endDate])
  @@index([isAdditional])
  @@map("LeaveRequest")
}
```

---

### 2. Shiftテーブル（拡張）

#### 追加カラム

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| `status` | VARCHAR(30) | NO | シフトステータス（6段階） |
| `leaveRequestDeadline` | TIMESTAMP | YES | 通常の希望休締め切り |
| `additionalRequestDeadline` | TIMESTAMP | YES | 追加希望締め切り（仮確定後） |
| `generatedBy` | VARCHAR(20) | NO | 生成方法（"manual" or "ai"） |
| `aiPrompt` | TEXT | YES | AI生成時のプロンプト |
| `aiResponse` | JSONB | YES | AI生成時のレスポンス |

#### マイグレーション

```sql
-- Shiftテーブルにカラムを追加
ALTER TABLE "Shift"
ADD COLUMN "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
ADD COLUMN "leaveRequestDeadline" TIMESTAMP,
ADD COLUMN "additionalRequestDeadline" TIMESTAMP,
ADD COLUMN "generatedBy" VARCHAR(20) NOT NULL DEFAULT 'manual',
ADD COLUMN "aiPrompt" TEXT,
ADD COLUMN "aiResponse" JSONB;

-- ステータス制約
ALTER TABLE "Shift"
ADD CONSTRAINT "check_shift_status"
CHECK ("status" IN ('draft', 'tentative', 'tentative_revised', 'confirmed', 'actual', 'archived'));

-- 生成方法の制約
ALTER TABLE "Shift"
ADD CONSTRAINT "check_generated_by"
CHECK ("generatedBy" IN ('manual', 'ai'));

-- インデックスの追加
CREATE INDEX "idx_shift_status" ON "Shift"("status");
CREATE INDEX "idx_shift_deadlines" ON "Shift"("leaveRequestDeadline", "additionalRequestDeadline");
CREATE INDEX "idx_shift_generated_by" ON "Shift"("generatedBy");
```

#### Prismaスキーマ

```prisma
model Shift {
  id                        Int       @id @default(autoincrement())
  year                      Int
  month                     Int
  name                      String
  userId                    Int
  
  // ✅ 追加・変更フィールド
  status                    String    @default("draft") // "draft" | "tentative" | "tentative_revised" | "confirmed" | "actual" | "archived"
  generatedBy               String    @default("manual") // "manual" | "ai"
  leaveRequestDeadline      DateTime?
  additionalRequestDeadline DateTime?
  aiPrompt                  String?   @db.Text
  aiResponse                Json?
  
  tentativePublishedAt      DateTime?
  confirmedAt               DateTime?
  isArchived                Boolean   @default(false)
  archivedAt                DateTime?
  
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  shiftDetails              ShiftDetail[]
  leaveRequests             LeaveRequest[]

  @@index([year, month])
  @@index([status])
  @@index([leaveRequestDeadline, additionalRequestDeadline])
  @@index([generatedBy])
  @@map("Shift")
}
```

---

### 3. ShiftActualテーブル（新規作成）

実績報告を管理するテーブル

```sql
CREATE TABLE "ShiftActual" (
  "id" SERIAL PRIMARY KEY,
  "shiftDetailId" INTEGER NOT NULL,
  "actualStartTime" VARCHAR(5),
  "actualEndTime" VARCHAR(5),
  "note" TEXT,
  "reportedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "approvedAt" TIMESTAMP,
  "approvedBy" INTEGER,
  "status" VARCHAR(20) NOT NULL DEFAULT 'reported',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "fk_shift_detail" 
    FOREIGN KEY ("shiftDetailId") REFERENCES "ShiftDetail"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_approved_by" 
    FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "check_actual_status" 
    CHECK ("status" IN ('reported', 'approved', 'rejected'))
);

CREATE INDEX "idx_shift_actual_detail" ON "ShiftActual"("shiftDetailId");
CREATE INDEX "idx_shift_actual_status" ON "ShiftActual"("status");
```

#### Prismaスキーマ

```prisma
model ShiftActual {
  id              Int       @id @default(autoincrement())
  shiftDetailId   Int
  actualStartTime String?   // HH:MM
  actualEndTime   String?   // HH:MM
  note            String?   @db.Text
  reportedAt      DateTime  @default(now())
  approvedAt      DateTime?
  approvedBy      Int?
  status          String    @default("reported") // "reported" | "approved" | "rejected"
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  shiftDetail     ShiftDetail @relation(fields: [shiftDetailId], references: [id])
  approver        User?       @relation(fields: [approvedBy], references: [id])

  @@index([shiftDetailId])
  @@index([status])
  @@map("ShiftActual")
}
```

---

### 4. StaffSettingsテーブル（新規作成）

職員のカスタマイズ設定を管理

```sql
CREATE TABLE "StaffSettings" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL UNIQUE,
  "theme" VARCHAR(50) NOT NULL DEFAULT 'default',
  "headerImage" VARCHAR(50) NOT NULL DEFAULT 'flowers',
  "fontSize" VARCHAR(20) NOT NULL DEFAULT 'medium',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "fk_employee" 
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE,
  CONSTRAINT "check_theme" 
    CHECK ("theme" IN ('default', 'sakura', 'ocean', 'forest', 'sunset')),
  CONSTRAINT "check_header_image" 
    CHECK ("headerImage" IN ('flowers', 'nature', 'ocean', 'sakura', 'mountain')),
  CONSTRAINT "check_font_size" 
    CHECK ("fontSize" IN ('small', 'medium', 'large', 'xlarge'))
);

CREATE UNIQUE INDEX "idx_staff_settings_employee" ON "StaffSettings"("employeeId");
```

#### Prismaスキーマ

```prisma
model StaffSettings {
  id          Int      @id @default(autoincrement())
  employeeId  Int      @unique
  theme       String   @default("default") // "default" | "sakura" | "ocean" | "forest" | "sunset"
  headerImage String   @default("flowers") // "flowers" | "nature" | "ocean" | "sakura" | "mountain"
  fontSize    String   @default("medium")  // "small" | "medium" | "large" | "xlarge"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  employee    Employee @relation(fields: [employeeId], references: [id])

  @@map("StaffSettings")
}
```

---

## 希望休関連API

### 1. leaveRequests.createBatch

複数の希望休を一括で作成

#### エンドポイント
```
POST /api/trpc/leaveRequests.createBatch
認証: 必須（職員または管理者）
```

#### リクエスト
```typescript
{
  employeeId: number;
  shiftId: number;
  requests: {
    date: string;          // YYYY-MM-DD
    leaveType: "休" | "有休" | "時間指定";
    startTime?: string;    // HH:MM
    endTime?: string;      // HH:MM
    reason?: string;       // 最大500文字
  }[];
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: LeaveRequest[];
}
```

#### バリデーション
- `employeeId` が存在する職員IDか確認
- `shiftId` が存在するシフトIDか確認
- `date` がYYYY-MM-DD形式
- `leaveType` が有効な値
- 時間指定の場合、`startTime` < `endTime`
- 締め切りを過ぎていないか確認

---

### 2. leaveRequests.createAdditional

仮確定後の追加希望申請

#### エンドポイント
```
POST /api/trpc/leaveRequests.createAdditional
認証: 必須（職員）
```

#### リクエスト
```typescript
{
  employeeId: number;
  shiftId: number;
  date: string;          // YYYY-MM-DD
  shiftType: string;     // 変更前のシフトタイプ
  reason: string;        // 必須（やむを得ない理由）
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: LeaveRequest;
}
```

#### バリデーション
- シフトが `tentative` または `tentative_revised` ステータス
- 追加希望締め切り前（`additionalRequestDeadline`）
- `reason` が必須で最低20文字以上
- 既に同じ日付で追加希望を申請していないか確認

---

### 3. leaveRequests.getByEmployee

職員の希望休一覧を取得

#### エンドポイント
```
GET /api/trpc/leaveRequests.getByEmployee
認証: 必須（職員または管理者）
```

#### クエリパラメータ
```typescript
{
  employeeId: number;
  shiftId?: number;      // 特定のシフトのみ
  month?: string;        // YYYY-MM形式
  status?: "pending" | "approved" | "rejected";
  isAdditional?: boolean; // 追加希望のみ
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: LeaveRequest[];
}
```

---

### 4. leaveRequests.delete

希望休を削除（締め切り前のみ）

#### エンドポイント
```
DELETE /api/trpc/leaveRequests.delete
認証: 必須（職員または管理者）
```

#### リクエスト
```typescript
{
  id: number;
  employeeId: number;
}
```

#### レスポンス
```typescript
{
  success: boolean;
  message: string;
}
```

#### バリデーション
- 締め切り前であること
- 自分の希望休のみ削除可能（管理者は例外）
- シフトが `draft` ステータスであること

---

## シフト関連API

### 1. shifts.generateWithAI

AI（ChatGPT 4 mini）でシフトを自動生成

#### エンドポイント
```
POST /api/trpc/shifts.generateWithAI
認証: 必須（管理者）
```

#### リクエスト
```typescript
{
  shiftId: number;
  constraints: {
    requiredStaffing: {
      date: string;
      早番: number;
      遅番: number;
      夜勤: number;
    }[];
    workplaceRules: {
      maxConsecutiveDays: number;
      minDaysBetweenNightShifts: number;
      maxNightShiftsPerMonth: number;
    };
    positionGroups: {
      groupName: string;
      priority: number;
      members: number[];
    }[];
  };
  useAI: boolean;         // AI使用するか（false=手動ベース作成）
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: {
    shiftDetails: ShiftDetail[];
    aiPrompt?: string;
    aiResponse?: any;
    warnings: string[];  // 制約違反の警告
  };
}
```

#### 処理フロー
1. 希望休の取得
2. 制約条件の整理
3. ChatGPT 4 miniへプロンプト送信
4. AI レスポンスのパース・バリデーション
5. ShiftDetailレコードの作成
6. 制約違反チェック

詳細は [AI_GENERATION_GUIDE.md](./AI_GENERATION_GUIDE.md) を参照

---

### 2. shifts.updateStatus

シフトのステータスを更新

#### エンドポイント
```
POST /api/trpc/shifts.updateStatus
認証: 必須（管理者）
```

#### リクエスト
```typescript
{
  shiftId: number;
  status: "draft" | "tentative" | "tentative_revised" | "confirmed" | "actual" | "archived";
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: Shift;
}
```

#### 状態遷移ルール
- `draft` → `tentative`: 仮確定公開
- `tentative` → `tentative_revised`: 追加希望反映
- `tentative_revised` → `confirmed`: 最終確定
- `confirmed` → `actual`: 実績報告開始
- 任意 → `archived`: アーカイブ

---

### 3. shifts.setDeadlines

希望休と追加希望の締め切りを設定

#### エンドポイント
```
POST /api/trpc/shifts.setDeadlines
認証: 必須（管理者）
```

#### リクエスト
```typescript
{
  shiftId: number;
  leaveRequestDeadline: string;      // ISO 8601形式
  additionalRequestDeadline?: string; // ISO 8601形式
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: Shift;
}
```

---

### 4. shifts.getById

シフトの詳細を取得

#### エンドポイント
```
GET /api/trpc/shifts.getById
認証: 必須
```

#### クエリパラメータ
```typescript
{
  shiftId: number;
  includeDetails?: boolean;  // ShiftDetail含む
  includeActuals?: boolean;  // ShiftActual含む
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: Shift & {
    shiftDetails?: ShiftDetail[];
    shiftActuals?: ShiftActual[];
  };
}
```

---

## 実績報告API

### 1. shiftActuals.create

勤務実績を報告

#### エンドポイント
```
POST /api/trpc/shiftActuals.create
認証: 必須（職員）
```

#### リクエスト
```typescript
{
  shiftDetailId: number;
  actualStartTime: string;  // HH:MM
  actualEndTime: string;    // HH:MM
  note?: string;            // 備考（最大500文字）
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: ShiftActual;
}
```

#### バリデーション
- シフトが `confirmed` または `actual` ステータス
- 勤務日が過去であること
- `actualStartTime` < `actualEndTime`
- 自分のシフトのみ報告可能

---

### 2. shiftActuals.update

実績報告を更新（承認前のみ）

#### エンドポイント
```
PUT /api/trpc/shiftActuals.update
認証: 必須（職員）
```

#### リクエスト
```typescript
{
  id: number;
  actualStartTime?: string;
  actualEndTime?: string;
  note?: string;
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: ShiftActual;
}
```

#### バリデーション
- `status` が `reported`（未承認）であること
- 自分の実績のみ更新可能

---

### 3. shiftActuals.approve

実績報告を承認

#### エンドポイント
```
POST /api/trpc/shiftActuals.approve
認証: 必須（管理者）
```

#### リクエスト
```typescript
{
  id: number;
  approved: boolean;  // true=承認, false=却下
  note?: string;      // 却下理由（却下時推奨）
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: ShiftActual;
}
```

---

### 4. shiftActuals.getByEmployee

職員の実績一覧を取得

#### エンドポイント
```
GET /api/trpc/shiftActuals.getByEmployee
認証: 必須（職員または管理者）
```

#### クエリパラメータ
```typescript
{
  employeeId: number;
  month?: string;           // YYYY-MM
  status?: "reported" | "approved" | "rejected";
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: ShiftActual[];
}
```

---

## 設定管理API

### 1. staffSettings.get

職員の設定を取得

#### エンドポイント
```
GET /api/trpc/staffSettings.get
認証: 必須（職員）
```

#### クエリパラメータ
```typescript
{
  employeeId: number;
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: {
    theme: string;
    headerImage: string;
    fontSize: string;
  } | null;
}
```

設定が存在しない場合はデフォルト値を返す

---

### 2. staffSettings.update

職員の設定を更新

#### エンドポイント
```
POST /api/trpc/staffSettings.update
認証: 必須（職員）
```

#### リクエスト
```typescript
{
  employeeId: number;
  theme?: "default" | "sakura" | "ocean" | "forest" | "sunset";
  headerImage?: "flowers" | "nature" | "ocean" | "sakura" | "mountain";
  fontSize?: "small" | "medium" | "large" | "xlarge";
}
```

#### レスポンス
```typescript
{
  success: boolean;
  data: StaffSettings;
}
```

---

## バリデーション要件

### 共通ルール

1. **日付フォーマット**
   - `YYYY-MM-DD`: `2025-11-08`
   - `YYYY-MM`: `2025-11`

2. **時刻フォーマット**
   - `HH:MM`: `08:00`, `23:59`
   - 24時間表記

3. **文字数制限**
   - 理由: 500文字以内
   - 備考: 500文字以内
   - 名前: 100文字以内

4. **権限チェック**
   - 職員は自分のデータのみアクセス可能
   - 管理者は全データにアクセス可能

### シフト固有ルール

1. **状態遷移**
   - 不正な遷移は拒否
   - 前の状態に戻すことは原則不可（archived除く）

2. **締め切り**
   - 締め切り後の申請は拒否
   - 管理者は締め切り関係なく操作可能

3. **制約条件**
   - 連続勤務日数
   - 夜勤間隔
   - 必須人員数

---

## エラーハンドリング

### HTTPステータスコード

| コード | 説明 | 使用例 |
|-------|------|--------|
| 200 | 成功 | 正常なレスポンス |
| 400 | バリデーションエラー | 不正なリクエスト |
| 401 | 認証エラー | 未ログイン |
| 403 | 権限エラー | アクセス権限なし |
| 404 | リソース不在 | データが存在しない |
| 409 | 競合エラー | 二重送信など |
| 500 | サーバーエラー | 予期しないエラー |

### エラーレスポンス形式

```typescript
{
  success: false;
  error: {
    code: string;        // ERROR_CODE
    message: string;     // ユーザー向けメッセージ（日本語）
    details?: any;       // 詳細情報（開発用）
  };
}
```

### エラーコード一覧

| コード | 意味 | HTTPステータス |
|-------|------|---------------|
| `UNAUTHORIZED` | 認証エラー | 401 |
| `FORBIDDEN` | 権限エラー | 403 |
| `NOT_FOUND` | リソース不在 | 404 |
| `VALIDATION_ERROR` | バリデーションエラー | 400 |
| `DEADLINE_PASSED` | 締め切り超過 | 400 |
| `INVALID_STATUS` | 不正なステータス遷移 | 400 |
| `DUPLICATE_REQUEST` | 重複リクエスト | 409 |
| `AI_GENERATION_FAILED` | AI生成失敗 | 500 |
| `DATABASE_ERROR` | DB操作エラー | 500 |

---

## テストケース

### 1. 希望休申請のテスト

```typescript
describe('leaveRequests.createBatch', () => {
  it('正常系: 希望休を一括作成できる', async () => {
    const input = {
      employeeId: 1,
      shiftId: 1,
      requests: [
        { date: '2025-11-10', leaveType: '休' },
        { date: '2025-11-15', leaveType: '有休' },
      ],
    };
    const result = await caller.leaveRequests.createBatch(input);
    expect(result).toHaveLength(2);
  });

  it('異常系: 締め切り後は作成できない', async () => {
    // ...
  });

  it('異常系: 時間指定で時刻なしはエラー', async () => {
    // ...
  });
});
```

### 2. AI生成のテスト

```typescript
describe('shifts.generateWithAI', () => {
  it('正常系: AIでシフトを生成できる', async () => {
    // モックAI APIを使用
  });

  it('異常系: AI失敗時は手動生成にフォールバック', async () => {
    // ...
  });
});
```

### 3. 実績報告のテスト

```typescript
describe('shiftActuals.create', () => {
  it('正常系: 実績を報告できる', async () => {
    // ...
  });

  it('異常系: 未来の日付は報告できない', async () => {
    // ...
  });
});
```

---

## パフォーマンス要件

1. **レスポンス時間**
   - 単一レコード取得: < 100ms
   - 一覧取得: < 500ms
   - AI生成: < 30秒

2. **同時接続**
   - 100職員が同時にアクセス可能

3. **データ量**
   - 1シフトあたり30職員 × 30日 = 900レコード程度

---

**作成者**: フロントエンドチーム  
**作成日**: 2025年11月8日  
**最終更新**: 2025年11月8日  
**バージョン**: 2.0.0
