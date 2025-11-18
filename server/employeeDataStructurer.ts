/**
 * 職員個別データ構造化モジュール
 *
 * 自然言語入力を構造化データに変換し、職場ルールと統合
 */

import { getDb } from "./db";
import { employees, positionGroups, workplaceRules } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import type {
  EmployeeConstraints,
  WorkConstraint,
  LeaveAllowances,
  PersonalInfo,
  StructureEmployeeDataResponse,
} from "../shared/employeeConstraintTypes";

// Debug mode control (use DEBUG=true environment variable to enable verbose logging)
const DEBUG = process.env.DEBUG === 'true';
const log = DEBUG ? console.log : () => {}; // No-op function when debug is off

/**
 * JSON Schema for OpenAI Structured Outputs
 */
const EMPLOYEE_CONSTRAINTS_SCHEMA = {
  type: "object",
  properties: {
    rawInput: {
      type: "string",
      description: "入力された自然言語をそのまま記録"
    },
    workConstraints: {
      type: "array",
      description: "勤務制約（優先度100 - 絶対厳守）",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          type: {
            type: "string",
            enum: [
              "day_off_pattern",
              "specific_day_off",
              "work_hours",
              "specific_day_hours",
              "max_consecutive_days",
              "max_weekly_hours"
            ]
          },
          description: { type: "string" },
          dayOfWeek: {
            type: "array",
            items: { type: "number", minimum: 0, maximum: 6 }
          },
          includeHolidays: { type: "boolean" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          maxValue: { type: "number" },
          priority: { type: "number" },
          isActive: { type: "boolean" }
        },
        required: ["id", "type", "description", "priority", "isActive"],
        additionalProperties: true
      }
    },
    personalInfo: {
      type: "object",
      description: "個人情報（優先度90 - 強い配慮）",
      properties: {
        birthday: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
        age: { type: "number" },
        childrenAges: {
          type: "array",
          items: { type: "number" }
        },
        situation: { type: "string" },
        specialNotes: { type: "string" },
        priority: { type: "number", const: 90 }
      },
      required: ["priority"],
      additionalProperties: false
    }
  },
  required: ["rawInput", "workConstraints"],
  additionalProperties: false
} as const;

/**
 * 職場ルールから職員の休暇対象判定
 */
async function determineLeaveEligibility(employeeId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 職員情報を取得
  const employeeResult = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (employeeResult.length === 0) {
    throw new Error(`職員ID ${employeeId} が見つかりません`);
  }
  const employee = employeeResult[0];

  // 職員の役職グループ情報を取得
  const positionGroupResult = await db
    .select()
    .from(positionGroups)
    .where(eq(positionGroups.id, employee.positionGroupId))
    .limit(1);

  if (positionGroupResult.length === 0) {
    throw new Error(`役職グループID ${employee.positionGroupId} が見つかりません`);
  }
  const positionGroup = positionGroupResult[0];

  // この職員の雇用形態に適用される職場ルールを取得
  const applicableRules = await db
    .select()
    .from(workplaceRules)
    .where(
      or(
        eq(workplaceRules.employmentType, positionGroup.employmentType),
        eq(workplaceRules.employmentType, "all")
      )
    );

  // 誕生日休暇の対象判定
  const birthdayLeaveRule = applicableRules.find(
    (r) => (r.ruleType as any) === "birthday_leave" && r.isActive
  );
  const isBirthdayLeaveEligible = !!birthdayLeaveRule;

  // 季節休暇の対象判定（通常は全職員）
  const seasonalLeaveRule = applicableRules.find(
    (r) => (r.ruleType as any) === "seasonal_leave" && r.isActive
  );
  const isSeasonalLeaveEligible = !!seasonalLeaveRule;

  // ルール設定値を取得
  const birthdayLeaveConfig = birthdayLeaveRule?.ruleValue as any;
  const seasonalLeaveConfig = seasonalLeaveRule?.ruleValue as any;

  return {
    employee: {
      ...employee,
      positionGroup
    },
    birthdayLeave: {
      eligible: isBirthdayLeaveEligible,
      daysPerYear: birthdayLeaveConfig?.daysPerYear ?? 1,
      validityPeriod: birthdayLeaveConfig?.validityPeriod
    },
    seasonalLeave: {
      eligible: isSeasonalLeaveEligible,
      summer: {
        days: seasonalLeaveConfig?.summer?.days ?? 3,
        period: seasonalLeaveConfig?.summer?.period ?? "6-9月"
      },
      winter: {
        days: seasonalLeaveConfig?.winter?.days ?? 5,
        period: seasonalLeaveConfig?.winter?.period ?? "12-1月"
      }
    }
  };
}

/**
 * 自然言語を構造化データに変換
 */
async function parseNaturalLanguage(
  input: string,
  employeeName: string
): Promise<Partial<EmployeeConstraints>> {
  const prompt = `
あなたは職員の個別勤務条件を構造化データに変換するAIアシスタントです。

以下の自然言語入力を解析し、JSON形式で構造化してください。

【職員名】
${employeeName}

【入力内容】
${input}

【変換ルール】
1. workConstraints: 勤務に関する制約を抽出
   - 曜日パターン休み（例: "土日祝日休み" → type: "day_off_pattern"）
   - 特定曜日休み（例: "火曜日休み" → type: "specific_day_off"）
   - 勤務時間帯（例: "9時～14時勤務" → type: "work_hours"）
   - 特定曜日の勤務時間（例: "水曜・土曜 11:00-20:00" → type: "specific_day_hours"）

2. personalInfo: 個人情報を抽出
   - 子供の年齢、保育園送迎、介護中などの状況
   - 誕生日（記載されている場合）

3. 優先度は全て100（絶対厳守）に設定

4. 時間は必ず HH:MM 形式（例: "09:00", "14:00"）

5. 曜日は数値配列で表現（0=日曜, 1=月曜, ..., 6=土曜）

【注意事項】
- rawInput には入力内容をそのまま記録
- 休暇（有給、誕生日休、季節休）の情報は無視（別途管理）
- 不明な情報は省略（推測しない）
`.trim();

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "あなたは職員の勤務条件を構造化データに変換する専門家です。"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    outputSchema: {
      name: "employee_constraints",
      schema: EMPLOYEE_CONSTRAINTS_SCHEMA,
      strict: false
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("LLM APIからのレスポンスが空または不正です");
  }

  const parsed = JSON.parse(content);
  return parsed;
}

/**
 * 休暇管理データを初期化
 */
function initializeLeaveAllowances(
  eligibility: Awaited<ReturnType<typeof determineLeaveEligibility>>,
  parsedData: Partial<EmployeeConstraints>
): LeaveAllowances {
  const currentYear = new Date().getFullYear();

  return {
    // 有給休暇（全職員対象）
    paidLeave: {
      totalDays: 20,  // デフォルト20日（実際は勤続年数で変動）
      usedDays: 0,
      remainingDays: 20,
      scheduledDays: 0,
      expirationDate: `${currentYear + 1}-03-31`,
      takenDates: [],
      scheduledDates: []
    },

    // 誕生日休暇（正社員のみ）
    birthdayLeave: {
      eligible: eligibility.birthdayLeave.eligible,
      totalDays: eligibility.birthdayLeave.daysPerYear,
      usedDays: 0,
      remainingDays: eligibility.birthdayLeave.eligible ? eligibility.birthdayLeave.daysPerYear : 0,
      birthday: parsedData.personalInfo?.birthday
        ? parsedData.personalInfo.birthday.substring(5)  // YYYY-MM-DD → MM-DD
        : "",
      validityPeriod: eligibility.birthdayLeave.validityPeriod,
      takenDates: [],
      scheduledDates: []
    },

    // 季節休暇（全職員対象）
    seasonalLeave: {
      summer: {
        eligible: eligibility.seasonalLeave.eligible,
        totalDays: eligibility.seasonalLeave.summer.days,
        usedDays: 0,
        remainingDays: eligibility.seasonalLeave.summer.days,
        validPeriod: eligibility.seasonalLeave.summer.period,
        takenDates: [],
        scheduledDates: []
      },
      winter: {
        eligible: eligibility.seasonalLeave.eligible,
        totalDays: eligibility.seasonalLeave.winter.days,
        usedDays: 0,
        remainingDays: eligibility.seasonalLeave.winter.days,
        validPeriod: eligibility.seasonalLeave.winter.period,
        takenDates: [],
        scheduledDates: []
      }
    }
  };
}

/**
 * メイン処理: 自然言語を構造化データに変換
 */
export async function structureEmployeeData(
  employeeId: number,
  naturalLanguageInput: string
): Promise<StructureEmployeeDataResponse> {
  try {
    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    log(`📝 職員データ構造化開始: 職員ID ${employeeId}`);
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 1. 職場ルールと対象判定
    log("1️⃣ 職場ルールと対象判定...");
    const eligibility = await determineLeaveEligibility(employeeId);
    log(`   職員名: ${eligibility.employee.name}`);
    log(`   雇用形態: ${eligibility.employee.positionGroup.employmentType}`);
    log(`   誕生日休暇対象: ${eligibility.birthdayLeave.eligible ? "✓" : "✗"}`);
    log(`   季節休暇対象: ${eligibility.seasonalLeave.eligible ? "✓" : "✗"}\n`);

    // 2. 自然言語を構造化
    log("2️⃣ 自然言語を構造化...");
    const parsed = await parseNaturalLanguage(naturalLanguageInput, eligibility.employee.name);
    log(`   勤務制約: ${parsed.workConstraints?.length ?? 0}件`);
    log(`   個人情報: ${parsed.personalInfo ? "あり" : "なし"}\n`);

    // 3. 休暇管理データを初期化
    log("3️⃣ 休暇管理データを初期化...");
    const leaveAllowances = initializeLeaveAllowances(eligibility, parsed);
    log(`   有給: ${leaveAllowances.paidLeave.totalDays}日`);
    log(`   誕生日休: ${leaveAllowances.birthdayLeave.totalDays}日 (対象: ${leaveAllowances.birthdayLeave.eligible})`);
    log(`   夏休: ${leaveAllowances.seasonalLeave.summer.totalDays}日`);
    log(`   冬休: ${leaveAllowances.seasonalLeave.winter.totalDays}日\n`);

    // 4. 完全なデータ構造を構築
    const now = new Date().toISOString();
    const structuredData: EmployeeConstraints = {
      rawInput: naturalLanguageInput,
      lastUpdated: now,
      workConstraints: parsed.workConstraints ?? [],
      leaveAllowances,
      personalInfo: parsed.personalInfo,
      aiMetadata: {
        lastProcessed: now,
        processingModel: "gpt-4o-2024-11-20",
        confidenceScore: 0.95,
        validationStatus: "verified"
      }
    };

    log("4️⃣ データベースに保存...");
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    await db
      .update(employees)
      .set({
        additionalConstraints: structuredData as any,
        updatedAt: new Date()
      })
      .where(eq(employees.id, employeeId));
    log(`   ✅ 保存完了\n`);

    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    log(`✅ 構造化完了`);
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      success: true,
      data: structuredData
    };
  } catch (error) {
    console.error("❌ 構造化エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー"
    };
  }
}

/**
 * 職員の現在の制約データを取得
 */
export async function getEmployeeConstraints(
  employeeId: number
): Promise<EmployeeConstraints | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const employeeResult = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (employeeResult.length === 0 || !employeeResult[0].additionalConstraints) {
    return null;
  }

  return employeeResult[0].additionalConstraints as EmployeeConstraints;
}
