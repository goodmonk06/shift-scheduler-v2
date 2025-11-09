# バックエンド統合ガイド

このドキュメントは、フロントエンドコードを既存のバックエンドシステムに統合するための包括的な手順書です。

**最終更新**: 2025年11月8日  
**バージョン**: 2.0.0

---

## 📋 目次

1. [統合の概要](#統合の概要)
2. [システム全体像](#システム全体像)
3. [必要なデータベース変更](#必要なデータベース変更)
4. [必要なAPIエンドポイント](#必要なapiエンドポイント)
5. [AI統合（ChatGPT 4 mini）](#ai統合chatgpt-4-mini)
6. [フロントエンド統合手順](#フロントエンド統合手順)
7. [環境変数の設定](#環境変数の設定)
8. [動作確認手順](#動作確認手順)
9. [トラブルシューティング](#トラブルシューティング)

---

## 統合の概要

### 現在の状態
- ✅ フロントエンドは完全に動作（localStorageベースのモック）
- ✅ API抽象化層が実装済み（`/services/` ディレクトリ）
- ✅ 型定義が完備（`/types/api.ts`）
- ✅ Context APIでのグローバル状態管理
- ✅ 職員画面・管理者画面の全機能実装済み

### 統合後の状態
- ✅ バックエンドAPIとの完全な連携
- ✅ リアルタイムなデータ同期
- ✅ 複数ユーザーでのデータ共有
- ✅ AI自動シフト生成（ChatGPT 4 mini）
- ✅ 実績報告・承認フロー

### アーキテクチャ

```
┌─────────────────────────────────┐
│   職員画面（スマホ最適化）      │
│   - 希望休申請                  │
│   - シフト確認（3タブ）         │
│   - 追加希望申請                │
│   - 実績報告                    │
│   - 設定カスタマイズ            │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  管理者画面（PC最適化）         │
│  - ダッシュボード               │
│  - AI自動シフト生成             │
│  - シフト編集                   │
│  - 希望休管理                   │
│  - 実績承認                     │
│  - 職員管理                     │
│  - 統計・レポート               │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  API抽象化層（/services/）      │
│  - vacationService.ts           │
│  - shiftService.ts              │
│  - authService.ts               │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  バックエンドAPI（tRPC）        │
│  - 希望休API                    │
│  - シフトAPI                    │
│  - 実績報告API                  │
│  - 設定API                      │
│  - AI生成API                    │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  外部サービス                   │
│  - OpenAI API（GPT-4 mini）     │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  データベース（PostgreSQL）     │
│  - Employee                     │
│  - Shift / ShiftDetail          │
│  - LeaveRequest                 │
│  - ShiftActual                  │
│  - StaffSettings                │
└─────────────────────────────────┘
```

---

## システム全体像

### 画面構成

**職員画面（スマホ最適化）**
- ログイン画面
- ホーム
- 希望休申請
- シフト確認（3タブ）
- 設定

**管理者画面（PC最適化）**
- ログイン画面
- ダッシュボード
- 職員管理
- 役職グループ
- 勤務時間枠
- 職場ルール
- 必要人数設定
- **シフト一覧** ← ここから新規作成・編集へ遷移
  - シフト作成: 年月選択 → ShiftCreation画面へ
  - シフト編集: 既存シフトクリック → ShiftEditor画面へ
- 希望休管理
- 変更提案管理
- 統計・レポート
- 緊急通知
- アーカイブ

**重要**: ShiftCreation と ShiftEditor は **別ページではなく、管理者画面内の一機能** として統合されています。

---

### シフト生成フロー（6段階）

```
① 希望休収集
   - 職員が希望休を申請
   - 締め切りまで修正可能
   ↓
② AI自動生成
   - ChatGPT 4 miniで最適化
   - 制約条件を考慮
   - 警告を生成
   ↓
③ 仮確定
   - 管理者が確認・調整
   - 職員に公開
   ↓
④ 仮確定改
   - 職員から追加希望受付
   - 管理者が再調整
   ↓
⑤ 最終確定
   - シフト確定
   - 変更不可
   ↓
⑥ 実績報告
   - 勤務後に実績入力
   - 管理者が承認
```

### 主要機能

#### 職員画面
1. **ホーム**: 次回シフト、今月のスケジュール、緊急連絡
2. **希望休申請**: カレンダーUIで直感的に入力
3. **シフト確認**:
   - 仮確定タブ: 追加希望申請
   - 確定タブ: 確定済みシフト
   - 実績報告タブ: 勤務実績入力
4. **設定**: テーマ・画像・フォントサイズのカスタマイズ

#### 管理者画面
1. **ダッシュボード**: 全体の状況把握
2. **希望休管理**: 承認・却下
3. **シフト生成**: AI自動生成 + 手動調整
4. **シフト編集**: カレンダー/テーブルビュー
5. **シフト一覧**: 過去・現在のシフト管理
6. **職員管理**: 情報・制約条件管理
7. **必須人員設定**: 日付・時間帯別設定
8. **職位グループ**: 優先度設定
9. **勤務時間帯**: シフトタイプ定義
10. **職場ルール**: 連勤制限など
11. **統計**: 分析・レポート
12. **アーカイブ**: 過去シフト保存

---

## 必要なデータベース変更

### 1. LeaveRequestテーブルの拡張

既存のテーブルに以下のカラムを追加してください：

```sql
-- カラム追加
ALTER TABLE "LeaveRequest"
ADD COLUMN "leaveType" VARCHAR(20) NOT NULL DEFAULT '休',
ADD COLUMN "startTime" VARCHAR(5),
ADD COLUMN "endTime" VARCHAR(5),
ADD COLUMN "isAdditional" BOOLEAN NOT NULL DEFAULT FALSE;

-- 制約追加
ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "check_leave_type" 
CHECK ("leaveType" IN ('休', '有休', '時間指定'));

ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "check_time_format"
CHECK (
  ("startTime" IS NULL OR "startTime" ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$') AND
  ("endTime" IS NULL OR "endTime" ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$')
);

ALTER TABLE "LeaveRequest"
ADD CONSTRAINT "check_time_required"
CHECK (
  ("leaveType" != '時間指定') OR 
  ("startTime" IS NOT NULL AND "endTime" IS NOT NULL)
);

-- インデックス追加
CREATE INDEX "idx_leave_request_employee_shift" ON "LeaveRequest"("employeeId", "shiftId");
CREATE INDEX "idx_leave_request_status" ON "LeaveRequest"("status");
CREATE INDEX "idx_leave_request_additional" ON "LeaveRequest"("isAdditional");
```

#### カラム説明

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| `leaveType` | VARCHAR(20) | NO | '休' | 休みの種類（"休", "有休", "時間指定"） |
| `startTime` | VARCHAR(5) | YES | NULL | 開始時刻（HH:MM形式） |
| `endTime` | VARCHAR(5) | YES | NULL | 終了時刻（HH:MM形式） |
| `isAdditional` | BOOLEAN | NO | FALSE | 追加希望かどうか（仮確定後） |

---

### 2. Shiftテーブルの拡張

```sql
-- カラム追加
ALTER TABLE "Shift"
ADD COLUMN "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
ADD COLUMN "leaveRequestDeadline" TIMESTAMP,
ADD COLUMN "additionalRequestDeadline" TIMESTAMP,
ADD COLUMN "generatedBy" VARCHAR(20) NOT NULL DEFAULT 'manual',
ADD COLUMN "aiPrompt" TEXT,
ADD COLUMN "aiResponse" JSONB;

-- 制約追加
ALTER TABLE "Shift"
ADD CONSTRAINT "check_shift_status"
CHECK ("status" IN ('draft', 'tentative', 'tentative_revised', 'confirmed', 'actual', 'archived'));

ALTER TABLE "Shift"
ADD CONSTRAINT "check_generated_by"
CHECK ("generatedBy" IN ('manual', 'ai'));

-- インデックス追加
CREATE INDEX "idx_shift_status" ON "Shift"("status");
CREATE INDEX "idx_shift_deadlines" ON "Shift"("leaveRequestDeadline", "additionalRequestDeadline");
CREATE INDEX "idx_shift_generated_by" ON "Shift"("generatedBy");
```

#### カラム説明

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| `status` | VARCHAR(30) | NO | シフトステータス（6段階） |
| `leaveRequestDeadline` | TIMESTAMP | YES | 通常の希望休締め切り |
| `additionalRequestDeadline` | TIMESTAMP | YES | 追加希望締め切り（仮確定後） |
| `generatedBy` | VARCHAR(20) | NO | 生成方法（"manual" or "ai"） |
| `aiPrompt` | TEXT | YES | AI生成時のプロンプト（デバッグ用） |
| `aiResponse` | JSONB | YES | AI生成時のレスポンス（デバッグ用） |

---

### 3. ShiftActualテーブル（新規作成）

実績報告を管理する新しいテーブルを作成してください：

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

#### カラム説明

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| `shiftDetailId` | INTEGER | NO | ShiftDetailへの外部キー |
| `actualStartTime` | VARCHAR(5) | YES | 実際の開始時刻 |
| `actualEndTime` | VARCHAR(5) | YES | 実際の終了時刻 |
| `note` | TEXT | YES | 備考（残業理由など） |
| `reportedAt` | TIMESTAMP | NO | 報告日時 |
| `approvedAt` | TIMESTAMP | YES | 承認日時 |
| `approvedBy` | INTEGER | YES | 承認者ID |
| `status` | VARCHAR(20) | NO | ステータス（reported/approved/rejected） |

---

### 4. StaffSettingsテーブル（新規作成）

職員のカスタマイズ設定を管理する新しいテーブル：

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

---

## 必要なAPIエンドポイント

詳細な仕様は [API_REQUIREMENTS.md](./API_REQUIREMENTS.md) を参照してください。

### 希望休関連（4エンドポイント）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `leaveRequests.createBatch` | POST | 複数の希望休を一括作成 |
| `leaveRequests.createAdditional` | POST | 追加希望申請（仮確定後） |
| `leaveRequests.getByEmployee` | GET | 職員の希望休一覧取得 |
| `leaveRequests.delete` | DELETE | 希望休削除（締め切り前） |

### シフト関連（4エンドポイント）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `shifts.generateWithAI` | POST | AI自動シフト生成 |
| `shifts.updateStatus` | POST | シフトステータス更新 |
| `shifts.setDeadlines` | POST | 締め切り設定 |
| `shifts.getById` | GET | シフト詳細取得 |

### 実績報告関連（4エンドポイント）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `shiftActuals.create` | POST | 実績報告作成 |
| `shiftActuals.update` | PUT | 実績報告更新 |
| `shiftActuals.approve` | POST | 実績報告承認 |
| `shiftActuals.getByEmployee` | GET | 実績一覧取得 |

### 設定関連（2エンドポイント）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `staffSettings.get` | GET | 設定取得 |
| `staffSettings.update` | POST | 設定更新 |

---

## AI統合（ChatGPT 4 mini）

### OpenAI API設定

```bash
# .env に追加
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
```

### 実装概要

1. **プロンプト構築**: 希望休、必須人員、制約条件を整形
2. **API呼び出し**: OpenAI Chat Completions API
3. **レスポンス処理**: JSON形式でシフトデータを取得
4. **バリデーション**: 制約違反チェック
5. **データベース保存**: ShiftDetailレコード作成

詳細は [AI_GENERATION_GUIDE.md](./AI_GENERATION_GUIDE.md) を参照してください。

---

## フロントエンド統合手順

### Step 0: App.tsxの切り替え（本番版へ）

現在の`App.tsx`はプレビュー用です。バックエンド統合時には`App.production.tsx`に切り替えてください。

```bash
# 現在のApp.tsxをバックアップ
mv App.tsx App.demo.tsx

# 本番版をApp.tsxに変更
mv App.production.tsx App.tsx
```

または、ビルド時に切り替える場合：

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "dev:demo": "vite --mode demo",
    "build": "tsc && vite build",
    "build:demo": "tsc && vite build --mode demo"
  }
}
```

```javascript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      './App': mode === 'demo' ? './App.demo' : './App.production',
    },
  },
}));
```

**App.production.tsxの特徴:**
- 統合ログイン画面（職員/管理者切り替え可能）
- 認証状態管理（ページリロード対応）
- ログイン後、権限に応じて自動的に適切な画面を表示
- ログアウト機能統合

---

### Step 1: API Service実装

`/services/` 内の `*ServiceProduction` クラスを実装してください。

#### vacationService.ts

```typescript
export class VacationServiceProduction extends VacationService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  async getLeaveRequests(filter: GetLeaveRequestsFilter): Promise<LeaveRequest[]> {
    const queryParams = new URLSearchParams(filter as any).toString();
    const response = await fetch(
      `${this.baseUrl}/api/trpc/leaveRequests.getByEmployee?${queryParams}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.result?.data || [];
  }
  
  async createLeaveRequests(requests: CreateLeaveRequest[]): Promise<LeaveRequest[]> {
    const response = await fetch(
      `${this.baseUrl}/api/trpc/leaveRequests.createBatch`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create leave requests');
    }
    
    const data = await response.json();
    return data.result?.data || [];
  }
  
  // ... 他のメソッドも同様に実装
}
```

#### shiftService.ts

```typescript
export class ShiftServiceProduction extends ShiftService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  async generateWithAI(input: GenerateShiftInput): Promise<GenerateShiftResult> {
    const response = await fetch(
      `${this.baseUrl}/api/trpc/shifts.generateWithAI`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );
    
    if (!response.ok) {
      throw new Error(`AI生成に失敗しました: ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.result?.data;
  }
  
  // ... 他のメソッドも同様に実装
}
```

### Step 2: 環境変数設定

```bash
# .env.production
VITE_API_BASE_URL=https://your-api-domain.com
VITE_USE_MOCK_API=false
```

### Step 3: サービスのインスタンス化

```typescript
// services/index.ts（新規作成）

import { VacationServiceMock, VacationServiceProduction } from './vacationService';
import { ShiftServiceMock, ShiftServiceProduction } from './shiftService';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const vacationService = useMock 
  ? new VacationServiceMock() 
  : new VacationServiceProduction();

export const shiftService = useMock 
  ? new ShiftServiceMock() 
  : new ShiftServiceProduction();
```

---

## 環境変数の設定

### 開発環境（.env.development）

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK_API=true  # モックAPIを使用
```

### 本番環境（.env.production）

```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_USE_MOCK_API=false  # 実際のAPIを使用
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

---

## 動作確認手順

### 1. ローカル環境での確認

```bash
# バックエンド起動
cd server
npm run dev

# フロントエンド起動
cd frontend
npm run dev

# ブラウザで確認
open http://localhost:5173
```

### 2. 機能テスト

#### 職員画面
- [ ] ログイン
- [ ] 希望休申請（休・有休・時間指定）
- [ ] 希望休の削除
- [ ] シフト確認（3タブ）
- [ ] 追加希望申請（仮確定後）
- [ ] 実績報告
- [ ] 設定変更（テーマ・画像・フォントサイズ）

#### 管理者画面
- [ ] ログイン
- [ ] ダッシュボード表示
- [ ] 希望休承認・却下
- [ ] AI自動シフト生成
- [ ] シフト編集
- [ ] シフトステータス更新
- [ ] 実績承認

### 3. パフォーマンス確認

```bash
# レスポンス時間測定
curl -w "@curl-format.txt" -o /dev/null -s "https://api.yourdomain.com/api/shifts"

# 同時接続テスト
ab -n 1000 -c 100 https://api.yourdomain.com/api/shifts
```

---

## トラブルシューティング

### 問題1: APIエラー（401 Unauthorized）

**原因**: 認証トークンが不正または期限切れ

**解決策**:
```typescript
// 認証ヘッダーを追加
headers: {
  'Authorization': `Bearer ${token}`,
}
```

---

### 問題2: CORS エラー

**原因**: バックエンドのCORS設定が不正

**解決策**:
```typescript
// server/index.ts
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true,
}));
```

---

### 問題3: AI生成が失敗する

**原因**: OpenAI APIキーが不正またはレート制限

**解決策**:
1. APIキーを確認
2. リトライロジックを実装
3. フォールバック処理（手動ベース生成）

---

### 問題4: データベースマイグレーションエラー

**原因**: 既存データとの互換性問題

**解決策**:
```sql
-- 既存データに デフォルト値を設定
UPDATE "LeaveRequest" 
SET "leaveType" = '休' 
WHERE "leaveType" IS NULL;
```

---

### 問題5: パフォーマンス問題

**原因**: N+1問題、インデックス不足

**解決策**:
```typescript
// Prismaでincludeを活用
const shifts = await prisma.shift.findMany({
  include: {
    shiftDetails: true,
    leaveRequests: true,
  },
});

// インデックス追加
CREATE INDEX idx_shift_detail_date ON "ShiftDetail"("date");
```

---

## 参考資料

### 関連ドキュメント
- [API_REQUIREMENTS.md](./API_REQUIREMENTS.md) - API詳細仕様
- [AI_GENERATION_GUIDE.md](./AI_GENERATION_GUIDE.md) - AI生成詳細
- [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - 進捗管理

### 技術スタック
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [tRPC](https://trpc.io/)
- [Prisma](https://www.prisma.io/)
- [OpenAI API](https://platform.openai.com/docs/)

---

**作成者**: フロントエンドチーム  
**作成日**: 2025年11月8日  
**最終更新**: 2025年11月8日  
**バージョン**: 2.0.0

**統合作業を始める準備ができました！Good Luck! 🚀**
