import { invokeLLM } from "./_core/llm";
import * as db from "./db";

interface GenerateShiftParams {
  shiftId: number;
  year: number;
  month: number;
}

interface ShiftGenerationContext {
  employees: any[];
  fullTimeEmployees: any[];
  partTimeEmployees: any[];
  workTimeSlots: any[];
  requiredStaffing: any[];
  workplaceRules: any[];
  leaveRequests: any[];
  employeeConstraints: any[];
  daysInMonth: number;
  year: number;
  month: number;
}

/**
 * AI自動シフト生成のメイン関数
 * 2段階生成: パート → 正社員（パートの柔軟な制約を優先）
 */
export async function generateShiftWithAI(params: GenerateShiftParams): Promise<void> {
  const { shiftId, year, month } = params;

  try {
    console.log("[AIシフト生成] 開始:", { shiftId, year, month });

    // 1. コンテキスト情報を収集（トランザクション外で実行）
    const context = await collectContext(shiftId, year, month);
    console.log("[AIシフト生成] コンテキスト収集完了:", {
      employees: context.employees.length,
      fullTime: context.fullTimeEmployees.length,
      partTime: context.partTimeEmployees.length,
      workTimeSlots: context.workTimeSlots.length,
    });

    // 2. 第1段階: パートのシフトをAI生成（トランザクション外で実行）
    const partTimeResult = await generatePartTimeShifts(context, [], shiftId);
    console.log("[AIシフト生成] パートシフト生成完了:", partTimeResult.shifts.length);

    // 3. 第2段階: 正社員のシフトをAI生成（トランザクション外で実行）
    const fullTimeResult = await generateFullTimeShifts(context, partTimeResult.shifts, shiftId);
    console.log("[AIシフト生成] 正社員シフト生成完了:", fullTimeResult.shifts.length);

    // 4. トランザクション開始: すべてのDB操作を原子的に実行
    const database = await db.getDb();
    if (!database) {
      throw new Error("Database connection not available");
    }

    await database.transaction(async (tx) => {
      console.log("[AIシフト生成] トランザクション開始");

      // ステップ1: AI生成のシフト詳細のみを削除（手動作成分は保持）
      await db.deleteAIGeneratedShiftDetailsWithTransaction(tx, shiftId);
      console.log("[AIシフト生成] 既存AIシフト削除完了");

      // ステップ2: パートシフトをDBに保存（generatedBy: "ai"を追加）
      for (const shift of partTimeResult.shifts) {
        await db.createShiftDetailWithTransaction(tx, {
          ...shift,
          shiftId,
          status: "working" as const,
          generatedBy: "ai" as const,
        });
      }
      console.log("[AIシフト生成] パートシフトDB保存完了");

      // ステップ3: 正社員シフトをDBに保存（generatedBy: "ai"を追加）
      for (const shift of fullTimeResult.shifts) {
        await db.createShiftDetailWithTransaction(tx, {
          ...shift,
          shiftId,
          status: "working" as const,
          generatedBy: "ai" as const,
        });
      }
      console.log("[AIシフト生成] 正社員シフトDB保存完了");

      // ステップ4: シフトのステータスを更新し、AIプロンプトとレスポンスを保存
      const combinedPrompt = `=== パートシフト生成プロンプト ===\n${partTimeResult.prompt}\n\n=== 正社員シフト生成プロンプト ===\n${fullTimeResult.prompt}`;
      const combinedResponse = {
        partTime: {
          usage: partTimeResult.response.usage,
          model: partTimeResult.response.model,
          shiftsCount: partTimeResult.shifts.length,
        },
        fullTime: {
          usage: fullTimeResult.response.usage,
          model: fullTimeResult.response.model,
          shiftsCount: fullTimeResult.shifts.length,
        },
      };

      await db.updateShiftWithTransaction(tx, shiftId, {
        generatedBy: "ai",
        aiPrompt: combinedPrompt,
        aiResponse: combinedResponse,
      });
      console.log("[AIシフト生成] シフト情報更新完了");

      console.log("[AIシフト生成] トランザクションコミット準備完了");
    });

    console.log("[AIシフト生成] 完了（すべての操作が成功しました）");
  } catch (error: any) {
    console.error("[AIシフト生成] エラー（トランザクションがロールバックされました）:", error);
    throw error;
  }
}

/**
 * コンテキスト情報を収集
 */
async function collectContext(
  shiftId: number,
  year: number,
  month: number
): Promise<ShiftGenerationContext> {
  const employees = await db.getAllEmployees();
  const positionGroups = await db.getAllPositionGroups();
  
  const fullTimeEmployees = employees.filter((e) => {
    const group = positionGroups.find((g) => g.id === e.positionGroupId);
    return group?.employmentType === "fulltime";
  });
  const partTimeEmployees = employees.filter((e) => {
    const group = positionGroups.find((g) => g.id === e.positionGroupId);
    return group?.employmentType === "parttime";
  });
  const workTimeSlots = await db.getAllWorkTimeSlots();
  const requiredStaffing = await db.getAllRequiredStaffing();
  const workplaceRules = await db.getAllWorkplaceRules();
  const leaveRequests = await db.getLeaveRequestsByShift(shiftId);
  const employeeConstraints = await db.getAllEmployeeConstraints();
  const daysInMonth = new Date(year, month, 0).getDate();

  return {
    employees,
    fullTimeEmployees,
    partTimeEmployees,
    workTimeSlots,
    requiredStaffing,
    workplaceRules,
    leaveRequests,
    employeeConstraints,
    daysInMonth,
    year,
    month,
  };
}

/**
 * 第1段階: パートのシフトを生成
 */
async function generatePartTimeShifts(
  context: ShiftGenerationContext,
  existingShifts: any[],
  shiftId: number
): Promise<{ shifts: any[], prompt: string, response: any }> {
  const prompt = buildPartTimePrompt(context, existingShifts);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "あなたは介護施設のシフト管理の専門家です。職場ルールと必要人数を考慮して、最適なシフトを生成してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "shift_schedule",
        strict: true,
        schema: {
          type: "object",
          properties: {
            shifts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employeeId: { type: "number" },
                  date: { type: "string" },
                  timeSlotId: { type: "number" },
                },
                required: ["employeeId", "date", "timeSlotId"],
                additionalProperties: false,
              },
            },
          },
          required: ["shifts"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const result = JSON.parse(contentStr || "{}");

  return {
    shifts: result.shifts || [],
    prompt,
    response: response,
  };
}

/**
 * 第2段階: 正社員のシフトを生成
 */
async function generateFullTimeShifts(
  context: ShiftGenerationContext,
  partTimeShifts: any[],
  shiftId: number
): Promise<{ shifts: any[], prompt: string, response: any }> {
  const prompt = buildFullTimePrompt(context, partTimeShifts);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "あなたは介護施設のシフト管理の専門家です。正社員の配置を考慮して、パート職員の最適なシフトを生成してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "shift_schedule",
        strict: true,
        schema: {
          type: "object",
          properties: {
            shifts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employeeId: { type: "number" },
                  date: { type: "string" },
                  timeSlotId: { type: "number" },
                },
                required: ["employeeId", "date", "timeSlotId"],
                additionalProperties: false,
              },
            },
          },
          required: ["shifts"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const result = JSON.parse(contentStr || "{}");

  return {
    shifts: result.shifts || [],
    prompt,
    response: response,
  };
}

/**
 * パート用のプロンプトを構築
 */
function buildPartTimePrompt(context: ShiftGenerationContext, existingShifts: any[]): string {
  const { partTimeEmployees, workTimeSlots, requiredStaffing, workplaceRules, leaveRequests, employeeConstraints, daysInMonth, year, month } = context;

  let prompt = `# パート職員のシフト生成（第1段階）

## 対象職員
${partTimeEmployees.map((e: any) => `- ID: ${e.id}, 名前: ${e.name}, 役職グループ: ${e.positionGroupId}`).join("\n")}

## 勤務時間枠
${workTimeSlots.map((ts: any) => `- ID: ${ts.id}, 名前: ${ts.name}, 時間: ${ts.startTime}-${ts.endTime}, 夜勤: ${ts.isNightShift}`).join("\n")}

## 必要人数（時間帯別・曜日別）
${requiredStaffing.map((rs: any) => `- 曜日: ${rs.dayOfWeek}, 時間: ${rs.hour}時, 必要人数: ${rs.requiredCount}人`).join("\n")}

## 職場ルール
${workplaceRules.map((wr: any) => `- ${wr.name}: ${wr.description}`).join("\n")}

## 希望休
${leaveRequests.map((lr: any) => `- 職員ID: ${lr.employeeId}, 日付: ${lr.requestDate}`).join("\n")}

## 個人制約
${employeeConstraints.map((ec: any) => {
  const employee = partTimeEmployees.find(e => e.id === ec.employeeId);
  if (!employee) return '';
  let constraintDesc = `- 職員ID: ${ec.employeeId} (${employee.name})`;
  if (ec.constraintType === 'max_hours_per_week') {
    constraintDesc += `, 週間最大勤務時間: ${ec.maxValue}時間`;
  } else if (ec.constraintType === 'max_days_per_week') {
    constraintDesc += `, 週間最大勤務日数: ${ec.maxValue}日`;
  } else if (ec.constraintType === 'unavailable_day') {
    constraintDesc += `, 勤務不可曜日: ${ec.dayOfWeek || ''}`;
  } else if (ec.constraintType === 'unavailable_time') {
    constraintDesc += `, 勤務不可時間帯: ${ec.startTime || ''}-${ec.endTime || ''}`;
  }
  return constraintDesc;
}).filter(Boolean).join("\n")}

## 生成条件
- 対象年月: ${year}年${month}月
- 対象月の日数: ${daysInMonth}日
- 各日の必要人数を満たすこと
- 希望休を守ること（希望休の日にはシフトを入れない）
- 個人制約を守ること（週間最大勤務時間、勤務不可曜日、勤務不可時間帯など）
- 連続勤務日数の制限を守ること
- 夜勤の間隔を適切に設定すること

## 出力形式
各職員について、勤務日と勤務時間枠を決定してください。
日付はYYYY-MM-DD形式で指定してください。
例: ${year}-${String(month).padStart(2, '0')}-01から${year}-${String(month).padStart(2, '0')}-${daysInMonth}まで`;

  return prompt;
}

/**
 * 正社員用のプロンプトを構築
 */
function buildFullTimePrompt(context: ShiftGenerationContext, partTimeShifts: any[]): string {
  const { fullTimeEmployees, workTimeSlots, requiredStaffing, workplaceRules, leaveRequests, employeeConstraints, daysInMonth, year, month } = context;

  let prompt = `# 正社員のシフト生成（第2段階）

## 対象職員
${fullTimeEmployees.map((e: any) => `- ID: ${e.id}, 名前: ${e.name}, 役職グループ: ${e.positionGroupId}`).join("\n")}

## 勤務時間枠
${workTimeSlots.map((ts: any) => `- ID: ${ts.id}, 名前: ${ts.name}, 時間: ${ts.startTime}-${ts.endTime}, 夜勤: ${ts.isNightShift}`).join("\n")}

## 必要人数（時間帯別・曜日別）
${requiredStaffing.map((rs: any) => `- 曜日: ${rs.dayOfWeek}, 時間: ${rs.hour}時, 必要人数: ${rs.requiredCount}人`).join("\n")}

## 職場ルール
${workplaceRules.map((wr: any) => `- ${wr.name}: ${wr.description}`).join("\n")}

## 希望休
${leaveRequests.map((lr: any) => `- 職員ID: ${lr.employeeId}, 日付: ${lr.requestDate}`).join("\n")}

## 個人制約
${employeeConstraints.map((ec: any) => {
  const employee = fullTimeEmployees.find(e => e.id === ec.employeeId);
  if (!employee) return '';
  let constraintDesc = `- 職員ID: ${ec.employeeId} (${employee.name})`;
  if (ec.constraintType === 'max_hours_per_week') {
    constraintDesc += `, 週間最大勤務時間: ${ec.maxValue}時間`;
  } else if (ec.constraintType === 'max_days_per_week') {
    constraintDesc += `, 週間最大勤務日数: ${ec.maxValue}日`;
  } else if (ec.constraintType === 'unavailable_day') {
    constraintDesc += `, 勤務不可曜日: ${ec.dayOfWeek || ''}`;
  } else if (ec.constraintType === 'unavailable_time') {
    constraintDesc += `, 勤務不可時間帯: ${ec.startTime || ''}-${ec.endTime || ''}`;
  }
  return constraintDesc;
}).filter(Boolean).join("\n")}

## 既に配置されたパートのシフト
${partTimeShifts.map((s: any) => `- 職員ID: ${s.employeeId}, 日付: ${s.date}, 時間枠ID: ${s.timeSlotId}`).join("\n")}

## 生成条件
- 対象年月: ${year}年${month}月
- 対象月の日数: ${daysInMonth}日
- パートのシフトを考慮して、不足分を補うこと
- 各日の必要人数を満たすこと
- 希望休を守ること（希望休の日にはシフトを入れない）
- 個人制約を守ること（週間最大勤務時間、勤務不可曜日、勤務不可時間帯など）
- 連続勤務日数の制限を守ること
- 夜勤の間隔を適切に設定すること

## 出力形式
各職員について、勤務日と勤務時間枠を決定してください。
日付はYYYY-MM-DD形式で指定してください。
例: ${year}-${String(month).padStart(2, '0')}-01から${year}-${String(month).padStart(2, '0')}-${daysInMonth}まで`;

  return prompt;
}
