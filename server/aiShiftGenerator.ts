import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { validateShift, ValidationResult } from "./shiftValidator";

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
  relaxationLevel?: number; // 制約緩和レベル (0: なし, 1-3: 段階的緩和)
}

/**
 * AI自動シフト生成のメイン関数（リトライ機能付き）
 * 2段階生成: パート → 正社員（パートの柔軟な制約を優先）
 */
export async function generateShiftWithAI(params: GenerateShiftParams): Promise<void> {
  const { shiftId, year, month } = params;
  const MAX_RETRIES = 3;

  try {
    console.log("[AIシフト生成] 開始:", { shiftId, year, month });

    // 制約緩和レベルを段階的に上げながらリトライ
    for (let relaxationLevel = 0; relaxationLevel <= MAX_RETRIES; relaxationLevel++) {
      try {
        if (relaxationLevel > 0) {
          console.log(`[AIシフト生成] リトライ ${relaxationLevel}回目 - 制約緩和レベル: ${relaxationLevel}`);
        }

        const result = await attemptShiftGeneration(shiftId, year, month, relaxationLevel);

        // 成功したら保存して終了
        await saveGeneratedShifts(shiftId, result);
        console.log("[AIシフト生成] 成功:", {
          relaxationLevel,
          totalShifts: result.allShifts.length,
          warnings: result.validationResult.warnings.length,
        });
        return;

      } catch (error: any) {
        const isLastAttempt = relaxationLevel === MAX_RETRIES;

        if (isLastAttempt) {
          console.error(`[AIシフト生成] 最終試行失敗 (${MAX_RETRIES}回リトライ済み)`);
          throw error;
        }

        console.warn(`[AIシフト生成] 試行 ${relaxationLevel + 1}/${MAX_RETRIES + 1} 失敗:`, error.message);
        console.log(`[AIシフト生成] 制約を緩和して再試行します...`);
      }
    }
  } catch (error: any) {
    console.error("[AIシフト生成] 完全失敗:", error);
    throw new Error(`シフト生成に失敗しました: ${error.message}`);
  }
}

/**
 * シフト生成を1回試行する（内部関数）
 */
async function attemptShiftGeneration(
  shiftId: number,
  year: number,
  month: number,
  relaxationLevel: number
) {
  // 1. コンテキスト情報を収集（トランザクション外で実行）
  const context = await collectContext(shiftId, year, month);
  context.relaxationLevel = relaxationLevel;

  if (relaxationLevel === 0) {
    console.log("[AIシフト生成] コンテキスト収集完了:", {
      employees: context.employees.length,
      fullTime: context.fullTimeEmployees.length,
      partTime: context.partTimeEmployees.length,
      workTimeSlots: context.workTimeSlots.length,
    });
  }

  // 2. 第1段階: パートのシフトをAI生成（トランザクション外で実行）
  const partTimeResult = await generatePartTimeShifts(context, [], shiftId);
  console.log("[AIシフト生成] パートシフト生成完了:", partTimeResult.shifts.length);

  // 3. 第2段階: 正社員のシフトをAI生成（トランザクション外で実行）
  const fullTimeResult = await generateFullTimeShifts(context, partTimeResult.shifts, shiftId);
  console.log("[AIシフト生成] 正社員シフト生成完了:", fullTimeResult.shifts.length);

  // 3.5. 生成されたシフトを検証
  const allGeneratedShifts = [...partTimeResult.shifts, ...fullTimeResult.shifts];
  const validationResult = await validateGeneratedShifts(
    context,
    allGeneratedShifts
  );
  console.log("[AIシフト生成] 検証完了:", {
    isValid: validationResult.isValid,
    errors: validationResult.errors.length,
    warnings: validationResult.warnings.length,
    coverage: validationResult.metrics.totalCoverage,
  });

  // ハード制約違反がある場合は例外をスロー（リトライ対象）
  if (!validationResult.isValid) {
    console.error("[AIシフト生成] ハード制約違反:", validationResult.errors.length, "件");

    throw new Error(
      `制約違反: ${validationResult.errors.length}件\n` +
      validationResult.errors.slice(0, 3).map(e => `- ${e.message}`).join("\n")
    );
  }

  // 警告がある場合はログに記録（生成は成功とみなす）
  if (validationResult.warnings.length > 0) {
    console.warn("[AIシフト生成] 警告あり:", validationResult.warnings.length, "件");
    validationResult.warnings.forEach((w) => {
      console.warn(`  - [${w.severity}] ${w.category}: ${w.message}`);
    });
  }

  return {
    partTimeShifts: partTimeResult.shifts,
    fullTimeShifts: fullTimeResult.shifts,
    allShifts: allGeneratedShifts,
    validationResult,
  };
}

/**
 * 生成されたシフトをDBに保存
 */
async function saveGeneratedShifts(shiftId: number, result: any): Promise<void> {
  const { partTimeShifts, fullTimeShifts } = result;

  try {
    // トランザクション開始: すべてのDB操作を原子的に実行
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
      for (const shift of partTimeShifts) {
        await db.createShiftDetailWithTransaction(tx, {
          ...shift,
          shiftId,
          status: "working" as const,
          generatedBy: "ai" as const,
        });
      }
      console.log("[AIシフト生成] パートシフトDB保存完了");

      // ステップ3: 正社員シフトをDBに保存（generatedBy: "ai"を追加）
      for (const shift of fullTimeShifts) {
        await db.createShiftDetailWithTransaction(tx, {
          ...shift,
          shiftId,
          status: "working" as const,
          generatedBy: "ai" as const,
        });
      }
      console.log("[AIシフト生成] 正社員シフトDB保存完了");

      // ステップ4: シフトのステータスを更新（簡易版 - プロンプト情報は保存しない）
      await db.updateShiftWithTransaction(tx, shiftId, {
        generatedBy: "ai",
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
 * 制約緩和メッセージを生成
 */
function getRelaxationMessage(level: number): string {
  if (level === 0) {
    return "";
  }

  const relaxationLevels = [
    "",
    `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🔄 制約緩和レベル 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

前回の生成で制約違反が発生したため、以下の制約を緩和します:

- 必要人数の確保: 80% → **70%** に緩和
- 土日連続出勤: 月2回まで → **月3回まで** に緩和
`,
    `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🔄 制約緩和レベル 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

前回の生成で制約違反が発生したため、さらに制約を緩和します:

- 必要人数の確保: 70% → **60%** に緩和
- 勤務日数の公平性: ±2日 → **±3日** に緩和
- 夜勤回数の公平性: ±1回 → **±2回** に緩和
- 新人の単独配置を **許可**
`,
    `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🔄 制約緩和レベル 3（最終試行）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

最終試行です。以下の制約のみ厳守し、他は柔軟に対応してください:

**厳守事項（必ず守る）:**
- 希望休の完全遵守
- 夜勤資格のチェック
- 労働基準法の遵守（週40時間、11時間休憩、連続6日）
- 個人制約の厳守

**緩和可能（できる範囲で考慮）:**
- 必要人数の確保: **50%以上** で許容
- 公平性・品質・ワークライフバランス: できる範囲で考慮
`,
  ];

  return relaxationLevels[level] || "";
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

  // 曜日名マップ
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  const relaxationMsg = getRelaxationMessage(context.relaxationLevel || 0);

  let prompt = `# パート職員のシフト自動生成（第1段階）

あなたは介護施設のシフト管理の専門家です。以下の情報をもとに、パート職員の最適なシフトを生成してください。
${relaxationMsg}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 基本情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**対象期間**: ${year}年${month}月（全${daysInMonth}日間）
**対象職員**: パート ${partTimeEmployees.length}名

## 👥 パート職員情報

${partTimeEmployees.map((e: any) => {
  const constraints = employeeConstraints.filter(ec => ec.employeeId === e.id);
  const leaves = leaveRequests.filter(lr => lr.employeeId === e.id);
  return `### 職員ID: ${e.id} - ${e.name}
- スキルレベル: ${e.skillLevel}/100 (${e.skillLevel >= 90 ? '熟練' : e.skillLevel >= 70 ? '中堅' : '新人'})
- 夜勤可否: ${e.canWorkNightShift ? '可' : '不可'}
- 希望休: ${leaves.length > 0 ? leaves.map(lr => lr.requestDate || `${lr.startDate}〜${lr.endDate}`).join(', ') : 'なし'}
- 個人制約: ${constraints.length > 0 ? constraints.map(c => {
    if (c.constraintType === 'max_hours_per_week') return `週${c.maxValue}時間まで`;
    if (c.constraintType === 'max_days_per_week') return `週${c.maxValue}日まで`;
    if (c.constraintType === 'unavailable_day') return `${dayNames[c.dayOfWeek || 0]}曜不可`;
    if (c.constraintType === 'unavailable_time') return `${c.startTime}-${c.endTime}不可`;
    return '';
  }).filter(Boolean).join(', ') : 'なし'}`;
}).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⏰ 勤務時間枠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${workTimeSlots.map((ts: any) =>
  `- **${ts.name}** (ID: ${ts.id}): ${ts.startTime}〜${ts.endTime} ${ts.isNightShift ? '🌙 夜勤' : ''}`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📊 必要人数（曜日・時間帯別）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${Array.from(new Set(requiredStaffing.map(rs => rs.dayOfWeek))).sort().map(dow => {
  const dayRequirements = requiredStaffing.filter(rs => rs.dayOfWeek === dow && rs.requiredCount > 0);
  if (dayRequirements.length === 0) return '';
  return `**${dayNames[dow]}曜日**: ${dayRequirements.map(rs => `${rs.hour}時台=${rs.requiredCount}人`).join(', ')}`;
}).filter(Boolean).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⚠️ 【必須制約】絶対に守るべきルール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. 希望休の完全遵守
- 希望休が申請されている日には、絶対にシフトを入れないこと

### 2. 夜勤資格のチェック
- 夜勤シフトは、canWorkNightShift=trueの職員のみに割り当てること

### 3. 必要人数の確保
- 各時間帯で必要人数の80%以上を確保すること
- スキルレベルを考慮（skillLevel=50なら0.5人分）

### 4. 労働基準法の遵守
- 週間労働時間: パートは週40時間まで
- シフト間インターバル: 最低11時間の休憩
- 連続勤務: 最大6日まで

### 5. 個人制約の厳守
- 各職員の勤務不可曜日・時間帯を守ること
- 週間最大勤務日数・時間数を超えないこと

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 💡 【推奨事項】可能な限り考慮すること
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 公平性
- 勤務日数を職員間で均等に（±1日以内）
- 夜勤回数を夜勤可能職員間で均等に（±1回以内）
- 土日祝の出勤を公平に分散

### 品質向上
- 各シフトに熟練者（skillLevel≥90）を最低1名配置
- 新人（skillLevel<70）は単独配置を避ける

### ワークライフバランス
- 夜勤の翌日は休みまたは遅番
- 土日連続出勤は月2回まで

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📝 出力形式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

各職員について、勤務日と時間枠IDを決定してください。
日付形式: YYYY-MM-DD（例: ${year}-${String(month).padStart(2, '0')}-01）

**重要**: 制約を満たせない場合は、該当職員のシフトを少なくしても構いません。
無理にシフトを埋めようとして制約違反するより、人手不足の警告を出す方が望ましいです。`;

  return prompt;
}

/**
 * 正社員用のプロンプトを構築
 */
function buildFullTimePrompt(context: ShiftGenerationContext, partTimeShifts: any[]): string {
  const { fullTimeEmployees, workTimeSlots, requiredStaffing, workplaceRules, leaveRequests, employeeConstraints, daysInMonth, year, month } = context;

  // 曜日名マップ
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  const relaxationMsg = getRelaxationMessage(context.relaxationLevel || 0);

  let prompt = `# 正社員のシフト自動生成（第2段階）

あなたは介護施設のシフト管理の専門家です。パート職員の配置が完了したので、正社員で不足分を補ってください。
${relaxationMsg}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 基本情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**対象期間**: ${year}年${month}月（全${daysInMonth}日間）
**対象職員**: 正社員 ${fullTimeEmployees.length}名

## 👥 正社員情報

${fullTimeEmployees.map((e: any) => {
  const constraints = employeeConstraints.filter(ec => ec.employeeId === e.id);
  const leaves = leaveRequests.filter(lr => lr.employeeId === e.id);
  return `### 職員ID: ${e.id} - ${e.name}
- スキルレベル: ${e.skillLevel}/100 (${e.skillLevel >= 90 ? '熟練' : e.skillLevel >= 70 ? '中堅' : '新人'})
- 夜勤可否: ${e.canWorkNightShift ? '可' : '不可'}
- 希望休: ${leaves.length > 0 ? leaves.map(lr => lr.requestDate || `${lr.startDate}〜${lr.endDate}`).join(', ') : 'なし'}
- 個人制約: ${constraints.length > 0 ? constraints.map(c => {
    if (c.constraintType === 'max_hours_per_week') return `週${c.maxValue}時間まで`;
    if (c.constraintType === 'max_days_per_week') return `週${c.maxValue}日まで`;
    if (c.constraintType === 'unavailable_day') return `${dayNames[c.dayOfWeek || 0]}曜不可`;
    if (c.constraintType === 'unavailable_time') return `${c.startTime}-${c.endTime}不可`;
    return '';
  }).filter(Boolean).join(', ') : 'なし'}`;
}).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⏰ 勤務時間枠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${workTimeSlots.map((ts: any) => `- **${ts.name}** (ID: ${ts.id}): ${ts.startTime}〜${ts.endTime}${ts.isNightShift ? ' 🌙' : ''}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📌 既に配置済みのパート職員
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

パート ${Object.keys(partTimeShifts.reduce((acc: any, s: any) => ({...acc, [s.employeeId]: true}), {})).length}名が既に配置済み
配置総数: ${partTimeShifts.length}シフト

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⚠️ 【必須制約】絶対に守るべきルール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. 希望休の完全遵守
- 希望休が申請されている日には、絶対にシフトを入れないこと

### 2. 夜勤資格のチェック
- 夜勤シフトは、canWorkNightShift=trueの職員のみに割り当てること

### 3. 必要人数の確保
- パートの配置を考慮し、不足している時間帯を正社員で補うこと
- 各時間帯で必要人数の80%以上を確保すること
- スキルレベルを考慮（skillLevel=50なら0.5人分）

### 4. 労働基準法の遵守（正社員）
- 週間労働時間: 正社員は週40時間まで（厳守）
- シフト間インターバル: 最低11時間の休憩
- 連続勤務: 最大6日まで

### 5. 個人制約の厳守
- 各職員の勤務不可曜日・時間帯を守ること
- 週間最大勤務日数・時間数を超えないこと

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 💡 【推奨事項】可能な限り考慮すること
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 公平性
- 正社員間で勤務日数を均等に（±2日以内）
- 夜勤回数を夜勤可能職員間で均等に（±1回以内）
- 土日祝の出勤を公平に分散

### 品質向上
- 各シフトに熟練者（skillLevel≥90）を配置
- 新人（skillLevel<70）は熟練者とペアリング

### ワークライフバランス
- 夜勤の翌日は休みまたは遅番
- 土日連続出勤は月2回まで

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📝 出力形式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

各正社員について、勤務日と時間枠IDを決定してください。
日付形式: YYYY-MM-DD

**重要**:
- パートで既に配置された時間帯を考慮すること
- 制約を満たせない場合は、該当職員のシフトを少なくしても構いません
- 無理にシフトを埋めようとして制約違反するより、人手不足の警告を出す方が望ましいです
`;

  return prompt;
}
/**
 * 生成されたシフトを検証
 */
async function validateGeneratedShifts(
  context: ShiftGenerationContext,
  generatedShifts: any[]
): Promise<ValidationResult> {
  const positionGroups = await db.getAllPositionGroups();

  // ValidationContextに合わせて変換
  const validationContext = {
    shifts: generatedShifts.map((s) => ({
      employeeId: s.employeeId,
      date: s.date,
      timeSlotId: s.timeSlotId,
    })),
    employees: context.employees.map((e: any) => ({
      id: e.id,
      name: e.name,
      positionGroupId: e.positionGroupId,
      skillLevel: e.skillLevel,
      canWorkNightShift: e.canWorkNightShift,
    })),
    workTimeSlots: context.workTimeSlots.map((ts: any) => ({
      id: ts.id,
      name: ts.name,
      startTime: ts.startTime,
      endTime: ts.endTime,
      isNightShift: ts.isNightShift,
    })),
    requiredStaffing: context.requiredStaffing.map((rs: any) => ({
      dayOfWeek: rs.dayOfWeek,
      hour: rs.hour,
      requiredCount: rs.requiredCount,
    })),
    leaveRequests: context.leaveRequests.map((lr: any) => ({
      employeeId: lr.employeeId,
      requestDate: lr.requestDate,
      startDate: lr.startDate || lr.requestDate,
      endDate: lr.endDate || lr.requestDate,
      status: lr.status || "approved",
    })),
    employeeConstraints: context.employeeConstraints.map((ec: any) => ({
      employeeId: ec.employeeId,
      constraintType: ec.constraintType,
      dayOfWeek: ec.dayOfWeek,
      startTime: ec.startTime,
      endTime: ec.endTime,
      maxValue: ec.maxValue,
    })),
    workplaceRules: context.workplaceRules.map((wr: any) => ({
      ruleType: wr.ruleType,
      employmentType: wr.employmentType,
      ruleValue: wr.ruleValue,
      description: wr.description,
      isActive: wr.isActive,
    })),
    positionGroups: positionGroups.map((pg: any) => ({
      id: pg.id,
      name: pg.name,
      employmentType: pg.employmentType,
    })),
    year: context.year,
    month: context.month,
  };

  return validateShift(validationContext);
}
