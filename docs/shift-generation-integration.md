# シフト生成フロー統合設計書

## 📋 概要

本ドキュメントは、職員個別データ構造化システムとLLMベースのシフト生成システムを統合する設計を定義します。

**設計思想**: 優先度100の制約は事前計算で物理的に遵守不可能にし、LLMには選択肢の中から最適な配置を選ぶ役割のみを与える。

---

## 🏗️ システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      シフト生成リクエスト                      │
│            (期間: 2025-11-01 ~ 2025-11-30)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    フェーズ1: データ準備                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  1. 職員データ取得 (employees + additionalConstraints)        │
│  2. 勤務時間枠取得 (workTimeSlots)                            │
│  3. 希望休取得 (leaveRequests)                                │
│  4. 既存シフト取得 (shiftAssignments)                         │
│  5. 職場ルール取得 (workplaceRules)                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              フェーズ2: 配置可能枠の事前計算                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  各職員 × 各日付 × 各勤務時間枠について:                       │
│                                                               │
│  ✓ 優先度100制約チェック（絶対厳守）:                         │
│    - 希望休                                                   │
│    - 有給・誕生日休・季節休（取得済み）                       │
│    - 曜日制約 (day_off_pattern, specific_day_off)            │
│    - 勤務時間制約 (work_hours, specific_day_hours)           │
│    - 夜勤資格                                                 │
│    - 連続勤務上限                                             │
│    - 1日1シフト制限                                           │
│                                                               │
│  結果: availableSlotIds[employeeId][date] = [1, 3, 5, ...]   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               フェーズ3: LLMへのプロンプト構築                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  以下の情報をJSON形式でLLMに渡す:                             │
│                                                               │
│  1. 職員リスト（各職員について）:                             │
│     - 基本情報 (id, name, skillLevel, minDaysOffPerMonth)    │
│     - 個人情報 (personalInfo.situation, childrenAges)        │
│     - 休暇残日数 (paidLeave, birthdayLeave, seasonalLeave)   │
│                                                               │
│  2. 配置可能枠データ:                                         │
│     availableSlots: {                                        │
│       employeeId: {                                          │
│         "2025-11-01": [1, 3, 5],  // 勤務時間枠ID            │
│         "2025-11-02": [2, 4],                                │
│         ...                                                  │
│       }                                                      │
│     }                                                        │
│                                                               │
│  3. 勤務時間枠マスタ:                                         │
│     workTimeSlots: [                                         │
│       { id: 1, name: "早番", startTime: "08:00", ... },      │
│       { id: 2, name: "日勤", startTime: "09:00", ... },      │
│       ...                                                    │
│     ]                                                        │
│                                                               │
│  4. 職場ルール:                                               │
│     - 月の最低休日数                                          │
│     - 夜勤回数ノルマ                                          │
│     - 夜勤明け休み                                            │
│     - 正社員の週40時間要件                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  フェーズ4: LLMシフト生成                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  OpenAI API呼び出し (gpt-4o-2024-11-20):                     │
│                                                               │
│  プロンプト指示:                                              │
│  「あなたは介護施設のシフト作成AIです。                       │
│   与えられた配置可能枠の中から、以下の最適化目標に基づいて     │
│   シフトを作成してください。」                                 │
│                                                               │
│  最適化目標:                                                  │
│  1. 各勤務時間枠の必要人数を満たす                            │
│  2. 職員の希望を可能な限り尊重                                │
│  3. スキルレベルの高い職員を均等に配置                        │
│  4. 連続勤務日数を最小化                                      │
│  5. 休日を公平に分配                                          │
│                                                               │
│  制約:                                                        │
│  - availableSlots に含まれない配置は物理的に不可能            │
│  - 全ての優先度100制約は既にフィルタ済み                      │
│                                                               │
│  出力形式:                                                    │
│  {                                                           │
│    assignments: [                                            │
│      { employeeId: 1, date: "2025-11-01", timeSlotId: 3 },  │
│      ...                                                     │
│    ],                                                        │
│    explanation: "配置の根拠と最適化の考慮点"                  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  フェーズ5: バリデーション                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  LLMが返したシフトを検証:                                     │
│                                                               │
│  1. 全配置がavailableSlotsに含まれるか確認                    │
│  2. 1日1シフト制限の確認                                      │
│  3. 各勤務時間枠の必要人数を満たしているか確認                │
│  4. 職場ルール（月の最低休日数など）の確認                    │
│                                                               │
│  ❌ バリデーション失敗 → LLMに再生成リクエスト（最大3回）     │
│  ✅ バリデーション成功 → データベースに保存                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                フェーズ6: データベース保存                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  トランザクション開始:                                        │
│  1. 既存シフトを削除（該当期間）                              │
│  2. 新しいシフトを挿入（shiftAssignments）                    │
│  3. 生成メタデータを記録:                                     │
│     - 生成日時                                                │
│     - 使用モデル                                              │
│     - 配置根拠                                                │
│  コミット                                                     │
└─────────────────────────────────────────────────────────────┘

```

---

## 📊 データ構造詳細

### 1. 配置可能枠データ構造

```typescript
interface AvailableSlotsData {
  // 職員ID → 日付 → 配置可能な勤務時間枠ID配列
  [employeeId: number]: {
    [date: string]: number[];  // timeSlotIds
  };
}

// 例:
{
  "1": {  // 梅田英津子
    "2025-11-01": [1, 2, 3],     // 早番・日勤・遅番 OK
    "2025-11-02": [],            // この日は希望休
    "2025-11-03": [1, 2, 3, 4],  // 夜勤も可能
    ...
  },
  "5": {  // 海野はるか
    "2025-11-01": [1, 2],        // 早番・日勤のみ（夜勤資格なし）
    "2025-11-03": [],            // 水曜日休み（specific_day_off）
    ...
  }
}
```

### 2. LLMへのプロンプトデータ

```typescript
interface ShiftGenerationPrompt {
  // 期間
  period: {
    startDate: string;  // "2025-11-01"
    endDate: string;    // "2025-11-30"
  };

  // 職員情報
  employees: Array<{
    id: number;
    name: string;
    skillLevel: number;
    canWorkNightShift: boolean;
    minDaysOffPerMonth: number;
    personalInfo?: {
      situation?: string;      // "子供2人（2歳・5歳）、保育園送迎あり"
      childrenAges?: number[];
      specialNotes?: string;
    };
    leaveBalance: {
      paidLeave: { remaining: number };
      birthdayLeave?: { remaining: number, validMonth: string };
      seasonalLeave: {
        summer: { remaining: number, validPeriod: string };
        winter: { remaining: number, validPeriod: string };
      };
    };
  }>;

  // 勤務時間枠マスタ
  workTimeSlots: Array<{
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    isNightShift: boolean;
    requiredStaff: number;  // この枠に必要な職員数
  }>;

  // 配置可能枠（事前計算済み）
  availableSlots: AvailableSlotsData;

  // 職場ルール
  workplaceRules: {
    minRestDaysPerMonth: number;        // 月の最低休日数
    nightShiftQuota?: number;           // 夜勤回数ノルマ
    postNightShiftRest: boolean;        // 夜勤明け休み必須
    fulltimeRequiredHours: number;      // 正社員の週間必須時間
    maxConsecutiveDays: number;         // 最大連続勤務日数
  };

  // 最適化の重み（オプション）
  optimizationWeights?: {
    fairness: number;          // 公平性（休日分配）
    skillBalance: number;      // スキルバランス
    consecutiveDaysMin: number; // 連続勤務最小化
    preferenceRespect: number; // 希望尊重
  };
}
```

### 3. LLMからの出力データ

```typescript
interface ShiftGenerationOutput {
  // 生成されたシフト配置
  assignments: Array<{
    employeeId: number;
    date: string;
    timeSlotId: number;
  }>;

  // 配置の根拠と説明
  explanation: {
    summary: string;           // 全体的な配置方針
    optimization: string[];    // 最適化で考慮した点
    warnings?: string[];       // 警告（満たせなかった要件など）
  };

  // 統計情報
  statistics: {
    totalAssignments: number;
    employeeStats: Array<{
      employeeId: number;
      workDays: number;
      restDays: number;
      nightShifts: number;
      consecutiveMaxDays: number;
    }>;
  };
}
```

---

## 🔧 実装ポイント

### 1. calculateAvailableSlots関数の拡張

**ファイル**: `server/employeeDataStructurer.ts` に追加

```typescript
/**
 * 指定期間の全職員 × 全日付について配置可能枠を計算
 */
export async function calculateAllAvailableSlots(
  startDate: string,
  endDate: string
): Promise<AvailableSlotsData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. データ取得
  const employeesData = await db.select().from(employees);
  const slotsData = await db.select().from(workTimeSlots);
  const leaveRequests = await db
    .select()
    .from(leaveRequests)
    .where(/* 期間でフィルタ */);
  const existingShifts = await db
    .select()
    .from(shiftAssignments)
    .where(/* 期間でフィルタ */);

  // 2. 日付リスト生成
  const dates = generateDateRange(startDate, endDate);

  // 3. 全職員 × 全日付について計算
  const availableSlots: AvailableSlotsData = {};

  for (const employee of employeesData) {
    availableSlots[employee.id] = {};

    for (const date of dates) {
      const result = calculateAvailableSlots(
        employee,
        date,
        existingShifts,
        slotsData,
        leaveRequests
      );
      availableSlots[employee.id][date] = result.availableSlotIds;
    }
  }

  return availableSlots;
}
```

### 2. tRPC APIエンドポイント

**ファイル**: `server/api/routers/shift.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { generateShiftWithLLM } from "../../shiftGenerator";

export const shiftRouter = createTRPCRouter({
  /**
   * シフト生成リクエスト
   */
  generateShift: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        optimizationWeights: z
          .object({
            fairness: z.number().min(0).max(1).optional(),
            skillBalance: z.number().min(0).max(1).optional(),
            consecutiveDaysMin: z.number().min(0).max(1).optional(),
            preferenceRespect: z.number().min(0).max(1).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 1. 配置可能枠の事前計算
        const availableSlots = await calculateAllAvailableSlots(
          input.startDate,
          input.endDate
        );

        // 2. LLMでシフト生成
        const result = await generateShiftWithLLM({
          period: {
            startDate: input.startDate,
            endDate: input.endDate,
          },
          availableSlots,
          optimizationWeights: input.optimizationWeights,
        });

        // 3. バリデーション
        const validationResult = validateShiftAssignments(
          result.assignments,
          availableSlots
        );

        if (!validationResult.valid) {
          throw new Error(`シフト検証失敗: ${validationResult.errors.join(", ")}`);
        }

        // 4. データベースに保存
        await saveShiftAssignments(result.assignments);

        return {
          success: true,
          assignments: result.assignments,
          explanation: result.explanation,
          statistics: result.statistics,
        };
      } catch (error) {
        console.error("シフト生成エラー:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "不明なエラー",
        };
      }
    }),
});
```

### 3. LLMプロンプト構築

**ファイル**: `server/shiftGenerator.ts`

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateShiftWithLLM(
  data: ShiftGenerationPrompt
): Promise<ShiftGenerationOutput> {
  const prompt = buildPrompt(data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-11-20",
    messages: [
      {
        role: "system",
        content: `あなたは介護施設のシフト作成の専門家です。
職員の個別制約、職場ルール、公平性を考慮して最適なシフトを作成してください。

【重要】
- availableSlotsに含まれない配置は物理的に不可能です（絶対に選ばないでください）
- 全ての優先度100制約は既にフィルタ済みです
- あなたの役割は、選択肢の中から最適な配置を選ぶことです`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "shift_generation_output",
        strict: false,
        schema: {
          type: "object",
          properties: {
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employeeId: { type: "number" },
                  date: { type: "string" },
                  timeSlotId: { type: "number" },
                },
                required: ["employeeId", "date", "timeSlotId"],
              },
            },
            explanation: {
              type: "object",
              properties: {
                summary: { type: "string" },
                optimization: { type: "array", items: { type: "string" } },
                warnings: { type: "array", items: { type: "string" } },
              },
              required: ["summary", "optimization"],
            },
            statistics: {
              type: "object",
              // ... 統計情報のスキーマ
            },
          },
          required: ["assignments", "explanation", "statistics"],
        },
      },
    },
    temperature: 0.3,  // 低めに設定して安定性を重視
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("OpenAI APIからのレスポンスが空です");
  }

  return JSON.parse(content);
}

function buildPrompt(data: ShiftGenerationPrompt): string {
  return `
# シフト作成依頼

## 期間
${data.period.startDate} 〜 ${data.period.endDate}

## 職員情報
${JSON.stringify(data.employees, null, 2)}

## 勤務時間枠
${JSON.stringify(data.workTimeSlots, null, 2)}

## 配置可能枠（事前計算済み）
${JSON.stringify(data.availableSlots, null, 2)}

## 職場ルール
${JSON.stringify(data.workplaceRules, null, 2)}

## 最適化目標
1. 各勤務時間枠の必要人数を満たす（requiredStaff）
2. 職員の休日数を公平に分配
3. スキルレベルの高い職員を各日に均等配置
4. 連続勤務日数を最小化
5. 個人情報（子育て中など）を考慮した配慮

## 制約
- **絶対厳守**: availableSlots に含まれない配置は選択不可
- 1職員1日1シフトまで
- 月の最低休日数を保証

上記を踏まえて、最適なシフトを作成してください。
`;
}
```

### 4. バリデーション関数

**ファイル**: `server/shiftValidator.ts`

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateShiftAssignments(
  assignments: Array<{ employeeId: number; date: string; timeSlotId: number }>,
  availableSlots: AvailableSlotsData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // チェック1: availableSlotsに含まれるか
  for (const assignment of assignments) {
    const available = availableSlots[assignment.employeeId]?.[assignment.date] ?? [];
    if (!available.includes(assignment.timeSlotId)) {
      errors.push(
        `職員ID ${assignment.employeeId} は ${assignment.date} に勤務時間枠ID ${assignment.timeSlotId} に配置できません（availableSlots違反）`
      );
    }
  }

  // チェック2: 1日1シフト制限
  const employeeDateMap = new Map<string, number>();
  for (const assignment of assignments) {
    const key = `${assignment.employeeId}-${assignment.date}`;
    const count = (employeeDateMap.get(key) ?? 0) + 1;
    employeeDateMap.set(key, count);

    if (count > 1) {
      errors.push(
        `職員ID ${assignment.employeeId} が ${assignment.date} に複数配置されています`
      );
    }
  }

  // チェック3: 必要人数の充足（警告のみ）
  // ... 実装

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## 🚀 実装順序

### フェーズ1: コア機能実装（現在完了済み）
- ✅ TypeScript型定義（EmployeeConstraints）
- ✅ employeeDataStructurer.ts（自然言語→構造化）
- ✅ calculateAvailableSlots（単一職員・単一日付）
- ✅ 職場ルール統合
- ✅ テストスクリプト（海野・加藤・梅田・大橋）

### フェーズ2: シフト生成統合（次のステップ）
1. **calculateAllAvailableSlots 実装**
   - ファイル: `server/availableSlotsCalculator.ts`（新規作成）
   - 目的: 指定期間の全職員×全日付について配置可能枠を計算
   - テスト: `scripts/test-calculate-all-available-slots.ts`

2. **shiftGenerator.ts 実装**
   - ファイル: `server/shiftGenerator.ts`（新規作成）
   - 目的: LLMプロンプト構築 + OpenAI API呼び出し
   - テスト: `scripts/test-shift-generation.ts`（小規模テスト: 1週間分）

3. **shiftValidator.ts 実装**
   - ファイル: `server/shiftValidator.ts`（新規作成）
   - 目的: LLM出力のバリデーション
   - テスト: `scripts/test-shift-validation.ts`

4. **tRPC APIエンドポイント**
   - ファイル: `server/api/routers/shift.ts`（修正）
   - エンドポイント: `shift.generateShift`
   - テスト: Postman or HTTPie

### フェーズ3: UI実装
1. **シフト生成ボタン**
   - ファイル: `client/src/components/ShiftGenerationPanel.tsx`
   - 機能: 期間選択 + 生成実行

2. **結果表示**
   - ファイル: `client/src/components/ShiftResultsView.tsx`
   - 機能: カレンダー表示 + 統計情報

### フェーズ4: 最適化と本番運用
1. **パフォーマンス最適化**
   - キャッシュ戦略（availableSlots）
   - バッチ処理の並列化

2. **エラーハンドリング**
   - LLM失敗時のリトライ
   - フォールバック戦略

3. **ログとモニタリング**
   - 生成履歴の記録
   - 配置根拠のトレーサビリティ

---

## 🎯 期待される効果

### 1. ルール違反の物理的排除
- 優先度100制約は事前計算でフィルタ → LLMは選択肢の中からしか選べない
- ハルシネーションによるルール違反が**物理的に不可能**

### 2. LLMの役割明確化
- LLMは「最適化」に専念（選択肢の中から最良を選ぶ）
- ルールチェックはシステムが担当
- プロンプトがシンプルになり、精度向上

### 3. 説明可能性の向上
- LLMが配置根拠を返す
- バリデーションエラーも明確
- トラブルシューティングが容易

### 4. スケーラビリティ
- 職員数が増えても事前計算は並列化可能
- LLMへのプロンプトサイズは一定（availableSlots は圧縮表現）

---

## 📝 注意事項

### OpenAI APIコスト管理
- **事前計算**（フェーズ2）は無料（ローカル計算）
- **LLM呼び出し**（フェーズ4）のみコスト発生
- 推定コスト: 1ヶ月分のシフト生成 = 約$0.10-0.50（プロンプトサイズに依存）

### 段階的テスト推奨
1. **1週間分**: 7日間のシフト生成でロジック確認
2. **2週間分**: 中期的な最適化の確認
3. **1ヶ月分**: 本番運用レベルのテスト

### データ整合性
- `additionalConstraints` の更新時は、既存シフトの再計算が必要かチェック
- 職場ルール変更時も同様

---

## 🔗 関連ファイル

| ファイル | 役割 |
|---------|------|
| `server/employeeDataStructurer.ts` | 自然言語→構造化データ |
| `scripts/test-available-slots.ts` | 配置可能枠計算のプロトタイプ |
| `shared/employeeConstraintTypes.ts` | TypeScript型定義 |
| `drizzle/schema.ts` | データベーススキーマ |
| `server/db.ts` | Drizzle ORM接続 |

---

## ✅ まとめ

本設計により、以下が実現されます:

1. **優先度100制約の絶対遵守**: 事前計算により物理的に違反不可能
2. **LLMの最適活用**: 選択肢の中から最適解を選ぶ役割に特化
3. **説明可能性**: 配置根拠が明確で監査可能
4. **スケーラビリティ**: 職員数増加に対応可能
5. **コスト効率**: 事前計算は無料、LLM呼び出しは最小限

次のステップは「フェーズ2: シフト生成統合」の実装開始です。
