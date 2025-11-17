/**
 * LLMベースのシフト生成モジュール
 *
 * 配置可能枠（availableSlots）とWorkplaceRulesに基づいて
 * OpenAI APIでシフトを生成
 */

import OpenAI from "openai";
import type { AvailableSlotsData } from "./availableSlotsCalculator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 型定義
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface EmployeeInfo {
  id: number;
  name: string;
  skillLevel: number;
  canWorkNightShift: boolean;
  minDaysOffPerMonth: number;
  personalInfo?: {
    situation?: string;
    childrenAges?: number[];
    specialNotes?: string;
  };
  leaveBalance: {
    paidLeave: { remaining: number };
    birthdayLeave?: { remaining: number; validMonth: string };
    seasonalLeave: {
      summer: { remaining: number; validPeriod: string };
      winter: { remaining: number; validPeriod: string };
    };
  };
}

export interface WorkTimeSlotInfo {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  isNightShift: boolean;
  requiredStaff: number;
}

export interface WorkplaceRulesInfo {
  minRestDaysPerMonth: number;
  nightShiftQuota?: number;
  postNightShiftRest: boolean;
  fulltimeRequiredHours: number;
  maxConsecutiveDays: number;
}

export interface ShiftGenerationPrompt {
  period: {
    startDate: string;
    endDate: string;
  };
  employees: EmployeeInfo[];
  workTimeSlots: WorkTimeSlotInfo[];
  availableSlots: AvailableSlotsData;
  workplaceRules: WorkplaceRulesInfo;
  optimizationWeights?: {
    fairness?: number;
    skillBalance?: number;
    consecutiveDaysMin?: number;
    preferenceRespect?: number;
  };
}

export interface ShiftAssignmentOutput {
  employeeId: number;
  date: string;
  timeSlotId: number;
}

export interface ShiftGenerationOutput {
  assignments: ShiftAssignmentOutput[];
  explanation: {
    summary: string;
    optimization: string[];
    warnings?: string[];
  };
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// プロンプト構築
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPrompt(data: ShiftGenerationPrompt): string {
  const { period, employees, workTimeSlots, availableSlots, workplaceRules } = data;

  // 期待される配置総数を計算
  const dates = [];
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  const totalRequiredPerDay = workTimeSlots.reduce((sum, slot) => sum + slot.requiredStaff, 0);
  const estimatedTotal = totalRequiredPerDay * dates.length;

  return `
# シフト作成依頼

## タスクの概要
あなたは介護施設の**${dates.length}日間**のシフト表を作成します。
**毎日**、各勤務時間枠（早番、日勤、遅番、夜勤など）に**必要人数分の職員**を配置してください。

**期待される配置総数**: 約${estimatedTotal}件
（= ${totalRequiredPerDay}人/日 × ${dates.length}日）

## 期間
${period.startDate} 〜 ${period.endDate}（${dates.length}日間）

## 勤務時間枠（${workTimeSlots.length}枠）
**毎日、以下の全時間枠に必要人数を配置してください**:

${workTimeSlots.map(s => `- ID:${s.id} ${s.name} (${s.startTime}-${s.endTime}) **必要人数:${s.requiredStaff}人** ${s.isNightShift ? '[夜勤]' : ''}`).join('\n')}

合計: 1日あたり${totalRequiredPerDay}人必要

## 職員情報（${employees.length}人）
利用可能な職員は${employees.length}人です:

${JSON.stringify(
  employees.map((e) => ({
    id: e.id,
    name: e.name,
    skillLevel: e.skillLevel,
    canWorkNightShift: e.canWorkNightShift,
    minDaysOffPerMonth: e.minDaysOffPerMonth,
  })),
  null,
  2
)}

## 配置可能枠（事前計算済み）
**🚨 最重要制約 🚨**

以下の\`availableSlots\`は、各職員が各日付に配置可能な時間枠IDのリストです。
**この範囲外の配置は物理的に不可能**です（夜勤不可、希望休、勤務時間制約などで既にフィルタ済み）。

### 使用方法の具体例:
職員ID 5 を 2025-11-01 に配置する場合:
1. \`availableSlots["5"]["2025-11-01"]\` を確認 → [7, 8, 9, 10]
2. この中からtimeSlotIdを選択 → 例: 8 (日勤A)
3. 結果: \`{ "employeeId": 5, "date": "2025-11-01", "timeSlotId": 8 }\` ✅ 正しい

❌ 間違った例:
- \`{ "employeeId": 5, "date": "2025-11-01", "timeSlotId": 6 }\` → ID 6 は availableSlots[5]["2025-11-01"] に含まれていないためエラー

### 配置可能枠データ:
\`\`\`json
${JSON.stringify(availableSlots, null, 2)}
\`\`\`

**重要**: 配置を作成する際は、必ず \`availableSlots[employeeId][date]\` 配列内のtimeSlotIdを選んでください。

## 職場ルール
- 月の最低休日数: ${workplaceRules.minRestDaysPerMonth}日
- 夜勤回数ノルマ: ${workplaceRules.nightShiftQuota ?? 'なし'}
- 夜勤明け休み必須: ${workplaceRules.postNightShiftRest ? 'はい' : 'いいえ'}
- 最大連続勤務日数: ${workplaceRules.maxConsecutiveDays}日

## 推奨アルゴリズム

以下の手順でシフトを作成してください:

\`\`\`
FOR 各日付 (2025-11-01 〜 2025-11-07):
  FOR 各時間枠 (ID: 5, 7, 8, 9, 10, 4, 6):
    必要人数 = timeSlot.requiredStaff

    FOR i = 1 to 必要人数:
      # 利用可能な職員を探す
      FOR 各職員:
        IF availableSlots[職員ID][日付] に 時間枠ID が含まれる:
          AND 職員がその日にまだ配置されていない:
          AND 職員の月間勤務日数が上限未満:
            → この職員を配置
            → assignments に追加
            BREAK
\`\`\`

## 最適化目標（優先順位順）

1. **🎯 最優先: 毎日の必要人数を満たす**
   - 各日の各時間枠で requiredStaff 人を配置
   - 不足は絶対に避ける

2. **公平性: 勤務日数を均等に分配**
   - 特定の職員に負担が集中しないように

3. **スキルバランス: 各日に高スキル職員を配置**
   - skillLevel を各日に均等分散

4. **連続勤務の最小化**
   - 可能な限り連続勤務を短く

## 制約（厳守）

- ❌ **絶対禁止**: \`availableSlots[employeeId][date]\` に含まれないtimeSlotIdの使用
- ❌ **絶対禁止**: 1職員を1日に複数シフトに配置
- ✅ **必須**: 月の最低休日数を保証
- ✅ **推奨**: 夜勤可能な職員間で夜勤回数を公平に分配

## 出力形式
JSON形式で以下の構造で返してください:
{
  "assignments": [
    { "employeeId": 1, "date": "2025-11-01", "timeSlotId": 7 },
    { "employeeId": 2, "date": "2025-11-01", "timeSlotId": 8 },
    ... (約${estimatedTotal}件)
  ],
  "explanation": {
    "summary": "全体的な配置方針の説明",
    "optimization": ["最適化で考慮した点1", "考慮した点2", ...],
    "warnings": ["警告がある場合"]
  },
  "statistics": {
    "totalAssignments": 配置総数,
    "employeeStats": [
      {
        "employeeId": 1,
        "workDays": 勤務日数,
        "restDays": 休日数,
        "nightShifts": 夜勤回数,
        "consecutiveMaxDays": 最大連続勤務日数
      },
      ...
    ]
  }
}

**重要**: assignmentsは約${estimatedTotal}件必要です（${dates.length}日 × ${totalRequiredPerDay}人/日）。
1日あたり十分な人数を配置してください。
`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メイン処理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * LLMでシフトを生成
 */
export async function generateShiftWithLLM(
  data: ShiftGenerationPrompt
): Promise<ShiftGenerationOutput> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 LLMシフト生成開始');
  console.log(`期間: ${data.period.startDate} 〜 ${data.period.endDate}`);
  console.log(`職員: ${data.employees.length}人`);
  console.log(`勤務時間枠: ${data.workTimeSlots.length}枠`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prompt = buildPrompt(data);

  // 有効なtimeSlotIdのリストを生成
  const validTimeSlotIds = data.workTimeSlots.map(s => s.id);

  console.log('1️⃣ OpenAI API呼び出し中...\n');
  console.log(`   有効な勤務時間枠ID: [${validTimeSlotIds.join(', ')}]\n`);

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
- あなたの役割は、選択肢の中から最適な配置を選ぶことです
- 各勤務時間枠の必要人数を満たすことを最優先してください
- timeSlotIdは必ず提供された勤務時間枠のIDのみを使用してください（${validTimeSlotIds.join(', ')}）`,
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
                  timeSlotId: {
                    type: "number",
                    enum: validTimeSlotIds
                  },
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
              properties: {
                totalAssignments: { type: "number" },
                employeeStats: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      employeeId: { type: "number" },
                      workDays: { type: "number" },
                      restDays: { type: "number" },
                      nightShifts: { type: "number" },
                      consecutiveMaxDays: { type: "number" },
                    },
                    required: ["employeeId", "workDays", "restDays", "nightShifts", "consecutiveMaxDays"],
                  },
                },
              },
              required: ["totalAssignments", "employeeStats"],
            },
          },
          required: ["assignments", "explanation", "statistics"],
        },
      },
    },
    temperature: 0.3, // 低めに設定して安定性を重視
  });

  console.log('2️⃣ API呼び出し完了\n');

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("OpenAI APIからのレスポンスが空です");
  }

  const result: ShiftGenerationOutput = JSON.parse(content);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ LLMシフト生成完了');
  console.log(`配置総数: ${result.assignments.length}件`);
  console.log(`職員統計: ${result.statistics.employeeStats.length}人`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 配置根拠:');
  console.log(result.explanation.summary);
  console.log('');

  if (result.explanation.warnings && result.explanation.warnings.length > 0) {
    console.log('⚠️ 警告:');
    result.explanation.warnings.forEach(w => console.log(`  - ${w}`));
    console.log('');
  }

  return result;
}

/**
 * シフト生成の統計情報を表示
 */
export function printShiftStatistics(output: ShiftGenerationOutput): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 シフト統計情報');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`配置総数: ${output.statistics.totalAssignments}件\n`);

  console.log('職員別統計:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('職員ID | 勤務日数 | 休日数 | 夜勤回数 | 最大連続勤務');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  output.statistics.employeeStats.forEach((stat) => {
    console.log(
      `${String(stat.employeeId).padStart(6)} | ${String(stat.workDays).padStart(8)} | ${String(stat.restDays).padStart(6)} | ${String(stat.nightShifts).padStart(8)} | ${String(stat.consecutiveMaxDays).padStart(12)}`
    );
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 平均値計算
  const avgWorkDays =
    output.statistics.employeeStats.reduce((sum, s) => sum + s.workDays, 0) /
    output.statistics.employeeStats.length;
  const avgNightShifts =
    output.statistics.employeeStats.reduce((sum, s) => sum + s.nightShifts, 0) /
    output.statistics.employeeStats.length;

  console.log(`平均勤務日数: ${avgWorkDays.toFixed(1)}日`);
  console.log(`平均夜勤回数: ${avgNightShifts.toFixed(1)}回`);
  console.log('');
}
